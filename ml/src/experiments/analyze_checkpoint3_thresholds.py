
from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from evaluate_checkpoint3_expanded import make_model


ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data/processed/escalation_text_message_3_expanded.csv"
OUTPUT_PATH = ROOT / "reports/escalation/checkpoint3_threshold_analysis.csv"


def main():
    if OUTPUT_PATH.exists():
        raise FileExistsError(
            f"Refusing to overwrite existing report: {OUTPUT_PATH}"
        )

    data = pd.read_csv(DATA_PATH)
    data["customer_text"] = data["customer_text"].fillna("").astype(str)
    y = data["escalation_label"].astype(int)
    X = data[["customer_text"]]

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    model = make_model("text")

    # Each probability is generated for a fold that did not train on that row.
    probabilities = cross_val_predict(
        model, X, y, cv=cv, method="predict_proba"
    )[:, 1]

    rows = []
    print(f"Conversations: {len(data)}")
    print(f"Escalated cases: {int(y.sum())} / {len(y)}")
    print(f"Out-of-fold PR-AUC: {average_precision_score(y, probabilities):.4f}")
    print("\nThreshold | Precision | Recall | F1 | TP | FP | FN | TN | Alerts")

    for threshold in [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70]:
        pred = (probabilities >= threshold).astype(int)
        tp = int(((pred == 1) & (y == 1)).sum())
        fp = int(((pred == 1) & (y == 0)).sum())
        fn = int(((pred == 0) & (y == 1)).sum())
        tn = int(((pred == 0) & (y == 0)).sum())

        row = {
            "threshold": threshold,
            "precision": precision_score(y, pred, zero_division=0),
            "recall": recall_score(y, pred, zero_division=0),
            "f1": f1_score(y, pred, zero_division=0),
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "tn": tn,
            "alerts": int(pred.sum()),
            "alert_rate": float(pred.mean()),
        }
        rows.append(row)

        print(
            f"{threshold:9.2f} | {row['precision']:9.3f} | "
            f"{row['recall']:6.3f} | {row['f1']:.3f} | "
            f"{tp:2d} | {fp:2d} | {fn:2d} | {tn:2d} | {pred.sum():3d}"
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_csv(OUTPUT_PATH, index=False)
    print(f"\nReport saved: {OUTPUT_PATH}")
    print("Existing model artifacts were not modified.")


if __name__ == "__main__":
    main()
