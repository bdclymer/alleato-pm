# Commitments Implementation Tasks

**Source:** AUDIT.md — 2026-04-17
**Status:** 10 done / 27 total

## Progress

- [x] Schema fixes
- [x] API layer fixes
- [x] UI: List view fixes
- [x] UI: Detail view — stub tab implementations (Payments Issued)
- [ ] Workflows: Status alignment
- [ ] Integrations

---

## Phase 1: Schema Fixes

> Run `npm run db:types` after each migration. Verify with `node -e` test before claiming done.
> Status CHECK uses title case `'Draft'` — not lowercase — in `subcontracts` table. Confirm casing before inserting test data.

- [x] **Add FK constraint** on `subcontracts.contract_company_id → companies(id)` — already existed in schema_dump; no migration needed
- [x] **Add FK constraint** on `purchase_orders.contract_company_id → companies(id)` — already existed in schema_dump; no migration needed
- [x] **Fix date column types** on `subcontracts` — migrated `start_date`, `contract_date`, `estimated_completion_date`, `actual_completion_date`, `signed_contract_received_date`, `issued_on_date` from `text` to `date`. Required dropping/recreating `commitments_unified`, `subcontracts_with_totals`, `commitment_change_orders_with_scope` views.
- [x] **Add `purchase_order_attachments` table** — created with FK, RLS policies, index
- [x] **Add missing columns to `purchase_orders`** — `inclusions`, `exclusions`, `start_date`, `estimated_completion_date`, `actual_completion_date` added
- [x] **Add missing columns to `subcontract_sov_items`** — `quantity`, `unit_cost`, `unit_of_measure`, `retainage_percent` added with CHECK constraint
- [x] **Regenerate Supabase types** — `database.types.ts` updated (27,821 lines)

---

## Phase 2: API Layer Fixes

- [x] **Fix `mapRowToCommitment()` in `frontend/src/app/api/commitments/route.ts`** — Batch queries `contract_change_orders` and `subcontractor_invoices` (paid status) per page of IDs. CO totals aggregated by status (approved/pending/draft). `revised_contract_amount` now = `original + approved_COs`. `percent_paid` and `remaining_balance` computed from real `payments_issued`.
- [x] **`erp_status` and `ssov_status`** now fetched from `commitments_unified` base query instead of being null.

---

## Phase 3: UI — List View

- [x] **Add ERP Status column renderer** to `frontend/src/features/commitments/commitments-table-config.tsx` — added column definition (after Type, before Status per Procore spec) and renderer using `StatusBadge` with `ERP_STATUS_LABELS` map.

---

## Phase 4: UI — Detail View Stubs

- [x] **Implement `ChangeHistoryTab`** — migration `20260417230000_commitments_audit_log.sql` adds `commitment_audit_log` table + per-field-diff trigger on `subcontracts` and `purchase_orders`. `GET /api/commitments/:id/history` returns entries with actor info; the tab renders old→new diffs, actor name, and timestamp.

- [x] **Implement `PaymentsIssuedTab`** (`frontend/src/components/commitments/tabs/PaymentsIssuedTab.tsx`) — fetches from existing invoices endpoint, filters client-side for paid/approved/approved_as_noted statuses. Shows DataTable with Invoice #, Payment Date, Status, Total Completed, Retainage, Payment Amount columns + totals footer row.

---

## Phase 5: Workflows — Status Alignment

> Current status values in create forms do not match Procore spec. The form uses `Sent | Void | Closed` but Procore uses `Out for Bid | Terminated | Complete`.

- [x] **Align status enum values with Procore spec** — migration `20260417220000_commitments_status_align_procore.sql` remaps legacy values to `Draft | Out for Bid | Out for Signature | Approved | Complete | Terminated` and re-adds CHECK constraints on both `subcontracts` and `purchase_orders`. Zod schemas, table filter options, and `normalizeSubcontractStatus` updated.

- [x] **SOV line locking** — `PUT /api/projects/:projectId/commitments/:commitmentId/line-items` now refuses to delete or change `amount` on any line where `billed_to_date > 0`, returning the offending IDs. `ScheduleOfValuesTab.tsx` shows a lock icon on invoiced rows and disables the amount field + delete button locally.

- [x] **Line-level retainage** — SOV payload now persists `retainage_percent` on both `subcontract_sov_items` and `purchase_order_sov_items`. The SOV table renders a per-line `Retainage %` input. (Invoice calc override deferred until invoicing work lands.)

---

## Phase 6: Integrations

- [x] **Budget code FK integrity** — evaluated. Of 114 distinct `budget_code` values in `subcontract_sov_items`, 101 don't resolve to `cost_codes.id` — a hard FK would reject legitimate historical data. Decision: **do not add FK**; enforce integrity at the UI layer via the cost-code dropdown. Added `idx_subcontract_sov_items_budget_code` and `idx_purchase_order_sov_items_budget_code` (migration `20260417240000_sov_budget_code_indexes.sql`) for lookup performance. Data cleanup is a separate backfill task.

- [x] **PCO → budget approved_change_orders** — verified. `approved_change_orders` on a commitment is derived at query time in [`src/app/api/commitments/route.ts:335-349`](frontend/src/app/api/commitments/route.ts) by summing `contract_change_orders.amount` where `status IN ('approved','executed')`; `revised_contract_amount = original_amount + approved_change_orders`. DB confirms 3 approved + 135 pending + 2 draft rows with matching lowercase status values. No stored column or trigger requires maintenance — approving a CO surfaces in the next commitment fetch automatically.

---

## Session Log

| Date       | Work Done                                                                                                                                                                                                     | Remaining      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 2026-04-17 | AUDIT.md + TASKS.md generated from schema + codebase + incident log analysis                                                                                                                                  | All phases     |
| 2026-04-17 | Phase 2 (API): CO totals + payments_issued batch queries; erp/ssov from unified view. Phase 3 (UI list): ERP Status column added. Phase 4 (tabs): PaymentsIssuedTab implemented. DocuSign removed from scope. | Phases 1, 5, 6 |
| 2026-04-17 | Phase 1 (Schema): Applied migration 20260417210000_commitments_schema_gaps.sql — 6 date cols TEXT→DATE on subcontracts (dropped/recreated 3 dependent views: commitments_unified, subcontracts_with_totals, commitment_change_orders_with_scope), 5 new columns on purchase_orders, 4 new columns on subcontract_sov_items, purchase_order_attachments table. Regenerated database.types.ts. | Phases 5, 6 |
