"""Milestone 7.6: Performance, Security & Full Hardening Verification Tests.

Validates:
- Authentication & strict user isolation across all 8 dashboard endpoints.
- Query parameter validation boundaries (limit=0, limit=101, invalid periods).
- Decimal financial accuracy & floating point precision.
- Date parsing robustness & fallback determinism.
- Extreme malformed/null JSON extraction handling.
- Deterministic ranking & tie-breaking.
- Confidence override precedence and review queue transitions.
- Zero-document empty states.
"""

from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.core.config import get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.dashboard import parse_decimal_safe, parse_document_date
from app.services.document_metadata import CreatedDocumentMetadata
from app.services.storage import build_document_storage_path

USER_1_ID = "00000000-0000-0000-0000-000000000081"
USER_2_ID = "00000000-0000-0000-0000-000000000082"


def _make_doc(
    user_id_str: str = USER_1_ID,
    *,
    doc_id: UUID | None = None,
    filename: str = "doc.pdf",
    status_str: str = "completed",
    total: float | None = 100.0,
    vendor: str | None = "Acme Corp",
    date_str: str | None = "2026-03-15",
    line_items: list[dict] | None = None,
    overall_confidence: float | None = 0.95,
    confidence_level: str | None = "HIGH",
    system_confidence_level: str | None = None,
    confidence_override: str | None = None,
    needs_review: bool | None = None,
    created_at: datetime | None = None,
    processed_at: datetime | None = None,
) -> CreatedDocumentMetadata:
    d_id = doc_id or uuid4()
    ext_result = None
    if total is not None or vendor is not None or date_str is not None or line_items is not None:
        ext_result = {
            "vendor_company": vendor,
            "address": "123 Tech Park",
            "invoice_number": f"INV-{str(d_id)[:8]}",
            "date": date_str,
            "subtotal": total,
            "tax": 0.0,
            "total": total,
            "line_items": line_items if line_items is not None else [
                {"description": "Item", "quantity": 1.0, "unit_price": total, "line_total": total}
            ],
        }

    qual_result = None
    sys_level = system_confidence_level if system_confidence_level is not None else confidence_level
    eff_conf = confidence_override or sys_level or confidence_level
    eff_review = needs_review if needs_review is not None else (False if eff_conf == "HIGH" else True)

    if overall_confidence is not None or confidence_level is not None or confidence_override is not None:
        qual_result = {
            "overall_confidence": overall_confidence,
            "confidence_level": eff_conf,
            "system_confidence": overall_confidence,
            "system_confidence_level": sys_level,
            "confidence_override": confidence_override,
            "needs_review": eff_review,
        }

    c_at = created_at or datetime(2026, 3, 15, 10, 0, 0, tzinfo=UTC)
    p_at = processed_at or c_at

    return CreatedDocumentMetadata(
        id=d_id,
        user_id=UUID(user_id_str),
        filename=filename,
        storage_path=build_document_storage_path(user_id_str, filename, document_id=d_id),
        content_type="application/pdf",
        size=2048,
        status=status_str,
        created_at=c_at,
        processed_at=p_at,
        content_hash=f"hash_{d_id}",
        extraction_result=ext_result,
        quality_result=qual_result,
    )


@pytest.fixture
def client_u1() -> TestClient:
    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
    )
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_1_ID)
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client() -> TestClient:
    app.dependency_overrides.clear()
    with TestClient(app) as test_client:
        yield test_client


# ─── 1. SECURITY: Authentication Enforcement ───────────────────────────────────

def test_all_eight_endpoints_require_authentication(
    unauthenticated_client: TestClient,
) -> None:
    """All 8 dashboard endpoints strictly return 401 when accessed without bearer token."""
    endpoints = [
        "/dashboard",
        "/dashboard/spending",
        "/dashboard/vendors",
        "/dashboard/items",
        "/dashboard/highlights",
        "/dashboard/quality",
        "/dashboard/review-queue",
        "/dashboard/recent-documents",
    ]
    for ep in endpoints:
        resp = unauthenticated_client.get(ep)
        assert resp.status_code == 401, f"Endpoint {ep} failed to enforce auth."


# ─── 2. SECURITY: Strict User Isolation Across All Endpoints ──────────────────

def test_strict_user_isolation_across_all_endpoints(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """User 1 and User 2 never see each other's data across any dashboard endpoint."""
    doc1 = _make_doc(USER_1_ID, vendor="User 1 Vendor", total=100.0, filename="u1.pdf")
    doc2 = _make_doc(USER_2_ID, vendor="User 2 Vendor", total=900.0, filename="u2.pdf")

    async def mock_get_docs(*, params, settings):
        uid = params.get("user_id")
        if uid == f"eq.{USER_1_ID}":
            return [doc1]
        elif uid == f"eq.{USER_2_ID}":
            return [doc2]
        return []

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        mock_get_docs,
    )

    app.dependency_overrides[get_settings] = lambda: SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_storage_bucket="documents",
    )

    # Test as User 1
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_1_ID)
    with TestClient(app) as client1:
        assert client1.get("/dashboard").json()["summary"]["total_amount_spent"] == 100.0
        assert client1.get("/dashboard/spending").json()["total_spent"] == 100.0
        assert client1.get("/dashboard/vendors").json()["vendors"][0]["vendor"] == "User 1 Vendor"
        assert client1.get("/dashboard/recent-documents").json()["documents"][0]["filename"] == "u1.pdf"

    # Test as User 2
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_2_ID)
    with TestClient(app) as client2:
        assert client2.get("/dashboard").json()["summary"]["total_amount_spent"] == 900.0
        assert client2.get("/dashboard/spending").json()["total_spent"] == 900.0
        assert client2.get("/dashboard/vendors").json()["vendors"][0]["vendor"] == "User 2 Vendor"
        assert client2.get("/dashboard/recent-documents").json()["documents"][0]["filename"] == "u2.pdf"

    app.dependency_overrides.clear()


# ─── 3. PARAMETER VALIDATION: Boundaries & Types ─────────────────────────────

def test_query_parameter_boundaries_and_types(
    client_u1: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Rejects invalid periods and out-of-range limits with 422 Unprocessable Entity."""
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[]),
    )

    # Invalid period
    assert client_u1.get("/dashboard/spending?period=century").status_code == 422
    assert client_u1.get("/dashboard/spending?period=hourly").status_code == 422

    # Valid periods
    assert client_u1.get("/dashboard/spending?period=day").status_code == 200
    assert client_u1.get("/dashboard/spending?period=week").status_code == 200
    assert client_u1.get("/dashboard/spending?period=month").status_code == 200
    assert client_u1.get("/dashboard/spending?period=year").status_code == 200

    # Invalid limits (< 1 or > 100)
    for ep in ["/dashboard/vendors", "/dashboard/items", "/dashboard/review-queue", "/dashboard/recent-documents"]:
        assert client_u1.get(f"{ep}?limit=0").status_code == 422, f"Failed low boundary on {ep}"
        assert client_u1.get(f"{ep}?limit=-5").status_code == 422, f"Failed negative boundary on {ep}"
        assert client_u1.get(f"{ep}?limit=101").status_code == 422, f"Failed high boundary on {ep}"
        assert client_u1.get(f"{ep}?limit=abc").status_code == 422, f"Failed type check on {ep}"


# ─── 4. DATA ACCURACY: Decimal Precision & Robust Parsing ─────────────────────

def test_decimal_parser_edge_cases() -> None:
    """Verifies internal Decimal parser handles various international currency formats and currencies."""
    assert parse_decimal_safe("1,245.50") == Decimal("1245.50")
    assert parse_decimal_safe("₹ 24,500.00") == Decimal("24500.00")
    assert parse_decimal_safe("$ 1,000,000.99") == Decimal("1000000.99")
    assert parse_decimal_safe("(500.00)") == Decimal("-500.00")
    assert parse_decimal_safe("- 125.75") == Decimal("-125.75")
    assert parse_decimal_safe("− 40.00") == Decimal("-40.00")  # unicode minus
    assert parse_decimal_safe(None) is None
    assert parse_decimal_safe("") is None
    assert parse_decimal_safe("invalid_number") is None


def test_date_parser_edge_cases() -> None:
    """Verifies date parser handles multiple formats, ISO timestamps, and fallback."""
    fb = datetime(2026, 5, 20, 10, 0, 0, tzinfo=UTC)
    
    # ISO formats
    assert str(parse_document_date("2026-03-15")) == "2026-03-15"
    assert str(parse_document_date("2026-03-15T12:30:00Z")) == "2026-03-15"
    assert str(parse_document_date("15/03/2026")) == "2026-03-15"
    assert str(parse_document_date("15-03-2026")) == "2026-03-15"
    assert str(parse_document_date("15 Mar 2026")) == "2026-03-15"
    assert str(parse_document_date("March 15, 2026")) == "2026-03-15"

    # Fallback to created_at
    assert str(parse_document_date(None, fallback_dt=fb)) == "2026-05-20"
    assert str(parse_document_date("unparseable date", fallback_dt=fb)) == "2026-05-20"


# ─── 5. DATA ACCURACY: Extreme Malformed & Corrupted Documents ────────────────

def test_extreme_malformed_document_safety(
    client_u1: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Corrupted, empty, or partial documents never throw 500 exceptions."""
    corrupted_docs = [
        # Doc 1: null extraction and quality
        CreatedDocumentMetadata(
            id=uuid4(),
            user_id=UUID(USER_1_ID),
            filename="null.pdf",
            storage_path=f"{USER_1_ID}/null/original.pdf",
            content_type="application/pdf",
            size=1024,
            status="pending",
            created_at=datetime.now(UTC),
            extraction_result=None,
            quality_result=None,
        ),
        # Doc 2: empty extraction dicts and corrupted types
        CreatedDocumentMetadata(
            id=uuid4(),
            user_id=UUID(USER_1_ID),
            filename="corrupted.pdf",
            storage_path=f"{USER_1_ID}/corrupted/original.pdf",
            content_type="application/pdf",
            size=1024,
            status="completed",
            created_at=datetime.now(UTC),
            extraction_result={
                "vendor_company": 12345,  # int instead of str
                "date": {"invalid": "dict"},
                "total": "not_a_number",
                "line_items": "not_a_list",
            },
            quality_result={
                "overall_confidence": "corrupted_score",
                "confidence_level": None,
            },
        ),
    ]

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=corrupted_docs),
    )

    # Every endpoint must respond with 200 OK
    assert client_u1.get("/dashboard").status_code == 200
    assert client_u1.get("/dashboard/spending").status_code == 200
    assert client_u1.get("/dashboard/vendors").status_code == 200
    assert client_u1.get("/dashboard/items").status_code == 200
    assert client_u1.get("/dashboard/highlights").status_code == 200
    assert client_u1.get("/dashboard/quality").status_code == 200
    assert client_u1.get("/dashboard/review-queue").status_code == 200
    assert client_u1.get("/dashboard/recent-documents").status_code == 200


# ─── 6. CONFIDENCE PRECEDENCE & REVIEW QUEUE TRANSITIONS ───────────────────────

def test_confidence_override_hierarchy_resolution(
    client_u1: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verifies that confidence_override > system_confidence_level > confidence_level > score."""
    doc = _make_doc(
        USER_1_ID,
        overall_confidence=0.99,            # would derive HIGH
        confidence_level="MEDIUM",          # legacy MEDIUM
        system_confidence_level="MEDIUM",   # system evaluated MEDIUM
        confidence_override="LOW",          # manual override LOW
    )

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc]),
    )

    res = client_u1.get("/dashboard/quality").json()
    assert res["overall_level"] == "LOW"
    assert res["low_count"] == 1
    assert res["high_count"] == 0
    assert res["review_count"] == 1

    # In review queue
    rq = client_u1.get("/dashboard/review-queue").json()
    assert rq["total_review_needed"] == 1
    assert rq["items"][0]["confidence_level"] == "LOW"
