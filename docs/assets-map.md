Assets Map

4. Main Application --- Upload Documents Workspace

Location

design-assets/MainPage/Upload Section/

The Upload Documents workspace is implemented as a sequence of UI
states.

The following reference images are the official approved references for
each state/group of states.

IMPORTANT:

Do NOT redesign these approved states.

Use the references to reproduce:

Layout

Glassmorphism

Background

Typography

Spacing

Borders

Glow effects

Cards

Buttons

Icons

Visual hierarchy

Animations where applicable

All states belong to the same Upload Documents route.

The page should transform between states rather than navigating to
separate pages.

stage1-reference.png

Purpose:

Official reference for STAGE 1 --- Empty / Ready to Upload.

This is the default Upload Documents state immediately after entering
the application.

Includes:

Main application layout

Left sidebar

Global search bar

User/profile area

Upload Documents selected

Large glass upload card

Drag & Drop area

Browse Files button

Supported formats

How It Works section

Recently Processed section

Floating AI Assistant button

STRUCTRA background

Premium glassmorphism

This stage is already implemented.

DO NOT redesign or replace this stage.

Use it as the foundation for all subsequent Upload-page states.

stage2-reference.png

Purpose:

Official reference for STAGE 2 --- File Selected / Ready to Process.

Displayed after the user selects or drops a document.

The main upload glass card expands/transforms while the existing
application shell remains unchanged.

Includes:

Selected document preview/icon

Filename

File type

File size

File-ready indication

Process Document action

Remove/change file action

Expanded glass upload workspace

STRUCTRA visual language

The How It Works and Recently Processed sections are no longer shown in
this state.

Do not start AI processing automatically at this stage.

stage345-reference.png

Purpose:

Official reference for STAGES 3, 4 and 5.

This reference represents the animated document-processing workflow.

The same expanded glass card is maintained throughout the processing
flow.

STAGE 3 --- Uploading

Show:

Selected document

Upload progress

Progress percentage

Upload status

Smooth progress animation

Example:

Uploading document...

Receipt.png

78%

Securely uploading your document...

STAGE 4 --- AI Processing

Show:

STRUCTRA AI processing animation

Reading Document

Extracting Information

Processing indicators

Human-friendly status message

Premium animated visual treatment

Example:

AI PROCESSING

✓ Document uploaded

◉ Reading document

◉ Extracting information

○ Validating results

STAGE 5 --- Validation

Show:

Extraction completed

Information validation

Mathematical checking

Duplicate checking

Smooth transition between validation steps

Example:

✓ Information extracted

✓ Structure validated

◉ Checking calculations

◉ Checking duplicates

IMPORTANT:

Stages 3, 4 and 5 are animation states of the same processing workspace.

Do NOT create three separate pages.

The glass card should remain visually continuous while its contents,
animation and status change.

The How It Works and Recently Processed sections remain hidden during
these states.

stage6-reference.png

Purpose:

Official reference for STAGE 6 --- Processing Complete.

This is a short transition state between processing and the extraction
result.

Show:

Success/check animation

Document Ready

Preparing your results...

Example:

✓

Document Ready

Preparing your results...

This state should transition quickly into Stage 7.

Do not keep the user on this state unnecessarily.

stage7-reference.png

Purpose:

Official reference for STAGE 7 --- Extraction Result.

This becomes the primary Upload Review workspace after successful AI
extraction.

The How It Works and Recently Processed sections are removed.

The main glass workspace expands into the document-review layout.

Layout

LEFT:

Original uploaded document preview

Image/PDF preview

Preview controls where appropriate

RIGHT:

Extracted information

Vendor/company

Address

Date

Total

Line items

Processing status

Example:

Receipt.png

✓ Processed

EXTRACTED INFORMATION

Vendor

ABC MART

Address

123 Green Street...

Date

09 Aug 2025

Total

₹1,365

LINE ITEMS

Aashirvaad Atta 5kg       ₹289

Amul Toned Milk 1L        ₹126

...

IMPORTANT:

Stage 7 represents the extracted result.

Validation information is added to this result workspace in Stage 8.

Do NOT treat Stages 7, 8 and 9 as completely separate pages.

They progressively enhance the same review workspace.

stage8910-reference.png

Purpose:

Official reference for STAGES 8, 9 and 10.

These states belong to the same document-review workspace.

STAGE 8 --- Validation Results

Add validation information to the Stage 7 result workspace.

Show friendly user-facing validation states.

Examples:

✓ Document structure valid

✓ Mathematical validation

All extracted totals match.

OR:

⚠ Review recommended

Line-item total: ₹1,361

Document total: ₹1,365

Difference: ₹4

Duplicate state:

✓ No duplicate detected

OR:

⚠ Possible duplicate

This document appears similar to an existing document.

The UI must consume the actual M5 validation result during backend
integration.

Do not invent confidence percentages.

Do not expose internal backend terminology.

STAGE 9 --- Review / Edit

Allow the user to review and edit extracted information.

Fields include:

Vendor

[ ABC MART ]

Address

[ 123 Green Street... ]

Date

[ 09 Aug 2025 ]

Total

[ ₹1,365 ]

Line Items

Aashirvaad Atta 5kg       ₹289

Amul Toned Milk 1L        ₹126

...

Requirements:

Clear editable controls

Premium document-review experience

Avoid making the entire workspace look like a generic form

Make modified values visually clear

Primary actions eventually include:

Save to Library

Download / Export

Delete / Discard

Process Another

STAGE 10 --- Duplicate Warning

This state is conditional.

Only show duplicate-warning UI when duplicate detection requires user
attention.

LIKELY DUPLICATE:

⚠ Possible duplicate

This document appears similar to:

ABC MART

09 Aug 2025

₹1,365

Actions:

[ View Existing ]

[ Save Anyway ]

DEFINITE DUPLICATE:

⚠ Duplicate document

This exact document already exists in your account.

Actions:

[ View Existing ]

[ Cancel ]

IMPORTANT:

Do not use fabricated percentages such as:

93% duplicate

Use the actual duplicate classification returned by the backend.

If no duplicate exists, the duplicate-warning UI should not appear.

stage11-reference.png

Purpose:

Official reference for STAGE 11 --- Saved.

Displayed after the user successfully saves the processed document to
the Document Library.

Show:

Success animation

Saved confirmation

Document summary

Vendor

Total

Saved status

View Document action

Process Another action

Example:

✓

Saved to your Document Library!

ABC MART

₹1,365

[ View Document ]

[ Process Another ]

Use a short, polished success transition.

stage12-reference.png

Purpose:

Official reference for STAGE 12 --- Process Another / Reset.

This state returns the user to the Upload Documents starting experience.

After selecting:

[ Process Another ]

the Upload workspace should reset to Stage 1.

The user should be able to immediately upload another document.

Do NOT require a page refresh.

The application shell remains unchanged.

Upload Page State Flow

The complete Upload Documents workflow is:

STAGE 1
Empty / Ready
        ↓
STAGE 2
File Selected
        ↓
STAGE 3
Uploading
        ↓
STAGE 4
AI Processing
        ↓
STAGE 5
Validation
        ↓
STAGE 6
Processing Complete
        ↓
STAGE 7
Extraction Result
        ↓
STAGE 8
Validation Results
        ↓
STAGE 9
Review / Edit
        ↓
STAGE 10
Duplicate Warning
        ↓
Save
        ↓
STAGE 11
Saved
        ↓
STAGE 12
Process Another
        ↓
STAGE 1

5. Main Application --- Document Library

Location

design-assets/MainPage/Document Library/

DocumentLibrary-reference.png

Purpose:

Official reference for the Document Library workspace.

This is the approved reference for the Document Library route.

The Document Library should preserve the established STRUCTRA visual
language used throughout the Upload Documents workspace:

Deep dark background

Warm orange/amber accent color

Premium glassmorphism

Subtle orange borders

Soft ambient glow

Orange-highlighted active navigation

Existing STRUCTRA sidebar/application shell

Existing typography and spacing language

Receipt/invoice thumbnails

Subtle hover states and transitions

IMPORTANT:

Do not redesign the visual theme independently from the approved Upload
Documents experience.

Use DocumentLibrary-reference.png as the official structural and
component reference for this route while preserving the existing
STRUCTRA orange/dark visual system.

Document Library Purpose

The Document Library is the user's persistent collection of documents
that have been successfully processed and saved.

It is not the upload/processing workspace.

Documents should appear here only after they have successfully reached
the saved/library state from the Upload workflow.

The library should therefore represent stored documents rather than
transient processing states.

Document Library Layout

The approved reference establishes the following structure:

1. Application Shell

Preserve:

STRUCTRA logo

Left navigation sidebar

Active Document Library navigation item

User/profile area

Existing premium-plan presentation

AI extraction/plan usage area where already part of the application
shell

Do not introduce a separate navigation system for the library.

2. Page Header

Show:

Small contextual label such as YOUR DOCUMENTS

Document Library

Short description explaining that receipts, invoices and extracted
data are organized here

A primary Upload Document action may be provided so the user can
quickly return to the upload workflow.

3. Library Summary

Use only summary information that is meaningful for the stored library.

Recommended summary cards:

Total Documents

Processed / Ready

Needs Review

Do not show transient processing metrics as permanent library
statistics.

In particular, do not use:

Processing

Failed

as primary library summary cards.

Processing and failed states belong to the upload/processing workflow or
error/retry experience rather than the persistent Document Library.

4. Search and Filters

Keep the filtering system intentionally simple.

Required:

Search documents by filename, vendor/company, invoice/bill number or
other stored searchable information

Document Type filter

Status filter

Sort control

Recommended status values for the persistent library:

All

Processed

Needs Review

Avoid unnecessary filter controls unless the backend actually supports
the corresponding data.

Do not include multiple overlapping filters such as:

Review

Confidence

Date Range

unless these become genuinely useful and are backed by implemented
functionality.

The UI should prioritize fast document discovery rather than exposing
every possible metadata field as a filter.

5. Document Cards

Use the card/grid presentation from DocumentLibrary-reference.png.

Each stored document card should contain only information that exists in
the actual processed document model.

Recommended card content:

Document thumbnail

Document type badge

Receipt

Invoice

Other supported type

Document filename

Vendor/company

Document date

Total amount, when extracted

Extraction/review status

Confidence indicator, when an actual confidence value is available

View/open action

More-actions menu

Do not invent values solely for visual presentation.

If a field is unavailable from extraction, omit it or show an
appropriate neutral state.

Document Status

The library should primarily represent documents that have completed
processing and are stored.

Processed

Document has been successfully extracted and saved.

Needs Review

Document has been saved but requires user attention because the
extraction/validation result requires review.

Processing

Do not normally display processing documents in the persistent library.

If processing records are temporarily persisted by the backend, they
should not be presented as normal library documents until processing is
complete.

Failed

Do not present failed extraction attempts as normal library documents.

Failed processing should remain within the Upload/processing flow or an
appropriate retry/error experience.

If the product later introduces an explicit processing-history or
failed-documents view, that can be added separately without changing the
core library.

Validation / Confidence

Confidence can be shown on document cards if the backend provides a real
extraction confidence value.

Do not fabricate confidence percentages.

The library must consume actual backend values.

Use friendly labels such as:

High

Medium

Low

only when they are derived from the application's actual confidence
logic.

Document Actions

Each document should support appropriate actions such as:

View document

Open extracted information

Edit/review

Download/export

Delete

Other actions only when supported by the backend

Do not add actions that have no corresponding implemented functionality.

Pagination

Pagination is appropriate when the number of stored documents exceeds
the amount that can comfortably be displayed on one screen.

The exact page size should be determined by the implementation.

Keep pagination visually minimal and consistent with the approved
reference.

Empty Library State

When the user has no saved documents:

Show a polished empty state using the existing STRUCTRA glass/orange
visual language.

Suggested content:

No documents yet

Upload your first receipt or invoice to start building your document library.

Primary action:

[ Upload Document ]

Do not display fake document cards or fabricated statistics.

Important Document Library Rules

DocumentLibrary-reference.png is the official visual reference for
this route.

Preserve the existing STRUCTRA dark/orange glassmorphism theme.

The library contains successfully saved documents, not transient
upload states.

Do not show Processing and Failed as normal document-library
records.

Keep filters limited to functionality that is actually useful and
implemented.

Do not invent confidence percentages, validation results, totals,
vendors or other metadata.

Document cards should use real extracted/stored document data.

Keep the library focused on finding, viewing and managing stored
documents.

The Upload Documents route remains responsible for upload,
processing, validation and duplicate-warning workflow.

The Document Library route should not duplicate the Upload workflow.

Reuse the existing application shell, components, icons and design
system wherever possible.

Maintain responsive behavior across desktop, tablet and mobile.

MainPage Asset Structure

design-assets/
└── MainPage/
    ├── Upload Section/
    │   ├── stage1-reference.png
    │   ├── stage2-reference.png
    │   ├── stage345-reference.png
    │   ├── stage6-reference.png
    │   ├── stage7-reference.png
    │   ├── stage8910-reference.png
    │   └── stage12-reference.png
    │
    └── Document Library/
        └── DocumentLibrary-reference.png

Implementation Priority

For the Upload Documents route:

Existing approved implementation --- do not redesign.

For the Document Library route:

Follow DocumentLibrary-reference.png for structure.

Reuse the established STRUCTRA dark/orange visual system.

Connect cards and metadata to actual stored documents.

Keep only meaningful library filters.

Exclude transient Processing and Failed states from the normal
library.

Ensure all actions and metadata are backed by real application
functionality.