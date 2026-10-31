
import pandas as pd
import numpy as np

INPUT_PATH = r"data\interim\sentiment_messages.csv"
OUTPUT_PATH = r"data\processed\conversation_features.csv"

print("Loading sentiment-enriched messages...")
df = pd.read_csv(INPUT_PATH)

required_columns = {
    "tweet_id",
    "conversation_id",
    "inbound",
    "created_at",
    "sentiment",
    "negative_probability",
    "text",
}

missing = required_columns - set(df.columns)
if missing:
    raise ValueError(f"Missing required columns: {sorted(missing)}")

df["created_at"] = pd.to_datetime(
    df["created_at"], errors="coerce", utc=True
)
df["negative_probability"] = pd.to_numeric(
    df["negative_probability"], errors="coerce"
)

df = df.dropna(
    subset=["conversation_id", "created_at", "negative_probability"]
).copy()

df = df.sort_values(
    ["conversation_id", "created_at", "tweet_id"]
).reset_index(drop=True)

# inbound=True means customer; inbound=False means support.
df["is_customer"] = df["inbound"].astype(bool)
df["is_support"] = ~df["is_customer"]

# Only customer messages contribute to customer sentiment features.
df["customer_negative_probability"] = np.where(
    df["is_customer"], df["negative_probability"], np.nan
)
df["customer_negative_flag"] = np.where(
    df["is_customer"],
    (df["sentiment"] == 0).astype(float),
    np.nan,
)

# Delay from the immediately preceding message, if available.
df["previous_message_time"] = (
    df.groupby("conversation_id")["created_at"].shift(1)
)
df["response_delay_seconds"] = (
    df["created_at"] - df["previous_message_time"]
).dt.total_seconds()

# A support response delay is observed only on support messages.
df["observed_support_delay"] = np.where(
    df["is_support"] & df["previous_message_time"].notna(),
    df["response_delay_seconds"],
    np.nan,
)

print(f"Messages loaded: {len(df):,}")
print(f"Conversations: {df['conversation_id'].nunique():,}")
print("Building time-aware snapshots...")

rows = []

for conversation_id, group in df.groupby(
    "conversation_id", sort=False
):
    group = group.reset_index(drop=True)
    start_time = group["created_at"].iloc[0]

    customer_probs = []
    customer_flags = []
    observed_delays = []
    customer_count = 0
    support_count = 0

    for i, message in group.iterrows():
        is_customer = bool(message["is_customer"])
        is_support = bool(message["is_support"])

        if is_customer:
            customer_count += 1
            customer_probs.append(
                float(message["negative_probability"])
            )
            customer_flags.append(int(message["sentiment"] == 0))

        if is_support:
            support_count += 1
            delay = message["observed_support_delay"]
            if pd.notna(delay) and delay >= 0:
                observed_delays.append(float(delay))

        probs = np.asarray(customer_probs, dtype=float)

        if len(probs) >= 2:
            sentiment_slope = float(
                np.polyfit(np.arange(len(probs)), probs, 1)[0]
            )
        else:
            sentiment_slope = 0.0

        current_time = message["created_at"]

        rows.append({
            "conversation_id": conversation_id,
            "snapshot_tweet_id": message["tweet_id"],
            "snapshot_time": current_time,
            "messages_seen": i + 1,
            "customer_message_count": customer_count,
            "support_message_count": support_count,
            "customer_negative_message_count": sum(customer_flags),
            "customer_negative_ratio": (
                float(np.mean(customer_flags))
                if customer_flags else np.nan
            ),
            "customer_average_negative_probability": (
                float(np.mean(probs)) if len(probs) else np.nan
            ),
            "latest_customer_negative_probability": (
                float(probs[-1]) if len(probs) else np.nan
            ),
            "customer_sentiment_slope": sentiment_slope,
            "average_support_response_delay_seconds": (
                float(np.mean(observed_delays))
                if observed_delays else np.nan
            ),
            "max_support_response_delay_seconds": (
                float(np.max(observed_delays))
                if observed_delays else np.nan
            ),
            "elapsed_seconds": (
                current_time - start_time
            ).total_seconds(),
            "current_message_is_customer": is_customer,
        })

features = pd.DataFrame(rows)

# Do not attach final conversation labels to each snapshot.
# Escalation event timestamps are not currently available.
features.to_csv(OUTPUT_PATH, index=False)

print("\nTime-aware feature generation complete.")
print(f"Output: {OUTPUT_PATH}")
print(f"Snapshots: {len(features):,}")
print(f"Conversations: {features['conversation_id'].nunique():,}")
print(f"Columns: {len(features.columns)}")
print("\nSample:")
print(features.head(5).to_string(index=False))
print("\nMissing values in customer sentiment features:")
print(
    features[
        [
            "customer_negative_ratio",
            "customer_average_negative_probability",
            "latest_customer_negative_probability",
        ]
    ].isna().sum()
)
