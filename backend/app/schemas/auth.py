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
 
 
class RegisterRequest(StrictRequestModel):
    full_name: str = Field(..., min_length=2, max_length=255, description="User full name")
    email: str = Field(..., min_length=3, max_length=255, description="Work email address")
    password: str = Field(..., min_length=6, max_length=255, description="Password (min 6 characters)")
    workspace_name: str = Field(..., min_length=2, max_length=255, description="Company or workspace name")
    role: Optional[Literal["admin", "analyst", "viewer"]] = Field("admin", description="Desired initial role (defaults to admin for workspace creators)")

    @field_validator("email")
    @classmethod
    def email_must_be_well_formed(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
            raise ValueError("Email address is invalid")
        return normalized

    @field_validator("password")
    @classmethod
    def password_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Password must not be blank")
        return value


class UserPublic(BaseModel):
    """Public user representation. Never exposes password_hash."""
    id: uuid.UUID
    email: str
    display_name: str
    role: str
    workspace_name: Optional[str] = "Default Workspace"
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
    workspace_name: Optional[str] = "Default Workspace"
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


class AccessRequestCreate(StrictRequestModel):
    """Payload submitted when a user requests access."""
    full_name: str = Field(..., min_length=2, max_length=255, description="Requester's full name")
    email: str = Field(..., min_length=3, max_length=255, description="Requester's work email")
    company: str = Field(..., min_length=1, max_length=255, description="Organization or company name")
    role_requested: Literal["analyst", "viewer"] = Field("viewer", description="Requested access role (analyst or viewer)")
    use_case: Optional[str] = Field(None, max_length=1000, description="Brief justification or primary use case")

    @field_validator("email")
    @classmethod
    def email_must_be_well_formed(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
            raise ValueError("Email address is invalid")
        return normalized


class AccessRequestPublic(BaseModel):
    """Public representation of an access request."""
    id: uuid.UUID
    full_name: str
    email: str
    company: str
    role_requested: str
    use_case: Optional[str] = None
    status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class AccessRequestReview(StrictRequestModel):
    """Admin review payload for an access request."""
    status: Literal["approved", "rejected"] = Field(..., description="Decision status: approved or rejected")
    assigned_role: Optional[Literal["admin", "analyst", "viewer"]] = Field(None, description="Role assigned by workspace admin upon approval")


class JoinWorkspaceRequest(StrictRequestModel):
    """Payload when an employee registers to join an existing company workspace."""
    workspace_name: str = Field(..., min_length=2, max_length=255, description="Company or workspace name to join")
    full_name: str = Field(..., min_length=2, max_length=255, description="User full name")
    email: str = Field(..., min_length=3, max_length=255, description="Work email address")
    password: str = Field(..., min_length=6, max_length=255, description="Password (min 6 characters)")
    role: Optional[Literal["analyst", "viewer"]] = Field("analyst", description="Desired team role (defaults to analyst)")

    @field_validator("email")
    @classmethod
    def email_must_be_well_formed(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
            raise ValueError("Email address is invalid")
        return normalized

    @field_validator("password")
    @classmethod
    def password_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Password must not be blank")
        return value


class InviteMemberRequest(StrictRequestModel):
    """Payload when a workspace admin invites a new team member."""
    email: str = Field(..., min_length=3, max_length=255, description="Work email of the member to invite")
    full_name: str = Field(..., min_length=2, max_length=255, description="Full name of the member")
    role: Literal["analyst", "viewer"] = Field("analyst", description="Role to assign")
    temporary_password: Optional[str] = Field("WelcomePass123!", min_length=6, max_length=255, description="Initial temporary password")

    @field_validator("email")
    @classmethod
    def email_must_be_well_formed(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
            raise ValueError("Email address is invalid")
        return normalized


