"""Signup endpoint validation tests."""

from fastapi.testclient import TestClient

from app.main import app


def test_signup_validation() -> None:
    """An invalid email is rejected before any Auth service request."""
    client = TestClient(app)

    response = client.post(
        "/auth/signup",
        json={
            "email": "not-an-email",
            "password": "password",
            "full_name": "Test User",
        },
    )

    assert response.status_code == 422
