
"""Train a versioned combined text + numeric escalation model."""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedGroupKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "processed"
MODEL_DIR = ROOT / "models" / "escalation"
REPORT_DIR = ROOT / "reports" / "escalation"

MODEL_PATH = MODEL_DIR / "escalation_combined_v1.pkl"
REPORT_PATH = REPORT_DIR / "combined_v1_evaluation.txt"

CHECKPOINT = 5
TARGET = "escalation_label"

NUMERIC_FEATURES = [
    "messages_seen",
    "customer_message_count",
    "support_message_count",
    "customer_negative_message_count",
    "customer_negative_ratio",
    "customer_average_negative_probability",
    "latest_customer_negative_probability",
    "customer_sentiment_slope",
    "average_support_response_delay_seconds",
    "max_support_response_delay_seconds",
    "elapsed_seconds",
    "current_message_is_customer",
]


def make_model():
    preprocessing = ColumnTransformer(
        transformers=[
            (
                "text",
                TfidfVectorizer(
                    lowercase=True,
                    strip_accents="unicode",
                    ngram_range=(1, 2),
                    min_df=2,
                    max_features=10000,
                    sublinear_tf=True,
                ),
                "customer_text",
            ),
            (
                "numeric",
                Pipeline([
                    (
                        "imputer",
                        SimpleImputer(
                            strategy="median",
                            add_indicator=True,
                        ),
                    ),
                    ("scaler", StandardScaler()),
                ]),
                NUMERIC_FEATURES,
            ),
        ],
        remainder="drop",
    )

    return Pipeline([
        ("preprocessor", preprocessing),
        (
            "classifier",
            LogisticRegression(
                class_weight="balanced",
                max_iter=2000,
                random_state=42,
            ),
        ),
    ])


def main():
    text_path = DATA_DIR / (
        f"escalation_text_message_{CHECKPOINT}_dataset.csv"
    )
    snapshot_path = DATA_DIR / "escalation_snapshot_dataset.csv"

    if MODEL_PATH.exists():
        raise FileExistsError(
            f"Refusing to overwrite existing model: {MODEL_PATH}"
        )

    text_data = pd.read_csv(text_path)
    snapshots = pd.read_csv(snapshot_path)

    # Select the matching checkpoint, one snapshot per conversation.
    snapshots = snapshots[
        (snapshots["messages_seen"] == CHECKPOINT)
        & (snapshots["customer_message_count"] >= 1)
    ].copy()

    snapshots = snapshots[
        ["conversation_id", *NUMERIC_FEATURES, TARGET]
    ].drop_duplicates("conversation_id")

    text_data = text_data[
        ["conversation_id", "customer_text", TARGET]
    ].copy()

    data = text_data.merge(
        snapshots,
        on="conversation_id",
        how="inner",
        suffixes=("_text", "_numeric"),
        validate="one_to_one",
    )

    if not (data[f"{TARGET}_text"] == data[f"{TARGET}_numeric"]).all():
        raise ValueError("Conflicting labels between text and snapshots.")

    data[TARGET] = data[f"{TARGET}_text"].astype(int)
    data["customer_text"] = data["customer_text"].fillna("").astype(str)

    if data["conversation_id"].duplicated().any():
        raise ValueError("Duplicate conversation IDs detected.")

    y = data[TARGET]
    groups = data["conversation_id"]
    X = data[["customer_text", *NUMERIC_FEATURES]].copy()

    if len(data) < 25 or y.nunique() != 2 or y.value_counts().min() < 5:
        raise ValueError("Insufficient data for exploratory evaluation.")

    model = make_model()

    cv = StratifiedGroupKFold(
        n_splits=5,
        shuffle=True,
        random_state=42,
    )

    probabilities = cross_val_predict(
        model,
        X,
        y,
        groups=groups,
        cv=cv,
        method="predict_proba",
    )[:, 1]

    predictions = (probabilities >= 0.5).astype(int)

    metrics = {
        "rows": len(data),
        "positive_labels": int(y.sum()),
        "accuracy": accuracy_score(y, predictions),
        "precision": precision_score(y, predictions, zero_division=0),
        "recall": recall_score(y, predictions, zero_division=0),
        "f1": f1_score(y, predictions, zero_division=0),
        "roc_auc": roc_auc_score(y, probabilities),
        "pr_auc": average_precision_score(y, probabilities),
        "confusion_matrix_tn_fp_fn_tp": confusion_matrix(
            y, predictions, labels=[0, 1]
        ).ravel().tolist(),
    }

    print("\nGrouped cross-validation results")
    for name, value in metrics.items():
        print(f"{name}: {value}")

    print("\nClassification report:")
    print(classification_report(y, predictions, zero_division=0))

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    with REPORT_PATH.open("w", encoding="utf-8") as report:
        report.write("SupportSense Combined Model v1\n")
        report.write("Exploratory grouped 5-fold cross-validation\n")
        report.write("Labels represent eventual conversation outcomes.\n")
        report.write("Small, selectively annotated dataset; not production validation.\n\n")
        for name, value in metrics.items():
            report.write(f"{name}: {value}\n")
        report.write("\n" + classification_report(
            y, predictions, zero_division=0
        ))

    # Fit a final artifact only after cross-validation completes.
    model.fit(X, y)

    joblib.dump({
        "pipeline": model,
        "model_version": "escalation-combined-v1",
        "checkpoint_messages": CHECKPOINT,
        "feature_columns": ["customer_text", *NUMERIC_FEATURES],
        "label_mapping": {0: "not_escalated", 1: "escalated"},
        "training_rows": len(data),
        "training_conversations": int(groups.nunique()),
        "evaluation": metrics,
        "note": (
            "Exploratory combined model trained on a small, selectively "
            "annotated cohort. Predicts eventual outcome from a checkpoint; "
            "does not identify the actual onset time of escalation. "
            "Requires external validation before operational use."
        ),
    }, MODEL_PATH)

    print(f"\nSaved model: {MODEL_PATH}")
    print(f"Saved evaluation: {REPORT_PATH}")


if __name__ == "__main__":
    main()
