import uuid
from app.core.security import verify_password
from app.models.user import User


def test_submit_access_request_success(client):
    """Prospective user can submit access request without auth."""
    res = client.post(
        "/api/v1/auth/request-access",
        json={
            "full_name": "Marcus Vance",
            "email": "marcus.vance@datacenter.net",
            "company": "Vance Infrastructure Group",
            "role_requested": "analyst",
            "use_case": "Monitoring optical fiber switch telemetry",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["full_name"] == "Marcus Vance"
    assert data["email"] == "marcus.vance@datacenter.net"
    assert data["role_requested"] == "analyst"
    assert data["status"] == "pending"
    assert "id" in data


def test_submit_access_request_validation(client):
    """Invalid email is rejected with 422."""
    res = client.post(
        "/api/v1/auth/request-access",
        json={
            "full_name": "Test User",
            "email": "not-an-email",
            "company": "Acme Corp",
            "role_requested": "viewer",
        },
    )
    assert res.status_code == 422


def test_admin_can_list_access_requests(client, admin_headers, analyst_headers):
    """Admin can list access requests; analyst is forbidden."""
    # Create request
    client.post(
        "/api/v1/auth/request-access",
        json={
            "full_name": "Sarah Connor",
            "email": "sarah@cyberdyne.org",
            "company": "Cyberdyne Systems",
            "role_requested": "viewer",
        },
    )

    # Analyst forbidden (HTTP 403)
    res_analyst = client.get(
        "/api/v1/admin/access-requests",
        headers=analyst_headers,
    )
    assert res_analyst.status_code == 403

    # Admin allowed (HTTP 200)
    res_admin = client.get(
        "/api/v1/admin/access-requests",
        headers=admin_headers,
    )
    assert res_admin.status_code == 200
    items = res_admin.json()
    assert len(items) >= 1
    found = any(i["email"] == "sarah@cyberdyne.org" for i in items)
    assert found


def test_admin_can_approve_access_request_and_provisions_user(client, admin_headers, db_session):
    """Approving access request provisions user account with salted bcrypt hash."""
    email = f"approve.test.{uuid.uuid4().hex[:6]}@enterprise.net"
    res = client.post(
        "/api/v1/auth/request-access",
        json={
            "full_name": "Approved User",
            "email": email,
            "company": "Enterprise Tech",
            "role_requested": "analyst",
        },
    )
    assert res.status_code == 201
    req_id = res.json()["id"]

    # Admin approves
    approve_res = client.patch(
        f"/api/v1/admin/access-requests/{req_id}",
        json={"status": "approved"},
        headers=admin_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"
    assert approve_res.json()["reviewed_by"] == "admin@querytrust.local"

    # Verify user was created in database with bcrypt hashed password
    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    assert user.display_name == "Approved User"
    assert user.role == "analyst"
    assert user.is_active is True
    assert user.password_hash.startswith("$2b$") or user.password_hash.startswith("$2a$")
    assert verify_password("WelcomePass123!", user.password_hash) is True


def test_admin_can_reject_access_request(client, admin_headers):
    """Admin can reject access request."""
    email = f"reject.test.{uuid.uuid4().hex[:6]}@fake.com"
    res = client.post(
        "/api/v1/auth/request-access",
        json={
            "full_name": "Spam User",
            "email": email,
            "company": "Spam Corp",
            "role_requested": "viewer",
        },
    )
    assert res.status_code == 201
    req_id = res.json()["id"]

    reject_res = client.patch(
        f"/api/v1/admin/access-requests/{req_id}",
        json={"status": "rejected"},
        headers=admin_headers,
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "rejected"
