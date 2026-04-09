# Submittals — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 17 | HIGH |
| Views & Navigation | 13 | HIGH |
| Fields & Data | 16 | HIGH |
| Statuses & Workflows | 7 | HIGH |
| Ball-in-Court Workflow | 4 | MEDIUM |
| Permissions | 3 | MEDIUM |
| Integrations | 6 | MEDIUM |
| Reporting & Export | 3 | MEDIUM |
| Advanced Features | 11 | MEDIUM |
| **TOTAL** | **80** | |

---

## 1. Core Actions

> Source: Codebase — SubmittalFormDialog, POST /api/projects/[projectId]/submittals, PUT and DELETE routes; submittals-scenarios.md

### 1.1 Create

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create a submittal with required fields only | 1. Navigate to `/767/submittals`<br>2. Click "Add Submittal"<br>3. Fill Number (e.g. `TEST-001`) and Title (e.g. `Concrete Mix Design`)<br>4. Click "Create Submittal" | Dialog closes; new submittal appears in list with Number = TEST-001, Title = Concrete Mix Design, Status = Draft | HIGH | 🔲 | |
| 1.1.2 | Create with all optional fields | Fill Number, Title, Spec Section, Division, Submittal Type, Status = Open, Final Due Date, Lead Time, Ball In Court, Description | All fields persisted; detail view shows every entered value | MEDIUM | 🔲 | |
| 1.1.3 | Create fails when Title is blank | Leave Title empty, fill Number, click Save | Validation error "Title is required" shown near Title field; form not submitted | HIGH | 🔲 | |
| 1.1.4 | Create fails when Number is blank | Leave Number empty, fill Title, click Save | Validation error "Number is required" shown near Number field; form not submitted | HIGH | 🔲 | |
| 1.1.5 | Create with duplicate submittal number | Enter a Number that already exists for this project, fill Title, click Save | Error message indicates the number already exists; no duplicate record created | MEDIUM | 🔲 | Known gap per scenarios doc — may not be enforced yet |
| 1.1.6 | Default status is Draft | Create with required fields only, leave Status untouched | Status badge on list row and detail page shows "Draft" | HIGH | 🔲 | |
| 1.1.7 | Create with Private flag checked | Check "Private" during create | Submittal created; detail page shows private indicator | LOW | 🔲 | |

### 1.2 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit title via detail page | Open submittal detail → click Edit → change Title → click "Update Submittal" | Dialog closes; detail page shows updated title; toast appears | HIGH | 🔲 | |
| 1.2.2 | Edits persist after page refresh | After saving, press Ctrl+R/Cmd+R | Updated values still shown after reload; nothing reverted | HIGH | 🔲 | |
| 1.2.3 | Cancel edit discards changes | Click Edit → change Title → click Cancel | Dialog closes; original title shown; no data changed | HIGH | 🔲 | |
| 1.2.4 | Edit pre-fills all saved values | Create submittal with all fields, then click Edit | All form fields (Number, Revision, Title, Spec Section, Division, Type, Status, Due Date, Lead Time, Ball In Court, Description, Private) show previously saved values | HIGH | 🔲 | |
| 1.2.5 | Edit status field | Open submittal → Edit → change Status to "Open" → save | Status badge updates immediately on detail page | HIGH | 🔲 | |

### 1.3 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Delete from detail page | Open detail → action menu (⋯) → Delete → Confirm | Redirected to list; record no longer in Items tab; success toast shown | HIGH | 🔲 | |
| 1.3.2 | Delete confirmation required | Click Delete → click Cancel in dialog | Record remains in list; unchanged | HIGH | 🔲 | |
| 1.3.3 | Deleted record moves to Recycle Bin | Delete a submittal → click Recycle Bin tab | Deleted record visible in Recycle Bin tab; absent from Items tab | HIGH | 🔲 | |
| 1.3.4 | Soft delete — record not permanently removed | Delete a submittal | `deleted_at` is set (not null); row still exists in DB; Recycle Bin tab shows it | HIGH | 🔲 | Verify via Supabase or API response |

---

## 2. Views & Navigation

> Source: Codebase — page.tsx tabs array, UnifiedTablePage; submittal-detail-client.tsx tabs

### 2.1 List Page Tabs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | Items tab loads by default | Navigate to `/767/submittals` | "Items" tab is active; table shows all non-deleted submittals | HIGH | 🔲 | |
| 2.1.2 | Items tab shows correct count badge | Navigate to Items tab with known data | Count badge reflects number of currently visible (filtered) rows | MEDIUM | 🔲 | |
| 2.1.3 | Packages tab shows "Coming Soon" | Click "Packages" tab | Empty state with "Coming Soon" message; no error | MEDIUM | 🔲 | Feature not yet implemented |
| 2.1.4 | Spec Sections tab shows "Coming Soon" | Click "Spec Sections" tab | Empty state with "Coming Soon" message; no error | MEDIUM | 🔲 | Feature not yet implemented |
| 2.1.5 | Ball In Court tab filters to records with BIC set | Click "Ball In Court" tab | Only submittals with a non-null `ball_in_court` value are displayed | HIGH | 🔲 | |
| 2.1.6 | Ball In Court tab shows all when none have BIC | Click "Ball In Court" tab with no submittals having a BIC value | Empty state shown; no records; no error | MEDIUM | 🔲 | |
| 2.1.7 | Recycle Bin tab shows soft-deleted records | Delete a record → click Recycle Bin tab | Deleted submittal appears; active submittals do not appear | HIGH | 🔲 | |
| 2.1.8 | Recycle Bin empty state when nothing deleted | Click Recycle Bin with no deleted records | "No submittals in the Recycle Bin." message shown | LOW | 🔲 | |

### 2.2 Detail View Tabs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | General tab loads with correct metadata | Click any submittal → General tab (default) | Shows: Description (if present), Attachments, and sidebar with Type, Package, Ball In Court, Final Due Date, Lead Time, Required On-Site, Distribution History | HIGH | 🔲 | |
| 2.2.2 | Workflow tab shows step count | Click Workflow tab | Tab label shows "Workflow (N)" where N = number of workflow steps; empty state if none | HIGH | 🔲 | |
| 2.2.3 | Related Items tab shows linked drawings | Click Related Items tab | Shows "Linked Drawings (N)" card; lists drawing IDs if any | MEDIUM | 🔲 | |
| 2.2.4 | Change History tab shows history count | Click History tab | Tab label shows "Change History (N)"; each entry shows date, action, and new status | MEDIUM | 🔲 | |
| 2.2.5 | Back button navigates to list | Click "Back" button on detail page | Returns to `/767/submittals`; list state preserved | HIGH | 🔲 | |

### 2.3 View Modes

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | Table view renders | Default or switch to Table view | Grid with columns visible; each row is a submittal | HIGH | 🔲 | |
| 2.3.2 | Card view renders | Switch to Card view | Each submittal shown as a card with number, revision, title, status badge, spec section or type, and Ball In Court | MEDIUM | 🔲 | |
| 2.3.3 | List view renders | Switch to List view | Each submittal shown as a compact row: "Number — Title" + Revision + spec/type + Status badge | MEDIUM | 🔲 | |

---

## 3. Fields & Data

> Source: submittalFormSchema (submittal-form-dialog.tsx), updateSubmittalSchema (route.ts), submittals-table-config.tsx column definitions, manifest.json

### 3.1 Create / Edit Form Fields

| # | Field | Type | Required | Valid Input Test | Invalid / Edge Case | Priority | Result |
|---|-------|------|---------|-----------------|---------------------|---------|--------|
| 3.1.1 | Number | Text | Yes | `08-1113-1` accepted | Empty string → validation error | HIGH | 🔲 |
| 3.1.2 | Revision | Integer ≥ 0 | Yes (defaults 0) | `0`, `1`, `2` accepted | Negative value → validation error | HIGH | 🔲 |
| 3.1.3 | Title | Text | Yes | Any non-empty string | Empty string → "Title is required" | HIGH | 🔲 |
| 3.1.4 | Specification Section | Text | No | `03-2000 - Concrete Reinforcing` | Empty/null saved as null | MEDIUM | 🔲 |
| 3.1.5 | Division | Text | No | `Division 8` | Empty/null saved as null | MEDIUM | 🔲 |
| 3.1.6 | Submittal Type | Text | No | `Shop Drawing`, `Product Data`, `Sample` | Empty/null saved as null | MEDIUM | 🔲 |
| 3.1.7 | Status | Dropdown | No (defaults Draft) | Draft, Open, Distributed, Closed — all selectable | — | HIGH | 🔲 |
| 3.1.8 | Final Due Date | Date | No | `2026-06-01` | Invalid date → form should reject | HIGH | 🔲 |
| 3.1.9 | Lead Time (days) | Integer ≥ 0 | No | `14` | Negative → validation error; blank → saved as null | MEDIUM | 🔲 |
| 3.1.10 | Required On-Site Date | Date | No | `2026-07-15` | Empty saved as null | MEDIUM | 🔲 |
| 3.1.11 | Ball In Court | Text | No | `Architect`, `Structural Engineer` | Empty saved as null | MEDIUM | 🔲 |
| 3.1.12 | Description | Textarea | No | Multi-line text | Empty saved as null | LOW | 🔲 |
| 3.1.13 | Private | Checkbox | No | Checked = true; Unchecked = false | — | LOW | 🔲 |

### 3.2 Table Columns

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.2.1 | Default visible columns shown | Navigate to `/767/submittals` | Visible by default: Spec Section, #, Rev., Title, Type, Status, Responsible C., Ball In Court, Response, Sent Date | HIGH | 🔲 | |
| 3.2.2 | Hidden columns absent by default | Check column visibility | "Received From" and "Approvers" are NOT shown by default | MEDIUM | 🔲 | |
| 3.2.3 | Status badge shows correct variant | Observe status badge colors | Draft = secondary (gray), Open = default (blue), Distributed = outline, Closed = success (green) | HIGH | 🔲 | |

---

## 4. Statuses & Workflows

> Source: submittalFormSchema status enum: Draft, Open, Distributed, Closed; submittal-detail-client.tsx responseVariantMap

### 4.1 Status Transitions via Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | Draft → Open | Open Draft submittal → Edit → set Status = Open → save | Status badge shows "Open"; persists on refresh | HIGH | 🔲 | |
| 4.1.2 | Open → Distributed | Open "Open" submittal → Edit → set Status = Distributed → save | Status badge shows "Distributed"; persists on refresh | HIGH | 🔲 | |
| 4.1.3 | Distributed → Closed | Open "Distributed" submittal → Edit → set Status = Closed → save | Status badge shows "Closed"; persists on refresh | HIGH | 🔲 | |
| 4.1.4 | Status badge updates in list view after edit | Change status → navigate back to list | List row reflects the new status badge immediately | MEDIUM | 🔲 | |

### 4.2 Workflow Step Responses

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.2.1 | Workflow tab shows steps sorted by step_order | Open detail → Workflow tab with configured steps | Steps are listed in ascending step_order; Step 1 shown first | HIGH | 🔲 | |
| 4.2.2 | Response badge variants | View responses in workflow steps | Approved = success (green), Rejected/Revise = destructive (red), Pending = outline, Submitted = default | MEDIUM | 🔲 | |
| 4.2.3 | Empty workflow state | Open submittal with no workflow steps → Workflow tab | "No workflow steps configured." message shown | MEDIUM | 🔲 | |

---

## 5. Ball-in-Court Workflow Tracking

> Source: page.tsx tab filter logic (ball-in-court tab); submittal-form-dialog.tsx ball_in_court field; submittals-table-config.tsx column

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Ball In Court tab filters list | Create submittal with Ball In Court = "Architect" → click Ball In Court tab | Only submittals with non-null ball_in_court are shown; submittal with "Architect" is visible | HIGH | 🔲 | |
| 5.1.2 | Submittal without BIC hidden in BIC tab | Create submittal with no Ball In Court value → click Ball In Court tab | Submittal with no BIC value is NOT shown in Ball In Court tab | HIGH | 🔲 | |
| 5.1.3 | Ball In Court value shown in table column | Create submittal with Ball In Court = "Structural Engineer" | "Structural Engineer" appears in Ball In Court column on Items tab table | MEDIUM | 🔲 | |
| 5.1.4 | Ball In Court shown in card view | Switch to Card view on Ball In Court tab | Each card shows "Ball In Court: [value]" under the type/spec section | MEDIUM | 🔲 | |

---

## 6. Permissions

> Source: Procore Permissions Matrix — Submittals; is_private field logic; auth check in PUT/DELETE routes

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 6.1.1 | Unauthenticated user cannot PUT | No auth session | PUT `/api/projects/767/submittals/{id}` | 401 Unauthorized response | HIGH | 🔲 | |
| 6.1.2 | Unauthenticated user cannot DELETE | No auth session | DELETE `/api/projects/767/submittals/{id}` | 401 Unauthorized response | HIGH | 🔲 | |
| 6.1.3 | Private submittal visible to creator | Set submittal as Private → view as the creating user | Submittal appears in list for the creating user | MEDIUM | 🔲 | Full role-based visibility not implemented; baseline test only |

---

## 7. Integrations

> Source: submittal-detail-client.tsx — submittal_linked_drawings, submittal_distributions; manifest.json — linked_drawings, distribution_members fields; submittals-scenarios.md known gaps

### 7.1 Drawings

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1.1 | Related Items tab shows linked drawings | Open a submittal that has linked drawings | "Linked Drawings (N)" shows N drawings with their drawing_id values | MEDIUM | 🔲 | |
| 7.1.2 | Related Items tab empty state | Open submittal with no linked drawings → Related Items tab | "No drawings linked." message shown | LOW | 🔲 | |

### 7.2 Distributions

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.2.1 | Distribution history shown in sidebar | Open a submittal with at least one distribution record | Distribution History card in General tab sidebar shows distribution date, message (if any), and recipient count | MEDIUM | 🔲 | |
| 7.2.2 | No distribution history hidden | Open a submittal with no distributions | Distribution History card is not shown in sidebar | LOW | 🔲 | |

### 7.3 Submittal Packages

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.3.1 | Package name shown in detail sidebar | Open a submittal with a linked submittal_package | "Package" field in Details card shows the package name | MEDIUM | 🔲 | |
| 7.3.2 | Packages list tab is "Coming Soon" | Click Packages tab | Coming Soon empty state; no actual package data rendered | MEDIUM | 🔲 | |

---

## 8. Reporting & Export

> Source: page.tsx features config (enableExport: false); submittals-scenarios.md known gaps

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Export not available on list page | Navigate to `/767/submittals` | No export button/icon visible in toolbar (enableExport = false) | MEDIUM | 🔲 | Export disabled in current implementation |
| 8.1.2 | PDF export not available on detail | Open any submittal detail → action menu (⋯) | No "Export as PDF" option shown | MEDIUM | 🔲 | Known gap — not yet implemented |
| 8.1.3 | CSV export not available | Navigate to list page toolbar | No CSV/download icon in toolbar | LOW | 🔲 | Known gap — not yet implemented |

---

## 9. Advanced Features

> Source: page.tsx search/filter/column logic; submittalFilters config; submittals-table-config.tsx

### 9.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Search by submittal number | Type a known number in the search box | List filters to matching number in real time (debounced) | HIGH | 🔲 | |
| 9.1.2 | Search by title | Type part of a known title | List filters to matching submittals | HIGH | 🔲 | |
| 9.1.3 | Search by specification section | Type part of a known spec section | List filters to matching submittals | MEDIUM | 🔲 | |
| 9.1.4 | Search by submittal type | Type part of a known type | List filters to matching submittals | MEDIUM | 🔲 | |
| 9.1.5 | Clear search restores full list | Type a search term → clear the field | All non-deleted submittals reappear | HIGH | 🔲 | |

### 9.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.2.1 | Filter by Status = Draft | Apply Status filter = Draft | Only Draft submittals shown | HIGH | 🔲 | |
| 9.2.2 | Filter by Status = Open | Apply Status filter = Open | Only Open submittals shown | HIGH | 🔲 | |
| 9.2.3 | Filter by Response type | Apply Response filter = Approved | Only submittals with latest_response = Approved shown | MEDIUM | 🔲 | |
| 9.2.4 | Filter by Division (text) | Apply Division filter = "Division 8" | Only submittals in Division 8 shown (case-insensitive match) | MEDIUM | 🔲 | |
| 9.2.5 | Clear filters restores full list | Apply a filter → click "Clear Filters" | All filters removed; full list restored | HIGH | 🔲 | |

### 9.3 Column Visibility

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.3.1 | Toggle a default-visible column off | Open column selector → hide "Ball In Court" | Ball In Court column disappears; other columns intact | LOW | 🔲 | |

---

## Sources

| # | Title | URL / Location | Category |
|---|-------|----------------|---------|
| 1 | Submittals list page — source | `frontend/src/app/(main)/[projectId]/submittals/page.tsx` | Codebase |
| 2 | Submittal detail page — source | `frontend/src/app/(main)/[projectId]/submittals/[submittalId]/page.tsx` | Codebase |
| 3 | SubmittalDetailClient — tabs and layout | `frontend/src/features/submittals/submittal-detail-client.tsx` | Codebase |
| 4 | SubmittalFormDialog — form fields and schema | `frontend/src/features/submittals/submittal-form-dialog.tsx` | Codebase |
| 5 | Table column definitions and filters | `frontend/src/features/submittals/submittals-table-config.tsx` | Codebase |
| 6 | Submittals GET/POST API route | `frontend/src/app/api/projects/[projectId]/submittals/route.ts` | Codebase |
| 7 | Submittal GET/PUT/DELETE API route | `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts` | Codebase |
| 8 | Procore manifest — create form fields | `.claude/procore-manifests/submittals/manifest.json` | Manifest |
| 9 | Submittals guided scenarios | `docs/testing/submittals-scenarios.md` | Testing |
| 10 | About Submittals — Procore overview | https://v2.support.procore.com/process-guides/about-submittals | Procore |
| 11 | Create a Submittal — Procore tutorial | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/create-a-submittal | Procore |
| 12 | Edit a Submittal — Procore tutorial | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/edit-a-submittal | Procore |
| 13 | Delete a Submittal — Procore tutorial | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/delete-a-submittal | Procore |
| 14 | Distribute a Submittal — Procore tutorial | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/distribute-a-submittal | Procore |
| 15 | Permissions Matrix — Submittals | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-submittals-permissions | Procore |
| 16 | Submittal Packages — Procore overview | https://v2.support.procore.com/process-guides/about-submittal-packages | Procore |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
