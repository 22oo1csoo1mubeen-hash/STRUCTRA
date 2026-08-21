"""Data mapping and sanitization layer for STRUCTRA document exports."""

import re
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from app.services.document_metadata import CreatedDocumentMetadata
from app.services.export.schemas import (
    ExportDocumentData,
    ExportLineItem,
    ExportTaxComponent,
)


def _safe_float(val: Any) -> float | None:
    """Safely convert any numeric, Decimal, or formatted string value to float."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, str):
        cleaned = re.sub(r"[^\d.-]", "", val.strip())
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _safe_str(val: Any) -> str | None:
    """Safely return a non-empty stripped string or None."""
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


def _safe_datetime(val: Any) -> datetime | None:
    """Safely parse or return a datetime object."""
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None
    return None


def map_document_to_export_data(
    doc: CreatedDocumentMetadata | dict[str, Any]
) -> ExportDocumentData:
    """Map raw or database document metadata and extraction results into a normalized ExportDocumentData structure."""
    if isinstance(doc, CreatedDocumentMetadata):
        doc_id = str(doc.id)
        filename = doc.filename or "document"
        created_at = doc.created_at
        processed_at = doc.processed_at
        status = doc.status or "completed"
        ext = doc.extraction_result or {}
        qual = doc.quality_result or {}
    elif isinstance(doc, dict):
        doc_id = str(doc.get("id") or doc.get("document_id") or "")
        filename = doc.get("filename") or "document"
        created_at = _safe_datetime(doc.get("created_at"))
        processed_at = _safe_datetime(doc.get("processed_at"))
        status = doc.get("status") or "completed"
        ext = doc.get("extraction_result") or doc.get("extraction") or {}
        qual = doc.get("quality_result") or doc.get("quality") or {}
    else:
        # Fallback duck typing
        doc_id = str(getattr(doc, "id", getattr(doc, "document_id", "")))
        filename = getattr(doc, "filename", "document")
        created_at = _safe_datetime(getattr(doc, "created_at", None))
        processed_at = _safe_datetime(getattr(doc, "processed_at", None))
        status = getattr(doc, "status", "completed")
        ext = getattr(doc, "extraction_result", getattr(doc, "extraction", {})) or {}
        qual = getattr(doc, "quality_result", getattr(doc, "quality", {})) or {}

    # Extract vendor and document facts
    vendor_name = _safe_str(ext.get("vendor_company") or ext.get("vendor_name") or ext.get("vendor"))
    vendor_address = _safe_str(ext.get("address"))
    document_date = _safe_str(ext.get("date") or ext.get("document_date"))
    invoice_number = _safe_str(ext.get("invoice_number") or ext.get("receipt_number"))

    # Financial fields
    subtotal = _safe_float(ext.get("subtotal"))
    discount = _safe_float(ext.get("discount"))
    taxable_amount = _safe_float(ext.get("taxable_amount"))
    tax = _safe_float(ext.get("tax"))
    service_charge = _safe_float(ext.get("service_charge"))
    round_off = _safe_float(ext.get("round_off"))
    total = _safe_float(ext.get("total") or ext.get("total_amount"))

    # Tax components
    raw_tax_components = ext.get("tax_components") or []
    tax_components: list[ExportTaxComponent] = []
    if isinstance(raw_tax_components, list):
        for tc in raw_tax_components:
            if isinstance(tc, dict):
                name = _safe_str(tc.get("name")) or "Tax"
                rate = _safe_float(tc.get("rate"))
                amount = _safe_float(tc.get("amount"))
                tax_components.append(ExportTaxComponent(name=name, rate=rate, amount=amount))

    # Line items
    raw_line_items = ext.get("line_items") or []
    line_items: list[ExportLineItem] = []
    if isinstance(raw_line_items, list):
        for item in raw_line_items:
            if isinstance(item, dict):
                desc = _safe_str(item.get("description") or item.get("item") or item.get("name")) or "Item"
                qty = _safe_float(item.get("quantity") or item.get("qty"))
                unit_price = _safe_float(item.get("unit_price") or item.get("rate") or item.get("price"))
                line_tot = _safe_float(item.get("line_total") or item.get("amount") or item.get("total"))
                line_items.append(
                    ExportLineItem(
                        description=desc,
                        quantity=qty,
                        unit_price=unit_price,
                        line_total=line_tot,
                    )
                )

    # Quality & validation signals
    confidence_level = _safe_str(qual.get("confidence_level"))
    confidence_score = _safe_float(qual.get("overall_confidence") or qual.get("confidence_score"))
    confidence_override = _safe_str(qual.get("confidence_override"))

    math_val = qual.get("mathematical_validation") or {}
    arithmetic_validated = bool(math_val.get("validation_performed")) if isinstance(math_val, dict) else None
    arithmetic_matches = bool(math_val.get("total_matches")) if isinstance(math_val, dict) and "total_matches" in math_val else None

    needs_review = qual.get("needs_review")
    if needs_review is None and confidence_level:
        needs_review = confidence_level != "HIGH"

    issues_list: list[str] = []
    raw_issues = qual.get("issues") or []
    if isinstance(raw_issues, list):
        for iss in raw_issues:
            if isinstance(iss, dict):
                msg = iss.get("message") or iss.get("title") or ""
                if msg:
                    issues_list.append(str(msg))
            elif isinstance(iss, str) and iss.strip():
                issues_list.append(iss.strip())

    return ExportDocumentData(
        document_id=doc_id,
        filename=filename,
        created_at=created_at,
        processed_at=processed_at,
        status=status,
        vendor_name=vendor_name,
        vendor_address=vendor_address,
        document_date=document_date,
        invoice_number=invoice_number,
        currency_symbol="₹",
        subtotal=subtotal,
        discount=discount,
        taxable_amount=taxable_amount,
        tax=tax,
        tax_components=tax_components,
        service_charge=service_charge,
        round_off=round_off,
        total=total,
        line_items=line_items,
        confidence_level=confidence_level,
        confidence_score=confidence_score,
        confidence_override=confidence_override,
        arithmetic_validated=arithmetic_validated,
        arithmetic_matches=arithmetic_matches,
        needs_review=needs_review,
        issues=issues_list,
    )


def generate_export_filename(
    data: ExportDocumentData | CreatedDocumentMetadata | dict[str, Any]
) -> str:
    """Generate a clean, sanitized, readable filename for the exported workbook using original filename stem."""
    if not isinstance(data, ExportDocumentData):
        data = map_document_to_export_data(data)

    raw_name = data.filename or ""
    # Strip path if any (e.g. from traversal attempts)
    raw_name = re.sub(r'[\/:*?"<>|\r\n\t\x00\\]', "_", raw_name)

    # Strip extension from original filename
    if "." in raw_name:
        base_name = raw_name.rsplit(".", 1)[0]
    else:
        base_name = raw_name or "document"

    # Sanitize invalid characters and path traversal attempts
    clean_name = re.sub(r"\.+", "_", base_name)
    clean_name = re.sub(r"[\s\t\r\n]+", "_", clean_name)
    clean_name = re.sub(r"_+", "_", clean_name).strip(" ._")
    if not clean_name:
        clean_name = "document"

    # Truncate if too long (max 80 chars for base)
    if len(clean_name) > 80:
        clean_name = clean_name[:80].rstrip("._")

    return f"STRUCTRA_EXPORT_{clean_name}.xlsx"
