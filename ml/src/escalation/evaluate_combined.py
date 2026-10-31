
"""Compare text-only, numeric-only, and combined escalation models."""

from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
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
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


ROOT = Path(__file__).resolve().parents[2]

DATA_DIR = ROOT / "data" / "processed"
NUMERIC_PATH = DATA_DIR / "escalation_snapshot_dataset.csv"
REPORT_DIR = ROOT / "reports" / "escalation"
REPORT_PATH = REPORT_DIR / "combined_model_comparison.csv"

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


def make_classifier():
    return LogisticRegression(
        class_weight="balanced",
        max_iter=2000,
        random_state=42,
    )


def make_text_model():
    return Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                ngram_range=(1, 2),
                min_df=1,
                max_features=10000,
                sublinear_tf=True,
            ),
        ),
        ("classifier", make_classifier()),
    ])


def make_numeric_preprocessor():
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
        ("scaler", StandardScaler()),
    ])


def make_numeric_model():
    return Pipeline([
        ("preprocessor", make_numeric_preprocessor()),
        ("classifier", make_classifier()),
    ])


def make_combined_model():
    # Select the text column as a 1D Series. This avoids the
    # one-document/one-sample error from passing a DataFrame to TF-IDF.
    preprocessing = ColumnTransformer(
        transformers=[
            (
                "text",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    min_df=1,
                    max_features=10000,
                    sublinear_tf=True,
                ),
                "customer_text",
            ),
            (
                "numeric",
                make_numeric_preprocessor(),
                NUMERIC_FEATURES,
            ),
        ],
        remainder="drop",
    )

    return Pipeline([
        ("preprocessor", preprocessing),
        ("classifier", make_classifier()),
    ])


def evaluate_model(name, model, data, feature_type, checkpoint):
    y = data[TARGET].astype(int)

    if feature_type == "text":
        # TF-IDF expects a 1D sequence of text documents.
        X = data["customer_text"].fillna("").astype(str)
    elif feature_type == "numeric":
        X = data[NUMERIC_FEATURES]
    elif feature_type == "combined":
        # ColumnTransformer needs a DataFrame so it can select
        # customer_text and the numeric feature columns by name.
        X = data[["customer_text"] + NUMERIC_FEATURES].copy()
        X["customer_text"] = X["customer_text"].fillna("").astype(str)
    else:
        raise ValueError(f"Unknown feature type: {feature_type}")

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    probabilities = cross_val_predict(
        model,
        X,
        y,
        cv=cv,
        method="predict_proba",
    )[:, 1]

    # Save out-of-fold predictions for later threshold analysis.
    prediction_dir = REPORT_DIR / "predictions"
    prediction_dir.mkdir(parents=True, exist_ok=True)

    prediction_data = pd.DataFrame({
        "conversation_id": data["conversation_id"].values,
        "actual_label": y.values,
        "predicted_probability": probabilities,
    })

    prediction_path = prediction_dir / (
        f"{name}_checkpoint_{checkpoint}_predictions.csv"
    )
    prediction_data.to_csv(prediction_path, index=False)

    print(f"Saved out-of-fold predictions: {prediction_path}")

    predictions = (probabilities >= 0.5).astype(int)

    result = {
        "checkpoint_messages": checkpoint,
        "model": name,
        "n": len(data),
        "positive_labels": int(y.sum()),
        "accuracy": accuracy_score(y, predictions),
        "precision": precision_score(y, predictions, zero_division=0),
        "recall": recall_score(y, predictions, zero_division=0),
        "f1": f1_score(y, predictions, zero_division=0),
        "roc_auc": roc_auc_score(y, probabilities),
        "pr_auc": average_precision_score(y, probabilities),
        "majority_baseline_accuracy": max(y.mean(), 1 - y.mean()),
        "confusion_matrix": str(confusion_matrix(y, predictions).tolist()),
    }

    print("\n" + "=" * 65)
    print(f"Checkpoint: first {checkpoint} messages | Model: {name}")
    print(f"Samples: {len(data)} | Escalated: {int(y.sum())}")
    print(
        classification_report(
            y,
            predictions,
            labels=[0, 1],
            target_names=["Not escalated", "Escalated"],
            zero_division=0,
        )
    )
    print("Confusion matrix [[TN, FP], [FN, TP]]:")
    print(confusion_matrix(y, predictions))
    print(f"Accuracy: {result['accuracy']:.3f}")
    print(f"Precision: {result['precision']:.3f}")
    print(f"Recall: {result['recall']:.3f}")
    print(f"F1: {result['f1']:.3f}")
    print(f"ROC-AUC: {result['roc_auc']:.3f}")
    print(f"PR-AUC: {result['pr_auc']:.3f}")

    return result


def load_checkpoint_data(checkpoint):
    text_path = DATA_DIR / f"escalation_text_message_{checkpoint}_dataset.csv"

    if not text_path.exists():
        raise FileNotFoundError(f"Missing text dataset: {text_path}")

    text_data = pd.read_csv(text_path)

    required_text_columns = {"conversation_id", "customer_text", TARGET}
    missing = required_text_columns - set(text_data.columns)
    if missing:
        raise ValueError(f"Missing columns in {text_path.name}: {sorted(missing)}")

    text_data = text_data[
        ["conversation_id", "customer_text", TARGET]
    ].copy()

    numeric = pd.read_csv(NUMERIC_PATH)

    required_numeric_columns = {
        "conversation_id",
        "messages_seen",
        "customer_message_count",
        *NUMERIC_FEATURES,
        TARGET,
    }
    missing = required_numeric_columns - set(numeric.columns)
    if missing:
        raise ValueError(
            f"Missing columns in {NUMERIC_PATH.name}: {sorted(missing)}"
        )

    numeric = numeric[
        (numeric["messages_seen"] == checkpoint)
        & (numeric["customer_message_count"] >= 1)
    ].copy()

    numeric = numeric[
        ["conversation_id"] + NUMERIC_FEATURES + [TARGET]
    ].drop_duplicates(subset=["conversation_id"])

    # Ensure all approaches use exactly the same conversations and labels.
    data = text_data.merge(
        numeric,
        on="conversation_id",
        how="inner",
        suffixes=("_text", "_numeric"),
        validate="one_to_one",
    )

    text_label = f"{TARGET}_text"
    numeric_label = f"{TARGET}_numeric"

    if not (data[text_label] == data[numeric_label]).all():
        raise ValueError("Text and numeric datasets have conflicting labels.")

    data[TARGET] = data[text_label].astype(int)
    data.drop(columns=[text_label, numeric_label], inplace=True)

    data = data.dropna(subset=["customer_text", TARGET]).reset_index(drop=True)

    if len(data) < 25 or data[TARGET].nunique() != 2:
        raise ValueError(
            f"Insufficient data at checkpoint {checkpoint}: {len(data)} rows."
        )

    if data[TARGET].value_counts().min() < 5:
        raise ValueError(
            f"Each class needs at least 5 samples for 5-fold CV "
            f"at checkpoint {checkpoint}."
        )

    return data


def main():
    if not NUMERIC_PATH.exists():
        raise FileNotFoundError(f"Missing numeric dataset: {NUMERIC_PATH}")

    results = []

    for checkpoint in [3, 5]:
        data = load_checkpoint_data(checkpoint)

        print(f"\nCheckpoint {checkpoint}: {len(data)} shared conversations")
        print(
            "Label counts:",
            data[TARGET].value_counts().sort_index().to_dict(),
        )

        experiments = [
            ("text_only", make_text_model(), "text"),
            ("numeric_only", make_numeric_model(), "numeric"),
            ("combined_text_numeric", make_combined_model(), "combined"),
        ]

        for name, model, feature_type in experiments:
            results.append(
                evaluate_model(
                    name,
                    model,
                    data,
                    feature_type,
                    checkpoint,
                )
            )

    report = pd.DataFrame(results)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report.to_csv(REPORT_PATH, index=False)

    columns = [
        "checkpoint_messages",
        "model",
        "n",
        "accuracy",
        "precision",
        "recall",
        "f1",
        "roc_auc",
        "pr_auc",
        "majority_baseline_accuracy",
    ]

    print("\n\nFINAL MODEL COMPARISON")
    print(report[columns].round(3).to_string(index=False))
    print(f"\nResults saved to: {REPORT_PATH}")


if __name__ == "__main__":
    main()
