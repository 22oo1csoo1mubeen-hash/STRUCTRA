"""Milestone 7.2: Spending & Purchase Analytics Backend Tests.

Validates daily/weekly/monthly/yearly spending time series, vendor spending breakdowns,
item purchase aggregations, purchase highlights, deterministic ordering, user isolation,
and Decimal mathematical precision.
"""

import re
from datetime import UTC, datetime
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.api.routes import documents as document_routes
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.document_metadata import CreatedDocumentMetadata
from app.services.storage import build_document_storage_path

USER_A_ID = "00000000-0000-0000-0000-00000000007a"
USER_B_ID = "00000000-0000-0000-0000-00000000007b"


def _make_persisted_doc(
    user_id_str: str = USER_A_ID,
    *,
    doc_id: UUID | None = None,
    filename: str = "receipt.pdf",
    status_str: str = "completed",
    total: float | None = 100.0,
    vendor: str | None = "Amazon",
    date_str: str | None = "2026-03-15",
    line_items: list[dict] | None = None,
    overall_confidence: float | None = 0.95,
    confidence_level: str | None = "HIGH",
    system_confidence_level: str | None = None,
    confidence_override: str | None = None,
    needs_review: bool | None = None,
    created_at: datetime | None = None,
) -> CreatedDocumentMetadata:
    """Helper to create a persisted document metadata record for analytics testing."""
    d_id = doc_id or uuid4()
    ext_result = None
    if total is not None or vendor is not None or line_items is not None or date_str is not None:
        ext_result = {
            "vendor_company": vendor,
            "address": "123 Tech Park",
            "invoice_number": f"INV-{str(d_id)[:8]}",
            "date": date_str,
            "subtotal": total,
            "tax": 0.0,
            "total": total,
            "line_items": line_items if line_items is not None else [
                {"description": "Item A", "quantity": 1.0, "unit_price": total, "line_total": total}
            ],
        }

    qual_result = None
    sys_level = system_confidence_level if system_confidence_level is not None else confidence_level
    eff_review = needs_review if needs_review is not None else (False if (confidence_override or sys_level) == "HIGH" else True)

    if overall_confidence is not None or confidence_level is not None or confidence_override is not None:
        qual_result = {
            "overall_confidence": overall_confidence,
            "confidence_level": confidence_override or sys_level or confidence_level,
            "system_confidence": overall_confidence,
            "system_confidence_level": sys_level,
            "confidence_override": confidence_override,
            "needs_review": eff_review,
        }

    return CreatedDocumentMetadata(
        id=d_id,
        user_id=UUID(user_id_str),
        filename=filename,
        storage_path=build_document_storage_path(user_id_str, filename, document_id=d_id),
        content_type="application/pdf",
        size=2048,
        status=status_str,
        created_at=created_at or datetime(2026, 3, 15, 10, 0, 0, tzinfo=UTC),
        processed_at=created_at or datetime(2026, 3, 15, 10, 0, 0, tzinfo=UTC),
        content_hash=f"hash_{d_id}",
        extraction_result=ext_result,
        quality_result=qual_result,
    )


def get_user_client(user_id: str) -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
    )
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=user_id)
    return TestClient(app)


@pytest.fixture
def client_user_a() -> TestClient:
    client = get_user_client(USER_A_ID)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def client_user_b() -> TestClient:
    client = get_user_client(USER_B_ID)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client() -> TestClient:
    app.dependency_overrides.clear()
    with TestClient(app) as test_client:
        yield test_client


# ─── TEST 1: Empty Spending & Analytics ───────────────────────────────────────

def test_empty_spending_analytics(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User with no saved documents receives 200 with empty series and 0 total."""
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[]),
    )

    # Spending
    res_spending = client_user_a.get("/dashboard/spending?period=month")
    assert res_spending.status_code == 200
    d_sp = res_spending.json()
    assert d_sp["period"] == "month"
    assert d_sp["data"] == []
    assert d_sp["total_spent"] == 0.0

    # Vendors
    res_vendors = client_user_a.get("/dashboard/vendors")
    assert res_vendors.status_code == 200
    d_v = res_vendors.json()
    assert d_v["vendors"] == []
    assert d_v["total_spent"] == 0.0

    # Items
    res_items = client_user_a.get("/dashboard/items")
    assert res_items.status_code == 200
    d_it = res_items.json()
    assert d_it["items"] == []
    assert d_it["total_item_spend"] == 0.0

    # Highlights
    res_hl = client_user_a.get("/dashboard/highlights")
    assert res_hl.status_code == 200
    d_hl = res_hl.json()
    assert d_hl["most_expensive_item"] is None
    assert d_hl["most_expensive_receipt"] is None


# ─── TEST 2: Daily Spending Aggregation ───────────────────────────────────────

def test_daily_spending_aggregation(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Period=day groups spending by exact calendar day (combining same-day receipts)."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-03-10", total=200.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-03-10", total=300.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-03-11", total=450.0),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/spending?period=day")
    assert response.status_code == 200
    data = response.json()
    assert data["period"] == "day"
    assert data["total_spent"] == 950.0
    assert len(data["data"]) == 2

    assert data["data"][0]["start_date"] == "2026-03-10"
    assert data["data"][0]["amount"] == 500.0
    assert data["data"][0]["document_count"] == 2

    assert data["data"][1]["start_date"] == "2026-03-11"
    assert data["data"][1]["amount"] == 450.0
    assert data["data"][1]["document_count"] == 1


# ─── TEST 3: Weekly Spending Aggregation (ISO Weeks) ─────────────────────────

def test_weekly_spending_aggregation(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Period=week groups documents into ISO calendar weeks (Monday to Sunday)."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-03-10", total=500.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-03-14", total=250.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-03-18", total=1000.0),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/spending?period=week")
    assert response.status_code == 200
    data = response.json()
    assert data["period"] == "week"
    assert data["total_spent"] == 1750.0
    assert len(data["data"]) == 2

    assert data["data"][0]["start_date"] == "2026-03-09"
    assert data["data"][0]["end_date"] == "2026-03-15"
    assert data["data"][0]["amount"] == 750.0
    assert data["data"][0]["document_count"] == 2

    assert data["data"][1]["start_date"] == "2026-03-16"
    assert data["data"][1]["end_date"] == "2026-03-22"
    assert data["data"][1]["amount"] == 1000.0
    assert data["data"][1]["document_count"] == 1


# ─── TEST 4: Monthly Spending Aggregation ─────────────────────────────────────

def test_monthly_spending_aggregation(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Period=month groups spending by calendar month."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-01-15", total=12500.50),
        _make_persisted_doc(USER_A_ID, date_str="2026-02-20", total=8000.00),
        _make_persisted_doc(USER_A_ID, date_str="2026-03-05", total=5000.00),
        _make_persisted_doc(USER_A_ID, date_str="2026-03-25", total=4500.00),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/spending?period=month")
    assert response.status_code == 200
    data = response.json()
    assert data["period"] == "month"
    assert data["total_spent"] == 30000.50
    assert len(data["data"]) == 3

    assert data["data"][0]["label"] == "Jan 2026"
    assert data["data"][0]["amount"] == 12500.50
    assert data["data"][0]["document_count"] == 1

    assert data["data"][1]["label"] == "Feb 2026"
    assert data["data"][1]["amount"] == 8000.0
    assert data["data"][1]["document_count"] == 1

    assert data["data"][2]["label"] == "Mar 2026"
    assert data["data"][2]["amount"] == 9500.0
    assert data["data"][2]["document_count"] == 2


# ─── TEST 5: Yearly Spending Aggregation ──────────────────────────────────────

def test_yearly_spending_aggregation(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Period=year groups spending by calendar year."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2024-06-15", total=50000.0),
        _make_persisted_doc(USER_A_ID, date_str="2025-08-20", total=85000.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-01-10", total=42000.0),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/spending?period=year")
    assert response.status_code == 200
    data = response.json()
    assert data["period"] == "year"
    assert data["total_spent"] == 177000.0
    assert len(data["data"]) == 3

    assert data["data"][0]["label"] == "2024"
    assert data["data"][0]["amount"] == 50000.0

    assert data["data"][1]["label"] == "2025"
    assert data["data"][1]["amount"] == 85000.0

    assert data["data"][2]["label"] == "2026"
    assert data["data"][2]["amount"] == 42000.0


# ─── TEST 6: Chronological Ordering ──────────────────────────────────────────

def test_spending_time_series_chronological_ordering(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Unordered input documents are sorted chronologically in the output."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-05-01", total=100.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-01-01", total=200.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-03-01", total=300.0),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/spending?period=month")
    assert response.status_code == 200
    data = response.json()
    assert [p["label"] for p in data["data"]] == ["Jan 2026", "Mar 2026", "May 2026"]


# ─── TEST 7: Vendor Spending Breakdown & Percentage ───────────────────────────

def test_vendor_spending_breakdown_and_percentage(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Vendors are ranked with correct spend, document counts, and percentage of total."""
    docs = [
        _make_persisted_doc(USER_A_ID, vendor="Amazon", total=6000.0),
        _make_persisted_doc(USER_A_ID, vendor="Amazon", total=4000.0),  # Amazon: 10,000 (50%)
        _make_persisted_doc(USER_A_ID, vendor="DMart", total=6000.0),   # DMart: 6,000 (30%)
        _make_persisted_doc(USER_A_ID, vendor="Apple", total=4000.0),   # Apple: 4,000 (20%)
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/vendors")
    assert response.status_code == 200
    data = response.json()
    assert data["total_spent"] == 20000.0
    assert len(data["vendors"]) == 3

    assert data["vendors"][0]["vendor"] == "Amazon"
    assert data["vendors"][0]["total_spent"] == 10000.0
    assert data["vendors"][0]["document_count"] == 2
    assert data["vendors"][0]["percentage_of_total"] == 50.0

    assert data["vendors"][1]["vendor"] == "DMart"
    assert data["vendors"][1]["total_spent"] == 6000.0
    assert data["vendors"][1]["document_count"] == 1
    assert data["vendors"][1]["percentage_of_total"] == 30.0

    assert data["vendors"][2]["vendor"] == "Apple"
    assert data["vendors"][2]["total_spent"] == 4000.0
    assert data["vendors"][2]["document_count"] == 1
    assert data["vendors"][2]["percentage_of_total"] == 20.0


# ─── TEST 8: Vendor Normalization ─────────────────────────────────────────────

def test_vendor_normalization_across_casing_and_spaces(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """'Amazon', 'AMAZON', and '  amazon  ' merge into a single vendor."""
    docs = [
        _make_persisted_doc(USER_A_ID, vendor="Amazon", total=100.0),
        _make_persisted_doc(USER_A_ID, vendor="AMAZON", total=200.0),
        _make_persisted_doc(USER_A_ID, vendor="  amazon  ", total=300.0),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/vendors")
    assert response.status_code == 200
    data = response.json()
    assert len(data["vendors"]) == 1
    v = data["vendors"][0]
    assert v["vendor"].casefold() == "amazon"
    assert v["total_spent"] == 600.0
    assert v["document_count"] == 3
    assert v["percentage_of_total"] == 100.0


# ─── TEST 9: Vendor Deterministic Tie-Breaking ────────────────────────────────

def test_vendor_deterministic_tie_breaking(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Vendors with equal spend break ties alphabetically by name."""
    docs = [
        _make_persisted_doc(USER_A_ID, vendor="Zeta Supplies", total=500.0),
        _make_persisted_doc(USER_A_ID, vendor="Alpha Supplies", total=500.0),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard/vendors")
    assert response.status_code == 200
    data = response.json()
    assert data["vendors"][0]["vendor"] == "Alpha Supplies"
    assert data["vendors"][1]["vendor"] == "Zeta Supplies"


# ─── TEST 10: Most Purchased Items Quantity Aggregation ───────────────────────

def test_most_purchased_items_quantity_aggregation(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Item quantities aggregate correctly across documents."""
    doc1 = _make_persisted_doc(
        USER_A_ID,
        line_items=[
            {"description": "Organic Milk", "quantity": 10.0, "unit_price": 2.0, "line_total": 20.0},
            {"description": "Brown Bread", "quantity": 2.0, "unit_price": 3.0, "line_total": 6.0},
        ],
    )
    doc2 = _make_persisted_doc(
        USER_A_ID,
        line_items=[
            {"description": "Organic Milk", "quantity": 14.0, "unit_price": 2.0, "line_total": 28.0},
            {"description": "Brown Bread", "quantity": 8.0, "unit_price": 3.0, "line_total": 24.0},
        ],
    )
    # Milk: 10 + 14 = 24 (2 docs, total_spent = 48)
    # Bread: 2 + 8 = 10 (2 docs, total_spent = 30)

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc1, doc2]),
    )

    response = client_user_a.get("/dashboard/items")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2

    assert data["items"][0]["name"] == "Organic Milk"
    assert data["items"][0]["quantity"] == 24.0
    assert data["items"][0]["document_count"] == 2
    assert data["items"][0]["total_spent"] == 48.0

    assert data["items"][1]["name"] == "Brown Bread"
    assert data["items"][1]["quantity"] == 10.0
    assert data["items"][1]["document_count"] == 2
    assert data["items"][1]["total_spent"] == 30.0

    assert data["total_item_spend"] == 78.0


# ─── TEST 11: Item Normalization ──────────────────────────────────────────────

def test_item_normalization_case_and_whitespace(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """'Milk', '  MILK  ', and 'milk' merge into one item."""
    doc1 = _make_persisted_doc(USER_A_ID, line_items=[{"description": "Milk", "quantity": 5.0, "line_total": 10.0}])
    doc2 = _make_persisted_doc(USER_A_ID, line_items=[{"description": "  MILK  ", "quantity": 3.0, "line_total": 6.0}])
    doc3 = _make_persisted_doc(USER_A_ID, line_items=[{"description": "milk", "quantity": 2.0, "line_total": 4.0}])

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc1, doc2, doc3]),
    )

    response = client_user_a.get("/dashboard/items")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["name"].casefold() == "milk"
    assert data["items"][0]["quantity"] == 10.0
    assert data["items"][0]["document_count"] == 3
    assert data["items"][0]["total_spent"] == 20.0


# ─── TEST 12: Item Spending Aggregation from Unit Price ───────────────────────

def test_item_spending_calculates_from_unit_price_when_line_total_missing(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If line_total is missing, calculates total from unit_price * quantity."""
    doc = _make_persisted_doc(
        USER_A_ID,
        line_items=[
            {"description": "Custom Widget", "quantity": 4.0, "unit_price": 25.0, "line_total": None}
        ],
    )
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc]),
    )

    response = client_user_a.get("/dashboard/items")
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["total_spent"] == 100.0


# ─── TEST 13 & 14: Purchase Highlights (Item & Receipt) ───────────────────────

def test_purchase_highlights_endpoint(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """GET /dashboard/highlights returns most expensive item and most expensive receipt."""
    doc1 = _make_persisted_doc(
        USER_A_ID,
        vendor="Amazon",
        total=200.0,
        filename="rec1.pdf",
        date_str="2026-03-01",
        line_items=[
            {"description": "USB Cable", "quantity": 1.0, "line_total": 15.0},
            {"description": "Wireless Keyboard", "quantity": 1.0, "line_total": 85.0},
        ],
    )
    doc2 = _make_persisted_doc(
        USER_A_ID,
        vendor="Apple Store",
        total=1500.0,
        filename="macbook.pdf",
        date_str="2026-03-10",
        line_items=[
            {"description": "MacBook Air M3", "quantity": 1.0, "line_total": 1400.0},
            {"description": "AppleCare+", "quantity": 1.0, "line_total": 100.0},
        ],
    )

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc1, doc2]),
    )

    response = client_user_a.get("/dashboard/highlights")
    assert response.status_code == 200
    data = response.json()

    exp_item = data["most_expensive_item"]
    assert exp_item is not None
    assert exp_item["name"] == "MacBook Air M3"
    assert exp_item["amount"] == 1400.0
    assert exp_item["vendor"] == "Apple Store"
    assert exp_item["document_id"] == str(doc2.id)

    exp_rec = data["most_expensive_receipt"]
    assert exp_rec is not None
    assert exp_rec["document_id"] == str(doc2.id)
    assert exp_rec["filename"] == "macbook.pdf"
    assert exp_rec["vendor"] == "Apple Store"
    assert exp_rec["total_amount"] == 1500.0


# ─── TEST 15: Missing Document Date Fallback ──────────────────────────────────

def test_missing_document_date_falls_back_to_created_at(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Documents with null/invalid extracted date fall back deterministically to created_at."""
    created_dt = datetime(2026, 4, 18, 12, 0, 0, tzinfo=UTC)
    doc = _make_persisted_doc(
        USER_A_ID,
        date_str=None,  # No extracted date
        created_at=created_dt,
        total=500.0,
    )
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc]),
    )

    response = client_user_a.get("/dashboard/spending?period=month")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 1
    assert data["total_spent"] == 500.0
    assert data["data"][0]["label"] == "Apr 2026"
    assert data["data"][0]["start_date"] == "2026-04-01"
    assert data["data"][0]["amount"] == 500.0


# ─── TEST 16, 17, 18: Malformed / Missing Fields Safety ───────────────────────

def test_malformed_and_missing_extraction_data_safety(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Documents with missing vendor, missing line items, corrupted fields do not crash any endpoint."""
    doc1 = _make_persisted_doc(USER_A_ID, vendor=None, total=None, line_items=[])
    doc2 = _make_persisted_doc(
        USER_A_ID,
        vendor="",
        total=150.0,
        line_items=[
            {"description": "", "quantity": None, "line_total": None},
            {"description": "Valid Item", "quantity": "invalid_qty", "line_total": "150.0"},
        ],
    )
    doc3 = CreatedDocumentMetadata(
        id=uuid4(),
        user_id=UUID(USER_A_ID),
        filename="empty.pdf",
        storage_path=f"{USER_A_ID}/empty/original.pdf",
        content_type="application/pdf",
        size=1024,
        status="pending",
        created_at=datetime.now(UTC),
        extraction_result=None,
        quality_result=None,
    )

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc1, doc2, doc3]),
    )

    # All endpoints must return 200 OK without unhandled exceptions
    r_sp = client_user_a.get("/dashboard/spending?period=month")
    assert r_sp.status_code == 200
    assert r_sp.json()["total_spent"] == 150.0

    r_v = client_user_a.get("/dashboard/vendors")
    assert r_v.status_code == 200

    r_it = client_user_a.get("/dashboard/items")
    assert r_it.status_code == 200
    assert len(r_it.json()["items"]) == 1
    assert r_it.json()["items"][0]["name"] == "Valid Item"
    assert r_it.json()["items"][0]["quantity"] == 1.0  # defaults to 1 when malformed
    assert r_it.json()["items"][0]["total_spent"] == 150.0

    r_hl = client_user_a.get("/dashboard/highlights")
    assert r_hl.status_code == 200


# ─── TEST 19: Decimal Precision ───────────────────────────────────────────────

def test_decimal_precision_across_analytics(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Monetary aggregation maintains exact decimal precision without floating point drift."""
    docs = [
        _make_persisted_doc(USER_A_ID, total=0.10, vendor="Shop A"),
        _make_persisted_doc(USER_A_ID, total=0.20, vendor="Shop A"),
        _make_persisted_doc(USER_A_ID, total=0.30, vendor="Shop B"),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    res_spending = client_user_a.get("/dashboard/spending?period=month")
    assert res_spending.json()["total_spent"] == 0.60

    res_vendors = client_user_a.get("/dashboard/vendors")
    assert res_vendors.json()["total_spent"] == 0.60
    assert res_vendors.json()["vendors"][0]["total_spent"] == 0.30


# ─── TEST 20: Unsaved Upload Sessions Excluded ────────────────────────────────

def test_unsaved_sessions_excluded_from_analytics(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Temporary upload sessions not persisted in DB never appear in analytics."""
    persisted_doc = _make_persisted_doc(USER_A_ID, total=100.0, vendor="Persisted Vendor")
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[persisted_doc]),
    )

    temp_id = uuid4()
    document_routes._register_temp_upload_session(
        document_id=temp_id,
        user_id=USER_A_ID,
        filename="temp.pdf",
        storage_path=f"{USER_A_ID}/{temp_id}/original.pdf",
        content_type="application/pdf",
        size=1024,
        content_hash="temp_hash",
        created_at=datetime.now(UTC),
    )

    res_v = client_user_a.get("/dashboard/vendors")
    assert res_v.json()["total_spent"] == 100.0
    assert len(res_v.json()["vendors"]) == 1
    assert res_v.json()["vendors"][0]["vendor"] == "Persisted Vendor"

    document_routes._remove_temp_upload_session(temp_id)


# ─── TEST 21: Strict User Isolation ───────────────────────────────────────────

def test_strict_user_isolation_for_all_analytics(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """User A cannot see User B's spending, vendors, items, or highlights."""
    doc_a = _make_persisted_doc(
        USER_A_ID,
        vendor="Vendor User A",
        total=100.0,
        line_items=[{"description": "Item User A", "quantity": 1.0, "line_total": 100.0}],
    )
    doc_b = _make_persisted_doc(
        USER_B_ID,
        vendor="Vendor User B",
        total=900.0,
        line_items=[{"description": "Item User B", "quantity": 5.0, "line_total": 900.0}],
    )

    async def mock_get_docs(*, params, settings):
        uid = params.get("user_id")
        if uid == f"eq.{USER_A_ID}":
            return [doc_a]
        elif uid == f"eq.{USER_B_ID}":
            return [doc_b]
        return []

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        mock_get_docs,
    )

    # User A requests
    client_a = get_user_client(USER_A_ID)
    r_sp_a = client_a.get("/dashboard/spending?period=month")
    assert r_sp_a.json()["total_spent"] == 100.0

    r_v_a = client_a.get("/dashboard/vendors")
    assert r_v_a.json()["vendors"][0]["vendor"] == "Vendor User A"

    r_it_a = client_a.get("/dashboard/items")
    assert r_it_a.json()["items"][0]["name"] == "Item User A"

    # User B requests
    client_b = get_user_client(USER_B_ID)
    r_sp_b = client_b.get("/dashboard/spending?period=month")
    assert r_sp_b.json()["total_spent"] == 900.0

    r_v_b = client_b.get("/dashboard/vendors")
    assert r_v_b.json()["vendors"][0]["vendor"] == "Vendor User B"

    r_it_b = client_b.get("/dashboard/items")
    assert r_it_b.json()["items"][0]["name"] == "Item User B"
    app.dependency_overrides.clear()


# ─── TEST 22: Authentication Required ─────────────────────────────────────────

def test_analytics_endpoints_require_authentication(
    unauthenticated_client: TestClient,
) -> None:
    """Unauthenticated requests to any analytics endpoint return 401."""
    assert unauthenticated_client.get("/dashboard/spending").status_code == 401
    assert unauthenticated_client.get("/dashboard/vendors").status_code == 401
    assert unauthenticated_client.get("/dashboard/items").status_code == 401
    assert unauthenticated_client.get("/dashboard/highlights").status_code == 401


# ─── TEST 23: Limit Query Parameter Validation ────────────────────────────────

def test_limit_query_parameter_validation_and_slicing(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Limit query param controls returned list length and validates min/max."""
    docs = [
        _make_persisted_doc(USER_A_ID, vendor=f"Vendor {i}", total=float(i * 100))
        for i in range(1, 15)
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    # Valid limit=5
    res = client_user_a.get("/dashboard/vendors?limit=5")
    assert res.status_code == 200
    assert len(res.json()["vendors"]) == 5

    # Invalid limit=0 (fails ge=1)
    res_invalid_low = client_user_a.get("/dashboard/vendors?limit=0")
    assert res_invalid_low.status_code == 422

    # Invalid limit=101 (fails le=100)
    res_invalid_high = client_user_a.get("/dashboard/vendors?limit=101")
    assert res_invalid_high.status_code == 422


# ─── TEST 24: Backward Compatibility with Milestone 7.1 GET /dashboard ────────

def test_milestone_7_1_get_dashboard_remains_intact(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Root GET /dashboard contract remains completely compatible with Milestone 7.1."""
    doc = _make_persisted_doc(
        USER_A_ID,
        vendor="Apex Corp",
        total=500.0,
        confidence_level="HIGH",
        line_items=[{"description": "Hardware", "quantity": 1.0, "line_total": 500.0}],
    )
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc]),
    )

    res = client_user_a.get("/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "highlights" in data
    assert "confidence" in data
    assert data["summary"]["total_documents"] == 1
    assert data["summary"]["total_amount_spent"] == 500.0
    assert data["highlights"]["top_vendor"]["name"] == "Apex Corp"
    assert data["confidence"]["overall_level"] == "HIGH"


# ─── SECTION 13 COMPREHENSIVE TESTS: Time-Based Semantics & Windowing ─────────

def test_spending_multiple_receipts_same_day(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """1. Multiple receipts on the same day are aggregated into one point."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-08-16", total=500.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-16", total=700.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-16", total=120.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=day")
    assert res.status_code == 200
    data = res.json()
    assert data["total_spent"] == 1320.0
    pt_16 = [p for p in data["data"] if p["start_date"] == "2026-08-16"][0]
    assert pt_16["amount"] == 1320.0
    assert pt_16["document_count"] == 3


def test_spending_multiple_receipts_same_week(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """2. Multiple receipts in the same week are combined."""
    # Mon Aug 10 to Sun Aug 16, 2026
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-08-10", total=2450.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-13", total=550.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-16", total=1200.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=week")
    assert res.status_code == 200
    data = res.json()
    assert data["total_spent"] == 4200.0
    pt_week = [p for p in data["data"] if p["start_date"] == "2026-08-10"][0]
    assert pt_week["end_date"] == "2026-08-16"
    assert pt_week["amount"] == 4200.0
    assert pt_week["document_count"] == 3


def test_spending_multiple_receipts_same_month(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """3. Multiple receipts in the same calendar month are combined."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-08-01", total=1000.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-15", total=2500.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-31", total=1600.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=month")
    assert res.status_code == 200
    data = res.json()
    assert data["total_spent"] == 5100.0
    pt_aug = [p for p in data["data"] if p["label"] == "Aug 2026"][0]
    assert pt_aug["amount"] == 5100.0
    assert pt_aug["document_count"] == 3


def test_spending_multiple_receipts_same_year(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """4. Multiple receipts in the same year are aggregated."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-01-10", total=5000.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-06-20", total=8000.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-11-15", total=5432.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=year")
    assert res.status_code == 200
    data = res.json()
    assert data["total_spent"] == 18432.0
    pt_2026 = [p for p in data["data"] if p["label"] == "2026"][0]
    assert pt_2026["amount"] == 18432.0
    assert pt_2026["document_count"] == 3


def test_spending_documents_spanning_multiple_years(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """5. Documents spanning multiple decades are handled with proper time semantics per mode."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="1995-08-10", total=310.37),
        _make_persisted_doc(USER_A_ID, date_str="2002-01-23", total=828.69),
        _make_persisted_doc(USER_A_ID, date_str="2002-12-10", total=569.14),
        _make_persisted_doc(USER_A_ID, date_str="2015-06-06", total=3280.00),
        _make_persisted_doc(USER_A_ID, date_str="2016-12-03", total=49.52),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-19", total=5226.00),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    # DAY mode: shows the 6 distinct date buckets
    res_day = client_user_a.get("/dashboard/spending?period=day").json()
    assert len(res_day["data"]) == 6
    assert res_day["total_spent"] == 10263.72
    assert res_day["data"][-1]["start_date"] == "2026-08-19"
    assert res_day["data"][-1]["amount"] == 5226.0

    # YEAR mode: aggregates by year (2002 combines the 2 receipts)
    res_year = client_user_a.get("/dashboard/spending?period=year").json()
    assert len(res_year["data"]) == 5
    assert res_year["total_spent"] == 10263.72
    year_map = {p["label"]: p for p in res_year["data"]}
    assert year_map["1995"]["amount"] == 310.37
    assert year_map["2002"]["amount"] == 1397.83
    assert year_map["2002"]["document_count"] == 2
    assert year_map["2015"]["amount"] == 3280.00
    assert year_map["2016"]["amount"] == 49.52
    assert year_map["2026"]["amount"] == 5226.00


def test_spending_documents_spanning_multiple_months(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """6. Documents spanning multiple months are bucketed into calendar months."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-05-10", total=4250.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-06-15", total=6840.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-07-20", total=3210.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-10", total=5100.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=month").json()
    assert res["total_spent"] == 19400.0
    assert len(res["data"]) == 4
    m_map = {p["label"]: p["amount"] for p in res["data"]}
    assert m_map["May 2026"] == 4250.0
    assert m_map["Jun 2026"] == 6840.0
    assert m_map["Jul 2026"] == 3210.0
    assert m_map["Aug 2026"] == 5100.0


def test_spending_documents_spanning_multiple_weeks(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """7. Documents spanning multiple weeks are bucketed into ISO calendar weeks."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-08-03", total=1000.0),  # Week of 03 Aug
        _make_persisted_doc(USER_A_ID, date_str="2026-08-10", total=2450.0),  # Week of 10 Aug
        _make_persisted_doc(USER_A_ID, date_str="2026-08-17", total=1850.0),  # Week of 17 Aug
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=week").json()
    assert res["total_spent"] == 5300.0
    assert len(res["data"]) == 3
    w_map = {p["start_date"]: p["amount"] for p in res["data"]}
    assert w_map["2026-08-03"] == 1000.0
    assert w_map["2026-08-10"] == 2450.0
    assert w_map["2026-08-17"] == 1850.0


def test_spending_documents_spanning_multiple_days(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """8. Documents across multiple days show actual date buckets."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-08-10", total=350.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-12", total=1250.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-13", total=500.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-15", total=900.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-16", total=1320.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=day").json()
    assert res["total_spent"] == 4320.0
    assert len(res["data"]) == 5
    d_map = {p["start_date"]: p["amount"] for p in res["data"]}
    assert d_map["2026-08-10"] == 350.0
    assert d_map["2026-08-12"] == 1250.0
    assert d_map["2026-08-13"] == 500.0
    assert d_map["2026-08-15"] == 900.0
    assert d_map["2026-08-16"] == 1320.0


def test_spending_missing_invalid_dates_safety(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """9. Documents with missing or invalid dates fall back to created_at safely."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-08-10", total=500.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-12", total=700.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=day").json()
    assert res["total_spent"] == 1200.0
    assert len(res["data"]) == 2
    d_map = {p["start_date"]: p["amount"] for p in res["data"]}
    assert d_map["2026-08-10"] == 500.0
    assert d_map["2026-08-12"] == 700.0


def test_spending_chronological_sorting_guarantee(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """10. Buckets are always sorted chronologically."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-03-01", total=300.0),
        _make_persisted_doc(USER_A_ID, date_str="2024-01-01", total=100.0),
        _make_persisted_doc(USER_A_ID, date_str="2025-06-01", total=200.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=year").json()
    start_dates = [p["start_date"] for p in res["data"]]
    assert start_dates == sorted(start_dates)


def test_spending_year_boundary_crossing(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """11. Crossing year boundaries (e.g. Dec 2025 -> Jan 2026) is sorted chronologically."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2025-12-20", total=1500.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-01-10", total=2500.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=month").json()
    labels = [p["label"] for p in res["data"] if p["amount"] > 0]
    assert labels == ["Dec 2025", "Jan 2026"]


def test_spending_week_boundary_crossing(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """12. Week boundaries correctly split Sunday vs next Monday."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-08-09", total=400.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-10", total=600.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=week").json()
    assert len(res["data"]) == 2
    w_map = {p["start_date"]: p for p in res["data"]}
    assert w_map["2026-08-03"]["amount"] == 400.0  # Week containing Aug 09
    assert w_map["2026-08-10"]["amount"] == 600.0  # Week containing Aug 10


def test_spending_empty_dataset(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """13. Empty library returns empty list and 0.0 total for all periods."""
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=[]))

    for p in ("day", "week", "month", "year"):
        res = client_user_a.get(f"/dashboard/spending?period={p}").json()
        assert res["data"] == []
        assert res["total_spent"] == 0.0


def test_spending_single_receipt(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """14. Single receipt placed in exact matching bucket."""
    docs = [_make_persisted_doc(USER_A_ID, date_str="2026-08-16", total=100.0)]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res_day = client_user_a.get("/dashboard/spending?period=day").json()
    assert len(res_day["data"]) == 1
    assert res_day["total_spent"] == 100.0
    assert res_day["data"][0]["start_date"] == "2026-08-16"
    assert res_day["data"][0]["amount"] == 100.0


def test_spending_distinct_bucket_structures_by_mode(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """15. DAY, WEEK, MONTH, YEAR produce genuinely distinct bucket counts and date boundaries."""
    # 3 docs: 2 in same month (one in July, two in August across different weeks)
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-07-01", total=100.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-01", total=200.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-15", total=300.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    d_day = client_user_a.get("/dashboard/spending?period=day").json()
    d_week = client_user_a.get("/dashboard/spending?period=week").json()
    d_month = client_user_a.get("/dashboard/spending?period=month").json()
    d_year = client_user_a.get("/dashboard/spending?period=year").json()

    assert len(d_day["data"]) == 3    # 3 distinct days
    assert len(d_week["data"]) == 3   # 3 distinct weeks
    assert len(d_month["data"]) == 2  # 2 distinct months (July, August)
    assert len(d_year["data"]) == 1   # 1 distinct year (2026)

    # August in month mode has 200 + 300 = 500
    aug_month = [p for p in d_month["data"] if p["label"] == "Aug 2026"][0]
    assert aug_month["amount"] == 500.0
    assert aug_month["document_count"] == 2

    # 2026 in year mode has 100 + 200 + 300 = 600
    assert d_year["data"][0]["amount"] == 600.0
    assert d_year["data"][0]["document_count"] == 3


def test_spending_headline_total_equals_visible_buckets_sum(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """16. Total for selected period strictly equals sum of returned visible buckets."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-01-10", total=500.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-15", total=1200.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-16", total=300.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    for p in ("day", "week", "month", "year"):
        res = client_user_a.get(f"/dashboard/spending?period={p}").json()
        bucket_sum = round(sum(pt["amount"] for pt in res["data"]), 2)
        assert round(res["total_spent"], 2) == bucket_sum


def test_spending_receipt_count_equals_visible_buckets_count(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """17. Total visible receipt count matches sum of document_count across buckets."""
    docs = [
        _make_persisted_doc(USER_A_ID, date_str="2026-08-10", total=100.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-10", total=200.0),
        _make_persisted_doc(USER_A_ID, date_str="2026-08-15", total=300.0),
    ]
    monkeypatch.setattr("app.services.dashboard._get_document_metadata", AsyncMock(return_value=docs))

    res = client_user_a.get("/dashboard/spending?period=day").json()
    visible_count = sum(pt["document_count"] for pt in res["data"])
    assert visible_count == 3

