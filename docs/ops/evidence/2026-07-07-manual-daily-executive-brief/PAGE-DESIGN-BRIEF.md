# Daily Executive Brief — Page Design Brief

*Design instructions for the executive-brief reader page. The content and its format are already locked (`BRIEF-FORMAT-SPEC.md`, golden sample `2026-07-08/brief-richer-0708.md`). This document is only about how that content is presented and acted on as a page. Audience: the owner (Brandon) and, secondarily, his team.*

---

## 1. Guiding principle

**The brief is a control surface, not a document.** The owner should be able to read it and act on it in the same place — create a task, hand something to a team member, mark a decision resolved, check the evidence behind a claim — without ever leaving the page. Every control earns its place; nothing decorative. When in doubt, remove.

---

## 2. Overall layout — two columns

A wide, two-column layout on desktop:

```
┌─────────────────────────────────────────────┬───────────────────────────┐
│  MAIN COLUMN (the brief, reading order)      │  ACTION RAIL (sticky)     │
│                                              │                           │
│  Daily Executive Brief — Jul 8, 2026         │  ┌─ Your tasks ─────────┐ │
│                                              │  │ ☐ decide battery…  ⋯ │ │
│  ## Your calls today                         │  │ ☐ approve Mack…    ⋯ │ │
│   • Union — battery storage…      →          │  │ + Add task            │ │
│   • Uniqlo — Skypod rule…         →          │  └──────────────────────┘ │
│                                              │                           │
│  ## Union Collective                         │  ┌─ Team · Union ───────┐ │
│   Action Items                               │  │ ☐ Andrew: Viox 70%… ⋯│ │
│    ☐ You — battery storage                   │  │   Andrew · Jul 14     │ │
│    ☐ Andrew — Viox 70% set · Jul 14          │  │ + Add task            │ │
│   [context prose…]  ·[source chips]          │  └──────────────────────┘ │
│                                              │  ┌─ Team · Uniqlo ──────┐ │
│  … more projects …                           │  │ …                     │ │
│                                              │  └──────────────────────┘ │
│  ▸ Also moving — nothing needed from you     │                           │
│  ## Loose ends                               │                           │
└─────────────────────────────────────────────┴───────────────────────────┘
```

- **Main column** = the brief exactly as specified: `Your calls today` → project blocks (Action Items first, then prose) → the collapsed "Also moving" group → Loose ends.
- **Action rail** = a **sticky right column** holding every actionable item as a working checklist. This is where tasks get created, assigned, checked off, and resolved.
- **Page header** carries the title, the date, a single **Submit Feedback** button (section 5), and nothing else.
- The Action Items lists inside each project block (main column) and the Action rail (right column) are **the same underlying tasks, two views**: the block shows them in context; the rail is the consolidated, workable to-do surface. Checking one updates the other.

**Reuse the app's existing sidebar layout primitive** (`PageScaffold layout="sidebar"` / `DetailLayout`) rather than hand-rolling the grid.

---

## 3. Right column — the Action Rail

Grouped in this order:

### Group A — "Your tasks" (Brandon)
- Every `You` action item from the brief, plus the "Loose ends — yours to chase" items.
- One group, pinned at the top of the rail. This is his personal to-do list for the day.

### Group B — "Team tasks", subgrouped by project, in the brief's urgency order
- A small subheader per project (Union, Uniqlo, Vermillion, …) matching the main-column order.
- Under each, that project's team action items.
- Projects from the collapsed "Also moving" group appear here too, at the bottom, so no task is hidden.

### Task row anatomy (keep it quiet)
`☐  Task label   ·   [assignee]   ·   [due chip]   ⋯`
- **Checkbox** — check to complete. Completed rows fade and drop to a collapsed "Done today" count at the bottom of their group.
- **Label** — the task, one line, truncates with tooltip.
- **Assignee** — a small avatar/initials for team tasks; omitted for "Your tasks" (implied Brandon).
- **Due chip** — only when a real due date exists. Overdue = a quiet warning tone (semantic token, not red-alarm). No chip when there's no date — never invent one.
- **Overflow `⋯`** — edit, reassign, change due date, **Resolve** (section 4). Hidden until row hover/focus so it adds no resting clutter.

---

## 4. Optimize for action — the interactions

Three creation/change actions, all reachable without clutter:

### Create a task for yourself
- A bare **`+ Add task`** affordance at the bottom of the "Your tasks" group (bare plus + text, no bordered button — per the noise-gate rule for secondary add actions).
- Opens a small inline composer: task text, optional due date. Assignee defaults to Brandon.

### Create a task assigned to a team member
- The same `+ Add task` at the bottom of any project's team group, **or** a global "Assign task" in the composer where you pick the assignee.
- Composer fields: task text, **assignee picker** (searchable team directory), optional due date, and it auto-associates the project of the group it was created under.
- Also allow **promoting a claim into a task**: hovering any Action Item or a sentence in the prose reveals a quiet "＋ task" affordance so the owner can turn something he's reading into an assigned task in place.

### Mark an issue / decision resolved
- Available from a task/decision row's `⋯` menu as **"Resolve,"** and from the project block header as **"Mark resolved."**
- Resolving writes to the carryover ledger so the item shows as *resolved today* and does not nag in tomorrow's brief. Give a subtle confirmation (row collapses into a "Resolved" state, undoable via toast).

### Clutter rules (non-negotiable)
- No buttons at rest on every row — controls appear on hover/focus.
- Secondary "add" is a **bare plus icon**, never a labeled/bordered button.
- No card borders around groups; separate with spacing and a quiet subheader.
- One primary affordance per row; everything else in the `⋯` menu.

---

## 5. AI feedback — one centralized action, not per-item controls

- **A single `Submit Feedback` button in the page header.** No thumbs/flags on individual items cluttering the read.
- Clicking it opens a **right-side panel** (a Sheet) that overlays without navigating away. The panel contains a scrollable list of the brief's items (the calls, each project's claims, each task) — the same items, now selectable — with, per item, three quiet toggles:
  - **Inaccurate** — the claim is wrong.
  - **Not important** — irrelevant or shouldn't have been surfaced.
  - **Valuable** — especially useful or insightful (this is the positive signal that reinforces good prioritization).
- Plus a **free-text "Why?"** field for explanation.
- **Submit** writes the selections to the feedback store (existing `ai_feedback_events` table) so future briefs learn from it — down-weighting the kinds of items marked inaccurate/unimportant and reinforcing what's marked valuable.
- Optional nicety: while the panel is open, hovering an item in the panel highlights the corresponding item in the brief (and vice-versa) so the user can see what they're rating.

Design the panel so giving feedback on five items takes under a minute — toggles, not forms.

---

## 6. Source traceability — every claim, one click to the evidence

- **Every factual claim, recommendation, and conclusion carries a source link** — this is already in the content (`[S260]` etc. with real URLs). On the page, do **not** show raw `S260` codes.
- Render each source as a **small, quiet inline chip** at the end of its claim, using a **type icon** (email / meeting / Teams / document) rather than a code. Multiple sources = a small stack of chips. Hover shows the source title; the claim text itself stays clean.
- **Clicking a source opens the evidence in a slide-over preview** (right-side panel or modal) *without leaving the page*: the email thread, the meeting transcript, the Teams conversation, or the document, with an **"Open original ↗"** link for the full record.
  - Email/meeting/document: show the content and link out to Outlook / the transcript.
  - **Teams gap:** Teams messages currently have no external permalink (`URL: none`). Show the conversation text inline from the corpus and **disable the "Open original" link with a tooltip explaining it's not yet available** — do not hide the citation. (Tracked separately; Teams needs permalinks.)
- The same evidence preview is reused by the feedback panel (so a user rating a claim "inaccurate" can pull up its source right there).

---

## 7. States

- **Loading** — skeleton the two columns; don't block the whole page on the rail.
- **Empty tasks** — a group with no tasks shows just its `+ Add task` affordance, no empty-state card.
- **All-clear day** — if `Your calls today` is empty, say so plainly ("No decisions need you today.") rather than hiding the section.
- **Done today** — completed tasks collapse to a count per group, expandable.
- **Overdue** — quiet warning tone on the due chip; never an alarm color or a badge pile.

---

## 8. Responsive

- **Desktop:** two columns as above; action rail sticky.
- **Tablet/mobile:** the action rail moves **below** the brief, or becomes a bottom-anchored "Tasks" sheet the owner can pull up. The brief stays the primary reading surface. Source chips and the feedback panel become full-width sheets. Follow the app's existing mobile-responsive conventions (grids collapse, panels become sheets).

---

## 9. Visual tone

- Alleato design system only: semantic tokens, no hardcoded colors, `shadow-xs`/`shadow-sm` at most, no card borders around sections (spacing + quiet subheaders).
- The read is calm and typographic; the *only* visually assertive elements are the checkboxes and the single Submit Feedback button. Everything else recedes until hovered.

---

## Appendix — data wiring (for engineering)

- **Tasks:** create against the app's tasks table; resolve assignee ids carefully (creating for a person vs. the acting user — `people.id` vs `user_profiles.id`; see the meeting-task-management pattern). Auto-tag the project from the group context.
- **Resolve → ledger:** "Resolve" flips the carryover open-items ledger entry to `resolved` so tomorrow's writer marks it resolved and stops carrying it (see `BRIEF-FORMAT-SPEC.md` → carryover ledger).
- **Feedback → `ai_feedback_events`:** persist per-item `{brief_id, source_tag/item_id, signal: inaccurate|not_important|valuable, reason}`; feed it into the writer's prioritization loop.
- **Source chips → real records:** the `[S*]` → URL map already exists in the brief; the preview reads the underlying email/meeting/Teams/document by that id. Teams items have no external URL — render inline, disable external open.
