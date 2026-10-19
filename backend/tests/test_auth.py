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


def test_admin_workspace_isolation(client, db_session):
    """A company admin only sees users within their company workspace, not demo or other tenant accounts."""
    from app.models.user import User
    admin_email = "boss@acme-networks.com"
    # Clean up any stale
    db_session.query(User).filter(User.email == admin_email).delete()
    db_session.commit()

    reg_payload = {
        "full_name": "Acme Admin",
        "email": admin_email,
        "password": "SuperSecretPass123!",
        "workspace_name": "Acme Networks",
        "role": "admin",
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201
    token = reg_resp.json()["access_token"]
    acme_headers = {"Authorization": f"Bearer {token}"}

    # Query admin users
    users_resp = client.get("/api/v1/admin/users", headers=acme_headers)
    assert users_resp.status_code == 200
    tenant_users = users_resp.json()

    # Must contain ONLY the Acme Admin, NOT demo users
    assert len(tenant_users) == 1
    assert tenant_users[0]["email"] == admin_email
    assert tenant_users[0]["workspace_name"] == "Acme Networks"

    # Clean up
    db_session.query(User).filter(User.email == admin_email).delete()
    db_session.commit()


def test_claim_provisioned_access_request_account(client, db_session):
    """A user provisioned with temporary WelcomePass123! can claim their account via Create Workspace."""
    from app.models.user import User
    from app.core.security import get_password_hash, verify_password

    claimed_email = "provisioned_user@acme-enterprises.com"
    db_session.query(User).filter(User.email == claimed_email).delete()
    db_session.commit()

    # Pre-provision with WelcomePass123!
    provisioned = User(
        email=claimed_email,
        display_name="Prospect User",
        password_hash=get_password_hash("WelcomePass123!"),
        role="viewer",
        workspace_name="Default Workspace",
        is_active=True,
    )
    db_session.add(provisioned)
    db_session.commit()

    # 1. Logging in with wrong password should return informative prompt about WelcomePass123!
    wrong_login = client.post("/api/v1/auth/login", json={"email": claimed_email, "password": "MyCustomPass99!"})
    assert wrong_login.status_code == 401
    assert "WelcomePass123!" in wrong_login.json()["detail"]

    # 2. Registering via Create Workspace should CLAIM the account, update password, workspace, and role
    claim_payload = {
        "full_name": "Kashish Sachdeva",
        "email": claimed_email,
        "password": "MyCustomPass99!",
        "workspace_name": "Kashish private limited",
        "role": "admin",
    }
    claim_resp = client.post("/api/v1/auth/register", json=claim_payload)
    assert claim_resp.status_code == 201
    data = claim_resp.json()
    assert data["user"]["email"] == claimed_email
    assert data["user"]["display_name"] == "Kashish Sachdeva"
    assert data["user"]["workspace_name"] == "Kashish private limited"
    assert data["user"]["role"] == "admin"

    # Verify password hash updated in DB
    updated = db_session.query(User).filter(User.email == claimed_email).first()
    assert verify_password("MyCustomPass99!", updated.password_hash) is True
    assert verify_password("WelcomePass123!", updated.password_hash) is False

    # 3. Subsequent registration now fails with duplicate error
    dup_resp = client.post("/api/v1/auth/register", json=claim_payload)
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"]

    # 4. Logging in with the newly claimed password succeeds
    good_login = client.post("/api/v1/auth/login", json={"email": claimed_email, "password": "MyCustomPass99!"})
    assert good_login.status_code == 200
    assert good_login.json()["user"]["workspace_name"] == "Kashish private limited"

    # Clean up
    db_session.query(User).filter(User.email == claimed_email).delete()
    db_session.commit()


def test_join_workspace_flow(client, db_session):
    """Employees can join an existing company workspace as analyst or viewer."""
    from app.models.user import User

    company = "Acme Global Dynamics"
    admin_email = "lead_admin@acmeglobal.com"
    employee_email = "employee_rohan@acmeglobal.com"

    db_session.query(User).filter(User.email.in_([admin_email, employee_email])).delete()
    db_session.commit()

    # 1. Nonexistent workspace returns 404
    non_existent = client.post(
        "/api/v1/auth/join-workspace",
        json={
            "workspace_name": "NonExistentCompanyXYZ",
            "full_name": "Rohan Kumar",
            "email": employee_email,
            "password": "RohanPass123!",
            "role": "analyst",
        },
    )
    assert non_existent.status_code == 404
    assert "does not exist yet" in non_existent.json()["detail"]

    # 2. Workspace admin creates workspace
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Acme Admin Lead",
            "email": admin_email,
            "password": "AdminPass123!",
            "workspace_name": company,
            "role": "admin",
        },
    )
    assert reg_res.status_code == 201

    # 3. Employee joins the existing workspace
    join_res = client.post(
        "/api/v1/auth/join-workspace",
        json={
            "workspace_name": company,
            "full_name": "Rohan Kumar",
            "email": employee_email,
            "password": "RohanPass123!",
            "role": "analyst",
        },
    )
    assert join_res.status_code == 201
    join_data = join_res.json()
    assert join_data["user"]["email"] == employee_email
    assert join_data["user"]["display_name"] == "Rohan Kumar"
    assert join_data["user"]["workspace_name"] == company
    assert join_data["user"]["role"] == "analyst"

    # Clean up
    db_session.query(User).filter(User.email.in_([admin_email, employee_email])).delete()
    db_session.commit()


def test_admin_invite_team_member(client, db_session):
    """Admin can invite a team member via /api/v1/admin/invite and member can claim their account."""
    from app.models.user import User

    company = "Stark Analytics Labs"
    admin_email = "tony@starklabs.com"
    invited_email = "peter@starklabs.com"

    db_session.query(User).filter(User.email.in_([admin_email, invited_email])).delete()
    db_session.commit()

    # Create admin workspace
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Tony Stark",
            "email": admin_email,
            "password": "StarkPass123!",
            "workspace_name": company,
            "role": "admin",
        },
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Invite team member
    invite_res = client.post(
        "/api/v1/admin/invite",
        headers=headers,
        json={
            "full_name": "Peter Parker",
            "email": invited_email,
            "role": "analyst",
        },
    )
    assert invite_res.status_code == 201
    invited_data = invite_res.json()
    assert invited_data["email"] == invited_email
    assert invited_data["workspace_name"] == company
    assert invited_data["role"] == "analyst"

    # Member joins / claims using /join-workspace with custom password
    join_res = client.post(
        "/api/v1/auth/join-workspace",
        json={
            "workspace_name": company,
            "full_name": "Peter Parker",
            "email": invited_email,
            "password": "WebShooter123!",
            "role": "analyst",
        },
    )
    assert join_res.status_code == 201
    assert join_res.json()["user"]["workspace_name"] == company

    # Clean up
    db_session.query(User).filter(User.email.in_([admin_email, invited_email])).delete()
    db_session.commit()



