"""Milestone 7.3: Document Quality & Review Intelligence Backend Tests.

Validates overall library confidence, HIGH/MEDIUM/LOW distribution, review queue,
recent documents, confidence override precedence, user isolation, and regression compatibility.
"""

from datetime import UTC, datetime, timedelta
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
    filename: str = "doc.pdf",
    status_str: str = "completed",
    total: float | None = 100.0,
    vendor: str | None = "Acme Corp",
    date_str: str | None = "2026-03-15",
    overall_confidence: float | None = 0.95,
    confidence_level: str | None = "HIGH",
    system_confidence_level: str | None = None,
    confidence_override: str | None = None,
    needs_review: bool | None = None,
    created_at: datetime | None = None,
    processed_at: datetime | None = None,
) -> CreatedDocumentMetadata:
    """Helper to create a persisted document record for quality and review testing."""
    d_id = doc_id or uuid4()
    ext_result = None
    if total is not None or vendor is not None or date_str is not None:
        ext_result = {
            "vendor_company": vendor,
            "address": "123 Tech Ave",
            "invoice_number": f"INV-{str(d_id)[:8]}",
            "date": date_str,
            "subtotal": total,
            "tax": 0.0,
            "total": total,
            "line_items": [
                {"description": "Standard Item", "quantity": 1.0, "unit_price": total, "line_total": total}
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


# ─── TEST 1: Empty Quality Dashboard & Queues ─────────────────────────────────

def test_empty_quality_and_queues(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """User with no saved documents receives 200 with empty queues and null overall level."""
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[]),
    )

    # GET /dashboard/quality
    r_qual = client_user_a.get("/dashboard/quality")
    assert r_qual.status_code == 200
    d_q = r_qual.json()
    assert d_q["overall_level"] is None
    assert d_q["high_count"] == 0
    assert d_q["medium_count"] == 0
    assert d_q["low_count"] == 0
    assert d_q["total_documents"] == 0
    assert d_q["review_count"] == 0
    assert d_q["average_system_confidence"] is None
    assert d_q["distribution"]["high"] == 0

    # GET /dashboard/review-queue
    r_rq = client_user_a.get("/dashboard/review-queue")
    assert r_rq.status_code == 200
    d_rq = r_rq.json()
    assert d_rq["items"] == []
    assert d_rq["total_review_needed"] == 0

    # GET /dashboard/recent-documents
    r_rd = client_user_a.get("/dashboard/recent-documents")
    assert r_rd.status_code == 200
    d_rd = r_rd.json()
    assert d_rd["documents"] == []
    assert d_rd["total"] == 0


# ─── TEST 2 & 3: Overall Confidence & Distribution ────────────────────────────

def test_overall_confidence_and_distribution(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Calculates confidence distribution and overall level across user documents."""
    docs = [
        _make_persisted_doc(USER_A_ID, confidence_level="HIGH", overall_confidence=0.95),
        _make_persisted_doc(USER_A_ID, confidence_level="HIGH", overall_confidence=0.90),
        _make_persisted_doc(USER_A_ID, confidence_level="MEDIUM", overall_confidence=0.65),
        _make_persisted_doc(USER_A_ID, confidence_level="LOW", overall_confidence=0.30),
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    res = client_user_a.get("/dashboard/quality")
    assert res.status_code == 200
    data = res.json()
    assert data["total_documents"] == 4
    assert data["high_count"] == 2
    assert data["medium_count"] == 1
    assert data["low_count"] == 1
    assert data["review_count"] == 2  # MEDIUM + LOW
    assert data["overall_level"] == "HIGH"
    assert data["average_system_confidence"] == 0.70  # (0.95 + 0.90 + 0.65 + 0.30) / 4 = 0.70


# ─── TEST 4, 5, 6, 7: Confidence Override Precedence & State Transitions ───────

def test_confidence_override_precedence_and_transitions(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Manual confidence override immediately reclassifies document and alters review queue."""
    # 1. System confidence HIGH
    doc = _make_persisted_doc(USER_A_ID, system_confidence_level="HIGH", confidence_override=None)
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc]),
    )

    r1 = client_user_a.get("/dashboard/quality")
    assert r1.json()["high_count"] == 1
    assert r1.json()["review_count"] == 0

    rq1 = client_user_a.get("/dashboard/review-queue")
    assert rq1.json()["total_review_needed"] == 0

    # 2. User overrides HIGH -> LOW
    doc.quality_result["confidence_override"] = "LOW"
    r2 = client_user_a.get("/dashboard/quality")
    assert r2.json()["high_count"] == 0
    assert r2.json()["low_count"] == 1
    assert r2.json()["review_count"] == 1

    rq2 = client_user_a.get("/dashboard/review-queue")
    assert rq2.json()["total_review_needed"] == 1
    assert rq2.json()["items"][0]["confidence_level"] == "LOW"

    # 3. User overrides LOW -> HIGH
    doc.quality_result["confidence_override"] = "HIGH"
    r3 = client_user_a.get("/dashboard/quality")
    assert r3.json()["high_count"] == 1
    assert r3.json()["low_count"] == 0
    assert r3.json()["review_count"] == 0

    rq3 = client_user_a.get("/dashboard/review-queue")
    assert rq3.json()["total_review_needed"] == 0

    # 4. User clears override (reverts to system confidence HIGH)
    doc.quality_result["confidence_override"] = None
    r4 = client_user_a.get("/dashboard/quality")
    assert r4.json()["high_count"] == 1
    assert r4.json()["review_count"] == 0


# ─── TEST 8, 9, 10, 11: Review Queue Filtering & Deterministic Ordering ───────

def test_review_queue_filtering_and_ordering(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Review queue includes LOW and needs_review items, excludes processed HIGH, sorts LOW before MEDIUM."""
    now = datetime(2026, 3, 20, 12, 0, 0, tzinfo=UTC)
    doc_high = _make_persisted_doc(USER_A_ID, filename="high.pdf", confidence_level="HIGH", created_at=now)
    doc_med = _make_persisted_doc(USER_A_ID, filename="med.pdf", confidence_level="MEDIUM", created_at=now - timedelta(hours=2))
    doc_low1 = _make_persisted_doc(USER_A_ID, filename="low1.pdf", confidence_level="LOW", created_at=now - timedelta(hours=4))
    doc_low2 = _make_persisted_doc(USER_A_ID, filename="low2.pdf", confidence_level="LOW", created_at=now - timedelta(hours=1))

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc_high, doc_med, doc_low1, doc_low2]),
    )

    response = client_user_a.get("/dashboard/review-queue")
    assert response.status_code == 200
    data = response.json()
    assert data["total_review_needed"] == 3
    filenames = [item["filename"] for item in data["items"]]

    # LOW documents come first (sorted newest first: low2, low1), then MEDIUM (med)
    assert filenames == ["low2.pdf", "low1.pdf", "med.pdf"]
    assert "high.pdf" not in filenames


# ─── TEST 12 & 13: Recent Documents Ordering & Limits ─────────────────────────

def test_recent_documents_ordering_and_limits(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Recent documents sorts newest first and obeys limit query parameter."""
    base_t = datetime(2026, 3, 10, 10, 0, 0, tzinfo=UTC)
    docs = [
        _make_persisted_doc(USER_A_ID, filename=f"doc_{i}.pdf", created_at=base_t + timedelta(days=i))
        for i in range(1, 15)
    ]
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=docs),
    )

    # Valid limit=5
    res = client_user_a.get("/dashboard/recent-documents?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 14
    assert len(data["documents"]) == 5
    assert data["documents"][0]["filename"] == "doc_14.pdf"
    assert data["documents"][1]["filename"] == "doc_13.pdf"

    # Limit validation: limit=0 fails
    assert client_user_a.get("/dashboard/recent-documents?limit=0").status_code == 422
    # Limit validation: limit=101 fails
    assert client_user_a.get("/dashboard/recent-documents?limit=101").status_code == 422


# ─── TEST 14: Unsaved Document Exclusion ──────────────────────────────────────

def test_unsaved_documents_never_appear_in_quality_or_queues(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """In-flight temporary upload sessions not committed to DB are excluded from quality and review APIs."""
    persisted_doc = _make_persisted_doc(USER_A_ID, filename="persisted.pdf", confidence_level="HIGH")
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[persisted_doc]),
    )

    temp_id = uuid4()
    document_routes._register_temp_upload_session(
        document_id=temp_id,
        user_id=USER_A_ID,
        filename="temp_unsaved.pdf",
        storage_path=f"{USER_A_ID}/{temp_id}/original.pdf",
        content_type="application/pdf",
        size=1024,
        content_hash="temp_hash",
        created_at=datetime.now(UTC),
    )

    # Quality API
    r_q = client_user_a.get("/dashboard/quality")
    assert r_q.json()["total_documents"] == 1

    # Recent Documents
    r_rd = client_user_a.get("/dashboard/recent-documents")
    assert r_rd.json()["total"] == 1
    assert r_rd.json()["documents"][0]["filename"] == "persisted.pdf"

    document_routes._remove_temp_upload_session(temp_id)


# ─── TEST 15: User Isolation ──────────────────────────────────────────────────

def test_quality_and_review_user_isolation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """User A and User B receive completely isolated quality intelligence."""
    doc_a = _make_persisted_doc(USER_A_ID, filename="user_a.pdf", confidence_level="HIGH")
    doc_b = _make_persisted_doc(USER_B_ID, filename="user_b.pdf", confidence_level="LOW", needs_review=True)

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
    r_q_a = client_a.get("/dashboard/quality")
    assert r_q_a.json()["high_count"] == 1
    assert r_q_a.json()["low_count"] == 0
    assert r_q_a.json()["review_count"] == 0

    r_rq_a = client_a.get("/dashboard/review-queue")
    assert r_rq_a.json()["total_review_needed"] == 0

    # User B requests
    client_b = get_user_client(USER_B_ID)
    r_q_b = client_b.get("/dashboard/quality")
    assert r_q_b.json()["high_count"] == 0
    assert r_q_b.json()["low_count"] == 1
    assert r_q_b.json()["review_count"] == 1

    r_rq_b = client_b.get("/dashboard/review-queue")
    assert r_rq_b.json()["total_review_needed"] == 1
    assert r_rq_b.json()["items"][0]["filename"] == "user_b.pdf"
    app.dependency_overrides.clear()


# ─── TEST 16: Authentication Required ─────────────────────────────────────────

def test_quality_endpoints_require_authentication(
    unauthenticated_client: TestClient,
) -> None:
    """Unauthenticated requests to quality APIs return 401."""
    assert unauthenticated_client.get("/dashboard/quality").status_code == 401
    assert unauthenticated_client.get("/dashboard/review-queue").status_code == 401
    assert unauthenticated_client.get("/dashboard/recent-documents").status_code == 401


# ─── TEST 17, 18, 19: Missing & Malformed Quality/Extraction Data Safety ───────

def test_missing_and_malformed_quality_data_safety(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Documents with null/corrupt quality results or failed status are handled safely."""
    doc_corrupt = CreatedDocumentMetadata(
        id=uuid4(),
        user_id=UUID(USER_A_ID),
        filename="corrupt.pdf",
        storage_path=f"{USER_A_ID}/corrupt/original.pdf",
        content_type="application/pdf",
        size=1024,
        status="failed",
        created_at=datetime.now(UTC),
        extraction_result=None,
        quality_result=None,
    )
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc_corrupt]),
    )

    r_q = client_user_a.get("/dashboard/quality")
    assert r_q.status_code == 200
    assert r_q.json()["total_documents"] == 1
    assert r_q.json()["low_count"] == 1
    assert r_q.json()["review_count"] == 1

    r_rq = client_user_a.get("/dashboard/review-queue")
    assert r_rq.status_code == 200
    assert r_rq.json()["total_review_needed"] == 1

    r_rd = client_user_a.get("/dashboard/recent-documents")
    assert r_rd.status_code == 200
    assert len(r_rd.json()["documents"]) == 1


# ─── TEST 20, 21, 22, 23: Document Lifecycle State Transitions ────────────────

def test_lifecycle_save_edit_delete_immediate_reflection(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Immediate dashboard reflection upon save, confidence edit, and delete."""
    store: list[CreatedDocumentMetadata] = []

    async def mock_get_docs(*, params, settings):
        return list(store)

    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        mock_get_docs,
    )

    # 1. Initially empty
    assert client_user_a.get("/dashboard/quality").json()["total_documents"] == 0

    # 2. Save document (HIGH)
    doc = _make_persisted_doc(USER_A_ID, confidence_level="HIGH")
    store.append(doc)

    assert client_user_a.get("/dashboard/quality").json()["high_count"] == 1
    assert client_user_a.get("/dashboard/review-queue").json()["total_review_needed"] == 0

    # 3. Edit confidence to LOW
    doc.quality_result["confidence_override"] = "LOW"
    assert client_user_a.get("/dashboard/quality").json()["low_count"] == 1
    assert client_user_a.get("/dashboard/review-queue").json()["total_review_needed"] == 1

    # 4. Delete document
    store.remove(doc)
    assert client_user_a.get("/dashboard/quality").json()["total_documents"] == 0
    assert client_user_a.get("/dashboard/review-queue").json()["total_review_needed"] == 0


# ─── TEST 24 & 25: Backward Compatibility (Milestones 7.1 and 7.2) ────────────

def test_milestone_7_1_and_7_2_apis_remain_unaffected(
    client_user_a: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Ensures GET /dashboard, /spending, /vendors, /items, and /highlights operate unchanged."""
    doc = _make_persisted_doc(
        USER_A_ID,
        vendor="Amazon",
        total=500.0,
        confidence_level="HIGH",
        date_str="2026-03-01",
    )
    monkeypatch.setattr(
        "app.services.dashboard._get_document_metadata",
        AsyncMock(return_value=[doc]),
    )

    # 7.1 Root Dashboard
    assert client_user_a.get("/dashboard").status_code == 200

    # 7.2 Spending
    assert client_user_a.get("/dashboard/spending?period=month").status_code == 200

    # 7.2 Vendors
    assert client_user_a.get("/dashboard/vendors").status_code == 200

    # 7.2 Items
    assert client_user_a.get("/dashboard/items").status_code == 200

    # 7.2 Highlights
    assert client_user_a.get("/dashboard/highlights").status_code == 200
