"""Authentication API endpoints."""

from fastapi import APIRouter, status

from app.schemas.auth import SignupRequest, SignupResponse
from app.services.auth import signup_user

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Sign up a new user",
    responses={
        201: {"description": "Signup accepted; verification email sent."},
        422: {"description": "Invalid signup request."},
        503: {"description": "Supabase Auth is unavailable."},
    },
)
async def signup(signup_request: SignupRequest) -> SignupResponse:
    """Register a user through Supabase Auth and trigger verification email."""
    await signup_user(signup_request)
    return SignupResponse(message="Verification email sent.")
