"""Loads the saved pipeline once and runs inference."""
import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app import config
from app.preprocessing import FEATURES  # also makes the pickled zero_to_nan importable

logger = logging.getLogger("healthai")


class PredictionService:
    def __init__(self, model_path: Path, metrics_path: Path):
        self.model_path = Path(model_path)
        self.metrics_path = Path(metrics_path)
        self.pipeline = None
        self.metrics: dict | None = None
        self.error: str | None = None

    @property
    def is_ready(self) -> bool:
        return self.pipeline is not None and self.metrics is not None

    @property
    def model_name(self) -> str | None:
        return self.metrics.get("selected_model") if self.metrics else None

    def load(self) -> None:
        self.pipeline, self.metrics, self.error = None, None, None
        try:
            if not self.model_path.exists():
                raise FileNotFoundError(
                    f"Model file '{self.model_path.name}' not found. "
                    "Train it first: python scripts\\train_model.py")
            if not self.metrics_path.exists():
                raise FileNotFoundError(
                    f"Metrics file '{self.metrics_path.name}' not found. "
                    "Train the model first: python scripts\\train_model.py")
            pipeline = joblib.load(self.model_path)
            with open(self.metrics_path, "r", encoding="utf-8") as f:
                metrics = json.load(f)
            self.pipeline, self.metrics = pipeline, metrics
            logger.info("Model loaded: %s", self.model_name)
        except Exception as exc:  # noqa: BLE001
            self.pipeline, self.metrics = None, None
            self.error = f"{type(exc).__name__}: {exc}"
            logger.error("Could not load model: %s", self.error)

    def predict(self, data: dict) -> dict:
        if not self.is_ready:
            raise RuntimeError("Model is not loaded")

        # Same feature names and ORDER as training; missing -> NaN (imputed by the pipeline).
        row = {f: (np.nan if data.get(f) is None else float(data[f])) for f in FEATURES}
        X = pd.DataFrame([row], columns=FEATURES)

        proba = float(self.pipeline.predict_proba(X)[0, 1])
        threshold = float(self.metrics.get("decision_threshold", 0.5))
        predicted = int(proba >= threshold)

        return {
            "predicted_class": predicted,
            "predicted_label": "Higher-risk pattern" if predicted == 1 else "Lower-risk pattern",
            "probability": round(proba, 4),
            "decision_threshold": threshold,
            "model_name": self.model_name,
            "imputed_features": [f for f in FEATURES if data.get(f) is None],
            "top_global_features": [
                {"feature": d["feature"], "importance": round(d["importance"], 4)}
                for d in self.metrics.get("feature_importance", [])[:4]
            ],
            "probability_note": config.PROBABILITY_NOTE,
            "disclaimer": config.DISCLAIMER,
        }