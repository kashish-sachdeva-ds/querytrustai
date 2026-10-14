"""
Integration tests for /api/v1/analytics/history endpoint.
"""


def test_history_requires_authentication(client):
    resp = client.get("/api/v1/analytics/history")
    assert resp.status_code == 401


def test_history_pagination_and_ownership(client, analyst_headers, viewer_headers):
    # Analyst creates and executes a query
    prev_resp = client.post(
        "/api/v1/analytics/preview",
        json={"question": "Find routers with warranty expiring in 60 days"},
        headers=analyst_headers,
    )
    run_id = prev_resp.json()["query_run_id"]
    client.post("/api/v1/analytics/execute", json={"query_run_id": run_id}, headers=analyst_headers)

    # Analyst retrieves history -> query is present
    hist_resp = client.get("/api/v1/analytics/history?page=1&page_size=10", headers=analyst_headers)
    assert hist_resp.status_code == 200
    data = hist_resp.json()
    assert data["total"] >= 1
    assert any(item["id"] == run_id for item in data["items"])

    # Viewer retrieves history -> Analyst's query MUST NOT be in Viewer's list
    viewer_hist_resp = client.get("/api/v1/analytics/history", headers=viewer_headers)
    assert viewer_hist_resp.status_code == 200
    viewer_data = viewer_hist_resp.json()
    assert not any(item["id"] == run_id for item in viewer_data["items"])


def test_admin_can_view_all_history(client, admin_headers, analyst_headers):
    # Analyst creates a query
    prev_resp = client.post(
        "/api/v1/analytics/preview",
        json={"question": "Count offline devices"},
        headers=analyst_headers,
    )
    analyst_run_id = prev_resp.json()["query_run_id"]

    # Admin retrieves history -> Analyst query is visible
    admin_hist_resp = client.get("/api/v1/analytics/history", headers=admin_headers)
    assert admin_hist_resp.status_code == 200
    admin_data = admin_hist_resp.json()
    assert any(item["id"] == analyst_run_id for item in admin_data["items"])
