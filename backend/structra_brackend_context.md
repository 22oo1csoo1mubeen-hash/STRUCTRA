# STRUCTRA — Backend Context & Engineering Rules

## 1. Project

Project name: **Structra**

Structra is an AI-powered Document Intelligence Platform.

The application allows users to:

- Upload receipts and invoices
- Extract structured information using AI
- Review and edit extracted information
- Validate calculations
- Detect duplicate documents
- Store documents permanently
- Search documents
- Export structured information
- Ask an AI assistant questions about their documents

The backend must be production-oriented, modular, maintainable, scalable, and easy to understand.

---

# 2. Fixed Backend Tech Stack

These technologies are FIXED.

Do not replace them unless explicitly instructed.

| Layer | Technology |
|---|---|
| Programming Language | Python 3.12 |
| API Framework | FastAPI |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage |
| AI Extraction | Gemini 2.5 Flash |
| Vector Search | pgvector (Supabase) |
| Excel Export | openpyxl |
| Deployment | Render |

## Important

Python MUST remain **3.12**.

Do not upgrade to Python 3.13 or 3.14.

Do not introduce another backend framework.

FastAPI is the only API framework.

Supabase is the backend platform for Auth, PostgreSQL, and Storage.

---

# 3. Frontend

Frontend technology:

- React
- Supabase JavaScript SDK
- Existing STRUCTRA UI

The frontend is developed separately using Claude/Gemini in Antigravity.

Backend development is handled using **Codex**.

Do not modify the frontend unless explicitly requested.

---

# 4. Authentication Architecture

STRUCTRA uses **Supabase Auth**.

We do NOT build a custom authentication system.

Authentication currently supports:

- Email/password registration
- Email confirmation
- Email/password login
- Remember Me
- Logout
- Google OAuth
- Google session persistence
- Forgot Password
- Password reset

The frontend communicates with Supabase Auth directly.

The backend will later verify Supabase authentication tokens when protected API endpoints are introduced.

## Important security rule

Never:

- Store passwords
- Implement custom password authentication
- Expose Supabase secret/service-role keys to React
- Put backend secrets in frontend code
- Store authentication secrets in source code

The Supabase secret/service-role key must remain backend-only.

---

# 5. Email Infrastructure

Supabase Auth handles authentication emails.

STRUCTRA uses:

**Brevo SMTP**

for email delivery.

Brevo is configured as Supabase Auth's custom SMTP provider.

It is used for:

- Registration confirmation emails
- Password reset emails
- Other Supabase Auth emails

Do not implement a separate custom email system.

---

# 6. Backend Architecture

Preferred structure:

backend/

├── app/
│   ├── api/
│   │   └── routes/
│   ├── core/
│   ├── db/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   └── main.py
│
├── tests/
│
├── .env
├── .env.example
├── pyproject.toml
└── README.md

Do not significantly change this architecture unless explicitly requested.

If an appropriate file already exists, reuse it instead of creating duplicate implementations.

---

# 7. Architectural Principles

Always follow these principles.

## API routes should be thin

Routes should primarily:

- Receive requests
- Validate input through schemas
- Call services
- Return responses

Business logic should not be placed directly inside route functions.

## Business logic belongs in services

Examples:

- File validation → document service
- Supabase Storage operations → storage service
- Gemini extraction → extraction service
- Mathematical validation → validation service

## Configuration belongs in core/config

Do not hard-code:

- API keys
- URLs
- Secrets
- File-size limits
- Environment-specific configuration

Use environment variables and validated settings.

## Use Pydantic

Use Pydantic models for:

- Request bodies
- Response bodies
- Configuration
- Structured AI responses

## Use type hints

All new Python code should use appropriate type hints.

## Use async where appropriate

FastAPI endpoints should be async when performing I/O-bound operations.

## Avoid unnecessary abstraction

Do not create classes, services, utilities, or dependencies unless they provide a clear purpose.

Prefer simple, readable code.

---

# 8. Environment Variables

Secrets belong in:

.env

Never commit `.env`.

Always maintain:

.env.example

The `.env.example` file must contain variable names but NEVER real secrets.

Possible backend environment variables include:

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GEMINI_API_KEY=

Additional variables may be added when required by future milestones.

Never expose secret keys through API responses.

---

# 9. API Development Rules

Every endpoint must have:

- Clear purpose
- Request definition
- Response definition
- Appropriate HTTP status codes
- Validation
- Error handling
- Swagger/OpenAPI documentation
- Tests

Use meaningful endpoint names.

Follow REST-style conventions.

Do not return raw internal exceptions.

Do not expose stack traces to users.

---

# 10. Error Handling

Errors must be predictable and useful.

Examples:

- 400 — Invalid request
- 401 — Unauthenticated
- 403 — Forbidden
- 404 — Resource not found
- 413 — Payload/file too large
- 415 — Unsupported media type
- 422 — Validation error
- 500 — Unexpected server error
- 503 — External service unavailable

Use the appropriate status code rather than returning 200 for failures.

---

# 11. Document Processing Architecture

The final document pipeline will eventually be:

React
↓
FastAPI
↓
Authentication verification
↓
File validation
↓
Supabase Storage
↓
PostgreSQL document record
↓
Gemini 2.5 Flash
↓
Structured extraction
↓
Validation engine
↓
Review workspace
↓
Document library
↓
Dashboard
↓
AI Assistant

Do NOT implement this entire pipeline at once.

Build it incrementally.

---

# 12. Document Upload

The first document feature is:

POST /documents/upload

The eventual upload flow is:

React
↓
FastAPI
↓
Verify Supabase user
↓
Validate file
↓
Upload to Supabase Storage
↓
Create PostgreSQL document record
↓
Return document information

However, these stages MUST be implemented separately.

---

# 13. Current Milestone

## M3 — Document Upload

M3 is divided into:

### M3.1 — Upload Endpoint Foundation

Implement:

POST /documents/upload

Focus only on:

- multipart/form-data
- receiving UploadFile
- file presence validation
- allowed file types
- file size validation
- empty-file validation
- clean response
- proper errors
- Swagger documentation
- tests

Allowed initial document types:

- PDF
- JPG
- JPEG
- PNG

### M3.1 MUST NOT implement:

- Supabase Storage
- Database records
- Gemini
- OCR
- AI extraction
- Validation engine
- Duplicate detection
- Document library
- Dashboard
- AI Assistant
- Frontend changes

M3.1 is only:

Client
↓
POST /documents/upload
↓
FastAPI receives file
↓
Validate file
↓
Return response

---

# 14. M3.2 — Authentication Verification

After M3.1 is completed and tested:

Connect the frontend Supabase session to FastAPI.

Flow:

React
↓
Supabase session
↓
Access token
↓
FastAPI
↓
Verify Supabase authentication
↓
Identify current user
↓
Authorize request

FastAPI must know which user owns the request.

Do not implement M3.2 while working on M3.1.

---

# 15. M3.3 — Supabase Storage

After M3.2:

Upload original documents to Supabase Storage.

Handle:

- Storage bucket
- User-specific paths
- Unique filenames
- PDF
- JPG/JPEG
- PNG
- Storage errors
- Cleanup if necessary

Do not implement this early.

---

# 16. M3.4 — Document Database Record

After Storage works:

Create the PostgreSQL document record.

Conceptual fields:

- document_id
- user_id
- original_filename
- storage_path
- document_type
- upload_timestamp
- processing_status

Initial processing status:

pending

---

# 17. M3.5 — Upload Response

Return clean document information.

Conceptually:

{
    "document_id": "...",
    "filename": "...",
    "status": "pending",
    "created_at": "..."
}

Never expose sensitive internal information.

---

# 18. M3.6 — Frontend Integration

After backend upload functionality is complete:

Connect React to:

POST /documents/upload

Implement:

- File selection
- Upload request
- Loading state
- Progress if appropriate
- Success state
- Error state

Do not modify frontend during backend-only milestones unless explicitly instructed.

---

# 19. M3.7 — Upload Testing

Test:

1. Valid PDF
2. Valid JPG
3. Valid JPEG
4. Valid PNG
5. Unsupported file type
6. Empty file
7. File too large
8. Missing file
9. Malformed request
10. Unauthenticated request
11. Authenticated request
12. Multiple users
13. Correct user ownership
14. Storage failure
15. Database failure
16. Duplicate filename handling

Only mark M3 complete when appropriate tests pass.

---

# 20. AI Extraction

Future milestone:

## M4 — Gemini Extraction Pipeline

Technology:

Gemini 2.5 Flash

Eventually:

Uploaded document
↓
Retrieve from Supabase Storage
↓
Gemini 2.5 Flash
↓
Structured JSON
↓
Pydantic validation
↓
Database

Possible extracted fields:

- Vendor/company
- Address
- Date
- Total
- Line items
- Line descriptions
- Line totals
- Other relevant receipt/invoice fields

Never implement Gemini during M3.1.

---

# 21. Validation Engine

Future milestone:

## M5 — Validation Engine

Features:

- Mathematical validation
- Line-item total reconciliation
- Confidence information
- Duplicate detection
- Structured validation results

Do not implement during upload milestones.

---

# 22. Review Workspace

Future milestone:

## M6 — Review Workspace APIs

Users should eventually be able to:

- View extracted fields
- Edit fields
- Correct values
- Confirm document
- See validation errors
- See confidence information
- Save corrections

---

# 23. Document Library

Future milestone:

## M7 — Document Library

Features:

- List documents
- Search
- Filter
- Sort
- View document
- View extracted information
- Delete document
- Download original

Users must only access their own documents.

---

# 24. Dashboard

Future milestone:

## M8 — Dashboard APIs

Possible statistics:

- Total documents
- Processed documents
- Pending documents
- Failed documents
- Total invoice amount
- Recent documents
- Validation issues
- Document categories

---

# 25. AI Assistant

Future milestone:

## M9 — AI Assistant

Technology:

- Gemini
- PostgreSQL
- pgvector

The assistant will answer questions about the user's documents.

Examples:

"What was my highest invoice this month?"

"Show invoices from vendor X."

"How much did I spend on office supplies?"

The assistant must be grounded in the user's documents.

Never invent information.

---

# 26. Vector Search

Use:

pgvector in Supabase PostgreSQL.

Eventually:

Documents
↓
Embeddings
↓
pgvector
↓
Semantic search
↓
Relevant document context
↓
Gemini
↓
Answer

Do not implement during M3.

---

# 27. Export

Future milestone:

Use:

openpyxl

Support:

- Excel export
- CSV where appropriate
- Structured document data export

---

# 28. Deployment

Final backend deployment:

Render

Backend infrastructure:

- FastAPI
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Gemini
- pgvector

---

# 29. Git Workflow

For each milestone:

Create/checkout feature branch
↓
Implement
↓
Run locally
↓
Test
↓
Commit
↓
Push
↓
Review
↓
Merge
↓
Delete feature branch

Do not commit `.env`.

---

# 30. AI/Codex Working Rules

Before modifying code:

1. Inspect the existing project.
2. Understand the current architecture.
3. Identify existing files.
4. Reuse existing components.
5. Determine exactly which milestone is being implemented.

Then make the smallest appropriate changes.

Do not rewrite working code unnecessarily.

Do not create duplicate functionality.

Do not implement future milestones.

Do not silently change the fixed tech stack.

If something is unclear, ask before making a major architectural decision.

---

# 31. Milestone Completion Rule

A milestone is NOT complete merely because code was generated.

Before marking it complete:

- Application runs
- No runtime errors
- Swagger works
- Endpoint works
- Expected responses verified
- Error cases tested
- Tests pass where applicable
- Changes are reviewed

Only then move to the next milestone.

---

# 32. CURRENT TASK

Current project stage:

M3 — Document Upload

Current sub-milestone:

M3.1 — POST /documents/upload

ONLY implement M3.1.

Do NOT implement:

- Authentication verification
- Supabase Storage
- PostgreSQL document records
- Gemini
- OCR
- Validation
- Document library
- Dashboard
- AI Assistant
- Frontend changes

The immediate goal is:

POST /documents/upload

Receive file
↓
Validate file
↓
Return clean response

One endpoint at a time.

# END OF STRUCTRA BACKEND CONTEXT