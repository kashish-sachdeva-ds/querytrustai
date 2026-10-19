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


def test_login_sets_httponly_cookie_for_browser_session(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "viewer@querytrust.local", "password": "ViewerPass123!"},
    )
    assert response.status_code == 200
    cookie = response.headers["set-cookie"].lower()
    assert "querytrust_access_token=" in cookie
    assert "httponly" in cookie
    assert "samesite=strict" in cookie

    # The TestClient cookie jar simulates a browser navigation without an
    # Authorization header; the protected route must authenticate via cookie.
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "viewer@querytrust.local"


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


def test_login_rejects_invalid_email_and_unknown_fields(client):
    invalid_email = client.post(
        "/api/v1/auth/login",
        json={"email": "not-an-email", "password": "safe-password"},
    )
    assert invalid_email.status_code == 422

    extra_field = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@querytrust.local", "password": "AdminPass123!", "role": "admin"},
    )
    assert extra_field.status_code == 422


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


def test_register_creates_account_with_hashed_password(client, db_session):
    """User can self-register their company workspace, password is stored as bcrypt hash, and session is issued."""
    from app.models.user import User
    test_email = "sarah_test@cyberdyne-net.com"
    # Ensure clean slate
    db_session.query(User).filter(User.email == test_email).delete()
    db_session.commit()

    payload = {
        "full_name": "Sarah Connor",
        "email": test_email,
        "password": "StrongPassword99!",
        "workspace_name": "Cyberdyne Systems",
        "role": "analyst",
    }
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == test_email
    assert data["user"]["display_name"] == "Sarah Connor"
    assert data["user"]["workspace_name"] == "Cyberdyne Systems"
    assert data["user"]["role"] == "analyst"

    # Verify password hash in database starts with bcrypt identifier $2b$
    user = db_session.query(User).filter(User.email == test_email).first()
    assert user is not None
    assert user.password_hash.startswith("$2b$")
    assert user.password_hash != "StrongPassword99!"

    # Verify the user can immediately sign in with their password
    login_resp = client.post("/api/v1/auth/login", json={"email": test_email, "password": "StrongPassword99!"})
    assert login_resp.status_code == 200
    assert login_resp.json()["user"]["workspace_name"] == "Cyberdyne Systems"

    # Duplicate registration should be rejected
    dup_resp = client.post("/api/v1/auth/register", json=payload)
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"]

    # Clean up
    db_session.query(User).filter(User.email == test_email).delete()
    db_session.commit()

