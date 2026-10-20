
import pandas as pd

PATH = "data/labeled/escalation_conversation_annotation.csv"

# 0 = Not escalated, 1 = Escalated, 2 = Borderline
labels = {
    824245: (0, "Concern raised; no clear escalation behavior"),
    825479: (0, "Routine availability inquiry"),
    827066: (0, "Referral-link inquiry handled through support"),
    838860: (0, "Positive feedback about support agent"),
    850945: (0, "Customer expresses gratitude for assistance"),
    853585: (0, "Routine question about support options"),
    859284: (0, "SIM and store-location questions answered"),
    861117: (0, "Stolen-phone report; support explains available action"),
    870638: (0, "Positive customer feedback"),
    878566: (0, "Billing support inquiry without escalation behavior"),
    879521: (1, "Repeated transfers and dropped call; customer refuses to return"),
    898539: (1, "Three shipping failures and no satisfactory explanation"),
    919004: (1, "Missing paid item and refusal of refund or redelivery"),
    922766: (0, "Routine app feedback inquiry"),
    931492: (0, "Positive interaction"),
    943413: (0, "Positive product feedback"),
    949449: (0, "Accessibility concern; no explicit escalation intent"),
    951011: (0, "Positive customer feedback"),
    951503: (0, "Technical issue resolved"),
    954652: (0, "Positive check-in feedback"),
    963149: (0, "Positive customer feedback"),
    965636: (0, "Routine opening-hours question"),
    973843: (0, "Routine product availability inquiry"),
    989882: (0, "Store-hours inquiry accepted without dispute"),
    990137: (0, "General dissatisfaction without a clear support escalation"),
    991558: (0, "Train delay explained by support"),
    993284: (0, "Packaging feedback; no clear escalation behavior"),
    1001967: (0, "Routine train-service inquiry"),
    1005573: (0, "Positive, casual interaction"),
    1005608: (0, "Routine product-ingredient question"),
    1012526: (1, "Strong criticism of railway management and communication"),
    1018173: (1, "Repeated unresolved defective-phone and refund dispute"),
    1033496: (0, "Playful positive interaction"),
    1034688: (0, "Casual conversation"),
    1040517: (0, "Product feedback and feature questions without escalation"),
    1050291: (2, "Long hold and disconnected call; escalation severity uncertain"),
    1056578: (0, "Promotion confusion; customer accepts support follow-up"),
    1058967: (1, "Strong accusation of planning failure and refusal to take responsibility"),
    1064528: (0, "Routine cycle-space policy question"),
    1078009: (0, "Disappointment about cancellation without escalation behavior"),
    1090341: (1, "Long-unresolved missing package despite two investigations"),
    1117663: (0, "Service-capacity complaint without clear escalation intent"),
    1122061: (2, "Repeated train cancellations; reason and escalation severity unclear"),
    1127046: (0, "Routine booking-access support request"),
    1151028: (1, "Website information dispute and severe travel-related frustration"),
    1152150: (0, "Billing-cycle question; support offers assistance"),
    1171343: (1, "Repeated shipping delays and failure to dispatch"),
    1171453: (1, "Severe flight experience and dissatisfaction with the response"),
    1191949: (0, "Casual unrelated conversation"),
    1197219: (0, "Positive appreciation for airline staff"),
}

df = pd.read_csv(PATH)

df["escalation_label"] = pd.to_numeric(
    df["escalation_label"], errors="coerce"
).astype("Int64")
df["review_status"] = df["review_status"].fillna("").astype(str)
df["annotator_reason"] = df["annotator_reason"].fillna("").astype(str)

if len(labels) != 50:
    raise ValueError(f"Expected 50 labels, got {len(labels)}")

# Validate all IDs before making changes
for conversation_id in labels:
    mask = df["conversation_id"] == conversation_id

    if mask.sum() != 1:
        raise ValueError(
            f"ID {conversation_id}: expected one row, found {mask.sum()}"
        )

    if pd.notna(df.loc[mask, "escalation_label"].iloc[0]):
        raise ValueError(f"Already labeled: {conversation_id}")

# Apply labels
for conversation_id, (label, reason) in labels.items():
    mask = df["conversation_id"] == conversation_id
    df.loc[mask, "escalation_label"] = label
    df.loc[mask, "review_status"] = (
        "NEEDS_REVIEW" if label == 2 else "REVIEWED"
    )
    df.loc[mask, "annotator_reason"] = reason

df.to_csv(PATH, index=False)

print("Batch 5 processed:", len(labels))
print("Reviewed:", (df["review_status"] == "REVIEWED").sum())
print("Needs review:", (df["review_status"] == "NEEDS_REVIEW").sum())
print("Still unlabeled:", df["escalation_label"].isna().sum())
print("Escalated:", (df["escalation_label"] == 1).sum())
print("Not escalated:", (df["escalation_label"] == 0).sum())
print("Borderline:", (df["escalation_label"] == 2).sum())
