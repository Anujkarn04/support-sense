from datasets import load_dataset
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
import joblib

print("Loading sentiment dataset...")

dataset = load_dataset("stanfordnlp/sst2")

train_data = dataset["train"]
validation_data = dataset["validation"]

print(f"Training samples: {len(train_data)}")
print(f"Validation samples: {len(validation_data)}")

print("Creating TF-IDF features...")

vectorizer = TfidfVectorizer(
    max_features=20000,
    ngram_range=(1, 2),
    min_df=2
)

X_train = vectorizer.fit_transform(train_data["sentence"])
X_validation = vectorizer.transform(validation_data["sentence"])

y_train = train_data["label"]
y_validation = validation_data["label"]

print("Training feature shape:", X_train.shape)
print("Validation feature shape:", X_validation.shape)

print("Training Logistic Regression model...")

model = LogisticRegression(
    max_iter=1000,
    random_state=42
)

model.fit(X_train, y_train)

print("Model training complete.")

print("Evaluating model...")

y_pred = model.predict(X_validation)

accuracy = accuracy_score(y_validation, y_pred)

print(f"Validation Accuracy: {accuracy:.4f}")

print("\nClassification Report:")
print(
    classification_report(
        y_validation,
        y_pred,
        target_names=["negative", "positive"]
    )
)


print("Saving sentiment model...")

joblib.dump(
    model,
    "models/sentiment/sentiment_model.pkl"
)

joblib.dump(
    vectorizer,
    "models/sentiment/tfidf_vectorizer.pkl"
)

print("Sentiment model saved successfully.")