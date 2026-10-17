"""Regression tests for strict schemas on browser-controlled mutations."""


def test_preview_rejects_blank_question_and_unknown_fields(client, analyst_headers):
    blank = client.post("/api/v1/analytics/preview", json={"question": "  "}, headers=analyst_headers)
    assert blank.status_code == 422

    extra = client.post(
        "/api/v1/analytics/preview",
        json={"question": "Count active devices", "sql": "DELETE FROM devices"},
        headers=analyst_headers,
    )
    assert extra.status_code == 422


def test_anomaly_scan_rejects_coerced_or_extra_input(client, analyst_headers):
    coerced = client.post(
        "/api/v1/anomalies/scan",
        json={"limit": "50", "threshold": 0.65},
        headers=analyst_headers,
    )
    assert coerced.status_code == 422

    extra = client.post(
        "/api/v1/anomalies/scan",
        json={"limit": 10, "threshold": 0.65, "admin_override": True},
        headers=analyst_headers,
    )
    assert extra.status_code == 422
