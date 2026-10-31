
import pandas as pd

annotations = pd.read_csv(
    "data/labeled/escalation_conversation_annotation.csv"
)
features = pd.read_csv(
    "data/processed/conversation_features.csv"
)

annotations["conversation_id"] = pd.to_numeric(
    annotations["conversation_id"], errors="raise"
).astype("int64")
features["conversation_id"] = pd.to_numeric(
    features["conversation_id"], errors="raise"
).astype("int64")

data = annotations.merge(
    features,
    on="conversation_id",
    how="inner",
    validate="one_to_one",
    suffixes=("_annotation", "_feature"),
)

data["escalation_label"] = pd.to_numeric(
    data["escalation_label"], errors="raise"
)

# Exclude the unresolved label 2.
data = data[data["escalation_label"].isin([0, 1])].copy()

print("Binary-labeled rows:", len(data))

print("\n1. Potentially unavailable at prediction time:")
for col in [
    "conversation_duration_seconds",
    "conversation_end",
    "message_count",
    "negative_message_count",
    "positive_message_count",
    "negative_ratio",
    "average_negative_probability",
    "latest_negative_probability",
    "first_negative_probability",
    "sentiment_slope",
    "negative_probability_change",
    "average_support_response_delay",
    "max_support_response_delay",
]:
    if col in data.columns:
        print("-", col)

print("\n2. Feature-label correlations (exploratory only):")
numeric = data.select_dtypes(include="number")
corr = numeric.corr()["escalation_label"].drop(
    labels=["escalation_label"], errors="ignore"
)
print(corr.reindex(corr.abs().sort_values(ascending=False).index).round(3))

print("\n3. Conversation size distribution:")
print(data["message_count_feature"].describe().round(2).to_string())

print("\nThis is a diagnostic, not proof of leakage.")
print("No files modified.")
