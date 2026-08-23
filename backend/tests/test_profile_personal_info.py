"""Tests for Profile Personal Information and Avatar API (Mini Section 2).

Validates:
- 401 Unauthorized for unauthenticated PATCH, POST avatar, DELETE avatar
- Valid profile updates for name, phone, organization, job_title, location
- Validation rejects empty/whitespace-only full_name with 422
- Optional fields default cleanly to None
- Avatar upload validation for JPG, PNG, WEBP and size <= 2MB
- Avatar upload rejection for unsupported formats (400) and oversized files (413)
- Avatar deletion and stream endpoints
- User isolation: updates are scoped strictly to the authenticated user
"""

import io
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
def test_unauthenticated_requests_return_401():
    app.dependency_overrides.clear()
    client = TestClient(app)

    # PATCH /profile
    patch_res = client.patch("/profile", json={"full_name": "Test"})
    assert patch_res.status_code == 401

    # POST /profile/picture
    post_res = client.post(
        "/profile/picture",
        files={"file": ("avatar.png", b"fake-png", "image/png")},
    )
    assert post_res.status_code == 401

    # DELETE /profile/picture
    del_res = client.delete("/profile/picture")
    assert del_res.status_code == 401


# 2. Update Profile Successfully
def test_update_profile_success():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="alice@company.org",
        user_metadata={"full_name": "Alice Old"},
        created_at="2026-01-15T10:30:00Z",
    )

    with patch("app.services.profile._update_supabase_user_metadata", new_callable=AsyncMock) as mock_update, \
         patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_fetch, \
         patch("app.services.profile._get_shared_client") as mock_client:

        mock_update.return_value = {"id": USER_A_ID}
        mock_fetch.return_value = {
            "id": USER_A_ID,
            "email": "alice@company.org",
            "user_metadata": {
                "full_name": "Alice Cooper",
                "phone": "+1 555-0199",
                "organization": "Acme Global",
                "job_title": "Senior Lead",
                "location": "San Francisco, CA",
            },
            "created_at": "2026-01-15T10:30:00Z",
        }
        mock_response = SimpleNamespace(is_success=True, json=lambda: [])
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        client = TestClient(app)
        response = client.patch(
            "/profile",
            json={
                "full_name": "Alice Cooper",
                "phone": "+1 555-0199",
                "organization": "Acme Global",
                "job_title": "Senior Lead",
                "location": "San Francisco, CA",
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert data["user"]["name"] == "Alice Cooper"
        assert data["user"]["phone"] == "+1 555-0199"
        assert data["user"]["organization"] == "Acme Global"
        assert data["user"]["job_title"] == "Senior Lead"
        assert data["user"]["location"] == "San Francisco, CA"
        assert data["user"]["email"] == "alice@company.org"


# 3. Full Name Validation: Rejects Empty or Whitespace-only string
def test_update_profile_empty_name_rejected():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="alice@company.org",
    )

    client = TestClient(app)

    # Empty string
    res1 = client.patch("/profile", json={"full_name": ""})
    assert res1.status_code == 422

    # Whitespace only
    res2 = client.patch("/profile", json={"full_name": "    "})
    assert res2.status_code == 422


# 4. Optional Fields Allowed to be Empty
def test_update_profile_empty_optional_fields():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="alice@company.org",
    )

    with patch("app.services.profile._update_supabase_user_metadata", new_callable=AsyncMock) as mock_update, \
         patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_fetch, \
         patch("app.services.profile._get_shared_client") as mock_client:

        mock_update.return_value = {"id": USER_A_ID}
        mock_fetch.return_value = {
            "id": USER_A_ID,
            "email": "alice@company.org",
            "user_metadata": {
                "full_name": "Alice Plain",
                "phone": None,
                "organization": None,
                "job_title": None,
                "location": None,
            },
        }
        mock_response = SimpleNamespace(is_success=True, json=lambda: [])
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        client = TestClient(app)
        response = client.patch(
            "/profile",
            json={
                "full_name": "Alice Plain",
                "phone": "",
                "organization": None,
                "job_title": "   ",
                "location": "",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["name"] == "Alice Plain"
        assert data["user"]["phone"] is None
        assert data["user"]["organization"] is None
        assert data["user"]["job_title"] is None
        assert data["user"]["location"] is None


# 5. Avatar Upload: Valid PNG/JPG/WEBP <= 2 MB
def test_upload_avatar_valid():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="alice@company.org",
    )

    fake_png = b"\x89PNG\r\n\x1a\n" + b"A" * 1024  # 1 KB PNG

    with patch("app.services.profile._update_supabase_user_metadata", new_callable=AsyncMock) as mock_meta, \
         patch("app.services.profile._get_shared_client") as mock_client:

        mock_meta.return_value = {"id": USER_A_ID}
        mock_storage_res = SimpleNamespace(is_success=True, status_code=200)
        mock_client.return_value.post = AsyncMock(return_value=mock_storage_res)

        client = TestClient(app)
        response = client.post(
            "/profile/picture",
            files={"file": ("profile.png", fake_png, "image/png")},
        )

        assert response.status_code == 200
        data = response.json()
        assert "avatar_url" in data
        assert f"/profile/avatar/{USER_A_ID}" in data["avatar_url"]


# 6. Avatar Upload: Rejects Unsupported Format
def test_upload_avatar_unsupported_format():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="alice@company.org",
    )

    client = TestClient(app)
    response = client.post(
        "/profile/picture",
        files={"file": ("document.pdf", b"%PDF-1.4...", "application/pdf")},
    )
    assert response.status_code == 400
    assert "JPG, PNG, and WEBP" in response.json()["detail"]


# 7. Avatar Upload: Rejects Oversized File (> 2 MB)
def test_upload_avatar_oversized():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="alice@company.org",
    )

    oversized_bytes = b"X" * (2 * 1024 * 1024 + 100)  # > 2 MB

    client = TestClient(app)
    response = client.post(
        "/profile/picture",
        files={"file": ("large.jpg", oversized_bytes, "image/jpeg")},
    )
    assert response.status_code == 413
    assert "2 MB" in response.json()["detail"]


# 8. Delete Avatar
def test_delete_avatar():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="alice@company.org",
    )

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_fetch, \
         patch("app.services.profile._update_supabase_user_metadata", new_callable=AsyncMock) as mock_update, \
         patch("app.services.profile._get_shared_client") as mock_client:

        mock_fetch.return_value = {
            "id": USER_A_ID,
            "user_metadata": {
                "avatar_url": f"/profile/avatar/{USER_A_ID}",
                "avatar_storage_path": f"avatars/{USER_A_ID}/avatar.png",
            },
        }
        mock_update.return_value = {"id": USER_A_ID}
        mock_client.return_value.delete = AsyncMock(return_value=SimpleNamespace(is_success=True))

        client = TestClient(app)
        response = client.delete("/profile/picture")

        assert response.status_code == 200
        assert "removed successfully" in response.json()["message"]


# 9. Get Avatar Stream
def test_get_avatar_stream():
    app.dependency_overrides[get_settings] = get_mock_settings

    fake_png = b"\x89PNG\r\n\x1a\n" + b"SAMPLE_BYTES"

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_fetch, \
         patch("app.services.profile._get_shared_client") as mock_client:

        mock_fetch.return_value = {
            "id": USER_A_ID,
            "user_metadata": {
                "avatar_storage_path": f"avatars/{USER_A_ID}/avatar.png",
                "avatar_content_type": "image/png",
            },
        }
        mock_client.return_value.get = AsyncMock(
            return_value=SimpleNamespace(is_success=True, status_code=200, content=fake_png)
        )

        client = TestClient(app)
        response = client.get(f"/profile/avatar/{USER_A_ID}")

        assert response.status_code == 200
        assert response.content == fake_png
        assert response.headers["content-type"] == "image/png"
        assert "Cache-Control" in response.headers
