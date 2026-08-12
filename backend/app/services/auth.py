"""Supabase Auth service operations."""

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.auth import CurrentUser, SignupRequest


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


async def get_authenticated_user(access_token: str) -> CurrentUser:
    """Verify a Supabase access token and return its authenticated user ID."""
    settings = get_settings()
    user_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    headers = {
        "apikey": settings.supabase_publishable_key.get_secret_value(),
        "Authorization": f"Bearer {access_token}",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(user_url, headers=headers)
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth is unavailable.",
        ) from error

    if response.is_client_error:
        print(f"AUTH CLIENT ERROR {response.status_code}: {response.text}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if response.is_server_error:
        print(f"AUTH SERVER ERROR {response.status_code}: {response.text}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth is unavailable.",
        )

    try:
        return CurrentUser(user_id=response.json()["id"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth returned an invalid response.",
        ) from None
