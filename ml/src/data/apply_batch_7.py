
import pandas as pd
from pathlib import Path

FILE = Path("data/labeled/escalation_conversation_annotation.csv")

# 0 = Not escalated, 1 = Escalated, 2 = Needs review
labels = {
    1547767: (1, "Severe frustration and unresolved Xbox connectivity problem"),
    1547812: (0, "Routine train-service inquiry resolved politely"),
    1548575: (0, "Technical support issue without clear escalation behavior"),
    1563908: (0, "Product disappointment without escalation intent"),
    1576458: (2, "Reported exploded phone battery; severity and escalation outcome unclear"),
    1583231: (0, "Airport security queue complaint without further escalation"),
    1588332: (1, "Booking problems combined with failures of chat and email support"),
    1588598: (0, "Restaurant complaint with guidance to contact a manager"),
    1595490: (0, "Internet speed complaint with support offering investigation"),
    1597221: (0, "Reports employee misconduct but does not pursue escalation"),
    1608341: (0, "Routine travel-pass question"),
    1621299: (0, "Delivery completed; customer offers constructive feedback"),
    1623715: (1, "Repeated delivery failures despite complaints and worsening service"),
    1625896: (0, "Confusion clarified and customer accepts the answer"),
    1627349: (0, "Disagreement about wording without escalation behavior"),
    1642239: (1, "Explicit intention to leave the service over dissatisfaction"),
    1642265: (1, "Recurring technical issue, unanswered support requests, and growing frustration"),
    1644053: (1, "Abandoned passengers had to pay for a taxi after poor communication"),
    1644288: (1, "Missing game content and repeated reports that support is ignoring customers"),
    1653679: (0, "Routine positive feedback"),
    1658434: (0, "Account issue acknowledged and followed up through direct messages"),
    1661002: (1, "Explicit demand for a supervisor after ineffective support"),
    1665077: (0, "Casual food preference"),
    1665612: (0, "Routine airline check-in question"),
    1667551: (0, "Initial preorder-delay inquiry"),
    1667800: (0, "Network outage acknowledged; customer remains polite"),
    1667945: (0, "Upgrade complaint with willingness to continue support"),
    1678289: (0, "Routine request to check a direct message"),
    1701937: (0, "Initial report of software problems without escalation behavior"),
    1706684: (0, "Positive feedback about pickup service"),
    1717162: (0, "Train-delay dissatisfaction without clear escalation intent"),
    1720633: (0, "Technical troubleshooting continues without escalation behavior"),
    1723268: (0, "Casual advertising comment"),
    1727564: (1, "Considering cancellation and confirms that issues remain unresolved"),
    1731105: (0, "Initial unauthorized-payment and refund request"),
    1732008: (0, "Positive advertising feedback"),
    1732752: (0, "Staff feedback resolved through a polite exchange"),
    1733756: (0, "Positive store-employee feedback"),
    1737770: (0, "Routine gaming compatibility question"),
    1743316: (0, "Positive advertising feedback"),
    1746531: (0, "Initial mobile-network troubleshooting request"),
    1750739: (0, "Routine travel question during a disruption"),
    1755043: (1, "Missing delivery after ten days and customer says support is not helping"),
    1763857: (1, "Threatens to cancel Prime over repeated shipping delays"),
    1771510: (0, "Initial software complaint without clear escalation behavior"),
    1800577: (0, "Product availability disappointment without escalation intent"),
    1801605: (2, "Repeated submission failures; escalation severity is uncertain"),
    1802970: (0, "Initial password-management support request"),
    1809168: (0, "Initial store-related complaint without escalation behavior"),
    1816579: (0, "Routine train-status inquiry"),
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
        raise ValueError(f"Conversation {conversation_id} is already labeled.")

    df.at[idx, "escalation_label"] = label
    df.at[idx, "review_status"] = (
        "NEEDS_REVIEW" if label == 2 else "REVIEWED"
    )
    df.at[idx, "annotator_reason"] = reason

df.to_csv(FILE, index=False)

result = pd.to_numeric(df["escalation_label"], errors="coerce")

print("Batch 7 processed:", len(labels))
print("Reviewed:", result.isin([0, 1]).sum())
print("Needs review:", (result == 2).sum())
print("Still unlabeled:", result.isna().sum())
print("Escalated:", (result == 1).sum())
print("Not escalated:", (result == 0).sum())
print("Borderline:", (result == 2).sum())
