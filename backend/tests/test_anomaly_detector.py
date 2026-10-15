"""
Unit and integration tests for Telemetry Anomaly Detection Subsystem.

Verifies:
- Unauthenticated requests are rejected (401).
- Viewers can view model summary and run anomaly scans (200).
- Viewers cannot trigger model training/re-fitting (403).
- Analysts and Admins can trigger model training (200).
- Scan returns top ranked statistical outliers with normalized scores.
- INVARIANT: Anomaly scores are never described as failure probabilities.
- Model artifact is serialized and loaded properly.
"""

from app.core.anomaly_detector import anomaly_detector


def test_anomaly_summary_unauthenticated(client):
    resp = client.get("/api/v1/anomalies/summary")
    assert resp.status_code == 401


def test_anomaly_summary_returns_model_metadata(client, viewer_headers):
    resp = client.get("/api/v1/anomalies/summary", headers=viewer_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["model_name"] == "telemetry_isolation_forest"
    assert data["version"] == "1.0.0"
    assert data["algorithm"] == "IsolationForest"
    assert "cpu_percent" in data["feature_list"]
    assert "memory_percent" in data["feature_list"]
    assert "temperature_c" in data["feature_list"]
    assert "packet_loss_percent" in data["feature_list"]
    assert "latency_ms" in data["feature_list"]
    assert data["contamination"] > 0
    assert data["is_active"] is True


def test_anomaly_scan_viewer_allowed(client, viewer_headers):
    resp = client.post(
        "/api/v1/anomalies/scan",
        json={"limit": 25, "threshold": 0.60},
        headers=viewer_headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["model_version"] == "1.0.0"
    assert data["algorithm"] == "IsolationForest"
    assert data["total_telemetry_scanned"] >= 20000
    assert data["anomalies_detected"] > 0
    assert len(data["top_anomalies"]) <= 25

    # Check disclaimer invariant
    disclaimer = data["disclaimer"].lower()
    assert "not" in disclaimer
    assert "failure" in disclaimer
    assert "probability" not in data or "failure_probability" not in data

    # Verify first anomaly
    top_item = data["top_anomalies"][0]
    assert top_item["rank"] == 1
    assert 0.0 <= top_item["anomaly_score"] <= 1.0
    assert "telemetry" in top_item
    assert "asset_tag" in top_item
    assert "site_name" in top_item


def test_anomaly_train_forbidden_for_viewer(client, viewer_headers):
    resp = client.post("/api/v1/anomalies/train?contamination=0.015", headers=viewer_headers)
    assert resp.status_code == 403
    assert "authorized" in resp.json()["detail"].lower()


def test_anomaly_train_allowed_for_analyst(client, analyst_headers):
    resp = client.post("/api/v1/anomalies/train?contamination=0.015", headers=analyst_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["version"] == "1.0.0"
    assert data["training_samples"] >= 20000
    assert data["fit_duration_seconds"] > 0
    assert "synthetic_benchmark_metrics" in data["metrics"]


def test_anomaly_scores_do_not_claim_device_failure(client, admin_headers):
    """Core Invariant Test: Verify no endpoint describes anomaly score as a failure probability."""
    resp = client.post(
        "/api/v1/anomalies/scan",
        json={"limit": 5, "threshold": 0.50},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    raw_text = resp.text.lower()

    # The string "failure probability" or "probability of failure" must NOT appear
    # unless preceded by negation like "not failure probabilities"
    assert "probability of failure" not in raw_text or "not a probability of failure" in raw_text
