import pandas as pd
from pathlib import Path

FILE = Path("data/labeled/escalation_conversation_annotation.csv")

# label: 0 = Not escalated, 1 = Escalated, 2 = Needs review
labels = {
    1200917: (1, "Service down for 20 hours; public accusation of repeated dishonesty"),
    1214933: (0, "Routine question about train service cancellation"),
    1232790: (2, "Payment failure across multiple channels; escalation unclear"),
    1234709: (2, "Order delayed for weeks; frustration present but escalation unclear"),
    1235886: (0, "Controller battery issue followed by support guidance"),
    1236835: (0, "Content suitability complaint without escalation behavior"),
    1249204: (0, "Issue unresolved, but no clear escalation intent"),
    1255704: (0, "Customer thanks support for help"),
    1263099: (0, "Flight boarding delay with no clear escalation behavior"),
    1267281: (0, "Positive casual interaction"),
    1267601: (0, "Issue fixed; customer gives constructive agent feedback"),
    1267615: (0, "Routine membership question"),
    1275030: (0, "Routine discount-voucher policy question"),
    1279998: (0, "Store hygiene complaint acknowledged and checked"),
    1284966: (0, "Product dissatisfaction without refund demand or escalation"),
    1299932: (0, "Crowded train and missing announcement; no clear escalation"),
    1316733: (0, "Prolonged technical disagreement eventually clarified"),
    1327287: (0, "Routine train-route inquiry"),
    1330623: (0, "Positive product feedback"),
    1330902: (1, "Potentially unsafe rideshare experience requiring critical response"),
    1340596: (0, "Routine public-transport ticket question"),
    1343941: (0, "Routine mobile-plan pricing inquiry"),
    1345794: (1, "Severe travel disruption with a child and dissatisfaction with generic support"),
    1347199: (0, "Positive casual interaction"),
    1347207: (0, "Technical issue resolved after support guidance"),
    1350979: (0, "Positive interaction"),
    1363082: (0, "Minor misunderstanding resolved politely"),
    1367709: (0, "Customer clarifies there were no actual concerns"),
    1370378: (0, "Technical support request; no escalation behavior"),
    1382798: (0, "Customer accepts train cancellation information"),
    1385950: (1, "Customer indicates intent to purchase from competitors"),
    1396499: (0, "Issue acknowledged and passed to the relevant team"),
    1401815: (1, "Repeated severe complaints about unreliable trains and service"),
    1411525: (2, "Repeated poor restaurant experience; escalation severity uncertain"),
    1415394: (0, "Initial account-help request"),
    1427674: (0, "Strong positive feedback about airline employees"),
    1430520: (0, "Payment issue with a request to wait for an update"),
    1442117: (1, "Repeated failure to respond and prolonged customer-service hold"),
    1458243: (0, "Routine playlist feedback"),
    1467663: (1, "Alleged card-confidentiality breach unresolved for a month"),
    1468340: (0, "Shipping frustration, but customer reports helpful support"),
    1472692: (0, "Routine streaming-schedule question"),
    1501669: (0, "Routine product availability question"),
    1524203: (0, "Initial software-glitch complaint"),
    1534352: (1, "Repeated flight delays across seven of the last eight flights"),
    1537784: (0, "Customer disputes a rating policy without clear escalation intent"),
    1538240: (0, "Support contact successfully initiated"),
    1540233: (0, "Initial support request about a missing payment"),
    1541863: (2, "Recurring product-quality complaint; escalation intent unclear"),
    1545166: (0, "Positive feedback about fast customer service"),
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
    raise ValueError(f"Missing required columns: {missing}")

if len(labels) != 50:
    raise ValueError(f"Expected 50 labels, found {len(labels)}")

if len(labels) != len(set(labels)):
    raise ValueError("Duplicate conversation IDs in label mapping")

df["conversation_id"] = pd.to_numeric(
    df["conversation_id"], errors="raise"
).astype("int64")

missing_ids = set(labels) - set(df["conversation_id"])
if missing_ids:
    raise ValueError(f"IDs not found in annotation file: {sorted(missing_ids)}")

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

labeled = pd.to_numeric(df["escalation_label"], errors="coerce")

print("Batch 6 processed:", len(labels))
print("Reviewed:", (labeled.isin([0, 1])).sum())
print("Needs review:", (labeled == 2).sum())
print("Still unlabeled:", labeled.isna().sum())
print("Escalated:", (labeled == 1).sum())
print("Not escalated:", (labeled == 0).sum())
print("Borderline:", (labeled == 2).sum())