"""Shared preprocessing definitions for training and inference."""
import numpy as np
import pandas as pd

# Exact feature names AND order used for training and prediction.
FEATURES = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DiabetesPedigreeFunction",
    "Age",
]
TARGET = "Outcome"

# In this dataset a value of 0 for these features is physiologically
# impossible, so it actually means "not measured".
ZERO_INVALID = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]


def zero_to_nan(X):
    """Enforce column order, cast to float, and turn invalid zeros into NaN.

    This is a fixed rule (not learned from data), so it cannot leak
    information from the test set. It is the first step of the pipeline.
    """
    if not isinstance(X, pd.DataFrame):
        X = pd.DataFrame(X, columns=FEATURES)
    X = X[FEATURES].astype(float).copy()
    for col in ZERO_INVALID:
        X[col] = X[col].where(X[col] != 0, np.nan)
    return X