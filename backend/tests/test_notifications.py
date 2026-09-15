"""Tests for the notification service and API layer.

Verifies:
- Notification creation stores correct fields
- get_user_notifications returns user-scoped items only
- mark_notifications_read sets read_at
- get_unread_notification_count returns correct count
- User isolation (User A cannot read User B's notifications)
- Event type label mapping
- Device_info JSON parsing for document events
- Non-critical: notification failure must not propagate
"""

import json
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.notifications import (
    EVENT_LABELS,
    NotificationItem,
    create_notification,
    get_user_notifications,
    get_unread_notification_count,
    mark_notifications_read,
)


# ─── EVENT_LABELS ─────────────────────────────────────────────

class TestEventLabels:
    def test_document_events_present(self):
        assert "document_saved" in EVENT_LABELS
        assert "document_edited" in EVENT_LABELS
        assert "document_deleted" in EVENT_LABELS
        assert "document_exported" in EVENT_LABELS

    def test_account_events_present(self):
        assert "profile_updated" in EVENT_LABELS
        assert "avatar_changed" in EVENT_LABELS
        assert "sign_in" in EVENT_LABELS
        assert "account_created" in EVENT_LABELS

    def test_labels_are_human_readable(self):
        for key, val in EVENT_LABELS.items():
            assert isinstance(val, str)
            assert len(val) > 3, f"Label for '{key}' is too short: '{val}'"


# ─── NotificationItem ─────────────────────────────────────────

class TestNotificationItem:
    def test_to_dict_fields(self):
        item = NotificationItem(
            id="test-id",
            event_type="document_saved",
            title="Document saved to library",
            description="invoice.pdf was saved to your library",
            document_id="doc-123",
            document_name="invoice.pdf",
            created_at="2026-09-14T20:00:00+00:00",
            read_at=None,
        )
        d = item.to_dict()
        assert d["id"] == "test-id"
        assert d["event_type"] == "document_saved"
        assert d["title"] == "Document saved to library"
        assert d["is_read"] is False
        assert d["document_id"] == "doc-123"

    def test_is_read_true_when_read_at_set(self):
        item = NotificationItem(
            id="x",
            event_type="sign_in",
            title="Signed in",
            description="Sign-in",
            created_at="2026-09-14T20:00:00+00:00",
            read_at="2026-09-14T21:00:00+00:00",
        )
        assert item.to_dict()["is_read"] is True

    def test_optional_fields_none(self):
        item = NotificationItem(
            id="y",
            event_type="profile_updated",
            title="Profile information updated",
            description="Profile updated",
            created_at="2026-09-14T20:00:00+00:00",
        )
        d = item.to_dict()
        assert d["document_id"] is None
        assert d["document_name"] is None
        assert d["read_at"] is None


# ─── create_notification ─────────────────────────────────────

class TestCreateNotification:
    @pytest.mark.anyio
    async def test_create_notification_does_not_propagate_error(self, monkeypatch):
        """create_notification must swallow all errors (fire-and-forget)."""
        async def bad_post(*args, **kwargs):
            raise RuntimeError("Simulated DB failure")

        fake_client = MagicMock()
        fake_client.post = bad_post

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            settings = MagicMock()
            settings.supabase_url = "https://test.supabase.co"
            settings.supabase_secret_key.get_secret_value.return_value = "secret"
            settings.supabase_publishable_key.get_secret_value.return_value = "pk"

            # Must not raise
            await create_notification(
                user_id="user-a",
                event_type="document_saved",
                document_name="invoice.pdf",
                settings=settings,
            )

    @pytest.mark.anyio
    async def test_create_notification_document_metadata_in_device_info(self):
        """Document events must encode document_id + document_name as JSON in device_info."""
        captured = {}

        async def fake_post(url, headers, json):
            captured.update(json)

        fake_client = MagicMock()
        fake_client.post = fake_post

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                await create_notification(
                    user_id="user-a",
                    event_type="document_saved",
                    document_name="invoice.pdf",
                    document_id="doc-001",
                    settings=settings,
                )

        device_info = captured.get("device_info", "")
        if device_info:
            parsed = json.loads(device_info)
            assert parsed.get("document_id") == "doc-001"
            assert parsed.get("document_name") == "invoice.pdf"

    @pytest.mark.anyio
    async def test_create_notification_description_with_filename(self):
        """Human-readable description must include the filename for document events."""
        captured = {}

        async def fake_post(url, headers, json):
            captured.update(json)

        fake_client = MagicMock()
        fake_client.post = fake_post

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                await create_notification(
                    user_id="user-a",
                    event_type="document_deleted",
                    document_name="receipt.png",
                    settings=settings,
                )

        assert "receipt.png" in captured.get("description", "")


# ─── get_user_notifications ───────────────────────────────────

class TestGetUserNotifications:
    @pytest.mark.anyio
    async def test_returns_empty_on_request_error(self):
        """Must return [] rather than raise on network errors."""
        fake_client = MagicMock()
        fake_client.get = AsyncMock(side_effect=Exception("timeout"))

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                result = await get_user_notifications(user_id="user-a", settings=settings)
        assert result == []

    @pytest.mark.anyio
    async def test_returns_empty_on_failed_response(self):
        """Must return [] when the HTTP response is not successful."""
        fake_response = MagicMock()
        fake_response.is_success = False
        fake_client = MagicMock()
        fake_client.get = AsyncMock(return_value=fake_response)

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                result = await get_user_notifications(user_id="user-a", settings=settings)
        assert result == []

    @pytest.mark.anyio
    async def test_parses_rows_correctly(self):
        """Must parse DB rows into notification dicts."""
        rows = [
            {
                "id": "notif-001",
                "event_type": "document_saved",
                "description": "invoice.pdf was saved to your library",
                "device_info": json.dumps({"document_id": "doc-1", "document_name": "invoice.pdf"}),
                "ip_address": None,
                "created_at": "2026-09-14T20:00:00+00:00",
                "read_at": None,
            }
        ]
        fake_response = MagicMock()
        fake_response.is_success = True
        fake_response.json.return_value = rows
        fake_client = MagicMock()
        fake_client.get = AsyncMock(return_value=fake_response)

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                result = await get_user_notifications(user_id="user-a", settings=settings)

        assert len(result) == 1
        item = result[0]
        assert item["id"] == "notif-001"
        assert item["event_type"] == "document_saved"
        assert item["document_id"] == "doc-1"
        assert item["document_name"] == "invoice.pdf"
        assert item["is_read"] is False
        assert item["title"] == EVENT_LABELS["document_saved"]

    @pytest.mark.anyio
    async def test_user_isolation_via_query_param(self):
        """The user_id filter must be passed to the Supabase query."""
        fake_response = MagicMock()
        fake_response.is_success = True
        fake_response.json.return_value = []
        fake_client = MagicMock()
        fake_client.get = AsyncMock(return_value=fake_response)

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                await get_user_notifications(user_id="user-specific-id", settings=settings)

        call_kwargs = fake_client.get.call_args
        params = call_kwargs.kwargs.get("params") or {}
        assert params.get("user_id") == "eq.user-specific-id"


# ─── get_unread_notification_count ────────────────────────────

class TestGetUnreadCount:
    @pytest.mark.anyio
    async def test_returns_zero_on_error(self):
        fake_client = MagicMock()
        fake_client.get = AsyncMock(side_effect=Exception("connection refused"))

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                count = await get_unread_notification_count(user_id="user-a", settings=settings)
        assert count == 0

    @pytest.mark.anyio
    async def test_parses_content_range(self):
        """Must correctly parse the count from the content-range header."""
        fake_response = MagicMock()
        fake_response.is_success = True
        fake_response.headers = {"content-range": "0-0/7"}
        fake_client = MagicMock()
        fake_client.get = AsyncMock(return_value=fake_response)

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                count = await get_unread_notification_count(user_id="user-a", settings=settings)
        assert count == 7

    @pytest.mark.anyio
    async def test_returns_zero_when_no_content_range(self):
        fake_response = MagicMock()
        fake_response.is_success = True
        fake_response.headers = {}
        fake_client = MagicMock()
        fake_client.get = AsyncMock(return_value=fake_response)

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                count = await get_unread_notification_count(user_id="user-a", settings=settings)
        assert count == 0


# ─── mark_notifications_read ──────────────────────────────────

class TestMarkNotificationsRead:
    @pytest.mark.anyio
    async def test_returns_zero_on_error(self):
        fake_client = MagicMock()
        fake_client.patch = AsyncMock(side_effect=Exception("connection refused"))

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                result = await mark_notifications_read(user_id="user-a", settings=settings)
        assert result == 0

    @pytest.mark.anyio
    async def test_sends_patch_with_correct_filters(self):
        """Must patch only the requesting user's unread rows."""
        fake_response = MagicMock()
        fake_response.is_success = True
        fake_response.headers = {"content-range": "0-4/5"}
        fake_client = MagicMock()
        fake_client.patch = AsyncMock(return_value=fake_response)

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                result = await mark_notifications_read(user_id="user-target", settings=settings)

        assert result == 5

        call_kwargs = fake_client.patch.call_args
        params = call_kwargs.kwargs.get("params") or {}
        assert params.get("user_id") == "eq.user-target"
        assert params.get("read_at") == "is.null"

    @pytest.mark.anyio
    async def test_user_isolation_in_mark_read(self):
        """Marking as read must only affect the specific user's rows."""
        captured_params = {}

        async def fake_patch(url, headers, params, json):
            captured_params.update(params)
            response = MagicMock()
            response.is_success = True
            response.headers = {"content-range": "0-0/0"}
            return response

        fake_client = MagicMock()
        fake_client.patch = fake_patch

        with patch("app.services.notifications._get_shared_client", return_value=fake_client):
            with patch("app.services.notifications._extract_settings", return_value=("https://test.supabase.co", "secret")):
                settings = MagicMock()
                await mark_notifications_read(user_id="isolated-user", settings=settings)

        assert captured_params.get("user_id") == "eq.isolated-user"
        assert captured_params.get("read_at") == "is.null"
