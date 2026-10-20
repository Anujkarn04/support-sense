
import pandas as pd
from pathlib import Path

FILE = Path("data/labeled/escalation_conversation_annotation.csv")

# 0 = Not escalated, 1 = Escalated, 2 = Needs review
labels = {
    1816581: (0, "Routine train-delay inquiry"),
    1821585: (2, "Mixed banking complaints and unrelated thread replies; case boundaries unclear"),
    1825567: (0, "Lost-wallet and replacement-card issue without clear escalation behavior"),
    1829512: (1, "Strong accusation of unfair family seating and calling the airline scammers"),
    1833386: (0, "Routine request to contact support"),
    1839363: (0, "Casual comment about airline music"),
    1843070: (0, "Train-delay complaint without clear escalation intent"),
    1852991: (0, "Software-interface complaint with support guidance"),
    1858845: (0, "Road-safety complaint referred to the appropriate team"),
    1866970: (1, "Repeated criticism of reduced calling functionality and poor customer service"),
    1867639: (0, "Software bug report with troubleshooting offered"),
    1874326: (0, "Deleted files issue with a recovery process offered"),
    1880222: (0, "Positive feedback about a train manager"),
    1887239: (0, "Routine question about account-region restrictions"),
    1888123: (1, "Six-month unresolved issue and explicit threat to file a consumer-court complaint"),
    1913794: (0, "Pricing complaint without clear escalation behavior"),
    1916841: (1, "Bank account held for fraud while the risk line remains unreachable"),
    1928492: (0, "Negative rideshare experience without a clear escalation request"),
    1937994: (0, "Positive casual interaction"),
    1942252: (0, "Top-up issue resolved and customer expresses thanks"),
    1943612: (0, "Routine internet-outage inquiry"),
    1951280: (0, "Positive feedback about store staff"),
    1960223: (0, "Routine product availability inquiry"),
    1963451: (0, "Community-wide outage inquiry without clear escalation behavior"),
    1969264: (0, "Network-speed complaint with support follow-up accepted"),
    1979242: (0, "Phone battery-drain complaint without clear escalation behavior"),
    1981427: (1, "Repeated dissatisfaction with a bank and consideration of alternatives"),
    1984357: (0, "Initial angry software-update complaint without repeated escalation behavior"),
    1985380: (0, "Routine request for clarification about an advertisement"),
    1988224: (0, "Gaming issue continues, but escalation behavior is unclear"),
    1995754: (2, "Potentially dangerous driving incident; customer declines reporting"),
    1999344: (0, "Disappointment about bereavement-fare eligibility"),
    2003110: (0, "Feedback about an uncomfortable product experience"),
    2036479: (1, "Severe dissatisfaction with unreliable paid service and a two-hour hold"),
    2038832: (0, "Failed delivery-slot booking without clear escalation intent"),
    2040966: (0, "Discount redemption complaint with support offering assistance"),
    2041902: (0, "Positive casual interaction"),
    2043374: (0, "Casual product suggestion"),
    2048711: (0, "Weather-disruption update without clear escalation behavior"),
    2049427: (0, "Train cancellations and dissatisfaction without clear escalation intent"),
    2061383: (1, "Strong accusation of mishandling a bank account"),
    2061839: (0, "Product-update complaint without clear escalation behavior"),
    2074189: (1, "Severe train disruption with passengers stranded and inadequate information"),
    2084799: (1, "Passenger stranded for over 80 minutes and disputes contradictory travel information"),
    2084923: (0, "Lost-headphones inquiry with no clear escalation behavior"),
    2100704: (0, "Lost-order complaint without repeated escalation behavior"),
    2101098: (0, "Delivery-instruction complaint without clear escalation intent"),
    2104631: (0, "Product-menu feedback with support offering to pass it on"),
    2113580: (2, "Repeated broken order-report links and unresolved submission errors"),
    2122247: (0, "Routine support-account redirection"),
}

df = pd.read_csv(FILE)

required = {
    "conversation_id",
    "escalation_label",
    "review_status",
    "annotator_reason",
}
missing = required - set(df.columns)
if missing:
    raise ValueError(f"Missing columns: {missing}")

if len(labels) != 50:
    raise ValueError(f"Expected 50 labels, got {len(labels)}")

df["conversation_id"] = pd.to_numeric(
    df["conversation_id"], errors="raise"
).astype("int64")

missing_ids = set(labels) - set(df["conversation_id"])
if missing_ids:
    raise ValueError(f"IDs not found: {sorted(missing_ids)}")

for conversation_id, (label, reason) in labels.items():
    idx = df.index[df["conversation_id"] == conversation_id][0]

    if pd.notna(df.at[idx, "escalation_label"]):
        raise ValueError(
            f"Conversation {conversation_id} is already labeled."
        )

    df.at[idx, "escalation_label"] = label
    df.at[idx, "review_status"] = (
        "NEEDS_REVIEW" if label == 2 else "REVIEWED"
    )
    df.at[idx, "annotator_reason"] = reason

df.to_csv(FILE, index=False)

result = pd.to_numeric(df["escalation_label"], errors="coerce")

print("Batch 8 processed:", len(labels))
print("Reviewed:", result.isin([0, 1]).sum())
print("Needs review:", (result == 2).sum())
print("Still unlabeled:", result.isna().sum())
print("Escalated:", (result == 1).sum())
print("Not escalated:", (result == 0).sum())
print("Borderline:", (result == 2).sum())
