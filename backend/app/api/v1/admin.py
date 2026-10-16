import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User
from app.models.query_run import QueryRun
from app.core.auth import require_role
from app.schemas.auth import UserPublic, UserUpdateRequest

router = APIRouter(prefix="/admin", tags=["Administration"])

# Restrict all endpoints in this router to admin role
admin_required = require_role("admin")


@router.get("/users", response_model=List[UserPublic], dependencies=[Depends(admin_required)])
def list_users(db: Session = Depends(get_db)):
    """List all registered system users with their roles and status.

    Admin access only.
    """
    users = db.query(User).order_by(User.created_at.asc()).all()
    return [UserPublic.model_validate(u) for u in users]


@router.patch("/users/{user_id}", response_model=UserPublic, dependencies=[Depends(admin_required)])
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update user role, active status, or display name.

    Admin access only. Enforces valid role transitions and active status flags.
    """
    user = db.query(User).filter(User.id == user_id).with_for_update().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
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


@router.get("/audit-logs", dependencies=[Depends(admin_required)])
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Retrieve security and query execution audit logs.

    Admin access only. Returns metadata without exposing raw query datasets.
    """
    runs = (
        db.query(QueryRun)
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
