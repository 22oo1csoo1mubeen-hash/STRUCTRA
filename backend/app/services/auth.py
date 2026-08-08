"""Supabase Auth service operations."""

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.auth import SignupRequest


async def signup_user(signup_request: SignupRequest) -> None:
    """Register a user through Supabase Auth's signup REST endpoint."""
    settings = get_settings()
    publishable_key = settings.supabase_publishable_key.get_secret_value()
    signup_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/signup"
    payload = {
        "email": signup_request.email,
        "password": signup_request.password,
        "data": {"full_name": signup_request.full_name},
    }
    headers = {
        "apikey": publishable_key,
        "Authorization": f"Bearer {publishable_key}",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(signup_url, headers=headers, json=payload)
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth is unavailable.",
        ) from error

    if response.is_server_error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth is unavailable.",
        )

    if response.is_error:
        raise HTTPException(
            status_code=response.status_code,
            detail="Unable to create the account.",
        )
