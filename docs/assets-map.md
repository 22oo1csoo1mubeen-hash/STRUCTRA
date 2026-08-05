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

# 4. Logo

Location

design-assets/logo/

Contains

• structra-logo.png

Usage

Use this logo throughout the application.

Examples

Landing Page

Authentication

Dashboard

Navbar

Sidebar

Splash Screen

Loading Screen

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

Landing → Login Transition

(No assets required)

↓

5.

Live Background Effects

(No additional assets required)

↓

6.

Dashboard

(Assets will be added later)

---

# Asset Usage Rules

Always use the provided design assets.

Never generate replacement assets.

Never redesign components.

Treat every reference image as the approved final UI.

If multiple assets exist for a page:

1. Use the background image as the base.

2. Use the reference image for layout, spacing, sizing, typography, and component positioning.

3. Use the logo from the logo folder.

---

# Future Assets

Future folders may include:

design-assets/

dashboard/

upload/

chat/

documents/

analytics/

settings/

Whenever new assets are added, update this document before implementation begins.