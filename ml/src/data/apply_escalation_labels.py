import pandas as pd

PATH = "data/labeled/escalation_conversation_annotation.csv"

labels = {
    5066: (0, "No escalation behavior"),
    10534: (0, "Price complaint but no escalation"),
    11751: (0, "Positive interaction"),
    12195: (0, "Minor disappointment, no escalation"),
    17015: (0, "Positive interaction"),
    19883: (0, "Issue resolved/helpful support"),
    29526: (0, "Issue resolved through return/exchange process"),
    30657: (0, "Positive interaction with minor complaint"),
    30777: (0, "Normal product question, no escalation"),
    51620: (0, "Issue acknowledged and customer reassured"),
    77963: (0, "Positive interaction"),
    89660: (0, "Problem acknowledged, no escalation"),
    98616: (1, "Strong dissatisfaction and threat to stop ordering"),
    110185: (0, "Complaint being handled by support"),
    111863: (0, "Delivery concern but no escalation"),
    121565: (0, "Normal technical support request"),
    125309: (0, "Positive interaction"),
    135449: (0, "Product safety concern, support offers refund"),
    143394: (0, "Positive interaction"),
    145181: (0, "Normal technical support request"),
}

df = pd.read_csv(PATH)

# Make sure these columns can hold the required values
df["escalation_label"] = pd.to_numeric(
    df["escalation_label"], errors="coerce"
).astype("Int64")

df["review_status"] = df["review_status"].fillna("").astype(str)
df["annotator_reason"] = df["annotator_reason"].fillna("").astype(str)

# Apply labels safely using the dataframe index
for conversation_id, (label, reason) in labels.items():
    mask = df["conversation_id"] == conversation_id

    df.loc[mask, "escalation_label"] = label
    df.loc[mask, "review_status"] = "REVIEWED"
    df.loc[mask, "annotator_reason"] = reason

df.to_csv(PATH, index=False)

print("Successfully annotated:", len(labels))
print("Reviewed:", (df["review_status"] == "REVIEWED").sum())
print("Remaining:", (df["review_status"] == "UNLABELED").sum())
print()
print(
    df[df["review_status"] == "REVIEWED"][
        ["conversation_id", "escalation_label", "review_status"]
    ].head(20).to_string(index=False)
)