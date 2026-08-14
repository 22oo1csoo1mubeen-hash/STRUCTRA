"""Application settings loaded from the environment."""

from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated runtime configuration for the application."""

    document_max_upload_size_bytes: int = Field(
        default=10 * 1024 * 1024,
        validation_alias="DOCUMENT_MAX_UPLOAD_SIZE_BYTES",
        gt=0,
        description="Maximum accepted document upload size in bytes.",
    )
    supabase_storage_bucket: str = Field(
        default="documents",
        validation_alias="SUPABASE_STORAGE_BUCKET",
        min_length=1,
    )
    supabase_url: str = Field(validation_alias="SUPABASE_URL")
    supabase_publishable_key: SecretStr = Field(
        validation_alias="SUPABASE_PUBLISHABLE_KEY"
    )
    supabase_secret_key: SecretStr = Field(validation_alias="SUPABASE_SECRET_KEY")
    gemini_api_key: SecretStr | None = Field(
        default=None,
        validation_alias="GEMINI_API_KEY",
    )
    gemini_model: str = Field(
        default="gemini-3.1-flash-lite",
        validation_alias="GEMINI_MODEL",
    )
    groq_api_key: SecretStr | None = Field(
        default=None,
        validation_alias="GROQ_API_KEY",
    )
    groq_model: str = Field(
        default="openai/gpt-oss-120b",
        validation_alias="GROQ_MODEL",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
