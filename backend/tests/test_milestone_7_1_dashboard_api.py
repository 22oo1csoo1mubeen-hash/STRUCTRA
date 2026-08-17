"""Milestone 7.1: Dashboard Backend & API Foundation Tests.

Validates summary metrics, highlights, confidence aggregation, user isolation,
lifecycle transitions, and numerical correctness derived exclusively from persisted documents.
"""

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
    date_str: str | None = "15/03/2026",
    line_items: list[dict] | None = None,
    overall_confidence: float | None = 0.95,
    confidence_level: str | None = "HIGH",
    system_confidence_level: str | None = None,
    confidence_override: str | None = None,
    needs_review: bool | None = None,
    created_at: datetime | None = None,
) -> CreatedDocumentMetadata:
    """Helper to create a persisted document metadata record."""
    d_id = doc_id or uuid4()
    ext_result = None
    if total is not None or vendor is not None or line_items is not None:
        ext_result = {
            "vendor_company": vendor,
            "address": "123 Market St",
            "invoice_number": f"INV-{str(d_id)[:8]}",
            "date": date_str,
            "subtotal": total,
            "tax": 0.0,
            "total": total,
            "line_items": line_items or [
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


# ─── TEST 1: Empty Dashboard ──────────────────────────────────────────────────

def test_empty_dashboard_returns_200_with_zeroes_and_nulls(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User with no saved documents receives 200 with 0s and nulls."""
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[]),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()

    # Summary
    assert data["summary"]["total_documents"] == 0
    assert data["summary"]["total_amount_spent"] == 0.0
    assert data["summary"]["processed_documents"] == 0
    assert data["summary"]["needs_review_documents"] == 0

    # Highlights
    assert data["highlights"]["top_vendor"] is None
    assert data["highlights"]["highest_spend_vendor"] is None
    assert data["highlights"]["most_bought_item"] is None
    assert data["highlights"]["most_expensive_item"] is None
    assert data["highlights"]["most_expensive_receipt"] is None

    # Confidence
    assert data["confidence"]["overall_level"] is None
    assert data["confidence"]["distribution"]["high"] == 0
    assert data["confidence"]["distribution"]["medium"] == 0
    assert data["confidence"]["distribution"]["low"] == 0


# ─── TEST 2: Total Document Count ─────────────────────────────────────────────

def test_total_document_count_counts_all_persisted_user_documents(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Total documents counts all persisted library documents regardless of review status."""
    docs = [
        _make_persisted_doc(USER_A_ID, status_str="completed", confidence_level="HIGH"),
        _make_persisted_doc(USER_A_ID, status_str="completed", confidence_level="MEDIUM", needs_review=True),
        _make_persisted_doc(USER_A_ID, status_str="pending", confidence_level=None, overall_confidence=None),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total_documents"] == 3
    assert data["summary"]["processed_documents"] == 1
    assert data["summary"]["needs_review_documents"] == 1


# ─── TEST 3: Total Amount Spent ───────────────────────────────────────────────

def test_total_amount_spent_exact_sum(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Total amount spent is the exact sum of extracted totals from user's saved documents."""
    docs = [
        _make_persisted_doc(USER_A_ID, total=1250.50),
        _make_persisted_doc(USER_A_ID, total=749.25),
        _make_persisted_doc(USER_A_ID, total=0.25),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total_amount_spent"] == 2000.0


# ─── TEST 4: Top Vendor (Frequency) ───────────────────────────────────────────

def test_top_vendor_by_document_frequency(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Top vendor is the vendor with the highest document count."""
    docs = [
        _make_persisted_doc(USER_A_ID, vendor="Amazon", total=100.0),
        _make_persisted_doc(USER_A_ID, vendor="Amazon", total=150.0),
        _make_persisted_doc(USER_A_ID, vendor="Amazon", total=200.0),
        _make_persisted_doc(USER_A_ID, vendor="DMart", total=500.0),
        _make_persisted_doc(USER_A_ID, vendor="DMart", total=600.0),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    top_v = data["highlights"]["top_vendor"]
    assert top_v is not None
    assert top_v["name"] == "Amazon"
    assert top_v["document_count"] == 3


# ─── TEST 5: Highest Spend Vendor (Monetary) ──────────────────────────────────

def test_highest_spend_vendor_different_from_top_vendor(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Highest-spend vendor identifies the vendor with greatest monetary spend even with fewer docs."""
    docs = [
        _make_persisted_doc(USER_A_ID, vendor="Amazon", total=1000.0),
        _make_persisted_doc(USER_A_ID, vendor="Amazon", total=1000.0),
        _make_persisted_doc(USER_A_ID, vendor="Amazon", total=1000.0),  # Amazon total: 3000, count: 3
        _make_persisted_doc(USER_A_ID, vendor="Apple Store", total=8500.0),  # Apple total: 8500, count: 1
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    top_v = data["highlights"]["top_vendor"]
    h_spend = data["highlights"]["highest_spend_vendor"]

    assert top_v["name"] == "Amazon"
    assert top_v["document_count"] == 3

    assert h_spend["name"] == "Apple Store"
    assert h_spend["total_spent"] == 8500.0
    assert h_spend["document_count"] == 1


# ─── TEST 6: Most Bought Item (Quantity Aggregation) ──────────────────────────

def test_most_bought_item_aggregates_quantity_across_documents(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Most bought item sums line item quantities across saved documents."""
    doc1 = _make_persisted_doc(
        USER_A_ID,
        total=500.0,
        line_items=[
            {"description": "Organic Whole Milk", "quantity": 10.0, "unit_price": 20.0, "line_total": 200.0},
            {"description": "Whole Wheat Bread", "quantity": 2.0, "unit_price": 50.0, "line_total": 100.0},
        ],
    )
    doc2 = _make_persisted_doc(
        USER_A_ID,
        total=300.0,
        line_items=[
            {"description": "Organic Whole Milk", "quantity": 5.0, "unit_price": 20.0, "line_total": 100.0},
            {"description": "Whole Wheat Bread", "quantity": 10.0, "unit_price": 50.0, "line_total": 200.0},
        ],
    )
    doc3 = _make_persisted_doc(
        USER_A_ID,
        total=200.0,
        line_items=[
            {"description": "organic whole milk", "quantity": 9.0, "unit_price": 20.0, "line_total": 180.0},
        ],
    )
    # Milk: 10 + 5 + 9 = 24
    # Bread: 2 + 10 = 12

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc1, doc2, doc3]),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    most_bought = data["highlights"]["most_bought_item"]
    assert most_bought is not None
    assert "milk" in most_bought["name"].lower()
    assert most_bought["quantity"] == 24.0
    assert most_bought["document_count"] == 3


# ─── TEST 7: Most Expensive Item ──────────────────────────────────────────────

def test_most_expensive_item_identifies_highest_value_line_item(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Most expensive item identifies the highest line total item purchase."""
    doc1 = _make_persisted_doc(
        USER_A_ID,
        vendor="Best Buy",
        total=1200.0,
        line_items=[
            {"description": "Wireless Mouse", "quantity": 1.0, "unit_price": 50.0, "line_total": 50.0},
            {"description": "4K Gaming Monitor", "quantity": 1.0, "unit_price": 850.0, "line_total": 850.0},
        ],
    )
    doc2 = _make_persisted_doc(
        USER_A_ID,
        vendor="IKEA",
        total=600.0,
        line_items=[
            {"description": "Ergonomic Office Chair", "quantity": 1.0, "unit_price": 600.0, "line_total": 600.0},
        ],
    )

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc1, doc2]),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    most_exp_item = data["highlights"]["most_expensive_item"]
    assert most_exp_item is not None
    assert most_exp_item["name"] == "4K Gaming Monitor"
    assert most_exp_item["amount"] == 850.0
    assert most_exp_item["vendor"] == "Best Buy"
    assert most_exp_item["document_id"] == str(doc1.id)


# ─── TEST 8: Most Expensive Receipt ───────────────────────────────────────────

def test_most_expensive_receipt_returns_highest_total_document(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Most expensive receipt returns the document with the maximum total."""
    doc1 = _make_persisted_doc(USER_A_ID, vendor="Grocery Store", total=150.0, filename="groceries.pdf")
    doc2 = _make_persisted_doc(USER_A_ID, vendor="Apple", total=1299.99, filename="macbook.pdf", date_str="10/02/2026")
    doc3 = _make_persisted_doc(USER_A_ID, vendor="Coffee Shop", total=25.0, filename="coffee.pdf")

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc1, doc2, doc3]),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    most_exp_receipt = data["highlights"]["most_expensive_receipt"]
    assert most_exp_receipt is not None
    assert most_exp_receipt["document_id"] == str(doc2.id)
    assert most_exp_receipt["filename"] == "macbook.pdf"
    assert most_exp_receipt["vendor"] == "Apple"
    assert most_exp_receipt["document_date"] == "10/02/2026"
    assert most_exp_receipt["total_amount"] == 1299.99
    assert most_exp_receipt["confidence_level"] == "HIGH"
    assert most_exp_receipt["needs_review"] is False


# ─── TEST 9: Confidence Distribution & Overall Level ──────────────────────────

def test_confidence_distribution_and_overall_level(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Confidence distribution counts HIGH, MEDIUM, LOW and resolves overall level."""
    docs = [
        _make_persisted_doc(USER_A_ID, confidence_level="HIGH", system_confidence_level="HIGH"),
        _make_persisted_doc(USER_A_ID, confidence_level="HIGH", system_confidence_level="HIGH"),
        _make_persisted_doc(USER_A_ID, confidence_level="MEDIUM", system_confidence_level="MEDIUM", needs_review=True),
        _make_persisted_doc(USER_A_ID, confidence_level="LOW", system_confidence_level="LOW", needs_review=True),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["confidence"]["distribution"]["high"] == 2
    assert data["confidence"]["distribution"]["medium"] == 1
    assert data["confidence"]["distribution"]["low"] == 1
    assert data["confidence"]["overall_level"] == "HIGH"


# ─── TEST 10: Confidence Override Precedence ──────────────────────────────────

def test_confidence_override_takes_precedence_in_dashboard(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Manual confidence_override takes precedence over system confidence."""
    doc = _make_persisted_doc(
        USER_A_ID,
        overall_confidence=0.99,
        confidence_level="LOW",
        system_confidence_level="HIGH",
        confidence_override="LOW",
    )
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc]),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["confidence"]["distribution"]["high"] == 0
    assert data["confidence"]["distribution"]["medium"] == 0
    assert data["confidence"]["distribution"]["low"] == 1
    assert data["confidence"]["overall_level"] == "LOW"


# ─── TEST 11: Unsaved Document Exclusion ──────────────────────────────────────

def test_unsaved_upload_sessions_excluded_from_dashboard(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Documents in temporary upload sessions (not persisted in DB) never appear in dashboard."""
    persisted_doc = _make_persisted_doc(USER_A_ID, total=100.0, vendor="Amazon")

    # DB returns only persisted_doc
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[persisted_doc]),
    )

    # Register an in-flight temp upload session
    temp_id = uuid4()
    document_routes._register_temp_upload_session(
        document_id=temp_id,
        user_id=USER_A_ID,
        filename="unsaved_temp.pdf",
        storage_path=f"{USER_A_ID}/{temp_id}/original.pdf",
        content_type="application/pdf",
        size=1024,
        content_hash="temp_hash",
        created_at=datetime.now(UTC),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()

    # Only 1 document counted (the persisted one)
    assert data["summary"]["total_documents"] == 1
    assert data["summary"]["total_amount_spent"] == 100.0

    # Cleanup temp session
    document_routes._remove_temp_upload_session(temp_id)


# ─── TEST 12: Strict User Isolation ───────────────────────────────────────────

def test_user_isolation_between_user_a_and_user_b(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """User A sees only User A's data; User B sees only User B's data with zero leakage."""
    doc_a = _make_persisted_doc(USER_A_ID, total=100.0, vendor="Vendor A")
    doc_b = _make_persisted_doc(USER_B_ID, total=900.0, vendor="Vendor B")

    async def mock_get_docs(*, params, settings):
        user_id_param = params.get("user_id")
        if user_id_param == f"eq.{USER_A_ID}":
            return [doc_a]
        elif user_id_param == f"eq.{USER_B_ID}":
            return [doc_b]
        return []

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        mock_get_docs,
    )

    # User A Request
    client_a = get_user_client(USER_A_ID)
    res_a = client_a.get("/dashboard")
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["summary"]["total_documents"] == 1
    assert data_a["summary"]["total_amount_spent"] == 100.0
    assert data_a["highlights"]["top_vendor"]["name"] == "Vendor A"

    # User B Request
    client_b = get_user_client(USER_B_ID)
    res_b = client_b.get("/dashboard")
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["summary"]["total_documents"] == 1
    assert data_b["summary"]["total_amount_spent"] == 900.0
    assert data_b["highlights"]["top_vendor"]["name"] == "Vendor B"
    app.dependency_overrides.clear()


# ─── TEST 13: Missing Optional Extraction Data ────────────────────────────────

def test_missing_optional_extraction_data_does_not_crash_dashboard(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Documents with null vendor, null total, missing line items do not crash the API."""
    doc1 = _make_persisted_doc(USER_A_ID, vendor=None, total=None, line_items=[])
    doc2 = _make_persisted_doc(USER_A_ID, vendor="", total=50.0, line_items=[{"description": "", "line_total": None}])
    doc3 = CreatedDocumentMetadata(
        id=uuid4(),
        user_id=UUID(USER_A_ID),
        filename="corrupt.pdf",
        storage_path=f"{USER_A_ID}/corrupt/original.pdf",
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

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total_documents"] == 3
    assert data["summary"]["total_amount_spent"] == 50.0


# ─── TEST 14: Decimal Mathematical Precision ──────────────────────────────────

def test_mathematical_precision_without_floating_point_drift(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Adding 0.1 + 0.2 produces exact 0.3 without binary floating point drift."""
    docs = [
        _make_persisted_doc(USER_A_ID, total=0.10),
        _make_persisted_doc(USER_A_ID, total=0.20),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total_amount_spent"] == 0.30


# ─── TEST 15: Authentication Required ─────────────────────────────────────────

def test_unauthenticated_request_rejected(
    unauthenticated_client: TestClient,
) -> None:
    """GET /dashboard without valid auth bearer token returns 401."""
    response = unauthenticated_client.get("/dashboard")
    assert response.status_code == 401


# ─── LIFECYCLE TESTS: End-to-End Persistence & State Changes ──────────────────

def test_document_lifecycle_immediate_dashboard_reflection(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Persisted store updates immediately reflect in GET /dashboard calculations."""
    stored_docs: list[CreatedDocumentMetadata] = []

    async def mock_get_docs(*, params, settings):
        return list(stored_docs)

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        mock_get_docs,
    )

    # 1. Initially 0 documents
    res1 = client_user_a.get("/dashboard")
    assert res1.json()["summary"]["total_documents"] == 0

    # 2. Add document A (₹500, DMart)
    doc_a = _make_persisted_doc(USER_A_ID, total=500.0, vendor="DMart")
    stored_docs.append(doc_a)

    res2 = client_user_a.get("/dashboard")
    assert res2.json()["summary"]["total_documents"] == 1
    assert res2.json()["summary"]["total_amount_spent"] == 500.0
    assert res2.json()["highlights"]["top_vendor"]["name"] == "DMart"

    # 3. Edit document A extraction (increase to ₹1,200)
    doc_a.extraction_result["total"] = 1200.0
    res3 = client_user_a.get("/dashboard")
    assert res3.json()["summary"]["total_amount_spent"] == 1200.0

    # 4. Delete document A
    stored_docs.remove(doc_a)
    res4 = client_user_a.get("/dashboard")
    assert res4.json()["summary"]["total_documents"] == 0
    assert res4.json()["summary"]["total_amount_spent"] == 0.0
    assert res4.json()["highlights"]["top_vendor"] is None


# ─── ADDITIONAL TESTS: Vendor Normalization & Tie-Breaking ────────────────────

def test_vendor_case_insensitivity_and_normalization(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Vendors like 'Amazon', 'AMAZON', '  amazon  ' group together deterministically."""
    docs = [
        _make_persisted_doc(USER_A_ID, vendor="Amazon", total=100.0),
        _make_persisted_doc(USER_A_ID, vendor="AMAZON", total=200.0),
        _make_persisted_doc(USER_A_ID, vendor="  amazon  ", total=300.0),
        _make_persisted_doc(USER_A_ID, vendor="Target", total=500.0),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()

    top_v = data["highlights"]["top_vendor"]
    assert top_v is not None
    assert top_v["name"].casefold() == "amazon"
    assert top_v["document_count"] == 3

    h_spend = data["highlights"]["highest_spend_vendor"]
    assert h_spend is not None
    assert h_spend["name"].casefold() == "amazon"
    assert h_spend["total_spent"] == 600.0
    assert h_spend["document_count"] == 3


def test_deterministic_tie_breaking_alphabetical(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """When document counts and spends are equal, secondary alphabetical sorting ensures deterministic output."""
    docs = [
        _make_persisted_doc(USER_A_ID, vendor="Zeta Store", total=100.0),
        _make_persisted_doc(USER_A_ID, vendor="Alpha Store", total=100.0),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    response = client_user_a.get("/dashboard")
    assert response.status_code == 200
    data = response.json()

    # "Alpha Store" sorts before "Zeta Store"
    top_v = data["highlights"]["top_vendor"]
    assert top_v is not None
    assert top_v["name"] == "Alpha Store"
    assert top_v["document_count"] == 1

