import pandas as pd

print("Loading reconstructed conversations...")

input_path = r"data\interim\twitter_conversations.csv"

df = pd.read_csv(input_path)

df["created_at"] = pd.to_datetime(
    df["created_at"],
    errors="coerce",
    utc=True
)

print(f"Total rows: {len(df):,}")
print(f"Unique conversations: {df['conversation_id'].nunique():,}")

# --------------------------------------------------
# Find some conversations with multiple messages
# --------------------------------------------------

conversation_sizes = (
    df.groupby("conversation_id")
    .size()
    .sort_values(ascending=False)
)

# Pick a few reasonably sized conversations
candidate_ids = conversation_sizes[
    (conversation_sizes >= 5) &
    (conversation_sizes <= 15)
].head(3).index

# --------------------------------------------------
# Display conversations
# --------------------------------------------------

for conversation_id in candidate_ids:

    conversation = df[
        df["conversation_id"] == conversation_id
    ].sort_values("created_at")

    print("\n" + "=" * 80)
    print(f"CONVERSATION ID: {conversation_id}")
    print(f"MESSAGES: {len(conversation)}")
    print("=" * 80)

    for _, row in conversation.iterrows():

        role = "CUSTOMER" if row["inbound"] else "SUPPORT"

        print(
            f"\n[{row['created_at']}] [{role}]"
        )

        print(row["text"])

print("\nValidation complete.")