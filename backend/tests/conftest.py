import pytest
from fastapi.testclient import TestClient

from app import config
from app.main import create_app


@pytest.fixture(scope="session")
def client():
    if not config.MODEL_PATH.exists():
        pytest.skip("Model not trained yet: run python scripts\\train_model.py")
    return TestClient(create_app())


@pytest.fixture
def valid_payload():
    return {
        "Pregnancies": 2, "Glucose": 120, "BloodPressure": 70,
        "SkinThickness": 25, "Insulin": 80, "BMI": 28.5,
        "DiabetesPedigreeFunction": 0.45, "Age": 35,
    }