import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255, description="User email address")
    password: str = Field(..., min_length=1, max_length=255, description="User password")


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


class UserUpdateRequest(BaseModel):
    """Request for admin user role / status updates."""
    role: Optional[str] = Field(None, pattern="^(admin|analyst|viewer)$", description="Role: admin, analyst, or viewer")
    is_active: Optional[bool] = Field(None, description="Active status flag")
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
