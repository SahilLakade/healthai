"""Download the Pima Indians Diabetes dataset into backend/data/diabetes.csv.

Source 1: public GitHub mirror of the UCI/NIDDK data.
Source 2 (fallback): OpenML dataset 'diabetes' (version 1) via scikit-learn.
Run:  python scripts\\download_data.py   (add --force to re-download)
"""
import io
import sys
import urllib.request
from pathlib import Path

import pandas as pd

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "diabetes.csv"
COLUMNS = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age", "Outcome",
]
MIRROR_URL = (
    "https://raw.githubusercontent.com/jbrownlee/Datasets/master/"
    "pima-indians-diabetes.data.csv"
)


def from_mirror() -> pd.DataFrame:
    with urllib.request.urlopen(MIRROR_URL, timeout=30) as resp:
        raw = resp.read()
    return pd.read_csv(io.BytesIO(raw), header=None, names=COLUMNS)


def from_openml() -> pd.DataFrame:
    from sklearn.datasets import fetch_openml

    ds = fetch_openml("diabetes", version=1, as_frame=True)
    df = ds.frame.rename(columns={
        "preg": "Pregnancies", "plas": "Glucose", "pres": "BloodPressure",
        "skin": "SkinThickness", "insu": "Insulin", "mass": "BMI",
        "pedi": "DiabetesPedigreeFunction", "age": "Age", "class": "Outcome",
    })
    df["Outcome"] = (df["Outcome"].astype(str) == "tested_positive").astype(int)
    return df[COLUMNS]


def validate(df: pd.DataFrame) -> None:
    if list(df.columns) != COLUMNS:
        raise ValueError(f"Unexpected columns: {list(df.columns)}")
    if df.shape != (768, 9):
        raise ValueError(f"Expected 768 rows x 9 columns, got {df.shape}")
    if set(df["Outcome"].unique()) != {0, 1}:
        raise ValueError("Outcome must contain only 0 and 1")
    if df.isna().any().any():
        raise ValueError("Unexpected NaN values in downloaded file")


def main() -> int:
    force = "--force" in sys.argv
    if DATA_PATH.exists() and not force:
        print(f"Dataset already exists at {DATA_PATH}. Use --force to re-download.")
        return 0

    df = None
    for name, loader in (("GitHub mirror", from_mirror), ("OpenML", from_openml)):
        try:
            print(f"Trying {name} ...")
            candidate = loader()
            validate(candidate)
            df = candidate
            print(f"  OK: downloaded from {name}")
            break
        except Exception as exc:  # noqa: BLE001
            print(f"  Failed ({type(exc).__name__}): {exc}")

    if df is None:
        print(
            "\nCould not download automatically.\n"
            "MANUAL OPTION: download 'diabetes.csv' (Pima Indians Diabetes, "
            "768 rows, header: Pregnancies,Glucose,BloodPressure,SkinThickness,"
            "Insulin,BMI,DiabetesPedigreeFunction,Age,Outcome) from Kaggle or "
            "the UCI/OpenML pages and save it as:\n  " + str(DATA_PATH)
        )
        return 1

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATA_PATH, index=False)
    print(f"Saved {len(df)} rows to {DATA_PATH}")
    print(df["Outcome"].value_counts().to_string())
    return 0


if __name__ == "__main__":
    sys.exit(main())