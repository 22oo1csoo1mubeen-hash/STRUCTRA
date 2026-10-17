"""Application settings loaded from the environment."""

from functools import lru_cache
from urllib.parse import urlsplit

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


class CorsSettings(BaseSettings):
    """CORS configuration that can be loaded without application secrets."""

    allowed_origins: str = Field(
        default="http://localhost:5173",
        validation_alias="CORS_ALLOWED_ORIGINS",
        description="Comma-separated browser origins allowed to call the API.",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


def get_cors_allowed_origins(settings: CorsSettings | None = None) -> list[str]:
    """Return validated CORS origins; wildcard origins are unsafe with credentials."""
    configured = (settings or CorsSettings()).allowed_origins
    origins = [origin.strip().rstrip("/") for origin in configured.split(",")]
    if not origins or any(not origin for origin in origins):
        raise ValueError("CORS_ALLOWED_ORIGINS must contain at least one origin.")

    for origin in origins:
        parsed = urlsplit(origin)
        if (
            origin == "*"
            or parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.path
            or parsed.query
            or parsed.fragment
            or parsed.username
            or parsed.password
        ):
            raise ValueError(
                "CORS_ALLOWED_ORIGINS must contain explicit http(s) origins "
                "without paths or wildcards."
            )

    return origins
