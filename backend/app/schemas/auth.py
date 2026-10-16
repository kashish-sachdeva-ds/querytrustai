import uuid
import re
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import StrictRequestModel


class LoginRequest(StrictRequestModel):
    email: str = Field(..., min_length=3, max_length=255, description="User email address")
    password: str = Field(..., min_length=1, max_length=255, description="User password")

    @field_validator("password")
    @classmethod
    def password_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Password must not be blank")
        return value

    @field_validator("email")
    @classmethod
    def email_must_be_well_formed(cls, value: str) -> str:
        normalized = value.lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
            raise ValueError("Email address is invalid")
        return normalized


class UserPublic(BaseModel):
    """Public user representation. Never exposes password_hash."""
    id: uuid.UUID
    email: str
    display_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class UserMeResponse(BaseModel):
    """Response for /auth/me endpoint."""
    id: uuid.UUID
    email: str
    display_name: str
    role: str
    is_active: bool
    environment: str
    llm_provider: str

    class Config:
        from_attributes = True


class UserUpdateRequest(StrictRequestModel):
    """Request for admin user role / status updates."""
    role: Optional[Literal["admin", "analyst", "viewer"]] = Field(None, description="Role: admin, analyst, or viewer")
    is_active: Optional[bool] = Field(None, description="Active status flag")
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
