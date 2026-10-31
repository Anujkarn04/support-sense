import pandas as pd
from pathlib import Path

files = [
    Path("data/raw/twcs.csv"),
    Path("data/interim/twitter_conversations.csv"),
    Path("data/interim/support_conversations.csv"),
]

for path in files:
    print("\n" + "=" * 80)
    print("FILE:", path)

    if not path.exists():
        print("NOT FOUND")
        continue

    sample = pd.read_csv(path, nrows=5, low_memory=False)

    print("COLUMNS:")
    print(sample.columns.tolist())

    print("\nDATA TYPES:")
    print(sample.dtypes.to_string())

    print("\nSAMPLE ROWS:")
    print(sample.head(2).to_string(index=False))

print("\nInspection complete. No files modified.")