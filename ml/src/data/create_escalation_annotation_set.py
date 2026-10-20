import pandas as pd
import numpy as np

INPUT = "data/interim/sentiment_messages.csv"
OUTPUT = "data/labeled/escalation_annotation.csv"

# Load message-level sentiment data
df = pd.read_csv(INPUT)

df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")

# Sort messages chronologically
df = df.sort_values(["conversation_id", "created_at"])

# Conversation-level statistics
conversation_stats = (
    df.groupby("conversation_id")
    .agg(
        message_count=("conversation_id", "size"),
        avg_negative_probability=("negative_probability", "mean"),
        max_negative_probability=("negative_probability", "max"),
        first_negative_probability=("negative_probability", "first"),
        last_negative_probability=("negative_probability", "last"),
        negative_message_count=(
            "sentiment_label",
            lambda x: (x == "negative").sum()
        ),
    )
    .reset_index()
)

conversation_stats["negative_change"] = (
    conversation_stats["last_negative_probability"]
    - conversation_stats["first_negative_probability"]
)

conversation_stats["negative_ratio"] = (
    conversation_stats["negative_message_count"]
    / conversation_stats["message_count"]
)

# Exploratory candidate score ONLY for sampling.
# This is NOT the escalation label.
conversation_stats["candidate_score"] = (
    conversation_stats["avg_negative_probability"] * 0.30
    + conversation_stats["max_negative_probability"] * 0.20
    + conversation_stats["negative_change"].clip(lower=0) * 0.25
    + conversation_stats["negative_ratio"] * 0.25
)

# ---------------------------------------------------------
# Select candidate conversations
# ---------------------------------------------------------

# 200 high-signal candidates
high_signal = (
    conversation_stats
    .sort_values("candidate_score", ascending=False)
    .head(200)
)

# 200 random conversations
random_sample = conversation_stats.sample(
    n=200,
    random_state=42
)

# 100 conversations with strong sentiment deterioration
deteriorating = (
    conversation_stats
    .sort_values("negative_change", ascending=False)
    .head(100)
)

# Combine and remove duplicates
annotation_ids = pd.concat(
    [
        high_signal[["conversation_id"]],
        random_sample[["conversation_id"]],
        deteriorating[["conversation_id"]],
    ]
).drop_duplicates()

# ---------------------------------------------------------
# Extract all messages belonging to selected conversations
# ---------------------------------------------------------

annotation_df = df[
    df["conversation_id"].isin(annotation_ids["conversation_id"])
].copy()

# Add conversation-level statistics
annotation_df = annotation_df.merge(
    conversation_stats,
    on="conversation_id",
    how="left",
    suffixes=("", "_conversation")
)

# ---------------------------------------------------------
# Add annotation columns
# ---------------------------------------------------------

annotation_df["escalation_label"] = np.nan

annotation_df["review_status"] = "UNLABELED"

annotation_df["annotator_reason"] = ""

annotation_df["label_source"] = "manual_annotation"

# Keep useful columns
annotation_df = annotation_df[
    [
        "conversation_id",
        "created_at",
        "inbound",
        "text",
        "sentiment_label",
        "negative_probability",
        "message_count",
        "avg_negative_probability",
        "max_negative_probability",
        "negative_change",
        "negative_ratio",
        "escalation_label",
        "review_status",
        "annotator_reason",
        "label_source",
    ]
]

# Create output directory
import os
os.makedirs("data/labeled", exist_ok=True)

annotation_df.to_csv(
    OUTPUT,
    index=False
)

print("====================================")
print("Escalation annotation dataset created")
print("====================================")
print("Conversations:", annotation_df["conversation_id"].nunique())
print("Messages:", len(annotation_df))
print("Output:", OUTPUT)