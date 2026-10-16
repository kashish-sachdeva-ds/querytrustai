import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class DataQualityRun(Base):
    __tablename__ = "data_quality_runs"
    __table_args__ = (
        # A diagnostic run persists findings, so two concurrent runs are not
        # harmless duplicates. PostgreSQL enforces this across web workers.
        Index(
            "uq_data_quality_single_running_run",
            "status",
            unique=True,
            postgresql_where=text("status = 'running'"),
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    triggered_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String(32), nullable=False, default="running", index=True)  # running, completed, failed
    total_findings = Column(Integer, nullable=False, default=0)
    summary_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    findings = relationship("DataQualityFinding", back_populates="run", cascade="all, delete-orphan")


class DataQualityFinding(Base):
    __tablename__ = "data_quality_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("data_quality_runs.id"), nullable=False, index=True)
    table_name = Column(String(64), nullable=False, index=True)
    column_name = Column(String(64), nullable=True)
    rule_name = Column(String(64), nullable=False, index=True)
    severity = Column(String(32), nullable=False, index=True)  # low, medium, high, critical
    affected_rows = Column(Integer, nullable=False, default=0)
    affected_percentage = Column(Float, nullable=False, default=0.0)
    example_identifiers = Column(JSONB, nullable=True)
    suggested_action = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    run = relationship("DataQualityRun", back_populates="findings")
