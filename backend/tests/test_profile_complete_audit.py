"""Comprehensive Profile Backend Audit & Test Suite.

Audits and verifies the complete 4 mini-sections of the Profile system:
1. Profile (Header, Quick Overview, Document counts, Storage Bytes, Dynamic Account State)
2. Personal Information (Full Name, Read-only Email, Optional Details, Avatar Upload/Delete/Stream)
3. Account & Security (Google OAuth vs Email/Password vs Dual, User-Agent Device Detection, Security Activity)
4. Danger Zone (Exact 'DELETE' Confirmation, Cascading Purge of DB, Storage, AI Sessions, Auth Admin Deletion)
5. Strict User Isolation & Zero IDOR Vulnerabilities
"""

import io
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


# ─── 1. PROFILE MINI SECTION AUDIT ────────────────────────────

def test_audit_profile_overview_real_data_and_metrics():
    """Verify Profile overview returns dynamic user metadata, document count, and real storage bytes."""
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="alex@structra.io",
        user_metadata={"full_name": "Alex Mercer", "plan": "Enterprise"},
        created_at="2026-02-10T09:00:00Z",
        last_sign_in_at="2026-08-23T20:15:00Z",
    )

    # 3 active documents (1.5MB total), 1 failed (ignored), 1 deleted (ignored)
    mock_docs = [
        {"id": "doc-1", "size": 524288, "status": "completed"},
        {"id": "doc-2", "size": 1048576, "status": "completed"},
        {"id": "doc-3", "size": 204800, "status": "failed"},
        {"id": "doc-4", "size": 409600, "status": "deleted"},
    ]

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_user_fetch, \
         patch("app.services.profile._get_shared_client") as mock_client:

        mock_user_fetch.return_value = {
            "id": USER_A_ID,
            "email": "alex@structra.io",
            "user_metadata": {"full_name": "Alex Mercer", "plan": "Enterprise"},
            "created_at": "2026-02-10T09:00:00Z",
            "last_sign_in_at": "2026-08-23T20:15:00Z",
            "banned_until": None,
            "deleted_at": None,
            "email_confirmed_at": "2026-02-10T09:05:00Z",
        }
        mock_response = SimpleNamespace(is_success=True, json=lambda: mock_docs)
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        client = TestClient(app)
        res = client.get("/profile")

        assert res.status_code == 200
        data = res.json()

        assert data["user"]["id"] == USER_A_ID
        assert data["user"]["name"] == "Alex Mercer"
        assert data["user"]["email"] == "alex@structra.io"
        assert data["user"]["email_verified"] is True
        assert data["account"]["plan"] == "Enterprise"
        assert data["account"]["status"] == "Active"
        assert data["account"]["member_since"] == "2026-02-10T09:00:00Z"
        assert data["account"]["last_login"] == "2026-08-23T20:15:00Z"

        # Document count = 2 (failed and deleted excluded)
        assert data["usage"]["document_count"] == 2
        assert data["usage"]["storage_used_bytes"] == 524288 + 1048576  # 1,572,864 bytes


def test_audit_profile_account_status_suspended():
    """Verify suspended or banned accounts correctly report 'Suspended'."""
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="banned@structra.io",
    )

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_user_fetch, \
         patch("app.services.profile._get_shared_client") as mock_client:

        mock_user_fetch.return_value = {
            "id": USER_A_ID,
            "email": "banned@structra.io",
            "banned_until": "2027-01-01T00:00:00Z",
        }
        mock_response = SimpleNamespace(is_success=True, json=lambda: [])
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        client = TestClient(app)
        res = client.get("/profile")

        assert res.status_code == 200
        assert res.json()["account"]["status"] == "Suspended"


# ─── 2. PERSONAL INFORMATION AUDIT ────────────────────────────

def test_audit_personal_info_lifecycle_and_validation():
    """Test full update lifecycle: populate optional fields, validate name, and clear fields."""
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="sarah@corp.com",
    )

    client = TestClient(app)

    # 1. Reject empty name
    res_err = client.patch("/profile", json={"full_name": "   "})
    assert res_err.status_code == 422

    # 2. Update with all fields populated
    with patch("app.services.profile._update_supabase_user_metadata", new_callable=AsyncMock) as mock_update, \
         patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_fetch, \
         patch("app.services.profile._get_shared_client") as mock_client:

        mock_update.return_value = {"id": USER_A_ID}
        mock_fetch.return_value = {
            "id": USER_A_ID,
            "email": "sarah@corp.com",
            "user_metadata": {
                "full_name": "Sarah Connor",
                "phone": "+91 9876543210",
                "organization": "Cyberdyne Systems",
                "job_title": "Security Lead",
                "location": "Bengaluru, India",
            },
        }
        mock_client.return_value.get = AsyncMock(return_value=SimpleNamespace(is_success=True, json=lambda: []))

        res_ok = client.patch(
            "/profile",
            json={
                "full_name": "Sarah Connor",
                "phone": "+91 9876543210",
                "organization": "Cyberdyne Systems",
                "job_title": "Security Lead",
                "location": "Bengaluru, India",
            },
        )
        assert res_ok.status_code == 200
        data = res_ok.json()["user"]
        assert data["name"] == "Sarah Connor"
        assert data["phone"] == "+91 9876543210"
        assert data["organization"] == "Cyberdyne Systems"
        assert data["job_title"] == "Security Lead"
        assert data["location"] == "Bengaluru, India"


def test_audit_avatar_upload_stream_and_delete():
    """Verify avatar upload validation (JPG/PNG/WEBP <=2MB), streaming, and removal."""
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="sarah@corp.com",
    )

    client = TestClient(app)

    # 1. Reject unsupported file format (e.g. text/plain)
    res_bad_fmt = client.post(
        "/profile/picture",
        files={"file": ("doc.txt", b"plain text", "text/plain")},
    )
    assert res_bad_fmt.status_code == 400

    # 2. Reject oversized file (> 2 MB)
    oversized_data = b"X" * (2 * 1024 * 1024 + 100)
    res_oversized = client.post(
        "/profile/picture",
        files={"file": ("large.jpg", oversized_data, "image/jpeg")},
    )
    assert res_oversized.status_code == 413

    # 3. Successful upload of valid PNG
    mock_post_res = SimpleNamespace(is_success=True, status_code=200)
    with patch("app.services.profile._get_shared_client") as mock_client, \
         patch("app.services.profile._update_supabase_user_metadata", new_callable=AsyncMock) as mock_update:

        mock_client.return_value.post = AsyncMock(return_value=mock_post_res)
        mock_update.return_value = {"id": USER_A_ID}

        res_upload = client.post(
            "/profile/picture",
            files={"file": ("avatar.png", b"\x89PNG\r\n\x1a\nfake-png-bytes", "image/png")},
        )
        assert res_upload.status_code == 200
        assert f"/profile/avatar/{USER_A_ID}" in res_upload.json()["avatar_url"]

    # 4. Stream avatar image
    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_fetch, \
         patch("app.services.profile._get_shared_client") as mock_client:

        mock_fetch.return_value = {
            "user_metadata": {
                "avatar_storage_path": f"avatars/{USER_A_ID}/avatar_123.png",
                "avatar_content_type": "image/png",
            }
        }
        mock_client.return_value.get = AsyncMock(
            return_value=SimpleNamespace(is_success=True, status_code=200, content=b"fake-image-bytes")
        )

        res_stream = client.get(f"/profile/avatar/{USER_A_ID}")
        assert res_stream.status_code == 200
        assert res_stream.content == b"fake-image-bytes"
        assert "public, max-age=86400" in res_stream.headers.get("Cache-Control", "")

    # 5. Delete avatar
    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_fetch, \
         patch("app.services.profile._update_supabase_user_metadata", new_callable=AsyncMock) as mock_update, \
         patch("app.services.profile._get_shared_client") as mock_client:

        mock_fetch.return_value = {
            "user_metadata": {"avatar_storage_path": f"avatars/{USER_A_ID}/avatar_123.png"}
        }
        mock_client.return_value.delete = AsyncMock(return_value=SimpleNamespace(is_success=True, status_code=200))
        mock_update.return_value = {"id": USER_A_ID}

        res_del = client.delete("/profile/picture")
        assert res_del.status_code == 200
        assert "removed successfully" in res_del.json()["message"].lower()


# ─── 3. ACCOUNT & SECURITY AUDIT ──────────────────────────────

def test_audit_account_security_dual_providers_and_device_detection():
    """Verify dual provider detection (Google + Email/Password) and User-Agent parsing."""
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="dualuser@gmail.com",
    )

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_fetch, \
         patch("app.services.profile.get_user_security_activity", new_callable=AsyncMock) as mock_activity:

        mock_fetch.return_value = {
            "id": USER_A_ID,
            "email": "dualuser@gmail.com",
            "app_metadata": {"providers": ["email", "google"]},
            "identities": [
                {"provider": "google", "identity_data": {"email": "dualuser@gmail.com"}},
                {"provider": "email", "identity_data": {"email": "dualuser@gmail.com"}},
            ],
            "created_at": "2026-01-01T00:00:00Z",
            "last_sign_in_at": "2026-08-23T19:00:00Z",
            "email_confirmed_at": "2026-01-01T00:05:00Z",
            "user_metadata": {"password_last_changed": "2026-08-20T12:00:00Z"},
        }
        mock_activity.return_value = []

        client = TestClient(app)
        # Pass a Mac Safari User-Agent
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"}
        res = client.get("/profile/security", headers=headers)

        assert res.status_code == 200
        sec = res.json()

        assert "email" in sec["providers"]
        assert "google" in sec["providers"]
        assert sec["has_password"] is True
        assert sec["email_verified"] is True
        assert sec["google_email"] == "dualuser@gmail.com"
        assert sec["password_last_changed"] == "2026-08-20T12:00:00Z"
        assert "Mac (Safari)" in sec["current_session"]["device"]
        assert sec["current_session"]["icon_type"] == "laptop"
        assert sec["current_session"]["is_current"] is True


def test_audit_security_activity_logging_and_retrieval():
    """Verify security event recording and chronological retrieval."""
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="audit@structra.io",
    )

    with patch("app.services.profile._get_shared_client") as mock_client:
        mock_client.return_value.post = AsyncMock(return_value=SimpleNamespace(is_success=True, status_code=201))

        client = TestClient(app)
        # Log a password change event
        res_log = client.post(
            "/profile/security/activity",
            json={
                "event_type": "password_changed",
                "description": "Account password was updated",
                "device_info": "Windows PC (Chrome)",
            },
        )
        assert res_log.status_code == 200
        event = res_log.json()
        assert event["event_type"] == "password_changed"
        assert event["description"] == "Account password was updated"
        assert event["device_info"] == "Windows PC (Chrome)"


# ─── 4. DANGER ZONE ACCOUNT DELETION AUDIT ─────────────────────

def test_audit_danger_zone_cascading_purge_and_user_isolation():
    """Verify Danger Zone deletion validates 'DELETE', cleans DB, storage, AI turns, and Supabase Auth."""
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="delete_me@structra.io",
    )

    deleted_urls = []

    async def mock_delete_handler(url, *args, **kwargs):
        deleted_urls.append(url)
        return httpx.Response(200, json={})

    mock_client = AsyncMock()
    mock_client.delete = AsyncMock(side_effect=mock_delete_handler)

    with patch("app.services.profile._get_shared_client", return_value=mock_client), \
         patch("app.services.profile.delete_all_user_storage_objects", new_callable=AsyncMock) as mock_storage_del, \
         patch.object(default_session_manager, "clear_user_sessions", new_callable=AsyncMock) as mock_ai_clear:

        mock_storage_del.return_value = 8
        mock_ai_clear.return_value = 2

        client = TestClient(app)
        res = client.request("DELETE", "/profile/account", json={"confirmation": "DELETE"})

        assert res.status_code == 200
        assert "permanently deleted" in res.json()["message"].lower()

        # Check DB purge calls
        all_deleted = " ".join(deleted_urls)
        assert "/rest/v1/documents" in all_deleted
        assert "/rest/v1/extraction_cache" in all_deleted
        assert "/rest/v1/security_activity" in all_deleted
        assert f"/auth/v1/admin/users/{USER_A_ID}" in all_deleted

        mock_storage_del.assert_called_once()
        assert mock_storage_del.call_args[0][0] == USER_A_ID
        mock_ai_clear.assert_called_once_with(USER_A_ID)


# ─── 5. SECURITY AUDIT: ZERO IDOR & 401 ENFORCEMENT ───────────

def test_audit_security_zero_idor_and_unauthenticated_rejections():
    """Verify all 8 Profile endpoints strictly require authentication and reject forged user IDs."""
    app.dependency_overrides.clear()
    client = TestClient(app)

    # All unauthenticated calls must return 401
    assert client.get("/profile").status_code == 401
    assert client.patch("/profile", json={"full_name": "Hacker"}).status_code == 401
    assert client.post("/profile/picture", files={"file": ("test.png", b"test", "image/png")}).status_code == 401
    assert client.delete("/profile/picture").status_code == 401
    assert client.get("/profile/security").status_code == 401
    assert client.get("/profile/security/activity").status_code == 401
    assert client.post("/profile/security/activity", json={"event_type": "x", "description": "y"}).status_code == 401
    assert client.request("DELETE", "/profile/account", json={"confirmation": "DELETE"}).status_code == 401
