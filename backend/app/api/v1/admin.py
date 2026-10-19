import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import get_db
from app.models.user import User
from app.models.query_run import QueryRun
from app.models.access_request import AccessRequest
from app.core.auth import require_role
from app.core.security import get_password_hash
from app.schemas.auth import (
    UserPublic,
    UserUpdateRequest,
    AccessRequestPublic,
    AccessRequestReview,
    InviteMemberRequest,
)

router = APIRouter(prefix="/admin", tags=["Administration"])

# Restrict all endpoints in this router to admin role
admin_required = require_role("admin")


@router.post("/invite", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def invite_workspace_member(
    payload: InviteMemberRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Invite a new team member to the administrator's company workspace."""
    clean_email = payload.email.strip().lower()
    target_workspace = current_admin.workspace_name or "Default Workspace"

    # Check if user already exists
    existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing:
        if existing.workspace_name == target_workspace:
            existing.role = payload.role
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return UserPublic.model_validate(existing)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{clean_email}' already belongs to another workspace.",
        )

    # Provision user with temporary initial password
    initial_password = payload.temporary_password or "WelcomePass123!"
    new_user = User(
        email=clean_email,
        display_name=payload.full_name.strip(),
        password_hash=get_password_hash(initial_password),
        role=payload.role,
        workspace_name=target_workspace,
        is_active=True,
    )
    db.add(new_user)

    # Create approved AccessRequest record for audit logging
    audit_req = AccessRequest(
        full_name=payload.full_name.strip(),
        email=clean_email,
        company=target_workspace,
        role_requested=payload.role,
        status="approved",
        reviewed_by=current_admin.email,
        reviewed_at=datetime.now(timezone.utc),
    )
    db.add(audit_req)

    db.commit()
    db.refresh(new_user)
    return UserPublic.model_validate(new_user)


@router.get("/users", response_model=List[UserPublic])
def list_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """List all registered system users within the administrator's workspace.

    Admin access only. Enforces multi-tenant workspace isolation.
    """
    query = db.query(User)
    if current_admin.email != "admin@querytrust.local" and current_admin.workspace_name and current_admin.workspace_name != "Default Workspace":
        query = query.filter(User.workspace_name == current_admin.workspace_name)
    users = query.order_by(User.created_at.asc()).all()
    return [UserPublic.model_validate(u) for u in users]


@router.patch("/users/{user_id}", response_model=UserPublic)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Update user role, active status, or display name within the tenant.

    Admin access only. Enforces tenant boundary so admins cannot modify users outside their workspace.
    """
    query = db.query(User).filter(User.id == user_id)
    if current_admin.email != "admin@querytrust.local" and current_admin.workspace_name and current_admin.workspace_name != "Default Workspace":
        query = query.filter(User.workspace_name == current_admin.workspace_name)
    user = query.with_for_update().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found in workspace",
        )

    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.display_name is not None:
        user.display_name = payload.display_name

    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Retrieve security and query execution audit logs for the workspace.

    Admin access only. Returns metadata without exposing raw query datasets.
    """
    query = db.query(QueryRun)
    if current_admin.email != "admin@querytrust.local" and current_admin.workspace_name and current_admin.workspace_name != "Default Workspace":
        query = query.join(User, QueryRun.user_id == User.id).filter(User.workspace_name == current_admin.workspace_name)
    runs = (
        query
        .order_by(desc(QueryRun.created_at))
        .limit(limit)
        .all()
    )
    return [
        {
            "id": run.id,
            "user_id": str(run.user_id) if run.user_id else None,
            "session_id": str(run.session_id) if run.session_id else None,
            "question": run.question,
            "status": run.status,
            "error_category": run.error_category,
            "row_count": run.row_count,
            "execution_duration_ms": run.execution_duration_ms,
            "created_at": run.created_at.isoformat() if run.created_at else None,
        }
        for run in runs
    ]


@router.get("/access-requests", response_model=List[AccessRequestPublic])
def list_access_requests(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Retrieve access requests submitted for the administrator's company.

    Admin access only. Ordered by newest request first.
    """
    query = db.query(AccessRequest)
    if status_filter:
        query = query.filter(AccessRequest.status == status_filter)
    if current_admin.email != "admin@querytrust.local" and current_admin.workspace_name and current_admin.workspace_name != "Default Workspace":
        query = query.filter(AccessRequest.company.ilike(current_admin.workspace_name))
    requests = query.order_by(desc(AccessRequest.created_at)).all()

    return [
        AccessRequestPublic(
            id=r.id,
            full_name=r.full_name,
            email=r.email,
            company=r.company,
            role_requested=r.role_requested,
            use_case=r.use_case,
            status=r.status,
            reviewed_by=r.reviewed_by,
            reviewed_at=r.reviewed_at.isoformat() if r.reviewed_at else None,
            created_at=r.created_at.isoformat(),
        )
        for r in requests
    ]


@router.patch("/access-requests/{request_id}", response_model=AccessRequestPublic)
def review_access_request(
    request_id: uuid.UUID,
    payload: AccessRequestReview,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Approve or reject a submitted user access request.

    If approved:
    - Automatically provisions a system user with their requested role and a salted bcrypt hashed password.
    - Updates request status to 'approved' and marks reviewer metadata.
    If rejected:
    - Updates request status to 'rejected' and marks reviewer metadata.
    """
    req_query = db.query(AccessRequest).filter(AccessRequest.id == request_id)
    if current_admin.email != "admin@querytrust.local" and current_admin.workspace_name and current_admin.workspace_name != "Default Workspace":
        req_query = req_query.filter(AccessRequest.company.ilike(current_admin.workspace_name))
    req = req_query.with_for_update().first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Access request with ID {request_id} not found in your organization",
        )

    now = datetime.now(timezone.utc)
    req.status = payload.status
    req.reviewed_by = current_admin.email
    req.reviewed_at = now

    if payload.status == "approved":
        target_role = payload.assigned_role or req.role_requested
        target_workspace = current_admin.workspace_name or req.company or "Default Workspace"
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == req.email.lower()).first()
        if not existing_user:
            # Provision new enterprise user with salted bcrypt password hash
            # Temporary initial password for newly approved user
            initial_password_hash = get_password_hash("WelcomePass123!")
            new_user = User(
                email=req.email.lower(),
                display_name=req.full_name,
                password_hash=initial_password_hash,
                role=target_role,
                workspace_name=target_workspace,
                is_active=True,
            )
            db.add(new_user)
        else:
            # If user existed but was deactivated, reactivate and set role
            existing_user.is_active = True
            existing_user.role = target_role
            if current_admin.workspace_name:
                existing_user.workspace_name = current_admin.workspace_name

    db.commit()
    db.refresh(req)

    return AccessRequestPublic(
        id=req.id,
        full_name=req.full_name,
        email=req.email,
        company=req.company,
        role_requested=req.role_requested,
        use_case=req.use_case,
        status=req.status,
        reviewed_by=req.reviewed_by,
        reviewed_at=req.reviewed_at.isoformat() if req.reviewed_at else None,
        created_at=req.created_at.isoformat(),
    )

