from decimal import Decimal
import json

from app.schemas.documents import ReceiptInvoiceExtraction
from app.services.extraction_validation import validate_receipt_invoice_extraction
from app.services.mathematical_validation import validate_extraction_totals

def test_tax_components_preserved_from_raw_json_to_math_validation():
    # Simulate exactly what Gemini outputs as a JSON dictionary
    raw_gemini_json = {
        "subtotal": 1361.0,
        "discount": 61.0,
        "taxable_amount": 1300.0,
        "tax": 65.0,
        "total": 1365.0,
        "tax_components": [
            {"name": "CGST", "rate": 2.5, "amount": 32.50},
            {"name": "SGST", "rate": 2.5, "amount": 32.50}
        ],
        "line_items": []
    }
    
    # 1. Validate Extraction (Pydantic parsing)
    extraction = validate_receipt_invoice_extraction(raw_gemini_json)
    
    # Assert preservation
    assert len(extraction.tax_components) == 2
    assert extraction.tax_components[0].name == "CGST"
    assert extraction.tax_components[0].amount == 32.50
    assert extraction.tax_components[1].name == "SGST"
    assert extraction.tax_components[1].amount == 32.50
    
    # 2. Mathematical Validation
    result = validate_extraction_totals(extraction)
    
    # Assert final calculations
    assert result.validation_performed is True
    assert result.total_matches is True
    assert result.calculated_total == Decimal("1365.00")
