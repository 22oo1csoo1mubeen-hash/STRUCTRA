"""Tests for Danger Zone Account Deletion API (Mini Section 4).

Validates:
- 401 Unauthorized for unauthenticated requests
- 400 Bad Request for missing, lowercase, or incorrect confirmation text
- Full cascading deletion across documents, extraction_cache, security_activity, storage, AI sessions, and Supabase Auth
- Strict user isolation during account deletion
- Safe error handling when storage is already missing or cleaned
- Service unavailable (503) error handling if Supabase Auth deletion fails
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import httpx
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.assistant.session import default_session_manager

USER_A_ID = "00000000-0000-0000-0000-0000000000aa"
USER_B_ID = "00000000-0000-0000-0000-0000000000bb"


def get_mock_settings():
    return SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_publishable_key=SimpleNamespace(get_secret_value=lambda: "pub-key"),
        supabase_secret_key=SimpleNamespace(get_secret_value=lambda: "mock-secret-key"),
        supabase_storage_bucket="documents",
    )


# 1. Unauthenticated request returns 401
def test_unauthenticated_delete_account_returns_401():
    app.dependency_overrides.clear()
    client = TestClient(app)

    res = client.request("DELETE", "/profile/account", json={"confirmation": "DELETE"})
    assert res.status_code == 401


# 2. Invalid or missing confirmation text is rejected with 400/422
def test_delete_account_invalid_confirmation_rejected():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="user_a@example.com",
    )

    client = TestClient(app)

    # Empty confirmation
    res_empty = client.request("DELETE", "/profile/account", json={"confirmation": ""})
    assert res_empty.status_code in (400, 422)

    # Lowercase 'delete'
    res_lower = client.request("DELETE", "/profile/account", json={"confirmation": "delete"})
    assert res_lower.status_code in (400, 422)

    # Wrong string
    res_wrong = client.request("DELETE", "/profile/account", json={"confirmation": "REMOVE"})
    assert res_wrong.status_code in (400, 422)


# 3. Successful account deletion
def test_delete_account_success():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="user_a@example.com",
    )

    deleted_urls = []

    async def mock_delete(url, *args, **kwargs):
        deleted_urls.append(url)
        return httpx.Response(200, json={})

    mock_client = AsyncMock()
    mock_client.delete = AsyncMock(side_effect=mock_delete)

    with patch("app.services.profile._get_shared_client", return_value=mock_client), \
         patch("app.services.profile.delete_all_user_storage_objects", new_callable=AsyncMock) as mock_storage_del, \
         patch.object(default_session_manager, "clear_user_sessions", new_callable=AsyncMock) as mock_ai_clear:

        mock_storage_del.return_value = 5
        mock_ai_clear.return_value = 1

        client = TestClient(app)
        res = client.request("DELETE", "/profile/account", json={"confirmation": "DELETE"})

        assert res.status_code == 200
        data = res.json()
        assert "permanently deleted" in data.get("message", "").lower()

        # Verify DB table deletes were called for User A
        called_urls_str = " ".join(deleted_urls)
        assert "/rest/v1/documents" in called_urls_str
        assert "/rest/v1/extraction_cache" in called_urls_str
        assert "/rest/v1/security_activity" in called_urls_str
        assert f"/auth/v1/admin/users/{USER_A_ID}" in called_urls_str

        # Verify storage and AI sessions were cleared for User A
        mock_storage_del.assert_called_once()
        assert mock_storage_del.call_args[0][0] == USER_A_ID
        mock_ai_clear.assert_called_once_with(USER_A_ID)


# 4. Strict User Isolation
def test_delete_account_user_isolation():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="user_a@example.com",
    )

    deleted_params = []

    async def mock_delete(url, *args, **kwargs):
        deleted_params.append((url, kwargs.get("params")))
        return httpx.Response(200, json={})

    mock_client = AsyncMock()
    mock_client.delete = AsyncMock(side_effect=mock_delete)

    with patch("app.services.profile._get_shared_client", return_value=mock_client), \
         patch("app.services.profile.delete_all_user_storage_objects", new_callable=AsyncMock) as mock_storage_del, \
         patch.object(default_session_manager, "clear_user_sessions", new_callable=AsyncMock) as mock_ai_clear:

        client = TestClient(app)
        res = client.request("DELETE", "/profile/account", json={"confirmation": "DELETE"})

        assert res.status_code == 200
        # Ensure every scoped query used USER_A_ID, never USER_B_ID
        for url, params in deleted_params:
            if params and "user_id" in params:
                assert f"eq.{USER_A_ID}" == params["user_id"]
                assert USER_B_ID not in params["user_id"]


# 5. Missing storage handled gracefully without failing
def test_delete_account_storage_missing_graceful():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="user_a@example.com",
    )

    mock_client = AsyncMock()
    mock_client.delete = AsyncMock(return_value=httpx.Response(200, json={}))

    with patch("app.services.profile._get_shared_client", return_value=mock_client), \
         patch("app.services.profile.delete_all_user_storage_objects", new_callable=AsyncMock) as mock_storage_del, \
         patch.object(default_session_manager, "clear_user_sessions", new_callable=AsyncMock):

        # Storage raises exception or returns 0 objects
        mock_storage_del.side_effect = Exception("Storage timeout")

        client = TestClient(app)
        res = client.request("DELETE", "/profile/account", json={"confirmation": "DELETE"})

        assert res.status_code == 200
        assert "permanently deleted" in res.json().get("message", "").lower()


# 6. Auth failure raises 503
def test_delete_account_auth_failure_raises_503():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="user_a@example.com",
    )

    async def mock_delete(url, *args, **kwargs):
        if "/auth/v1/admin/users" in url:
            return httpx.Response(500, json={"error": "Database error"})
        return httpx.Response(200, json={})

    mock_client = AsyncMock()
    mock_client.delete = AsyncMock(side_effect=mock_delete)

    with patch("app.services.profile._get_shared_client", return_value=mock_client), \
         patch("app.services.profile.delete_all_user_storage_objects", new_callable=AsyncMock), \
         patch.object(default_session_manager, "clear_user_sessions", new_callable=AsyncMock):

        client = TestClient(app)
        res = client.request("DELETE", "/profile/account", json={"confirmation": "DELETE"})

        assert res.status_code == 503
        assert "Failed to permanently delete authentication record" in res.json().get("detail", "")
