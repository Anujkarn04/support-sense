import pandas as pd

print("Loading Twitter customer support dataset...")

twitter_path = r"data\raw\twcs.csv"

df = pd.read_csv(twitter_path)

print(f"Total rows: {len(df):,}")

# Convert timestamp
df["created_at"] = pd.to_datetime(
    df["created_at"],
    errors="coerce",
    utc=True
)

print("Dataset loaded successfully.")

# --------------------------------------------------
# 1. Basic information
# --------------------------------------------------

print("\nColumns:")
print(df.columns.tolist())

print("\nMissing values:")
print(df.isnull().sum())

print("\nInbound distribution:")
print(df["inbound"].value_counts())

print("\nDate range:")
print("Start:", df["created_at"].min())
print("End:", df["created_at"].max())

# --------------------------------------------------
# 2. Build parent lookup
# --------------------------------------------------

print("\nBuilding conversation links...")

parent_map = (
    df[["tweet_id", "in_response_to_tweet_id"]]
    .dropna(subset=["in_response_to_tweet_id"])
    .set_index("tweet_id")["in_response_to_tweet_id"]
    .astype("int64")
    .to_dict()
)

print(f"Parent links found: {len(parent_map):,}")

# --------------------------------------------------
# 3. Find conversation root
# --------------------------------------------------

def find_root(tweet_id):
    current = tweet_id
    visited = set()

    while current in parent_map:

        # Protect against accidental cycles
        if current in visited:
            break

        visited.add(current)

        parent = parent_map[current]

        # Parent exists but is missing from dataset
        if parent not in parent_map and parent not in tweet_ids:
            current = parent
            break

        current = parent

    return current


tweet_ids = set(df["tweet_id"].tolist())

print("Finding conversation roots...")

df["conversation_id"] = df["tweet_id"].map(find_root)

print("Conversation reconstruction complete.")

# --------------------------------------------------
# 4. Conversation statistics
# --------------------------------------------------

conversation_counts = (
    df.groupby("conversation_id")
    .size()
    .sort_values(ascending=False)
)

print("\nNumber of unique conversations:")
print(conversation_counts.shape[0])

print("\nConversation size statistics:")
print(conversation_counts.describe())

print("\nLargest conversations:")
print(conversation_counts.head(10))

# --------------------------------------------------
# 5. Save reconstructed data
# --------------------------------------------------

output_path = r"data\interim\twitter_conversations.csv"

print(f"\nSaving reconstructed dataset to:")
print(output_path)

df.to_csv(output_path, index=False)

print("\nConversation reconstruction finished successfully.")