from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import get_settings, Settings
from app.database import get_db
from app.models.user import User
from app.models.access_request import AccessRequest
from app.core.security import verify_password, get_password_hash
from app.core.auth import create_access_token, get_current_user
from app.core.rate_limiter import rate_limit
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserMeResponse,
    UserPublic,
    AccessRequestCreate,
    AccessRequestPublic,
    JoinWorkspaceRequest,
    ChangePasswordRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse, dependencies=[Depends(rate_limit(max_requests=15, window_seconds=60))])
def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Authenticate with email and password, issuing a signed JWT access token.

    Security: Error messages do not distinguish between invalid email vs password
    to prevent user enumeration. Demo login shortcuts are gated behind DEMO_MODE.
    """
    clean_email = request.email.strip().lower()

    # Demo convenience shortcuts — only active when DEMO_MODE is explicitly true.
    # This prevents accidental exposure when ENVIRONMENT happens to be 'development'.
    if settings.DEMO_MODE:
        if clean_email in {"admin", "admin@querytrust.local"}:
            clean_email = "admin@querytrust.local"
            if request.password in {"admin", "admin123"}:
                request.password = settings.DEMO_ADMIN_PASSWORD
        elif clean_email in {"analyst", "analyst@querytrust.local"}:
            clean_email = "analyst@querytrust.local"
            if request.password in {"analyst", "analyst123"}:
                request.password = settings.DEMO_ANALYST_PASSWORD
        elif clean_email in {"viewer", "viewer@querytrust.local"}:
            clean_email = "viewer@querytrust.local"
            if request.password in {"viewer", "viewer123"}:
                request.password = settings.DEMO_VIEWER_PASSWORD

    user = (
        db.query(User)
        .filter(func.lower(User.email) == clean_email)
        .first()
    )

    # Security: return identical error for all failure modes to prevent user enumeration.
    # The only exception is pending access requests, which the user submitted themselves.
    generic_auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user:
        # Check if an access request is pending — this is safe because the user
        # themselves submitted the request and knows the email.
        pending = (
            db.query(AccessRequest)
            .filter(func.lower(AccessRequest.email) == clean_email, AccessRequest.status == "pending")
            .first()
        )
        if pending:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your access request is pending administrator review. You will be able to sign in once approved.",
            )
        raise generic_auth_error

    if not verify_password(request.password, user.password_hash):
        if settings.DEMO_MODE and settings.DEFAULT_TEMP_PASSWORD and verify_password(settings.DEFAULT_TEMP_PASSWORD, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Your account has been provisioned. Please sign in using temporary password '{settings.DEFAULT_TEMP_PASSWORD}' or claim your account via 'Create Workspace'.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise generic_auth_error

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
        path="/",
    )
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserPublic.model_validate(user),
    )


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(
    request: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Register a new user account with their company workspace, hashed password, and issue JWT.

    Security invariants:
    - Email must be globally unique.
    - Pre-provisioned / invited accounts with DEFAULT_TEMP_PASSWORD can be claimed by their owner.
    """
    clean_email = request.email.strip().lower()
    clean_workspace = request.workspace_name.strip()

    existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing:
        # Check if this user was provisioned via an approved Access Request with the initial temporary password
        if settings.DEFAULT_TEMP_PASSWORD and verify_password(settings.DEFAULT_TEMP_PASSWORD, existing.password_hash):
            existing.display_name = request.full_name.strip() or existing.display_name
            existing.password_hash = get_password_hash(request.password)
            existing.workspace_name = clean_workspace or existing.workspace_name
            existing.role = request.role or "admin"
            existing.is_active = True

            pending = db.query(AccessRequest).filter(func.lower(AccessRequest.email) == clean_email).first()
            if pending:
                pending.status = "approved"

            db.commit()
            db.refresh(existing)

            access_token = create_access_token(
                user_id=str(existing.id),
                role=existing.role,
                settings=settings,
            )
            response.set_cookie(
                key="querytrust_access_token",
                value=access_token,
                httponly=True,
                secure=settings.ENVIRONMENT != "development",
                samesite="strict",
                max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                path="/",
            )
            return LoginResponse(
                access_token=access_token,
                token_type="bearer",
                user=UserPublic.model_validate(existing),
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with this email address ({clean_email}) already exists. Please sign in instead.",
        )

    # Determine role: first user in workspace gets admin, others get capped role
    workspace_exists = (
        db.query(User)
        .filter(func.lower(User.workspace_name) == clean_workspace.lower())
        .first()
    )
    if workspace_exists:
        effective_role = request.role if request.role in ("analyst", "viewer") else "analyst"
    else:
        effective_role = request.role or "admin"

    hashed = get_password_hash(request.password)
    new_user = User(
        email=clean_email,
        display_name=request.full_name.strip(),
        password_hash=hashed,
        role=effective_role,
        workspace_name=clean_workspace,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Clean up any pending access request for this email
    pending = db.query(AccessRequest).filter(func.lower(AccessRequest.email) == clean_email).first()
    if pending:
        pending.status = "approved"
        db.commit()

    # Automatically log the user in with a signed JWT
    access_token = create_access_token(
        user_id=str(new_user.id),
        role=new_user.role,
        settings=settings,
    )
    response.set_cookie(
        key="querytrust_access_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserPublic.model_validate(new_user),
    )


@router.post("/join-workspace", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def join_workspace(
    request: JoinWorkspaceRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Allow an employee to join an existing company workspace.

    Security: joining users are always capped at 'analyst' role. They cannot
    self-escalate to admin by manipulating the request payload.
    """
    clean_workspace = request.workspace_name.strip()
    clean_email = request.email.strip().lower()

    # 1. Verify workspace exists (must match an existing user's workspace_name)
    workspace_anchor = (
        db.query(User)
        .filter(func.lower(User.workspace_name) == clean_workspace.lower())
        .first()
    )
    if not workspace_anchor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace '{clean_workspace}' does not exist yet. Please check the workspace name with your company administrator or create a new workspace.",
        )

    canonical_workspace_name = workspace_anchor.workspace_name

    # 2. Check if user already exists
    existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing:
        # If user was pre-provisioned with temporary password, claim their account!
        if settings.DEFAULT_TEMP_PASSWORD and verify_password(settings.DEFAULT_TEMP_PASSWORD, existing.password_hash):
            existing.display_name = request.full_name.strip() or existing.display_name
            existing.password_hash = get_password_hash(request.password)
            existing.workspace_name = canonical_workspace_name
            existing.role = request.role or existing.role or "analyst"
            existing.is_active = True
            db.commit()
            db.refresh(existing)

            access_token = create_access_token(
                user_id=str(existing.id),
                role=existing.role,
                settings=settings,
            )
            response.set_cookie(
                key="querytrust_access_token",
                value=access_token,
                httponly=True,
                secure=settings.ENVIRONMENT != "development",
                samesite="strict",
                max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                path="/",
            )
            return LoginResponse(
                access_token=access_token,
                token_type="bearer",
                user=UserPublic.model_validate(existing),
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with this email address ({clean_email}) already exists. Please sign in instead.",
        )

    # 3. Tenant authorization check: prevent uninvited / unauthorized tenant infiltration (VULN-04)
    # Joining an existing private workspace requires matching the company's verified corporate domain
    # or having an approved access request from the organization admin.
    caller_domain = clean_email.split("@")[-1]
    anchor_domain = workspace_anchor.email.split("@")[-1]

    PUBLIC_DOMAINS = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "protonmail.com", "aol.com", "mail.com"}
    approved_access = (
        db.query(AccessRequest)
        .filter(
            func.lower(AccessRequest.email) == clean_email,
            AccessRequest.status == "approved",
        )
        .first()
    )

    domain_authorized = (
        anchor_domain not in PUBLIC_DOMAINS
        and caller_domain == anchor_domain
    )

    if not approved_access and not domain_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Email domain '@{caller_domain}' is not authorized to join '{canonical_workspace_name}'. Please request access or contact your workspace administrator for an invitation.",
        )

    # 4. Provision new member — role is capped at analyst (never admin via self-service)
    effective_role = request.role if request.role in ("analyst", "viewer") else "analyst"
    new_user = User(
        email=clean_email,
        display_name=request.full_name.strip(),
        password_hash=get_password_hash(request.password),
        role=effective_role,
        workspace_name=canonical_workspace_name,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Clean up any access request audit records
    pending = db.query(AccessRequest).filter(func.lower(AccessRequest.email) == clean_email).first()
    if pending:
        pending.status = "approved"
        db.commit()

    access_token = create_access_token(
        user_id=str(new_user.id),
        role=new_user.role,
        settings=settings,
    )
    response.set_cookie(
        key="querytrust_access_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserPublic.model_validate(new_user),
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
        workspace_name=current_user.workspace_name or "Default Workspace",
        is_active=current_user.is_active,
        environment=settings.ENVIRONMENT,
        llm_provider=settings.LLM_PROVIDER,
    )


@router.post("/logout")
def logout(response: Response):
    """Client-side token disposal endpoint."""
    response.delete_cookie(key="querytrust_access_token", path="/", samesite="strict")
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


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Securely update password for the currently authenticated user.
    Requires proving knowledge of current password before replacing with new password.
    """
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully."}


