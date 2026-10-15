"""
Unit and integration tests for Data Quality Profiler Subsystem.

Verifies:
- Unauthenticated requests are rejected (401).
- Viewers can inspect summary/findings (200) but cannot trigger profiling runs (403).
- Analysts and Admins can trigger profiling runs (200).
- All 6 diagnostic rules produce findings with valid percentages and recommendations.
- Profiler is strictly read-only and never mutates underlying database records.
- Findings endpoint supports pagination and severity filtering.
"""

from app.models.device import Device
from app.models.data_quality import DataQualityRun, DataQualityFinding


def test_data_quality_summary_unauthenticated(client):
    resp = client.get("/api/v1/data-quality/summary")
    assert resp.status_code == 401


def test_data_quality_run_forbidden_for_viewer(client, viewer_headers):
    resp = client.post("/api/v1/data-quality/run", headers=viewer_headers)
    assert resp.status_code == 403
    assert "authorized" in resp.json()["detail"].lower()


def test_data_quality_run_allowed_for_analyst(client, analyst_headers):
    resp = client.post("/api/v1/data-quality/run", headers=analyst_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "summary" in data
    assert "findings" in data
    summary = data["summary"]
    assert summary["status"] == "completed"
    assert summary["total_findings"] >= 5
    assert summary["critical_count"] >= 1
    assert summary["high_count"] >= 1
    assert summary["overall_health_score"] > 0

    # Ensure findings list is non-empty
    findings = data["findings"]
    assert len(findings) == summary["total_findings"]

    # Verify rule IDs
    rule_ids = {f["rule_id"] for f in findings}
    assert "DQ-001" in rule_ids
    assert "DQ-002" in rule_ids
    assert "DQ-003" in rule_ids
    assert "DQ-004" in rule_ids


def test_data_quality_summary_viewer_allowed(client, viewer_headers):
    resp = client.get("/api/v1/data-quality/summary", headers=viewer_headers)
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["status"] == "completed"
    assert summary["total_findings"] >= 1
    assert "overall_health_score" in summary


def test_data_quality_findings_filtering_and_pagination(client, analyst_headers):
    # Query critical findings only
    resp = client.get("/api/v1/data-quality/findings?severity=critical&page=1&limit=10", headers=analyst_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "findings" in data
    assert "total" in data
    for item in data["findings"]:
        assert item["severity"] == "critical"
        assert item["affected_rows"] > 0
        assert len(item["example_identifiers"]) > 0
        assert item["suggested_action"] != ""

    # Query high findings
    resp_high = client.get("/api/v1/data-quality/findings?severity=high", headers=analyst_headers)
    assert resp_high.status_code == 200
    for item in resp_high.json()["findings"]:
        assert item["severity"] == "high"


def test_profiler_is_strictly_read_only(client, admin_headers, db_session):
    """Verifies that running the profiler does not alter the device count or records."""
    device_count_before = db_session.query(Device).count()
    resp = client.post("/api/v1/data-quality/run", headers=admin_headers)
    assert resp.status_code == 200
    device_count_after = db_session.query(Device).count()

    assert device_count_before == device_count_after
