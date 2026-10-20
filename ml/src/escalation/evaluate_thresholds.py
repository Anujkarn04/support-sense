
"""Evaluate alert thresholds using saved out-of-fold predictions."""

from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

ROOT = Path(__file__).resolve().parents[2]

PREDICTION_PATH = (
    ROOT
    / "reports"
    / "escalation"
    / "predictions"
    / "combined_text_numeric_checkpoint_5_predictions.csv"
)

OUTPUT_PATH = (
    ROOT
    / "reports"
    / "escalation"
    / "combined_checkpoint_5_threshold_analysis.csv"
)

THRESHOLDS = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70]


def main():
    if not PREDICTION_PATH.exists():
        raise FileNotFoundError(f"Missing predictions: {PREDICTION_PATH}")

    data = pd.read_csv(PREDICTION_PATH)

    required = {"conversation_id", "actual_label", "predicted_probability"}
    missing = required - set(data.columns)

    if missing:
        raise ValueError(f"Missing columns: {sorted(missing)}")

    if data["conversation_id"].duplicated().any():
        raise ValueError("Duplicate conversation IDs found.")

    y = data["actual_label"].astype(int)
    probabilities = data["predicted_probability"].astype(float)

    if not probabilities.between(0, 1).all():
        raise ValueError("Predicted probabilities must be between 0 and 1.")

    rows = []

    print(f"Conversations evaluated: {len(data)}")
    print(f"Actual escalations: {int(y.sum())}")
    print(f"Actual non-escalations: {int((y == 0).sum())}")

    for threshold in THRESHOLDS:
        predictions = (probabilities >= threshold).astype(int)

        tn, fp, fn, tp = confusion_matrix(
            y, predictions, labels=[0, 1]
        ).ravel()

        precision = precision_score(y, predictions, zero_division=0)
        recall = recall_score(y, predictions, zero_division=0)
        f1 = f1_score(y, predictions, zero_division=0)

        rows.append({
            "threshold": threshold,
            "accuracy": accuracy_score(y, predictions),
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "true_positives": int(tp),
            "false_positives": int(fp),
            "true_negatives": int(tn),
            "false_negatives": int(fn),
            "total_alerts": int(tp + fp),
            "missed_escalations": int(fn),
        })

    results = pd.DataFrame(rows)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    results.to_csv(OUTPUT_PATH, index=False)

    print("\nTHRESHOLD COMPARISON")
    print(results.round(3).to_string(index=False))

    best_f1 = results.loc[results["f1"].idxmax()]
    best_recall = results.loc[results["recall"].idxmax()]

    print("\nBest F1 threshold in this analysis:")
    print(best_f1.to_string())

    print("\nHighest recall threshold in this analysis:")
    print(best_recall.to_string())

    print(f"\nSaved results to: {OUTPUT_PATH}")
    print(
        "\nReminder: these are exploratory results on a small, "
        "selectively annotated dataset. Threshold selection should "
        "consider the cost of missed escalations and false alerts."
    )


if __name__ == "__main__":
    main()
