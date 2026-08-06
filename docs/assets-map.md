# STRUCTRA — Assets Map

> This document specifies where every design asset is located and when it should be used.
>
> Before implementing any screen, always read:
>
> 1. docs/features.md
> 2. docs/design.md
> 3. docs/assets-map.md
>
> Then load the corresponding assets from the design-assets folder.

---

# Folder Structure

design-assets/

├── landing/
│
├── authentication/
│
├── MainPage/
│
└── logo/

---

# 1. Landing Page

Location

design-assets/landing/

Contains

• landing-background.webp
• landing-reference.png

Usage

landing-background.webp

Purpose

- Full-screen landing page background
- Must occupy the entire viewport
- Do not crop unnecessarily
- Do not replace
- Do not redesign
- Use as the base background image

landing-reference.png

Purpose

- Official visual reference for the Landing Page
- Replicate this design as accurately as possible
- Match spacing
- Match typography
- Match glassmorphism
- Match glow
- Match placements
- Match sizing
- Match component hierarchy

---

# 2. Login Page

Location

design-assets/authentication/

Contains

• login-background.webp
• login-reference.png

Usage

login-background.webp

Purpose

- Full-screen Login background
- Use exactly as provided
- Cover entire viewport
- Keep background centered
- Apply only a subtle dark overlay if required

login-reference.png

Purpose

- Official Login UI reference
- Replicate the design as closely as possible
- Do not redesign
- Maintain identical layout
- Maintain same spacing
- Maintain same styling

---

# 3. Registration Page

Location

design-assets/authentication/

Contains

• registration-reference.png

Usage

registration-reference.png

Purpose

- Official Registration UI reference
- Follow the Login page design language
- Replicate layout precisely
- Match typography
- Match spacing
- Match glass card
- Match buttons
- Match inputs

Note

Registration currently uses the same background philosophy as Login.

Until another background is provided, use:

login-background.webp

for both Login and Registration.

---

# 4. Main Application — Upload Documents Workspace

Location

design-assets/MainPage/Upload Section

Contains

• upload-default-reference.png
• loading-reference.png
• result-reference.png

---

## upload-default-reference.png

Purpose

This is the official reference for the Upload Documents page immediately after a user logs in.

Replicate as accurately as possible.

Includes

- Main application layout
- Left sidebar
- Global search bar
- Welcome section
- Upload Documents selected by default
- Drag & Drop upload card
- Browse Files button
- Supported formats
- How It Works section
- Recent Uploads empty state
- Floating AI Assistant button
- Background blur
- Glassmorphism
- Premium Structra theme

This establishes the shared layout for the entire application.

---

## loading-reference.png

Purpose

Official reference for the document processing experience.

Replicate the loading workflow closely.

Includes

- Upload progress
- Processing progress
- Reading Document
- Extracting Information
- Verifying Information
- Progress percentages
- Animated progress states
- Human-friendly status messages
- Rotating helpful tips
- Sidebar
- Search bar
- Premium loading cards
- Background blur

The purpose is to make waiting feel informative and polished.

---

## result-reference.png

Purpose

Official reference for the Upload Review Workspace displayed after AI extraction completes.

Replicate the layout and visual hierarchy as accurately as possible.

Includes

- Processing Summary
- AI Summary
- Document Information
- Two-column review workspace
- Original document preview
- Duplicate warning
- Review Queue
- Vendor Information
- Invoice Details
- Financial Details
- Line Items table
- Confidence indicators
- Inline validation
- Sticky bottom action bar
- Save to Document Library
- Export
- Upload Another
- Discard
- Premium glassmorphism
- Structra color palette
- Floating AI Assistant
- Production-grade SaaS styling

This screen represents the core workflow of Structra.

---

# 5. Logo

Location

design-assets/logo/

Contains

• structra-logo.png

Usage

Use this logo throughout the application.

Examples

- Landing Page
- Authentication
- Main Application
- Sidebar
- AI Assistant Button
- Loading Screens
- Dashboard
- Document Library
- Settings
- Profile

Rules

- Never redraw the logo
- Never change proportions
- Never recolor
- Never recreate using SVG manually
- Use exactly as provided

---

# Implementation Order

Always implement pages in the following order.

1.

Landing Page

References

design-assets/landing/

↓

2.

Login Page

References

design-assets/authentication/

↓

3.

Registration Page

References

design-assets/authentication/

↓

4.

Forgot Password

References

design-assets/authentication/

↓

5.

Main Application Layout

Reference

design-assets/MainPage_UploadSection/upload-default-reference.png

↓

6.

Upload Processing Experience

Reference

design-assets/MainPage_UploadSection/loading-reference.png

↓

7.

Upload Review Workspace

Reference

design-assets/MainPage_UploadSection/result-reference.png

↓

8.

Document Library

(Assets will be added later)

↓

9.

Dashboard

(Assets will be added later)

↓

10.

Settings

(Assets will be added later)

↓

11.

Profile

(Assets will be added later)

---

# Asset Usage Rules

Always use the provided design assets.

Never generate replacement assets.

Never redesign approved layouts.

Treat every reference image as the final approved UI.

If multiple assets exist for a page:

1. Use the provided background image (if available).

2. Use the reference image for layout, spacing, typography, hierarchy, and positioning.

3. Use the official Structra logo from the logo folder.

4. Preserve the premium Structra design language across every screen.

---

# Future Assets

Future folders may include:

design-assets/

dashboard/

document-library/

settings/

profile/

notifications/

analytics/

chat/

Whenever new assets are added, update this document before implementation begins.