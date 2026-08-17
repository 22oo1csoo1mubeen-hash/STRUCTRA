"""Targeted tests for Spending Chart chronological date ordering across all periods."""

from datetime import datetime, UTC
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.document_metadata import CreatedDocumentMetadata

USER_A_ID = "00000000-0000-0000-0000-000000000001"


@pytest.fixture
def client_user_a() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
    )
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_A_ID)
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def _make_doc(date_str: str, total: float) -> CreatedDocumentMetadata:
    doc_id = uuid4()
    return CreatedDocumentMetadata(
        id=doc_id,
        user_id=UUID(USER_A_ID),
        filename=f"receipt_{date_str}.png",
        storage_path=f"test/{date_str}.png",
        content_type="image/png",
        size=1024,
        status="completed",
        created_at=datetime.fromisoformat(f"{date_str}T10:00:00+00:00"),
        extraction_result={
            "vendor_company": "Test Vendor",
            "date": date_str,
            "total": total,
        },
        quality_result={
            "confidence_level": "HIGH",
            "overall_confidence": 0.95,
        },
    )


def test_day_period_multi_year_chronological_ordering(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """DAY period returns points strictly sorted by start_date ascending, even across multiple years."""
    # Provide documents out of order spanning 2015 to 2026
    raw_dates = [
        ("2026-08-16", 100.0),
        ("2015-06-06", 50.0),
        ("2025-08-12", 200.0),
        ("2026-07-29", 300.0),
        ("2025-08-09", 75.0),
        ("2025-08-10", 125.0),
    ]
    docs = [_make_doc(d, amt) for d, amt in raw_dates]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/spending?period=day")
    assert response.status_code == 200
    data = response.json()
    points = data["data"]

    start_dates = [p["start_date"] for p in points]
    expected_dates = [
        "2015-06-06",
        "2025-08-09",
        "2025-08-10",
        "2025-08-12",
        "2026-07-29",
        "2026-08-16",
    ]
    assert start_dates == expected_dates

    # Check total spend
    assert data["total_spent"] == 850.0


def test_week_period_multi_year_chronological_ordering(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """WEEK period returns points strictly sorted chronologically."""
    raw_dates = [
        ("2026-01-15", 100.0),
        ("2024-12-20", 200.0),
        ("2025-06-10", 300.0),
    ]
    docs = [_make_doc(d, amt) for d, amt in raw_dates]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/spending?period=week")
    assert response.status_code == 200
    data = response.json()
    points = data["data"]

    start_dates = [p["start_date"] for p in points]
    assert start_dates == sorted(start_dates)
    assert len(points) == 3


def test_month_period_multi_year_chronological_ordering(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """MONTH period returns points sorted chronologically across multiple years."""
    raw_dates = [
        ("2026-02-10", 150.0),
        ("2025-11-05", 250.0),
        ("2024-03-20", 350.0),
        ("2025-04-12", 450.0),
    ]
    docs = [_make_doc(d, amt) for d, amt in raw_dates]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/spending?period=month")
    assert response.status_code == 200
    data = response.json()
    points = data["data"]

    start_dates = [p["start_date"] for p in points]
    expected_start_dates = [
        "2024-03-01",
        "2025-04-01",
        "2025-11-01",
        "2026-02-01",
    ]
    assert start_dates == expected_start_dates


def test_year_period_chronological_ordering(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """YEAR period returns points sorted chronologically by calendar year."""
    raw_dates = [
        ("2026-08-01", 100.0),
        ("2023-05-12", 200.0),
        ("2025-01-10", 300.0),
        ("2024-09-18", 400.0),
    ]
    docs = [_make_doc(d, amt) for d, amt in raw_dates]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/spending?period=year")
    assert response.status_code == 200
    data = response.json()
    points = data["data"]

    start_dates = [p["start_date"] for p in points]
    expected_start_dates = [
        "2023-01-01",
        "2024-01-01",
        "2025-01-01",
        "2026-01-01",
    ]
    assert start_dates == expected_start_dates
