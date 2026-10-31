
import pandas as pd

PATH = "data/labeled/escalation_conversation_annotation.csv"

labels = {
    153092: (0, "Return/refund process accepted"),
    155330: (0, "Complaint actively being handled"),
    155823: (1, "Strong dissatisfaction with crowded train service"),
    165368: (1, "Customer disputes claim that issue was fixed"),
    169770: (1, "Repeated criticism of customer service"),
    183763: (1, "Customer reports no response after contacting support"),
    185450: (0, "Product complaint being handled by support"),
    202701: (0, "Normal transaction support request"),
    211935: (0, "Simple request to contact support"),
    217411: (0, "Website complaint without clear escalation"),
    217466: (1, "Prolonged defective-device and fee dispute"),
    249572: (0, "Positive interaction"),
    254707: (0, "Technical feedback without clear escalation"),
    257795: (1, "Customer reports being disconnected during complaint"),
    259375: (1, "Repeated unresolved delivery issue and severe frustration"),
    270839: (0, "Food-service complaint without clear escalation"),
    277531: (1, "Severe dissatisfaction after cancelled order"),
    285598: (0, "Negative remark without clear escalation"),
    287566: (1, "Lost luggage and repeated poor customer service"),
    288425: (0, "Issue resolved; customer praises support"),
}

df = pd.read_csv(PATH)

df["escalation_label"] = pd.to_numeric(
    df["escalation_label"], errors="coerce"
).astype("Int64")
df["review_status"] = df["review_status"].fillna("").astype(str)
df["annotator_reason"] = df["annotator_reason"].fillna("").astype(str)

for conversation_id, (label, reason) in labels.items():
    mask = df["conversation_id"] == conversation_id

    if not mask.any():
        raise ValueError(f"Conversation ID not found: {conversation_id}")

    if (df.loc[mask, "review_status"] == "REVIEWED").any():
        raise ValueError(f"Already reviewed: {conversation_id}")

    df.loc[mask, "escalation_label"] = label
    df.loc[mask, "review_status"] = "REVIEWED"
    df.loc[mask, "annotator_reason"] = reason

df.to_csv(PATH, index=False)

print("Batch 2 annotated:", len(labels))
print("Total reviewed:", (df["review_status"] == "REVIEWED").sum())
print("Remaining:", (df["review_status"] != "REVIEWED").sum())
print("Escalated:", (df["escalation_label"] == 1).sum())
print("Not escalated:", (df["escalation_label"] == 0).sum())
