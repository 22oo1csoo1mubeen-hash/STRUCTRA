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
    confidence_override: str | None = None,
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
    max_score_cap: float = 1.0

    # ----------------------------------------------------
    # 1. Mathematical Validation (Weight: 35%)
    # ----------------------------------------------------
    math_res = validate_extraction_totals(extraction)
    math_score = 0.5

    if math_res.total_matches is True:
        sig = QualitySignal(
            code="TOTAL_MATH_MATCH",
            severity="positive",
            message="Calculated line item total matches document total.",
        )
        signals.append(sig)
        field_signals["total"].append(sig)
        math_score = 1.0
    elif math_res.total_matches is False:
        sig = QualitySignal(
            code="TOTAL_MATH_MISMATCH",
            severity="critical",
            message="Calculated line item total does not match document total.",
        )
        signals.append(sig)
        field_signals["total"].append(sig)
        needs_review = True
        math_score = 0.15
        max_score_cap = min(max_score_cap, 0.65)
    else:
        math_score = 0.65

    if math_res.subtotal_matches is False:
        sig = QualitySignal(
            code="SUBTOTAL_MATH_MISMATCH",
            severity="warning",
            message="Sum of line items does not match document subtotal.",
        )
        signals.append(sig)
        math_score = min(math_score, 0.60)
    elif math_res.subtotal_matches is True:
        math_score = min(1.0, math_score + 0.05)

    # ----------------------------------------------------
    # 2. Line Item Consistency & Richness (Weight: 25%)
    # ----------------------------------------------------
    line_item_score = 0.5
    line_item_math_valid = True
    line_item_math_performed = False

    if extraction.line_items:
        sig = QualitySignal(
            code="LINE_ITEMS_PRESENT",
            severity="positive",
            message=f"Extracted {len(extraction.line_items)} line items.",
        )
        field_signals["line_items"].append(sig)

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
                line_item_score = 1.0
            else:
                sig = QualitySignal(
                    code="LINE_ITEM_MATH_MISMATCH",
                    severity="warning",
                    message="One or more line items have quantity x unit price != line total.",
                )
                signals.append(sig)
                field_signals["line_items"].append(sig)
                line_item_score = 0.35
                max_score_cap = min(max_score_cap, 0.75)
        else:
            # Line items have descriptions and totals without qty/unit_price
            line_item_score = 0.88
    else:
        sig = QualitySignal(
            code="MISSING_LINE_ITEMS",
            severity="warning",
            message="No line items extracted.",
        )
        signals.append(sig)
        field_signals["line_items"].append(sig)
        line_item_score = 0.30

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
        max_score_cap = min(max_score_cap, 0.40)

    # ----------------------------------------------------
    # 4. Core Header Field Completeness (Weight: 30%)
    # ----------------------------------------------------
    field_scores: list[float] = []

    # Document Total
    if extraction.total is not None:
        sig = QualitySignal(
            code="TOTAL_PRESENT",
            severity="positive",
            message="Document total is present.",
        )
        field_signals["total"].append(sig)
        field_scores.append(1.0 if not suspicious_numeric else 0.0)
    else:
        sig = QualitySignal(
            code="MISSING_TOTAL",
            severity="critical",
            message="Document total is missing.",
        )
        signals.append(sig)
        field_signals["total"].append(sig)
        needs_review = True
        field_scores.append(0.0)
        max_score_cap = min(max_score_cap, 0.45)

    # Vendor / Company
    if extraction.vendor_company and extraction.vendor_company.strip():
        sig = QualitySignal(
            code="VENDOR_PRESENT",
            severity="positive",
            message="Vendor company is present.",
        )
        field_signals["vendor_company"].append(sig)
        field_scores.append(1.0)
    else:
        sig = QualitySignal(
            code="MISSING_VENDOR",
            severity="warning",
            message="Vendor company is missing.",
        )
        signals.append(sig)
        field_signals["vendor_company"].append(sig)
        field_scores.append(0.30)

    # Date
    if extraction.date and extraction.date.strip():
        sig = QualitySignal(
            code="DATE_PRESENT",
            severity="positive",
            message="Document date is present.",
        )
        field_signals["date"].append(sig)
        field_scores.append(1.0)
    else:
        sig = QualitySignal(
            code="MISSING_DATE",
            severity="warning",
            message="Document date is missing.",
        )
        signals.append(sig)
        field_signals["date"].append(sig)
        field_scores.append(0.35)

    # Invoice / Receipt Number
    if extraction.invoice_number and extraction.invoice_number.strip():
        sig = QualitySignal(
            code="INVOICE_NUMBER_PRESENT",
            severity="positive",
            message="Invoice number is present.",
        )
        field_signals["invoice_number"].append(sig)
        field_scores.append(1.0)
    else:
        sig = QualitySignal(
            code="MISSING_INVOICE_NUMBER",
            severity="positive",
            message="Invoice number is omitted.",
        )
        signals.append(sig)
        field_signals["invoice_number"].append(sig)
        field_scores.append(0.85)

    core_fields_score = sum(field_scores) / len(field_scores) if field_scores else 0.5

    # ----------------------------------------------------
    # 5. Tax & Structure Breakdown Completeness (Weight: 10%)
    # ----------------------------------------------------
    structure_score = 0.75
    if extraction.tax_components:
        structure_score = 1.0
    elif extraction.tax is not None or extraction.subtotal is not None:
        structure_score = 0.90

    # ----------------------------------------------------
    # 6. OCR Evidence Comparison (Supporting Signal Only)
    # ----------------------------------------------------
    if ocr_result and ocr_result.full_text and ocr_result.full_text.strip():
        ocr_norm = _normalize_text(ocr_result.full_text)

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
            else:
                sig = QualitySignal(
                    code="OCR_VENDOR_MISMATCH",
                    severity="warning",
                    message="Extracted vendor is not explicitly recognized in OCR text.",
                )
                signals.append(sig)
                field_signals["vendor_company"].append(sig)
                core_fields_score = max(0.2, core_fields_score - 0.05)

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
            else:
                sig = QualitySignal(
                    code="OCR_TOTAL_MISMATCH",
                    severity="warning",
                    message="Extracted total amount differs from recognized OCR numbers.",
                )
                signals.append(sig)
                field_signals["total"].append(sig)
                core_fields_score = max(0.2, core_fields_score - 0.08)

    # ----------------------------------------------------
    # 7. Weighted System Confidence & Level Calculation
    # ----------------------------------------------------
    # Weights: Math (35%), Line Items (25%), Core Fields (30%), Structure (10%)
    weighted_score = (
        (math_score * 0.35)
        + (line_item_score * 0.25)
        + (core_fields_score * 0.30)
        + (structure_score * 0.10)
    )

    system_confidence = min(weighted_score, max_score_cap)
    system_confidence = round(max(0.0, min(1.0, system_confidence)), 2)

    if system_confidence >= 0.80:
        system_confidence_level = "HIGH"
    elif system_confidence >= 0.55:
        system_confidence_level = "MEDIUM"
    else:
        system_confidence_level = "LOW"

    # Effective confidence level resolves as: confidence_override ?? system_confidence_level
    clean_override = None
    if confidence_override and isinstance(confidence_override, str) and confidence_override.strip():
        upper_override = confidence_override.strip().upper()
        if upper_override in ("HIGH", "MEDIUM", "LOW"):
            clean_override = upper_override

    effective_confidence_level = clean_override if clean_override else system_confidence_level
    if effective_confidence_level == "HIGH":
        needs_review = False
    else:
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
        f"[STRUCTRA QUALITY] System: {system_confidence_level} ({system_confidence:.2f}) | "
        f"Override: {clean_override or 'None'} | Effective: {effective_confidence_level} | "
        f"Review: {'YES' if needs_review else 'NO'}"
    )

    return ExtractionQualityResult(
        overall_confidence=system_confidence,
        confidence_level=effective_confidence_level,
        system_confidence=system_confidence,
        system_confidence_level=system_confidence_level,
        confidence_override=clean_override,
        needs_review=needs_review,
        signals=signals,
        field_confidence=field_confidence,
        provider_info=p_info,
    )
