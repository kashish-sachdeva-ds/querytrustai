"""
Integration tests for chat sessions and message ownership isolation.
"""


def test_chat_sessions_unauthenticated(client):
    resp = client.get("/api/v1/chat/sessions")
    assert resp.status_code == 401


def test_create_and_list_chat_sessions(client, analyst_headers):
    # Create session
    create_resp = client.post(
        "/api/v1/chat/sessions",
        json={"title": "Network Analysis Q4"},
        headers=analyst_headers,
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


def test_session_ownership_isolation(client, analyst_headers, viewer_headers):
    # Analyst creates a session
    create_resp = client.post(
        "/api/v1/chat/sessions",
        json={"title": "Analyst Private Session"},
        headers=analyst_headers,
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


def test_delete_own_chat_session(client, viewer_headers):
    # Viewer creates a session
    create_resp = client.post(
        "/api/v1/chat/sessions",
        json={"title": "Session to Delete"},
        headers=viewer_headers,
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
