
"""Inference for the experimental SupportSense combined model."""

from pathlib import Path

import joblib
import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "models" / "escalation" / "escalation_combined_v1.pkl"


def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    artifact = joblib.load(MODEL_PATH)

    if artifact.get("model_version") != "escalation-combined-v1":
        raise ValueError("Unexpected model version.")

    return artifact


def predict_escalation(customer_text, features, artifact=None):
    """
    Predict eventual escalation risk from a matching message checkpoint.

    customer_text: customer messages available up to the checkpoint.
    features: dictionary of numeric snapshot features from that same point.
    """
    if artifact is None:
        artifact = load_model()

    checkpoint = artifact["checkpoint_messages"]
    feature_columns = artifact["feature_columns"]

    if not isinstance(customer_text, str) or not customer_text.strip():
        raise ValueError("customer_text must be a non-empty string.")

    if not isinstance(features, dict):
        raise TypeError("features must be a dictionary.")

    missing = set(feature_columns) - {"customer_text"} - set(features)
    if missing:
        raise ValueError(f"Missing feature values: {sorted(missing)}")

    row = {"customer_text": customer_text}
    row.update(features)

    X = pd.DataFrame([row], columns=feature_columns)
    pipeline = artifact["pipeline"]

    probability = float(pipeline.predict_proba(X)[0, 1])

    return {
        "model_version": artifact["model_version"],
        "checkpoint_messages": checkpoint,
        "escalation_risk": probability,
        "experimental_threshold": 0.50,
        "alert_recommended": probability >= 0.50,
        "label_interpretation": "eventual escalation outcome",
        "warning": (
            "Experimental estimate, not a calibrated probability or "
            "production-validated alert."
        ),
    }
