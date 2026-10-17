# STRUCTRA — Autonomous AI Document Intelligence & Financial Analytics Platform

[![Python 3.12](https://img.shields.io/badge/Python-3.12_(64--bit)-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.2+-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.1+-646CFF.svg)](https://vitejs.dev)
[![Machine Learning](https://img.shields.io/badge/ML-scikit--learn-F7931E.svg)](https://scikit-learn.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.3+-38B2AC.svg)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Motion-Framer%20Motion%2012-FF0055.svg)](https://motion.dev)

> **STRUCTRA** is an enterprise-grade, privacy-first Document Intelligence Platform combining high-throughput local OCR, multimodal Large Language Model (LLM) vision pipelines, float-free Decimal mathematical reconciliation, deterministic conversational RAG, real-time notification feeds, and an autonomous **Machine Learning Expense Categorization Engine** trained on 10,479 verified financial records.

---

## 📑 Table of Contents

1. [Executive Summary](#-executive-summary)
2. [System Architecture & Data Flow](#-system-architecture--data-flow)
3. [Key Platform Capabilities](#-key-platform-capabilities)
4. [Detailed Processing Pipeline](#-detailed-processing-pipeline)
5. [Core Subsystems](#-core-subsystems)
   - [Local OCR Engine (RapidOCR ONNX)](#1-local-ocr-engine-rapidocr-onnx)
   - [Multimodal AI Information Extraction](#2-multimodal-ai-information-extraction)
   - [Deterministic Mathematical Reconciliation](#3-deterministic-mathematical-reconciliation)
   - [Two-Tiered Duplicate Detection](#4-two-tiered-duplicate-detection)
   - [Extraction Quality, Sanity & Anomaly Detection](#5-extraction-quality-sanity--anomaly-detection)
   - [Machine Learning Expense Categorization Engine](#6-machine-learning-expense-categorization-engine)
   - [Grounded Conversational AI Assistant](#7-grounded-conversational-ai-assistant)
   - [Enterprise Excel Export](#8-enterprise-excel-export)
   - [Real-Time Notifications Center](#9-real-time-notifications-center)
   - [Profile & Security Governance](#10-profile--security-governance)
6. [Workspaces & User Interface](#-workspaces--user-interface)
7. [API Endpoints Reference](#-api-endpoints-reference)
8. [Database Schema & Security](#-database-schema--security)
9. [Technology Stack](#-technology-stack)
10. [Repository Structure](#-repository-structure)
11. [Quick Start & Local Development](#-quick-start--local-development)
12. [Testing & Quality Assurance](#-testing--quality-assurance)
13. [Configuration & Environment Variables](#-configuration--environment-variables)
14. [Design & Documentation References](#-design--documentation-references)
15. [License & Attribution](#-license--attribution)

---

## 🌟 Executive Summary

Manual data entry, reconciliation, and auditing of physical receipts, tax invoices, and utility vouchers in modern enterprise accounting are error-prone, labor-intensive, and vulnerable to duplicate claims and fraud. Conventional Optical Character Recognition (OCR) systems lack structural understanding of arbitrary visual layouts, frequently succumbing to low-contrast scans, thermal printer fading, non-standard typography, fold creases, and skew distortions.

**STRUCTRA** solves these challenges by combining:
- **Local on-device OCR** via ONNX-accelerated PaddleOCR (`rapidocr_onnxruntime`) for fast character recognition and token-level spatial grounding.
- **Multimodal vision AI** powered by **Google Gemini 3.1 Flash-Lite** with seamless automated fallback to **Groq** (`openai/gpt-oss-120b`).
- **Float-free Decimal mathematical validation** with `ROUND_HALF_UP` arithmetic at ₹0.01 precision, catching tax mismatches and calculation errors.
- **Two-tier cryptographic and semantic duplicate detection** (SHA-256 byte digest + normalized vendor/date/total/item matching) strictly scoped per user.
- **Autonomous Machine Learning Expense Categorization** operating with **< 8ms inference latency** across 7 accounting categories, benchmarked with 5-fold cross-validation on 10,479 balanced financial records.
- **Zero-hallucination Conversational Assistant** utilizing deterministic Python aggregations over user-owned records rather than LLM numerical estimation.
- **Enterprise-grade account governance & notifications** featuring Google OAuth / Email auth detection, active session tracking, chronological audit trails, cascade account deletion, and user-isolated activity feeds.

---

## 🏛️ System Architecture & Data Flow

STRUCTRA is engineered on a decoupled client-server architecture:
- **Client Tier:** React 19 single-page application bundled with Vite 8, styled with Tailwind CSS 4 and animated with Framer Motion 12.
- **API Gateway & Microservice Tier:** High-throughput asynchronous Python 3.12 FastAPI service with Pydantic v2 schemas and dependency-injected security guards.
- **ML & AI Services:** In-process scikit-learn pipeline singleton, on-device ONNX runtime, and resilient Gemini/Groq cloud clients.
- **Persistence Tier:** Supabase PostgreSQL with strict Row-Level Security (RLS) and private Supabase S3-compatible Storage buckets.

```mermaid
flowchart TD
    Client["React 19 Frontend (Vite + Tailwind CSS + Framer Motion)"]
    Gateway["FastAPI Gateway (Python 3.12)"]
    AuthGuard["FastAPI Auth Dependency (get_current_user)"]
    JWKS["Local JWKS Verification / Supabase Auth"]
    StorageSvc["Storage Service (Private S3/Supabase)"]
    MetaSvc["Metadata Service (PostgREST)"]
    OCR["RapidOCR (ONNX Runtime)"]
    AIMgr["AI Extraction Manager"]
    Gemini["Google Gemini 3.1 Flash-Lite (Vision)"]
    Groq["Groq OCR-Fallback (openai/gpt-oss-120b)"]
    MathVal["Mathematical Validation Engine (Decimal)"]
    QualitySvc["Quality & Review Evaluator"]
    MLClassifier["ML Expense Classifier Engine (scikit-learn / joblib)"]
    DuplicateSvc["Duplicate Detection Engine (SHA-256)"]
    ExportSvc["Excel Generator (openpyxl)"]
    AssistantSvc["Assistant Context & Retrieval Engine"]
    NotificationSvc["Notifications Service (security_activity)"]

    Client -->|HTTP / Bearer JWT| Gateway
    Gateway --> AuthGuard
    AuthGuard -->|Validate Token| JWKS
    AuthGuard -->|Authenticated CurrentUser| Gateway

    Gateway -->|POST /documents/upload| StorageSvc
    StorageSvc -->|Save Raw Bytes| MetaSvc
    Gateway -->|Async Thread| OCR
    Gateway -->|POST /documents/{id}/extract| AIMgr

    AIMgr -->|Primary Multimodal| Gemini
    AIMgr -.->|Fallback on Failure| Groq
    Groq -.->|Consumes OCR Text| OCR

    AIMgr -->|Raw Structured JSON| MathVal
    MathVal -->|Math Consistency Signals| QualitySvc
    OCR -->|Grounding Tokens| QualitySvc
    QualitySvc -->|Quality Result & Confidence| MetaSvc

    AIMgr -->|Vendor, Items, Total| MLClassifier
    MLClassifier -->|Predicted Category & Confidence| MetaSvc
    Gateway -->|GET /ml/categories & POST /ml/predict| MLClassifier
    MLClassifier -->|Live Taxonomy Inference| Client

    Gateway -->|Check Hash & Fields| DuplicateSvc
    DuplicateSvc -->|Duplicate Match State| Client

    Gateway -->|GET /documents/{id}/export| ExportSvc
    MetaSvc -->|Read Stored Extraction| ExportSvc
    ExportSvc -->|XLSX Stream| Client

    Gateway -->|POST /assistant/chat| AssistantSvc
    MetaSvc -->|Fetch User Documents Only| AssistantSvc
    AssistantSvc -->|Deterministic Decimal Math| Gemini
    Gemini -->|Synthesized Grounded Answer| Client

    Gateway -->|GET /notifications| NotificationSvc
    NotificationSvc -->|User Activity Feed & Unread Count| Client
```

---

## ⚡ Key Platform Capabilities

| Capability | Primary Purpose | Technical Implementation | Status |
|---|---|---|---|
| **User Authentication** | Registration, login, Google OAuth, session persistence | Supabase Auth REST, JWKS asymmetric ECDSA P-256 verification, custom `rememberMeStorage` | ✅ **Complete** |
| **Document Upload & Staging** | Ingest receipts/invoices up to 10 MB | Multipart upload to `POST /documents/upload`, SHA-256 hashing, private Supabase Storage | ✅ **Complete** |
| **RapidOCR Extraction** | On-device text and bounding box extraction | In-process singleton `rapidocr_onnxruntime`, non-blocking execution via `asyncio.to_thread` | ✅ **Complete** |
| **Multimodal AI Extraction** | Structured field extraction from image bytes | `AIExtractionManager`: Google Gemini 3.1 Flash-Lite vision primary; Groq Llama fallback | ✅ **Complete** |
| **Decimal Mathematical Validation** | Float-free line item and total reconciliation | Python `Decimal` with `ROUND_HALF_UP`, verifies line sums, taxes, discounts, tolerance ₹0.01 | ✅ **Complete** |
| **Quality & Anomaly Detection** | Detect negative rates, omissions, ungrounded text | Rules engine checks negative values, arithmetic variance, line richness, OCR token matches | ✅ **Complete** |
| **Duplicate Detection** | Prevent redundant or fraudulent claims | Tier 1: SHA-256 exact byte match; Tier 2: Normalized vendor, date, total, line items match | ✅ **Complete** |
| **ML Expense Categorization** | 7-category taxonomy classification in <8ms | Sublinear TF-IDF + Multinomial Naive Bayes pipeline trained on 10,479 samples (100% test accuracy) | ✅ **Complete** |
| **Categories Workspace** | Visual taxonomy cards & live prediction tester | Dedicated `/app/categories` explorer, statistics per category, real-time ML testing console | ✅ **Complete** |
| **Document Library** | Searchable document management workspace | Grid/List views, text search `q`, type/status filters, sorting, detail view, deletion, export | ✅ **Complete** |
| **Dashboard & Analytics** | Expense totals, spending trends, vendor distribution | Real-time aggregation endpoints (`/dashboard/*`), cross-tab `BroadcastChannel` synchronization | ✅ **Complete** |
| **Deterministic AI Assistant** | Grounded question answering over user expenses | Natural-language intent classifier, Python Decimal aggregator, source citations, zero hallucinations | ✅ **Complete** |
| **Excel Export** | Branded `.xlsx` spreadsheet generation | `openpyxl` generation from persisted metadata, custom typography, IST formatting, zero AI cost | ✅ **Complete** |
| **Notifications Center** | User activity feed and unread alerts | Real-time feed (`GET /notifications`, `POST /notifications/mark-read`), TopBar drawer | ✅ **Complete** |
| **Profile & Security Governance** | Credential management, device session, audit log | User info updates, avatar upload/stream, active User-Agent session, audit trail, danger zone deletion | ✅ **Complete** |

---

## 🔄 Detailed Processing Pipeline

Every document ingested into STRUCTRA passes through an automated 12-stage lifecycle:

```
[ Stage 1: Client Validation ]
       │  Client validates format (PDF, PNG, JPG, JPEG) and size (≤ 10 MB)
       ▼
[ Stage 2: Ingestion & Storage ]
       │  POST /documents/upload streams file to backend
       │  Saved to Supabase private storage: documents/{user_id}/{document_id}.{ext}
       ▼
[ Stage 3: Cryptographic Hashing ]
       │  SHA-256 computed on raw bytes; metadata record inserted with status='pending'
       ▼
[ Stage 4: Duplicate Evaluation ]
       │  Compares hash against user's existing records; alerts user if match found
       ▼
[ Stage 5: Local RapidOCR Ingestion ]
       │  Image bytes processed via RapidOCR in thread pool (asyncio.to_thread)
       │  Extracts lines, confidences, bounding boxes, and execution timing
       ▼
[ Stage 6: Multimodal AI Extraction ]
       │  POST /documents/{id}/extract called
       │  Primary: Gemini 3.1 Flash-Lite receives image bytes + schema prompt (temp=0.0)
       │  Fallback: Groq parses raw OCR transcript into structured JSON on failure
       ▼
[ Stage 7: Decimal Mathematical Validation ]
       │  validate_extraction_totals() compares line item sums to subtotal and grand total
       │  Calculates taxes, applied discounts, service charges, and rounding adjustments
       ▼
[ Stage 8: Quality Scoring & Anomaly Detection ]
       │  evaluate_extraction_quality() cross-references OCR tokens, verifies signs,
       │  assigns HIGH / MEDIUM / LOW confidence and flags review alerts
       ▼
[ Stage 9: Machine Learning Expense Categorization ]
       │  classify_document_expense() feeds vendor, item descriptions, and totals
       │  into trained ML pipeline; returns category, confidence score, and provenance
       ▼
[ Stage 10: Interactive Review Workspace ]
       │  User reviews extracted data side-by-side with original document viewer,
       │  with Decimal discrepancy badges, line item editors, and ML Category tags
       ▼
[ Stage 11: Library Persistence ]
       │  POST /documents/{id}/save updates document status to 'completed'
       │  Persists extraction_result, quality_result, and ML classification
       ▼
[ Stage 12: Real-time Analytics & Retrieval Propagation ]
       │  BroadcastChannel signals Dashboard and Categories invalidation across tabs
       │  Document becomes immediately queryable by AI Assistant and Excel Export
```

---

## 🧠 Core Subsystems

### 1. Local OCR Engine (RapidOCR ONNX)
- **Technology:** `rapidocr_onnxruntime`, based on PaddleOCR weights executed via Microsoft ONNX Runtime.
- **Execution Model:** In-process singleton engine instantiated once per worker process to minimize memory footprint.
- **Asynchronous Isolation:** Executed off the main FastAPI event loop using `asyncio.to_thread()` to prevent blocking concurrent API requests.
- **Dual Purpose:**
  1. Provides spatial bounding boxes and textual grounding tokens used by `evaluate_extraction_quality()` to verify that LLM-extracted vendors and invoice numbers appear in the physical scan.
  2. Acts as the text feeder for Groq fallback extraction when multimodal vision APIs are throttled or inaccessible.

---

### 2. Multimodal AI Information Extraction
- **Primary Provider — Google Gemini 3.1 Flash-Lite:**
  - **Modality:** Multimodal Vision. Raw image bytes and MIME type are passed directly to Gemini's API.
  - **Prompt Strategy:** Strict JSON system prompt enforcing bounding hierarchy disambiguation, separating item lines from tax tables, and returning output adhering to the Pydantic schema.
  - **Temperature:** Set to `0.0` for deterministic, reproducible extractions.
- **Fallback Provider — Groq (`openai/gpt-oss-120b`):**
  - **Trigger:** Activates automatically on network timeout, rate limit (HTTP 429), or service unavailability (HTTP 503).
  - **Modality:** High-speed text LLM parsing the OCR transcript generated by RapidOCR.
- **Extracted Schema (`ReceiptInvoiceExtraction`):**
  - `document_type` (`"receipt"` | `"invoice"` | `"unknown"`)
  - `vendor_company` (string)
  - `address` (string, optional)
  - `date` (ISO-8601 string `YYYY-MM-DD`, optional)
  - `invoice_number` (string, optional)
  - `subtotal` (Decimal / float, optional)
  - `taxable_amount` (Decimal / float, optional)
  - `tax` (total tax) & `tax_components` (itemized array of CGST, SGST, VAT with rates and amounts)
  - `discount` & `service_charge` & `round_off`
  - `total` (grand total monetary value)
  - `currency` (ISO code, default `"INR"` / `"₹"`)
  - `line_items`: Array of items with `description`, `quantity`, `unit_price`, and `line_total`.

---

### 3. Deterministic Mathematical Reconciliation
All calculations use Python's `Decimal` module quantized to `Decimal("0.01")` using `ROUND_HALF_UP`:
1. **Line Item Summation Check:**
   $$\text{Calculated Subtotal} = \sum_{i=1}^{n} \text{line\_total}_i$$
   $$\Delta_{\text{subtotal}} = |\text{Calculated Subtotal} - \text{Document Subtotal}| \le 0.01$$
2. **Grand Total Reconciliation:**
   $$\text{Base} = \text{Document Subtotal (if present)} \text{ else } \text{Calculated Subtotal}$$
   $$\text{Expected Total} = \text{Base} - \text{Discount} + \text{Taxes} + \text{Service Charge} \pm \text{Round Off}$$
   $$\Delta_{\text{total}} = |\text{Calculated Total} - \text{Document Total}| \le 0.01$$
3. **Line-Item Unit Consistency:**
   $$\forall i, \quad |\text{quantity}_i \times \text{unit\_price}_i - \text{line\_total}_i| \le 0.05$$

---

### 4. Two-Tiered Duplicate Detection
- **Tier 1: Byte-Level Cryptographic Match (Exact Duplicate):**
  - Computes raw file `SHA-256` digest on upload.
  - Queries database for documents belonging to the **same user** with identical `content_hash`.
  - Returns `definite_duplicate` with `matched_document_id`. User can view the existing file or force-save a duplicate (`force_duplicate=true`).
- **Tier 2: Normalized Semantic & Logical Match (Logical Duplicate):**
  - If byte hashes differ (e.g., photo taken from a different angle), the engine normalizes text: strips punctuation, extra whitespace, and lowercases.
  - Compares: (1) normalized `vendor_company`, (2) strict `date`, (3) numerical `total`, and (4) non-null line item descriptions and line totals.
  - If all 4 match identically, returns `likely_duplicate`.
- **Strict User Isolation:** Matching queries are strictly scoped: `user_id == current_user.user_id`. An identical receipt uploaded by User B will never match or leak User A's data.

---

### 5. Extraction Quality, Sanity & Anomaly Detection
Implemented in `app/services/quality/evaluator.py`:
- **Numeric Sanity:** Detects negative numbers ($< 0$) in total, unit price, quantity, or line total $\to$ emits `SUSPICIOUS_NUMERIC_VALUE` (Critical severity, caps confidence at 0.40, sets `needs_review: true`).
- **Arithmetic Anomaly:** Emits `TOTAL_MATH_MISMATCH` (Critical) or `SUBTOTAL_MATH_MISMATCH` (Warning) if sums deviate beyond tolerance.
- **Mandatory Field Omission:** Emits `MISSING_TOTAL` (Critical), `MISSING_VENDOR` (Warning), or `MISSING_DATE` (Warning).
- **Cross-Modal OCR Grounding:** Emits `OCR_EVIDENCE_STRONG` if vendor and invoice number appear in raw RapidOCR tokens, or `OCR_EVIDENCE_MISSING` if absent.
- **Confidence Scoring:** Weighted aggregation (35% Math, 30% Completeness, 25% Line Richness, 10% OCR Grounding) bounded to:
  - $\ge 0.85 \to \text{HIGH}$
  - $0.65 - 0.84 \to \text{MEDIUM}$
  - $< 0.65 \to \text{LOW}$
  - Supports user `confidence_override` (`HIGH`, `MEDIUM`, `LOW`) during human-in-the-loop review.

---

### 6. Machine Learning Expense Categorization Engine

STRUCTRA embeds a self-contained, high-performance machine learning classification engine for automatic expense categorization.

#### 6.1 Accounting Taxonomy (7 Classes)

| Category | Accent Color | Primary Domain Scope | Sample Merchants |
|---|---|---|---|
| **Meals & Dining** | `#f97316` | Restaurants, cafes, team lunches, delivery | Starbucks, Chipotle, Domino's, Haldiram's, McDonald's |
| **Travel & Logistics** | `#3b82f6` | Airlines, rideshare, fuel, hotels, vehicle rental | Uber, Lyft, Delta, Shell, Chevron, Marriott, Amtrak |
| **Technology & Cloud Services** | `#8b5cf6` | Cloud compute, hosting, developer APIs, SaaS | AWS, Google Cloud, Azure, GitHub, OpenAI, Datadog |
| **Office Supplies & Hardware** | `#eab308` | Stationery, toner, desk furniture, peripherals | Staples, Office Depot, Best Buy, Micro Center |
| **Utilities & Telecom** | `#06b6d4` | Electricity, gas, water, mobile, broadband fiber | AT&T, Verizon, Comcast, PG&E, ConEdison |
| **Healthcare & Medical** | `#ec4899` | Pharmacy, diagnostic labs, urgent care, dental | CVS, Walgreens, Quest Diagnostics, LabCorp |
| **Retail & Groceries** | `#10b981` | Supermarkets, wholesale clubs, pantry goods | Walmart, Costco, Target, DMart, Whole Foods |

#### 6.2 Dataset Architecture (10,479 Samples)
- **Bank & Card Feeds (`backend/ml/data/fetch_external_data.py`):** 5,250 entries modeling bank statements, POS card debits, and transaction descriptors.
- **Noisy OCR Receipts (`backend/ml/data/generate_receipt_corpus.py`):** 5,229 noisy multi-line OCR transcripts with headers, line items, taxes, and totals.
- **Master Dataset (`backend/ml/data/receipt_expenses_10k.csv`):** Unified, shuffled (`seed=999`), deduplicated, and balanced into **10,479 clean samples** (~1,500 samples per class).

#### 6.3 5-Fold Stratified Cross-Validation Benchmark (`backend/ml/train.py`)
Evaluated across an 80% training split (8,383 samples):

| Candidate Algorithm | Formulation / Parameters | Mean CV Accuracy | CV Std Dev | Training Time | Selection Status |
|---|---|---|---|---|---|
| **Multinomial Naive Bayes** | `MultinomialNB(alpha=0.1)` | **100.00%** | **±0.00%** | **0.8s** | 🏆 **CHAMPION PIPELINE** |
| **Logistic Regression** | `LogisticRegression(C=1.0, solver="saga", max_iter=1000)` | **100.00%** | ±0.00% | 4.2s | Benchmark Candidate |
| **Calibrated LinearSVC** | `CalibratedClassifierCV(LinearSVC(C=1.0), cv=3)` | **100.00%** | ±0.00% | 3.6s | Benchmark Candidate |
| **SGD Classifier** | `SGDClassifier(loss="log_loss", penalty="l2", alpha=1e-4)` | **100.00%** | ±0.00% | 1.1s | Benchmark Candidate |

#### 6.4 Held-Out Test Evaluation (2,096 Samples, `backend/ml/evaluate.py`)

```
--------------------------------------------------------------------------------
CLASSIFICATION REPORT (HELD-OUT TEST SPLIT: 2,096 UNSEEN SAMPLES)
--------------------------------------------------------------------------------
                             precision    recall  f1-score   support

       Healthcare & Medical     1.0000    1.0000    1.0000       299
             Meals & Dining     1.0000    1.0000    1.0000       300
 Office Supplies & Hardware     1.0000    1.0000    1.0000       298
         Retail & Groceries     1.0000    1.0000    1.0000       300
Technology & Cloud Services     1.0000    1.0000    1.0000       300
         Travel & Logistics     1.0000    1.0000    1.0000       299
        Utilities & Telecom     1.0000    1.0000    1.0000       300

                   accuracy                         1.0000      2096
                  macro avg     1.0000    1.0000    1.0000      2096
               weighted avg     1.0000    1.0000    1.0000      2096
```

- **Inference Speed:** **< 8 milliseconds** per transaction on standard CPU.
- **Serialized Model Size:** **1.43 MB** (`backend/ml/models/expense_classifier.joblib`).
- **Predictive Salience Keywords:**
  - *Healthcare:* `dental`, `pharmacy`, `care`, `clinic`, `diagnostic`, `doctor`, `rx`
  - *Meals & Dining:* `coffee`, `delivery`, `salad`, `restaurant`, `burger`, `latte`
  - *Technology:* `cloud`, `api`, `subscription`, `seats`, `compute`, `instance`, `hosting`
  - *Travel:* `toll`, `ride`, `car`, `flight`, `gasoline`, `airline`, `lodging`
  - *Office Supplies:* `desk`, `store`, `office`, `hp`, `toner`, `usb hub`, `paper`
  - *Retail:* `organic`, `home`, `goods`, `supermarket`, `wholesale`, `grocery`
  - *Utilities:* `service`, `utility`, `gas`, `consumption`, `broadband`, `wireless`

---

### 7. Grounded Conversational AI Assistant
- **Deterministic Intent Classification (`intent.py`):** Categorizes user prompts into `vendor_spending`, `highest_expense`, `lowest_expense`, `temporal_range`, `item_lookup`, or `category_summary`.
- **Zero Arithmetic Hallucination:** The LLM is **never** asked to sum currency numbers. Numerical totals, counts, and averages are calculated deterministically in Python using `Decimal` over verified user documents retrieved from PostgreSQL.
- **Context Grounding & Sources:** The LLM only formats verified numbers into a clear, natural-language response and returns a structured `sources` array citing exact document filenames, dates, and amounts.
- **No Fabricated Data Guardrail:** Returns an explicit statement if no matching documents exist.

---

### 8. Enterprise Excel Export
- **Engine:** Python `openpyxl` generates `.xlsx` workbooks via `GET /documents/{id}/export`.
- **Zero AI Cost:** Directly converts persisted `extraction_result` and `quality_result` JSON without re-invoking AI vision APIs.
- **Styling:** STRUCTRA brand header (`#EA580C`), Segoe UI font, dark slate table headers (`#0F172A`), alternating zebra rows (`#F8FAFC`), currency formatting (`₹#,##0.00`), IST timestamps, green discount callouts, and mathematical audit verification tags.

---

### 9. Real-Time Notifications Center
- **Endpoints:** `GET /notifications` (returns items and unread count) and `POST /notifications/mark-read`.
- **Database Backing:** Built on `public.security_activity` extended with `read_at` timestamp via migration `011_add_notifications_read_state.sql`.
- **UI Integration:** TopBar notification bell with animated unread badge, interactive slide-out panel, and one-click mark-all-read action.
- **User Scoped:** Strictly filtered to `user_id == current_user.user_id`.

---

### 10. Profile & Security Governance
- **Authentication Providers:** Dynamic detection of Google OAuth vs Email/Password sign-in.
- **Device Session Tracking:** Real client operating system, browser, and IP parsed from `User-Agent`.
- **Security Audit Trail:** Immutable chronological log of sign-ins, password updates, and avatar changes.
- **Avatar Management:** Custom picture upload (JPG, PNG, WEBP $\le 2\text{ MB}$), dynamic image streaming via `GET /profile/avatar/{user_id}`, or removal to restore default initial-letter avatar.
- **Cascade Account Deletion:** Permanent account deletion (`DELETE /profile/account`) requiring typed `DELETE` confirmation. Atomically purges user documents, storage files, avatar images, audit logs, and Supabase Auth records.

---

## 💻 Workspaces & User Interface

The frontend application provides 6 dedicated workspaces:

1. **Upload & Review Workspace (`/app/upload`):**
   - Drag-and-drop file ingestion supporting PDF, PNG, JPG, JPEG up to 10 MB.
   - Live extraction animation sequencing through OCR, Vision AI, Decimal math, and ML classification.
   - Side-by-side interactive review workspace with document viewer, line item editor, Decimal discrepancy tags, and ML Category pill.
2. **Document Library (`/app/library`):**
   - Toggle between visual Card Grid and tabular List views.
   - Real-time text search `q`, status filters (`completed`, `needs_review`, `pending`), and date/amount sorting.
   - Detail modal, signed preview viewer, cascading deletion, and one-click Excel export.
3. **Categories Workspace (`/app/categories`):**
   - Interactive visual cards for all 7 corporate accounting categories with custom accent colors and statistics.
   - Real-time Interactive Classification Playground to test live ML inference on any input text or receipt line.
   - One-click document filtering by category.
4. **Analytics Dashboard (`/app/dashboard`):**
   - Lifetime financial metrics (total spend, document count, average transaction).
   - Spending time-series charts (`day`, `week`, `month`, `year`).
   - Top vendor rankings and frequent line items.
   - Extraction quality distribution chart and actionable review queue.
   - Cross-tab updates via `BroadcastChannel`.
5. **Conversational AI Assistant (`/app/assistant`):**
   - Dedicated full-page chat interface and omnipresent floating drawer (`FloatingAIAssistant.jsx`).
   - Natural-language querying grounded strictly in user documents with structured source citations.
6. **Profile & Security Workspace (`/app/profile`):**
   - Profile overview, personal details form, avatar upload, device session details, security audit trail, and danger zone account deletion.

---

## 📡 API Endpoints Reference

Interactive OpenAPI / Swagger documentation is available at `http://127.0.0.1:8000/docs`.

### Machine Learning
| Method | Path | Summary | Auth |
|---|---|---|---|
| `GET` | `/ml/categories` | Catalog of 7 trained categories with metadata, samples, and keywords | None |
| `POST` | `/ml/predict` | Real-time ML expense categorization inference (`{"text": "..."}`) | None |

### Authentication & Health
| Method | Path | Summary | Auth |
|---|---|---|---|
| `GET` | `/health` | Asynchronous service health probe (`{"status": "healthy"}`) | None |
| `POST` | `/auth/signup` | User registration with Supabase Auth | None |

### Documents & Extraction
| Method | Path | Summary | Auth |
|---|---|---|---|
| `POST` | `/documents/upload` | Multipart file upload with SHA-256 deduplication and S3 persistence | Bearer JWT |
| `POST` | `/documents/{id}/extract` | Multimodal AI extraction (Gemini + Groq) and automatic ML categorization | Bearer JWT |
| `POST` | `/documents/{id}/validate` | Float-free Decimal mathematical reconciliation | Bearer JWT |
| `POST` | `/documents/{id}/save` | Save document into library with status `'completed'` | Bearer JWT |
| `GET` | `/documents` | Paginated, searchable document library with ML category badges | Bearer JWT |
| `GET` | `/documents/{id}` | Single document details with validation and ML metadata | Bearer JWT |
| `PUT` | `/documents/{id}` | Update line items or extraction fields | Bearer JWT |
| `DELETE` | `/documents/{id}` | Cascade deletion of document record and storage file | Bearer JWT |
| `GET` | `/documents/{id}/download` | Stream original uploaded file | Bearer JWT |
| `GET` | `/documents/{id}/preview` | Generate short-lived signed viewing URL | Bearer JWT |
| `GET` | `/documents/{id}/export` | Generate and export branded Microsoft Excel (`.xlsx`) workbook | Bearer JWT |

### Dashboard & Analytics
| Method | Path | Summary | Auth |
|---|---|---|---|
| `GET` | `/dashboard` | User summary metrics, lifetime spend, and highlights | Bearer JWT |
| `GET` | `/dashboard/spending` | Spending-over-time series (`period=day\|week\|month\|year`) | Bearer JWT |
| `GET` | `/dashboard/vendors` | Ranked vendor distribution | Bearer JWT |
| `GET` | `/dashboard/items` | Frequently purchased items | Bearer JWT |
| `GET` | `/dashboard/quality` | Extraction confidence tier distribution | Bearer JWT |
| `GET` | `/dashboard/review-queue` | Documents requiring human review | Bearer JWT |

### AI Assistant (Deterministic RAG)
| Method | Path | Summary | Auth |
|---|---|---|---|
| `POST` | `/assistant/session` | Create ephemeral assistant conversation session | Bearer JWT |
| `POST` | `/assistant/chat` | Send grounded natural-language query over expense documents | Bearer JWT |
| `POST` | `/assistant/session/{id}/reset` | Clear conversation memory for session | Bearer JWT |

### Notifications & Activity
| Method | Path | Summary | Auth |
|---|---|---|---|
| `GET` | `/notifications` | Get notification / activity feed with unread counter | Bearer JWT |
| `POST` | `/notifications/mark-read` | Mark all unread notifications as read | Bearer JWT |

### Profile & Security Governance
| Method | Path | Summary | Auth |
|---|---|---|---|
| `GET` | `/profile` | User overview, storage metrics, and account status | Bearer JWT |
| `PATCH` | `/profile` | Update personal details (name, phone, organization, language) | Bearer JWT |
| `POST` | `/profile/picture` | Upload custom profile avatar (JPG, PNG, WEBP $\le 2\text{ MB}$) | Bearer JWT |
| `DELETE` | `/profile/picture` | Remove avatar and restore default letter avatar | Bearer JWT |
| `GET` | `/profile/avatar/{user_id}` | Stream user avatar image content | None / Public cache |
| `GET` | `/profile/security` | Sign-in provider detection and active device session info | Bearer JWT |
| `GET` | `/profile/security/activity` | Chronological security audit log | Bearer JWT |
| `POST` | `/profile/security/activity` | Record custom security activity item | Bearer JWT |
| `DELETE` | `/profile/account` | Irrevocably delete account and all data (`{"confirmation": "DELETE"}`) | Bearer JWT |

---

## 🗄️ Database Schema & Security

STRUCTRA executes queries over Supabase PostgreSQL via PostgREST with service-role credentials and explicit `user_id=eq.{user_id}` isolation.

### Core Tables
1. **`public.documents`:**
   - `id` (UUID, PK), `user_id` (UUID, FK $\to$ `auth.users.id`), `filename` (TEXT), `storage_path` (TEXT), `content_type` (TEXT), `size` (BIGINT), `status` (`pending` | `processing` | `completed` | `failed`), `content_hash` (TEXT, SHA-256), `created_at` (TIMESTAMPTZ), `processed_at` (TIMESTAMPTZ), `extraction_result` (JSONB), `quality_result` (JSONB).
2. **`public.extraction_cache`:**
   - `content_hash` (TEXT, PK), `extraction_json` (JSONB), `created_at` (TIMESTAMPTZ).
3. **`public.security_activity`:**
   - `id` (UUID, PK), `user_id` (UUID, FK $\to$ `auth.users.id`), `event_type` (TEXT), `description` (TEXT), `device_info` (TEXT), `ip_address` (TEXT), `read_at` (TIMESTAMPTZ, nullable), `created_at` (TIMESTAMPTZ).

### SQL Migrations (`backend/migrations/`)
- `001_create_documents.sql` — Initial documents table
- `002_document_processing_status.sql` — Processing status enum & constraints
- `003_add_document_content_hash.sql` — Content hash column for SHA-256 deduplication
- `004_create_extraction_cache.sql` — Extraction acceleration cache table
- `005_storage_and_document_foundation.sql` — Storage bucket configuration & RLS policies
- `006_add_document_extraction_persistence.sql` — Extraction result & quality result JSONB columns
- `007_add_user_content_hash_unique_index.sql` — User-scoped duplicate prevention index
- `008_verify_security_and_rls_isolation.sql` — Security verification & RLS validation
- `009_add_documents_user_created_at_index.sql` — Index for pagination performance
- `010_create_security_activity.sql` — Security activity audit log table
- `011_add_notifications_read_state.sql` — Read state column & notification feed indexing

---

## 🛠️ Technology Stack

### Backend
- **Runtime:** Python 3.12 (64-bit)
- **API Framework:** FastAPI 0.115+ (ASGI) & Uvicorn
- **Data Validation:** Pydantic 2.10+ & Pydantic-Settings 2.7+
- **HTTP Client:** HTTPX 0.28+ (persistent connection pooling)
- **Local OCR:** RapidOCR (`rapidocr_onnxruntime` 1.4+), PaddleOCR weights on ONNX Runtime
- **Primary AI Vision:** Google Gemini API (`gemini-3.1-flash-lite`, direct byte ingestion)
- **Fallback AI:** Groq Cloud API (`openai/gpt-oss-120b`, structured JSON)
- **Machine Learning:** Scikit-Learn 1.9+, Joblib 1.6+, Scipy, Threadpoolctl
- **Mathematical Validation:** Pure Python `Decimal` (`ROUND_HALF_UP`)
- **Excel Generation:** Openpyxl 3.1+
- **Image Handling:** Pillow (PIL) 11.1+ & OpenCV Python

### Frontend
- **Framework:** React 19.2.7 (Strict mode, ES Modules)
- **Bundler:** Vite 8.1.5 (`@vitejs/plugin-react`)
- **Styling:** Vanilla CSS & Tailwind CSS 4.3.3 (`@tailwindcss/vite`)
- **Animations:** Framer Motion 12.43.0
- **Icons:** Lucide React 1.28.0
- **Routing:** React Router DOM 7.18.2
- **Auth & Storage Client:** `@supabase/supabase-js` 2.112.2

---

## 📁 Repository Structure

```
STRUCTRA/
├── backend/                        # FastAPI microservice & ML pipeline
│   ├── app/                        # Application factory, routes, schemas & services
│   │   ├── api/                    # Route controllers & dependencies
│   │   │   ├── routes/             # REST endpoints (documents, ml, assistant, etc.)
│   │   │   ├── dependencies.py     # Auth injection & current user validation
│   │   │   └── router.py           # Master API router registration
│   │   ├── core/                   # Application configuration & settings
│   │   │   └── config.py           # Pydantic Settings configuration loader
│   │   ├── schemas/                # Pydantic request/response contracts
│   │   │   ├── auth.py             # User models and JWT claims
│   │   │   ├── documents.py        # Document schemas & ML category metadata
│   │   │   └── profile.py          # Profile, avatar & security schemas
│   │   └── services/               # Core domain services
│   │       ├── ai/                 # Gemini vision & Groq fallback managers
│   │       ├── assistant/          # Deterministic RAG & Decimal aggregations
│   │       ├── duplicate/          # Two-tiered duplicate detection
│   │       ├── export/             # Microsoft Excel (.xlsx) workbook generator
│   │       ├── ml/                 # In-memory ML classifier singleton
│   │       ├── notifications.py    # User-scoped notification feed handlers
│   │       ├── ocr/                # RapidOCR ONNX integration
│   │       ├── profile.py          # Profile metadata & avatar handlers
│   │       ├── quality/            # Anomaly rules & confidence scoring
│   │       ├── storage.py          # Supabase private storage client
│   │       └── validation/         # Pure Decimal mathematical reconciliation
│   ├── migrations/                 # 11 PostgreSQL & Supabase SQL migrations
│   ├── ml/                         # Machine Learning subsystem
│   │   ├── data/                   # Dataset generators & master CSV
│   │   │   ├── build_10k_dataset.py       # 10,479-sample dataset compiler
│   │   │   ├── fetch_external_data.py     # Bank & card feed generator
│   │   │   ├── generate_receipt_corpus.py # Noisy OCR receipt generator
│   │   │   └── receipt_expenses_10k.csv   # Unified master CSV dataset
│   │   ├── models/                 # Serialized model artifacts & metadata
│   │   │   ├── expense_classifier.joblib  # Serialized champion pipeline (1.43 MB)
│   │   │   └── model_metadata.json        # Training metrics & class metadata
│   │   ├── train.py                # 5-fold CV benchmark & pipeline serializer
│   │   ├── evaluate.py             # Held-out test evaluation & confusion matrix
│   │   └── predict.py              # CLI inference tool & interactive REPL
│   ├── tests/                      # 58 test files (722 tests collected)
│   ├── .env.example                # Sample backend environment template
│   └── pyproject.toml              # Packaging and dependency configuration
├── frontend/                       # React 19 / Vite single-page application
│   ├── public/                     # Static assets (favicon, brand assets)
│   ├── src/
│   │   ├── api/                    # HTTP client modules (documents, ml, assistant)
│   │   ├── assets/                 # Backgrounds (bg.webp, login-background.webp)
│   │   ├── components/             # UI components by domain
│   │   │   ├── app/                # Authenticated application workspaces
│   │   │   │   ├── assistant/      # AI Assistant chat view
│   │   │   │   ├── categories/     # CategoriesPage.jsx & live prediction playground
│   │   │   │   ├── dashboard/      # Analytics, spending charts, review queue
│   │   │   │   ├── library/        # Document library (cards, list, modals)
│   │   │   │   ├── profile/        # Profile overview, security, danger zone
│   │   │   │   ├── shared/         # Sidebar, TopBar, NotificationPanel, MainLayout
│   │   │   │   └── upload/         # Upload dropzone & side-by-side review workspace
│   │   │   ├── auth/               # Login, Register, Forgot/Reset Password views
│   │   │   ├── about/              # About STRUCTRA page
│   │   │   └── landing/            # Landing page hero & feature showcases
│   │   ├── context/                # React Contexts (Auth, Library, Upload, Dashboard)
│   │   ├── config/                 # API configuration
│   │   ├── hooks/                  # Custom React hooks (useAuth, useRecentDocuments)
│   │   ├── lib/                    # Supabase client singleton
│   │   └── utils/                  # Shared document and avatar utilities
│   ├── .env.example                # Sample frontend environment template
│   ├── index.html                  # HTML entry point with Michroma & Inter fonts
│   ├── package.json                # Frontend dependencies and scripts
│   └── vite.config.js              # Vite configuration with Tailwind CSS plugin
├── docs/                           # Design, developer, and deployment documentation
│   ├── assets-map.md               # Design asset specifications and mappings
│   ├── design.md                   # Visual tokens, color palette, glassmorphism rules
│   ├── instructions.md             # Permanent development guidelines
│   ├── motion.md                   # Framer Motion curves and interaction timings
│   └── deployment.md               # Provider-neutral deployment checklist
├── Receipts/                       # Real-world receipt validation samples (9 files)
├── .gitignore                      # Authoritative repository-wide git ignore rules
└── README.md                       # Master repository documentation (this file)
```

---

## 🚀 Quick Start & Local Development

### Prerequisites
- **Python 3.12 (64-bit)** (Python 3.13+ is not supported due to ONNX runtime constraints)
- **Node.js 20.19+ or 22.12+** and **npm 10+**
- A Supabase project with PostgreSQL, Auth, and Storage enabled
- Google Gemini API key (or Groq API key for fallback)

---

### 1. Backend Setup

```powershell
# Navigate to the backend directory and create an isolated environment
cd C:\STRUCTRA\backend
py -3.12 -m venv .venv-x64
.\.venv-x64\Scripts\Activate.ps1
pip install -e ".[dev]"

# Configure environment variables
Copy-Item .env.example .env
# Edit .env with your real Supabase and Gemini credentials

# Run automated tests to verify installation
pytest -q

# Start the local FastAPI server
uvicorn app.main:app --reload --port 8000
```

- **API Base:** `http://127.0.0.1:8000`
- **Swagger Documentation:** `http://127.0.0.1:8000/docs`
- **Health Check:** `http://127.0.0.1:8000/health`

---

### 2. Machine Learning CLI Commands

With the backend virtual environment active:

```powershell
cd C:\STRUCTRA\backend
.\.venv-x64\Scripts\Activate.ps1

# 1. Compile 10,479-sample balanced master dataset
python ml/data/build_10k_dataset.py

# 2. Run 5-fold CV benchmark across 4 models & serialize champion pipeline
python ml/train.py

# 3. Generate held-out evaluation report & confusion matrix
python ml/evaluate.py

# 4. Run instant CLI classification inference
python ml/predict.py --text "Starbucks Coffee Grande Latte $5.45"

# 5. Interactive live REPL console
python ml/predict.py
```

---

### 3. Frontend Setup

```powershell
# Open a new terminal and navigate to frontend
cd C:\STRUCTRA\frontend

# Install dependencies
npm ci

# Create the local environment file and set its values before building
Copy-Item .env.example .env
# For production, VITE_API_URL must point to the deployed API.

# Validate production build
npm run build

# Start local Vite development server
npm run dev
```

- **Web Application:** `http://localhost:5173`

---

## 🧪 Testing & Quality Assurance

### Automated Backend Test Suite
The STRUCTRA backend includes an exhaustive test suite executed via `pytest`:
- **Current collection:** **722 tests across 58 files** (`pytest --collect-only -q`).
- **Last recorded full run:** 721 passed, 1 skipped, 0 failures (722 collected). Run `pytest -q` to refresh this result for your environment.
- **Test Suites (58 files):**
  - Authentication, token parsing, and JWKS verification (`test_auth.py`, `test_auth_dependency.py`)
  - Document lifecycle, extraction, and deletion (`test_documents.py`, `test_document_deletion.py`, `test_document_download.py`)
  - Gemini multimodal extraction & Groq fallback (`test_ai_extraction.py`, `test_gemini.py`, `test_ocr_service.py`)
  - Pure Decimal arithmetic validation (`test_mathematical_validation.py`, `test_validation_aggregation.py`)
  - Quality rules & anomaly detection (`test_quality_evaluator.py`, `test_quality_signals.py`, `test_confidence_system_and_override.py`)
  - Two-tier duplicate detection (`test_duplicate_detection.py`, `test_persistence_duplicate_lifecycle.py`)
  - User isolation & IDOR protection (`test_milestone_6_7_user_isolation_security.py`)
  - Dashboard analytics & spending series (`test_milestone_7_1_dashboard_api.py`, `test_milestone_7_2_spending_purchase_analytics.py`)
  - Deterministic AI Assistant RAG (`test_milestone_8_1_assistant_rag.py` through `test_milestone_8_7_assistant_system_verification.py`)
  - Excel workbook export (`test_milestone_9_2_excel_export.py` through `test_milestone_9_5_export_robustness_security.py`)
  - Machine learning classifier runtime (`test_ml_classifier.py`)
  - Notifications feed & read state (`test_notifications.py`)
  - Profile workspace, avatar, and security audit (`test_profile_api.py`, `test_profile_personal_info.py`, `test_profile_account_security.py`, `test_profile_danger_zone.py`, `test_profile_complete_audit.py`)

### Frontend Production Build
- **Tool:** Vite 8.1.5 client production build (`npm run build`).
- **Result:** **0 build errors, 2,317 modules transformed**. Route-level code splitting reduced the entry chunk from about 1.26 MB (302 kB gzip) to about 294 kB (90 kB gzip); the largest remaining shared chunk is about 208 kB.
- **Distribution:** Clean single-page bundle (`dist/index.html`, minified assets).
- **Lint:** `npm run lint` currently passes with warnings. Review and reduce the React effect, dependency, and Fast Refresh warnings before treating the frontend as fully release-clean.

### Public-page responsive check

With the Vite development server running, execute `node frontend/test_all_responsive.cjs` from the repository root. It waits for each page to render and fails if the landing, login, or About page has no content or horizontal overflow at the configured mobile, landscape, and desktop viewport sizes. Use `node frontend/test_all_responsive.cjs --smoke` for a quick 320 px mobile check. These checks do not cover authenticated workflows.

---

## ⚙️ Configuration & Environment Variables

### Backend (`backend/.env`)

```bash
# Supabase Project Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SECRET_KEY=your-supabase-secret-service-role-key

# Primary Multimodal AI Provider
GEMINI_API_KEY=your-google-gemini-api-key
GEMINI_MODEL=gemini-3.1-flash-lite

# Fallback AI Provider
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b

# Document Upload & Storage Constraints
DOCUMENT_MAX_UPLOAD_SIZE_BYTES=10485760
SUPABASE_STORAGE_BUCKET=documents

# Comma-separated exact browser origins; never use a wildcard.
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.example
```

### Frontend (`frontend/.env`)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-publishable-key
VITE_API_URL=https://your-backend-domain.example
```

For local development, use `http://localhost:5173` for `CORS_ALLOWED_ORIGINS` and `http://localhost:8000` for `VITE_API_URL`. Production builds fail when `VITE_API_URL` is missing. Keep the Supabase secret key and AI provider keys in the backend hosting environment only; the frontend must use the public/publishable Supabase key.

---

## 📖 Design & Documentation References

For design, development, asset, and deployment guidance:
- **[Design Specification](docs/design.md):** Dark-mode palette, glassmorphism tokens, typography, and component styling rules.
- **[Motion Specification](docs/motion.md):** Framer Motion curves, entrance transitions, and micro-interaction timings.
- **[Development Instructions](docs/instructions.md):** Architectural principles and permanent implementation guidelines.
- **[Asset Map](docs/assets-map.md):** Mapping of visual image assets, backgrounds, and brand iconography.
- **[Deployment Checklist](docs/deployment.md):** Provider-neutral frontend, backend, Supabase, and release setup.

---

## 📄 License & Attribution

Copyright © 2026 STRUCTRA Platform. All rights reserved.
