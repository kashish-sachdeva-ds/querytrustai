def test_dashboard_summary_requires_authentication(client):
    """Unauthenticated calls to /api/v1/dashboard/summary must be rejected with 401."""
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_dashboard_summary_returns_live_counts(client, viewer_headers):
    """Authenticated calls to /api/v1/dashboard/summary return live database metrics."""
    response = client.get("/api/v1/dashboard/summary", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()

    # Invariants from seed data
    assert data["total_devices"] == 5000
    assert data["total_sites"] == 50
    assert data["active_devices"] > 0
    assert data["active_devices"] <= data["total_devices"]
    assert data["expiring_warranties_30d"] > 0
    assert data["open_service_events"] > 0

    # Categorical breakdown lists
    assert len(data["devices_by_type"]) > 0
    assert len(data["devices_by_status"]) > 0
    assert len(data["events_by_severity"]) > 0
    assert len(data["recent_service_events"]) <= 5
    assert len(data["recent_service_events"]) > 0

    # Expanded metrics for Milestone 2
    assert len(data["warranties_by_bucket"]) > 0
    assert len(data["top_sites_by_expiring_warranties"]) > 0

    # Verify recent event shape
    first_event = data["recent_service_events"][0]
    assert "id" in first_event
    assert "asset_tag" in first_event
    assert "severity" in first_event
    assert "status" in first_event
