import pandas as pd
import numpy as np

print("Loading sentiment-enriched conversations...")

input_path = r"data\interim\sentiment_messages.csv"

df = pd.read_csv(input_path)

df["created_at"] = pd.to_datetime(
    df["created_at"],
    errors="coerce",
    utc=True
)

print(f"Total messages: {len(df):,}")
print(f"Conversations: {df['conversation_id'].nunique():,}")

# --------------------------------------------------
# Sort messages chronologically
# --------------------------------------------------

df = df.sort_values(
    ["conversation_id", "created_at"]
).reset_index(drop=True)

# --------------------------------------------------
# Message-level derived features
# --------------------------------------------------

df["is_customer"] = df["inbound"].astype(int)
df["is_support"] = (~df["inbound"]).astype(int)
df["is_negative"] = (df["sentiment"] == 0).astype(int)
df["is_positive"] = (df["sentiment"] == 1).astype(int)

# --------------------------------------------------
# Response delay
# --------------------------------------------------

df["response_delay_seconds"] = (
    df.groupby("conversation_id")["created_at"]
    .diff()
    .dt.total_seconds()
)

# A delay only makes sense when the current message
# is from support responding to a customer.
df["support_response_delay_seconds"] = np.where(
    df["is_support"] == 1,
    df["response_delay_seconds"],
    np.nan
)

# --------------------------------------------------
# Sentiment trajectory
# --------------------------------------------------

# Higher value = more negative
df["negative_score"] = df["negative_probability"]

def calculate_slope(group):
    if len(group) < 2:
        return 0.0

    x = np.arange(len(group))
    y = group["negative_score"].values

    return np.polyfit(x, y, 1)[0]

# --------------------------------------------------
# Conversation-level aggregation
# --------------------------------------------------

features = (
    df.groupby("conversation_id")
    .agg(
        message_count=("tweet_id", "count"),

        customer_message_count=("is_customer", "sum"),

        support_message_count=("is_support", "sum"),

        negative_message_count=("is_negative", "sum"),

        positive_message_count=("is_positive", "sum"),

        negative_ratio=("is_negative", "mean"),

        average_negative_probability=(
            "negative_probability",
            "mean"
        ),

        latest_negative_probability=(
            "negative_probability",
            "last"
        ),

        first_negative_probability=(
            "negative_probability",
            "first"
        ),

        conversation_start=(
            "created_at",
            "min"
        ),

        conversation_end=(
            "created_at",
            "max"
        ),

        average_support_response_delay=(
            "support_response_delay_seconds",
            "mean"
        ),

        max_support_response_delay=(
            "support_response_delay_seconds",
            "max"
        )
    )
    .reset_index()
)

# --------------------------------------------------
# Conversation duration
# --------------------------------------------------

features["conversation_duration_seconds"] = (
    features["conversation_end"]
    - features["conversation_start"]
).dt.total_seconds()

# --------------------------------------------------
# Sentiment trajectory slope
# --------------------------------------------------

print("Calculating sentiment trajectories...")

slopes = (
    df.groupby("conversation_id")
    .apply(
        calculate_slope,
        include_groups=False
    )
    .rename("sentiment_slope")
    .reset_index()
)

features = features.merge(
    slopes,
    on="conversation_id",
    how="left"
)

features["sentiment_slope"] = (
    features["sentiment_slope"]
    .fillna(0)
)

# --------------------------------------------------
# Negative sentiment change
# --------------------------------------------------

features["negative_probability_change"] = (
    features["latest_negative_probability"]
    - features["first_negative_probability"]
)

# --------------------------------------------------
# Save
# --------------------------------------------------

output_path = r"data\processed\conversation_level_features.csv"

features.to_csv(
    output_path,
    index=False
)

print("\nFeature engineering complete.")

print(f"Output: {output_path}")

print(f"Conversations: {len(features):,}")

print(f"Features: {len(features.columns)}")

print("\nFeature columns:")

print(features.columns.tolist())

print("\nFirst 5 rows:")

print(features.head())
