# STRUCTRA deployment checklist

This checklist is provider-neutral. The repository does not contain a hosting target or production credentials, so complete the provider-specific steps in its control panel before opening the app to users.

## Frontend build

1. Use Node.js `^20.19.0` or `>=22.12.0` as required by the locked Vite version.
2. Run `npm ci`, `npm run lint`, and `npm run build` in `frontend/`.
3. Set these build-time values:
   - `VITE_SUPABASE_URL`: the production Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: the public/publishable key only.
   - `VITE_API_URL`: the HTTPS base URL of the deployed backend. Production builds fail if this is missing.
4. Configure the static host to serve `index.html` for application routes such as `/login`, `/about`, and `/app/*`.
5. Configure HTTPS and a custom domain. Do not put backend or AI secrets in frontend variables.

## Backend service

1. Deploy `backend/` with Python 3.12 or newer, install `backend/requirements.txt`, and run `uvicorn app.main:app --host 0.0.0.0 --port $PORT` from the `backend/` directory (adapt the port syntax to the host).
2. Set server-side environment variables:
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
   - At least one extraction provider key: `GEMINI_API_KEY` or `GROQ_API_KEY`
   - `CORS_ALLOWED_ORIGINS`: comma-separated exact HTTPS frontend origins, without paths or wildcards
   - `SUPABASE_STORAGE_BUCKET` and `DOCUMENT_MAX_UPLOAD_SIZE_BYTES` as needed
3. Keep the Supabase secret key and AI provider keys in the backend secret manager only. Confirm the host's request-body limit is at least the configured document upload limit.
4. Configure HTTPS, health monitoring for `/health`, application error logging, resource limits, and a restart policy. Apply rate limits at the API gateway or hosting edge.

## Supabase and identity

1. Apply every SQL migration in `backend/migrations/` to the production project in order and verify the storage bucket is private with the intended access policies.
2. Add the production frontend URL and `/auth/callback` to Supabase's allowed redirect URLs. Configure the Google OAuth client and email confirmation/reset templates for the production domain.
3. Verify row-level security and storage access with two separate accounts. One account must never be able to read, change, download, or delete the other's data.
4. Confirm backups and test restoring them before importing real user documents.

## Release acceptance

Run these checks against staging using non-production test accounts and sample documents:

- Sign up, email confirmation, Google sign-in, sign out/in, password reset, and session expiry.
- Upload supported and unsupported files, size limits, duplicate handling, extraction, validation, edit/save, search/filter, download/export, and deletion.
- Verify data isolation between two users and persistence after an API restart.
- Exercise the same flows on a narrow mobile viewport and desktop; test failed network/provider requests and retry behavior.
- Confirm API CORS accepts the production frontend and rejects an unrelated origin; confirm all browser requests use HTTPS.
- Check monitoring, backup/restore, operational alerts, and a rollback procedure.
- Publish reviewed Privacy Policy and Terms of Service pages that accurately describe document contents, AI/OCR subprocessors, retention/deletion, and support contact details. The application currently contains no such policy pages; obtain appropriate legal review before accepting real users.

Do not invite real users until all required staging checks pass and the privacy, security, support, and backup owners have signed off.
