
import pandas as pd
from pathlib import Path

annotations_path = Path(
    "data/labeled/escalation_conversation_annotation.csv"
)
features_path = Path(
    "data/processed/conversation_features.csv"
)

annotations = pd.read_csv(annotations_path)
features = pd.read_csv(features_path)

annotations["conversation_id"] = pd.to_numeric(
    annotations["conversation_id"], errors="raise"
).astype("int64")

features["conversation_id"] = pd.to_numeric(
    features["conversation_id"], errors="raise"
).astype("int64")

print("ANNOTATION ROWS:", len(annotations))
print("FEATURE ROWS:", len(features))

print(
    "Duplicate annotation IDs:",
    annotations["conversation_id"].duplicated().sum()
)
print(
    "Duplicate feature IDs:",
    features["conversation_id"].duplicated().sum()
)

annotation_ids = set(annotations["conversation_id"])
feature_ids = set(features["conversation_id"])

print(
    "Annotations without matching features:",
    len(annotation_ids - feature_ids)
)
print(
    "Features without annotations:",
    len(feature_ids - annotation_ids)
)

matched = annotations.merge(
    features,
    on="conversation_id",
    how="inner",
    validate="one_to_one",
    suffixes=("_annotation", "_feature")
)

print("Matched conversations:", len(matched))

required_features = [
    "message_count_feature",
    "customer_message_count",
    "support_message_count",
    "negative_ratio_feature",
    "average_negative_probability",
    "sentiment_slope",
    "average_support_response_delay",
    "conversation_duration_seconds",
]

# The source feature file uses message_count and negative_ratio.
# Rename only in memory to avoid collisions with annotation columns.
matched = matched.rename(columns={
    "message_count": "message_count_feature",
    "negative_ratio": "negative_ratio_feature",
})

available = [
    col for col in required_features if col in matched.columns
]
print("\nFeature columns available for inspection:", available)

print("\nMissing values in selected features:")
print(matched[available].isna().sum().to_string())

print("\nBinary-label counts among matched records:")
print(
    matched.loc[
        matched["escalation_label"].isin([0, 1]),
        "escalation_label"
    ].value_counts().sort_index().to_string()
)

print("\nJoin validation complete. No files modified.")
