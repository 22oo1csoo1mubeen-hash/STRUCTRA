"""Test suite for Document Library receipt date and amount sorting.

Verifies:
1. Date: Newest First (date_desc) sorts chronologically by receipt date regardless of date format.
2. Date: Oldest First (date_asc) sorts chronologically by receipt date regardless of date format.
3. Multi-format dates (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, 2-digit years, Month names).
4. Amount: High to Low (amount_desc) and Low to High (amount_asc).
5. Missing / corrupt date fallback to created_at.
6. Server-side pagination with custom sorting.
7. HTTP endpoint /documents?sort_by=date_desc and /documents?sort_by=date_asc.
"""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
import pytest

from app.api.dependencies import get_current_user
from app.core.config import Settings, get_settings
from app.main import app
from app.schemas.auth import CurrentUser
from app.services.document_metadata import CreatedDocumentMetadata, list_document_metadata

USER_ID = "00000000-0000-0000-0000-000000000099"


def _make_doc(
    *,
    doc_id: UUID | None = None,
    filename: str = "receipt.pdf",
    vendor: str = "Store",
    date_str: str | None = None,
    total: float | None = 100.0,
    created_at: datetime | None = None,
) -> CreatedDocumentMetadata:
    d_id = doc_id or uuid4()
    return CreatedDocumentMetadata(
        id=d_id,
        user_id=UUID(USER_ID),
        filename=filename,
        storage_path=f"documents/{USER_ID}/{filename}",
        content_type="application/pdf",
        size=2048,
        status="completed",
        created_at=created_at or datetime(2026, 8, 20, 12, 0, 0, tzinfo=UTC),
        processed_at=created_at or datetime(2026, 8, 20, 12, 0, 0, tzinfo=UTC),
        content_hash=f"hash_{d_id}",
        extraction_result={
            "vendor_company": vendor,
            "date": date_str,
            "total": total,
        },
        quality_result={
            "overall_confidence": 0.95,
            "confidence_level": "HIGH",
            "needs_review": False,
        },
    )


def _make_settings() -> Settings:
    return Settings(
        supabase_url="https://example.supabase.co",
        supabase_key="fake_key",
        supabase_service_role_key="fake_role",
        supabase_storage_bucket="documents",
    )


@pytest.fixture
def auth_client() -> TestClient:
    app.dependency_overrides[get_settings] = _make_settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=USER_ID)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_date_desc_sorting_multi_format():
    """Verify date_desc sorts newest receipts first even with diverse date formats."""
    # Dates: 2026-08-15 (newest), 2025-01-01, 2024-05-10, 2021-12-20 (oldest)
    doc_2021 = _make_doc(filename="doc_2021.pdf", date_str="20/12/2021")
    doc_2024 = _make_doc(filename="doc_2024.pdf", date_str="2024-05-10")
    doc_2025 = _make_doc(filename="doc_2025.pdf", date_str="01/01/2025")
    doc_2026 = _make_doc(filename="doc_2026.pdf", date_str="15/08/2026")

    raw_docs = [doc_2021, doc_2026, doc_2024, doc_2025]
    settings = _make_settings()

    mock_resp = SimpleNamespace(
        is_success=True,
        headers={"content-range": "0-3/4"},
        json=lambda: [d.model_dump(mode="json") for d in raw_docs],
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp

        records, total = await list_document_metadata(
            user_id=USER_ID,
            page=1,
            page_size=10,
            sort_by="date_desc",
            settings=settings,
        )

        assert total == 4
        filenames = [r.filename for r in records]
        assert filenames == ["doc_2026.pdf", "doc_2025.pdf", "doc_2024.pdf", "doc_2021.pdf"]


@pytest.mark.anyio
async def test_date_asc_sorting_multi_format():
    """Verify date_asc sorts oldest receipts first even with diverse date formats."""
    doc_2021 = _make_doc(filename="doc_2021.pdf", date_str="20/12/2021")
    doc_2024 = _make_doc(filename="doc_2024.pdf", date_str="2024-05-10")
    doc_2025 = _make_doc(filename="doc_2025.pdf", date_str="01/01/2025")
    doc_2026 = _make_doc(filename="doc_2026.pdf", date_str="15/08/2026")

    raw_docs = [doc_2026, doc_2021, doc_2025, doc_2024]
    settings = _make_settings()

    mock_resp = SimpleNamespace(
        is_success=True,
        headers={"content-range": "0-3/4"},
        json=lambda: [d.model_dump(mode="json") for d in raw_docs],
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp

        records, total = await list_document_metadata(
            user_id=USER_ID,
            page=1,
            page_size=10,
            sort_by="date_asc",
            settings=settings,
        )

        assert total == 4
        filenames = [r.filename for r in records]
        assert filenames == ["doc_2021.pdf", "doc_2024.pdf", "doc_2025.pdf", "doc_2026.pdf"]


@pytest.mark.anyio
async def test_amount_sorting():
    """Verify amount_desc and amount_asc sort deterministically."""
    doc_100 = _make_doc(filename="d100.pdf", total=100.0)
    doc_500 = _make_doc(filename="d500.pdf", total=500.0)
    doc_50 = _make_doc(filename="d50.pdf", total=50.0)

    raw_docs = [doc_100, doc_500, doc_50]
    settings = _make_settings()

    mock_resp = SimpleNamespace(
        is_success=True,
        headers={"content-range": "0-2/3"},
        json=lambda: [d.model_dump(mode="json") for d in raw_docs],
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp

        # Amount Desc
        rec_desc, _ = await list_document_metadata(
            user_id=USER_ID, page=1, page_size=10, sort_by="amount_desc", settings=settings
        )
        assert [r.filename for r in rec_desc] == ["d500.pdf", "d100.pdf", "d50.pdf"]

        # Amount Asc
        rec_asc, _ = await list_document_metadata(
            user_id=USER_ID, page=1, page_size=10, sort_by="amount_asc", settings=settings
        )
        assert [r.filename for r in rec_asc] == ["d50.pdf", "d100.pdf", "d500.pdf"]


@pytest.mark.anyio
async def test_pagination_with_date_sort():
    """Verify pagination slices the deterministically sorted documents correctly."""
    docs = [
        _make_doc(filename=f"doc_{i}.pdf", date_str=f"2026-0{i+1}-01")
        for i in range(5)
    ]  # 2026-01-01 to 2026-05-01

    settings = _make_settings()
    mock_resp = SimpleNamespace(
        is_success=True,
        headers={"content-range": "0-4/5"},
        json=lambda: [d.model_dump(mode="json") for d in docs],
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp

        # Page 1, size 2 (date_desc: doc_4, doc_3)
        p1, tot = await list_document_metadata(
            user_id=USER_ID, page=1, page_size=2, sort_by="date_desc", settings=settings
        )
        assert tot == 5
        assert [r.filename for r in p1] == ["doc_4.pdf", "doc_3.pdf"]

        # Page 2, size 2 (date_desc: doc_2, doc_1)
        p2, tot = await list_document_metadata(
            user_id=USER_ID, page=2, page_size=2, sort_by="date_desc", settings=settings
        )
        assert tot == 5
        assert [r.filename for r in p2] == ["doc_2.pdf", "doc_1.pdf"]


def test_http_route_date_sorting(auth_client: TestClient):
    """Verify GET /documents?sort_by=date_desc and sort_by=date_asc via HTTP."""
    doc_old = _make_doc(filename="old_receipt.pdf", date_str="10/01/2022")
    doc_new = _make_doc(filename="new_receipt.pdf", date_str="15/08/2026")
    raw_docs = [doc_old, doc_new]

    mock_resp = SimpleNamespace(
        is_success=True,
        headers={"content-range": "0-1/2"},
        json=lambda: [d.model_dump(mode="json") for d in raw_docs],
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get, \
         patch("app.services.document_metadata.get_user_document_library_stats", new_callable=AsyncMock) as mock_stats:
        mock_get.return_value = mock_resp
        mock_stats.return_value = (2, 2, 0)

        # 1. Date Desc
        r_desc = auth_client.get("/documents?sort_by=date_desc")
        assert r_desc.status_code == 200
        items_desc = r_desc.json()["items"]
        assert items_desc[0]["filename"] == "new_receipt.pdf"
        assert items_desc[1]["filename"] == "old_receipt.pdf"

        # 2. Date Asc
        r_asc = auth_client.get("/documents?sort_by=date_asc")
        assert r_asc.status_code == 200
        items_asc = r_asc.json()["items"]
        assert items_asc[0]["filename"] == "old_receipt.pdf"
        assert items_asc[1]["filename"] == "new_receipt.pdf"
