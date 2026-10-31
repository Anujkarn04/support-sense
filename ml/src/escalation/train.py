
"""Train and evaluate the SupportSense escalation-risk baseline."""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[2]

DATA_PATH = ROOT / "data/processed/escalation_baseline_dataset.csv"
MODEL_PATH = ROOT / "models/escalation/escalation_baseline_v1.pkl"

FEATURES = [
    "message_count",
    "customer_message_count",
    "support_message_count",
    "negative_ratio",
    "average_negative_probability",
    "latest_negative_probability",
    "first_negative_probability",
    "sentiment_slope",
    "average_support_response_delay",
    "max_support_response_delay",
    "negative_probability_change",
]

TARGET = "escalation_label"


def main():
    data = pd.read_csv(DATA_PATH)

    # Keep only binary labels; exclude borderline label 2.
    data = data[data[TARGET].isin([0, 1])].copy()
    X = data[FEATURES]
    y = data[TARGET].astype(int)

    if y.nunique() != 2 or y.value_counts().min() < 5:
        raise ValueError("Training data needs both classes and at least 5 examples per class.")

    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(
            class_weight="balanced",
            max_iter=2000,
            random_state=42,
        )),
    ])

    # Out-of-fold predictions provide an evaluation before fitting all rows.
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    probabilities = cross_val_predict(
        pipeline, X, y, cv=cv, method="predict_proba"
    )[:, 1]
    predictions = (probabilities >= 0.5).astype(int)

    print(f"Training examples: {len(data)}")
    print(f"Label counts: {y.value_counts().sort_index().to_dict()}")
    print(f"Accuracy: {accuracy_score(y, predictions):.3f}")
    print(f"ROC-AUC: {roc_auc_score(y, probabilities):.3f}")
    print(f"PR-AUC: {average_precision_score(y, probabilities):.3f}")
    print("Confusion matrix:\n", confusion_matrix(y, predictions))
    print("Classification report:\n",
          classification_report(y, predictions, zero_division=0))

    # Fit the deployable model on all labeled examples.
    pipeline.fit(X, y)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "pipeline": pipeline,
        "feature_columns": FEATURES,
        "model_version": "escalation-baseline-v1",
        "label_mapping": {0: "not_escalated", 1: "escalated"},
        "training_rows": len(data),
        "note": (
            "Research baseline trained on manually annotated conversations. "
            "Full-conversation features are retrospective and are not suitable "
            "as-is for early live prediction."
        ),
    }, MODEL_PATH)

    print(f"Saved model: {MODEL_PATH}")


if __name__ == "__main__":
    main()
