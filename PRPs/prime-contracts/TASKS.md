# Prime Contracts — Implementation Tasks

**Source:** AUDIT.md — 2026-04-17 (official prp-audit)
**Status:** 0 done / 28 total

## Progress

- [ ] Phase 1: Schema changes
- [ ] Phase 2: API layer
- [ ] Phase 3: UI — List view
- [ ] Phase 4: UI — Forms
- [ ] Phase 5: UI — Detail view
- [ ] Phase 6: Workflows / business rules
- [ ] Phase 7: Integrations
- [ ] Phase 8: Testing

---

## Phase 1: Schema

> ⚠️ Run `npm run db:types` after every migration. Verify FK types match before writing code.

- [ ] **Verify `prime_contract_line_items` table name** — Schema query returned 0 rows but API routes exist. Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE '%line_item%'`. Identify the actual table name and update AUDIT.md.

- [ ] **Remove `out_for_bid` from `prime_contract_status_v2` enum**
  - First check: `SELECT COUNT(*) FROM prime_contracts WHERE status = 'out_for_bid'`
  - If 0 rows: create migration to drop enum value
  - If rows exist: `UPDATE prime_contracts SET status = 'draft' WHERE status = 'out_for_bid'` first, then migrate
  - ⚠️ GUARDRAIL: Enum value removal is irreversible. Verify row count before proceeding.

- [ ] **Add `erp_status` column to `prime_contracts`**
  ```sql
  ALTER TABLE prime_contracts
    ADD COLUMN IF NOT EXISTS erp_status text DEFAULT 'unsynced'
    CHECK (erp_status IN ('unsynced', 'synced', 'error'));
  ```

- [ ] **Add `allowed_user_ids` column to `prime_contracts`**
  ```sql
  ALTER TABLE prime_contracts
    ADD COLUMN IF NOT EXISTS allowed_user_ids uuid[] DEFAULT '{}';
  ```

- [ ] **Add `allow_sov_view` column to `prime_contracts`**
  ```sql
  ALTER TABLE prime_contracts
    ADD COLUMN IF NOT EXISTS allow_sov_view boolean NOT NULL DEFAULT false;
  ```

- [ ] **Fix `prime_contract_change_orders.project_id` type width** (optional / low risk)
  - Currently `integer`; `projects.id` is `bigint`. PostgreSQL allows implicit cast but should be standardized.
  - Only attempt if no downstream FK constraints block it. Check first.

---

## Phase 2: API Layer

> ⚠️ After schema changes, regenerate types: `npm run db:types`
> ⚠️ Test every new query with `node -e` before marking done. See `INCIDENT-LOG.md`.

- [ ] **Update GET `/contracts` and GET `/contracts/[contractId]` to include `erp_status`**
  - File: `frontend/src/app/api/projects/[projectId]/contracts/route.ts`
  - Add `erp_status` to SELECT and to the response shape
  - Update Zod schema in `frontend/src/lib/validation/prime-contracts.ts`

- [ ] **Update PUT `/contracts/[contractId]` to accept `allowed_user_ids` and `allow_sov_view`**
  - File: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/route.ts`
  - Add fields to validation schema and to the UPDATE query

- [ ] **Update GET `/contracts` to support ERP Status filter**
  - File: `frontend/src/app/api/projects/[projectId]/contracts/route.ts`
  - Add `erp_status` query param filter (comma-separated values: `unsynced,synced,error`)

- [ ] **Remove `out_for_bid` from validation schema**
  - File: `frontend/src/app/api/projects/[projectId]/contracts/validation.ts`
  - Remove from `z.enum([...])` on the status field

---

## Phase 3: UI — List View

> Files: `frontend/src/features/prime-contracts/prime-contracts-table-config.tsx`

- [ ] **Add ERP Status column**
  - Add `erp_status` to `primeContractColumns` after `title`, before `status`
  - Render with `<StatusBadge>` using values: Unsynced (gray), Synced (green), Error (red)
  - Set `defaultVisible: true`

- [ ] **Add Attachments count column**
  - Add `attachments` column after `is_private`
  - Show count of attachments (number or icon with count)
  - Set `defaultVisible: false`

- [ ] **Fix column labels to match Procore exactly**
  - "Original Amount" → "Original Contract Amount"
  - "Approved COs" → "Approved Change Orders"
  - "Revised Amount" → "Revised Contract Amount"
  - "Pending COs" → "Pending Change Orders"
  - "Draft COs" → "Draft Change Orders"
  - "Balance" → "Remaining Balance Outstanding"

- [ ] **Fix column visibility defaults**
  - `payments_received`: set `defaultVisible: true`
  - `percent_paid`: set `defaultVisible: true`
  - `remaining_balance`: set `defaultVisible: true`

- [ ] **Add ERP Status filter**
  - Add to `primeContractFilters` array
  - Options: Unsynced, Synced, Error
  - Dependent on: Phase 2 API filter support

- [ ] **Remove `out_for_bid` from STATUS_LABELS**
  - Remove `out_for_bid: "Out for Bid"` entry from `prime-contracts-table-config.tsx`

---

## Phase 4: UI — Forms

> File: `frontend/src/components/domain/contracts/ContractForm.tsx`

- [ ] **Remove `out_for_bid` from status dropdown options**
  - Remove "Out for Bid" from the status select field options

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

- [ ] **Extract Schedule of Values into its own tab**
  - Add "Schedule of Values" tab between "General" and "Change Orders" in the `tabs` array
  - Move the SOV table and SOV-related UI from `PrimeContractOverviewTab` into a new `PrimeContractSovTab` component
  - Keep the Contract Summary financial panel in the General tab
  - File to create: `frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractSovTab.tsx`

- [ ] **Add Related Items tab**
  - Add "Related Items" tab to `tabs` array (between Payments Received and Emails)
  - Create `PrimeContractRelatedItemsTab` component
  - Minimum: show links to related RFIs and Submittals for this project (or stub with planned content)

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
