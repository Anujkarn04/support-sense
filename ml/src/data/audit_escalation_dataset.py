
import pandas as pd
from pathlib import Path

path = Path("data/labeled/escalation_conversation_annotation.csv")
df = pd.read_csv(path)

labels = pd.to_numeric(df["escalation_label"], errors="coerce")
valid_labels = {0, 1, 2}

print("=" * 45)
print("ESCALATION DATASET QUALITY AUDIT")
print("=" * 45)

print("\n1. Dataset dimensions:", df.shape)
print("2. Duplicate conversation IDs:", df["conversation_id"].duplicated().sum())
print("3. Missing values by column:")
print(df.isna().sum().to_string())

print("\n4. Label counts:")
print(labels.value_counts(dropna=False).sort_index().to_string())

print("\n5. Invalid labels:", int((~labels.isin(valid_labels) & labels.notna()).sum()))
print("6. Unlabeled records:", int(labels.isna().sum()))

# Label 0/1 must be reviewed.
# Label 2 may be awaiting review or already reviewed.
valid_statuses = {
    0: {"REVIEWED"},
    1: {"REVIEWED"},
    2: {"NEEDS_REVIEW", "REVIEWED"},
}

status_mismatch = pd.Series(
    [
        pd.isna(label)
        or status not in valid_statuses.get(label, set())
        for label, status in zip(
            labels,
            df["review_status"].fillna("")
        )
    ],
    index=df.index,
)

print("7. Review-status mismatches:", int(status_mismatch.sum()))
print("\n8. Empty conversation texts:")
print(
    int(
        df["conversation_text"].isna().sum()
        + df["conversation_text"].fillna("").str.strip().eq("").sum()
        - df["conversation_text"].isna().sum()
    )
)

print("\n9. Label distribution (%):")
print((labels.value_counts(normalize=True).sort_index() * 100).round(2).to_string())

print("\n10. Sample unresolved borderline records:")
cols = ["conversation_id", "review_status", "annotator_reason"]
print(df.loc[labels == 2, cols].to_string(index=False))

print("\nAudit complete. No files modified.")
