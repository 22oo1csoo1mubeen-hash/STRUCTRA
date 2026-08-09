"""Tests for receipt and invoice extraction prompts."""

from app.services.prompts import (
    DEFAULT_RECEIPT_INVOICE_FIELDS,
    LINE_ITEM_FIELDS,
    ReceiptInvoicePromptConfig,
    build_receipt_invoice_extraction_prompt,
)


def test_builds_receipt_invoice_extraction_prompt() -> None:
    prompt = build_receipt_invoice_extraction_prompt()

    assert prompt
    for field_name in DEFAULT_RECEIPT_INVOICE_FIELDS:
        assert f'"{field_name}"' in prompt
    for field_name in LINE_ITEM_FIELDS:
        assert f'"{field_name}"' in prompt


def test_prompt_requires_faithful_structured_output() -> None:
    prompt = build_receipt_invoice_extraction_prompt()

    assert "Never invent, infer, or guess missing values." in prompt
    assert "Return only one valid JSON object" in prompt
    assert "Use null for a scalar field" in prompt
    assert "use [] when no line items" in prompt


def test_prompt_is_deterministic_for_the_same_configuration() -> None:
    config = ReceiptInvoicePromptConfig(additional_top_level_fields=("currency",))

    first_prompt = build_receipt_invoice_extraction_prompt(config)
    second_prompt = build_receipt_invoice_extraction_prompt(config)

    assert first_prompt == second_prompt
    assert '"currency": null' in first_prompt
