
"""Reusable sentiment inference for SupportSense."""

from pathlib import Path

import joblib


ML_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ML_ROOT / "models" / "sentiment" / "sentiment_model.pkl"
VECTORIZER_PATH = ML_ROOT / "models" / "sentiment" / "tfidf_vectorizer.pkl"


def load_sentiment_models():
    """Load the existing trained sentiment model and vectorizer."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Sentiment model not found: {MODEL_PATH}")

    if not VECTORIZER_PATH.exists():
        raise FileNotFoundError(
            f"Sentiment vectorizer not found: {VECTORIZER_PATH}"
        )

    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)

    if list(model.classes_) != [0, 1]:
        raise ValueError(
            f"Expected sentiment classes [0, 1], got {model.classes_}"
        )

    return model, vectorizer


def predict_sentiment(text, model=None, vectorizer=None):
    """
    Predict sentiment for one customer-support message.

    Labels:
        0 = negative
        1 = positive
    """
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text must be a non-empty string.")

    if model is None or vectorizer is None:
        loaded_model, loaded_vectorizer = load_sentiment_models()
        model = model if model is not None else loaded_model
        vectorizer = (
            vectorizer if vectorizer is not None else loaded_vectorizer
        )

    features = vectorizer.transform([text])
    probabilities = model.predict_proba(features)[0]
    predicted_label = int(model.predict(features)[0])

    class_indices = {
        int(label): index
        for index, label in enumerate(model.classes_)
    }

    negative_probability = float(probabilities[class_indices[0]])
    positive_probability = float(probabilities[class_indices[1]])

    return {
        "sentiment": "negative" if predicted_label == 0 else "positive",
        "sentiment_label": predicted_label,
        "negative_probability": negative_probability,
        "positive_probability": positive_probability,
        "model_version": "sst2-tfidf-logistic-regression",
        "warning": (
            "General-domain sentiment estimate; not independently validated "
            "for customer-support conversations."
        ),
    }
