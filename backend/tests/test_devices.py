def test_devices_unauthenticated(client):
    """Accessing /api/v1/devices without authentication returns 401."""
    response = client.get("/api/v1/devices")
    assert response.status_code == 401


def test_devices_paginated_list(client, viewer_headers):
    """Authenticated request returns paginated list of devices."""
    response = client.get("/api/v1/devices?page=1&page_size=20", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 5000
    assert len(data["items"]) == 20
    assert data["page"] == 1
    assert data["page_size"] == 20
    assert data["total_pages"] == 250

    item = data["items"][0]
    assert "asset_tag" in item
    assert "model" in item
    assert "device_type" in item
    assert "site_name" in item


def test_devices_search(client, viewer_headers):
    """Search query filters across asset_tag, model, vendor, or serial."""
    response = client.get("/api/v1/devices?search=router", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        # Verify that router appears in type, model, vendor, or tag
        combined = f"{item['device_type']} {item['model']} {item['vendor']} {item['asset_tag']}".lower()
        assert "router" in combined


def test_devices_filter_by_type(client, viewer_headers):
    """Filter by device type returns matching devices."""
    response = client.get("/api/v1/devices?device_type=switch", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert item["device_type"].lower() == "switch"


def test_devices_filter_by_status(client, viewer_headers):
    """Filter by status returns matching devices."""
    response = client.get("/api/v1/devices?status=active", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert item["status"].lower() == "active"


def test_devices_filter_by_site(client, viewer_headers):
    """Filter by site_id returns only devices assigned to that site."""
    response = client.get("/api/v1/devices?site_id=1", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert item["site_id"] == 1


def test_device_detail_success(client, viewer_headers):
    """GET /api/v1/devices/{id} returns full device details with service events."""
    response = client.get("/api/v1/devices/1", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert "asset_tag" in data
    assert "site_name" in data
    assert "recent_events" in data
    assert isinstance(data["recent_events"], list)


def test_device_detail_not_found(client, viewer_headers):
    """Nonexistent device ID returns 404."""
    response = client.get("/api/v1/devices/999999", headers=viewer_headers)
    assert response.status_code == 404


def test_sites_listing(client, viewer_headers):
    """GET /api/v1/sites returns all sites and device counts."""
    response = client.get("/api/v1/sites", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 50
    assert len(data["items"]) == 50
    first_site = data["items"][0]
    assert "site_code" in first_site
    assert "region" in first_site
    assert first_site["device_count"] is not None


def test_devices_filter_by_open_incidents(client, viewer_headers):
    """Filter by has_open_incidents returns only devices with active incidents."""
    response = client.get("/api/v1/devices?has_open_incidents=true", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert len(data["items"]) > 0


def test_devices_filter_by_needs_data_fix(client, viewer_headers):
    """Filter by needs_data_fix returns devices with firmware or date glitches."""
    response = client.get("/api/v1/devices?needs_data_fix=true", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert len(data["items"]) > 0


def test_device_detail_workspace_isolation(client, db_session):
    """Non-demo workspace user without active connected database cannot access sandbox device details (404)."""
    from app.models.user import User

    test_email = "isolated_user@isolated-corp.com"
    db_session.query(User).filter(User.email == test_email).delete()
    db_session.commit()

    reg_payload = {
        "full_name": "Isolated Analyst",
        "email": test_email,
        "password": "IsolatedPass123!",
        "workspace_name": "Isolated Corp",
        "role": "analyst",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Calling device detail for device 1 must return 404
    detail_res = client.get("/api/v1/devices/1", headers=headers)
    assert detail_res.status_code == 404

    # Calling devices list must return 0 items
    list_res = client.get("/api/v1/devices", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 0

    # Clean up
    db_session.query(User).filter(User.email == test_email).delete()
    db_session.commit()


