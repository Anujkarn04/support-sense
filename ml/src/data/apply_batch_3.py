
import pandas as pd

PATH = "data/labeled/escalation_conversation_annotation.csv"

# Label: 0 = Not escalated, 1 = Escalated, 2 = Borderline
labels = {
    300895: (2, "Customer complaint with weak follow-up; borderline"),
    310925: (2, "Repeated billing concern but escalation evidence is limited"),
    330642: (0, "Normal account access support request"),
    337605: (0, "Routine request; customer accepts the answer"),
    348602: (1, "Repeated failed transaction reversal with no resolution"),
    384316: (1, "Third day without action; customer questions seriousness"),
    386612: (0, "Routine product information question"),
    394316: (1, "Recurring email problem remains unresolved; no ETA"),
    396559: (0, "Minor food complaint without escalation"),
    396637: (0, "Waiting-time complaint without further escalation"),
    398600: (0, "Replacement and transaction void confirmed"),
    398887: (1, "Repeated flight disruption and explicit intent to stop flying"),
    399995: (0, "Routine airline loyalty question"),
    409978: (0, "Casual suggestion, not a support escalation"),
    427461: (1, "Strong complaint about rude staff and family treatment"),
    431566: (0, "Delivery annoyance; customer says nothing was damaged"),
    446566: (0, "Travel disruption acknowledged; no clear escalation intent"),
    461266: (0, "Positive first-purchase interaction"),
    465435: (0, "Service-quality complaint without clear escalation"),
    467409: (1, "Failed delivery, call-centre hang-ups, and missing refund"),
    472709: (0, "Routine travel-card validity question"),
    475878: (0, "Normal support interaction"),
    480001: (0, "Positive customer interaction"),
    487937: (0, "Technical issue being investigated by support"),
    493347: (1, "Repeated failed grocery deliveries and unresolved communication"),
    496624: (0, "Casual positive travel interaction"),
    499089: (1, "Repeated rail failures and unresolved blame/communication dispute"),
    500115: (2, "Strong train-service complaint; escalation intent unclear"),
    504949: (1, "Failed delivery with no notification or useful contact route"),
    507295: (0, "Routine software feedback issue"),
    508204: (0, "Package concern; no confirmed loss or damage"),
    511583: (0, "Routine service-outage and repair-time inquiry"),
    512138: (2, "Mixed conversation context; escalation attribution uncertain"),
    516553: (0, "Account security complaint; support offers investigation"),
    534484: (0, "Routine onboard-service question"),
    545143: (1, "Years of unresolved service problems and strong frustration"),
    551940: (1, "Package still missing after support said it was fixed"),
    552277: (1, "Repeated delivery failure and missed supervisor callback"),
    557935: (1, "Repeated contacts through phone and social media without updates"),
    560347: (0, "Routine pending-order inquiry"),
    579113: (0, "Delivery concern without clear escalation behavior"),
    580056: (0, "Routine follow-up about a technical patch"),
    589677: (0, "Positive customer interaction"),
    591565: (2, "Travel disruption and compensation concern; borderline"),
    596289: (1, "Customer says problems are not being resolved promptly"),
    600977: (0, "Lighthearted clarification about flight availability"),
    603621: (0, "Positive customer feedback"),
    607569: (0, "Playful, non-complaint interaction"),
    608394: (0, "Humorous discussion without a support complaint"),
    623182: (0, "Routine account recovery request"),
}

df = pd.read_csv(PATH)

df["escalation_label"] = pd.to_numeric(
    df["escalation_label"], errors="coerce"
).astype("Int64")
df["review_status"] = df["review_status"].fillna("").astype(str)
df["annotator_reason"] = df["annotator_reason"].fillna("").astype(str)

for conversation_id, (label, reason) in labels.items():
    mask = df["conversation_id"] == conversation_id

    if mask.sum() != 1:
        raise ValueError(
            f"Expected exactly one row for ID {conversation_id}; "
            f"found {mask.sum()}"
        )

    if df.loc[mask, "review_status"].iloc[0] == "REVIEWED":
        raise ValueError(f"Already reviewed: {conversation_id}")

# Validate every ID before changing the dataset
missing_ids = set(labels) - set(df["conversation_id"])
if missing_ids:
    raise ValueError(f"Missing IDs: {sorted(missing_ids)}")

for conversation_id, (label, reason) in labels.items():
    mask = df["conversation_id"] == conversation_id
    df.loc[mask, "escalation_label"] = label
    df.loc[mask, "review_status"] = (
        "NEEDS_REVIEW" if label == 2 else "REVIEWED"
    )
    df.loc[mask, "annotator_reason"] = reason

df.to_csv(PATH, index=False)

print("Batch 3 processed:", len(labels))
print("Reviewed:", (df["review_status"] == "REVIEWED").sum())
print("Needs review:", (df["review_status"] == "NEEDS_REVIEW").sum())
print("Still unlabeled:", df["escalation_label"].isna().sum())
print("Escalated:", (df["escalation_label"] == 1).sum())
print("Not escalated:", (df["escalation_label"] == 0).sum())
print("Borderline:", (df["escalation_label"] == 2).sum())
