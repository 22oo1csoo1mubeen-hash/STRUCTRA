# STRUCTRA — Development Instructions

> This document defines the permanent development rules for STRUCTRA.
>
> Every future implementation, modification, optimization, bug fix, refactor, or feature addition MUST follow these instructions.
>
> These rules remain valid until the project is completed.
>
> Never ignore them.

---

# 1. Read Documentation First

Before writing or modifying any code, ALWAYS read every document inside the docs folder.

Read in this order:

1. instructions.md
2. design.md
3. motion.md
4. assets-map.md
5. features.md

Never skip this step.

---

# 2. Do Not Assume

If something is not explicitly specified...

Do NOT invent it.

Do NOT guess.

Do NOT redesign it.

Ask for clarification instead.

---

# 3. Pixel Perfect Implementation

When implementing from reference images,

Match them as accurately as possible.

Typography

Spacing

Alignment

Sizing

Glow

Blur

Glass

Padding

Margins

Radius

Hierarchy

Everything should closely resemble the provided design.

---

# 4. Never Change Existing UI

If a page has already been approved,

Never redesign it.

Never improve it.

Never modernize it.

Never replace components.

Only change what is explicitly requested.

---

# 5. Use Existing Assets

Always use assets available inside

design-assets/

Never replace them.

Never generate placeholders.

Never download random assets.

Never use stock images.

---

# 6. Preserve Theme

The STRUCTRA visual identity must remain consistent.

Dark.

Premium.

Elegant.

Minimal.

Glass.

Soft orange glow.

Subtle lighting.

Never introduce random colors.

---

# 7. Keep Code Clean

Code must be

Readable

Modular

Reusable

Simple

Maintainable

Avoid unnecessary complexity.

---

# 8. No Dead Code

Do not leave

Unused Components

Unused Imports

Unused Variables

Unused CSS

Unused Functions

Everything committed should be useful.

---

# 9. Reuse Components

If a component already exists,

Reuse it.

Do not duplicate code.

---

# 10. Follow Folder Structure

Respect the project structure.

Do not create unnecessary folders.

Do not create unnecessary files.

Only introduce new files when genuinely required.

---

# 11. Keep Components Small

One component should do one job.

Avoid huge files.

Split components logically when required.

---

# 12. Naming Rules

Use meaningful names.

Good

LandingPage.jsx

LoginPage.jsx

PrimaryButton.jsx

GlassCard.jsx

Bad

Component1.jsx

Temp.jsx

NewPage.jsx

abc.jsx

---

# 13. Styling Rules

Prefer Tailwind utilities.

Avoid unnecessary custom CSS.

Create reusable utility classes only when repeated often.

Never use inline styles unless unavoidable.

---

# 14. Responsive Design

Every page must work properly on

Desktop

Laptop

Tablet

Mobile

Never implement desktop-only layouts.

---

# 15. Performance

Keep rendering efficient.

Avoid unnecessary re-renders.

Lazy load heavy assets when appropriate.

Optimize images.

Prefer WebP.

---

# 16. Accessibility

Buttons

Inputs

Links

Icons

Forms

Images

should include proper accessibility support where applicable.

---

# 17. Animations

Follow motion.md.

Never invent new animation styles.

Every animation should feel consistent across the application.

---

# 18. No Magic Numbers

Avoid arbitrary spacing.

Maintain consistent spacing system.

Use design consistency.

---

# 19. Error Handling

Forms

Uploads

Authentication

API Calls

must handle errors gracefully.

Never silently fail.

---

# 20. Authentication

Never expose secrets.

Never hardcode credentials.

Always use environment variables.

---

# 21. Security

Assume every API call is protected.

Never expose user information.

Never bypass authentication.

Never leak another user's data.

---

# 22. Features

Implement only requested features.

Do not secretly add extra functionality.

---

# 23. Dependencies

Never install a library unless necessary.

Prefer existing React ecosystem.

Avoid dependency bloat.

---

# 24. Keep Git Clean

Avoid unnecessary generated files.

Respect .gitignore.

---

# 25. Comments

Write comments only where logic is not obvious.

Avoid commenting every line.

Code should explain itself.

---

# 26. Do Not Break Existing Features

Before modifying code,

Ensure previous functionality remains intact.

Regression should never be introduced.

---

# 27. Complete One Task at a Time

Never begin implementing multiple large features simultaneously.

Finish one page.

Verify it.

Then continue.

---

# 28. No Placeholder Content

Do not use

Lorem Ipsum

Dummy Images

Random Text

Placeholder Icons

unless explicitly requested.

---

# 29. Keep Assets Organized

Images

Icons

Backgrounds

Logos

must remain inside their designated folders.

Never scatter assets across the project.

---

# 30. Maintain Consistency

Buttons should look identical across pages.

Inputs should behave identically.

Cards should follow one design language.

Icons should maintain the same visual weight.

Spacing should remain consistent.

---

# 31. Do Not Modify Documentation

Never rewrite

features.md

design.md

motion.md

assets-map.md

instructions.md

unless explicitly instructed.

---

# 32. Explain Major Decisions

If introducing

New Folder

New Component

New Library

New Architecture

briefly explain why.

---

# 33. Avoid Overengineering

Prefer simple solutions.

Do not implement enterprise-level complexity for small features.

---

# 34. Keep Future Scalability

Write code that can easily support future features without major rewrites.

---

# 35. Testing

After completing any implementation,

Verify

No console errors

No layout breaking

Responsive behavior

No missing assets

No broken imports

No warnings

---

# 36. Build Success

Every completed task should compile successfully.

Never leave broken builds.

---

# 37. Before Completing Any Task

Confirm

✓ Design matches references

✓ Motion follows motion.md

✓ Assets follow assets-map.md

✓ Features follow features.md

✓ Instructions remain respected

---

# 38. Communication

If something is impossible,

Clearly explain why.

If there is a better technical approach,

Suggest it before implementing.

Never silently change requirements.

---

# 39. Final Principle

STRUCTRA is a premium production-quality application.

Every implementation should feel intentional.

Every pixel should have a purpose.

Every animation should have a reason.

Every line of code should contribute to the product.

Quality is always more important than speed.