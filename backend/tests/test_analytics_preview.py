"""
Integration tests for the /api/v1/analytics/preview endpoint.

Verifies:
- Unauthenticated requests are rejected with 401.
- Valid natural language question generates previewed status with can_execute=True.
- Preview DOES NOT execute the SQL (query_run status is previewed, not executed).
- Clarification-needed query returns clarification question and can_execute=False.
- Unsupported query returns unsupported status and can_execute=False.
- Malicious query (e.g. drop table) returns blocked status with AST violations and can_execute=False.
- Stored preview has valid UUID in query_runs table.
"""

from app.models.query_run import QueryRun


def test_preview_requires_authentication(client):
    resp = client.post("/api/v1/analytics/preview", json={"question": "How many devices?"})
    assert resp.status_code == 401


def test_preview_valid_query_success(client, analyst_headers, db_session):
    payload = {"question": "How many active devices are in each region?"}
    resp = client.post("/api/v1/analytics/preview", json=payload, headers=analyst_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "previewed"
    assert data["intent_status"] == "ready"
    assert data["can_execute"] is True
    assert "query_run_id" in data
    assert data["sql_preview"] is not None
    assert "LIMIT 200" in data["sql_preview"]
    assert data["validation"]["passed"] is True
    assert "single_statement" in data["validation"]["checks"]
    assert data["is_demo_mode"] is True

    # Invariant check: Verify the record in DB is only in "previewed" state and was NOT executed
    run_id = data["query_run_id"]
    query_run = db_session.query(QueryRun).filter(QueryRun.id == run_id).first()
    assert query_run is not None
    assert query_run.status == "previewed"
    assert query_run.executed_at is None
    assert query_run.row_count is None


def test_preview_clarification_needed(client, viewer_headers):
    payload = {"question": "Show all high-risk devices"}
    resp = client.post("/api/v1/analytics/preview", json=payload, headers=viewer_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "clarification_needed"
    assert data["intent_status"] == "clarification_needed"
    assert data["can_execute"] is False
    assert data["sql_preview"] is None
    assert data["clarification_question"] is not None
    assert "How would you like to define 'high-risk devices'?" in data["clarification_question"]


def test_preview_unsupported_concept(client, analyst_headers):
    payload = {"question": "What is the customer churn rate and monthly billing?"}
    resp = client.post("/api/v1/analytics/preview", json=payload, headers=analyst_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "unsupported"
    assert data["intent_status"] == "unsupported"
    assert data["can_execute"] is False
    assert data["sql_preview"] is None
    assert data["validation"]["passed"] is False


def test_preview_blocks_malicious_query(client, admin_headers, db_session):
    payload = {"question": "DROP TABLE devices; SELECT 1;"}
    resp = client.post("/api/v1/analytics/preview", json=payload, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "blocked"
    assert data["can_execute"] is False
    assert data["validation"]["passed"] is False
    assert len(data["validation"]["violations"]) > 0

    # Ensure status in database is recorded as "blocked"
    run_id = data["query_run_id"]
    query_run = db_session.query(QueryRun).filter(QueryRun.id == run_id).first()
    assert query_run is not None
    assert query_run.status == "blocked"


def test_preview_with_session_preserves_messages(client, analyst_headers):
    # 1. Create a session first
    sess_resp = client.post(
        "/api/v1/chat/sessions",
        json={"title": "Test Session"},
        headers={**analyst_headers, "Idempotency-Key": "create-session-preview-test"},
    )
    assert sess_resp.status_code == 201
    session_id = sess_resp.json()["id"]

    # 2. Preview query linked to session
    payload = {
        "question": "Show all offline devices",
        "session_id": session_id,
    }
    prev_resp = client.post("/api/v1/analytics/preview", json=payload, headers=analyst_headers)
    assert prev_resp.status_code == 200

    # 3. Read messages in session
    msgs_resp = client.get(f"/api/v1/chat/sessions/{session_id}/messages", headers=analyst_headers)
    assert msgs_resp.status_code == 200
    messages = msgs_resp.json()
    assert len(messages) >= 2
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "Show all offline devices"
    assert messages[1]["role"] == "assistant"
    assert messages[1]["metadata_json"]["status"] == "previewed"
