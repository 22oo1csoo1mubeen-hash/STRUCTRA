"""Deterministic prompts for STRUCTRA document AI workflows."""

from dataclasses import dataclass
import json


DEFAULT_RECEIPT_INVOICE_FIELDS = (
    "vendor_company",
    "address",
    "date",
    "total",
    "line_items",
)

LINE_ITEM_FIELDS = ("description", "line_total")


@dataclass(frozen=True)
class ReceiptInvoicePromptConfig:
    """Configuration for extending the top-level extraction output later."""

    additional_top_level_fields: tuple[str, ...] = ()


def build_receipt_invoice_extraction_prompt(
    config: ReceiptInvoicePromptConfig | None = None,
) -> str:
    """Build the JSON-only prompt for receipt and invoice extraction."""
    config = config or ReceiptInvoicePromptConfig()
    output_schema: dict[str, object] = {
        "vendor_company": None,
        "address": None,
        "date": None,
        "invoice_number": None,
        "subtotal": None,
        "discount": None,
        "taxable_amount": None,
        "tax": None,
        "tax_components": [
            {
                "name": "e.g. CGST, SGST, IGST, VAT, Service Tax, Surcharge, Cess",
                "rate": None,
                "amount": None,
            }
        ],
        "service_charge": None,
        "round_off": None,
        "total": None,
        "line_items": [
            {
                "description": None,
                "quantity": None,
                "unit_price": None,
                "line_total": None,
            }
        ],
    }
    output_schema.update(
        {field_name: None for field_name in config.additional_top_level_fields}
    )
    schema_json = json.dumps(output_schema, ensure_ascii=False, indent=2)

    return (
        "Analyze the provided receipt or invoice image carefully. Extract only information that is "
        "actually present in the document. Never invent, infer, or guess missing values. "
        "Preserve numbers accurately. Keep line items separate from document-level totals.\n"
        "Extract EACH tax component (CGST, SGST, IGST, VAT, Service Tax, Surcharge, Cess) as a SEPARATE object in tax_components.\n\n"
        "RULES FOR MULTIMODAL EXTRACTION:\n"
        "1. AUTHORITATIVE SOURCE: The visual image is the authoritative source. Extract ONLY information actually visible. Do not invent, infer, or guess missing values.\n"
        "2. VISUAL LAYOUT & TABLES: Use visual layout, table columns, alignment, printed digits, fonts, and spatial relationships to extract table data.\n"
        "3. IDENTIFIERS & DATES: Preserve exact vendor names, addresses, dates, and invoice/receipt numbers (e.g. preserve 'RCPT-2025-08-09-0015' exactly).\n"
        "4. LINE ITEMS & QUANTITIES: Extract ALL visible line items into line_items list with description, quantity, unit_price, and line_total. If a line item lists unit_price equal to line_total and quantity is omitted or not printed as a separate column, set quantity to 1.0.\n"
        "5. NUMERICS & DECIMALS: Preserve exact numbers and decimal values. Keep line item totals distinct from document subtotal, taxes, and final total.\n"
        "6. TAX & ADJUSTMENTS: Extract EACH tax component (CGST, SGST, IGST, VAT, Service Tax, Surcharge, Cesses such as SB Cess, KKC) as a SEPARATE object in tax_components with name, rate, and exact decimal amount (e.g. VAT: 28.13, Surcharge: 1.41, Service Tax: 12.60, SB Cess: 0.45, KKC: 0.45). Do NOT round taxes to whole numbers. If Round Off or rounding is printed (e.g. -0.04 or +0.02), extract it into round_off as a signed float (e.g. -0.04). In the top-level 'tax' field, extract the exact total tax amount (e.g. 43.04).\n"
        "7. FINAL TOTAL / NET AMOUNT: Extract the exact printed final net payable amount (often labeled 'NET AMOUNT', 'GRAND TOTAL', 'TOTAL AMOUNT', 'TOTAL PAYABLE', or 'AMOUNT PAID', e.g. 268.00). Do NOT recalculate or round up the final total; use the exact printed amount.\n"
        "8. TEXT SPACING: Preserve natural spacing in company names and item descriptions.\n"
        "9. OUTPUT FORMAT: Return only one valid JSON object conforming to the required schema shape with no explanatory text or markdown wrappers. Use null for a scalar field that cannot be confidently extracted, and use [] when no line items can be confidently extracted.\n\n"
        "Required JSON Output Shape:\n"
        f"{schema_json}"
    )


def build_multimodal_receipt_extraction_prompt(
    config: ReceiptInvoicePromptConfig | None = None,
) -> str:
    """Build prompt for Gemini Multimodal Vision extraction directly from receipt images."""
    return build_receipt_invoice_extraction_prompt(config)


def build_ocr_receipt_extraction_prompt(
    ocr_text_content: str,
    config: ReceiptInvoicePromptConfig | None = None,
) -> str:
    """Build the JSON extraction prompt for OCR-derived receipt/invoice text & layout input."""
    base_instructions = build_receipt_invoice_extraction_prompt(config)
    return (
        "You are an expert document understanding AI. The text below was recognized from a receipt/invoice "
        "by a local OCR engine, organized row by row.\n\n"
        "RULES FOR EXTRACTION:\n"
        "1. TEXT SPACING: Restore natural spaces in vendor_company, address, and line item descriptions if OCR merged words together (e.g. convert 'ABCMART' to 'ABC MART', '123Green Street' to '123 Green Street'). Do NOT insert spaces into invoice/receipt numbers or codes (e.g. preserve 'RCPT-2025-08-09-0015' exactly).\n"
        "2. LINE ITEMS & QUANTITY: Extract ALL line items in the receipt table. For every line item, extract description, quantity, unit_price, and line_total as independent fields. If a line item lists unit_price equal to line_total and quantity is not printed as a separate number, extract quantity as 1.0 (do NOT leave quantity as null for valid line items).\n"
        "3. NUMERICS & DATES: Preserve exact numeric values, decimal amounts, dates, and invoice numbers.\n"
        "4. TAX & ADJUSTMENTS: Keep CGST, SGST, IGST, VAT, Service Tax, Surcharges, and Cesses as separate objects in tax_components list with exact decimal amounts. Extract signed round-off into round_off.\n"
        "5. FINAL TOTAL: Extract the exact printed NET AMOUNT / GRAND TOTAL as total.\n"
        "6. OUTPUT: Return ONLY one valid JSON object following the required output shape with no Markdown tags or extra prose.\n\n"
        f"--- RECOGNIZED OCR DOCUMENT TEXT ---\n{ocr_text_content}\n--- END OCR TEXT ---\n\n"
        f"{base_instructions}"
    )
