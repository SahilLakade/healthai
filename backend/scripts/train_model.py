"""Train, compare, evaluate and save the diabetes risk pipeline.

Run from the backend folder:  python scripts\\train_model.py

Outputs:
  models/pipeline.joblib  - fitted Pipeline (cleaning + imputer + scaler + model)
  models/metrics.json     - data-quality report and all evaluation results
"""
import datetime
import json
import platform
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, confusion_matrix, f1_score, precision_score,
    recall_score, roc_auc_score, roc_curve,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from app.preprocessing import FEATURES, TARGET, ZERO_INVALID, zero_to_nan  # noqa: E402

DATA_PATH = BACKEND_DIR / "data" / "diabetes.csv"
MODEL_PATH = BACKEND_DIR / "models" / "pipeline.joblib"
METRICS_PATH = BACKEND_DIR / "models" / "metrics.json"

RANDOM_STATE = 42
TEST_SIZE = 0.20
CV_FOLDS = 5
THRESHOLD = 0.5  # default decision threshold of predict()


def load_data() -> pd.DataFrame:
    if not DATA_PATH.exists():
        sys.exit(f"Dataset not found at {DATA_PATH}. Run: python scripts\\download_data.py")
    df = pd.read_csv(DATA_PATH)
    expected = FEATURES + [TARGET]
    if list(df.columns) != expected:
        sys.exit(f"Unexpected columns {list(df.columns)}; expected {expected}")
    if df.shape[0] < 100 or set(df[TARGET].unique()) != {0, 1}:
        sys.exit("Dataset failed validation (too few rows or target not 0/1).")
    return df


def data_quality_report(df: pd.DataFrame) -> dict:
    n = len(df)
    zero_counts = {c: int((df[c] == 0).sum()) for c in ZERO_INVALID}
    class_counts = df[TARGET].value_counts().sort_index()
    return {
        "rows": n,
        "columns": df.shape[1],
        "native_missing_values": int(df.isna().sum().sum()),
        "duplicate_rows": int(df.duplicated().sum()),
        "invalid_zero_counts": zero_counts,
        "invalid_zero_percent": {c: round(100 * v / n, 1) for c, v in zero_counts.items()},
        "class_counts": {"no_diabetes_0": int(class_counts[0]), "diabetes_1": int(class_counts[1])},
        "positive_rate_percent": round(100 * class_counts[1] / n, 1),
    }


def feature_summary(df: pd.DataFrame) -> dict:
    """Min / median / max of each feature ignoring invalid zeros (used for form hints)."""
    out = {}
    for c in FEATURES:
        s = df[c].replace(0, np.nan) if c in ZERO_INVALID else df[c]
        out[c] = {
            "min": round(float(s.min()), 3),
            "median": round(float(s.median()), 3),
            "max": round(float(s.max()), 3),
        }
    return out


def make_pipeline(model_name: str) -> Pipeline:
    steps = [
        ("zero_to_nan", FunctionTransformer(zero_to_nan, validate=False)),
        ("imputer", SimpleImputer(strategy="median")),  # learned from training data only
    ]
    if model_name == "Logistic Regression":
        steps.append(("scaler", StandardScaler()))
        clf = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=RANDOM_STATE)
    else:
        clf = RandomForestClassifier(
            n_estimators=300, max_depth=5, min_samples_leaf=5,
            class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1,
        )
    steps.append(("model", clf))
    return Pipeline(steps)


def test_metrics(pipe: Pipeline, X_test, y_test) -> dict:
    proba = pipe.predict_proba(X_test)[:, 1]
    pred = (proba >= THRESHOLD).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_test, pred, labels=[0, 1]).ravel()
    return {
        "accuracy": accuracy_score(y_test, pred),
        "precision": precision_score(y_test, pred, zero_division=0),
        "recall": recall_score(y_test, pred),
        "specificity": tn / (tn + fp),
        "f1": f1_score(y_test, pred),
        "roc_auc": roc_auc_score(y_test, proba),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def select_model(cv: dict) -> tuple[str, str]:
    """Primary criterion: CV ROC-AUC. If the runner-up is within 0.01 AUC but has
    clearly higher recall (fewer missed positives), prefer the runner-up."""
    best = max(cv, key=lambda n: cv[n]["roc_auc_mean"])
    for name in cv:
        if name == best:
            continue
        close = cv[best]["roc_auc_mean"] - cv[name]["roc_auc_mean"] < 0.01
        better_recall = cv[name]["recall_mean"] > cv[best]["recall_mean"]
        if close and better_recall:
            return name, ("Within 0.01 CV ROC-AUC of the top model but higher CV recall, "
                          "so fewer missed positive cases.")
    return best, "Highest mean cross-validated ROC-AUC on the training data."


def _default(o):
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.floating):
        return float(o)
    raise TypeError(type(o))


def main() -> None:
    df = load_data()
    quality = data_quality_report(df)
    print("=== DATA QUALITY ===")
    print(json.dumps(quality, indent=2))

    X, y = df[FEATURES], df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )
    print(f"\nTrain: {len(X_train)} rows | Test: {len(X_test)} rows (stratified, seed {RANDOM_STATE})")

    names = ["Logistic Regression", "Random Forest"]
    pipelines = {n: make_pipeline(n) for n in names}

    # ---- Model comparison: cross-validation on TRAINING data only ----
    skf = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    scoring = ["accuracy", "precision", "recall", "f1", "roc_auc"]
    cv_results = {}
    for n in names:
        res = cross_validate(pipelines[n], X_train, y_train, cv=skf, scoring=scoring)
        cv_results[n] = {
            f"{m}_{stat}": float(getattr(np, stat)(res[f"test_{m}"]))
            for m in scoring for stat in ("mean", "std")
        }
    selected, reason = select_model(cv_results)

    # ---- Fit on full training set, evaluate once on the held-out test set ----
    test_results = {}
    for n in names:
        pipelines[n].fit(X_train, y_train)
        test_results[n] = test_metrics(pipelines[n], X_test, y_test)

    best_pipe = pipelines[selected]

    # ---- Global feature importance (permutation, on test set) ----
    perm = permutation_importance(
        best_pipe, X_test, y_test, scoring="roc_auc",
        n_repeats=30, random_state=RANDOM_STATE,
    )
    importance = sorted(
        [{"feature": f, "importance": float(m), "std": float(s)}
         for f, m, s in zip(FEATURES, perm.importances_mean, perm.importances_std)],
        key=lambda d: d["importance"], reverse=True,
    )
    coefficients = None
    if selected == "Logistic Regression":
        coefs = best_pipe.named_steps["model"].coef_[0]
        coefficients = {f: float(c) for f, c in zip(FEATURES, coefs)}

    # ---- ROC curve points for the selected model (downsampled) ----
    proba = best_pipe.predict_proba(X_test)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, proba)
    idx = np.unique(np.linspace(0, len(fpr) - 1, 40).astype(int))
    roc_points = [{"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)} for i in idx]

    imputer = best_pipe.named_steps["imputer"]
    metrics = {
        "trained_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "environment": {"python": platform.python_version(), "scikit_learn": sklearn.__version__},
        "dataset": {
            "name": "Pima Indians Diabetes Database",
            "origin": "National Institute of Diabetes and Digestive and Kidney Diseases (via UCI / OpenML)",
            "population_note": "Females aged 21+ of Pima Indian heritage only; results may not generalise.",
            "target": "Outcome (1 = diabetes within 5 years of baseline, 0 = not)",
            **quality,
        },
        "features": FEATURES,
        "feature_summary": feature_summary(df),
        "preprocessing": {
            "invalid_zero_features": ZERO_INVALID,
            "strategy": "Zeros in these features become missing, then median-imputed using TRAINING data only.",
            "imputer_medians": {f: float(m) for f, m in zip(FEATURES, imputer.statistics_)},
        },
        "split": {
            "test_size": TEST_SIZE, "stratified": True, "random_state": RANDOM_STATE,
            "train_rows": len(X_train), "test_rows": len(X_test),
            "train_positive": int(y_train.sum()), "test_positive": int(y_test.sum()),
        },
        "decision_threshold": THRESHOLD,
        "cross_validation": {"folds": CV_FOLDS, "results": cv_results},
        "test_results": test_results,
        "selected_model": selected,
        "selection_reason": reason,
        "feature_importance": importance,
        "logistic_coefficients_standardized": coefficients,
        "roc_curve": roc_points,
    }

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_pipe, MODEL_PATH)
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, default=_default)

    print("\n=== CROSS-VALIDATION (training data, mean) ===")
    for n in names:
        r = cv_results[n]
        print(f"{n:20s} AUC={r['roc_auc_mean']:.3f} recall={r['recall_mean']:.3f} "
              f"precision={r['precision_mean']:.3f} f1={r['f1_mean']:.3f} acc={r['accuracy_mean']:.3f}")
    print("\n=== HELD-OUT TEST SET ===")
    for n in names:
        r = test_results[n]
        print(f"{n:20s} AUC={r['roc_auc']:.3f} recall={r['recall']:.3f} precision={r['precision']:.3f} "
              f"f1={r['f1']:.3f} acc={r['accuracy']:.3f} CM={r['confusion_matrix']}")
    print(f"\nSelected model: {selected}\nReason: {reason}")
    print("\nTop features (permutation importance):")
    for d in importance[:4]:
        print(f"  {d['feature']:26s} {d['importance']:.4f}")
    print(f"\nSaved: {MODEL_PATH}\nSaved: {METRICS_PATH}")


if __name__ == "__main__":
    main()