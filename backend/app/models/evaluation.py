import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    triggered_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    benchmark_name = Column(String(128), nullable=False)
    benchmark_version = Column(String(32), nullable=False)
    provider = Column(String(64), nullable=False)
    mode = Column(String(64), nullable=False)  # baseline, guarded
    status = Column(String(32), nullable=False, default="running", index=True)  # running, completed, failed
    total_cases = Column(Integer, nullable=False, default=0)
    passed_cases = Column(Integer, nullable=False, default=0)
    failed_cases = Column(Integer, nullable=False, default=0)
    category_metrics = Column(JSONB, nullable=True)
    failures_summary = Column(JSONB, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
