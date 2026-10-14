import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class MLModelVersion(Base):
    __tablename__ = "ml_model_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_name = Column(String(128), nullable=False, index=True)
    version = Column(String(32), nullable=False)
    algorithm = Column(String(64), nullable=False)
    feature_list = Column(JSONB, nullable=False)
    dataset_identifier = Column(String(128), nullable=False)
    metrics = Column(JSONB, nullable=True)
    model_artifact_path = Column(String(255), nullable=True)
    fit_time = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, nullable=False, default=True)
