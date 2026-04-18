# Prime Contracts — Implementation Tasks

**Source:** AUDIT.md — 2026-04-17 (official prp-audit)
**Status:** 13 done / 28 total

## Progress

- [x] Phase 1: Schema changes (partial — see notes)
- [x] Phase 2: API layer (partial — erp_status filter added; allowed_user_ids access control pending)
- [x] Phase 3: UI — List view (labels, visibility, ERP Status column + filter done; Attachments column pending)
- [x] Phase 4: UI — Forms (out_for_bid removed; allowed_user_ids + allow_sov_view fields pending)
- [x] Phase 5: UI — Detail view (SOV tab extracted; Related Items stub added; Emails + History stubs remain)
- [ ] Phase 6: Workflows / business rules
- [ ] Phase 7: Integrations
- [ ] Phase 8: Testing

---

## Phase 1: Schema

> ⚠️ Run `npm run db:types` after every migration. Verify FK types match before writing code.

- [ ] **Verify `prime_contract_line_items` table name** — Schema query returned 0 rows but API routes exist. Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE '%line_item%'`. Identify the actual table name and update AUDIT.md.

- [x] **Remove `out_for_bid` from `prime_contract_status_v2` enum** — Done 2026-04-18. Row count was 0. Migration `20260418010000_prime_contracts_schema_gaps.sql` replaced enum with `prime_contract_status_v3` (sans `out_for_bid`), then renamed. Also removed from all frontend types, forms, API validation, and hooks.

- [x] **Add `erp_status` column to `prime_contracts`** — Done 2026-04-18 in `20260418010000_prime_contracts_schema_gaps.sql`. Column: `text NOT NULL DEFAULT 'unsynced' CHECK (erp_status IN ('unsynced', 'synced', 'error'))`. Also added to `prime_contract_financial_summary` view. Index added.

- [x] **Add `allowed_user_ids` column to `prime_contracts`** — Done 2026-04-18 in `20260418010000_prime_contracts_schema_gaps.sql`. Column: `uuid[] NOT NULL DEFAULT '{}'`.

- [x] **Add `allow_sov_view` column to `prime_contracts`** — Done 2026-04-18 in `20260418010000_prime_contracts_schema_gaps.sql`. Column: `boolean NOT NULL DEFAULT false`.

- [ ] **Fix `prime_contract_change_orders.project_id` type width** (optional / low risk)
  - Currently `integer`; `projects.id` is `bigint`. PostgreSQL allows implicit cast but should be standardized.
  - Only attempt if no downstream FK constraints block it. Check first.

---

## Phase 2: API Layer

> ⚠️ After schema changes, regenerate types: `npm run db:types`
> ⚠️ Test every new query with `node -e` before marking done. See `INCIDENT-LOG.md`.

- [x] **Update GET `/contracts` and GET `/contracts/[contractId]` to include `erp_status`** — Done 2026-04-18. `erp_status` is returned from `prime_contracts.*` select. Zod schema in `prime-contracts.ts` updated.

- [ ] **Update PUT `/contracts/[contractId]` to accept `allowed_user_ids` and `allow_sov_view`**
  - File: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/route.ts`
  - Add fields to validation schema and to the UPDATE query

- [x] **Update GET `/contracts` to support ERP Status filter** — Done 2026-04-18. Added `erp_status` query param validation + filter in `route.ts`.

- [x] **Remove `out_for_bid` from validation schema** — Done 2026-04-18. Removed from `validation.ts` `contractStatusSchema`.

---

## Phase 3: UI — List View

> Files: `frontend/src/features/prime-contracts/prime-contracts-table-config.tsx`

- [x] **Add ERP Status column** — Done 2026-04-18. Added at index 3 (after title, before status). `ERP_STATUS_LABELS` map added. Renders `<StatusBadge>`. `defaultVisible: true`.

- [ ] **Add Attachments count column**
  - Add `attachments` column after `is_private`
  - Show count of attachments (number or icon with count)
  - Set `defaultVisible: false`

- [x] **Fix column labels to match Procore exactly** — Done 2026-04-18.
  - "Original Amount" → "Original Contract Amount" ✓
  - "Approved COs" → "Approved Change Orders" ✓
  - "Revised Amount" → "Revised Contract Amount" ✓
  - "Pending COs" → "Pending Change Orders" ✓
  - "Draft COs" → "Draft Change Orders" ✓
  - "Payments" → "Payments Received" ✓
  - "Balance" → "Remaining Balance Outstanding" ✓

- [x] **Fix column visibility defaults** — Done 2026-04-18.
  - `payments_received`: `defaultVisible: true` ✓
  - `percent_paid`: `defaultVisible: true` ✓
  - `remaining_balance`: `defaultVisible: true` ✓

- [x] **Add ERP Status filter** — Done 2026-04-18. Added `erp_status` filter to `primeContractFilters`. API filter support added in Phase 2.

- [x] **Remove `out_for_bid` from STATUS_LABELS** — Done 2026-04-18. Removed from `prime-contracts-table-config.tsx`.

---

## Phase 4: UI — Forms

> File: `frontend/src/components/domain/contracts/ContractForm.tsx`

- [x] **Remove `out_for_bid` from status dropdown options** — Done 2026-04-18. Removed from `ContractForm.tsx` `CONTRACT_STATUSES`.

- [ ] **Fix "Estimated Completion Date" label**
  - The column is `end_date` but should be labeled "Estimated Completion Date" consistently throughout form and detail view

- [ ] **Add Access for Non-Admin Users multi-select**
  - Conditionally render when `is_private` is checked
  - Multi-select of project users (load from `/api/projects/[projectId]/members` or similar)
  - Write to `allowed_user_ids` column
  - ⚠️ GUARDRAIL: On edit, inject saved user UUIDs as synthetic options — users may be outside the currently-scoped list. See `docs/patterns/form-id-mismatch-prevention.md`.

- [ ] **Add Allow SOV View checkbox**
  - Conditionally render below the non-admin users multi-select (when `is_private` is checked)
  - Label: "Allow these non-admin users to view the SOV items"
  - Write to `allow_sov_view` column

---

## Phase 5: UI — Detail View

> File: `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx`

- [x] **Extract Schedule of Values into its own tab** — Done 2026-04-18.
  - Created `PrimeContractSovTab.tsx` in `prime-contract-detail/`
  - Added "Schedule of Values" tab between "General" and "Change Orders"
  - SOV table + editing fully extracted; Financial Summary panel remains in General tab
  - Exported from `index.ts`; wired in `page.tsx` with all SOV props

- [x] **Add Related Items tab** — Done 2026-04-18. Stub tab added between "Payments Received" and "Emails". `ContractTab` type extended.

- [ ] **Implement Emails tab**
  - Currently a stub — replace placeholder with real email correspondence list
  - Can be deferred as stub if email threading is not yet implemented project-wide

- [ ] **Implement Change History tab**
  - Currently a stub — replace with audit log of all changes to this contract record
  - Query from a change history or audit_log table if available; otherwise defer

---

## Phase 6: Workflows / Business Rules

- [ ] **Enforce: Contract must be Approved before owner invoices can be created**
  - In the Invoices tab "Create Invoice" button: disable with tooltip if status ≠ 'approved'
  - In the API route POST `/contracts/[contractId]/payment-applications`: return 422 if contract status ≠ 'approved'

- [ ] **Enforce: CO tier cannot change after first CO is created**
  - In `PrimeContractAdvancedSettingsTab`: query CO count; if > 0, render `co_tier_count` as read-only with a tooltip explaining the lock
  - In the API route PUT `/contracts/[contractId]/advanced-settings`: return 422 if `co_tier_count` is being changed and any COs exist

- [ ] **Verify SOV import from Budget is functional**
  - Navigate in browser to Schedule of Values → check for "Import from Budget" button
  - Test: lock a budget, then attempt import — verify SOV line items are created
  - File: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/import/route.ts`

---

## Phase 7: Integrations

- [ ] **Display `erp_status` on detail view header**
  - Show ERP Status badge in the contract header/summary area (next to Status badge)
  - Dependent on: Phase 1 schema + Phase 2 API updates

- [ ] **Wire `allowed_user_ids` to access control on API**
  - GET `/contracts` and GET `/contracts/[contractId]`: if `is_private = true`, only return the contract to users whose UUID is in `allowed_user_ids` (or is an admin)
  - This requires auth context in the API routes

---

## Phase 8: Testing

- [ ] See `PRPs/prime-contracts/TEST-SCENARIOS.md` (run `/prp:prp-test-scenarios prime-contracts` to generate)

---

## Session Log

| Date | Work Done | Remaining |
|------|-----------|-----------|
| 2026-04-17 | Official prp-audit ran with schema queries, codebase analysis, incident log review. AUDIT.md + TASKS.md written. | All 28 tasks pending. |
| 2026-04-18 | prp-execute ran. Completed 13 tasks: DB migration (`erp_status`, `allowed_user_ids`, `allow_sov_view`, remove `out_for_bid` from enum); 7 column label fixes + 3 visibility defaults; ERP Status column + filter; `out_for_bid` removed from all frontend files (types, forms, hooks, API validation); SOV tab extracted into `PrimeContractSovTab`; Related Items stub tab added. | 15 tasks remaining (Attachments column, `allowed_user_ids` form field, `allow_sov_view` form field, PUT API update, business rule enforcement, ERP status on detail header, access control API guard, emails/history implementation, end_date label fix, FK type width fix, line_items table name verification, CO tier 3, tests). |
