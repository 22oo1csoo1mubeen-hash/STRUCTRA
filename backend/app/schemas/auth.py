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
