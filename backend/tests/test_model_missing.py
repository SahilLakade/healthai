from fastapi.testclient import TestClient

from app.main import create_app

VALID = {"Pregnancies": 2, "Glucose": 120, "BMI": 28.5, "Age": 35}


def test_missing_model_file_gives_503_not_fake_prediction(tmp_path):
    client = TestClient(create_app(tmp_path / "nope.joblib", tmp_path / "nope.json"))

    h = client.get("/health")
    assert h.status_code == 503
    assert h.json()["model_loaded"] is False
    assert "train" in h.json()["detail"].lower()

    p = client.post("/predict", json=VALID)
    assert p.status_code == 503
    assert "train" in p.json()["detail"].lower()

    assert client.get("/model-info").status_code == 503


def test_corrupt_model_file_gives_503(tmp_path):
    bad_model = tmp_path / "bad.joblib"
    bad_model.write_bytes(b"this is not a real model")
    bad_metrics = tmp_path / "metrics.json"
    bad_metrics.write_text("{}", encoding="utf-8")

    client = TestClient(create_app(bad_model, bad_metrics))
    assert client.get("/health").status_code == 503
    assert client.post("/predict", json=VALID).status_code == 503