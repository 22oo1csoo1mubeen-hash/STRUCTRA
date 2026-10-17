"""Tests for safe, environment-driven CORS origin configuration."""

import pytest

from app.core.config import CorsSettings, get_cors_allowed_origins


def test_cors_origins_default_to_local_frontend() -> None:
    settings = CorsSettings(_env_file=None)

    assert get_cors_allowed_origins(settings) == ["http://localhost:5173"]


def test_cors_origins_parse_a_comma_separated_allowlist() -> None:
    settings = CorsSettings(
        _env_file=None,
        CORS_ALLOWED_ORIGINS="https://app.example.com, https://preview.example.com/",
    )

    assert get_cors_allowed_origins(settings) == [
        "https://app.example.com",
        "https://preview.example.com",
    ]


@pytest.mark.parametrize(
    "configured",
    ["", "https://app.example.com/path", "*", "ftp://app.example.com"],
)
def test_cors_origins_reject_invalid_values(configured: str) -> None:
    settings = CorsSettings(_env_file=None, CORS_ALLOWED_ORIGINS=configured)

    with pytest.raises(ValueError):
        get_cors_allowed_origins(settings)
