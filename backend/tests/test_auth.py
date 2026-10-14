from datetime import timedelta
from app.core.auth import create_access_token


def test_login_success_admin(client):
    """Admin user can log in and receives a signed JWT access token."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@querytrust.local", "password": "AdminPass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@querytrust.local"
    assert data["user"]["role"] == "admin"
    assert data["user"]["is_active"] is True
    assert "password_hash" not in data["user"]


def test_login_success_analyst(client):
    """Analyst user can log in successfully."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "analyst@querytrust.local", "password": "AnalystPass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "analyst"


def test_login_success_viewer(client):
    """Viewer user can log in successfully."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "viewer@querytrust.local", "password": "ViewerPass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "viewer"


def test_login_invalid_password(client):
    """Incorrect password returns 401."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@querytrust.local", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_nonexistent_user(client):
    """Nonexistent user returns identical 401 to prevent email enumeration."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@querytrust.local", "password": "AnyPassword123!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_auth_me_endpoint(client, viewer_headers):
    """GET /auth/me returns the authenticated user's profile and system mode."""
    response = client.get("/api/v1/auth/me", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "viewer@querytrust.local"
    assert data["role"] == "viewer"
    assert "environment" in data
    assert "llm_provider" in data


def test_auth_me_missing_token(client):
    """GET /auth/me without authorization header returns 401."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_auth_me_invalid_token(client):
    """GET /auth/me with garbage token returns 401."""
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.payload"})
    assert response.status_code == 401


def test_auth_expired_token(client):
    """Token with negative expiry is rejected with 401."""
    expired_token = create_access_token(
        user_id="00000000-0000-0000-0000-000000000001",
        role="viewer",
        expires_delta=timedelta(seconds=-10),
    )
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401


def test_rbac_admin_routes_forbidden_for_viewer(client, viewer_headers):
    """Viewer cannot access admin routes (403 Forbidden)."""
    response = client.get("/api/v1/admin/users", headers=viewer_headers)
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"]


def test_rbac_admin_routes_forbidden_for_analyst(client, analyst_headers):
    """Analyst cannot access admin routes (403 Forbidden)."""
    response = client.get("/api/v1/admin/users", headers=analyst_headers)
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"]


def test_rbac_admin_routes_allowed_for_admin(client, admin_headers):
    """Admin can access admin routes (200 OK)."""
    response = client.get("/api/v1/admin/users", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3


def test_admin_audit_logs_access(client, admin_headers, viewer_headers):
    """Admin can inspect audit logs; Viewer cannot."""
    admin_resp = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert admin_resp.status_code == 200

    viewer_resp = client.get("/api/v1/admin/audit-logs", headers=viewer_headers)
    assert viewer_resp.status_code == 403
