"""Isolated unit and integration tests for local OCR service."""

from pathlib import Path
import pytest

from app.services.ocr import (
    BoundingBox,
    OCRError,
    OCRImageInvalidError,
    OCRLine,
    OCRResult,
    OCRService,
    default_ocr_service,
)

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "receipts"
RETAIL_RECEIPT_PATH = FIXTURES_DIR / "retail_tax_invoice.png"
RESTAURANT_RECEIPT_PATH = FIXTURES_DIR / "restaurant_bill.jpg"
INTERSTATE_RECEIPT_PATH = FIXTURES_DIR / "interstate_invoice.png"


def test_ocr_service_instantiation():
    """Verify OCRService instantiates and exports default singleton."""
    service = OCRService()
    assert service is not None
    assert default_ocr_service is not None


def test_ocr_extract_from_file_png():
    """Test local OCR extraction from a PNG receipt image file."""
    ocr = OCRService()
    result = ocr.extract_text_from_file(RETAIL_RECEIPT_PATH)

    assert isinstance(result, OCRResult)
    assert isinstance(result.full_text, str)
    assert len(result.full_text) > 0
    assert result.line_count > 0
    assert result.processing_time_ms >= 0.0

    # Verify structured lines
    first_line = result.lines[0]
    assert isinstance(first_line, OCRLine)
    assert len(first_line.text) > 0
    assert 0.0 <= first_line.confidence <= 1.0
    assert isinstance(first_line.bounding_box, BoundingBox)
    assert len(first_line.bounding_box.points) == 4
    assert first_line.bounding_box.width >= 0.0
    assert first_line.bounding_box.height >= 0.0


def test_ocr_extract_from_file_jpg():
    """Test local OCR extraction from a JPG receipt image file."""
    ocr = OCRService()
    result = ocr.extract_text_from_file(RESTAURANT_RECEIPT_PATH)

    assert isinstance(result, OCRResult)
    assert "SPICEGARDEN" in result.full_text or "SPICE" in result.full_text
    assert result.line_count > 10


def test_ocr_extract_from_bytes():
    """Test local OCR extraction directly from image bytes."""
    ocr = OCRService()
    image_bytes = RETAIL_RECEIPT_PATH.read_bytes()
    result = ocr.extract_text_from_bytes(image_bytes, filename="test.png")

    assert isinstance(result, OCRResult)
    assert "SUPERMART" in result.full_text
    assert result.line_count > 10


def test_ocr_receipt_fields_recognition():
    """Verify recognition of essential receipt fields across different receipt layouts."""
    ocr = OCRService()

    # 1. Retail Tax Invoice
    res1 = ocr.extract_text_from_file(RETAIL_RECEIPT_PATH)
    text1 = res1.full_text
    assert "SUPERMART" in text1
    assert "GSTIN" in text1
    assert "14/08/2026" in text1 or "08912" in text1
    assert "Basmati" in text1 or "Rice" in text1
    assert "1709.53" in text1 or "1709" in text1

    # 2. Restaurant Bill
    res2 = ocr.extract_text_from_file(RESTAURANT_RECEIPT_PATH)
    text2 = res2.full_text
    assert "Paneer" in text2 or "Butter" in text2
    assert "1122.00" in text2 or "1122" in text2

    # 3. Interstate Invoice (IGST)
    res3 = ocr.extract_text_from_file(INTERSTATE_RECEIPT_PATH)
    text3 = res3.full_text
    assert "TECHSOL" in text3
    assert "IGST" in text3
    assert "123900" in text3


def test_ocr_empty_bytes_raises_error():
    """Verify passing empty bytes raises OCRImageInvalidError cleanly."""
    ocr = OCRService()
    with pytest.raises(OCRImageInvalidError) as exc_info:
        ocr.extract_text_from_bytes(b"")
    assert "empty image" in str(exc_info.value).lower()
    assert issubclass(OCRImageInvalidError, OCRError)


def test_ocr_corrupt_bytes_raises_error():
    """Verify passing invalid non-image byte content raises OCRImageInvalidError cleanly."""
    ocr = OCRService()
    corrupt_data = b"This is not a valid PNG or JPG image file content 1234567890"
    with pytest.raises(OCRImageInvalidError) as exc_info:
        ocr.extract_text_from_bytes(corrupt_data, filename="corrupt.png")
    assert "invalid or corrupted image format" in str(exc_info.value).lower()


def test_ocr_missing_file_raises_error():
    """Verify attempting to open a non-existent file path raises OCRImageInvalidError cleanly."""
    ocr = OCRService()
    missing_path = FIXTURES_DIR / "non_existent_file.png"
    with pytest.raises(OCRImageInvalidError) as exc_info:
        ocr.extract_text_from_file(missing_path)
    assert "does not exist" in str(exc_info.value).lower()


def test_ocr_performance_metrics():
    """Verify processing_time_ms is populated and non-negative."""
    ocr = OCRService()
    result = ocr.extract_text_from_file(RETAIL_RECEIPT_PATH)
    assert isinstance(result.processing_time_ms, float)
    assert result.processing_time_ms > 0.0
