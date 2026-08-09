"""Tests for the internal Gemini connectivity service."""

from types import SimpleNamespace

import pytest
from pydantic import SecretStr

from app.core.config import Settings, get_settings
from app.services.gemini import (
    GEMINI_FLASH_MODEL,
    GeminiAuthenticationError,
    GeminiConfigurationError,
    GeminiServiceUnavailableError,
    GeminiUnexpectedResponseError,
    verify_gemini_connectivity,
)


def make_settings(api_key: SecretStr | None) -> Settings:
    return Settings.model_construct(gemini_api_key=api_key)


class FakeGeminiClient:
    def __init__(self, response: object | None = None, error: Exception | None = None):
        self.response = response
        self.error = error
        self.models = self
        self.calls: list[dict[str, str]] = []

    def generate_content(self, *, model: str, contents: str) -> object:
        self.calls.append({"model": model, "contents": contents})
        if self.error:
            raise self.error
        return self.response


def test_connectivity_uses_gemini_flash_and_returns_text() -> None:
    client = FakeGeminiClient(response=SimpleNamespace(text=" connected "))

    result = verify_gemini_connectivity(make_settings(SecretStr("test-key")), client=client)

    assert result.model == GEMINI_FLASH_MODEL
    assert result.response_text == "connected"
    assert client.calls[0]["model"] == GEMINI_FLASH_MODEL


def test_gemini_key_is_loaded_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "secret-key")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-test-key")
    get_settings.cache_clear()

    try:
        settings = get_settings()
        assert settings.gemini_api_key is not None
        assert settings.gemini_api_key.get_secret_value() == "gemini-test-key"
    finally:
        get_settings.cache_clear()


@pytest.mark.parametrize("api_key", [None, SecretStr("   ")])
def test_connectivity_requires_a_configured_key(api_key: SecretStr | None) -> None:
    with pytest.raises(GeminiConfigurationError):
        verify_gemini_connectivity(make_settings(api_key), client=FakeGeminiClient())


def test_connectivity_maps_authentication_failures_safely() -> None:
    error = type("GeminiError", (Exception,), {"code": 403})()

    with pytest.raises(GeminiAuthenticationError):
        verify_gemini_connectivity(
            make_settings(SecretStr("test-key")), client=FakeGeminiClient(error=error)
        )


def test_connectivity_maps_service_failures_safely() -> None:
    with pytest.raises(GeminiServiceUnavailableError):
        verify_gemini_connectivity(
            make_settings(SecretStr("test-key")),
            client=FakeGeminiClient(error=OSError("network unavailable")),
        )


def test_connectivity_rejects_unexpected_response() -> None:
    with pytest.raises(GeminiUnexpectedResponseError):
        verify_gemini_connectivity(
            make_settings(SecretStr("test-key")),
            client=FakeGeminiClient(response=SimpleNamespace(text=None)),
        )
