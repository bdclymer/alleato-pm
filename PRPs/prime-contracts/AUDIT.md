# PRP Audit: Prime Contracts

**Phase:** `prp-audit`
**PRP:** `PRPs/prime-contracts/prp-prime-contracts.md`
**Audit Date:** 2026-04-17

---

## Overall Parity Score: 75/100

The core CRUD loop, form fields, and financial summary are in excellent shape. The main gaps are: a missing `Schedule of Values` tab (SOV is embedded in General instead), missing `ERP Status` column, two placeholder tabs with no real content (Emails, Change History), a non-Procore status value (`out_for_bid`), column label mismatches, and missing non-admin user access list persistence.

---

## Gap Analysis

### 1. List View

| # | PRP Requirement | Current State | Gap Severity |
|---|----------------|--------------|-------------|
| 1.1 | `ERP Status` column | **Missing** — not in `primeContractColumns` | 🔴 Critical |
| 1.2 | `Attachments` column (count) | **Missing** — not in table config | 🟡 Moderate |
| 1.3 | `Original Contract Amount` (exact label) | Label is "Original Amount" | 🟢 Minor |
| 1.4 | `Approved Change Orders` (exact label) | Label is "Approved COs" | 🟢 Minor |
| 1.5 | `Revised Contract Amount` (exact label) | Label is "Revised Amount" | 🟢 Minor |
| 1.6 | `Pending Change Orders` (exact label) | Label is "Pending COs" | 🟢 Minor |
| 1.7 | `Draft Change Orders` (exact label) | Label is "Draft COs" | 🟢 Minor |
| 1.8 | `Payments Received` (exact label) | Label is "Payments" — also `defaultVisible: false` | 🟡 Moderate |
| 1.9 | `% Paid` — visible by default | `defaultVisible: false` | 🟡 Moderate |
| 1.10 | `Remaining Balance Outstanding` (exact label) | Label is "Balance", `defaultVisible: false` | 🟡 Moderate |
| 1.11 | `ERP Status` filter | **Missing** — only Status, Executed, Owner/Client filters exist | 🔴 Critical |
| 1.12 | Toolbar: Export button | ✅ Present (CSV export) | — |
| 1.13 | Row actions: Edit, Delete | ✅ Present | — |

**Files:** `frontend/src/features/prime-contracts/prime-contracts-table-config.tsx`

---

### 2. Create/Edit Form

| # | PRP Requirement | Current State | Gap Severity |
|---|----------------|--------------|-------------|
| 2.1 | Contract #, Title, Status | ✅ Implemented | — |
| 2.2 | Owner/Client, Contractor, Architect/Engineer | ✅ Implemented | — |
| 2.3 | Executed (boolean/required) | ✅ Implemented | — |
| 2.4 | Default Retainage % | ✅ Implemented (`retention_percentage`) | — |
| 2.5 | Description (rich text) | ✅ Implemented | — |
| 2.6 | Attachments (file upload) | ✅ Implemented | — |
| 2.7 | Inclusions / Exclusions (rich text) | ✅ Implemented | — |
| 2.8 | All 6 contract date fields | ✅ All implemented | — |
| 2.9 | Private checkbox | ✅ Implemented (`is_private`) | — |
| 2.10 | Access for Non-Admin Users (multi-select) | **DB column missing** — no `accessors` array in schema | 🔴 Critical |
| 2.11 | Allow non-admins to view SOV items (checkbox) | **DB column missing** — no `show_line_items_to_non_admins` in schema | 🟡 Moderate |
| 2.12 | Status: `out_for_bid` option | **Wrong status** — Procore Prime Contracts does NOT have "Out for Bid"; only Commitments has this. Should be removed. | 🔴 Critical |

**Files:** `frontend/src/components/domain/contracts/ContractForm.tsx` (assumed — form referenced from detail page)

---

### 3. Database Schema

| # | PRP Field | DB Column | Status |
|---|-----------|-----------|--------|
| 3.1 | contract_number | `contract_number` | ✅ |
| 3.2 | vendor / Owner/Client | `client_id` → companies | ✅ |
| 3.3 | title | `title` | ✅ |
| 3.4 | status | `status` (enum `prime_contract_status_v2`) | ✅ |
| 3.5 | executed | `executed` (boolean) | ✅ |
| 3.6 | retainage_percent | `retention_percentage` | ✅ |
| 3.7 | contractor | `contractor_id` → companies | ✅ |
| 3.8 | architect | `architect_engineer_id` → companies | ✅ |
| 3.9 | description | `description` | ✅ |
| 3.10 | inclusions | `inclusions` | ✅ |
| 3.11 | exclusions | `exclusions` | ✅ |
| 3.12 | start_date | `start_date` | ✅ |
| 3.13 | est. completion date | `end_date` | ✅ |
| 3.14 | substantial_completion_date | `substantial_completion_date` | ✅ |
| 3.15 | actual_completion_date | `actual_completion_date` | ✅ |
| 3.16 | signed_contract_received_date | `signed_contract_received_date` | ✅ |
| 3.17 | contract_termination_date | `contract_termination_date` | ✅ |
| 3.18 | is_private | `is_private` | ✅ |
| 3.19 | access_policy.accessors (non-admin user list) | **MISSING** — no column | 🔴 Critical |
| 3.20 | access_policy.show_line_items_to_non_admins | **MISSING** — no column | 🟡 Moderate |
| 3.21 | `out_for_bid` status value | Present in enum but **not a Procore Prime Contract status** | 🔴 Critical |

---

### 4. Detail View Tabs

| # | PRP Tab | Current State | Gap Severity |
|---|---------|--------------|-------------|
| 4.1 | General (contract info + Contract Summary) | ✅ Implemented as "General"/"overview" tab | — |
| 4.2 | Schedule of Values (separate tab) | **Missing as separate tab** — SOV is embedded inside the General/Overview tab | 🔴 Critical |
| 4.3 | Change Orders | ✅ Implemented | — |
| 4.4 | Invoices | ✅ Implemented | — |
| 4.5 | Payments Received | ✅ Implemented | — |
| 4.6 | Related Items | **Missing** — no tab exists | 🟡 Moderate |
| 4.7 | Emails | ⚠️ Tab exists but is a **placeholder** (no content) | 🟡 Moderate |
| 4.8 | Change History | ⚠️ Tab exists but is a **placeholder** (no content) | 🟡 Moderate |
| 4.9 | Financial Markup | ✅ Implemented | — |
| 4.10 | Advanced Settings | ✅ Implemented | — |
| 4.11 | **Extra: Commitments tab** | Present but **not in Procore** — this is an Alleato addition | 🟢 Acceptable addition |

**Files:** `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx`

---

### 5. Contract Summary Panel (Calculated Fields)

| # | PRP Field | Current State | Gap Severity |
|---|-----------|--------------|-------------|
| 5.1 | Original Contract Amount | ✅ Present in overview tab | — |
| 5.2 | Approved Change Orders | ✅ Present | — |
| 5.3 | Revised Contract Amount | ✅ Present | — |
| 5.4 | Pending Change Orders | ✅ Present | — |
| 5.5 | Pending Revised Contract Amount | ⚠️ Not confirmed visible in overview — needs verification | 🟡 Moderate |
| 5.6 | Draft Change Orders | ✅ Present | — |
| 5.7 | Invoices total | ✅ Present | — |
| 5.8 | Payments Received | ✅ Present | — |
| 5.9 | Percent Paid | ⚠️ Not confirmed visible in summary panel | 🟡 Moderate |
| 5.10 | Remaining Balance | ✅ Present | — |

---

### 6. Advanced Settings / Change Order Tiers

| # | PRP Requirement | Current State | Gap Severity |
|---|----------------|--------------|-------------|
| 6.1 | 3-tier change order support | `co_tier_count: 1 | 2` — **tier 3 not supported** | 🟡 Moderate |
| 6.2 | SOV import from Budget | **Not found** — no "Import from Budget" action on SOV | 🔴 Critical |

---

## Summary of Gaps by Priority

### 🔴 Critical (blocks Procore parity)

| ID | Gap | Fix Required |
|----|-----|-------------|
| GAP-01 | `ERP Status` column missing from list table | Add `erp_status` column to `primeContractColumns` and `buildPrimeContractTableColumns()` |
| GAP-02 | `ERP Status` filter missing from list | Add ERP Status filter to `primeContractFilters` |
| GAP-03 | `Schedule of Values` is not a separate tab | Extract SOV from Overview tab into its own `Schedule of Values` tab |
| GAP-04 | `out_for_bid` status not a Procore Prime Contract status | Remove from `prime_contract_status_v2` enum; remove from `STATUS_LABELS` |
| GAP-05 | `access_policy.accessors` DB column missing | Add migration: `allowed_user_ids uuid[] DEFAULT '{}'` on `prime_contracts` |
| GAP-06 | SOV import from Budget not implemented | Add "Import from Budget" button on SOV tab that calls a bulk-create endpoint |

### 🟡 Moderate (degrades parity)

| ID | Gap | Fix Required |
|----|-----|-------------|
| GAP-07 | `Attachments` column missing from list | Add attachment count column to table config |
| GAP-08 | `Payments Received`, `% Paid`, `Remaining Balance Outstanding` hidden by default | Change `defaultVisible` to `true` for these columns |
| GAP-09 | `access_policy.show_line_items_to_non_admins` DB column missing | Add migration: `show_sov_to_non_admins boolean DEFAULT false` on `prime_contracts` |
| GAP-10 | `Related Items` tab missing | Create stub tab (can be empty initially) |
| GAP-11 | `Emails` tab is placeholder | Implement email history or keep as stub with clear messaging |
| GAP-12 | `Change History` tab is placeholder | Implement audit log or keep as stub with clear messaging |
| GAP-13 | `Pending Revised Contract Amount` not confirmed in summary panel | Verify/add to Contract Summary panel in Overview tab |
| GAP-14 | `Percent Paid` not confirmed in summary panel | Verify/add to Contract Summary panel |
| GAP-15 | Change order tier 3 not supported | Extend `co_tier_count` to accept 1 | 2 | 3 |

### 🟢 Minor (label/cosmetic)

| ID | Gap | Fix Required |
|----|-----|-------------|
| GAP-16 | "Original Amount" → "Original Contract Amount" | Update column label |
| GAP-17 | "Approved COs" → "Approved Change Orders" | Update column label |
| GAP-18 | "Revised Amount" → "Revised Contract Amount" | Update column label |
| GAP-19 | "Pending COs" → "Pending Change Orders" | Update column label |
| GAP-20 | "Draft COs" → "Draft Change Orders" | Update column label |
| GAP-21 | "Payments" → "Payments Received" | Update column label |
| GAP-22 | "Balance" → "Remaining Balance Outstanding" | Update column label |

---

## Files Audited

| File | Role |
|------|------|
| `frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx` | List page |
| `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx` | Detail page |
| `frontend/src/features/prime-contracts/prime-contracts-table-config.tsx` | Column/filter config |
| `frontend/src/types/database.types.ts` (line 15332) | DB schema |

---

*Ready for `/prp:prp-execute prime-contracts`*
