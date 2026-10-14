import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class QueryRun(Base):
    __tablename__ = "query_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    interpreted_question = Column(Text, nullable=True)
    generated_sql = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="previewed", index=True)  # previewed, executed, failed, blocked
    validation_findings = Column(JSONB, nullable=True)
    provider = Column(String(64), nullable=True)
    model = Column(String(64), nullable=True)
    prompt_version = Column(String(32), nullable=True)
    row_count = Column(Integer, nullable=True)
    execution_duration_ms = Column(Float, nullable=True)
    error_category = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    executed_at = Column(DateTime(timezone=True), nullable=True)

    session = relationship("ChatSession", back_populates="query_runs")
    feedback = relationship("QueryFeedback", back_populates="query_run", uselist=False, cascade="all, delete-orphan")


class QueryFeedback(Base):
    __tablename__ = "query_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_run_id = Column(UUID(as_uuid=True), ForeignKey("query_runs.id"), nullable=False, unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    is_helpful = Column(Boolean, nullable=False)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    query_run = relationship("QueryRun", back_populates="feedback")
