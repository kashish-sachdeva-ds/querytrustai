import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_name = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    db_type = Column(String(64), nullable=False, default="postgresql")
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False, default=5432)
    database_name = Column(String(255), nullable=False)
    username = Column(String(255), nullable=False)
    encrypted_password = Column(Text, nullable=False)
    ssl_mode = Column(String(32), nullable=False, default="prefer")  # disable, prefer, require
    status = Column(String(32), nullable=False, default="connected")  # connected, error, untested
    last_error = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    is_default = Column(Boolean, nullable=False, default=False)
    schema_cache = Column(JSONB, nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
