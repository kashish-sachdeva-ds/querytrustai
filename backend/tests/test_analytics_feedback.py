"""
Integration tests for /api/v1/analytics/feedback endpoint.
"""


def test_feedback_requires_authentication(client):
    resp = client.post(
        "/api/v1/analytics/feedback",
        json={"query_run_id": "00000000-0000-0000-0000-000000000000", "is_helpful": True},
    )
    assert resp.status_code == 401


def test_feedback_submit_and_update(client, analyst_headers):
    # 1. Create and execute a query preview
    prev_resp = client.post(
        "/api/v1/analytics/preview",
        json={"question": "Count total active devices"},
        headers=analyst_headers,
    )
    run_id = prev_resp.json()["query_run_id"]

    # 2. Submit helpful feedback
    fb_resp = client.post(
        "/api/v1/analytics/feedback",
        json={"query_run_id": run_id, "is_helpful": True, "explanation": "Accurate aggregate counts."},
        headers=analyst_headers,
    )
    assert fb_resp.status_code == 200
    fb_data = fb_resp.json()
    assert fb_data["query_run_id"] == run_id
    assert fb_data["is_helpful"] is True
    assert fb_data["explanation"] == "Accurate aggregate counts."

    # 3. Update feedback to not helpful
    update_resp = client.post(
        "/api/v1/analytics/feedback",
        json={"query_run_id": run_id, "is_helpful": False, "explanation": "Changed my mind."},
        headers=analyst_headers,
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["is_helpful"] is False
    assert updated_data["explanation"] == "Changed my mind."


def test_feedback_ownership_isolation(client, analyst_headers, viewer_headers):
    # Analyst creates query run
    prev_resp = client.post(
        "/api/v1/analytics/preview",
        json={"question": "Count active devices"},
        headers=analyst_headers,
    )
    run_id = prev_resp.json()["query_run_id"]

    # Viewer attempts to submit feedback for Analyst's query -> Forbidden (403)
    fb_resp = client.post(
        "/api/v1/analytics/feedback",
        json={"query_run_id": run_id, "is_helpful": True},
        headers=viewer_headers,
    )
    assert fb_resp.status_code == 403


def test_admin_cannot_overwrite_another_users_feedback(client, analyst_headers, admin_headers):
    prev_resp = client.post(
        "/api/v1/analytics/preview",
        json={"question": "Count active devices"},
        headers=analyst_headers,
    )
    fb_resp = client.post(
        "/api/v1/analytics/feedback",
        json={"query_run_id": prev_resp.json()["query_run_id"], "is_helpful": True},
        headers=admin_headers,
    )
    assert fb_resp.status_code == 403
