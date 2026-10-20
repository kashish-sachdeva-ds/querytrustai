import pytest
from app.models.user import User
from app.models.data_source import DataSource


def test_get_active_data_source_defaults_to_sandbox(client, analyst_headers):
    """By default, a workspace operates on the demo networking sandbox."""
    resp = client.get("/api/v1/data-sources/active", headers=analyst_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode"] == "sandbox"
    assert "Synthetic Networking Sandbox" in data["name"]
    assert "devices" in data["tables"]
    assert "sites" in data["tables"]


def test_data_sources_rbac(client, viewer_headers, analyst_headers, admin_headers):
    """Viewers cannot list or manage data sources (403); Analysts can view; Admins can manage."""
    # Viewer listing
    viewer_resp = client.get("/api/v1/data-sources", headers=viewer_headers)
    assert viewer_resp.status_code == 403

    # Analyst listing
    analyst_resp = client.get("/api/v1/data-sources", headers=analyst_headers)
    assert analyst_resp.status_code == 200
    assert isinstance(analyst_resp.json(), list)

    # Viewer test connection
    test_payload = {
        "db_type": "postgresql",
        "host": "localhost",
        "port": 5432,
        "database_name": "querytrust",
        "username": "fake_user",
        "password": "wrong_password",
        "ssl_mode": "disable",
    }
    viewer_test = client.post("/api/v1/data-sources/test", json=test_payload, headers=viewer_headers)
    assert viewer_test.status_code == 403

    # Analyst test connection
    analyst_test = client.post("/api/v1/data-sources/test", json=test_payload, headers=analyst_headers)
    assert analyst_test.status_code == 403


def test_test_connection_invalid_credentials_returns_sanitized_error(client, admin_headers):
    """Admin tests unreachable or invalid connection, receives sanitized error without credential leak."""
    test_payload = {
        "db_type": "postgresql",
        "host": "localhost",
        "port": 5432,
        "database_name": "non_existent_db_xyz",
        "username": "fake_user_123",
        "password": "SuperSecretPassword123!",
        "ssl_mode": "disable",
    }
    resp = client.post("/api/v1/data-sources/test", json=test_payload, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert data["error_message"] is not None
    # Password must NEVER appear in the error message
    assert "SuperSecretPassword123!" not in data["error_message"]


def test_create_and_manage_data_source_lifecycle(client, admin_headers, db_session):
    """Admin connects to local database, introspects schema, activates, and switches back to sandbox."""
    # Create data source pointing to local test database
    create_payload = {
        "name": "Local Production Replica",
        "db_type": "postgresql",
        "host": "localhost",
        "port": 5432,
        "database_name": "querytrust",
        "username": "app_user",
        "password": "querytrust_app_dev",
        "ssl_mode": "disable",
        "set_as_active": True,
    }

    create_resp = client.post("/api/v1/data-sources", json=create_payload, headers=admin_headers)
    assert create_resp.status_code == 201
    source_data = create_resp.json()
    source_id = source_data["id"]
    assert source_data["name"] == "Local Production Replica"
    assert source_data["status"] == "connected"
    assert source_data["table_count"] >= 3
    assert "devices" in source_data["tables"]

    # Active source should now be connected
    active_resp = client.get("/api/v1/data-sources/active", headers=admin_headers)
    assert active_resp.status_code == 200
    assert active_resp.json()["mode"] == "connected"
    assert active_resp.json()["source_id"] == source_id

    # Switch back to sandbox demo
    sandbox_resp = client.post("/api/v1/data-sources/activate-sandbox", headers=admin_headers)
    assert sandbox_resp.status_code == 200
    assert sandbox_resp.json()["mode"] == "sandbox"

    # Re-activate custom source
    reactivate_resp = client.post(f"/api/v1/data-sources/{source_id}/activate", headers=admin_headers)
    assert reactivate_resp.status_code == 200
    assert reactivate_resp.json()["mode"] == "connected"

    # Sync schema
    sync_resp = client.post(f"/api/v1/data-sources/{source_id}/sync", headers=admin_headers)
    assert sync_resp.status_code == 200
    assert sync_resp.json()["status"] == "connected"

    # Delete data source
    del_resp = client.delete(f"/api/v1/data-sources/{source_id}", headers=admin_headers)
    assert del_resp.status_code == 204

    # Active source reverts to sandbox
    revert_resp = client.get("/api/v1/data-sources/active", headers=admin_headers)
    assert revert_resp.status_code == 200
    assert revert_resp.json()["mode"] == "sandbox"


def test_data_sources_workspace_isolation(client, db_session):
    """Data sources belonging to Workspace A cannot be viewed or manipulated by Workspace B."""
    from app.models.user import User

    # Clean up test users
    for email in ["admin_alpha@corp-a.com", "admin_beta@corp-b.com"]:
        db_session.query(User).filter(User.email == email).delete()
    db_session.commit()

    # Register Admin A
    resp_a = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Admin Alpha",
            "email": "admin_alpha@corp-a.com",
            "password": "PasswordA123!",
            "workspace_name": "Corp Alpha",
            "role": "admin",
        },
    )
    headers_a = {"Authorization": f"Bearer {resp_a.json()['access_token']}"}

    # Register Admin B
    resp_b = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Admin Beta",
            "email": "admin_beta@corp-b.com",
            "password": "PasswordB123!",
            "workspace_name": "Corp Beta",
            "role": "admin",
        },
    )
    headers_b = {"Authorization": f"Bearer {resp_b.json()['access_token']}"}

    # Admin A creates a data source
    ds_resp = client.post(
        "/api/v1/data-sources",
        json={
            "name": "Alpha Private DB",
            "db_type": "postgresql",
            "host": "localhost",
            "port": 5432,
            "database_name": "querytrust",
            "username": "app_user",
            "password": "querytrust_app_dev",
            "ssl_mode": "disable",
            "set_as_active": True,
        },
        headers=headers_a,
    )
    assert ds_resp.status_code == 201
    source_id = ds_resp.json()["id"]

    # Admin B lists data sources: must NOT see Alpha's data source
    list_b = client.get("/api/v1/data-sources", headers=headers_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

    # Admin B attempts to activate Alpha's data source: 404 Not Found
    hack_resp = client.post(f"/api/v1/data-sources/{source_id}/activate", headers=headers_b)
    assert hack_resp.status_code == 404

    # Clean up
    client.delete(f"/api/v1/data-sources/{source_id}", headers=headers_a)
    for email in ["admin_alpha@corp-a.com", "admin_beta@corp-b.com"]:
        db_session.query(User).filter(User.email == email).delete()
    db_session.commit()


def test_data_source_ssrf_blocked_cloud_metadata(client, admin_headers):
    """Attempting to target AWS/GCP cloud metadata endpoints must be rejected."""
    test_payload = {
        "db_type": "postgresql",
        "host": "169.254.169.254",
        "port": 5432,
        "database_name": "metadata",
        "username": "root",
        "password": "password",
        "ssl_mode": "disable",
    }
    resp = client.post("/api/v1/data-sources/test", json=test_payload, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert "prohibited cloud metadata endpoint" in data["error_message"].lower() or "ssrf" in data["error_message"].lower()

    # Also test create endpoint
    create_payload = {
        "name": "Malicious Metadata",
        "db_type": "postgresql",
        "host": "169.254.169.254",
        "port": 5432,
        "database_name": "metadata",
        "username": "root",
        "password": "password",
        "ssl_mode": "disable",
    }
    create_resp = client.post("/api/v1/data-sources", json=create_payload, headers=admin_headers)
    assert create_resp.status_code == 400
    assert "prohibited" in create_resp.json()["detail"].lower() or "ssrf" in create_resp.json()["detail"].lower()


def test_credential_encryption_versioning_and_rotation(monkeypatch):
    """Encrypted credentials include v1: version header and support rotation fallbacks."""
    from app.services.data_source_service import encrypt_secret, decrypt_secret
    from app.config import get_settings

    # 1. New ciphertext is prefixed with v1:
    encrypted = encrypt_secret("DatabaseSecret123!")
    assert encrypted.startswith("v1:")

    # 2. Can be decrypted back cleanly
    decrypted = decrypt_secret(encrypted)
    assert decrypted == "DatabaseSecret123!"

    # 3. Key rotation scenario: simulate primary key rotating while keeping old key in fallbacks
    settings = get_settings()
    current_key = settings.DATA_SOURCE_ENCRYPTION_KEY or settings.SECRET_KEY

    # Rotate primary key to a new random secret, placing current_key into fallbacks
    monkeypatch.setattr(settings, "DATA_SOURCE_ENCRYPTION_KEY", "brand-new-rotated-key-2027")
    monkeypatch.setattr(settings, "DATA_SOURCE_KEY_ROTATION_FALLBACKS", current_key)

    # Previously encrypted token still decrypts successfully via rotation fallback!
    decrypted_after_rotation = decrypt_secret(encrypted)
    assert decrypted_after_rotation == "DatabaseSecret123!"


