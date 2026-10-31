import pandas as pd
import joblib
import os

print("Loading sentiment model...")

model_path = r"models\sentiment\sentiment_model.pkl"
vectorizer_path = r"models\sentiment\tfidf_vectorizer.pkl"

model = joblib.load(model_path)
vectorizer = joblib.load(vectorizer_path)

print("Sentiment model loaded.")

# --------------------------------------------------
# Load support conversations
# --------------------------------------------------

input_path = r"data\interim\support_conversations.csv"

print("Loading support conversations...")

df = pd.read_csv(input_path)

print(f"Total messages: {len(df):,}")

# --------------------------------------------------
# Prepare text
# --------------------------------------------------

texts = df["text"].fillna("").astype(str)

# --------------------------------------------------
# Batch inference
# --------------------------------------------------

batch_size = 10000

sentiments = []
negative_probabilities = []
positive_probabilities = []

total_batches = (len(df) + batch_size - 1) // batch_size

print(f"Processing {total_batches} batches...")

for start in range(0, len(df), batch_size):

    end = min(start + batch_size, len(df))

    batch_texts = texts.iloc[start:end]

    X_batch = vectorizer.transform(batch_texts)

    predictions = model.predict(X_batch)
    probabilities = model.predict_proba(X_batch)

    sentiments.extend(predictions)

    negative_probabilities.extend(
        probabilities[:, 0]
    )

    positive_probabilities.extend(
        probabilities[:, 1]
    )

    batch_number = (start // batch_size) + 1

    print(
        f"Batch {batch_number}/{total_batches} "
        f"processed ({end:,}/{len(df):,})"
    )

# --------------------------------------------------
# Add predictions
# --------------------------------------------------

df["sentiment"] = sentiments

df["negative_probability"] = negative_probabilities

df["positive_probability"] = positive_probabilities

# --------------------------------------------------
# Convert labels to readable values
# --------------------------------------------------

df["sentiment_label"] = df["sentiment"].map({
    0: "negative",
    1: "positive"
})

# --------------------------------------------------
# Save
# --------------------------------------------------

output_path = r"data\interim\sentiment_messages.csv"

print("\nSaving sentiment predictions...")

df.to_csv(
    output_path,
    index=False
)

print("\nSentiment inference complete.")

print(f"Output: {output_path}")

print(f"Rows saved: {len(df):,}")

print("\nSentiment distribution:")

print(
    df["sentiment_label"].value_counts()
)

print("\nAverage probabilities:")

print(
    df[
        [
            "negative_probability",
            "positive_probability"
        ]
    ].mean()
)