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
    """Build the JSON-only prompt for receipt and invoice extraction.

    Document bytes or text are deliberately not accepted here. M4.3 will attach
    the document to this fixed instruction when it performs extraction.
    """
    config = config or ReceiptInvoicePromptConfig()
    output_schema: dict[str, object] = {
        "vendor_company": None,
        "address": None,
        "date": None,
        "total": None,
        "line_items": [{"description": None, "line_total": None}],
    }
    output_schema.update(
        {field_name: None for field_name in config.additional_top_level_fields}
    )
    schema_json = json.dumps(output_schema, ensure_ascii=False, indent=2)

    return (
        "Analyze the provided receipt or invoice. Extract only information that is "
        "actually present in the document. Never invent, infer, or guess missing "
        "values. Preserve numbers accurately and preserve original document text "
        "where appropriate. Keep line items separate from document-level totals.\n\n"
        "Return only one valid JSON object, with no Markdown, commentary, or "
        "explanatory prose. Use null for a scalar field that cannot be confidently "
        "extracted, and use [] when no line items can be confidently extracted. "
        "For each line item, use null for a missing description or line_total. "
        "Use this output shape:\n"
        f"{schema_json}"
    )
