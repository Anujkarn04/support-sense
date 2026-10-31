
import pandas as pd
from pathlib import Path

FILE = Path("data/labeled/escalation_conversation_annotation.csv")

# 0 = Not escalated, 1 = Escalated, 2 = Needs review
labels = {
    2423638: (0, "Initial mobile connectivity complaint"),
    2428152: (0, "Missing delivery complaint with support offering investigation"),
    2438434: (1, "Repeated damaged deliveries and strong dissatisfaction with the service"),
    2448197: (0, "Initial food-quality complaint"),
    2454879: (0, "Initial support contact with no clear escalation behavior"),
    2456065: (0, "Missing delivery complaint without repeated escalation"),
    2460457: (0, "Positive community feedback"),
    2462343: (0, "Casual marketing conversation"),
    2462445: (0, "Repeated coupon problem without clear escalation intent"),
    2463690: (0, "Unauthorized recurring charges addressed by deactivating the service"),
    2474808: (1, "Prolonged unresolved compatibility problem affecting two devices"),
    2475683: (0, "Gaming bug report without clear escalation behavior"),
    2481172: (0, "Baggage delays with support acknowledging the problem"),
    2484224: (0, "Technical issue resolved after restarting the device"),
    2488365: (0, "Routine account-support routing question"),
    2494267: (0, "Travel disruption complaint without clear escalation intent"),
    2499046: (0, "Routine flight-date change inquiry"),
    2510815: (0, "Streaming issue reported as already fixed"),
    2521334: (0, "Routine booking-date change inquiry"),
    2533950: (1, "Issue unresolved for three weeks with threat to contact company leadership"),
    2542311: (0, "Train delay addressed with a refund process"),
    2554713: (0, "Product feedback submitted for internal review"),
    2556372: (0, "Positive product feedback"),
    2567756: (0, "Casual food-related interaction"),
    2570160: (0, "Routine accessory-replacement question"),
    2580823: (0, "Late delivery complaint without clear escalation behavior"),
    2587785: (1, "Repeated reports of out-of-date food and recurring copied apologies"),
    2591317: (1, "Unresolved delivery problem and explicit condemnation of customer support"),
    2591596: (0, "Initial complaint about account closure"),
    2600357: (0, "Flight amenity complaint without clear escalation intent"),
    2606159: (0, "Customer clarifies the recurring delivery problem is with the courier"),
    2608224: (0, "Initial dissatisfaction with a service"),
    2613755: (0, "Positive community feedback"),
    2615957: (0, "Product-range complaint with feedback passed to management"),
    2616129: (0, "Positive travel feedback"),
    2616372: (0, "Initial billing discrepancy complaint"),
    2621674: (0, "Routine question about employee payment methods"),
    2625968: (0, "Routine release-date inquiry"),
    2638393: (0, "Positive community feedback"),
    2640962: (0, "Routine product promotion"),
    2641068: (1, "Repeated ride-booking failure and incorrect trip start time"),
    2642701: (0, "Positive travel feedback"),
    2656880: (0, "Positive customer-service feedback"),
    2657667: (2, "Baggage fee creates financial hardship; escalation behavior is unclear"),
    2664850: (0, "Routine request for assistance"),
    2672733: (0, "Littering complaint referred to the appropriate reporting process"),
    2674936: (0, "Food-order complaint without clear escalation intent"),
    2682624: (0, "Overcrowded train complaint with no explicit escalation intent"),
    2683870: (0, "Persistent device-performance complaint without clear escalation intent"),
    2690483: (0, "Overcrowding complaint and criticism of service planning"),
    2691509: (0, "Positive travel feedback"),
    2692220: (0, "Routine account-service inquiry"),
    2699796: (0, "Routine product-shipping inquiry"),
    2700255: (1, "Explicit intention to cancel all ties with the company"),
    2703571: (0, "Positive advertising feedback"),
    2714029: (0, "Initial delivery-delay complaint"),
    2720857: (0, "Train cancellation and delay complaint without explicit escalation intent"),
    2729789: (0, "Routine travel-planning inquiry"),
    2731459: (0, "Initial technical support request"),
    2758713: (0, "Casual product-related interaction"),
    2761168: (1, "Repeated internet outages three times in seven days"),
    2763196: (0, "Product suggestion with positive support interaction"),
    2764185: (1, "Recurring restaurant cleanliness, missing-item, and food-quality complaints"),
    2783919: (0, "Initial streaming-app compatibility complaint"),
    2787291: (0, "Positive food-related interaction"),
    2788162: (0, "Positive feedback about order collection"),
    2792173: (0, "Billing and subscription activation issue reported for investigation"),
    2800866: (0, "Routine request for support response"),
    2803496: (0, "Routine request to initiate direct-message support"),
    2807051: (0, "Positive food-related interaction"),
    2820092: (0, "Positive hotel-service interaction"),
    2821733: (0, "Flight-status inquiry during an airport closure"),
    2827878: (0, "Routine support feature inquiry"),
    2831248: (0, "Refund timing inquiry with support offering to investigate"),
    2831513: (0, "Routine employee-discount question"),
    2832688: (0, "Routine delivery-tracking inquiry"),
    2833538: (0, "Product-value criticism without clear escalation behavior"),
    2834122: (0, "Casual product interaction"),
    2834622: (1, "Unresolved missing product code and explicit statement of lost customer"),
    2843530: (1, "Repeated daily train delays and strong dissatisfaction with explanations"),
    2845519: (0, "Delivery-placement complaint with limited escalation behavior"),
    2845853: (0, "Routine online-account registration inquiry"),
    2857251: (0, "Multiple mobile-app support questions without clear escalation behavior"),
    2865267: (0, "Routine product availability inquiry"),
    2883754: (1, "Explicit request to make a formal complaint after prior support failed"),
    2888779: (0, "Routine mobile-internet configuration question"),
    2905065: (0, "Late delivery and packaging complaint without clear escalation intent"),
    2905750: (0, "Initial complaint with insufficient detail"),
    2921100: (0, "Incorrect food order without clear escalation intent"),
    2927314: (0, "Routine account-rating question"),
    2932153: (0, "Technical support interaction moved to direct messages"),
    2932413: (1, "Disputed phone valuation and explicit intention to leave after contract"),
    2938118: (0, "Mixed humorous thread with an individual product complaint"),
    2938257: (0, "Packaging feedback issue without clear escalation intent"),
    2940318: (0, "Routine product return-policy inquiry"),
    2948569: (0, "Chat-support access complaint without clear escalation intent"),
    2953522: (1, "Customer demands updated tracking information and a same-day response"),
    2960086: (0, "Positive community feedback"),
    2961243: (0, "Missed delivery window and frustration without clear escalation intent"),
    2961408: (0, "Suspicious subscription email inquiry"),
    2961654: (0, "Routine promotion eligibility clarification"),
    2963846: (0, "Routine store reopening inquiry"),
    2968073: (0, "Routine product-use question"),
    2979342: (0, "Positive advertising feedback"),
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

if len(labels) != 104:
    raise ValueError(f"Expected 104 labels, got {len(labels)}")

df["conversation_id"] = pd.to_numeric(
    df["conversation_id"], errors="raise"
).astype("int64")

if len(labels) != len(set(labels)):
    raise ValueError("Duplicate conversation IDs in label mapping")

missing_ids = set(labels) - set(df["conversation_id"])
if missing_ids:
    raise ValueError(f"IDs not found: {sorted(missing_ids)}")

# Validate the entire batch before changing any rows.
for conversation_id in labels:
    idx = df.index[df["conversation_id"] == conversation_id][0]
    if pd.notna(df.at[idx, "escalation_label"]):
        raise ValueError(
            f"Conversation {conversation_id} is already labeled."
        )

for conversation_id, (label, reason) in labels.items():
    idx = df.index[df["conversation_id"] == conversation_id][0]
    df.at[idx, "escalation_label"] = label
    df.at[idx, "review_status"] = (
        "NEEDS_REVIEW" if label == 2 else "REVIEWED"
    )
    df.at[idx, "annotator_reason"] = reason

df.to_csv(FILE, index=False)

result = pd.to_numeric(df["escalation_label"], errors="coerce")

print("Final batch processed:", len(labels))
print("Reviewed:", int(result.isin([0, 1]).sum()))
print("Needs review:", int((result == 2).sum()))
print("Still unlabeled:", int(result.isna().sum()))
print("Escalated:", int((result == 1).sum()))
print("Not escalated:", int((result == 0).sum()))
print("Borderline:", int((result == 2).sum()))
