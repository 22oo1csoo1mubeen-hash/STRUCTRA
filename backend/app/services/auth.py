"""Supabase Auth service operations."""

import asyncio
import base64
import json
import time
from typing import Any

import httpx
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.auth import CurrentUser, SignupRequest

_SHARED_AUTH_CLIENT: httpx.AsyncClient | None = None
_TOKEN_CACHE: dict[str, tuple[str, float]] = {}
_JWKS_KEYS: dict[str, Any] = {}
_JWKS_LAST_FETCH: float = 0.0


def _get_shared_auth_client() -> httpx.AsyncClient:
    """Return a shared persistent HTTP client with connection pooling."""
    global _SHARED_AUTH_CLIENT
    if _SHARED_AUTH_CLIENT is None or _SHARED_AUTH_CLIENT.is_closed:
        _SHARED_AUTH_CLIENT = httpx.AsyncClient(
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
            timeout=20.0,
        )
    return _SHARED_AUTH_CLIENT


def _b64url_decode(s: str) -> bytes:
    """Decode base64url encoded string with padding if necessary."""
    s += "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s)


async def _fetch_jwks_keys(base_url: str) -> None:
    """Fetch and cache Supabase JWKS public keys for fast local signature verification."""
    global _JWKS_LAST_FETCH
    now = time.time()
    if now - _JWKS_LAST_FETCH < 300.0 and _JWKS_KEYS:
        return

    jwks_url = f"{base_url}/auth/v1/.well-known/jwks.json"
    client = _get_shared_auth_client()
    try:
        response = await client.get(jwks_url)
        if response.status_code == 200:
            for k in response.json().get("keys", []):
                if k.get("kty") == "EC" and k.get("crv") == "P-256" and "x" in k and "y" in k:
                    kid = k.get("kid")
                    x = int.from_bytes(_b64url_decode(k["x"]), "big")
                    y = int.from_bytes(_b64url_decode(k["y"]), "big")
                    pub_key = ec.EllipticCurvePublicNumbers(x, y, ec.SECP256R1()).public_key()
                    _JWKS_KEYS[kid] = pub_key
            _JWKS_LAST_FETCH = now
    except Exception:
        # JWKS fetch is best-effort; REST endpoint fallback will handle verification
        pass


def _verify_jwt_signature_locally(token: str) -> tuple[str, float] | None:
    """Attempt fast local cryptographic verification of a Supabase JWT."""
    parts = token.split(".")
    if len(parts) != 3:
        return None

    try:
        header = json.loads(_b64url_decode(parts[0]))
        payload = json.loads(_b64url_decode(parts[1]))
    except Exception:
        return None

    now = time.time()
    exp = float(payload.get("exp", 0))
    if exp <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        return None

    kid = header.get("kid")
    pub_key = _JWKS_KEYS.get(kid)
    if pub_key is not None:
        try:
            signing_input = f"{parts[0]}.{parts[1]}".encode("utf-8")
            raw_sig = _b64url_decode(parts[2])
            if len(raw_sig) == 64:
                r_val = int.from_bytes(raw_sig[:32], "big")
                s_val = int.from_bytes(raw_sig[32:], "big")
                dss_sig = encode_dss_signature(r_val, s_val)
                pub_key.verify(dss_sig, signing_input, ec.ECDSA(hashes.SHA256()))
                return sub, exp
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    return None


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

    client = _get_shared_auth_client()
    last_error: Exception | None = None
    response = None

    for attempt in range(2):
        try:
            response = await client.post(signup_url, headers=headers, json=payload)
            break
        except httpx.RequestError as error:
            last_error = error
            if attempt == 0:
                await asyncio.sleep(0.2)
                continue

    if response is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth is unavailable.",
        ) from last_error

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
    now = time.time()

    # 1. Check in-memory fast token cache
    cached = _TOKEN_CACHE.get(access_token)
    if cached is not None:
        user_id, expires_at = cached
        if expires_at > now:
            return CurrentUser(user_id=user_id)
        _TOKEN_CACHE.pop(access_token, None)

    settings = get_settings()
    base_url = settings.supabase_url.rstrip("/")

    # 2. Try fast cryptographic local JWT verification with cached JWKS keys
    if not _JWKS_KEYS:
        await _fetch_jwks_keys(base_url)

    local_result = _verify_jwt_signature_locally(access_token)
    if local_result is not None:
        user_id, exp = local_result
        _TOKEN_CACHE[access_token] = (user_id, min(exp, now + 300.0))
        return CurrentUser(user_id=user_id)

    # 3. Fallback to Supabase REST /auth/v1/user verification
    user_url = f"{base_url}/auth/v1/user"
    headers = {
        "apikey": settings.supabase_publishable_key.get_secret_value(),
        "Authorization": f"Bearer {access_token}",
    }

    client = _get_shared_auth_client()
    last_error: Exception | None = None
    response = None

    for attempt in range(2):
        try:
            response = await client.get(user_url, headers=headers)
            break
        except httpx.RequestError as error:
            last_error = error
            if attempt == 0:
                await asyncio.sleep(0.2)
                continue

    if response is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth is unavailable.",
        ) from last_error

    if response.is_client_error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if response.is_server_error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth is unavailable.",
        )

    try:
        user_id = response.json()["id"]
        _TOKEN_CACHE[access_token] = (user_id, now + 300.0)
        return CurrentUser(user_id=user_id)
    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth returned an invalid response.",
        ) from None
