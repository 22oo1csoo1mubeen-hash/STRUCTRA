# Main Application — AI Assistant Workspace

## Location

design-assets/Main Page/AI Assistant/

## Official UI References

### assistant-reference.png

Purpose:

Official reference for the primary AI Assistant UI.

This reference defines the approved visual design for the STRUCTRA AI Assistant
workspace.

Use it to reproduce:

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
- Input area
- Header / greeting area
- Suggested prompt cards
- Empty conversation state
- Floating AI Assistant button
- Animations where applicable

The AI Assistant must preserve the established STRUCTRA application shell:

- Left sidebar
- Global search / top navigation
- User / profile area
- STRUCTRA background
- Dark premium visual language
- Warm orange / amber accent
- Glassmorphism
- Existing typography and spacing system

IMPORTANT:

Do NOT redesign the existing application shell or left sidebar.

The AI Assistant page should feel like a native part of the existing STRUCTRA
application rather than a separate product.

---

### assistant-stages-reference.png

Purpose:

Official reference for the AI Assistant interaction states.

This reference defines the visual progression of the Assistant workspace when
the user interacts with STRUCTRA.

The Assistant should transform between states within the same workspace rather
than navigating to separate pages.

## AI Assistant Identity

The Assistant is named:

**STRUCTRA**

The top greeting should introduce the assistant clearly.

Example:

**Hi, I am STRUCTRA.**

Supporting text may communicate that STRUCTRA can help with:

- documents
- receipts
- invoices
- spending
- vendors
- purchases
- document-library insights

Use concise, friendly wording consistent with the approved reference.

---

# AI Assistant States

## STATE 1 — Initial / No Question

Purpose:

Default state immediately after opening the AI Assistant.

Show:

- STRUCTRA greeting
- Short assistant description
- Suggested prompt cards
- Natural-language usage tip
- Large conversation workspace
- Empty conversation state
- Assistant input field
- Attachment control where supported
- Send button
- Privacy / data usage note where applicable
- Floating AI Assistant button

Example:

**Hi, I am STRUCTRA.**

Your AI assistant for documents, receipts, invoices and insights.

The suggested prompts should help users discover useful capabilities without
overwhelming the interface.

Examples:

- Spending trends
- Top vendors
- Recent receipts
- Expensive purchases

---

## STATE 2 — Question Entered

Displayed after the user submits a question.

The conversation workspace becomes the primary focus.

IMPORTANT:

Once the user has submitted a question:

- Remove the top suggestion cards.
- Keep the STRUCTRA greeting.
- Keep the small assistant guidance / tooltip text where appropriate.
- Expand the conversation area vertically.
- Preserve the same overall glassmorphism and page structure.
- Do not navigate away from the AI Assistant route.

The user's question should appear as a clearly distinguished user message.

Example:

> Explore the document library. Check how many items I have bought in
> DMart from the latest DMart receipt.

The input remains available for follow-up questions.

---

## STATE 3 — AI Processing / Loading

Purpose:

Show that STRUCTRA is actively analysing the user's persisted document
information.

Show:

- User's submitted question
- STRUCTRA processing indicator
- Smooth animated assistant state
- Friendly progress / thinking message
- Conversation input remains available where appropriate

Example:

**Let me explore your Document Library...**

Analysing the latest DMart receipt...

Use subtle premium animation.

Do NOT use a long artificial delay.

The loading state should disappear immediately when the backend response is
available.

---

## STATE 4 — Result Displayed

Purpose:

Present the answer returned by STRUCTRA.

The response should appear as a polished assistant message/card within the
same conversation workspace.

The result should:

- Clearly answer the user's question
- Use accurate values from the user's persisted Document Library
- Reference the relevant document when appropriate
- Present structured information cleanly
- Remain readable without turning the page into a generic data table

Example:

**Here's what I found in your latest DMart receipt.**

**18 items purchased**

- Total amount: ₹1,425.60
- Receipt date: 16 Aug 2026
- Vendor: DMart

Additional actions may be available when appropriate, such as opening the
source document through the existing Document Library detail experience.

Do NOT invent values.

The Assistant must use actual backend / persisted document data.

---

# Conversation Behaviour

The AI Assistant is session-based.

The conversation should persist while the current browser session remains open.

Important:

- Closing and reopening a browser session should start a fresh Assistant
  conversation.
- Closing and reopening a tab should NOT clear the current session.
- Do NOT add a visible chat-history / previous-conversations sidebar.
- Do NOT introduce persistent conversation history UI.
- The Assistant should remain focused on the current session.

The session behaviour must not change the application's persistent Document
Library data.

---

# Data & Functionality Rules

STRUCTRA should answer questions using actual application data and existing
backend capabilities.

The Assistant may retrieve information such as:

- saved documents
- vendors
- spending
- purchased items
- receipt details
- invoice details
- confidence / quality
- review status
- recent documents

The Assistant must NOT fabricate:

- totals
- item quantities
- vendor names
- document dates
- confidence values
- review status
- document existence

Whenever a question depends on a specific saved document, use the existing
Document Library / document-detail capabilities where appropriate.

Do not create a second document-detail implementation for the Assistant.

---

# Visual / Interaction Requirements

Preserve the established STRUCTRA visual language:

- Deep dark background
- Warm orange / amber highlights
- Premium glassmorphism
- Subtle borders
- Ambient glow
- Strong typography hierarchy
- Smooth transitions
- Clean spacing
- Responsive layout

The Assistant should feel:

- intelligent
- premium
- calm
- fast
- trustworthy

Avoid:

- excessive neon
- unnecessary gradients
- distracting animation
- generic chatbot styling
- unnecessary panels
- visible conversation-history navigation

---

# MainPage Asset Structure

```text
design-assets/
└── Main Page/
    └── AI Assistant/
        ├── assistant-reference.png
        └── assistant-stages-reference.png