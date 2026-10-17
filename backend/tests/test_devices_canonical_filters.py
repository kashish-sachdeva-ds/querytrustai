"""Tests for canonical status mapping and data quality shared filters in devices API."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func
from app.models.device import Device
from app.core.data_quality import device_needs_data_fix_filter


def test_device_canonical_status_filter_counts(client: TestClient, viewer_headers: dict):
    """Test that canonical status filters return the exact expected counts matching Home:
    Active: 3,019 (groups 'active', 'ACTIVE', 'Active')
    Offline: 609 (mapped to 'inactive')
    Retired: 648 (mapped to 'decommissioned')
    Maintenance: 657
    """
    # Active (test both titlecase and lowercase)
    res_active = client.get("/api/v1/devices?status=Active&page_size=1", headers=viewer_headers)
    assert res_active.status_code == 200
    assert res_active.json()["total"] == 3019

    res_active_lower = client.get("/api/v1/devices?status=active&page_size=1", headers=viewer_headers)
    assert res_active_lower.status_code == 200
    assert res_active_lower.json()["total"] == 3019

    # Offline (test alias 'Offline', 'offline', and DB status 'inactive')
    res_offline = client.get("/api/v1/devices?status=Offline&page_size=1", headers=viewer_headers)
    assert res_offline.status_code == 200
    assert res_offline.json()["total"] == 609

    res_offline_lower = client.get("/api/v1/devices?status=offline&page_size=1", headers=viewer_headers)
    assert res_offline_lower.status_code == 200
    assert res_offline_lower.json()["total"] == 609

    res_inactive = client.get("/api/v1/devices?status=inactive&page_size=1", headers=viewer_headers)
    assert res_inactive.status_code == 200
    assert res_inactive.json()["total"] == 609

    # Retired (test alias 'Retired', 'retired', and DB status 'decommissioned')
    res_retired = client.get("/api/v1/devices?status=Retired&page_size=1", headers=viewer_headers)
    assert res_retired.status_code == 200
    assert res_retired.json()["total"] == 648

    res_decom = client.get("/api/v1/devices?status=decommissioned&page_size=1", headers=viewer_headers)
    assert res_decom.status_code == 200
    assert res_decom.json()["total"] == 648

    # Maintenance
    res_maint = client.get("/api/v1/devices?status=Maintenance&page_size=1", headers=viewer_headers)
    assert res_maint.status_code == 200
    assert res_maint.json()["total"] == 657

    res_maint_lower = client.get("/api/v1/devices?status=maintenance&page_size=1", headers=viewer_headers)
    assert res_maint_lower.status_code == 200
    assert res_maint_lower.json()["total"] == 657


def test_needs_data_fix_filter_count(client: TestClient, viewer_headers: dict, db_session):
    """Test that needs_data_fix filter returns 746 devices, exactly matching
    the shared device_needs_data_fix_filter() from data_quality.py.
    """
    res = client.get("/api/v1/devices?needs_data_fix=true&page_size=1", headers=viewer_headers)
    assert res.status_code == 200
    total_from_api = res.json()["total"]

    # Verify against shared function directly
    shared_filter_count = db_session.query(func.count(Device.id)).filter(device_needs_data_fix_filter()).scalar()
    assert total_from_api == shared_filter_count
    assert total_from_api == 746


def test_open_incidents_filter_uses_exists(client: TestClient, viewer_headers: dict):
    """Test that open incidents filter correctly partitions the 5,000 devices."""
    res_open = client.get("/api/v1/devices?has_open_incidents=true&page_size=1", headers=viewer_headers)
    assert res_open.status_code == 200
    open_count = res_open.json()["total"]
    assert open_count == 1295

    res_no_open = client.get("/api/v1/devices?has_open_incidents=false&page_size=1", headers=viewer_headers)
    assert res_no_open.status_code == 200
    no_open_count = res_no_open.json()["total"]
    assert no_open_count == 3705

    # Sum of partitioned devices must equal 5,000
    assert open_count + no_open_count == 5000


def test_devices_counts_endpoint(client: TestClient, viewer_headers: dict):
    """Test GET /api/v1/devices/counts returns all expected quick filter counts."""
    res = client.get("/api/v1/devices/counts", headers=viewer_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["total"] == 5000
    assert data["active"] == 3019
    assert data["offline"] == 609
    assert data["maintenance"] == 657
    assert data["retired"] == 648
    assert data["open_incidents"] == 1295
    assert data["needs_data_fix"] == 746
