# Change Events Implementation Tasks

**Source:** AUDIT.md — 2026-04-17  
**Prior completion:** 89% (2026-03-30 verification run — deployment gate PASS)  
**Status:** 15 done / 3 remaining (deferred: contract_id FK fix, Budget/Observations/Meetings cross-tool integrations)

---

## Progress

- [x] Phase 1: Schema changes (latest_price column migrated, DB types updated)
- [x] Phase 2: RFQs detail tab
- [x] Phase 3: Revenue ROM auto-calculation
- [x] Phase 4: Latest Price column
- [x] Phase 5: Add to Budget Change (budget_changes table, GET/POST API, AddToBudgetChangeDialog, wired in list + detail)
- [x] Phase 6: UX gaps (Send RFQs row action, Allowance scope filter, New PO/Sub changeEventId, Link to existing CO)
- [x] Phase 7: Cross-tool integrations (RFI → Create Change Event done; Budget/Observations/Meetings deferred)
- ~~Phase 8: Testing~~ — owned by separate testing skill

---

## Phase 1: Schema

- [x] Add `latest_price` column to `change_event_line_items`
  - Migration: `ALTER TABLE change_event_line_items ADD COLUMN latest_price numeric;`
  - Populate when a line item is linked to a Prime PCO (from `prime_contract_pcos.total_amount` or SOV line)
  - DB types manually updated in database.types.ts

- [ ] Fix `change_event_line_items.contract_id` FK target
  - Currently FKs to `prime_contracts` — should support `commitments` (purchase orders + subcontracts)
  - `commitment_id` column already exists on the table — FK just needs to be wired correctly, not contract_id

- [ ] Create `budget_changes` table (only if Budget Changes feature is prioritized)
  - Columns: `id`, `project_id`, `number`, `title`, `status`, `change_event_id`, `budget_line_id`, `amount`, `description`, `created_at`, `updated_at`, `created_by`
  - FK: `change_event_id → change_events.id`, `project_id → projects.id (integer)`

---

## Phase 2: RFQs Tab in Detail View

**Effort: LOW — DB + API already exist**

- [x] Add "RFQs" tab to the detail page (`frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx`)
  - Add `<TabsTrigger value="rfqs">RFQs ({rfqCount})</TabsTrigger>`
  - Create `ChangeEventRfqsTab.tsx` in `frontend/src/components/domain/change-events/`
  - Tab content: fetch from `GET /api/projects/[projectId]/change-events/rfqs?changeEventId=...`
  - Show: RFQ number, title, status badge, assigned company, due date, sent_at, estimated total
  - Include "Send RFQ" button when no RFQs exist (empty state)

- [x] Update `useChangeEventDetail` hook to fetch RFQ count for the tab badge
  - Add `rfqCount` to the hook's return value

---

## Phase 3: Revenue ROM Auto-Calculation

**Effort: MEDIUM — logic needs to be wired in the line items grid**

- [x] Implement auto-calculation in `useChangeEventFormData.ts` + `LineItemRow.tsx`
  - `lineItemRevenueSource` passed from form through LineItemsSection → LineItemRow
  - "Match Revenue to Latest Cost" / "match_cost": costQuantity/costUnitCost change → auto-set revenueRom = costRom
  - "Manual Entry": user edits revenue fields directly (existing behavior preserved)

- [x] Show read-only Revenue ROM when source is not Manual Entry
  - Revenue Qty/Unit Cost cells disabled with muted style when isRevenueReadOnly

---

## Phase 4: Latest Price Column

**Depends on: Phase 1 `latest_price` column migration**

- [x] Add `latest_price` to line items API and types
  - `ChangeEventDetailLineItem` type updated with `latestPrice?: number | null`
  - GET route returns `latestPrice` from DB
  - POST/PATCH routes accept and write `latest_price` field
  - Validation schema updated with `latestPrice` field
  - Note: `ChangeEventLineItemsTable.tsx` already shows a "Latest Price" column using `computeLatestPrice()` which returns `revenueRom`. When `latest_price` is populated in DB it will flow through automatically.

- [x] Update line items API (`line-items/route.ts`) to return `latest_price` in GET response

---

## Phase 5: Add to Budget Change

**Effort: HIGH — requires new table + full flow**

- [x] Create `budget_changes` table (migration applied 2026-04-17)
- [x] Create API endpoint `POST /api/projects/[projectId]/budget-changes`
- [x] Create API endpoint `GET /api/projects/[projectId]/budget-changes`
- [x] Add "New Budget Change" option to "Add to" dropdown in:
  - List view `ChangeEventSelectionBar.tsx`
  - Detail page header actions dropdown
- [x] Create `AddToBudgetChangeDialog.tsx`
- [x] Add "Link to existing Budget Change" option with existing budget changes combobox

---

## Phase 6: UX Gaps

- [x] Add "Send RFQs" as a direct row action in the list view
  - Add to `renderChangeEventRowActions()` in `frontend/src/features/change-events/change-events-table-config.tsx`
  - Currently only accessible when a row is checked via the selection bar

- [x] Add "Allowance" to Scope filter options
  - In `change-events-table-config.tsx`, add `{ value: "allowance", label: "Allowance" }` to `SCOPE_FILTER_OPTIONS`

- [x] "Add to Commitment" → New PO/Subcontract should pre-populate from CE
  - Now passes `?type=purchase_order&changeEventId=${changeEventId}` and `?type=subcontract&changeEventId=${changeEventId}`

- [x] Fix "Link to existing Commitment CO" path in `AddToCommitmentCODialog.tsx`
  - Added "Create new PCO" / "Link to existing PCO" radio toggle at top of dialog
  - "Link to existing" fetches `GET /api/projects/{id}/commitment-pcos?commitment_id=...`
  - Shows scrollable list of existing non-void PCOs; on submit calls add-to-pco with `existing_pco_id`

---

## Phase 7: Cross-Tool Integrations

**Effort: HIGH — requires changes in other tools**

- [x] RFI → Create Change Event
  - `rfi-header-actions.tsx` has "Create Change Event" button
  - POSTs to `/api/projects/${projectId}/change-events` with `title: rfi.subject, origin: "rfis", origin_id: rfi.id`
  - Navigates to new CE detail on success

- [ ] Budget tool: Add CE Cost ROM / Revenue ROM columns to budget view (deferred — budget tool scope)
- [ ] Observations → Create Change Event (deferred — Observations tool scope)
- [ ] Meetings → Create Change Event (deferred — Meetings tool scope)

---

## Phase 8: Testing

~~Removed from scope — owned by separate testing skill (`/prp:prp-test-scenarios change events`).~~

---

## Session Log

| Date | Work Done | Remaining |
|------|-----------|-----------|
| 2026-04-17 | Phase 1: latest_price migration + DB types; Phase 3: Revenue ROM auto-calc (useChangeEventFormData + LineItemRow read-only); Phase 4: latest_price in API routes + ChangeEventDetailLineItem type; Phase 5: budget_changes table + GET/POST API + AddToBudgetChangeDialog + wired in list+detail; Phase 6: changeEventId in New PO/Sub nav, AddToCommitmentCODialog link-to-existing mode; Phase 7: RFI→CE button in rfi-header-actions.tsx | contract_id FK fix (schema), Budget/Observations/Meetings cross-tool (deferred) |
| 2026-04-17 | Phase 2: RFQs tab (ChangeEventRfqsTab.tsx, rfqs GET ?changeEventId filter, rfqCount in hook, tab in detail page); Phase 6 partial: Allowance scope filter + Send RFQs row action | Phase 1 schema, Phase 3 Revenue ROM auto-calc, Phase 4 Latest Price, Phase 5 Budget Changes, remaining Phase 6/7/8 |
| 2026-04-17 | prp-audit completed; AUDIT.md + TASKS.md generated from full schema + code review | All 18 tasks above |
| 2026-03-30 | Add-to-PCO flow, AddToPrimePCODialog, PCO links, prime_contract_change_orders sequence reset | CE RFQs tab, Revenue ROM auto-calc, Budget Changes |
| 2026-03-22 | Gap analysis run; 68% → 89%; parity columns, approval flow | |
| 2026-03-04 | DevAutoFillForms fix; 42 E2E tests pass, 13 skipped | |
