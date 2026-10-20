import pandas as pd

print("Loading reconstructed conversations...")

input_path = r"data\interim\twitter_conversations.csv"

df = pd.read_csv(input_path)

df["created_at"] = pd.to_datetime(
    df["created_at"],
    errors="coerce",
    utc=True
)

print(f"Total messages: {len(df):,}")
print(f"Total conversations: {df['conversation_id'].nunique():,}")

# --------------------------------------------------
# Count customer and support messages per conversation
# --------------------------------------------------

conversation_stats = (
    df.groupby("conversation_id")
    .agg(
        total_messages=("tweet_id", "count"),
        customer_messages=("inbound", "sum"),
        support_messages=("inbound", lambda x: (~x).sum())
    )
    .reset_index()
)

print("\nConversation statistics calculated.")

# --------------------------------------------------
# Keep conversations containing both sides
# --------------------------------------------------

valid_conversations = conversation_stats[
    (conversation_stats["customer_messages"] > 0)
    & (conversation_stats["support_messages"] > 0)
]

print(
    f"\nSupport-related conversations: "
    f"{len(valid_conversations):,}"
)

print(
    f"Removed conversations: "
    f"{len(conversation_stats) - len(valid_conversations):,}"
)

# --------------------------------------------------
# Filter original messages
# --------------------------------------------------

valid_ids = set(valid_conversations["conversation_id"])

support_df = df[
    df["conversation_id"].isin(valid_ids)
].copy()

# --------------------------------------------------
# Sort conversations chronologically
# --------------------------------------------------

support_df = support_df.sort_values(
    ["conversation_id", "created_at"]
)

# --------------------------------------------------
# Save
# --------------------------------------------------

output_path = r"data\interim\support_conversations.csv"

support_df.to_csv(
    output_path,
    index=False
)

print("\nFiltered dataset saved to:")
print(output_path)

print(
    f"\nFinal messages: "
    f"{len(support_df):,}"
)

print(
    f"Final conversations: "
    f"{support_df['conversation_id'].nunique():,}"
)

print("\nFiltering complete.")
