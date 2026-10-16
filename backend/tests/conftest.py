import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.core.auth import create_access_token


@pytest.fixture(scope="function")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _get_token_for_user(db_session, email: str) -> str:
    user = db_session.query(User).filter(User.email == email).first()
    if not user:
        raise ValueError(f"Seed user {email} not found. Run seed script.")
    return create_access_token(user_id=str(user.id), role=user.role)


@pytest.fixture(scope="function")
def admin_headers(db_session):
    token = _get_token_for_user(db_session, "admin@querytrust.local")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def analyst_headers(db_session):
    token = _get_token_for_user(db_session, "analyst@querytrust.local")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def viewer_headers(db_session):
    token = _get_token_for_user(db_session, "viewer@querytrust.local")
    return {"Authorization": f"Bearer {token}"}
