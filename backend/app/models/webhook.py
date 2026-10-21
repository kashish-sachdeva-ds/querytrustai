import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class WebhookConfig(Base):
    __tablename__ = "webhook_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_name = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False, default="Default Alert Webhook")
    url = Column(Text, nullable=False)
    platform = Column(String(32), nullable=False, default="discord")  # discord, slack, generic
    secret_token = Column(String(255), nullable=True)  # HMAC-SHA256 signature key
    is_active = Column(Boolean, nullable=False, default=True)
    notify_on_anomaly = Column(Boolean, nullable=False, default=True)
    notify_on_data_quality = Column(Boolean, nullable=False, default=True)
    last_dispatched_at = Column(DateTime(timezone=True), nullable=True)
    last_status_code = Column(String(16), nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
