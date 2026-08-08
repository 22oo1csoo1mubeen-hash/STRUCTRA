# Structra Backend

Milestone 2.1 provides the FastAPI foundation plus Supabase Auth REST API signup.
It uses `httpx`; the official Supabase Python SDK is not used.

## Prerequisites

- Python 3.12
- A Supabase project URL, publishable key, and secret key

## Installation

Create and activate a virtual environment:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the application and development dependencies:

```powershell
pip install -e ".[dev]"
```

Copy `.env.example` to `.env`, then enter your Supabase project values. Do not
commit `.env`.

## Run

```powershell
uvicorn app.main:app --reload
```

The health endpoint is available at `http://127.0.0.1:8000/health`. Interactive
Swagger documentation is available at `http://127.0.0.1:8000/docs`.

`POST /documents/upload` accepts a single `multipart/form-data` field named
`file`. It validates PDF, JPG/JPEG, and PNG files up to
`DOCUMENT_MAX_UPLOAD_SIZE_BYTES` (10 MiB by default), then stores the original
file in the private `SUPABASE_STORAGE_BUCKET` (`documents` by default) and
creates a corresponding `public.documents` metadata record.

Authenticated users can retrieve their own metadata with `GET /documents` or
`GET /documents/{document_id}`. These endpoints never return another user's records.
`GET /documents/{document_id}/download` returns the owned original file from the
private Storage bucket as a download.

`DELETE /documents/{document_id}` deletes an owned document's private Storage
object, then its metadata record. Documents that do not belong to the caller
are reported as not found.

## Test

```powershell
pytest
```

## Project layout

- `app/main.py`: Creates the FastAPI application and registers the API router.
- `app/api/router.py`: Combines route modules for application registration.
- `app/api/routes/health.py`: Defines the asynchronous `GET /health` endpoint.
- `app/core/config.py`: Loads and validates environment settings via
  `pydantic-settings`.
- `app/schemas/auth.py`: Defines validated signup request and response schemas.
- `app/services/auth.py`: Calls the Supabase Auth signup REST endpoint using
  `httpx.AsyncClient`.
- `app/api/routes/auth.py`: Defines the documented `POST /auth/signup` endpoint.
- `app/models/`: Reserved for future database models; intentionally empty.
- `app/schemas/`: Reserved for future request and response schemas.
- `app/services/`: Reserved for future business services.
- `tests/test_health.py`: Verifies the health endpoint contract.
- `tests/test_auth.py`: Verifies invalid signup email validation.
- `.env.example`: Lists required environment variable names without secrets.
- `.gitignore`: Prevents local credentials, virtual environments, and generated
  Python tooling files from being committed.
- `pyproject.toml`: Defines project metadata, dependencies, and test/lint setup.
