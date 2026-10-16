"""FastAPI application: /health, /model-info, /predict."""
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import config
from app.prediction_service import PredictionService
from app.schemas import (
    AssessmentInput, HealthResponse, ModelInfoResponse, PredictionResponse,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("healthai")


def create_app(model_path: Path | None = None, metrics_path: Path | None = None) -> FastAPI:
    service = PredictionService(model_path or config.MODEL_PATH,
                                metrics_path or config.METRICS_PATH)
    service.load()

    app = FastAPI(
        title="HealthAI - Diabetes Risk Assessment API",
        description="Educational prototype. Not a medical device. " + config.DISCLAIMER,
        version="1.0.0",
    )
    app.state.service = service

    # CORS: lets the React dev server (a different origin/port) call this API.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.ALLOWED_ORIGINS,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    def require_model() -> PredictionService:
        if not service.is_ready:
            raise HTTPException(
                status_code=503,
                detail=service.error or "Model is not available. Train it with: python scripts\\train_model.py",
            )
        return service

    @app.get("/health", response_model=HealthResponse)
    def health():
        body = HealthResponse(
            status="ok" if service.is_ready else "unavailable",
            model_loaded=service.is_ready,
            model_name=service.model_name,
            detail=None if service.is_ready else service.error,
        )
        return JSONResponse(status_code=200 if service.is_ready else 503,
                            content=body.model_dump())

    @app.get("/model-info", response_model=ModelInfoResponse)
    def model_info():
        return require_model().metrics

    @app.post("/predict", response_model=PredictionResponse)
    def predict(payload: AssessmentInput):
        svc = require_model()
        try:
            return svc.predict(payload.model_dump())
        except Exception as exc:  # noqa: BLE001
            # Log only the exception type, never the health inputs.
            logger.error("Prediction failed: %s", type(exc).__name__)
            raise HTTPException(status_code=500, detail="Prediction failed due to an internal error.")

    return app


app = create_app()