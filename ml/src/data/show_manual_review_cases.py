import pandas as pd

path = "data/labeled/escalation_conversation_annotation.csv"

df = pd.read_csv(path)

review_ids = [721781, 1191949, 1988224, 2938118]

df["conversation_id"] = pd.to_numeric(
    df["conversation_id"], errors="raise"
).astype("int64")

cases = df[df["conversation_id"].isin(review_ids)]

for conversation_id in review_ids:
    row = cases[cases["conversation_id"] == conversation_id]

    print("\n" + "=" * 80)

    if row.empty:
        print(f"Conversation {conversation_id}: NOT FOUND")
        continue

    record = row.iloc[0]

    print(f"Conversation ID: {conversation_id}")
    print(f"Current label: {record['escalation_label']}")
    print(f"Review status: {record['review_status']}")
    print(f"Reason: {record['annotator_reason']}")
    print("\nFULL CONVERSATION:")
    print(record["conversation_text"])

print("\nExtraction complete. No files modified.")