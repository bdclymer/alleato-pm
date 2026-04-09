# RFIs — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 18 | HIGH |
| Views & Navigation | 10 | HIGH |
| Fields & Data | 19 | HIGH |
| Statuses & Workflows | 9 | HIGH |
| Ball-in-Court Tracking | 5 | HIGH |
| Permissions | 4 | MEDIUM |
| Integrations | 6 | MEDIUM |
| Reporting & Export | 3 | MEDIUM |
| Advanced Features | 14 | MEDIUM |
| **TOTAL** | **88** | |

---

## 1. Core Actions

> Source: Codebase — `new/page.tsx`, `rfi-detail.tsx`, `route.ts` (POST/PATCH/DELETE), `use-rfis.ts`

### 1.1 Create — Save as Draft

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create RFI with subject only (Draft) | 1. Navigate to /767/rfis<br>2. Click "Create RFI"<br>3. Fill Subject: "What is the ceiling height in Room 101?"<br>4. Click "Save as Draft" | New RFI appears in list with status "Draft", auto-generated sequential number; no error | HIGH | 🔲 | Only subject required for Draft |
| 1.1.2 | Create RFI with all optional fields (Draft) | Fill Subject, Question, Due Date, RFI Manager, Assignees, Received From, Responsible Contractor, Distribution List, Location, Specification, Cost Code, RFI Stage, Schedule Impact, Cost Impact, Reference, Drawing Number → Save as Draft | All fields persisted; detail view shows every entered value | MEDIUM | 🔲 | |
| 1.1.3 | Create fails when Subject is empty | Leave Subject blank; click "Save as Draft" | Validation error "Subject is required" shown on Subject field; form not submitted | HIGH | 🔲 | |
| 1.1.4 | Auto-number increments sequentially | Note highest RFI number; create two RFIs in succession | Each gets the next sequential integer; no duplicates | HIGH | 🔲 | |
| 1.1.5 | Mark RFI private on create | Check "Private" checkbox on new RFI form; Save as Draft | "Private" badge visible on detail page; is_private=true persisted | MEDIUM | 🔲 | |

### 1.2 Create — Create Open

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Create Open RFI with required fields | Fill Subject, Question, Due Date, at least one Assignee → click "Create Open" | RFI created with status "Open"; Ball In Court auto-set to first assignee | HIGH | 🔲 | rfiOpenSchema requires question + due_date + assignees |
| 1.2.2 | Create Open fails without Question | Fill Subject + Due Date + Assignees; leave Question blank; click "Create Open" | Validation error "Question is required for Open RFIs"; form not submitted | HIGH | 🔲 | |
| 1.2.3 | Create Open fails without Due Date | Fill Subject + Question + Assignees; leave Due Date blank; click "Create Open" | Validation error "Due date is required for Open RFIs"; form not submitted | HIGH | 🔲 | |
| 1.2.4 | Create Open fails without Assignees | Fill Subject + Question + Due Date; leave Assignees empty; click "Create Open" | Validation error "At least one assignee is required for Open RFIs"; form not submitted | HIGH | 🔲 | |

### 1.3 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Edit subject from detail page | Open RFI detail → click Edit → change Subject → click "Save Changes" | Updated subject persists after page refresh; success toast shown | HIGH | 🔲 | |
| 1.3.2 | Edit question field | Click Edit → update Question textarea → Save Changes | New question text visible in Question card on detail page | HIGH | 🔲 | |
| 1.3.3 | Cancel edit discards changes | Click Edit → change Subject to "DO NOT SAVE" → click Cancel | Original subject shown; no data changed; form closes | HIGH | 🔲 | |
| 1.3.4 | Edit opens with all fields pre-filled | Create RFI with known values; reload; click Edit | All input fields contain the previously saved values; no blank dropdowns | HIGH | 🔲 | |
| 1.3.5 | Edit row action from list | Hover row → three-dot menu → Edit | Navigates to RFI detail page in edit mode | MEDIUM | 🔲 | |

### 1.4 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.4.1 | Delete from detail page | Open RFI detail → click red "Delete" button → confirm in dialog | RFI deleted permanently; redirected to /767/rfis; record absent from list; success toast shown | HIGH | 🔲 | Hard delete (no recycle bin) |
| 1.4.2 | Cancel delete leaves record intact | Click Delete → click "Cancel" in confirmation dialog | Record remains in list unchanged; no toast | HIGH | 🔲 | |
| 1.4.3 | Delete from list row action menu | Row action menu → Delete → Confirm | Record removed from list immediately; success toast shown | HIGH | 🔲 | |
| 1.4.4 | Delete non-existent RFI returns 404 | API call DELETE /api/projects/767/rfis/{invalid-id} | API responds 404 or error; no crash | MEDIUM | 🔲 | API-level test |

---

## 2. Views & Navigation

> Source: Codebase — `rfis-client.tsx`, `rfis-table-config.tsx`, `rfi-detail.tsx`

### 2.1 List View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | List loads with correct default columns | Navigate to /767/rfis | Table renders with columns: #, Subject, Status, Assignees, Due Date, Ball In Court, RFI Manager | HIGH | 🔲 | rfiDefaultVisibleColumns from config |
| 2.1.2 | Row click navigates to detail | Click any row in table view | Browser navigates to /767/rfis/{id} | HIGH | 🔲 | |
| 2.1.3 | Empty state shown when no RFIs | Delete all RFIs; navigate to /767/rfis | "No RFIs found" empty state with "Create your first RFI" button | MEDIUM | 🔲 | |
| 2.1.4 | Filtered empty state shown | Apply filter that matches no records | "No RFIs found" with "Try adjusting your search or filters." message | MEDIUM | 🔲 | |

### 2.2 Card View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Card view renders all records | Click card view icon in toolbar | Each RFI shown as a card with RFI #, subject, status badge, assignees, due date | MEDIUM | 🔲 | |
| 2.2.2 | Card click navigates to detail | Click any card | Navigates to /767/rfis/{id} | MEDIUM | 🔲 | |

### 2.3 List View (compact)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | Compact list view renders | Click list view icon in toolbar | Compact rows with RFI #, subject, status badge | MEDIUM | 🔲 | |

### 2.4 Detail View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.4.1 | Detail page loads all sections | Click any RFI row | Page shows: Question card, Responses section (Liveblocks), Actions card, General Information sidebar | HIGH | 🔲 | |
| 2.4.2 | Back navigation from detail | Click "Back to RFIs" button | Navigates back to /767/rfis list | HIGH | 🔲 | |
| 2.4.3 | Detail page title shows RFI number | Open any RFI detail | Page title displays "RFI #{number}"; description shows subject | MEDIUM | 🔲 | PageShell variant="detail" |

---

## 3. Fields & Data

> Source: `rfi-schema.ts`, `new/page.tsx`, `rfi-detail.tsx`, `rfis-table-config.tsx`, Procore manifest

### 3.1 Create / Edit Form Fields

| # | Field | Type | Required (Draft / Open) | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|------------------------|--------------------------|----------------------|---------|--------|
| 3.1.1 | Subject | Text | Yes / Yes | Any non-empty string | Blank → "Subject is required" | HIGH | 🔲 |
| 3.1.2 | Question | Textarea | No / Yes | Multi-line text | Blank on Open submit → "Question is required for Open RFIs" | HIGH | 🔲 |
| 3.1.3 | Due Date | Date input | No / Yes | Valid date (YYYY-MM-DD) | Blank on Open submit → "Due date is required for Open RFIs" | HIGH | 🔲 |
| 3.1.4 | Assignees | Text (comma-sep) | No / Yes (min 1) | Comma-separated names parsed into array | Empty on Open submit → "At least one assignee is required for Open RFIs" | HIGH | 🔲 |
| 3.1.5 | RFI Manager | Text | No / No | Any string | — | MEDIUM | 🔲 |
| 3.1.6 | Received From | Text | No / No | Any string | — | MEDIUM | 🔲 |
| 3.1.7 | Responsible Contractor | Text | No / No | Any string | — | MEDIUM | 🔲 |
| 3.1.8 | Distribution List | Text (comma-sep) | No / No | Comma-separated names | — | LOW | 🔲 |
| 3.1.9 | Location | Text | No / No | Any string | — | MEDIUM | 🔲 |
| 3.1.10 | Specification | Text | No / No | Any string | — | MEDIUM | 🔲 |
| 3.1.11 | Cost Code | Text | No / No | Any string | — | LOW | 🔲 |
| 3.1.12 | RFI Stage | Text | No / No | Any string | — | LOW | 🔲 |
| 3.1.13 | Schedule Impact | Dropdown | No / No | Yes, No, TBD, N/A | — | MEDIUM | 🔲 |
| 3.1.14 | Cost Impact | Dropdown | No / No | Yes, No, TBD, N/A | — | MEDIUM | 🔲 |
| 3.1.15 | Reference | Text | No / No | Any string | — | LOW | 🔲 |
| 3.1.16 | Drawing Number | Text | No / No | Any string | — | MEDIUM | 🔲 |
| 3.1.17 | Private | Checkbox | No / No | Checked = true; unchecked = false | — | MEDIUM | 🔲 |

### 3.2 Read-Only / System Fields

| # | Field | Verified On | Expected Behavior | Priority | Result | Notes |
|---|-------|-------------|-------------------|---------|--------|-------|
| 3.2.1 | RFI Number | Detail sidebar, list # column | Auto-assigned integer; not editable by user | HIGH | 🔲 | |
| 3.2.2 | Date Initiated | Detail sidebar | Set to current date at creation; not editable | HIGH | 🔲 | |
| 3.2.3 | Created By | Detail sidebar | Set to authenticated user email at creation | MEDIUM | 🔲 | |
| 3.2.4 | Closed Date | Detail sidebar | Auto-set when status changes to Closed; cleared on Reopen | HIGH | 🔲 | |
| 3.2.5 | Created / Updated timestamps | Detail sidebar | Show creation and last-edit datetimes | LOW | 🔲 | |

---

## 4. Statuses & Workflows

> Source: `rfi-schema.ts` (RFI_STATUS_OPTIONS), `rfi-detail.tsx` (handleStatusChange), `[rfiId]/route.ts` (PATCH status logic)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | New RFI via "Save as Draft" starts in Draft | Create RFI; click "Save as Draft" | Status badge shows "Draft" (secondary/gray variant) | HIGH | 🔲 | |
| 4.1.2 | New RFI via "Create Open" starts in Open | Create RFI; click "Create Open" | Status badge shows "Open" (default/blue variant) | HIGH | 🔲 | |
| 4.2.1 | Open RFI: Draft → Open | Open detail of Draft RFI → Actions → "Open RFI" | Status changes to "Open"; "Open RFI" button disappears; "Close RFI" button appears; ball_in_court set from assignees | HIGH | 🔲 | |
| 4.2.2 | Close RFI: Open → Closed | Open detail of Open RFI → Actions → "Close RFI" | Status changes to "Closed" (success/green variant); closed_date auto-set to today; ball_in_court cleared; "Reopen RFI" button appears | HIGH | 🔲 | |
| 4.2.3 | Reopen RFI: Closed → Open | Open detail of Closed RFI → Actions → "Reopen RFI" | Status returns to "Open"; closed_date cleared; ball_in_court restored from assignees; "Close RFI" button reappears | HIGH | 🔲 | |
| 4.2.4 | Close Draft RFI → closed-draft | Open detail of Draft RFI; manually PATCH status=closed | Status becomes "Closed (Draft)" (secondary variant); closed_date set | MEDIUM | 🔲 | Via API or status change; edge-case path |
| 4.2.5 | Reopen closed-draft → Draft | On "Closed (Draft)" RFI → "Reopen RFI" | Status returns to "Draft"; closed_date cleared | MEDIUM | 🔲 | |
| 4.3.1 | Status badge color correct per status | Observe badge on list and detail for Draft, Open, Closed, Closed (Draft) | Draft=gray, Open=blue/default, Closed=green/success, Closed (Draft)=gray | MEDIUM | 🔲 | RFI_STATUS_VARIANT_MAP |
| 4.3.2 | Status filter URL param preserved on reload | Filter by status=Open; copy URL; paste in new tab | List still filtered to Open on load | LOW | 🔲 | searchParams.get("status") |

---

## 5. Ball-in-Court Tracking

> Source: `route.ts` POST/PATCH logic — ball_in_court auto-derived from assignees on status transitions

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Ball In Court set on Open creation | Create Open RFI with Assignees: "Jane Doe, Bob Smith" | Ball In Court column in list shows "Jane Doe, Bob Smith"; detail sidebar confirms | HIGH | 🔲 | POST: ball_in_court = assignees.join(", ") |
| 5.1.2 | Ball In Court cleared when Draft is created | Create RFI via "Save as Draft" | Ball In Court shows "—" or null in list and detail | HIGH | 🔲 | POST: ball_in_court = null for draft |
| 5.1.3 | Ball In Court restored on Reopen | Close an Open RFI (ball_in_court cleared); Reopen it | Ball In Court is restored to the assignees list | HIGH | 🔲 | PATCH reopen: ball_in_court = assignees.join(", ") |
| 5.1.4 | Ball In Court cleared on Close | Close an Open RFI | Ball In Court changes to null/blank in list column | HIGH | 🔲 | PATCH close: ball_in_court = null |
| 5.1.5 | Ball In Court column visible in table | Navigate to /767/rfis | "Ball In Court" column shows correct assignee names for Open RFIs and blank for Closed | HIGH | 🔲 | Default visible column |

---

## 6. Permissions

> Source: Procore RFI Permissions Matrix; codebase auth checks in route.ts

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 6.1.1 | Unauthenticated user blocked from API | No session | POST /api/projects/767/rfis | 401 Unauthorized returned | HIGH | 🔲 | Auth check in POST handler |
| 6.1.2 | Unauthenticated user blocked from edit API | No session | PATCH /api/projects/767/rfis/{id} | 401 Unauthorized returned | HIGH | 🔲 | Auth check in PATCH handler |
| 6.1.3 | Unauthenticated user blocked from delete API | No session | DELETE /api/projects/767/rfis/{id} | 401 Unauthorized returned | HIGH | 🔲 | Auth check in DELETE handler |
| 6.1.4 | Authenticated user can view list | Standard user (test1@mail.com) | Navigate to /767/rfis | List loads; no access denied | MEDIUM | 🔲 | |

---

## 7. Integrations & Cross-Tool Links

> Source: Procore docs — Create a Change Event from an RFI; codebase — RfiResponses (Liveblocks), drawing_number field

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1.1 | Liveblocks Responses section renders | Open any RFI detail page | "Responses" section renders below the Question card; composer visible (or loading state shown) | HIGH | 🔲 | Powered by EntityRoom + EntityComments |
| 7.1.2 | Add a threaded response | Open RFI detail → Responses → type a reply → submit | Response appears in thread with author name and timestamp | MEDIUM | 🔲 | Requires Liveblocks live connection |
| 7.1.3 | Drawing number field links to drawings | Edit RFI → set Drawing Number → Save | Drawing Number saved and visible in detail sidebar | MEDIUM | 🔲 | Field exists; deep drawing link is future work |
| 7.1.4 | Specification field references spec section | Edit RFI → set Specification = "03300 Concrete" → Save | Specification visible in detail sidebar | MEDIUM | 🔲 | |
| 7.1.5 | Cost Code field can be set | Edit RFI → set Cost Code → Save | Cost Code visible in detail sidebar | LOW | 🔲 | Text entry — no FK to cost codes table currently |
| 7.1.6 | Change event linkage via RFI origin | Navigate to Change Events; check Origin options | "RFI" or "RFI's" is an available Origin option on Change Events | MEDIUM | 🔲 | Cross-tool link from CE side |

---

## 8. Reporting & Export

> Source: Codebase — rfis-client.tsx (enableExport: false); Procore manifest; rfis-scenarios.md Known Gaps

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Export list as CSV (if implemented) | List page → click export icon | CSV downloads with all visible column data; one row per RFI | MEDIUM | 🔲 | Currently enableExport: false in client — test for future implementation |
| 8.1.2 | Export single RFI as PDF (if implemented) | Detail page → action menu → Export as PDF | PDF downloads with all RFI field values | MEDIUM | 🔲 | Not yet implemented per Known Gaps |
| 8.1.3 | API response includes pagination metadata | GET /api/projects/767/rfis?page=1&limit=10 | Response body contains `meta` with `page`, `limit`, `total`, `totalPages` | LOW | 🔲 | API-level test |

---

## 9. Advanced Features

> Source: `rfis-client.tsx` (search/filter logic), `rfis-table-config.tsx` (columns + filters), manifest (Overdue filter), `rfi-schema.ts` (settings)

### 9.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Search by RFI number | Type a known RFI number in search box | List filters to that RFI in real time | HIGH | 🔲 | String(item.number).includes(search) |
| 9.1.2 | Search by subject | Type part of a subject | List narrows to matching subjects | HIGH | 🔲 | item.subject.includes(search) |
| 9.1.3 | Search by RFI Manager name | Type part of an RFI manager name | List narrows to matching records | MEDIUM | 🔲 | item.rfi_manager.includes(search) |
| 9.1.4 | Search by Ball In Court | Type part of an assignee name | List narrows to records where Ball In Court matches | MEDIUM | 🔲 | item.ball_in_court.includes(search) |
| 9.1.5 | Clear search restores all records | Type in search; then clear | All records reappear | HIGH | 🔲 | |

### 9.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.2.1 | Filter by Status: Open | Click Filters → Status = Open | Only Open RFIs shown | HIGH | 🔲 | |
| 9.2.2 | Filter by Status: Draft | Status = Draft | Only Draft RFIs shown | HIGH | 🔲 | |
| 9.2.3 | Filter by Status: Closed | Status = Closed | Only Closed RFIs shown | HIGH | 🔲 | |
| 9.2.4 | Filter by Overdue: Yes | Overdue = Yes filter | Only overdue RFIs shown (past due_date and not closed) | HIGH | 🔲 | Overdue filter exists in rfiFilters config |
| 9.2.5 | Clear filters restores all records | Apply filter → click "Clear Filters" | All records visible again | HIGH | 🔲 | |
| 9.2.6 | Status filter URL param synced | Filter by Open → observe URL | URL contains ?status=open | MEDIUM | 🔲 | tableState.setSearchParams |

### 9.3 Column Visibility

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.3.1 | Toggle hidden column visible | Open column selector → enable "Responsible Contractor" | Column appears in table | LOW | 🔲 | |
| 9.3.2 | Hide a default-visible column | Disable "Ball In Court" via column selector | Column disappears from table; other columns intact | LOW | 🔲 | |

### 9.4 Sorting

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.4.1 | Sort by number descending (default) | Navigate to /767/rfis | RFIs sorted newest (highest number) first | HIGH | 🔲 | Default sortBy: "number", sortDirection: "desc" |
| 9.4.2 | Sort by due date | Click "Due Date" column header | List re-sorts by due date ascending then descending on second click | MEDIUM | 🔲 | |

### 9.5 Pagination

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.5.1 | Default page size is 25 | Navigate to /767/rfis with 25+ RFIs | Maximum 25 rows shown per page; pagination controls visible | MEDIUM | 🔲 | perPage: 25 default |

---

## Sources

| # | Title | URL | Category |
|---|-------|-----|---------|
| 1 | About RFIs — Overview | https://v2.support.procore.com/process-guides/about-rfis | RFIs |
| 2 | Create an RFI | https://v2.support.procore.com/product-manuals/rfis-project/tutorials/create-an-rfi | RFIs |
| 3 | Edit an RFI | https://v2.support.procore.com/product-manuals/rfis-project/tutorials/edit-an-rfi | RFIs |
| 4 | Delete an RFI | https://v2.support.procore.com/product-manuals/rfis-project/tutorials/delete-an-rfi | RFIs |
| 5 | Close an RFI | https://v2.support.procore.com/product-manuals/rfis-project/tutorials/close-an-rfi | RFIs |
| 6 | Reopen an RFI | https://v2.support.procore.com/product-manuals/rfis-project/tutorials/reopen-an-rfi | RFIs |
| 7 | Assign an RFI | https://v2.support.procore.com/product-manuals/rfis-project/tutorials/assign-an-rfi | RFIs |
| 8 | Add a Comment to an RFI | https://v2.support.procore.com/product-manuals/rfis-project/tutorials/add-a-comment-to-an-rfi | RFIs |
| 9 | Create a Change Event from an RFI | https://v2.support.procore.com/product-manuals/rfi-project/tutorials/create-a-change-event-from-an-rfi | RFIs |
| 10 | Permissions Matrix — RFIs | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-rfi-permissions | RFIs |
| 11 | Configure Settings: RFIs | https://v2.support.procore.com/product-manuals/rfis-project/tutorials/configure-settings-rfis | RFIs |
| 12 | RFIs Reference | https://v2.support.procore.com/reference-rfis | RFIs |
| 13 | Procore Manifest (captured 2026-04-07) | `.claude/procore-manifests/rfis/manifest.json` | Codebase |
| 14 | RFI List Page | `frontend/src/app/(main)/[projectId]/rfis/rfis-client.tsx` | Codebase |
| 15 | RFI Detail Page | `frontend/src/app/(main)/[projectId]/rfis/[rfiId]/rfi-detail.tsx` | Codebase |
| 16 | New RFI Form | `frontend/src/app/(main)/[projectId]/rfis/new/page.tsx` | Codebase |
| 17 | RFI API Routes (collection) | `frontend/src/app/api/projects/[projectId]/rfis/route.ts` | Codebase |
| 18 | RFI API Routes (single resource) | `frontend/src/app/api/projects/[projectId]/rfis/[rfiId]/route.ts` | Codebase |
| 19 | RFI Schema & Status Constants | `frontend/src/lib/schemas/rfi-schema.ts` | Codebase |
| 20 | RFI Table Config & Filters | `frontend/src/features/rfis/rfis-table-config.tsx` | Codebase |
| 21 | RFI React Query Hooks | `frontend/src/hooks/use-rfis.ts` | Codebase |
| 22 | RFI Responses (Liveblocks) | `frontend/src/components/rfis/rfi-responses.tsx` | Codebase |
| 23 | RFIs Guided Test Scenarios | `docs/testing/rfis-scenarios.md` | Testing |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
