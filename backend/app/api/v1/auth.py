from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import get_settings, Settings
from app.database import get_db
from app.models.user import User
from app.models.access_request import AccessRequest
from app.core.security import verify_password
from app.core.auth import create_access_token, get_current_user
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    UserMeResponse,
    UserPublic,
    AccessRequestCreate,
    AccessRequestPublic,
)

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

    if not user:
        # Check if an access request is pending administrator review
        pending = (
            db.query(AccessRequest)
            .filter(func.lower(AccessRequest.email) == clean_email, AccessRequest.status == "pending")
            .first()
        )
        if pending:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access request for {clean_email} is pending administrator review. You will be able to sign in once approved in People & access.",
            )

        rejected = (
            db.query(AccessRequest)
            .filter(func.lower(AccessRequest.email) == clean_email, AccessRequest.status == "rejected")
            .first()
        )
        if rejected:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access request for {clean_email} was declined by workspace administrators.",
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(request.password, user.password_hash):
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


@router.post("/request-access", response_model=AccessRequestPublic, status_code=status.HTTP_201_CREATED)
def request_access(
    payload: AccessRequestCreate,
    db: Session = Depends(get_db),
):
    """Submit a prospective user access request for workspace administrator review.

    Stores the request in the access_requests database table for audit and review.
    """
    clean_email = payload.email.strip().lower()

    # Check if a pending request already exists for this email
    existing = (
        db.query(AccessRequest)
        .filter(func.lower(AccessRequest.email) == clean_email, AccessRequest.status == "pending")
        .first()
    )
    if existing:
        existing.full_name = payload.full_name.strip()
        existing.company = payload.company.strip()
        existing.role_requested = payload.role_requested
        existing.use_case = payload.use_case.strip() if payload.use_case else None
        db.commit()
        db.refresh(existing)
        return AccessRequestPublic(
            id=existing.id,
            full_name=existing.full_name,
            email=existing.email,
            company=existing.company,
            role_requested=existing.role_requested,
            use_case=existing.use_case,
            status=existing.status,
            reviewed_by=existing.reviewed_by,
            reviewed_at=existing.reviewed_at.isoformat() if existing.reviewed_at else None,
            created_at=existing.created_at.isoformat(),
        )

    new_request = AccessRequest(
        full_name=payload.full_name.strip(),
        email=clean_email,
        company=payload.company.strip(),
        role_requested=payload.role_requested,
        use_case=payload.use_case.strip() if payload.use_case else None,
        status="pending",
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return AccessRequestPublic(
        id=new_request.id,
        full_name=new_request.full_name,
        email=new_request.email,
        company=new_request.company,
        role_requested=new_request.role_requested,
        use_case=new_request.use_case,
        status=new_request.status,
        reviewed_by=new_request.reviewed_by,
        reviewed_at=new_request.reviewed_at.isoformat() if new_request.reviewed_at else None,
        created_at=new_request.created_at.isoformat(),
    )

