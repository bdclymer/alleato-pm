# The Design Standard: Linear

All UI in this app is inspired by Linear (linear.app). Before building or modifying any UI,
internalize what makes Linear feel the way it does:

Linear is not a style. It is a set of decisions made with discipline.

- It uses almost no color. The entire interface is built on whites, grays, and one muted accent.
- It never shouts. Important things are communicated through hierarchy, not size or color.
- It is extremely precise. Every element sits exactly where it should. Nothing floats. Nothing is arbitrary.
- It respects the user's attention. Labels are quieter than their values. Structure is felt, not seen.
- It looks like it was built by engineers with taste — not by someone applying a component library.

When in doubt about any design decision, ask: "Does this feel like Linear, or does it feel like
a Google Doc / Notion page / Bootstrap form?" If it feels like the latter, change it.

---

## How to Think About Visual Hierarchy

Every piece of content on a page has a role. Before placing anything, decide:

**Is this a label, a value, or a heading?**

- **Labels** tell the user what a thing is. They should be the quietest elements on the page —
  smaller, lighter, more muted. The user already knows what they are; labels are just reminders.
- **Values** are what the user actually cares about. They should be readable and clear, but not
  loud. Plain, legible text at normal reading size.
- **Headings** (section markers) organize the page. In this app they are understated — small,
  uppercase, letter-spaced, gray. They should feel like whispers, not shouts.

A common mistake: making section headings the same visual weight as body text. This destroys
hierarchy. A section heading should look clearly different from the content it introduces —
smaller, more muted, and with more breathing room above it than below it.

---

## The Most Important Layout Rule

This app uses a **two-column layout: main content on the left, sidebar on the right.**

The sidebar is always visible on desktop. It is never removed, never collapsed into the main
content, never hidden behind a toggle. It contains structured metadata in collapsible sections.

The main content area is a vertical flow of named sections. Each section has a small label above
it and content below it.

**Never** convert the two-column layout into a single column of flowing text. That is a
regression, not a fix.

---

## How to Think About Each UI Component

### The Page Header
The page title is the largest, heaviest text on the page. Above it sits a small icon indicating
the document type. Below it sits a row of status chips — not a label/value table, not a
paragraph, but a compact horizontal row of small interactive indicators.

The metadata row (status, priority, type, requester) uses small chips or pill-shaped elements.
Each one has a tiny icon or colored dot paired with short text. They sit on one line. They are
not a form. They are not a table. They do not have large labels next to them.

### The Readiness Block
This is a **card** — a visually distinct container set apart from the rest of the page. It must
always look like a callout or alert, not like inline paragraph text. It communicates a warning
state, so it should have a visual treatment that signals "pay attention here" — a left accent
border, a subtle warm background tint, or similar. Its internal content (missing items,
recommended actions) should have clear internal structure within the card.

**Never** render the Readiness Block as plain bold text followed by paragraph text. It must
always be a discrete container.

### Section Labels
Section labels (STAKEHOLDER SUMMARY, ACCEPTANCE CRITERIA, etc.) are navigational markers, not
headings in the typographic sense. They should be the smallest text on the page — all-caps,
extra letter-spacing, muted gray, with generous space above them and tight space below them.
They introduce content; they do not compete with it.

### The Original Request
This is user-submitted text. It should be visually distinguished from authored/generated content
— use a blockquote treatment: left border accent, slight indent, muted text color, or italic
weight. It must never look like it was written by the system.

### Two-Column Grids
Sections like Acceptance Criteria / Verification Steps and Open Questions / Assumptions are
**intentionally parallel**. They live side by side in a two-column grid because they are related
and the user benefits from seeing them together. This layout must be preserved. Collapsing them
into a single column destroys their meaning and doubles the scroll distance.

### The Sidebar
The sidebar contains collapsible sections (Properties, Scope, Readiness, Linear). Each section
has a small header that can be toggled. Inside each section, properties are displayed as
two-column rows: the label on the left (quiet, gray, fixed width), the value on the right
(readable, dark). Status values use a small colored dot paired with text — never a colored badge,
never colored text alone.

The sidebar should feel like a properties panel in a design tool — clean, structured, dense but
not crowded.

### The Activity Log
Activity entries are a chronological list. Each entry has an icon or avatar on the left, a title
and subtitle stacked in the middle, and a timestamp on the right. Entries are separated by subtle
dividers, not whitespace alone. Different event types (AI action, system event, user action)
should be visually distinguishable, ideally through icon treatment.

---

## Decision Framework: When You Are Asked to Fix a Design

Before making any changes, go through this checklist:

1. **What is actually broken?** Name the specific problem. "The section headers have the same
   visual weight as body text" is a real problem. "It doesn't look good" is not actionable.

2. **Does fixing it require removing structure?** If yes, stop. Removing structure is almost
   never the right fix. Add clarity, not less content.

3. **Am I solving the problem or just making it simpler?** Stripping a card down to plain text
   is not a fix. It is avoidance. The card exists for a reason — find a way to make it work
   correctly.

4. **Does the result look like Linear or like a Google Doc?** If it looks like a document,
   you have not fixed the design — you have replaced it with something worse.

5. **Have I preserved all structural elements?** Check: two-column grids still two columns?
   Sidebar still present? Readiness Block still a card? Section labels still small and muted?
   Original Request still distinguished from generated content?

---

## What Never to Do

These are irreversible regressions. Do not do them under any circumstances.

- **Do not remove the Readiness Block card** and replace it with inline bold text.
- **Do not make section headers the same size and weight as body text.** Section labels must
  always be clearly smaller and more muted than the content they precede.
- **Do not collapse the two-column grid** for Acceptance Criteria / Verification Steps or any
  other parallel section into a single column.
- **Do not render the Original Request as plain unstyled paragraph text.**
- **Do not convert status indicators to plain text.** They need a visual component (dot + text,
  or chip).
- **Do not remove the sidebar** or merge it into the main content flow.
- **Do not add background colors to section labels.**
- **Do not make the metadata row a label/value table.** It must be a horizontal chip row.
- **Do not use large bold text as a substitute for proper visual hierarchy.** Bold is not a
  design system.

---

## The Test

When you finish any UI work, look at the result and ask one question:

> "If I showed this to a senior designer who uses Linear every day, would they think it looks
> like a well-built internal tool — or would they wince?"

If the answer is "they would wince," keep working.