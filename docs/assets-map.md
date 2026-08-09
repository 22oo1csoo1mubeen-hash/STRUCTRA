# 4. Main Application — Upload Documents Workspace

Location

design-assets/MainPage/Upload Section/

The Upload Documents workspace is implemented as a sequence of UI states.

The following reference images are the official approved references for each
state/group of states.

IMPORTANT:

Do NOT redesign these approved states.

Use the references to reproduce:

- Layout
- Glassmorphism
- Background
- Typography
- Spacing
- Borders
- Glow effects
- Cards
- Buttons
- Icons
- Visual hierarchy
- Animations where applicable

All states belong to the same Upload Documents route.

The page should transform between states rather than navigating to separate
pages.

---

## stage1-reference.png

Purpose

Official reference for STAGE 1 — Empty / Ready to Upload.

This is the default Upload Documents state immediately after entering the
application.

Includes:

- Main application layout
- Left sidebar
- Global search bar
- User/profile area
- Upload Documents selected
- Large glass upload card
- Drag & Drop area
- Browse Files button
- Supported formats
- How It Works section
- Recently Processed section
- Floating AI Assistant button
- STRUCTRA background
- Premium glassmorphism

This stage is already implemented.

DO NOT redesign or replace this stage.

Use it as the foundation for all subsequent Upload-page states.

---

## stage2-reference.png

Purpose

Official reference for STAGE 2 — File Selected / Ready to Process.

Displayed after the user selects or drops a document.

The main upload glass card expands/transforms while the existing application
shell remains unchanged.

Includes:

- Selected document preview/icon
- Filename
- File type
- File size
- File-ready indication
- Process Document action
- Remove/change file action
- Expanded glass upload workspace
- STRUCTRA visual language

The How It Works and Recently Processed sections are no longer shown in this
state.

Do not start AI processing automatically at this stage.

---

## stage345-reference.png

Purpose

Official reference for STAGES 3, 4 and 5.

This reference represents the animated document-processing workflow.

The same expanded glass card is maintained throughout the processing flow.

STAGE 3 — Uploading

Show:

- Selected document
- Upload progress
- Progress percentage
- Upload status
- Smooth progress animation

Example:

Uploading document...

Receipt.png

78%

Securely uploading your document...

STAGE 4 — AI Processing

Show:

- STRUCTRA AI processing animation
- Reading Document
- Extracting Information
- Processing indicators
- Human-friendly status message
- Premium animated visual treatment

Example:

AI PROCESSING

✓ Document uploaded
◉ Reading document
◉ Extracting information
○ Validating results

STAGE 5 — Validation

Show:

- Extraction completed
- Information validation
- Mathematical checking
- Duplicate checking
- Smooth transition between validation steps

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

The How It Works and Recently Processed sections remain hidden during these
states.

---

## stage6-reference.png

Purpose

Official reference for STAGE 6 — Processing Complete.

This is a short transition state between processing and the extraction
result.

Show:

- Success/check animation
- Document Ready
- Preparing your results...

Example:

✓

Document Ready

Preparing your results...

This state should transition quickly into STAGE 7.

Do not keep the user on this state unnecessarily.

---

## stage7-reference.png

Purpose

Official reference for STAGE 7 — Extraction Result.

This becomes the primary Upload Review workspace after successful AI
extraction.

The How It Works and Recently Processed sections are removed.

The main glass workspace expands into the document-review layout.

Layout:

LEFT:

- Original uploaded document preview
- Image/PDF preview
- Preview controls where appropriate

RIGHT:

- Extracted information
- Vendor/company
- Address
- Date
- Total
- Line items
- Processing status

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

STAGE 7 represents the extracted result.

Validation information is added to this result workspace in STAGE 8.

Do NOT treat STAGE 7, STAGE 8 and STAGE 9 as completely separate pages.

They progressively enhance the same review workspace.

---

## stage8910-reference.png

Purpose

Official reference for STAGES 8, 9 and 10.

These states belong to the same document-review workspace.

---

### STAGE 8 — Validation Results

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

---

### STAGE 9 — Review / Edit

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

- Clear editable controls
- Premium document-review experience
- Avoid making the entire workspace look like a generic form
- Make modified values visually clear

Primary actions eventually include:

- Save to Library
- Download / Export
- Delete / Discard
- Process Another

---

### STAGE 10 — Duplicate Warning

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

---

## stage11-reference.png

Purpose

Official reference for STAGE 11 — Saved.

Displayed after the user successfully saves the processed document to the
Document Library.

Show:

- Success animation
- Saved confirmation
- Document summary
- Vendor
- Total
- Saved status
- View Document action
- Process Another action

Example:

✓

Saved to your Document Library!

ABC MART

₹1,365

[ View Document ]
[ Process Another ]

Use a short, polished success transition.

---

## stage12-reference.png

Purpose

Official reference for STAGE 12 — Process Another / Reset.

This state returns the user to the Upload Documents starting experience.

After selecting:

[ Process Another ]

the Upload workspace should reset to STAGE 1.

The user should be able to immediately upload another document.

Do NOT require a page refresh.

The application shell remains unchanged.

---

# Upload Page State Flow

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