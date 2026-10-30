
from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
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
REPORT_DIR = ROOT / "reports" / "escalation"

TEXT_PATH = DATA_DIR / "escalation_text_message_3_expanded.csv"
SNAPSHOT_PATH = DATA_DIR / "escalation_snapshot_dataset.csv"
OUTPUT_PATH = REPORT_DIR / "checkpoint3_expanded_evaluation.csv"

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


def make_model(feature_type):
    transformers = []

    if feature_type in ("text", "combined"):
        transformers.append(
            (
                "text",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    min_df=1,
                    max_features=10000,
                    sublinear_tf=True,
                ),
                "customer_text",
            )
        )

    if feature_type in ("numeric", "combined"):
        transformers.append(
            (
                "numeric",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(
                            strategy="median",
                            add_indicator=True,
                        )),
                        ("scaler", StandardScaler()),
                    ]
                ),
                NUMERIC_FEATURES,
            )
        )

    preprocess = ColumnTransformer(transformers=transformers)

    return Pipeline(
        [
            ("preprocess", preprocess),
            (
                "classifier",
                LogisticRegression(
                    class_weight="balanced",
                    max_iter=2000,
                    random_state=42,
                ),
            ),
        ]
    )


def main():
    if OUTPUT_PATH.exists():
        raise FileExistsError(
            f"Refusing to overwrite existing report: {OUTPUT_PATH}"
        )

    text = pd.read_csv(TEXT_PATH)
    snapshots = pd.read_csv(SNAPSHOT_PATH)

    snapshots = snapshots[
        (snapshots["messages_seen"] == 3)
        & (snapshots["customer_message_count"] >= 1)
    ].copy()

    if snapshots["conversation_id"].duplicated().any():
        raise ValueError("Duplicate checkpoint-3 snapshots detected.")

# These two features already exist in the expanded text dataset.
    # Merge the remaining numeric features without creating duplicate columns.
    snapshot_features = [
        feature for feature in NUMERIC_FEATURES
        if feature not in {"messages_seen", "customer_message_count"}
    ]

    data = text.merge(
        snapshots[
            ["conversation_id", *snapshot_features, TARGET]
        ],
        on="conversation_id",
        how="inner",
        suffixes=("_text", "_snapshot"),
        validate="one_to_one",
    )

    if len(data) != len(text):
        raise ValueError(
            f"Snapshot match failed: {len(data)} matched of {len(text)}."
        )

    if not (
        data[f"{TARGET}_text"] == data[f"{TARGET}_snapshot"]
    ).all():
        raise ValueError(
            "Annotation labels disagree with snapshot labels."
        )

    data[TARGET] = data[f"{TARGET}_text"].astype(int)
    data["customer_text"] = data["customer_text"].fillna("").astype(str)

    if data["customer_text"].str.strip().eq("").any():
        raise ValueError("Empty customer text detected.")

    y = data[TARGET]

    if y.nunique() != 2 or y.value_counts().min() < 5:
        raise ValueError("Insufficient class diversity for cross-validation.")

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = []

    print("Checkpoint 3 expanded experiment")
    print("Conversations:", len(data))
    print("Label counts:", y.value_counts().sort_index().to_dict())
    print("Evaluation: 5-fold stratified cross-validation")
    print("Threshold: 0.50")
    print("")

    for feature_type in ["text", "numeric", "combined"]:
        if feature_type == "text":
            X = data[["customer_text"]]
        elif feature_type == "numeric":
            X = data[NUMERIC_FEATURES]
        else:
            X = data[["customer_text", *NUMERIC_FEATURES]]

        model = make_model(feature_type)

        probabilities = cross_val_predict(
            model,
            X,
            y,
            cv=cv,
            method="predict_proba",
        )[:, 1]

        predictions = (probabilities >= 0.50).astype(int)

        result = {
            "checkpoint_messages": 3,
            "dataset": "expanded",
            "model": feature_type,
            "n": len(data),
            "positive_labels": int(y.sum()),
            "accuracy": accuracy_score(y, predictions),
            "precision": precision_score(
                y, predictions, zero_division=0
            ),
            "recall": recall_score(y, predictions, zero_division=0),
            "f1": f1_score(y, predictions, zero_division=0),
            "roc_auc": roc_auc_score(y, probabilities),
            "pr_auc": average_precision_score(y, probabilities),
        }

        tn, fp, fn, tp = confusion_matrix(
            y, predictions, labels=[0, 1]
        ).ravel()

        result.update({
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp),
        })

        results.append(result)

        print(f"Model: {feature_type}")
        for metric in [
            "accuracy", "precision", "recall", "f1", "roc_auc", "pr_auc"
        ]:
            print(f"  {metric}: {result[metric]:.4f}")
        print(f"  Confusion matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")
        print("")

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(results).to_csv(OUTPUT_PATH, index=False)

    print("Evaluation report saved to:", OUTPUT_PATH)
    print("Existing model artifacts were not modified.")


if __name__ == "__main__":
    main()
