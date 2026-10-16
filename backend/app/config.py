"""Central configuration: file paths, CORS origins, disclaimer text."""
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

MODEL_PATH = Path(os.getenv("HEALTHAI_MODEL_PATH", BACKEND_DIR / "models" / "pipeline.joblib"))
METRICS_PATH = Path(os.getenv("HEALTHAI_METRICS_PATH", BACKEND_DIR / "models" / "metrics.json"))

# Origins allowed to call this API from a browser (the Vite dev server).
# Override with an environment variable: HEALTHAI_CORS_ORIGINS="http://a.com,http://b.com"
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "HEALTHAI_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]

DISCLAIMER = (
    "Educational prototype only. This is not a medical device and does not provide "
    "a diagnosis or medical advice. It cannot diagnose or rule out diabetes. "
    "Please discuss any health concerns and test results with a qualified healthcare professional."
)

PROBABILITY_NOTE = (
    "This value is the model's raw output score, not a calibrated personal probability "
    "of having or developing diabetes."
)