# Change Events — Procore vs. Alleato Gap Analysis

**Generated:** 2026-03-22
**Manifest:** `.claude/procore-manifests/change-events/manifest.json`
**Verified against live Procore:** Yes (agent-browser)
**Alleato path:** `frontend/src/app/(main)/[projectId]/change-events/`

## Manifest Corrections

Fields/columns found on live Procore page but missing from manifest:
- Expecting Revenue (radio: Yes/No) — found on create form, not in manifest
- Detail tabs: Overview, Commitments (0), Events (0), Change History (20), Advanced Settings — not in manifest
- 29 additional configurable line item columns found via Configure sidebar (Line Aging, Prime PCO Status, Revenue Stage, Revenue Days In Stage, Revenue Stage Status, Revenue In Stage Since, Latest Price, Cost Stage, Cost Days In Stage, Cost Stage Status, Cost In Stage Since, Latest Cost, Over/Under, Budget Stage, Budget Days In Stage, Budget Stage Status, Budget In Stage Since, Budget Modification, Sub Job, Cost Code, Cost Code Tier 1, Cost Code Tier 2, Cost Type, Commitment Status, Request for Quote, Request for Quote Status, Non-Committed Cost)
- List toolbar: Export, Create, RFQs, Recycle Bin, Search, Filters, Classic Summary, Group By, Configure, Add to (disabled), Send Requests for Quote (disabled)
- Filter sidebar groups: Change Event, Detail, Revenue, Cost, Over/Under, Budget, Budget Code Segments

## Executive Summary

| Category | Status | Details |
|----------|--------|---------|
| **List Table Columns** | ⚠️ | 8/12 core columns (67%) — missing CE Number standalone, column groups |
| **Column Groups** | ❌ | 0/3 groups — Alleato uses flat columns, no Change Event/Revenue/Cost grouping |
| **Create Form Fields** | ⚠️ | 10/12 fields (83%) — missing Expecting Revenue radio, scope options differ |
| **Detail Tabs** | ⚠️ | 4/5 tabs — has General, Line Items, Attachments, History, RFQs; missing Advanced Settings; doesn't match Procore tab names exactly |
| **Toolbar Actions** | ⚠️ | 5/11 actions — has Create, Search, Filters; missing Export (list-level), RFQs tab, Recycle Bin, Classic Summary, Group By, Configure |
| **Statuses/Workflow** | ✅ | 7/7 statuses — Open, Pending Approval, Approved, Rejected, Closed, Void, Converted |
| **Auto-Calculated Rows** | ❌ | 0/2 — no Insurance or Fee auto-rows from Prime Contract markup |
| **API Routes** | ✅ | GET, POST, PATCH, DELETE all implemented |
| **Database Schema** | ⚠️ | Missing `estimated_impact` and `notes` in generated types (may exist in DB but types stale) |

**Overall: NEEDS MINOR WORK (~75% complete)**

## List Table Columns

| Procore Column | Column Group | Alleato Status | File | Notes |
|---------------|-------------|----------------|------|-------|
| CE Number - Title | (spanning) | ⚠️ | ChangeEventsTableColumns.tsx | Split into separate `#` and `Title` columns, not combined spanning column |
| Status | Change Event | ✅ | ChangeEventsTableColumns.tsx | Badge with correct status colors |
| Scope | Change Event | ✅ | ChangeEventsTableColumns.tsx | Displays TBD / In Scope / Out of Scope |
| Type | Change Event | ❌ | — | Not in table columns |
| Change Reason | Change Event | ✅ | ChangeEventsTableColumns.tsx | Truncated text |
| Origin | Change Event | ❌ | — | Not in table columns |
| Prime PCO | Revenue | ❌ | — | Not in table columns |
| Prime PCO Title | Revenue | ❌ | — | Not in table columns |
| Cost ROM | Cost | ❌ | — | Not in table columns (has `estimated_impact` instead) |
| RFQ Title | Cost | ❌ | — | Not in table columns |
| Commitment | Cost | ❌ | — | Not in table columns |
| Commitment Title | Cost | ❌ | — | Not in table columns |

**Alleato extra columns not in Procore list view:** `Estimated Impact` (custom field), `Created` (date)

## Create Form Fields

| Procore Field | Type | Required | Alleato Status | Notes |
|--------------|------|----------|----------------|-------|
| Number | text | No | ✅ | Auto-generated server-side, optional override |
| Title | text | Yes | ✅ | |
| Status | select | No | ✅ | Options: Open, Pending, Close, Void (client-side enum) |
| Origin | select | No | ✅ | Options differ: Alleato has Internal, RFI, Field, Emails, Meetings; Procore has different set |
| Type | select | No | ✅ | Options: Allowance, Contingency, Owner Change, TBD, Transfer + more |
| Change Reason | select | No | ✅ | Options: Allowance, Backcharge, Client Request, Design Development, etc. |
| Scope | select | No | ✅ | Options: TBD, In Scope, Out of Scope (+ Allowance in Alleato only) |
| Expecting Revenue | radio | No | ✅ | Boolean field `expectingRevenue`, defaults true |
| Line Item Revenue Source | select | No | ✅ | 3 options: Match Revenue to Latest Cost, Enter manually, Quantity x Unit Cost |
| Prime Contract for Markup Estimates | select | No | ✅ | `primeContractId` field — type mismatch: create uses number, update uses UUID |
| Description | richtext | No | ✅ | TextareaField (not full rich text editor like Procore's TinyMCE) |
| Attachments | file | No | ✅ | File upload with drag & drop |

**Alleato extra form fields not in Procore:** `Estimated Impact` (number), `Notes` (textarea) — neither exists in Procore's create form

## Detail Tabs

| Procore Tab | Alleato Equivalent | Status |
|------------|-------------------|--------|
| Overview | "General" tab | ⚠️ | Different name; Procore shows Overview with counts |
| Commitments | — | ❌ | Not implemented as a tab |
| Events | — | ❌ | Not implemented as a tab |
| Change History | "History" tab | ✅ | Timeline of CREATE/UPDATE entries |
| Advanced Settings | — | ❌ | Not implemented |

**Alleato extra tabs:** Line Items (separate tab), Attachments (separate tab), RFQs (separate tab)
**Procore layout:** General Info + Line Items on same page, not separate tabs

## Detail Page Actions

| Procore Action | Type | Alleato Status | Notes |
|---------------|------|----------------|-------|
| Edit | button | ✅ | Opens inline edit mode when status is open/rejected |
| Export | button | ⚠️ | Exists on list page but not on detail page |
| More Options | dropdown | ❌ | Not implemented on detail |
| Conversations | link | ❌ | Not implemented |
| Add to (Commitment/PCO) | dropdown | ⚠️ | Exists but disabled ("coming soon") |
| Send Requests for Quote | button | ✅ | Opens RFQ form in Sheet |

## Status Workflow

| Procore Status | Alleato Status | In DB | In UI | Notes |
|---------------|---------------|-------|-------|-------|
| Open | Open | ✅ | ✅ | Default status |
| Pending Approval | Pending Approval | ✅ | ✅ | Via "Submit for Approval" |
| Approved | Approved | ✅ | ✅ | Via approve action |
| Rejected | Rejected | ✅ | ✅ | Via reject action |
| Closed | Closed | ✅ | ✅ | Via close action |
| Void | Void | ✅ | ✅ | In validation schema |
| Converted | Converted | ✅ | ✅ | Via convert dialog |

## Auto-Calculated Rows

| Procore Auto-Row | Logic | Alleato Status | Notes |
|-----------------|-------|----------------|-------|
| Insurance | % from Prime Contract markup settings | ❌ | Not implemented |
| Fee | % from Prime Contract markup settings | ❌ | Not implemented |

## API Routes

| Method | Route | Exists | Notes |
|--------|-------|--------|-------|
| GET | /api/projects/[projectId]/change-events | ✅ | With filters, pagination, search |
| POST | /api/projects/[projectId]/change-events | ✅ | With validation, auto-number |
| GET | /api/projects/[projectId]/change-events/[id] | ✅ | Detail with line items, history |
| PATCH | /api/projects/[projectId]/change-events/[id] | ✅ | Update fields |
| DELETE | /api/projects/[projectId]/change-events/[id] | ✅ | Soft delete |
| POST | /api/projects/[projectId]/change-events/[id]/line-items | ✅ | Add line items |
| POST | /api/projects/[projectId]/change-events/[id]/attachments | ✅ | Upload attachments |
| GET/POST | /api/projects/[projectId]/change-events/rfqs | ✅ | RFQ management |

## Database Schema Gaps

| Required Column | Type | Exists | Notes |
|----------------|------|--------|-------|
| id | uuid | ✅ | |
| project_id | integer | ✅ | FK to projects |
| number | text | ✅ | |
| title | text | ✅ | |
| type | text | ✅ | |
| status | text | ✅ | |
| scope | text | ✅ | |
| origin | text | ✅ | Nullable |
| reason | text | ✅ | Nullable |
| description | text | ✅ | Nullable |
| expecting_revenue | boolean | ✅ | |
| line_item_revenue_source | text | ✅ | Nullable |
| prime_contract_id | integer | ✅ | FK to contracts |
| estimated_impact | decimal | ❌ | Used in frontend but not in generated types |
| notes | text | ❌ | Used in frontend but not in generated types |

## Code Quality Issues

| Issue | Severity | File | Notes |
|-------|----------|------|-------|
| `primeContractId` type mismatch | HIGH | validation.ts | Create uses `z.coerce.number()`, update uses `z.string().uuid()` |
| `estimated_impact`/`notes` ghost columns | HIGH | Multiple files | Referenced everywhere but not in DB types |
| Client enum ≠ API enum | MEDIUM | ChangeEventForm.tsx vs validation.ts | Form uses lowercase, API uses Title Case |
| Attachments tab never fetches | MEDIUM | [changeEventId]/page.tsx | State initialized empty, no fetch call |
| Two separate column config files | LOW | ChangeEventsTableColumns.tsx vs features/ | Legacy file still exists |

## Missing Functionality (Prioritized)

### HIGH Impact
- [ ] Add Insurance and Fee auto-calculated rows to line items (COMPLEX — requires Prime Contract markup config, Revenue ROM × markup %, separate implementation plan needed)
- [x] Fix `primeContractId` type mismatch between create and update schemas
- [x] Verify `estimated_impact` and `notes` columns exist in DB — confirmed NOT in DB, removed ghost references from 8 files
- [x] Add missing list columns: Type, Origin added with renderers + filter; Prime PCO/Cost ROM/Commitment deferred (need line item aggregation)
- [ ] Implement column groups in list table: Change Event, Revenue, Cost (DEFERRED — requires UnifiedTablePage enhancement, affects all tools)

### MEDIUM Impact
- [x] Add Commitments tab to detail page (placeholder — no linked commitments data yet)
- [x] Add Events tab to detail page (placeholder — no related events data yet)
- [x] Add Advanced Settings tab to detail page (shows Expecting Revenue, Revenue Source, Prime Contract)
- [x] Fix attachments tab — implement fetch on page load
- [x] Add Export button to detail page
- [x] Add More Options dropdown to detail page (Copy ID, Delete)
- [ ] Enable "Add to" dropdown (DEFERRED — requires Commitment CO and Prime Contract PCO API integration)
- [ ] Add Classic Summary view option (DEFERRED — requires new summary component with financial aggregation)
- [ ] Add Column Group By functionality (DEFERRED — requires UnifiedTablePage enhancement)
- [ ] Add Configure columns functionality (DEFERRED — requires UnifiedTablePage column visibility UI)
- [ ] Add Recycle Bin access (DEFERRED — requires soft-delete list view with restore)

### LOW Impact
- [ ] Match Procore's combined "CE Number - Title" spanning column format
- [ ] Add Description column to line items grid (currently text-only, Procore shows rich text)
- [ ] Match Procore's detail page layout (General Info + Line Items on same page, not separate tabs)
- [ ] Add Conversations integration to detail page
- [x] Remove non-Procore fields: `estimated_impact`, `notes` — removed in HIGH #3
- [ ] Add all 29 configurable line item columns (Line Aging, Revenue Stage, Cost Stage, etc.)
