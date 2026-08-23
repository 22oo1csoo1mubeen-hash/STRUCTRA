"""Comprehensive tests for Profile Backend API (Mini Section 1: Profile Header + Quick Overview).

Validates:
- 401 Unauthorized for unauthenticated requests
- Scoped data access / strict user isolation
- Accurate account metadata (email, member_since, last_login, plan, status)
- Accurate document count and storage bytes aggregation
- Exclusion of deleted/failed documents
- Correct behavior for empty accounts
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
        supabase_secret_key="mock-secret-key",
        supabase_storage_bucket="documents",
    )


# 1. Authentication: 401 Unauthorized
def test_unauthenticated_profile_returns_401():
    app.dependency_overrides.clear()
    client = TestClient(app)
    response = client.get("/profile")
    assert response.status_code == 401


# 2. User Isolation & Correct Profile Hydration
def test_authenticated_profile_returns_real_user_data():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="alice@company.org",
        user_metadata={"full_name": "Alice Cooper", "plan": "Premium"},
        created_at="2026-01-15T10:30:00Z",
        last_sign_in_at="2026-08-20T14:45:00Z",
    )

    mock_docs = [
        {"id": "doc-1", "size": 1048576, "status": "completed"},
        {"id": "doc-2", "size": 2097152, "status": "completed"},
    ]

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_user_fetch, \
         patch("app.services.profile._get_shared_client") as mock_client:
        mock_user_fetch.return_value = None
        mock_response = SimpleNamespace(
            is_success=True,
            json=lambda: mock_docs,
        )
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        client = TestClient(app)
        response = client.get("/profile")

        assert response.status_code == 200
        data = response.json()

        # User identity verification
        assert data["user"]["id"] == USER_A_ID
        assert data["user"]["name"] == "Alice Cooper"
        assert data["user"]["email"] == "alice@company.org"

        # Account details verification
        assert data["account"]["plan"] == "Premium"
        assert data["account"]["status"] == "Active"
        assert data["account"]["member_since"] == "2026-01-15T10:30:00Z"
        assert data["account"]["last_login"] == "2026-08-20T14:45:00Z"

        # Usage metrics verification
        assert data["usage"]["document_count"] == 2
        assert data["usage"]["storage_used_bytes"] == 3145728  # 1MB + 2MB
        assert data["usage"]["storage_limit_bytes"] == 1073741824


# 3. User B gets User B's Data (Zero Cross-Account Leakage)
def test_user_isolation_user_b():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_B_ID,
        email="bob@structra.io",
        user_metadata={"full_name": "Bob Builder", "plan": "Free"},
        created_at="2026-05-10T08:00:00Z",
        last_sign_in_at="2026-08-22T18:00:00Z",
    )

    mock_docs_b = [
        {"id": "doc-b1", "size": 512000, "status": "completed"},
    ]

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_user_fetch, \
         patch("app.services.profile._get_shared_client") as mock_client:
        mock_user_fetch.return_value = None
        mock_response = SimpleNamespace(
            is_success=True,
            json=lambda: mock_docs_b,
        )
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        client = TestClient(app)
        response = client.get("/profile")

        assert response.status_code == 200
        data = response.json()

        assert data["user"]["id"] == USER_B_ID
        assert data["user"]["name"] == "Bob Builder"
        assert data["user"]["email"] == "bob@structra.io"
        assert data["account"]["plan"] == "Free"
        assert data["usage"]["document_count"] == 1
        assert data["usage"]["storage_used_bytes"] == 512000


# 4. Empty Account
def test_empty_account():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="newuser@example.com",
    )

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_user_fetch, \
         patch("app.services.profile._get_shared_client") as mock_client:
        mock_user_fetch.return_value = None
        mock_response = SimpleNamespace(
            is_success=True,
            json=lambda: [],
        )
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        client = TestClient(app)
        response = client.get("/profile")

        assert response.status_code == 200
        data = response.json()

        assert data["user"]["name"] == "newuser"
        assert data["user"]["email"] == "newuser@example.com"
        assert data["usage"]["document_count"] == 0
        assert data["usage"]["storage_used_bytes"] == 0


# 5. Failed and Deleted Documents are Excluded
def test_failed_and_deleted_documents_excluded():
    app.dependency_overrides[get_settings] = get_mock_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        user_id=USER_A_ID,
        email="test@example.com",
    )

    mock_mixed_docs = [
        {"id": "doc-active-1", "size": 1000, "status": "completed"},
        {"id": "doc-active-2", "size": 2000, "status": "pending"},
        {"id": "doc-failed", "size": 50000, "status": "failed"},
        {"id": "doc-deleted", "size": 80000, "status": "deleted"},
    ]

    with patch("app.services.profile._fetch_supabase_user_record", new_callable=AsyncMock) as mock_user_fetch, \
         patch("app.services.profile._get_shared_client") as mock_client:
        mock_user_fetch.return_value = None
        mock_response = SimpleNamespace(
            is_success=True,
            json=lambda: mock_mixed_docs,
        )
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        client = TestClient(app)
        response = client.get("/profile")

        assert response.status_code == 200
        data = response.json()

        # Only active docs (1000 + 2000) are counted
        assert data["usage"]["document_count"] == 2
        assert data["usage"]["storage_used_bytes"] == 3000
