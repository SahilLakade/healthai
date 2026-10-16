"""Pydantic request/response schemas.

Field names match the training column names EXACTLY.
"""
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AssessmentInput(BaseModel):
    # Reject unknown fields so no names/emails/identifiers can be sent by mistake.
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "Pregnancies": 2, "Glucose": 120, "BloodPressure": 70,
                "SkinThickness": 25, "Insulin": 80, "BMI": 28.5,
                "DiabetesPedigreeFunction": 0.45, "Age": 35,
            }
        },
    )

    # ---- required ----
    Pregnancies: int = Field(..., ge=0, le=20, description="Number of pregnancies")
    Glucose: float = Field(..., ge=40, le=400, allow_inf_nan=False,
                           description="Plasma glucose concentration (mg/dL)")
    BMI: float = Field(..., ge=10, le=80, allow_inf_nan=False,
                       description="Body mass index (kg/m^2)")
    Age: int = Field(..., ge=21, le=100,
                     description="Age in years (training data covers ages 21-81)")

    # ---- optional: null/omitted -> median imputed inside the saved pipeline ----
    BloodPressure: float | None = Field(
        None, ge=30, le=200, allow_inf_nan=False, description="Diastolic blood pressure (mm Hg)")
    SkinThickness: float | None = Field(
        None, ge=1, le=100, allow_inf_nan=False, description="Triceps skin-fold thickness (mm)")
    Insulin: float | None = Field(
        None, ge=1, le=1000, allow_inf_nan=False, description="2-hour serum insulin (mu U/ml)")
    DiabetesPedigreeFunction: float | None = Field(
        None, ge=0.01, le=3.0, allow_inf_nan=False,
        description="Diabetes pedigree function (family-history score)")


class FeatureImportance(BaseModel):
    feature: str
    importance: float


class PredictionResponse(BaseModel):
    predicted_class: int = Field(..., description="1 = higher-risk pattern, 0 = lower-risk pattern")
    predicted_label: str
    probability: float = Field(..., ge=0, le=1)
    decision_threshold: float
    model_name: str
    imputed_features: list[str]
    top_global_features: list[FeatureImportance]
    probability_note: str
    disclaimer: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str | None = None
    detail: str | None = None


ModelInfoResponse = dict[str, Any]