
import pandas as pd
from pathlib import Path

FILE = Path("data/labeled/escalation_conversation_annotation.csv")

# 0 = Not escalated, 1 = Escalated, 2 = Needs review
labels = {
    2126267: (0, "Product preference complaint without escalation intent"),
    2129917: (0, "Delayed delivery complaint without clear escalation behavior"),
    2134758: (0, "Routine travel-information inquiry"),
    2136647: (0, "Software autocorrect complaint without escalation intent"),
    2141242: (0, "Routine train-service inquiry resolved politely"),
    2154893: (0, "Initial printer troubleshooting request"),
    2166564: (0, "Unexpected trial charge understood by customer; customer plans to cancel"),
    2186716: (0, "Casual food-related comment"),
    2195744: (0, "Routine request for support contact information"),
    2198432: (0, "Casual interaction"),
    2223055: (0, "Typo clarified and issue closed politely"),
    2225171: (1, "Repeated flight cancellations, ruined vacation, and dissatisfaction with refund"),
    2232184: (1, "Explicit intention to leave provider and strong criticism of proposed paid alternative"),
    2232508: (0, "Positive feedback about train service"),
    2238571: (0, "Technical misunderstanding resolved by customer"),
    2248978: (0, "Train seating complaint without clear escalation intent"),
    2273703: (0, "Staff conduct feedback referred to store management"),
    2274932: (0, "Calculator issue identified and explained"),
    2281739: (0, "Casual positive interaction"),
    2292634: (0, "Casual food-related conversation"),
    2295477: (0, "Initial gaming troubleshooting request"),
    2297037: (0, "Initial software complaint without repeated escalation behavior"),
    2300924: (0, "Constructive feature suggestion"),
    2308633: (0, "Late delivery complaint without clear escalation intent"),
    2323139: (1, "Unexpected substantial charge and explicit demand for money back"),
    2335373: (0, "Initial gaming connectivity issue"),
    2339908: (0, "Positive casual interaction"),
    2342478: (2, "Unrelated messages mixed into thread; escalation attribution unclear"),
    2343538: (0, "Customer reports a suspected scam and thanks support"),
    2345106: (0, "Casual entertainment conversation"),
    2346679: (1, "Repeated product-quality dissatisfaction and explicit intention to buy a competitor"),
    2346861: (0, "Initial account-balance dispute referred to support"),
    2354471: (0, "Positive advertising feedback"),
    2355699: (0, "Casual food-related conversation"),
    2355909: (0, "Positive product feedback"),
    2361386: (2, "Complaint lacks sufficient context to determine escalation behavior"),
    2367250: (0, "Playful interaction without a support escalation"),
    2369345: (1, "Repeated dissatisfaction with overcrowding, lighting, and lack of apology"),
    2376921: (2, "Persistent baggage-policy dispute; escalation severity is uncertain"),
    2383345: (0, "Customer accepts the product-policy explanation"),
    2384901: (2, "Exchange rejected over device condition; no clear escalation intent"),
    2385763: (1, "Explicit public call to boycott the airline over fees"),
    2399016: (0, "Initial mobile-network outage complaint"),
    2400366: (0, "Positive casual conversation"),
    2401405: (0, "Routine price-matching question"),
    2404233: (0, "Product-spillage complaint with a claims process offered"),
    2407879: (2, "Mixed unrelated thread content makes escalation attribution unreliable"),
    2409379: (0, "Recurring technical problem reported without clear escalation behavior"),
    2409828: (0, "Casual humorous interaction"),
    2420035: (1, "Repeated streaming failure despite several hours of support calls"),
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

print("Batch 9 processed:", len(labels))
print("Reviewed:", result.isin([0, 1]).sum())
print("Needs review:", (result == 2).sum())
print("Still unlabeled:", result.isna().sum())
print("Escalated:", (result == 1).sum())
print("Not escalated:", (result == 0).sum())
print("Borderline:", (result == 2).sum())
