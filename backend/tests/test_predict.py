import joblib
import pandas as pd
import pytest

from app import config
from app.preprocessing import FEATURES


def test_valid_prediction_structure(client, valid_payload):
    r = client.post("/predict", json=valid_payload)
    assert r.status_code == 200
    body = r.json()
    assert body["predicted_class"] in (0, 1)
    assert 0.0 <= body["probability"] <= 1.0
    assert body["imputed_features"] == []
    assert "not a medical device" in body["disclaimer"].lower()
    assert len(body["top_global_features"]) > 0


def test_api_matches_direct_pipeline_call(client, valid_payload):
    """API output must equal calling the saved pipeline directly (same preprocessing)."""
    pipe = joblib.load(config.MODEL_PATH)
    expected = pipe.predict_proba(pd.DataFrame([valid_payload], columns=FEATURES))[0, 1]
    got = client.post("/predict", json=valid_payload).json()["probability"]
    assert got == pytest.approx(expected, abs=1e-4)


def test_optional_fields_omitted_are_reported_as_imputed(client):
    payload = {"Pregnancies": 1, "Glucose": 110, "BMI": 27.0, "Age": 30}
    r = client.post("/predict", json=payload)
    assert r.status_code == 200
    assert set(r.json()["imputed_features"]) == {
        "BloodPressure", "SkinThickness", "Insulin", "DiabetesPedigreeFunction"}


def test_optional_fields_null_are_accepted(client, valid_payload):
    valid_payload["Insulin"] = None
    valid_payload["SkinThickness"] = None
    r = client.post("/predict", json=valid_payload)
    assert r.status_code == 200
    assert set(r.json()["imputed_features"]) == {"Insulin", "SkinThickness"}


def test_higher_risk_profile_scores_above_lower_risk_profile(client):
    """Directional sanity check, not a clinical claim."""
    low = {"Pregnancies": 1, "Glucose": 85, "BMI": 22.0, "Age": 24}
    high = {"Pregnancies": 6, "Glucose": 180, "BMI": 38.0, "Age": 55}
    p_low = client.post("/predict", json=low).json()["probability"]
    p_high = client.post("/predict", json=high).json()["probability"]
    assert p_high > p_low


@pytest.mark.parametrize("missing", ["Pregnancies", "Glucose", "BMI", "Age"])
def test_missing_required_field_rejected(client, valid_payload, missing):
    del valid_payload[missing]
    assert client.post("/predict", json=valid_payload).status_code == 422


@pytest.mark.parametrize("field,value", [
    ("Glucose", 0), ("Glucose", 1000), ("Glucose", -5),
    ("BMI", 0), ("BMI", 200),
    ("Age", 5), ("Age", 150),
    ("Pregnancies", -1), ("Pregnancies", 2.5),
    ("BloodPressure", 0), ("Insulin", 0), ("SkinThickness", 0),
    ("DiabetesPedigreeFunction", 10),
    ("Glucose", "abc"), ("Glucose", None),
])
def test_invalid_values_rejected(client, valid_payload, field, value):
    valid_payload[field] = value
    r = client.post("/predict", json=valid_payload)
    assert r.status_code == 422


def test_unknown_fields_rejected(client, valid_payload):
    valid_payload["Name"] = "Someone"
    assert client.post("/predict", json=valid_payload).status_code == 422


def test_empty_body_rejected(client):
    assert client.post("/predict", json={}).status_code == 422