from app.services.mathematical_validation import validate_extraction_totals
from app.schemas.documents import ReceiptInvoiceExtraction, TaxComponent

extraction = ReceiptInvoiceExtraction(
    subtotal=1361.0,
    discount=61.0,
    total=1365.0,
    tax=32.50,
    tax_components=[]
)

result = validate_extraction_totals(extraction)
print("With only tax=32.50:", result.calculated_total)
