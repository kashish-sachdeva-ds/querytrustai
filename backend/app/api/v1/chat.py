"""
Chat sessions and messages API endpoints.

Implements:
- POST /api/v1/chat/sessions: Creates a new user conversation session.
- GET /api/v1/chat/sessions: Lists sessions owned by the current user.
- GET /api/v1/chat/sessions/{id}/messages: Retrieves message history for an authorized session.
- DELETE /api/v1/chat/sessions/{id}: Deletes a conversation session and cascades messages.
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import ChatSessionCreate, ChatSessionSummary, ChatMessageResponse

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/sessions", response_model=ChatSessionSummary, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: ChatSessionCreate,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=16, max_length=64),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new conversation session for the current user."""
    existing = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id, ChatSession.request_key == idempotency_key)
        .first()
    )
    if existing:
        return ChatSessionSummary(
            id=existing.id,
            title=existing.title,
            created_at=existing.created_at,
            updated_at=existing.updated_at,
            message_count=len(existing.messages),
        )

    session = ChatSession(
        user_id=current_user.id,
        title=payload.title or "New Conversation",
        request_key=idempotency_key,
    )
    db.add(session)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        session = (
            db.query(ChatSession)
            .filter(ChatSession.user_id == current_user.id, ChatSession.request_key == idempotency_key)
            .first()
        )
        if not session:
            raise exc
    db.refresh(session)

    return ChatSessionSummary(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0,
    )


@router.get("/sessions", response_model=List[ChatSessionSummary])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists all conversation sessions owned by the current authenticated user."""
    # Subquery for message counts
    msg_counts = (
        db.query(ChatMessage.session_id, func.count(ChatMessage.id).label("count"))
        .group_by(ChatMessage.session_id)
        .subquery()
    )

    query = (
        db.query(
            ChatSession.id,
            ChatSession.title,
            ChatSession.created_at,
            ChatSession.updated_at,
            func.coalesce(msg_counts.c.count, 0).label("message_count"),
        )
        .outerjoin(msg_counts, ChatSession.id == msg_counts.c.session_id)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )

    results = query.all()
    return [
        ChatSessionSummary(
            id=r.id,
            title=r.title,
            created_at=r.created_at,
            updated_at=r.updated_at,
            message_count=r.message_count,
        )
        for r in results
    ]


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all messages for a specific session.

    Enforces ownership isolation for every role. Administrators audit query
    metadata through the dedicated audit route, not private conversations.
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{session_id}' not found.",
        )

    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this chat session.",
        )

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return messages


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes a chat session and all cascading messages."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{session_id}' not found.",
        )

    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this chat session.",
        )

    db.delete(session)
    db.commit()
    return None
