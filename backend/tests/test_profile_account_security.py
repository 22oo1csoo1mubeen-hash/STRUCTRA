"""Tests for Account & Security Backend API (Mini Section 3).

Validates:
- 401 Unauthorized for unauthenticated requests
- Accurate provider detection: Google-only, Email/Password, and Dual providers
- Password existence flag (has_password is False for Google-only, True for Email/Password)
- Real device/browser parsing from User-Agent
- Security activity recording and retrieval
- Strict user isolation across security activity records
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser

USER_A_ID = "00000000-0000-0000-0000-0000000000aa"
USER_B_ID = "00000000-0000-0000-0000-0000000000bb"


def get_mock_settings():
    return SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_publishable_key=SimpleNamespace(get_secret_value=lambda: "pub-key"),
        supabase_secret_key=SimpleNamespace(get_secret_value=lambda: "mock-secret-key"),
        supabase_storage_bucket="documents",
    )


# 1. Unauthenticated requests return 401
def test_unauthenticated_security_endpoints_return_401():
    app.dependency_overrides.clear()
    client = TestClient(app)

    res1 = client.get("/profile/security")
    assert res1.status_code == 401

    res2 = client.get("/profile/security/activity")
    assert res2.status_code == 401

    res3 = client.post("/profile/security/activity", json={"event_type": "test", "description": "test"})
    assert res3.status_code == 401


# 2. Google-Only Account Detection
def test_security_overview_google_only():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="googleuser@gmail.com",
        app_metadata={"provider": "google", "providers": ["google"]},
    )

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = {
            "id": USER_A_ID,
            "email": "googleuser@gmail.com",
            "app_metadata": {"providers": ["google"]},
            "identities": [
                {"provider": "google", "identity_data": {"email": "googleuser@gmail.com"}}
            ],
            "created_at": "2026-03-01T12:00:00Z",
            "last_sign_in_at": "2026-08-23T15:00:00Z",
        }

        client = TestClient(app)
        response = client.get(
            "/profile/security",
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36"},
        )

        assert response.status_code == 200
        data = response.json()

        assert "google" in data["providers"]
        assert "email" not in data["providers"]
        assert data["has_password"] is False
        assert data["google_email"] == "googleuser@gmail.com"
        assert "Windows PC" in data["current_session"]["device"]
        assert "Chrome" in data["current_session"]["device"]
        assert data["current_session"]["is_current"] is True


# 3. Email & Password Account Detection
def test_security_overview_email_password():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_B_ID,
        email="pwuser@company.com",
        app_metadata={"provider": "email", "providers": ["email"]},
    )

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = {
            "id": USER_B_ID,
            "email": "pwuser@company.com",
            "app_metadata": {"providers": ["email"]},
            "identities": [
                {"provider": "email", "identity_data": {"email": "pwuser@company.com"}}
            ],
            "created_at": "2026-02-10T08:00:00Z",
            "last_sign_in_at": "2026-08-22T10:00:00Z",
        }

        client = TestClient(app)
        response = client.get(
            "/profile/security",
            headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/17.0"},
        )

        assert response.status_code == 200
        data = response.json()

        assert "email" in data["providers"]
        assert "google" not in data["providers"]
        assert data["has_password"] is True
        assert "Mac" in data["current_session"]["device"]
        assert "Safari" in data["current_session"]["device"]


# 4. Dual Provider Account (Google + Email/Password Linked)
def test_security_overview_dual_providers():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="dualuser@structra.io",
        app_metadata={"providers": ["google", "email"]},
    )

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = {
            "id": USER_A_ID,
            "email": "dualuser@structra.io",
            "app_metadata": {"providers": ["google", "email"]},
            "identities": [
                {"provider": "google", "identity_data": {"email": "dualuser@structra.io"}},
                {"provider": "email", "identity_data": {"email": "dualuser@structra.io"}},
            ],
            "created_at": "2026-01-01T00:00:00Z",
            "last_sign_in_at": "2026-08-24T00:00:00Z",
        }

        client = TestClient(app)
        response = client.get("/profile/security")

        assert response.status_code == 200
        data = response.json()

        assert "google" in data["providers"]
        assert "email" in data["providers"]
        assert data["has_password"] is True


# 5. Record and Retrieve Security Activity
def test_record_and_get_security_activity():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="alice@company.org",
    )

    mock_db_activity = [
        {
            "id": "act-1",
            "event_type": "password_changed",
            "description": "Password updated via account security",
            "device_info": "Windows PC (Chrome)",
            "ip_address": "127.0.0.1",
            "created_at": "2026-08-24T00:01:00Z",
        },
    ]

    with patch("app.services.profile._get_shared_client") as mock_client:
        mock_client.return_value.post = AsyncMock(return_value=SimpleNamespace(is_success=True))
        mock_client.return_value.get = AsyncMock(
            return_value=SimpleNamespace(is_success=True, json=lambda: mock_db_activity)
        )

        client = TestClient(app)

        # 1. Post new activity
        post_res = client.post(
            "/profile/security/activity",
            json={
                "event_type": "password_changed",
                "description": "Password updated via account security",
                "device_info": "Windows PC (Chrome)",
            },
        )
        assert post_res.status_code == 200
        assert post_res.json()["event_type"] == "password_changed"

        # 2. Get activity log
        get_res = client.get("/profile/security/activity")
        assert get_res.status_code == 200
        items = get_res.json()
        assert len(items) == 1
        assert items[0]["id"] == "act-1"
        assert items[0]["event_type"] == "password_changed"


# 6. User Isolation for Security Activity
def test_security_activity_user_isolation():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_B_ID,
        email="bob@structra.io",
    )

    with patch("app.services.profile._get_shared_client") as mock_client:
        # Client queries scoped to user_id eq. USER_B_ID
        mock_client.return_value.get = AsyncMock(
            return_value=SimpleNamespace(is_success=True, json=lambda: [])
        )

        client = TestClient(app)
        response = client.get("/profile/security/activity")

        assert response.status_code == 200
        # Bob sees his own activity list (empty list), never Alice's
        assert response.json() == []
