import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class WebhookConfigCreate(BaseModel):
    name: str = Field("Default Alert Webhook", min_length=2, max_length=100, description="Display name for this webhook")
    url: str = Field(..., min_length=10, max_length=1000, description="Destination webhook URL (Discord, Slack, or HTTPS endpoint)")
    platform: Literal["discord", "slack", "generic"] = Field("discord", description="Webhook payload format")
    secret_token: Optional[str] = Field(None, max_length=255, description="Optional secret key for HMAC-SHA256 signature generation")
    is_active: bool = Field(True, description="Whether alert notifications are active")
    notify_on_anomaly: bool = Field(True, description="Dispatch when IsolationForest flags severe outliers")
    notify_on_data_quality: bool = Field(True, description="Dispatch when data quality diagnostics detect failures")

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        clean = v.strip()
        if not (clean.startswith("http://") or clean.startswith("https://")):
            raise ValueError("Webhook URL must start with http:// or https://")
        return clean


class WebhookConfigUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    url: Optional[str] = Field(None, min_length=10, max_length=1000)
    platform: Optional[Literal["discord", "slack", "generic"]] = None
    secret_token: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    notify_on_anomaly: Optional[bool] = None
    notify_on_data_quality: Optional[bool] = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip()
        if not (clean.startswith("http://") or clean.startswith("https://")):
            raise ValueError("Webhook URL must start with http:// or https://")
        return clean


class WebhookConfigPublic(BaseModel):
    id: uuid.UUID
    workspace_name: str
    name: str
    url: str
    platform: str
    has_secret_token: bool
    is_active: bool
    notify_on_anomaly: bool
    notify_on_data_quality: bool
    last_dispatched_at: Optional[datetime] = None
    last_status_code: Optional[str] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WebhookTestRequest(BaseModel):
    url: Optional[str] = Field(None, description="Optional ad-hoc URL to test before saving")
    platform: Optional[Literal["discord", "slack", "generic"]] = Field("discord")


class WebhookTestResponse(BaseModel):
    success: bool
    status_code: Optional[int] = None
    latency_ms: Optional[float] = None
    message: str
