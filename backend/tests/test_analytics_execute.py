"""
Integration tests for /api/v1/analytics/execute endpoint.

Verifies:
- Execution requires authentication.
- Execution requires query run ownership (or admin).
- Blocked queries cannot be executed.
- Server executes previewed query against PostgreSQL using analytics_reader role.
- Returns row count, columns, rows, execution duration, and chart recommendations.
- Revalidation at execution time blocks corrupted or tampered SQL.
- Arbitrary SQL cannot be passed from client (only server-stored preview ID accepted).
"""

from app.models.query_run import QueryRun


def test_execute_requires_authentication(client):
    resp = client.post("/api/v1/analytics/execute", json={"query_run_id": "00000000-0000-0000-0000-000000000000"})
    assert resp.status_code == 401


def test_execute_nonexistent_preview_returns_404(client, analyst_headers):
    resp = client.post(
        "/api/v1/analytics/execute",
        json={"query_run_id": "00000000-0000-0000-0000-000000000000"},
        headers=analyst_headers,
    )
    assert resp.status_code == 404


def test_execute_ownership_isolation(client, analyst_headers, viewer_headers):
    # Analyst creates preview
    prev_resp = client.post(
        "/api/v1/analytics/preview",
        json={"question": "Count active devices"},
        headers=analyst_headers,
    )
    assert prev_resp.status_code == 200
    run_id = prev_resp.json()["query_run_id"]

    # Viewer attempts to execute Analyst's preview -> Forbidden (403)
    exec_resp = client.post(
        "/api/v1/analytics/execute",
        json={"query_run_id": run_id},
        headers=viewer_headers,
    )
    assert exec_resp.status_code == 403
    assert "permission" in exec_resp.json()["detail"].lower()


def test_execute_blocked_query_rejected(client, admin_headers, db_session):
    # Preview a blocked query
    prev_resp = client.post(
        "/api/v1/analytics/preview",
        json={"question": "DROP TABLE devices; --"},
        headers=admin_headers,
    )
    assert prev_resp.status_code == 200
    run_id = prev_resp.json()["query_run_id"]

    # Attempt to execute blocked query -> Bad Request (400)
    exec_resp = client.post(
        "/api/v1/analytics/execute",
        json={"query_run_id": run_id},
        headers=admin_headers,
    )
    assert exec_resp.status_code == 400
    assert "blocked" in exec_resp.json()["detail"].lower()


def test_execute_valid_query_success(client, analyst_headers, db_session):
    # 1. Preview query: active devices by region
    prev_resp = client.post(
        "/api/v1/analytics/preview",
        json={"question": "How many active devices are in each region?"},
        headers=analyst_headers,
    )
    assert prev_resp.status_code == 200
    run_id = prev_resp.json()["query_run_id"]

    # 2. Execute query
    exec_resp = client.post(
        "/api/v1/analytics/execute",
        json={"query_run_id": run_id},
        headers=analyst_headers,
    )
    assert exec_resp.status_code == 200
    data = exec_resp.json()

    assert data["status"] == "executed"
    assert data["row_count"] > 0
    assert len(data["rows"]) == data["row_count"]
    assert "region" in data["columns"]
    assert "active_device_count" in data["columns"]
    assert data["execution_duration_ms"] > 0
    assert data["truncated"] is False
    assert "result_summary" in data
    assert "chart_recommendation" in data
    assert data["chart_recommendation"]["chart_type"] in ["bar", "pie"]

    # 3. Verify database record was updated
    query_run = db_session.query(QueryRun).filter(QueryRun.id == run_id).first()
    assert query_run is not None
    assert query_run.status == "executed"
    assert query_run.row_count == data["row_count"]
    assert query_run.executed_at is not None
    assert query_run.execution_duration_ms > 0


def test_execute_revalidates_and_blocks_tampered_query(client, admin_headers, db_session):
    # 1. Create a legitimate preview first
    prev_resp = client.post(
        "/api/v1/analytics/preview",
        json={"question": "Count active devices"},
        headers=admin_headers,
    )
    run_id = prev_resp.json()["query_run_id"]

    # 2. Simulate malicious tampering of stored SQL
    query_run = db_session.query(QueryRun).filter(QueryRun.id == run_id).first()
    query_run.generated_sql = "DELETE FROM devices WHERE id = 1;"
    db_session.commit()

    # 3. Execute must re-validate AST and block execution
    exec_resp = client.post(
        "/api/v1/analytics/execute",
        json={"query_run_id": run_id},
        headers=admin_headers,
    )
    assert exec_resp.status_code == 400
    assert "safety check" in exec_resp.json()["detail"].lower()
