import pandas as pd
import joblib

print("Loading sentiment model...")

model_path = r"models\sentiment\sentiment_model.pkl"
vectorizer_path = r"models\sentiment\tfidf_vectorizer.pkl"

model = joblib.load(model_path)
vectorizer = joblib.load(vectorizer_path)

print("Model loaded successfully.")

# --------------------------------------------------
# Load support conversations
# --------------------------------------------------

data_path = r"data\interim\support_conversations.csv"

df = pd.read_csv(data_path)

print(f"Total messages available: {len(df):,}")

# --------------------------------------------------
# Select sample customer messages
# --------------------------------------------------

customer_messages = df[
    df["inbound"] == True
]["text"].dropna()

sample_messages = customer_messages.sample(
    n=20,
    random_state=42
)

# --------------------------------------------------
# Run sentiment prediction
# --------------------------------------------------

X = vectorizer.transform(sample_messages)

predictions = model.predict(X)
probabilities = model.predict_proba(X)

# --------------------------------------------------
# Display results
# --------------------------------------------------

print("\n" + "=" * 80)
print("SENTIMENT INFERENCE TEST")
print("=" * 80)

for text, prediction, probability in zip(
    sample_messages,
    predictions,
    probabilities
):

    sentiment = (
        "negative"
        if prediction == 0
        else "positive"
    )

    confidence = max(probability)

    print("\nMessage:")
    print(text)

    print(
        f"Prediction: {sentiment.upper()}"
    )

    print(
        f"Confidence: {confidence:.4f}"
    )

print("\nInference test complete.")