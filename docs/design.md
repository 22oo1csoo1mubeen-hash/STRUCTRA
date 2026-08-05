# STRUCTRA — Design System & UI Guidelines

> This document defines the visual identity, layout, interaction philosophy, and implementation rules for the entire STRUCTRA application.

---

# 1. Design Philosophy

STRUCTRA should feel like a premium futuristic SaaS application.

The interface should communicate:

- Intelligence
- Simplicity
- Precision
- Trust
- Premium quality

The design language should resemble products like:

- Apple
- Linear
- Arc Browser
- Framer
- Vercel
- Raycast

The UI should never feel crowded.

Every element must have breathing space.

Whitespace is part of the design.

---

# 2. Overall Theme

Dark Minimalism

Glassmorphism

Soft Ambient Lighting

Subtle Orange Accent

Premium Typography

Very Smooth Animations

No flashy colors.

No unnecessary gradients.

No colorful buttons.

The UI should feel calm.

---

# 3. Color Palette

Background

Almost Black

Very Dark Gray

Deep Space Blue

Accent

Soft Warm Orange

Used ONLY for

• Primary buttons

• Highlights

• Hover states

• Active elements

Text

Primary

White

Secondary

Light Gray

Muted

Medium Gray

Borders

Very subtle transparent white.

Never use thick borders.

---

# 4. Background Style

The background is one of the application's primary visual identities.

Each page has its own dedicated high-resolution WebP background.

Backgrounds must never be replaced.

Always use the provided assets.

Requirements

• Full screen

• Cover entire viewport

• No repetition

• No visible stretching

• Center aligned

Apply a subtle dark overlay to improve readability.

Do not blur the original image.

Future versions will animate the background.

Version 1 keeps it static.

---

# 5. Glassmorphism

Glass elements are used throughout the application.

Examples

Navigation

Cards

Authentication

Feature Panels

Properties

Dark translucent background

Subtle backdrop blur

Thin transparent border

Very soft shadow

Rounded corners

Avoid excessive opacity.

The background should remain visible through the glass.

---

# 6. Layout

Desktop First

Everything centered.

Maximum content width should remain visually balanced.

No large empty spaces.

No unnecessary scrolling.

Landing page occupies exactly one viewport.

Authentication pages also occupy exactly one viewport.

---

# 7. Typography

Modern

Minimal

Premium

Readable

Large Hero Heading

Wide letter spacing

Clean font rendering

Consistent hierarchy

Text Alignment

Landing

Centered

Authentication

Left aligned inside the card

Avoid decorative fonts.

---

# 8. Navigation

Minimal.

Landing page

Top Left

Circular Menu Button

Top Right

Glass Button

About Structra

External Link Icon

Navigation should never dominate the screen.

---

# 9. Buttons

Primary Buttons

Rounded pill shape.

Soft orange glow.

Thin border.

Premium hover animation.

Hover

Slight glow increase

Very small scale animation

Smooth transition

Click

Tiny press animation

Fast recovery

Never use harsh shadows.

---

# 10. Icons

Outline style.

Minimal.

Consistent stroke width.

Use Lucide React icons.

Do not mix icon styles.

---

# 11. Landing Page

Contains

Top Navigation

Hero Logo

STRUCTRA Title

Subtitle

Primary CTA

Bottom Feature Panel

Everything is vertically centered.

The hero section is the visual focus.

Nothing should distract from it.

Bottom feature cards remain subtle.

---

# 12. Authentication Pages

Login

Register

Same background philosophy.

Same navigation.

Glass authentication card.

Card centered.

Card remains the visual focus.

Use identical spacing between inputs.

Buttons match landing page.

Google button follows same design language.

---

# 13. Inputs

Rounded corners.

Dark background.

Thin border.

Large padding.

Placeholder

Muted Gray

Focus

Orange border

Soft glow

Validation

Red only when necessary.

---

# 14. Animations

Animations should feel expensive.

Never playful.

Never exaggerated.

Entrance

Fade

Small translate

Small scale

Duration

500–800ms

Ease

easeOut

Hover

200ms

Buttons

Glow increase

Tiny scale

Cards

Tiny lift

No bouncing animations.

No elastic animations.

No exaggerated rotations.

---

# 15. Motion Philosophy

Every animation should have a purpose.

Motion guides attention.

Motion should never distract.

Future versions will include

• Living backgrounds

• Floating particles

• Atmospheric movement

• Premium page transitions

Version 1 implements only subtle UI animations.

---

# 16. Responsiveness

Desktop implementation first.

Keep component structure responsive.

Mobile optimization will be implemented later.

Do not sacrifice desktop quality.

---

# 17. Component Philosophy

Every UI section should become an independent React component.

Avoid one large page.

Create reusable components.

Examples

Navbar

Hero

Button

GlassCard

FeatureCard

AuthenticationCard

Logo

Footer

Maintain clean folder organization.

---

# 18. Design Rules

DO

✓ Use provided assets

✓ Match reference images exactly

✓ Maintain spacing consistency

✓ Use subtle shadows

✓ Use premium animations

✓ Keep hierarchy clear

✓ Keep interface uncluttered

DON'T

✗ Redesign components

✗ Introduce new colors

✗ Add unnecessary gradients

✗ Add random icons

✗ Increase visual noise

✗ Use thick borders

✗ Use heavy shadows

✗ Add features not present in the reference

---

# 19. Implementation Rule

Before implementing any page:

1. Read docs/features.md

2. Read this design.md

3. Read the corresponding assets inside design-assets/

Only then begin implementation.

Every page must follow this design system exactly.

Consistency across the entire application is mandatory.

---

# 20. Future Design Roadmap

Version 1

✓ Pixel-perfect UI

✓ Glassmorphism

✓ Landing

✓ Login

✓ Register

Version 2

✓ Live Backgrounds

✓ Atmospheric Effects

✓ Premium Transition System

Version 3

✓ Dashboard

✓ Document Workspace

✓ AI Chat

✓ OCR Interface

✓ Analytics

Every future screen must inherit this design system.