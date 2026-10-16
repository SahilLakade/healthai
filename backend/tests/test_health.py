import json

from app import config


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert body["model_name"] in ("Logistic Regression", "Random Forest")


def test_model_info_comes_from_metrics_file(client):
    r = client.get("/model-info")
    assert r.status_code == 200
    with open(config.METRICS_PATH, encoding="utf-8") as f:
        on_disk = json.load(f)
    assert r.json()["selected_model"] == on_disk["selected_model"]
    assert "test_results" in r.json()
    assert "confusion_matrix" in r.json()["test_results"][on_disk["selected_model"]]


def test_docs_available(client):
    assert client.get("/docs").status_code == 200


def test_cors_allows_frontend_origin(client):
    r = client.options("/predict", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_blocks_unknown_origin(client):
    r = client.options("/predict", headers={
        "Origin": "http://evil.example",
        "Access-Control-Request-Method": "POST",
    })
    assert "access-control-allow-origin" not in r.headers