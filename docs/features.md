# Structra — AI Document Intelligence Platform
## Final Product Requirements Document (PRD)

---

# 1. Overview

Structra is an AI-powered Document Intelligence Platform that allows users to upload receipts, invoices, and other supported business documents, automatically extracting structured information using OCR and Artificial Intelligence.

Instead of manually entering data, users receive organized, searchable, and validated information including vendor details, invoice information, financial values, and line items. The platform also provides intelligent search, analytics dashboards, AI-powered document querying, duplicate detection, anomaly detection, and export capabilities.

**Scale:** Small production deployment supporting approximately **10–30 real users**. The application is designed to operate entirely on free-tier cloud services while maintaining secure multi-user access and complete data isolation.

**Budget:** ₹0 / $0. Every technology and cloud service used must provide a genuine free tier without requiring a credit card.

**Security:** Every authenticated user only has access to their own uploaded documents, extracted data, dashboard, analytics, chat history, corrections, and exports. Under no circumstance should one user access another user's information.

---

# 2. Tech Stack (Final)

| Layer | Technology |
|--------|------------|
| Frontend | React + Tailwind CSS |
| Frontend Hosting | Vercel (Free Tier) |
| Backend | FastAPI (Python) |
| Backend Hosting | Render (Free Web Service) |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth (Email/Password + JWT) |
| File Storage | Supabase Storage |
| OCR Engine | Tesseract OCR |
| AI Extraction | Google Gemini API (Free Tier) |
| AI Chat | Google Gemini API |
| Vector Search | pgvector (Supabase PostgreSQL) |
| Charts | Recharts |
| Excel Export | openpyxl |

No paid services, billing-enabled APIs, or credit-card-required platforms should be introduced into the project.

---

# 3. Complete Feature List

---

## 3.1 Authentication

Users can securely create and manage their own accounts.

Features include:

- Email & Password Sign Up
- Secure Login
- Logout
- Forgot Password (Email Reset Link)
- JWT-based Authentication
- Secure Session Management
- Protected Routes
- Row-Level Security (RLS)
- Every API request is automatically scoped to the authenticated user
- One user can never access another user's documents or chat history

---

## 3.2 Document Upload

The platform supports uploading business documents through multiple methods.

Supported Formats

- PDF
- JPG
- PNG

Upload Features

- Drag & Drop Upload
- File Picker
- Mobile Camera Upload
- Upload Progress Indicator
- Multiple File Upload
- Upload Status Tracking

Each uploaded document displays its current processing state:

- Pending
- Processing
- Needs Review
- Completed

---

## 3.3 OCR & Intelligent Information Extraction

The application automatically converts uploaded documents into structured data.

### OCR Pipeline

- Extract raw text from images and PDFs using Tesseract OCR
- Handle scanned receipts and invoices
- Preserve document layout where possible

### AI Information Extraction

Google Gemini processes the OCR text and extracts:

Vendor Information

- Vendor Name
- Vendor Address
- Vendor Phone Number
- Vendor Email
- GST Number

Invoice Details

- Invoice Number
- Receipt Number
- Date
- Due Date
- Currency
- Payment Method

Financial Information

- Subtotal
- Tax
- Discount
- Shipping Charges
- Grand Total

Line Items

- Item Name
- Quantity
- Unit Price
- Total Price

Every extracted field contains a confidence score.

Fields below a predefined confidence threshold are automatically highlighted for user verification.

---

## 3.4 Validation Engine

Automatically validates extracted document information.

Validation Rules

- Sum of all line items equals subtotal
- Subtotal + Tax − Discount = Grand Total
- Required fields (Vendor, Date, Total) must exist
- Detect missing mandatory values
- Verify currency consistency

Validation issues never block saving.

Instead, the system displays warnings such as:

- Incorrect Grand Total
- Missing Vendor
- Missing Date
- Tax Calculation Mismatch
- Invalid Financial Values

---

## 3.5 Duplicate Detection

Prevent accidental duplicate uploads.

Detection Methods

- Vendor + Date + Total matching
- OCR text similarity
- Image similarity
- Duplicate invoice numbers

When a duplicate is detected, users receive a warning before saving.

Users may still choose to keep the document.

---

## 3.6 Anomaly Detection

Structra performs rule-based anomaly detection.

Examples include:

- Invoice date is in the future
- Duplicate invoice number across different vendors
- Validation calculations fail
- Tax missing on documents that normally contain tax
- Missing financial information
- Suspicious document inconsistencies

These anomalies are displayed as warnings rather than blocking processing.

---

## 3.7 Manual Corrections

Users can manually modify any extracted information.

Capabilities

- Edit extracted text
- Correct OCR mistakes
- Add missing values
- Remove incorrect values

Every correction is permanently logged.

Correction Log

- Field Name
- Original AI Value
- Corrected Value
- Timestamp

This correction history can later be analyzed to improve extraction quality.

---

## 3.8 Dashboard

The Dashboard serves as the central workspace for every authenticated user.

Displayed Information

- Total Documents Processed
- Total Spending
- Monthly Spending
- Duplicate Document Count
- Anomaly Count
- Top Vendors
- Recent Uploads
- Spend-over-Time Chart
- Quick Access to Document Library
- Recent AI Activity

Dashboard visualizations are built using Recharts.

---

## 3.8.1 Document Library

Every uploaded document is permanently stored inside a dedicated Document Library.

The Document Library acts as the central repository for all user documents.

Features

- View all uploaded documents
- Grid View
- List View
- Thumbnail Preview
- Vendor Name
- Upload Date
- Document Type
- Processing Status
- Total Amount

Sorting

- Newest First
- Oldest First
- Vendor Name
- Amount

Filtering

- Vendor
- Date Range
- Status
- Document Type

Document Actions

- View Original Document
- View Extracted Information
- Edit Extracted Fields
- Download Document
- Delete Document

Every uploaded document remains available until deleted by its owner.

---

## 3.9 Search & Filtering

Users can quickly locate previously uploaded documents.

Search By

- Vendor Name
- Invoice Number
- Receipt Number
- GST Number

Filters

- Date Range
- Amount Range
- Vendor
- Document Type
- Processing Status

Search results are displayed instantly from the user's own document library.

---

## 3.10 AI Chat Assistant

Structra includes an AI-powered Document Intelligence Assistant.

Unlike traditional chatbots, the assistant has access to the authenticated user's complete document workspace.

The assistant can reason over:

- All uploaded documents
- OCR text
- Extracted structured fields
- Line Items
- Validation Results
- Duplicate Detection Results
- Anomaly Flags
- Manual Corrections
- Dashboard Statistics
- Spending History

Example Questions

- How much did I spend this month?
- Show all Amazon invoices.
- Which vendor has the highest spending?
- Find duplicate invoices.
- Show documents with validation issues.
- What is my largest purchase?
- Compare spending between June and July.

The assistant retrieves relevant document context using pgvector before generating responses through Google Gemini.

It must never answer questions using external knowledge or another user's data.

If relevant information does not exist, it responds:

"I don't have enough information in your uploaded documents to answer that."

## 3.11 Export

Structra enables users to export their processed document data in multiple formats for reporting, accounting, backup, or further analysis.

Supported Export Formats

- CSV
- JSON
- Microsoft Excel (.xlsx)

### CSV Export

Contains one row per processed document including:

- Vendor Name
- Invoice Number
- Date
- Subtotal
- Tax
- Discount
- Grand Total
- Document Status

---

### JSON Export

Exports complete structured document information including:

- Document Metadata
- Extracted Fields
- Line Items
- Validation Results
- Confidence Scores
- Correction History

---

### Excel Export

Generated using **openpyxl**.

Workbook Structure

**Sheet 1 — Documents**

Columns

- Vendor
- Invoice Number
- Date
- Currency
- Subtotal
- Tax
- Discount
- Grand Total
- Status

**Sheet 2 — Line Items**

Columns

- Document ID
- Vendor
- Item Name
- Quantity
- Unit Price
- Total Price

Users may export either selected documents or their complete document library.

---

## 3.12 Evaluation Harness (Internal Tool)

The project includes an internal evaluation system to measure extraction quality.

Purpose

- Evaluate OCR accuracy
- Evaluate AI extraction quality
- Measure field-level performance
- Track improvements during development

Evaluation Dataset

- 50–100 manually verified receipts and invoices
- Ground truth values maintained separately

Metrics

- Precision
- Recall
- F1 Score
- Exact Match Accuracy
- Field-wise Accuracy

Fields Evaluated

- Vendor
- Date
- Invoice Number
- Currency
- Total
- Tax
- Line Items

The evaluation pipeline should be developed immediately after the first working extraction pipeline rather than waiting until project completion.


