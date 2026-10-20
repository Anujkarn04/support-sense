import pandas as pd
from pathlib import Path

path = Path("data/interim/twitter_conversations.csv")
df = pd.read_csv(path, low_memory=False)

required = {
    "tweet_id",
    "author_id",
    "inbound",
    "created_at",
    "text",
    "response_tweet_id",
    "in_response_to_tweet_id",
    "conversation_id",
}

missing = required - set(df.columns)
if missing:
    raise ValueError(f"Missing required columns: {sorted(missing)}")

df["tweet_id"] = pd.to_numeric(df["tweet_id"], errors="coerce")
df["in_response_to_tweet_id"] = pd.to_numeric(
    df["in_response_to_tweet_id"], errors="coerce"
)
df["conversation_id"] = pd.to_numeric(
    df["conversation_id"], errors="coerce"
)

tweet_ids = set(df["tweet_id"].dropna().astype("int64"))
tweet_to_conversation = df.drop_duplicates("tweet_id").set_index(
    "tweet_id"
)["conversation_id"]

parent = df["in_response_to_tweet_id"]
has_parent = parent.notna()
parent_ids = parent[has_parent].astype("int64")

parent_exists = parent_ids.isin(tweet_ids)
child_rows = df.loc[has_parent].copy()
child_rows["parent_id"] = parent_ids.to_numpy()

parent_conversations = child_rows["parent_id"].map(
    tweet_to_conversation
)

same_conversation = (
    child_rows["conversation_id"].to_numpy()
    == parent_conversations.to_numpy()
)

print("=" * 60)
print("CONVERSATION BOUNDARY / REPLY-LINK AUDIT")
print("=" * 60)

print("\n1. Total messages:", len(df))
print("2. Unique tweet IDs:", df["tweet_id"].nunique())
print("3. Duplicate tweet IDs:", int(df["tweet_id"].duplicated().sum()))
print("4. Messages with a parent reply:", int(has_parent.sum()))
print("5. Parent IDs missing from this file:", int((~parent_exists).sum()))
print(
    "6. Parent-child links in different conversations:",
    int((~same_conversation).sum())
)

print("\n7. Conversations containing both customer and support messages:")
roles = df.groupby("conversation_id")["inbound"].nunique()
print("Mixed-role conversations:", int((roles == 2).sum()))
print("Single-role conversations:", int((roles == 1).sum()))

print("\n8. Messages with empty text:")
print(
    int(
        df["text"].isna().sum()
        + df["text"].fillna("").astype(str).str.strip().eq("").sum()
        - df["text"].isna().sum()
    )
)

print("\n9. Sample cross-conversation parent links:")
bad = child_rows.loc[~same_conversation].copy()
bad["parent_conversation_id"] = parent_conversations.loc[~same_conversation]
print(
    bad[
        [
            "tweet_id",
            "in_response_to_tweet_id",
            "conversation_id",
            "parent_conversation_id",
            "text",
        ]
    ].head(10).to_string(index=False)
)

print("\nAudit complete. No files modified.")