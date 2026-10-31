
import pandas as pd
from pathlib import Path

path = Path("data/labeled/escalation_conversation_annotation.csv")
df = pd.read_csv(path)

# ID: (new label, review reason)
decisions = {
    300895: (0, "Complaint without clear escalation behavior"),
    310925: (0, "Recurring billing concern without clear escalation"),
    500115: (0, "Strong train complaint without escalation intent"),
    512138: (2, "Mixed unrelated topics; attribution unclear"),
    591565: (0, "Travel disruption without clear escalation intent"),
    658970: (0, "Long delay and disputed explanation"),
    660166: (0, "Serious food complaint without escalation behavior"),
    699572: (0, "Technical issue appears resolved"),
    721781: (0, "Repeated support instructions; escalation unclear"),
    737802: (1, "Multiple store-service complaints and growing dissatisfaction"),
    750293: (0, "Charge dispute referred for investigation"),
    750848: (0, "Missed-connection concern without clear escalation"),
    1050291: (1, "Long hold, disconnected call, and apparent abandonment"),
    1122061: (0, "Repeated cancellations without clear escalation intent"),
    1232790: (0, "Payment failures without clear escalation behavior"),
    1234709: (0, "Delayed order and frustration without clear escalation"),
    1411525: (0, "Repeated poor experiences without clear escalation intent"),
    1541863: (0, "Recurring product complaint without escalation behavior"),
    1576458: (0, "Battery safety complaint without escalation behavior"),
    1801605: (0, "Repeated submission errors without clear escalation"),
    1821585: (2, "Mixed unrelated messages; case boundaries unclear"),
    1995754: (0, "Customer declines further reporting"),
    2113580: (0, "Repeated technical errors without clear escalation"),
    2342478: (2, "Unrelated messages; escalation attribution unclear"),
    2361386: (2, "Insufficient context"),
    2376921: (1, "Persistent policy dispute and repeated dissatisfaction"),
    2384901: (0, "Rejected exchange without clear escalation behavior"),
    2407879: (2, "Mixed conversation topics; attribution unreliable"),
    2657667: (0, "Financial hardship without clear escalation intent"),

}

df["conversation_id"] = pd.to_numeric(
    df["conversation_id"], errors="raise"
).astype("int64")

if len(decisions) != 29:
    raise ValueError(f"Expected 29 decisions; got {len(decisions)}")

if df["conversation_id"].duplicated().any():
    raise ValueError("Duplicate conversation IDs found in master CSV")

for cid in decisions:
    rows = df.index[df["conversation_id"] == cid]
    if len(rows) != 1:
        raise ValueError(f"Expected one row for conversation {cid}")
    if pd.to_numeric(
        df.loc[rows[0], "escalation_label"], errors="coerce"
    ) != 2:
        raise ValueError(
            f"Conversation {cid} is not currently labeled 2; "
            "stopping without saving."
        )

for cid, (label, reason) in decisions.items():
    idx = df.index[df["conversation_id"] == cid][0]
    df.at[idx, "escalation_label"] = label
    df.at[idx, "review_status"] = (
        "NEEDS_REVIEW" if label == 2 else "REVIEWED"
    )
    df.at[idx, "annotator_reason"] = reason

df.to_csv(path, index=False)

labels = pd.to_numeric(df["escalation_label"], errors="coerce")
print("Borderline decisions applied:", len(decisions))
print("Escalated:", int((labels == 1).sum()))
print("Not escalated:", int((labels == 0).sum()))
print("Still borderline:", int((labels == 2).sum()))
print("Unlabeled:", int(labels.isna().sum()))
print("Saved:", path)
