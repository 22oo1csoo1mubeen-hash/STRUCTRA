"""Request and response schemas for user profile and security endpoints."""

from typing import Any
from pydantic import BaseModel, Field, field_validator


class UserProfileData(BaseModel):
    """Basic identity and personal information data for the authenticated user."""

    id: str = Field(description="Unique user ID")
    name: str = Field(description="Display name or full name")
    email: str = Field(description="Account email address")
    email_verified: bool = Field(default=True, description="Whether email address is confirmed")
    avatar_url: str | None = Field(default=None, description="Optional profile photo URL")
    phone: str | None = Field(default=None, description="Optional contact phone number")
    organization: str | None = Field(default=None, description="Optional company or organization name")
    job_title: str | None = Field(default=None, description="Optional job title / role")
    location: str | None = Field(default=None, description="Optional city, region, or country")


class ProfileUpdateRequest(BaseModel):
    """Payload for updating personal profile information."""

    full_name: str = Field(..., min_length=1, max_length=150, description="User full display name")
    phone: str | None = Field(default=None, max_length=50, description="Optional phone number")
    organization: str | None = Field(default=None, max_length=150, description="Optional organization")
    job_title: str | None = Field(default=None, max_length=150, description="Optional job title")
    location: str | None = Field(default=None, max_length=150, description="Optional location")

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Full name cannot be empty or only whitespace.")
        return trimmed

    @field_validator("phone", "organization", "job_title", "location")
    @classmethod
    def trim_optional_fields(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None


class AvatarUploadResponse(BaseModel):
    """Response returned when an avatar image is uploaded or modified."""

    avatar_url: str = Field(description="Updated avatar image URL")
    message: str = Field(default="Profile picture updated successfully.")


class AccountInfoData(BaseModel):
    """Subscription and security lifecycle details for the account."""

    plan: str = Field(default="Free", description="Current subscription or account tier")
    status: str = Field(default="Active", description="Account operational status")
    member_since: str | None = Field(default=None, description="Account creation timestamp (ISO)")
    last_login: str | None = Field(default=None, description="Last authenticated sign-in timestamp (ISO)")


class UsageStatsData(BaseModel):
    """Real-time document storage and usage statistics for the user."""

    document_count: int = Field(default=0, description="Total active documents uploaded")
    storage_used_bytes: int = Field(default=0, description="Total storage consumed in bytes")
    storage_limit_bytes: int | None = Field(default=1073741824, description="Storage quota in bytes (default 1GB)")


class ProfileResponse(BaseModel):
    """Aggregated profile payload for the STRUCTRA Profile section."""

    user: UserProfileData
    account: AccountInfoData
    usage: UsageStatsData


# ─── Account & Security Schemas ───────────────────────────────

class SecurityActivityItem(BaseModel):
    """A logged security event for the user account."""

    id: str = Field(description="Event unique ID")
    event_type: str = Field(description="Categorical event type (e.g. sign_in, password_changed)")
    description: str = Field(description="Human readable description")
    device_info: str | None = Field(default=None, description="Client device / browser")
    ip_address: str | None = Field(default=None, description="IP address or location notice")
    created_at: str = Field(description="Timestamp in ISO format")


class RecordActivityRequest(BaseModel):
    """Payload to log a security activity event."""

    event_type: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=200)
    device_info: str | None = Field(default=None, max_length=100)


class SessionItem(BaseModel):
    """Information about an authenticated user session/device."""

    id: str = Field(description="Session unique ID")
    device: str = Field(description="Device and browser description")
    icon_type: str = Field(default="laptop", description="Icon type: laptop or smartphone")
    location: str = Field(default="Location unavailable", description="Geographic location or notice")
    ip: str = Field(default="Current connection", description="IP address or connection type")
    last_active: str = Field(default="Active now", description="Relative activity timestamp")
    is_current: bool = Field(default=False, description="Whether this is the current active session")


class SecurityOverviewData(BaseModel):
    """Aggregated security and authentication overview for the account."""

    providers: list[str] = Field(default_factory=list, description="Active auth providers: ['google'], ['email'], or both")
    has_password: bool = Field(default=False, description="Whether an email/password credential is set")
    email_verified: bool = Field(default=True, description="Whether the primary email is confirmed")
    email: str = Field(description="Primary account email")
    google_email: str | None = Field(default=None, description="Linked Google email if present")
    password_last_changed: str | None = Field(default=None, description="Timestamp of last password change")
    current_session: SessionItem = Field(description="Details of current browser session")
    other_sessions: list[SessionItem] = Field(default_factory=list, description="Other active sessions if any")
    recent_activity: list[SecurityActivityItem] = Field(default_factory=list, description="Recent security activity log items")


# ─── Danger Zone Schemas ──────────────────────────────────────

class AccountDeleteRequest(BaseModel):
    """Payload to permanently delete authenticated user account."""

    confirmation: str = Field(..., description="Confirmation string, must be exactly 'DELETE'")

    @field_validator("confirmation")
    @classmethod
    def validate_confirmation(cls, v: str) -> str:
        if v.strip() != "DELETE":
            raise ValueError("Confirmation must be exactly 'DELETE'.")
        return v.strip()
