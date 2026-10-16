from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import get_settings, Settings
from app.database import get_db
from app.models.user import User
from app.core.security import verify_password
from app.core.auth import create_access_token, get_current_user
from app.schemas.auth import LoginRequest, LoginResponse, UserMeResponse, UserPublic

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Authenticate with email and password, issuing a signed JWT access token.

    Note: Error messages do not distinguish between invalid email vs password
    to prevent user enumeration.
    """
    clean_email = request.email.strip().lower()
    user = (
        db.query(User)
        .filter(func.lower(User.email) == clean_email)
        .first()
    )

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    access_token = create_access_token(
        user_id=str(user.id),
        role=user.role,
        settings=settings,
    )

    # Browser auth is cookie-based. The access token remains in the response
    # for documented non-browser API clients, but the shipped frontend never
    # persists or reads it from Web Storage.
    response.set_cookie(
        key="querytrust_access_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/api/v1",
    )
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserPublic.model_validate(user),
    )


@router.get("/me", response_model=UserMeResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Return the profile and role of the currently authenticated user."""
    return UserMeResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        role=current_user.role,
        is_active=current_user.is_active,
        environment=settings.ENVIRONMENT,
        llm_provider=settings.LLM_PROVIDER,
    )


@router.post("/logout")
def logout(response: Response):
    """Client-side token disposal endpoint."""
    response.delete_cookie(key="querytrust_access_token", path="/api/v1", samesite="strict")
    return {"message": "Logged out successfully"}
