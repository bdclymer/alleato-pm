# Change Events Implementation Tasks

**Source:** AUDIT.md — 2026-04-17  
**Prior completion:** 89% (2026-03-30 verification run — deployment gate PASS)  
**Status:** 0 done / 18 remaining (all are enhancements/gaps, core feature is production-ready)

---

## Progress

- [ ] Phase 1: Schema changes
- [ ] Phase 2: RFQs detail tab
- [ ] Phase 3: Revenue ROM auto-calculation
- [ ] Phase 4: Latest Price column
- [ ] Phase 5: Add to Budget Change
- [ ] Phase 6: UX gaps
- [ ] Phase 7: Cross-tool integrations
- [ ] Phase 8: Testing

---

## Phase 1: Schema

- [ ] Add `latest_price` column to `change_event_line_items`
  - Migration: `ALTER TABLE change_event_line_items ADD COLUMN latest_price numeric;`
  - Populate when a line item is linked to a Prime PCO (from `prime_contract_pcos.total_amount` or SOV line)
  - Run `npm run db:types` after migration

- [ ] Fix `change_event_line_items.contract_id` FK target
  - Currently FKs to `prime_contracts` — should support `commitments` (purchase orders + subcontracts)
  - `commitment_id` column already exists on the table — FK just needs to be wired correctly, not contract_id

- [ ] Create `budget_changes` table (only if Budget Changes feature is prioritized)
  - Columns: `id`, `project_id`, `number`, `title`, `status`, `change_event_id`, `budget_line_id`, `amount`, `description`, `created_at`, `updated_at`, `created_by`
  - FK: `change_event_id → change_events.id`, `project_id → projects.id (integer)`

---

## Phase 2: RFQs Tab in Detail View

**Effort: LOW — DB + API already exist**

- [ ] Add "RFQs" tab to the detail page (`frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx`)
  - Add `<TabsTrigger value="rfqs">RFQs ({rfqCount})</TabsTrigger>`
  - Create `ChangeEventRfqsTab.tsx` in `frontend/src/components/domain/change-events/`
  - Tab content: fetch from `GET /api/projects/[projectId]/change-events/rfqs?changeEventId=...`
  - Show: RFQ number, title, status badge, assigned company, due date, sent_at, estimated total
  - Include "Send RFQ" button when no RFQs exist (empty state)

- [ ] Update `useChangeEventDetail` hook to fetch RFQ count for the tab badge
  - Add `rfqCount` to the hook's return value

---

## Phase 3: Revenue ROM Auto-Calculation

**Effort: MEDIUM — logic needs to be wired in the line items grid**

- [ ] Implement auto-calculation in `ChangeEventLineItemsGrid.tsx` (or `LineItemRow.tsx`)
  - Read `line_item_revenue_source` from the parent change event
  - "Match Revenue to Latest Cost": when `cost_rom` changes → auto-set `revenue_rom = cost_rom`
  - "Manual Entry": user edits `revenue_rom` directly (current behavior — already works)
  - "Match Revenue to Latest Price": when `latest_price` changes → auto-set `revenue_rom = latest_price` (requires Phase 1 first)

- [ ] Show read-only Revenue ROM when source is not Manual Entry
  - Disable the Revenue ROM cell; show computed value with muted style

---

## Phase 4: Latest Price Column

**Depends on: Phase 1 `latest_price` column migration**

- [ ] Add `latest_price` column to line items table display
  - Add to `ChangeEventLineItemsTable.tsx` and `ChangeEventLineItemsGrid.tsx`
  - Value: `cost_rom × (1 + markup_percentage)` from linked Prime PCO; written back to `change_event_line_items.latest_price` when PCO is created via `add-to-pco`

- [ ] Update line items API (`line-items/route.ts`) to return `latest_price` in GET response

---

## Phase 5: Add to Budget Change

**Effort: HIGH — requires new table + full flow**

- [ ] Create `budget_changes` table (see Phase 1)
- [ ] Create API endpoint `POST /api/projects/[projectId]/budget-changes`
- [ ] Create API endpoint `GET /api/projects/[projectId]/budget-changes`
- [ ] Add "New Budget Change" option to "Add to" dropdown in:
  - List view `ChangeEventSelectionBar.tsx`
  - Detail page header actions dropdown
- [ ] Create `AddToBudgetChangeDialog.tsx`
- [ ] Add "Link to existing Budget Change" option with existing budget changes combobox

---

## Phase 6: UX Gaps

- [ ] Add "Send RFQs" as a direct row action in the list view
  - Add to `renderChangeEventRowActions()` in `frontend/src/features/change-events/change-events-table-config.tsx`
  - Currently only accessible when a row is checked via the selection bar

- [ ] Add "Allowance" to Scope filter options
  - In `change-events-table-config.tsx`, add `{ value: "allowance", label: "Allowance" }` to `SCOPE_FILTER_OPTIONS`

- [ ] "Add to Commitment" → New PO/Subcontract should pre-populate from CE
  - Pass `changeEventId` as query param so the commitment create form can read CE line item data

- [ ] Fix "Link to existing Commitment CO" path in `AddToCommitmentCODialog.tsx`
  - "Link to existing" option is missing; add combobox to pick existing Commitment PCO

---

## Phase 7: Cross-Tool Integrations

**Effort: HIGH — requires changes in other tools**

- [ ] RFI → Create Change Event
  - In the RFI detail page, add "Create Change Event" action
  - Pre-populate CE title from RFI title; set `origin = "rfis"`, `origin_id = rfi.id`
  - `change_events.origin_id` column already exists for this purpose

- [ ] Budget tool: Add CE Cost ROM / Revenue ROM columns to budget view (deferred — budget tool scope)
- [ ] Observations → Create Change Event (deferred — Observations tool scope)
- [ ] Meetings → Create Change Event (deferred — Meetings tool scope)

---

## Phase 8: Testing

See `PRPs/change-events/TEST-SCENARIOS.md` (generate with `/prp:prp-test-scenarios change events`)

- [ ] E2E test: RFQs tab displays existing RFQs in detail view
- [ ] E2E test: Revenue ROM auto-updates when cost ROM changes (Match to Latest Cost mode)
- [ ] E2E test: "Send RFQs" row action from list view opens RFQ form
- [ ] E2E test: "Add to Budget Change" creates a budget change linked to CE
- [ ] Unit test: Revenue ROM calculation logic (all 3 modes)
- [ ] Smoke contract: `GET /api/projects/:id/change-events/rfqs` returns correct data

---

## Session Log

| Date | Work Done | Remaining |
|------|-----------|-----------|
| 2026-04-17 | prp-audit completed; AUDIT.md + TASKS.md generated from full schema + code review | All 18 tasks above |
| 2026-03-30 | Add-to-PCO flow, AddToPrimePCODialog, PCO links, prime_contract_change_orders sequence reset | CE RFQs tab, Revenue ROM auto-calc, Budget Changes |
| 2026-03-22 | Gap analysis run; 68% → 89%; parity columns, approval flow | |
| 2026-03-04 | DevAutoFillForms fix; 42 E2E tests pass, 13 skipped | |
