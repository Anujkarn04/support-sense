import pandas as pd

path = "data/labeled/escalation_conversation_annotation.csv"
df = pd.read_csv(path)

df["escalation_label"] = pd.to_numeric(
    df["escalation_label"], errors="raise"
)

binary = df[df["escalation_label"].isin([0, 1])].copy()

print("TOTAL ANNOTATIONS:", len(df))
print("BINARY-LABELED:", len(binary))

print("\n1. Label counts:")
print(binary["escalation_label"].value_counts().sort_index())

print("\n2. Review status by label:")
print(pd.crosstab(
    binary["escalation_label"],
    binary["review_status"],
    margins=True
))

print("\n3. Reason availability:")
reasons = binary["annotator_reason"].fillna("").astype(str).str.strip()
print("Missing/empty reasons:", int(reasons.eq("").sum()))
print("Reasons available:", int(reasons.ne("").sum()))

print("\n4. Conversation text quality:")
texts = binary["conversation_text"].fillna("").astype(str).str.strip()
print("Empty texts:", int(texts.eq("").sum()))
print("Texts under 30 characters:", int(texts.str.len().lt(30).sum()))
print("Texts under 100 characters:", int(texts.str.len().lt(100).sum()))

print("\n5. Potentially weak evidence (manual review candidates):")
weak_terms = [
    "unclear", "insufficient context", "unrelated",
    "mixed", "not enough context", "uncertain"
]

mask = reasons.str.lower().apply(
    lambda reason: any(term in reason for term in weak_terms)
)

print("Binary labels with potentially weak reasons:", int(mask.sum()))

if mask.any():
    print(binary.loc[mask, [
        "conversation_id",
        "escalation_label",
        "annotator_reason"
    ]].to_string(index=False))

print("\nNo files modified.")