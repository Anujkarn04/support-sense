import pandas as pd

path = "data/labeled/escalation_conversation_annotation.csv"
df = pd.read_csv(path)

review_ids = [512138, 1821585, 2342478, 2361386, 2407879]

df["conversation_id"] = pd.to_numeric(
    df["conversation_id"], errors="raise"
).astype("int64")

for cid in review_ids:
    rows = df[df["conversation_id"] == cid]

    print("\n" + "=" * 90)

    if rows.empty:
        print(f"Conversation {cid}: NOT FOUND")
        continue

    row = rows.iloc[0]

    print("Conversation ID:", cid)
    print("Current label:", row["escalation_label"])
    print("Review status:", row["review_status"])
    print("Reason:", row["annotator_reason"])
    print("\nFULL CONVERSATION:")
    print(row["conversation_text"])

print("\nExtraction complete. No files modified.")