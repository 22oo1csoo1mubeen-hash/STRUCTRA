# STRUCTRA — Motion, Animation & Interaction Guidelines

> This document defines every animation, transition, hover effect, glow, shadow, and interaction used throughout the STRUCTRA application.
>
> Every page, component, button, icon, card, modal, input, navigation item, and future feature must follow this motion system.
>
> Motion is part of the product identity.
>
> Never implement animations outside these guidelines.

---

# 1. Motion Philosophy

STRUCTRA should feel

• Premium

• Elegant

• Calm

• Expensive

• Intelligent

Motion should guide attention.

Motion should never distract.

Animations must feel natural.

Nothing should feel sudden.

Nothing should feel mechanical.

Everything should feel polished.

---

# 2. Animation Principles

Every interactive element should provide feedback.

If the user can interact with something...

It should respond.

Never leave interactive elements static.

Examples

✓ Buttons

✓ Icons

✓ Cards

✓ Navigation

✓ Links

✓ Inputs

✓ Checkboxes

✓ Upload Areas

✓ Tables

✓ Search

✓ Sidebar

✓ Dashboard Widgets

Everything interactive should animate.

---

# 3. Timing

Fast

150–200ms

Hover Effects

Medium

250–350ms

Component Hover

Large

500–800ms

Page Entrance

Very Large

800–1200ms

Hero Animations

Never use instant transitions.

Never use long delays.

---

# 4. Easing

Preferred

easeOut

easeInOut

Never use

linear

unless specifically required.

Movement should accelerate naturally.

---

# 5. Hover Effects

Every hoverable element must respond.

Response may include

• Slight Scale

• Glow Increase

• Shadow Increase

• Border Brightness

• Opacity Change

• Background Shift

Use combinations.

Avoid dramatic movement.

---

# 6. Buttons

Every button should animate.

Hover

• Scale 1.03

• Glow slightly increases

• Shadow becomes softer

• Border brightness increases

• Cursor immediately changes

Click

• Scale 0.98

• Glow briefly reduces

• Returns smoothly

Never use abrupt changes.

---

# 7. Icons

Every clickable icon should animate.

Hover

• Scale 1.08

• Slight rotation (if appropriate)

• Glow increases

• Opacity becomes 100%

Click

Small press animation.

Never over-rotate.

Never bounce.

---

# 8. Navigation

Navigation buttons

Hover

• Glow

• Slight lift

• Border highlight

Current page

Always visually active.

---

# 9. Cards

Cards should feel alive.

Hover

• Lift slightly

• Increase shadow

• Border glow

• Glass reflection slightly brighter

Never move more than a few pixels.

---

# 10. Glass Effects

Glass elements should react subtly.

Hover

• Slight opacity increase

• Slight blur increase

• Border glow

No dramatic transparency changes.

---

# 11. Shadows

Shadows should never be harsh.

Use

Soft

Large

Natural

Hover

Increase shadow smoothly.

Leaving hover

Return smoothly.

---

# 12. Glow

Glow is part of Structra's identity.

Glow color

Soft Warm Orange

Glow should be subtle.

Never oversaturated.

Hover

Increase glow.

Focus

Increase glow slightly more.

Idle

Very soft glow.

---

# 13. Typography

Headings

Small fade-in

Tiny upward movement

Buttons

Text should never jump.

Labels

Smooth opacity transitions.

---

# 14. Inputs

Hover

Border slightly brighter.

Focus

Orange glow.

Border highlight.

Placeholder fades smoothly.

Validation

Red border appears smoothly.

Never flash.

---

# 15. Checkboxes

Hover

Glow

Click

Smooth check animation.

Never appear instantly.

---

# 16. Links

Hover

Underline grows smoothly.

Color shifts slightly toward accent.

Never use instant underline.

---

# 17. Feature Cards

Landing page cards

Hover

Lift

Glow

Border brightness

Icon animation

Tiny scale

---

# 18. Images

Images should never abruptly appear.

Fade in.

Large images

Small scale animation.

---

# 19. Modals

Open

Fade

Scale

Blur

Close

Reverse.

Never instantly appear.

---

# 20. Notifications

Slide

Fade

Disappear smoothly.

Never abruptly vanish.

---

# 21. Tooltips

Fade

Small upward movement.

Soft shadow.

---

# 22. Dropdowns

Open

Fade

Scale

Close

Reverse.

---

# 23. Tables

Rows

Hover highlight.

Selection

Soft glow.

Sorting

Smooth arrow rotation.

---

# 24. Dashboard Widgets

Hover

Lift

Glow

Shadow

Charts

Animate values.

Never instantly update.

---

# 25. Upload Area

Hover

Border glow.

Background brighten.

Drop

Pulse animation.

Processing

Progress animation.

---

# 26. Search

Focus

Glow.

Results

Fade in.

---

# 27. AI Chat

Messages

Fade.

Slide upward.

Thinking animation

Three animated dots.

Never flashing.

---

# 28. Loading

Never use plain spinner.

Use

Soft pulse

Skeleton loading

Progress shimmer

Whenever possible.

---

# 29. Page Entrance

Every page

Fade in.

Small upward movement.

Duration

600–800ms.

Never instantly appear.

---

# 30. Page Exit

Fade.

Small blur.

Small scale.

Smooth transition.

---

# 31. Page Transitions

Between pages

No white flash.

No sudden navigation.

Future implementation

Landing → Login

Login → Register

Dashboard Pages

Must all use premium cinematic transitions.

---

# 32. Scroll Animations

Fade

Translate

Scale

Only once.

Avoid repetitive animations.

---

# 33. Background Motion

Version 1

Static.

Future

Cloud movement.

Particles.

Atmosphere.

Grass.

Lighting.

Planet breathing.

These animations must remain subtle.

---

# 34. Performance Rules

Animations must remain smooth.

Target

60 FPS.

Avoid heavy re-renders.

Prefer

transform

opacity

Avoid animating

width

height

top

left

whenever possible.

---

# 35. Accessibility

Respect reduced-motion preferences.

Animations should degrade gracefully.

Nothing should become unusable.

---

# 36. Motion Consistency

Every page should feel like it belongs to the same application.

Buttons should always animate the same way.

Cards should always animate the same way.

Icons should always animate the same way.

Never invent new interaction styles for different pages.

Consistency is mandatory.

---

# 37. Future Motion Roadmap

Phase 1

✓ Landing

✓ Login

✓ Register

Standard premium animations.

Phase 2

✓ Live Background

✓ Cinematic Transition

✓ Glass Reveal

✓ Tile Reveal

✓ Floating Particles

Phase 3

✓ Dashboard Motion

✓ Upload Animations

✓ AI Chat Motion

✓ Analytics Motion

Future features must inherit this motion system.

---

# 38. Final Rule

Whenever a new UI component is created, ask:

"Should this react when the user hovers, focuses, clicks, scrolls, loads, or leaves?"

If the answer is YES...

It must animate.

No interactive element in STRUCTRA should ever feel lifeless.