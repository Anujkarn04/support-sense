
import pandas as pd

PATH = "data/labeled/escalation_conversation_annotation.csv"

# 0 = Not escalated, 1 = Escalated, 2 = Borderline
labels = {
    629270: (0, "Train cancellation inquiry; no escalation behavior"),
    630036: (0, "Routine question about a possible promotion scam"),
    631112: (0, "Request declined; disappointment without escalation"),
    635331: (0, "Positive product feedback"),
    635479: (0, "Travel inquiry resolved"),
    637446: (0, "Routine technical support request"),
    641038: (0, "Positive customer feedback"),
    649819: (1, "Data breach concern and intention to contact attorney general"),
    653454: (0, "Order inquiry; customer cooperates with support"),
    658970: (2, "Extended train disruption and dissatisfaction; escalation unclear"),
    660166: (2, "Potential injury from foreign object in food; outcome unknown"),
    660440: (0, "Service complaint without clear escalation intent"),
    669009: (0, "Technical issue acknowledged and follow-up accepted"),
    669736: (0, "Routine promotion inquiry"),
    679808: (0, "Incident reported to critical response line"),
    685406: (0, "Positive interaction"),
    686755: (0, "Routine promotion inquiry"),
    688306: (1, "Repeated outages and strong dissatisfaction"),
    698606: (1, "Threat to leave services and severe unresolved dispute"),
    699572: (2, "Mixed reports of the issue and possible resolution"),
    699775: (0, "Positive interaction; no support escalation"),
    702852: (0, "Routine offer eligibility inquiry"),
    710316: (0, "Technical issue reported; support begins troubleshooting"),
    712276: (1, "Failed transaction reversal and unanswered support call"),
    715237: (0, "Routine routing complaint with support offered"),
    715248: (0, "Routine account information inquiry"),
    721781: (2, "Repeated support instructions; unresolved outcome unclear"),
    730007: (0, "Casual comment, not a support escalation"),
    730706: (0, "Product complaint with support offering assistance"),
    736304: (0, "Positive customer feedback"),
    737802: (2, "Repeated store-service complaints; escalation unclear"),
    738425: (0, "Issue appears resolved; customer praises support"),
    748964: (0, "Account recovery request"),
    749391: (1, "Missing birthday gift order and unresolved store confusion"),
    750293: (2, "Long-term customer disputes a charge; outcome unclear"),
    750848: (2, "Missed connection concern and unanswered follow-up"),
    753889: (0, "Playful interaction"),
    755365: (0, "Positive feedback and routine suggestion"),
    759308: (0, "Technical troubleshooting is underway"),
    763568: (0, "Routine airline miles question"),
    766208: (0, "Technical complaint without clear escalation behavior"),
    773214: (1, "Repeated dead ends and severe dissatisfaction with service"),
    774076: (0, "Food-service complaint without clear escalation behavior"),
    774968: (0, "Minor product feedback"),
    790253: (0, "Routine delivery-policy question"),
    805324: (0, "Casual food question"),
    809200: (0, "Service criticism without clear escalation behavior"),
    809961: (0, "Product feedback without escalation behavior"),
    812148: (1, "Five advisers failed to resolve an account/order problem"),
    822357: (0, "Routine product availability question"),
}

df = pd.read_csv(PATH)

df["escalation_label"] = pd.to_numeric(
    df["escalation_label"], errors="coerce"
).astype("Int64")
df["review_status"] = df["review_status"].fillna("").astype(str)
df["annotator_reason"] = df["annotator_reason"].fillna("").astype(str)

# Validate the entire batch before modifying any rows
if len(labels) != 50:
    raise ValueError(f"Expected 50 labels, got {len(labels)}")

for conversation_id in labels:
    mask = df["conversation_id"] == conversation_id

    if mask.sum() != 1:
        raise ValueError(
            f"ID {conversation_id}: expected one row, found {mask.sum()}"
        )

    if df.loc[mask, "review_status"].iloc[0] in (
        "REVIEWED", "NEEDS_REVIEW"
    ):
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

print("Batch 4 processed:", len(labels))
print("Reviewed:", (df["review_status"] == "REVIEWED").sum())
print("Needs review:", (df["review_status"] == "NEEDS_REVIEW").sum())
print("Still unlabeled:", df["escalation_label"].isna().sum())
print("Escalated:", (df["escalation_label"] == 1).sum())
print("Not escalated:", (df["escalation_label"] == 0).sum())
print("Borderline:", (df["escalation_label"] == 2).sum())
