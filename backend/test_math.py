from app.services.mathematical_validation import validate_extraction_totals
from app.schemas.documents import ReceiptInvoiceExtraction, TaxComponent

extraction = ReceiptInvoiceExtraction(
    subtotal=1361.0,
    discount=61.0,
    total=1365.0,
    tax_components=[
        TaxComponent(name="CGST", amount=32.50),
        TaxComponent(name="SGST", amount=32.50)
    ]
)

result = validate_extraction_totals(extraction)
print(result)
