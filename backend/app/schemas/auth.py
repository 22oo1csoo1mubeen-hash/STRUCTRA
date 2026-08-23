"""Request and response schemas for authentication endpoints."""

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    """Data required to register a new user."""

    email: EmailStr
    password: str = Field(min_length=1)
    full_name: str = Field(min_length=1)


class SignupResponse(BaseModel):
    """Public response for a successful signup request."""

    message: str


from typing import Any


class CurrentUser(BaseModel):
    """Authenticated Supabase user identity available to protected endpoints."""

    user_id: str = Field(min_length=1)
    email: str | None = None
    user_metadata: dict[str, Any] = Field(default_factory=dict)
    app_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str | None = None
    last_sign_in_at: str | None = None
