import pytest
import hmac
import hashlib
from unittest.mock import patch, AsyncMock
from app.services.webhook_dispatcher import (
    validate_webhook_url,
    format_alert_payload,
    compute_hmac_signature,
    dispatch_webhook,
)


def test_validate_webhook_url_valid():
    # Valid HTTPS URLs
    validate_webhook_url("https://discord.com/api/webhooks/123/abc")
    validate_webhook_url("https://hooks.slack.com/services/T00/B00/X00")
    validate_webhook_url("https://api.mycompany.org/querytrust-events")


def test_validate_webhook_url_blocks_ssrf_metadata():
    # Cloud metadata endpoints must be blocked
    with pytest.raises(ValueError, match="SSRF protection"):
        validate_webhook_url("http://169.254.169.254/latest/meta-data")

    with pytest.raises(ValueError, match="SSRF protection"):
        validate_webhook_url("http://metadata.google.internal/computeMetadata/v1")


def test_format_alert_payload_discord():
    fields = [
        {"name": "Device", "value": "RTR-NYC-01"},
        {"name": "Metric", "value": "Packet Loss (4.2%)"},
    ]
    payload = format_alert_payload(
        platform="discord",
        alert_type="telemetry_anomaly",
        title="Critical Telemetry Outlier",
        description="High packet loss detected on core router.",
        fields=fields,
        severity="critical",
    )
    assert "embeds" in payload
    assert payload["embeds"][0]["title"] == "Critical Telemetry Outlier"
    assert payload["embeds"][0]["color"] == 15158332  # Red for critical
    assert len(payload["embeds"][0]["fields"]) == 2


def test_format_alert_payload_slack():
    fields = [
        {"name": "Rule", "value": "Missing Serial Number"},
        {"name": "Severity", "value": "HIGH"},
    ]
    payload = format_alert_payload(
        platform="slack",
        alert_type="data_quality_failure",
        title="Diagnostic Integrity Failure",
        description="6 devices flagged with empty serial numbers.",
        fields=fields,
        severity="warning",
    )
    assert "blocks" in payload
    assert any(b.get("type") == "header" for b in payload["blocks"])


def test_compute_hmac_signature():
    payload_bytes = b'{"hello": "world"}'
    secret = "super-secret-key-123"
    headers = compute_hmac_signature(payload_bytes, secret)

    assert "X-QueryTrust-Signature" in headers
    assert "X-QueryTrust-Timestamp" in headers
    expected = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
    assert headers["X-QueryTrust-Signature"] == f"sha256={expected}"


def test_dispatch_webhook_success_mock():
    import asyncio
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_response = AsyncMock()
        mock_response.status_code = 204
        mock_post.return_value = mock_response

        success, status_code, latency_ms, msg = asyncio.run(
            dispatch_webhook(
                url="https://discord.com/api/webhooks/mock",
                platform="discord",
                alert_type="test",
                title="Test Alert",
                description="Testing webhook dispatch",
                fields=[{"name": "Test", "value": "Passed"}],
            )
        )

        assert success is True
        assert status_code == 204
        assert latency_ms is not None


def test_webhook_api_rbac_and_lifecycle(client, admin_headers, analyst_headers, viewer_headers):
    # 1. Unauthenticated request -> 401
    resp = client.get("/api/v1/webhooks")
    assert resp.status_code == 401

    # 2. Viewer cannot configure webhook -> 403
    create_payload = {
        "name": "Ops Discord Alerts",
        "url": "https://discord.com/api/webhooks/999/xyz",
        "platform": "discord",
        "secret_token": "dev-secret-sig",
        "notify_on_anomaly": True,
        "notify_on_data_quality": True,
    }
    resp = client.post("/api/v1/webhooks", json=create_payload, headers=viewer_headers)
    assert resp.status_code == 403

    # 3. SSRF rejected by API -> 400
    bad_payload = {**create_payload, "url": "http://169.254.169.254/secrets"}
    resp = client.post("/api/v1/webhooks", json=bad_payload, headers=admin_headers)
    assert resp.status_code == 400

    # 4. Admin configures webhook -> 201
    resp = client.post("/api/v1/webhooks", json=create_payload, headers=admin_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Ops Discord Alerts"
    assert data["has_secret_token"] is True
    assert data["platform"] == "discord"

    # 5. Analyst can read active webhook configuration -> 200
    resp = client.get("/api/v1/webhooks", headers=analyst_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Ops Discord Alerts"

    # 6. Test dispatch endpoint with mocked client
    with patch("app.api.v1.webhooks.dispatch_webhook") as mock_dispatch:
        mock_dispatch.return_value = (True, 204, 35.5, "Webhook dispatched successfully.")
        resp = client.post("/api/v1/webhooks/test", json={}, headers=analyst_headers)
        assert resp.status_code == 200
        test_res = resp.json()
        assert test_res["success"] is True
        assert test_res["status_code"] == 204

    # 7. Admin deletes webhook -> 204
    resp = client.delete("/api/v1/webhooks", headers=admin_headers)
    assert resp.status_code == 204

    # 8. GET now returns null
    resp = client.get("/api/v1/webhooks", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json() is None
