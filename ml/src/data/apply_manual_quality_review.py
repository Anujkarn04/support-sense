import pandas as pd

path = "data/labeled/escalation_conversation_annotation.csv"
df = pd.read_csv(path)

decisions = {
    1191949: (
        2,
        "Unrelated casual conversation; no identifiable support case "
        "or attributable escalation evidence."
    ),
    2938118: (
        2,
        "Mixed humorous thread and product complaint; escalation "
        "cannot be reliably attributed to the support customer."
    ),
}

df["conversation_id"] = pd.to_numeric(
    df["conversation_id"], errors="raise"
).astype("int64")

df["escalation_label"] = pd.to_numeric(
    df["escalation_label"], errors="raise"
)

for conversation_id, (new_label, reason) in decisions.items():
    matches = df.index[df["conversation_id"] == conversation_id]

    if len(matches) != 1:
        raise ValueError(
            f"Expected one row for {conversation_id}; found {len(matches)}"
        )

    idx = matches[0]

    if df.at[idx, "escalation_label"] != 0:
        raise ValueError(
            f"Conversation {conversation_id} is not currently label 0"
        )

    df.at[idx, "escalation_label"] = new_label
    df.at[idx, "annotator_reason"] = reason
    df.at[idx, "review_status"] = "REVIEWED"

# Write only after all validation passes.
df.to_csv(path, index=False)

print("Manual quality review applied.")
print("\nUpdated labels:")
print(
    df.loc[
        df["conversation_id"].isin(decisions),
        ["conversation_id", "escalation_label",
         "review_status", "annotator_reason"]
    ].to_string(index=False)
)

print("\nUpdated label counts:")
print(df["escalation_label"].value_counts().sort_index())