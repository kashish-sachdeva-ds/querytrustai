"""
Integration tests for chat sessions and message ownership isolation.
"""


def _mutation_headers(headers, key):
    return {**headers, "Idempotency-Key": key}


def test_chat_sessions_unauthenticated(client):
    resp = client.get("/api/v1/chat/sessions")
    assert resp.status_code == 401


def test_create_and_list_chat_sessions(client, analyst_headers):
    # Create session
    create_resp = client.post(
        "/api/v1/chat/sessions",
        json={"title": "Network Analysis Q4"},
        headers=_mutation_headers(analyst_headers, "create-session-network-analysis"),
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["title"] == "Network Analysis Q4"
    assert "id" in created

    # List sessions
    list_resp = client.get("/api/v1/chat/sessions", headers=analyst_headers)
    assert list_resp.status_code == 200
    sessions = list_resp.json()
    assert any(s["id"] == created["id"] for s in sessions)


def test_create_session_idempotency_key_returns_one_session(client, analyst_headers):
    headers = _mutation_headers(analyst_headers, "same-create-request-key")
    first = client.post("/api/v1/chat/sessions", json={"title": "One Session"}, headers=headers)
    second = client.post("/api/v1/chat/sessions", json={"title": "One Session"}, headers=headers)
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


def test_session_ownership_isolation(client, analyst_headers, viewer_headers):
    # Analyst creates a session
    create_resp = client.post(
        "/api/v1/chat/sessions",
        json={"title": "Analyst Private Session"},
        headers=_mutation_headers(analyst_headers, "create-session-analyst-private"),
    )
    assert create_resp.status_code == 201
    analyst_session_id = create_resp.json()["id"]

    # Viewer attempts to read Analyst's session messages -> Must be forbidden (403)
    viewer_read_resp = client.get(
        f"/api/v1/chat/sessions/{analyst_session_id}/messages",
        headers=viewer_headers,
    )
    assert viewer_read_resp.status_code == 403
    assert "permission" in viewer_read_resp.json()["detail"].lower()

    # Viewer attempts to delete Analyst's session -> Must be forbidden (403)
    viewer_del_resp = client.delete(
        f"/api/v1/chat/sessions/{analyst_session_id}",
        headers=viewer_headers,
    )
    assert viewer_del_resp.status_code == 403


def test_admin_cannot_read_or_delete_private_chat_session(client, analyst_headers, admin_headers):
    create_resp = client.post(
        "/api/v1/chat/sessions",
        json={"title": "Analyst Private Session"},
        headers=_mutation_headers(analyst_headers, "create-session-admin-private"),
    )
    session_id = create_resp.json()["id"]
    assert client.get(f"/api/v1/chat/sessions/{session_id}/messages", headers=admin_headers).status_code == 403
    assert client.delete(f"/api/v1/chat/sessions/{session_id}", headers=admin_headers).status_code == 403


def test_delete_own_chat_session(client, viewer_headers):
    # Viewer creates a session
    create_resp = client.post(
        "/api/v1/chat/sessions",
        json={"title": "Session to Delete"},
        headers=_mutation_headers(viewer_headers, "create-session-viewer-delete"),
    )
    session_id = create_resp.json()["id"]

    # Viewer deletes own session
    del_resp = client.delete(
        f"/api/v1/chat/sessions/{session_id}",
        headers=viewer_headers,
    )
    assert del_resp.status_code == 204

    # Confirm gone
    get_resp = client.get(
        f"/api/v1/chat/sessions/{session_id}/messages",
        headers=viewer_headers,
    )
    assert get_resp.status_code == 404
