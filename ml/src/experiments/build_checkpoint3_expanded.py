
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[2]

MESSAGES_PATH = ROOT / "data/interim/sentiment_messages.csv"
ANNOTATIONS_PATH = (
    ROOT / "data/labeled/escalation_conversation_annotation.csv"
)
SNAPSHOTS_PATH = ROOT / "data/processed/escalation_snapshot_dataset.csv"
CURRENT_PATH = (
    ROOT / "data/processed/escalation_text_message_3_dataset.csv"
)
OUTPUT_PATH = (
    ROOT / "data/processed/escalation_text_message_3_expanded.csv"
)

CHECKPOINT = 3


def main():
    for path in [
        MESSAGES_PATH,
        ANNOTATIONS_PATH,
        SNAPSHOTS_PATH,
        CURRENT_PATH,
    ]:
        if not path.exists():
            raise FileNotFoundError(f"Required file not found: {path}")

    messages = pd.read_csv(MESSAGES_PATH, low_memory=False)
    annotations = pd.read_csv(ANNOTATIONS_PATH)
    snapshots = pd.read_csv(SNAPSHOTS_PATH)
    current = pd.read_csv(CURRENT_PATH)

    # Keep only reviewed, unambiguous binary labels.
    annotations = annotations[
        (annotations["review_status"] == "REVIEWED")
        & (annotations["escalation_label"].isin([0, 1]))
    ].copy()

    annotations["escalation_label"] = (
        annotations["escalation_label"].astype(int)
    )

    if annotations["conversation_id"].duplicated().any():
        raise ValueError("Duplicate conversation IDs in annotations.")

    # Use the same ordering as the feature-generation pipeline.
    messages["created_at"] = pd.to_datetime(
        messages["created_at"], errors="coerce", utc=True
    )
    messages["tweet_id"] = pd.to_numeric(
        messages["tweet_id"], errors="coerce"
    )
    messages["inbound"] = messages["inbound"].astype(bool)

    messages = messages.dropna(
        subset=["conversation_id", "created_at", "tweet_id", "text"]
    ).copy()

    messages = messages.sort_values(
        ["conversation_id", "created_at", "tweet_id"]
    )

    # Select exactly the first three total messages per conversation.
    first_three = (
        messages.groupby("conversation_id", sort=False, group_keys=False)
        .head(CHECKPOINT)
        .copy()
    )

    counts = first_three.groupby("conversation_id").size()
    valid_ids = set(counts[counts == CHECKPOINT].index)

    # Only customer messages available in the first three messages.
    customer_messages = first_three[
        first_three["inbound"] & first_three["text"].notna()
    ].copy()

    customer_messages["text"] = (
        customer_messages["text"].astype(str).str.strip()
    )
    customer_messages = customer_messages[
        customer_messages["text"].ne("")
    ]

    customer_text = (
        customer_messages.groupby("conversation_id", sort=False)["text"]
        .agg(" ".join)
        .rename("customer_text")
        .reset_index()
    )

    # Require a checkpoint-3 snapshot with at least one customer message.
    checkpoint_snapshots = snapshots[
        (snapshots["messages_seen"] == CHECKPOINT)
        & (snapshots["customer_message_count"] >= 1)
    ].copy()

    checkpoint_snapshots = checkpoint_snapshots.drop_duplicates(
        subset=["conversation_id"]
    )

    # Join reviewed labels, eligible snapshots, and customer-only text.
    data = annotations[
        ["conversation_id", "escalation_label"]
    ].merge(
        checkpoint_snapshots[
            ["conversation_id", "messages_seen", "customer_message_count"]
        ],
        on="conversation_id",
        how="inner",
        validate="one_to_one",
    ).merge(
        customer_text,
        on="conversation_id",
        how="inner",
        validate="one_to_one",
    )

    data = data[data["conversation_id"].isin(valid_ids)].copy()
    data = data[data["customer_text"].str.strip().ne("")].copy()

    if data["conversation_id"].duplicated().any():
        raise ValueError("Duplicate conversation IDs in output.")

    if not data["escalation_label"].isin([0, 1]).all():
        raise ValueError("Unexpected labels found.")

    # Verify that existing records have the same label.
    existing = current[
        ["conversation_id", "escalation_label"]
    ].copy()

    check = data.merge(
        existing,
        on="conversation_id",
        how="inner",
        suffixes=("_new", "_existing"),
        validate="one_to_one",
    )

    if not (
        check["escalation_label_new"]
        == check["escalation_label_existing"]
    ).all():
        raise ValueError("Existing labels disagree with reconstructed data.")

    # Never overwrite an existing output.
    if OUTPUT_PATH.exists():
        raise FileExistsError(
            f"{OUTPUT_PATH} already exists. Inspect it before replacing."
        )

    data = data[
        [
            "conversation_id",
            "messages_seen",
            "customer_message_count",
            "customer_text",
            "escalation_label",
        ]
    ].sort_values("conversation_id")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(OUTPUT_PATH, index=False)

    print("Expanded checkpoint-3 dataset created.")
    print("Output:", OUTPUT_PATH)
    print("Rows:", len(data))
    print("Unique conversations:", data["conversation_id"].nunique())
    print(
        "Label counts:",
        data["escalation_label"].value_counts().sort_index().to_dict(),
    )
    print("Existing records checked:", len(check))
    print("Existing label disagreements: 0")
    print("Customer-only text: verified by construction")
    print("Original dataset and model were not modified.")


if __name__ == "__main__":
    main()

