# RFIs — Verified Task List

**Generated:** 2026-03-17
**Based on:** Verification report (Phase 5)
**Overall completion:** 62%

---

## HIGH Priority (blocks core workflows)

### Database Changes

- [ ] [M] Create `rfi_responses` table — `id`, `rfi_id` (FK), `responder_id`, `responder_name`, `response_text` (rich text), `is_official` (boolean), `is_required` (boolean), `created_at`, `attachments` (jsonb). Add migration + regenerate types.
- [ ] [S] Add `drawing_number` column to `rfis` table — `ALTER TABLE rfis ADD COLUMN drawing_number text`
- [ ] [S] Add `closed-draft` to valid status values — update schema constants and validation
- [ ] [S] Remove `pending` and `void` from status options — not in Procore, may confuse users

### API Routes

- [ ] [L] Create response endpoints — `GET/POST /api/projects/[projectId]/rfis/[rfiId]/responses` for listing and adding responses
- [ ] [M] Create official response endpoint — `PATCH /api/projects/[projectId]/rfis/[rfiId]/responses/[responseId]/official` to mark a response as official
- [ ] [M] Add reopen logic to PATCH route — when status is `closed`, allow transition back to `open`; when `closed-draft`, transition back to `draft`
- [ ] [S] Update close logic — set status to `closed-draft` when closing from Draft status (currently always sets `closed`)

### UI / Components

- [ ] [L] Build `RfiResponseCard` component — displays a response with responder name, date, text, official badge, and attachments
- [ ] [L] Build `RfiResponseForm` component — rich text input for submitting a response as an assignee
- [ ] [M] Add Responses section to detail page — render list of `RfiResponseCard` components between Request and General Information sections; include "Add Response" button for assignees
- [ ] [M] Add "Mark as Official" action on response cards — visible to RFI Manager; updates `is_official` flag
- [ ] [M] Add "Reopen RFI" button to detail page — visible when status is `closed` or `closed-draft`; calls PATCH with status change

### Workflows

- [ ] [M] Implement Ball in Court auto-shift — when all required assignees have responded, auto-shift BIC to RFI Manager; when RFI is opened, set BIC to assignees
- [ ] [M] Block close without official response — when closing from Open, require at least one response marked as official (or warn)

---

## MEDIUM Priority (reduces functionality, workaround exists)

### Table Columns (List View)

- [ ] [M] Add 11 missing columns to `rfis-table-config.tsx` — Received From, Date Initiated, Distribution List, Closed Date, Location, Schedule Impact, Cost Impact, Cost Code, Sub Job, RFI Stage, Private. All hidden by default.

### Form Improvements

- [ ] [L] Replace plain text Question field with rich text editor — Procore uses a full toolbar (bold, italic, underline, strikethrough, alignment, lists, indent). Consider TipTap or similar.
- [ ] [M] Replace comma-separated Assignees input with multi-select person picker — chips with remove buttons, search from project directory
- [ ] [M] Replace comma-separated Distribution List input with multi-select person picker — same pattern as Assignees
- [ ] [M] Replace text inputs for RFI Manager and Received From with person picker dropdowns — search from project directory
- [ ] [S] Add Drawing Number field to create/edit forms — text input, maps to new `drawing_number` column

### Filters (List View)

- [ ] [L] Add 11 missing filters to list page — Responsible Contractor, Received From, Assignees, RFI Manager, Ball In Court, Overdue (checkbox), Locations, Cost Code, Sub Job, RFI Stage, Created By. Currently only Status filter exists.

### Export

- [ ] [M] Add CSV export endpoint and UI — `GET /api/projects/[projectId]/rfis/export?format=csv` with current filters applied
- [ ] [L] Add PDF export — single RFI PDF with all responses, and list PDF. Consider using a PDF library or server-side rendering.

---

## LOW Priority (polish, nice-to-have)

### Settings Page

- [ ] [XL] Build RFI Settings page — admin-only settings: default RFI Manager, days to answer, require responses by default, show only official responses, enable private, default private, custom field labels, email reminder toggle, enable revisions, default distribution list, field configurability (required/optional/hidden per field), email notification matrix

### Attachments

- [ ] [L] Add file attachment support to RFIs — upload on create/edit, display on detail. May reuse existing attachment infrastructure if available.
- [ ] [M] Add file attachment support to responses — upload when responding, display in response cards

### Related Items

- [ ] [L] Build Related Items section on detail page — ability to link RFIs to change events, drawings, specs, correspondence
- [ ] [M] Create Change Event from RFI action — button on detail that pre-populates a change event from RFI data

### Advanced Features

- [ ] [M] Forward for Review — temporarily transfer BIC to another user; revert after they respond
- [ ] [S] Add custom_field_1, custom_field_2 columns + form fields — configurable labels from settings
- [ ] [M] Bulk edit support on list page — select multiple RFIs, batch update status/assignees
- [ ] [S] Remove legacy mock page at `frontend/src/app/(tables)/rfis/page.tsx` — dead code, not connected to real data
- [ ] [M] Email notifications — send emails on RFI events (create, open, response, close). Requires notification infrastructure.
- [ ] [S] Saved views on list page — save filter/column/sort configurations

---

## Execution Order (recommended)

### Phase A: Response System (HIGH — this is the core gap)
1. `rfi_responses` migration + `npm run db:types`
2. Response API routes (GET/POST + official designation)
3. `RfiResponseCard` and `RfiResponseForm` components
4. Integrate responses into detail page
5. Ball in Court auto-shift logic
6. Close-with-official-response check

### Phase B: Form & List Improvements (MEDIUM)
7. Add 11 missing table columns to config
8. Add 11 missing filters
9. Rich text editor for Question field
10. Person picker components for Assignees, Distribution, Manager, Received From
11. Drawing Number column + field

### Phase C: Status & Workflow Fixes (HIGH/MEDIUM)
12. Add `closed-draft` status + transitions
13. Reopen RFI button + API logic
14. Remove `pending`/`void` from status options
15. Update Ball in Court logic for all transitions

### Phase D: Export & Polish (MEDIUM/LOW)
16. CSV export
17. PDF export
18. File attachments (RFIs + responses)
19. Settings page
20. Related items
21. Clean up legacy mock page

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Total tasks | 35 |
| HIGH priority | 11 |
| MEDIUM priority | 13 |
| LOW priority | 11 |
| Size S | 7 |
| Size M | 16 |
| Size L | 9 |
| Size XL | 1 |
| Estimated total effort | ~5-7 days |
