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
    assert messages[1]["metadata_json"]["status"] == "previewed"


def test_preview_on_custom_workspace_without_connected_database_returns_friendly_prompt(client, db_session):
    import uuid
    from app.models.user import User
    from app.core.auth import create_access_token
    from app.core.security import get_password_hash

    uid = uuid.uuid4().hex[:8]
    # Create a fresh user in a new company workspace
    custom_user = User(
        email=f"test_unconfigured_{uid}@customcorp.com",
        display_name="Custom User",
        password_hash=get_password_hash("Secret123!"),
        role="viewer",
        workspace_name=f"Custom Corp {uid}",
        is_active=True,
    )
    db_session.add(custom_user)
    db_session.commit()
    token = create_access_token(user_id=str(custom_user.id), role=custom_user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # Ask question on unconfigured workspace
    resp = client.post("/api/v1/analytics/preview", json={"question": "Show all sales records"}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "unsupported"
    assert data["intent_status"] == "unsupported"
    assert data["can_execute"] is False
    assert "No database connected to this workspace" in data["interpreted_question"]
    assert "connect your organization's database" in data["clarification_question"]


def test_preview_on_custom_workspace_with_connected_database_generates_schema_aware_sql(client, db_session):
    import uuid
    from app.models.user import User
    from app.models.data_source import DataSource
    from app.core.auth import create_access_token
    from app.core.security import get_password_hash
    from app.services.data_source_service import encrypt_secret

    uid = uuid.uuid4().hex[:8]
    ws_name = f"Fintech Corp {uid}"
    # Create a company owner in a custom workspace
    owner = User(
        email=f"owner_{uid}@fintechcorp.com",
        display_name="Fintech Owner",
        password_hash=get_password_hash("Secret123!"),
        role="admin",
        workspace_name=ws_name,
        is_active=True,
    )
    db_session.add(owner)
    db_session.commit()

    # Add a mock active DataSource with custom tables (invoices, accounts)
    ds = DataSource(
        workspace_name=ws_name,
        name="Fintech Production DB",
        db_type="postgresql",
        host="localhost",
        port=5432,
        database_name="fintech_prod",
        username="readonly_user",
        encrypted_password=encrypt_secret("dbpass"),
        ssl_mode="disable",
        is_active=True,
        schema_cache={
            "table_count": 2,
            "column_count": 5,
            "table_names": ["invoices", "accounts"],
            "tables": [
                {
                    "table_name": "invoices",
                    "columns": [
                        {"name": "id", "data_type": "integer", "is_nullable": False},
                        {"name": "amount", "data_type": "numeric", "is_nullable": False},
                        {"name": "status", "data_type": "character varying(50)", "is_nullable": False},
                    ],
                },
                {
                    "table_name": "accounts",
                    "columns": [
                        {"name": "id", "data_type": "integer", "is_nullable": False},
                        {"name": "account_name", "data_type": "character varying(100)", "is_nullable": False},
                    ],
                },
            ],
        },
    )
    db_session.add(ds)
    db_session.commit()

    token = create_access_token(user_id=str(owner.id), role=owner.role)
    headers = {"Authorization": f"Bearer {token}"}

    # Ask question targeting custom table "invoices"
    resp = client.post("/api/v1/analytics/preview", json={"question": "How many invoices do we have?"}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "previewed"
    assert data["can_execute"] is True
    assert "invoices" in data["sql_preview"]
    assert "COUNT(*)" in data["sql_preview"]
    assert data["validation"]["passed"] is True
    assert "invoices" in data["validation"]["tables_referenced"]

