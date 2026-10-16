import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import StrictRequestModel


class ChatSessionCreate(StrictRequestModel):
    title: Optional[str] = Field("New Conversation", min_length=1, max_length=255)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not value:
            raise ValueError("Title must not be blank")
        return value


class ChatSessionSummary(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageCreate(StrictRequestModel):
    content: str = Field(..., min_length=1)
    role: str = Field("user", pattern="^(user|assistant|system)$")
    metadata_json: Optional[Dict[str, Any]] = None
