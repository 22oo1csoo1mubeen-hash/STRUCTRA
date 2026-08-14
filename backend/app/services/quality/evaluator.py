"""Deterministic STRUCTRA Extraction Quality & Review Evaluator."""

import re
import time
from typing import Any

from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.mathematical_validation import validate_extraction_totals
from app.services.ocr.schemas import OCRResult
from app.services.quality.schemas import (
    ExtractionQualityResult,
    FieldConfidenceDetail,
    ProviderInfo,
    QualitySignal,
)


def _normalize_text(text: str) -> str:
    """Normalize text for evidence comparison: lowercase, stripped punctuation, collapsed spaces."""
    if not text:
        return ""
    cleaned = re.sub(r"[^\w\s]", "", text.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def evaluate_extraction_quality(
    extraction: ReceiptInvoiceExtraction,
    ocr_result: OCRResult | None = None,
    provider_info: ProviderInfo | dict[str, str] | None = None,
) -> ExtractionQualityResult:
    """Evaluate extraction quality, field confidence, and review flags deterministically.

    This function performs zero network/LLM calls and reuses existing mathematical validation.
    """
    t0 = time.perf_counter()

    # Parse provider_info
    p_info: ProviderInfo | None = None
    if isinstance(provider_info, ProviderInfo):
        p_info = provider_info
    elif isinstance(provider_info, dict) and "provider" in provider_info and "model" in provider_info:
        p_info = ProviderInfo(provider=provider_info["provider"], model=provider_info["model"])

    signals: list[QualitySignal] = []
    field_signals: dict[str, list[QualitySignal]] = {
        "vendor_company": [],
        "date": [],
        "invoice_number": [],
        "total": [],
        "line_items": [],
    }

    needs_review = False
    total_score_components: list[float] = []
    max_score_cap: float = 1.0

    # ----------------------------------------------------
    # 1. Mathematical Validation Reuse
    # ----------------------------------------------------
    math_res = validate_extraction_totals(extraction)
    if math_res.total_matches is True:
        sig = QualitySignal(
            code="TOTAL_MATH_MATCH",
            severity="positive",
            message="Calculated line item total matches document total.",
        )
        signals.append(sig)
        field_signals["total"].append(sig)
        total_score_components.append(1.0)
    elif math_res.total_matches is False:
        sig = QualitySignal(
            code="TOTAL_MATH_MISMATCH",
            severity="critical",
            message="Calculated line item total does not match document total.",
        )
        signals.append(sig)
        field_signals["total"].append(sig)
        needs_review = True
        total_score_components.append(0.0)
        max_score_cap = min(max_score_cap, 0.70)
    else:
        total_score_components.append(0.7)

    if math_res.subtotal_matches is False:
        sig = QualitySignal(
            code="SUBTOTAL_MATH_MISMATCH",
            severity="warning",
            message="Sum of line items does not match document subtotal.",
        )
        signals.append(sig)

    # ----------------------------------------------------
    # 2. Line Item Arithmetic Consistency
    # ----------------------------------------------------
    line_item_math_valid = True
    line_item_math_performed = False

    for item in extraction.line_items:
        if item.quantity is not None and item.unit_price is not None and item.line_total is not None:
            line_item_math_performed = True
            expected = item.quantity * item.unit_price
            if abs(expected - item.line_total) > 0.05:
                line_item_math_valid = False
                break

    if line_item_math_performed:
        if line_item_math_valid:
            sig = QualitySignal(
                code="LINE_ITEM_MATH_MATCH",
                severity="positive",
                message="Line item quantities and unit prices match line totals.",
            )
            signals.append(sig)
            field_signals["line_items"].append(sig)
            total_score_components.append(1.0)
        else:
            sig = QualitySignal(
                code="LINE_ITEM_MATH_MISMATCH",
                severity="warning",
                message="One or more line items have quantity x unit price != line total.",
            )
            signals.append(sig)
            field_signals["line_items"].append(sig)
            total_score_components.append(0.3)
            max_score_cap = min(max_score_cap, 0.80)
    else:
        total_score_components.append(0.8)

    # ----------------------------------------------------
    # 3. Numeric Sanity Checks
    # ----------------------------------------------------
    suspicious_numeric = False
    if extraction.total is not None and extraction.total < 0:
        suspicious_numeric = True
    for item in extraction.line_items:
        if (item.quantity is not None and item.quantity < 0) or (
            item.unit_price is not None and item.unit_price < 0
        ) or (item.line_total is not None and item.line_total < 0):
            suspicious_numeric = True
            break

    if suspicious_numeric:
        sig = QualitySignal(
            code="SUSPICIOUS_NUMERIC_VALUE",
            severity="critical",
            message="Extraction contains negative or invalid numeric values.",
        )
        signals.append(sig)
        field_signals["total"].append(sig)
        needs_review = True
        total_score_components.append(0.0)
        max_score_cap = min(max_score_cap, 0.40)
    else:
        total_score_components.append(1.0)

    # ----------------------------------------------------
    # 4. Field Completeness Checks
    # ----------------------------------------------------
    if extraction.total is not None:
        sig = QualitySignal(
            code="TOTAL_PRESENT",
            severity="positive",
            message="Document total is present.",
        )
        field_signals["total"].append(sig)
        total_score_components.append(1.0)
    else:
        sig = QualitySignal(
            code="MISSING_TOTAL",
            severity="critical",
            message="Document total is missing.",
        )
        signals.append(sig)
        field_signals["total"].append(sig)
        needs_review = True
        total_score_components.append(0.0)
        max_score_cap = min(max_score_cap, 0.50)

    if extraction.vendor_company:
        sig = QualitySignal(
            code="VENDOR_PRESENT",
            severity="positive",
            message="Vendor company is present.",
        )
        field_signals["vendor_company"].append(sig)
        total_score_components.append(1.0)
    else:
        sig = QualitySignal(
            code="MISSING_VENDOR",
            severity="warning",
            message="Vendor company is missing.",
        )
        signals.append(sig)
        field_signals["vendor_company"].append(sig)
        total_score_components.append(0.5)

    if extraction.date:
        sig = QualitySignal(
            code="DATE_PRESENT",
            severity="positive",
            message="Document date is present.",
        )
        field_signals["date"].append(sig)
        total_score_components.append(1.0)
    else:
        sig = QualitySignal(
            code="MISSING_DATE",
            severity="warning",
            message="Document date is missing.",
        )
        signals.append(sig)
        field_signals["date"].append(sig)
        total_score_components.append(0.5)

    if extraction.invoice_number:
        sig = QualitySignal(
            code="INVOICE_NUMBER_PRESENT",
            severity="positive",
            message="Invoice number is present.",
        )
        field_signals["invoice_number"].append(sig)
    else:
        sig = QualitySignal(
            code="MISSING_INVOICE_NUMBER",
            severity="positive",
            message="Invoice number is omitted.",
        )
        signals.append(sig)
        field_signals["invoice_number"].append(sig)

    if extraction.line_items:
        sig = QualitySignal(
            code="LINE_ITEMS_PRESENT",
            severity="positive",
            message=f"Extracted {len(extraction.line_items)} line items.",
        )
        field_signals["line_items"].append(sig)
        total_score_components.append(1.0)
    else:
        sig = QualitySignal(
            code="MISSING_LINE_ITEMS",
            severity="warning",
            message="No line items extracted.",
        )
        signals.append(sig)
        field_signals["line_items"].append(sig)
        total_score_components.append(0.5)

    # ----------------------------------------------------
    # 5. OCR Evidence Comparison (Supporting Signal Only)
    # ----------------------------------------------------
    if ocr_result and ocr_result.full_text and ocr_result.full_text.strip():
        ocr_norm = _normalize_text(ocr_result.full_text)

        # Vendor OCR check
        if extraction.vendor_company:
            v_norm = _normalize_text(extraction.vendor_company)
            first_v_word = v_norm.split()[0] if v_norm.split() else ""
            if (v_norm and v_norm in ocr_norm) or (first_v_word and first_v_word in ocr_norm):
                sig = QualitySignal(
                    code="OCR_VENDOR_MATCH",
                    severity="positive",
                    message="Extracted vendor matches OCR text evidence.",
                )
                signals.append(sig)
                field_signals["vendor_company"].append(sig)
                total_score_components.append(1.0)
            else:
                sig = QualitySignal(
                    code="OCR_VENDOR_MISMATCH",
                    severity="warning",
                    message="Extracted vendor is not explicitly recognized in OCR text.",
                )
                signals.append(sig)
                field_signals["vendor_company"].append(sig)
                total_score_components.append(0.7)

        # Invoice Number OCR check
        if extraction.invoice_number:
            inv_norm = _normalize_text(extraction.invoice_number)
            if inv_norm and inv_norm in ocr_norm:
                sig = QualitySignal(
                    code="OCR_INVOICE_NUMBER_MATCH",
                    severity="positive",
                    message="Extracted invoice number matches OCR text evidence.",
                )
                signals.append(sig)
                field_signals["invoice_number"].append(sig)
            else:
                sig = QualitySignal(
                    code="OCR_INVOICE_NUMBER_MISMATCH",
                    severity="warning",
                    message="Extracted invoice number is not explicitly recognized in OCR text.",
                )
                signals.append(sig)
                field_signals["invoice_number"].append(sig)

        # Total OCR check
        if extraction.total is not None:
            t_str = f"{extraction.total:.2f}"
            t_str_alt = f"{extraction.total:.0f}" if extraction.total.is_integer() else t_str
            if t_str in ocr_result.full_text or t_str_alt in ocr_result.full_text:
                sig = QualitySignal(
                    code="OCR_TOTAL_MATCH",
                    severity="positive",
                    message="Extracted total matches OCR text evidence.",
                )
                signals.append(sig)
                field_signals["total"].append(sig)
                total_score_components.append(1.0)
            else:
                sig = QualitySignal(
                    code="OCR_TOTAL_MISMATCH",
                    severity="warning",
                    message="Extracted total amount differs from recognized OCR numbers.",
                )
                signals.append(sig)
                field_signals["total"].append(sig)
                total_score_components.append(0.6)

    # ----------------------------------------------------
    # 6. Score Calculation & Review Flag Determination
    # ----------------------------------------------------
    raw_score = sum(total_score_components) / len(total_score_components) if total_score_components else 0.5
    overall_confidence = min(raw_score, max_score_cap)
    overall_confidence = round(max(0.0, min(1.0, overall_confidence)), 2)

    if overall_confidence >= 0.85:
        confidence_level = "HIGH"
    elif overall_confidence >= 0.60:
        confidence_level = "MEDIUM"
    else:
        confidence_level = "LOW"

    if confidence_level == "LOW":
        needs_review = True

    # Build per-field confidence details
    field_confidence: dict[str, FieldConfidenceDetail] = {}
    for f_name, f_sigs in field_signals.items():
        has_critical = any(s.severity == "critical" for s in f_sigs)
        has_warning = any(s.severity == "warning" for s in f_sigs)
        has_positive = any(s.severity == "positive" for s in f_sigs)

        if has_critical:
            f_conf = 0.2
            f_level = "LOW"
        elif has_warning and not has_positive:
            f_conf = 0.5
            f_level = "MEDIUM"
        elif has_warning and has_positive:
            f_conf = 0.75
            f_level = "MEDIUM"
        elif has_positive:
            f_conf = 1.0
            f_level = "HIGH"
        else:
            f_conf = 0.8
            f_level = "MEDIUM"

        field_confidence[f_name] = FieldConfidenceDetail(
            confidence=f_conf,
            confidence_level=f_level,
            signals=f_sigs,
        )

    t1 = time.perf_counter()
    eval_ms = (t1 - t0) * 1000.0

    print(f"[STRUCTRA PERF] Quality evaluation: {eval_ms:.2f} ms")
    print(
        f"[STRUCTRA QUALITY] Confidence: {confidence_level} | "
        f"Score: {overall_confidence:.2f} | Review: {'YES' if needs_review else 'NO'}"
    )

    return ExtractionQualityResult(
        overall_confidence=overall_confidence,
        confidence_level=confidence_level,
        needs_review=needs_review,
        signals=signals,
        field_confidence=field_confidence,
        provider_info=p_info,
    )
