
"""Train text-based escalation classifiers at message checkpoints 3 and 5."""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "processed"
MODEL_DIR = ROOT / "models" / "escalation"

CHECKPOINTS = (3, 5)


def main():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    for checkpoint in CHECKPOINTS:
        data_path = DATA_DIR / (
            f"escalation_text_message_{checkpoint}_dataset.csv"
        )
        model_path = MODEL_DIR / (
            f"escalation_text_message_{checkpoint}_v1.pkl"
        )

        data = pd.read_csv(data_path)
        data = data[data["escalation_label"].isin([0, 1])].copy()

        if data["conversation_id"].duplicated().any():
            raise ValueError(f"Duplicate conversation IDs in {data_path.name}")

        if len(data) < 20 or data["escalation_label"].nunique() != 2:
            raise ValueError(f"Insufficient labeled data in {data_path.name}")

        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(
                lowercase=True,
                strip_accents="unicode",
                ngram_range=(1, 2),
                min_df=2,
                max_features=10000,
                sublinear_tf=True,
            )),
            ("classifier", LogisticRegression(
                class_weight="balanced",
                max_iter=2000,
                random_state=42,
            )),
        ])

        # Fit the final deployment candidate on all available examples.
        pipeline.fit(data["customer_text"], data["escalation_label"])

        joblib.dump({
            "pipeline": pipeline,
            "model_version": f"escalation-text-message-{checkpoint}-v1",
            "checkpoint_messages": checkpoint,
            "label_mapping": {
                0: "not_escalated",
                1: "escalated",
            },
            "training_rows": len(data),
            "feature_type": "customer-message TF-IDF unigrams and bigrams",
            "note": (
                "Exploratory model trained on a small, selectively sampled "
                "annotation set. Evaluate with cross-validation before "
                "interpreting performance. Labels represent eventual outcomes."
            ),
        }, model_path)

        print(f"\nCheckpoint: {checkpoint}")
        print(f"Training examples: {len(data)}")
        print(f"Model saved: {model_path}")


if __name__ == "__main__":
    main()
