
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]

FILES = [
    ROOT / "data/interim/sentiment_messages.csv",
    ROOT / "data/processed/escalation_snapshot_dataset.csv",
    ROOT / "data/labeled/escalation_conversation_annotation.csv",
]

for file_path in FILES:
    print(f"\n{'=' * 70}")
    print(f"FILE: {file_path.relative_to(ROOT)}")
    print(f"Exists: {file_path.exists()}")

    if not file_path.exists():
        print("File not found.")
        continue

    df = pd.read_csv(file_path, nrows=3)
    print("Columns:", df.columns.tolist())
    print(df.head(2).to_string(index=False))
