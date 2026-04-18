# Prime Contracts — Audit Report

**Date:** 2026-04-17
**PRP:** PRPs/prime-contracts/prp-prime-contracts.md
**Audited by:** prp-audit (official skill)

---

## Summary

- ✅ Fully implemented: 42 items
- 🟡 Partially implemented: 11 items
- 🔴 Not implemented: 9 items
- ⚠️ Schema gaps / issues: 6 items

The core CRUD loop (create, list, edit, detail), financial summary panel, SOV line items, Change Orders tab, Invoices tab, Payments tab, Financial Markup, and Advanced Settings are all functional. The main gaps are: ERP Status column + filter missing from list view, Schedule of Values embedded in General tab instead of its own tab, `out_for_bid` status exists in our code but not in Procore, `allowed_user_ids` / non-admin access list has no DB column or UI, column label mismatches on 6 list columns, Related Items tab absent, and Emails/Change History tabs are stubs.

---

## Database Schema

### Tables Found

| Table | Status | Notes |
|-------|--------|-------|
| `prime_contracts` | ✅ Exists | 30 columns; `project_id` is `bigint` (correct — matches `projects.id`) |
| `prime_contract_change_orders` | ✅ Exists | 32 columns; `project_id` is `integer` (⚠️ should be `bigint`) |
| `prime_contract_payments` | ✅ Exists | 14 columns; `project_id` is `integer` (⚠️ minor type width vs `bigint`) |
| `prime_contract_payment_applications` | ✅ Exists | Owner invoices (not fully audited here) |
| `prime_contract_line_items` | ⚠️ Not confirmed | Schema query returned 0 rows — API routes exist but table may have a different name; requires verification |

### Schema Gaps

| Issue | Severity | Required By |
|-------|----------|-------------|
| `prime_contracts.erp_status` column absent | 🔴 Critical | List view ERP Status column + filter |
| `prime_contracts.allowed_user_ids` column absent | 🔴 Critical | Contract privacy: non-admin user access list |
| `prime_contracts.allow_sov_view` column absent | 🟡 Moderate | Contract privacy: SOV visibility for non-admin users |
| `prime_contract_status_v2` enum includes `out_for_bid` | 🔴 Critical | Does NOT exist in Procore Prime Contracts; must be removed |
| `prime_contract_change_orders.status` is plain `text`, not enum | 🟡 Moderate | Should use `prime_contract_co_status` enum (`draft`, `pending`, `approved`, `rejected`, `void`) |
| `prime_contract_change_orders` has both `contract_id` and `prime_contract_id` FKs | 🟡 Moderate | Duplicate FK to `prime_contracts.id`; `prime_contract_id` should be canonical |

### FK Type Check

| Column | Actual Type | Expected Type | Match? |
|--------|-------------|---------------|--------|
| `prime_contracts.project_id` | `bigint` | `bigint` (projects.id) | ✅ |
| `prime_contract_change_orders.project_id` | `integer` | `bigint` (projects.id) | ⚠️ Width mismatch |
| `prime_contract_payments.project_id` | `integer` | `bigint` (projects.id) | ⚠️ Width mismatch |
| `prime_contracts.client_id` | `uuid` | `uuid` (companies.id) | ✅ |
| `prime_contracts.contractor_id` | `uuid` | `uuid` (companies.id) | ✅ |
| `prime_contracts.architect_engineer_id` | `uuid` | `uuid` (companies.id) | ✅ |

---

## List View

| Requirement | Status | Notes |
|-------------|--------|-------|
| Column: Number | ✅ | `contract_number` — clickable link to detail |
| Column: Owner/Client | ✅ | `client_name` |
| Column: Title | ✅ | |
| Column: ERP Status | 🔴 | Not in `primeContractColumns`; no DB column exists |
| Column: Status | ✅ | StatusBadge with color |
| Column: Executed | ✅ | |
| Column: Original Contract Amount | 🟡 | Present but labeled "Original Amount" (Procore: "Original Contract Amount") |
| Column: Approved Change Orders | 🟡 | Present but labeled "Approved COs" (Procore: "Approved Change Orders") |
| Column: Revised Contract Amount | 🟡 | Present but labeled "Revised Amount" (Procore: "Revised Contract Amount") |
| Column: Pending Change Orders | 🟡 | Present but labeled "Pending COs" (Procore: "Pending Change Orders") |
| Column: Draft Change Orders | 🟡 | Present but labeled "Draft COs" (Procore: "Draft Change Orders") |
| Column: Invoiced | ✅ | `invoiced_amount` |
| Column: Payments Received | 🟡 | Present but `defaultVisible: false` — should be visible by default per Procore |
| Column: % Paid | 🟡 | Present but `defaultVisible: false` — should be visible by default |
| Column: Remaining Balance Outstanding | 🟡 | Present as "Balance", `defaultVisible: false` — label and visibility wrong |
| Column: Private | ✅ | `is_private`, defaultVisible: false (acceptable) |
| Column: Attachments (count) | 🔴 | Not in table config |
| Filter: Owner/Client | ✅ | |
| Filter: ERP Status | 🔴 | Missing |
| Filter: Status | ✅ | |
| Filter: Executed | ✅ | |
| Toolbar: Create | ✅ | |
| Toolbar: Export | ✅ | CSV export |
| Toolbar: Configure columns | 🟡 | Column toggle in UnifiedTablePage; no separate Configure button |
| Row action: View (click row) | ✅ | Number cell links to detail |
| Row action: Edit | ✅ | |
| Row action: Delete | ✅ | With confirmation dialog |
| Bulk delete | ✅ | |
| Expandable sub-rows (PCCOs + PCOs) | ✅ | Lazy-loaded with caching |
| Footer totals row | ✅ | 8 financial columns have totals |

---

## Create / Edit Form

| Requirement | Status | Notes |
|-------------|--------|-------|
| Field: Contract # (text) | ✅ | |
| Field: Owner/Client (company select) | ✅ | `client_id` FK to companies |
| Field: Title (text) | ✅ | |
| Field: Status (select) | 🟡 | Present but includes `out_for_bid` which doesn't exist in Procore |
| Field: Executed (boolean, required) | ✅ | |
| Field: Default Retainage % | ✅ | `retention_percentage` |
| Field: Contractor (company select) | ✅ | `contractor_id` |
| Field: Architect/Engineer (company select) | ✅ | `architect_engineer_id` |
| Field: Description (rich text) | ✅ | |
| Field: Attachments (file upload) | ✅ | |
| Field: Inclusions (rich text) | ✅ | |
| Field: Exclusions (rich text) | ✅ | |
| Field: Start Date | ✅ | `start_date` |
| Field: Estimated Completion Date | 🟡 | Stored as `end_date`; label mismatch |
| Field: Substantial Completion Date | ✅ | |
| Field: Actual Completion Date | ✅ | |
| Field: Signed Contract Received Date | ✅ | |
| Field: Contract Termination Date | ✅ | |
| Field: Private (checkbox) | ✅ | `is_private` |
| Field: Access for Non-Admin Users (multi-select) | 🔴 | No `allowed_user_ids` DB column; field absent from form |
| Field: Allow SOV View (checkbox) | 🔴 | No `allow_sov_view` DB column; field absent from form |

---

## Detail View

| Requirement | Status | Notes |
|-------------|--------|-------|
| Tab: General | ✅ | Form fields + Contract Summary financial panel |
| Tab: Schedule of Values | 🟡 | SOV table exists but embedded in the General/Overview tab, not its own tab |
| Tab: Change Orders | ✅ | PCCOs + PCOs sub-sections; row actions include approve/reject/delete/PDF |
| Tab: Invoices | ✅ | Full payment application CRUD |
| Tab: Payments Received | ✅ | Columns mostly match Procore (note: ERP Status column absent from payments table too) |
| Tab: Related Items | 🔴 | Missing entirely |
| Tab: Emails | 🟡 | Tab exists but is a stub — placeholder icon + "Email history will be displayed here" |
| Tab: Change History | 🟡 | Tab exists but is a stub — placeholder icon + "Change history will be displayed here" |
| Tab: Financial Markup | ✅ | Markup types: insurance, bond, fee, overhead, custom |
| Tab: Advanced Settings | ✅ | CO tier config, retainage, PDF options |
| Contract Summary panel (10 calculated fields) | ✅ | All present and computed from DB view |
| Detail action: Edit | ✅ | Inline via `?edit=1` query param |
| Detail action: Create PCCO | ✅ | |
| Detail action: Create Owner Invoice | ✅ | |
| Detail action: Add Payment | ✅ | |
| Detail action: Export | ✅ | Acumatica ERP sync + export actions |
| Detail action: Delete | ✅ | Admin only |

---

## Workflows & Business Rules

| Requirement | Status | Notes |
|-------------|--------|-------|
| Status: Draft | ✅ | Default on creation |
| Status: Out for Signature | ✅ | `out_for_signature` |
| Status: Approved | ✅ | |
| Status: Complete | ✅ | |
| Status: Terminated | ✅ | |
| Status: Out for Bid | 🔴 | Exists in our enum/code but does NOT exist in Procore Prime Contracts — must be removed |
| Transition: Draft → Out for Signature | ✅ | |
| Transition: Out for Signature → Approved | ✅ | |
| Transition: Draft → Approved | ✅ | |
| Transition: Approved → Complete | ✅ | |
| Transition: Any → Terminated | ✅ | |
| Rule: Approved status required before owner invoices | 🟡 | Not enforced in API or UI |
| Rule: CO tier locked after first CO created | 🟡 | Setting is configurable but no enforcement guard |
| Rule: SOV accounting method locked after line items added | 🟡 | Not enforced |
| Financial calculations (all 8 formulas) | ✅ | Computed by `prime_contract_financial_summary` DB view |

---

## Integrations

| Requirement | Status | Notes |
|-------------|--------|-------|
| Change Events → PCOs → PCCOs flow | ✅ | Change Events tab embedded in Change Orders tab |
| Budget → SOV import | 🟡 | API route `/line-items/import` exists; UI button presence needs browser verification |
| Invoicing (owner invoices / payment applications) | ✅ | Full CRUD |
| ERP (Acumatica) sync | 🟡 | Sync/export actions exist; `erp_status` column missing from `prime_contracts` table so sync status not visible |
| Directory (company selects) | ✅ | All three company FKs wired to company directory |

---

## Known Guardrails (from Incident Log)

1. **🔴 Removing enum values is dangerous** — Before removing `out_for_bid` from `prime_contract_status_v2`, run: `SELECT COUNT(*) FROM prime_contracts WHERE status = 'out_for_bid'`. If any rows exist, migrate them to `draft` first. Reference: `INCIDENT-LOG.md` — enum case sensitivity incident.

2. **🔴 FK type consistency** — `prime_contract_change_orders.project_id` and `prime_contract_payments.project_id` are `integer`; `projects.id` is `bigint`. PostgreSQL allows implicit casting but this is a known source of silent failures. Any new migrations on these tables must use `bigint`. Reference: `INCIDENT-LOG.md` — UUID vs INTEGER FK incident.

3. **🔴 Never claim a Supabase query works without running it** — Verify every new query with `node -e` before marking the task done. TypeScript compiling and the page loading are not evidence. Reference: `INCIDENT-LOG.md` — Direct Costs phantom-fix incident.

4. **🟡 Form FK mismatch** — When `allowed_user_ids` multi-select is implemented, the edit form must inject saved user IDs as synthetic options (users outside the normal scoped set). Follow the pattern in `docs/patterns/form-id-mismatch-prevention.md`.

5. **🟡 Next.js 15 async params** — All new API routes must `await params` before accessing `contractId` or `projectId`. Reference: `INCIDENT-LOG.md` — Next.js 15 params incident.

6. **🟡 Enum case rule** — Status values are lowercase (`draft`, `out_for_signature`, etc.). Before inserting test data, verify: `rg "CHECK.*status" supabase/migrations/`.

---

## Implementation Priority

1. **Remove `out_for_bid` from enum + validation + UI** — Incorrect status that doesn't exist in Procore; any data using it should migrate to `draft`
2. **Add `erp_status` column to `prime_contracts`** — Prerequisite for items 3 and 4
3. **Add ERP Status column to list view** — High-visibility Procore parity gap
4. **Add ERP Status filter** — Dependent on item 2
5. **Fix 6 column labels + 3 visibility defaults** — Low effort, high parity impact
6. **Extract Schedule of Values into its own detail tab** — Major UX parity gap
7. **Add `allowed_user_ids` + `allow_sov_view` schema + form fields** — Privacy feature
8. **Enforce business rules** — Invoice creation gate on Approved; CO tier lock enforcement
9. **Related Items tab** — Required for parity but lower priority
10. **Emails + Change History tabs** — Currently stubs; full implementation is complex
