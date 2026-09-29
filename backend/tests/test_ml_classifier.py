"""Unit and regression tests for STRUCTRA ML Expense Classifier service."""

import pytest
from app.services.ml.classifier import classify_document_expense, get_ml_classifier_pipeline


def test_ml_pipeline_available():
    pipeline = get_ml_classifier_pipeline()
    assert pipeline is not None, "Trained ML model pipeline must be available"


def test_hotel_jpg_predicted_as_meals_and_dining():
    """Verify hotel.jpg (OM SWEETS PVT. LTD. with DAL MAKHANI and PLAIN ROTI) is categorized as Meals & Dining."""
    result = classify_document_expense(
        vendor_name="OM SWEETS PVT. LTD.",
        line_items=[{"description": "DAL MAKHANI"}, {"description": "PLAIN ROTI"}],
        total_amount=300.0,
        filename="hotel.jpg",
    )
    assert result["ml_model_active"] is True
    assert result["ml_category"] == "Meals & Dining"
    assert result["ml_confidence"] >= 0.90


def test_om_sweets_vendor_alone():
    """Verify OM SWEETS vendor alone predicts Meals & Dining."""
    result = classify_document_expense(vendor_name="OM SWEETS PVT. LTD.")
    assert result["ml_category"] == "Meals & Dining"


def test_indian_food_items_alone():
    """Verify food line items alone predict Meals & Dining."""
    result = classify_document_expense(
        line_items=[{"description": "DAL MAKHANI"}, {"description": "PLAIN ROTI"}]
    )
    assert result["ml_category"] == "Meals & Dining"


def test_other_categories_accuracy():
    """Verify other categories remain accurate."""
    med_res = classify_document_expense(
        vendor_name="CVS Pharmacy",
        line_items=[{"description": "Prescription Medication Rx"}],
        total_amount=28.00,
    )
    assert med_res["ml_category"] == "Healthcare & Medical"

    cloud_res = classify_document_expense(
        vendor_name="Amazon Web Services Inc",
        line_items=[{"description": "AWS EC2 t3.xlarge Linux Instance"}],
        total_amount=121.50,
    )
    assert cloud_res["ml_category"] == "Technology & Cloud Services"

    flight_res = classify_document_expense(
        vendor_name="Delta Air Lines",
        line_items=[{"description": "Passenger Economy Seat Flight"}],
        total_amount=285.00,
    )
    assert flight_res["ml_category"] == "Travel & Logistics"


def test_dmart2_jpg_predicted_as_retail_and_groceries():
    """Verify dmart2.jpg (AVENUE SUPERMARTS LTD with grocery line items) is categorized as Retail & Groceries."""
    result = classify_document_expense(
        vendor_name="AVENUE SUPERMARTS LTD",
        line_items=[
            {"description": "MILKY MIST UHT -1lt"},
            {"description": "JERSEY CURD PO-425g"},
            {"description": "WAGHBAKRI STRO-250g"},
            {"description": "GOLD DROP SUNFL-1lt"},
            {"description": "BAMBIND ROASTE-400g"},
            {"description": "PARLE REAL ELA-400g"},
        ],
        total_amount=993.0,
        filename="dmart2.jpg",
    )
    assert result["ml_model_active"] is True
    assert result["ml_category"] == "Retail & Groceries"
    assert result["ml_confidence"] >= 0.90


def test_avenue_supermarts_vendor_alone():
    """Verify Avenue Supermarts vendor alone predicts Retail & Groceries."""
    result = classify_document_expense(vendor_name="AVENUE SUPERMARTS LTD")
    assert result["ml_category"] == "Retail & Groceries"


def test_dmart_supermarket_items():
    """Verify supermarket items with tea or batter still classify as Retail & Groceries."""
    result = classify_document_expense(
        vendor_name="DMart Supermarket",
        line_items=[{"description": "WAGHBAKRI TEA STRO"}, {"description": "ASAL IDLY & DOSA BATTER"}],
        total_amount=540.0,
    )
    assert result["ml_category"] == "Retail & Groceries"

