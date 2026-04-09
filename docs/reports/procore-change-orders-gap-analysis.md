# Procore Research: Change Orders Gap Analysis

**Date:** 2026-04-09
**Question:** Compare our change orders implementation to Procore
**Sources used:** Tier 1 (RAG) | Tier 2 (Manifest) | Tier 3 (WebFetch)

---

## Overview

Our implementation has two separate change order tracks — **Prime Contract Change Orders** (`prime_contract_change_orders`) and **Commitment Change Orders** (`contract_change_orders`) — with a unified list page at `/[projectId]/change-orders`. The prime CO track is reasonably complete; the commitment CO track is significantly underfeatured compared to Procore.

---

## Procore's Change Order Architecture

### Tier System
Procore configures change orders per-project in 1-tier or 2-tier modes:

| Tier | Commitment COs | Prime COs |
|------|---------------|-----------|
| **1-Tier** | CCO created directly | CCO created directly |
| **2-Tier** | PCO first → then CCO | PCO first → then CCO |
| **3-Tier (with Change Events)** | Change Event → PCO → CCO | Change Event → PCO → CCO |

**We implement:** Flat creation only — no PCO tier, no Change Event linking.

---

## List View: Columns

### Procore list view columns (from live manifest):
`Contract` | `#` | `Revision` | `Title` | `Date Initiated` | `Contract Company` | `Designated Reviewer` | `Due Date` | `Review Date` | `Status` | `Amount`

### Our prime CO columns:
`#` | `Title` | `Status` | `Amount` | `Executed` | `Revision` | `Due Date` | `Submitted` | `Approved` | `Contract Company`

### Our commitment CO columns:
`#` | `Description` | `Status` | `Amount` | `Requested Date` | `Approved Date`

### List View Gaps

| Procore Column | Prime CO | Commitment CO |
|----------------|----------|---------------|
| Contract | ❌ Missing | ❌ Missing |
| Revision | ✅ | ❌ Missing |
| Date Initiated | ⚠️ Shows `submitted_at` (different field) | ❌ Missing |
| Contract Company | ✅ | ❌ Missing |
| Designated Reviewer | ❌ Missing (no DB column) | ❌ Missing |
| Due Date | ✅ | ❌ Missing |
| Review Date | ❌ Missing (no DB column) | ❌ Missing |
| Title | ✅ | ⚠️ Shows `description` instead |

---

## Form Fields: Prime Contract Change Orders

### Procore fields vs our implementation

| Field | Procore | Our Implementation | Gap |
|-------|---------|-------------------|-----|
| Number | Auto-assigned, optional override | `pcco_number` (manual, required) | ⚠️ Not auto-assigned |
| Date Created | Required, auto-populated | `created_at` (auto) | ✅ |
| Revision | Required | `revision` (nullable number) | ✅ |
| Created By | Auto-populated | `created_by` (nullable string) | ✅ |
| Title | Required | `title` (required) | ✅ |
| Status | Required, dropdown | `status` (dropdown) | ⚠️ See status gap below |
| Private | Optional checkbox | `is_private` (boolean) | ✅ |
| Due Date | Optional date | `due_date` (nullable date) | ✅ |
| Invoiced Date | Optional date | `invoiced_date` (nullable date) | ✅ |
| Designated Reviewer | Optional user select | ❌ No DB column, not in form | ❌ **MISSING** |
| Paid Date | Optional date | `paid_in_full` (boolean only) | ⚠️ We have boolean, Procore has actual date |
| Description | Optional text | `description` (optional) | ✅ |
| Schedule Impact | Optional number (days) | `schedule_impact` (nullable number) | ✅ |
| **Revised Substantial Completion Date** | Optional date | ❌ No DB column, not in form | ❌ **MISSING** |
| Executed | Optional checkbox | `executed` (boolean) | ✅ |
| PCO/COR links (tier) | Tier-dependent | ❌ Not implemented | ❌ **MISSING** |
| Rejection Reason | Stored on record | Validated in request, **not stored to DB** | ❌ **BUG: data lost** |

---

## Form Fields: Commitment Change Orders

This is the largest gap area. Our create form only has 4 fields; Procore's form has 25+.

### Procore fields vs our implementation

| Field | Procore | Our Implementation | Gap |
|-------|---------|-------------------|-----|
| Number | Auto-assigned | `change_order_number` (manual, required) | ⚠️ Not auto-assigned |
| Revision | Auto-populated | ❌ No column | ❌ **MISSING** |
| Date Created | Auto-populated | `created_at` (auto) | ✅ |
| Created By | Auto-populated | ❌ No column | ❌ **MISSING** |
| Contract Company | Auto-populated | ❌ No column | ❌ **MISSING** |
| Contract | Auto-populated | `contract_id` (FK, required) | ✅ |
| **Title** | Required (max 255 chars) | ❌ Uses `description` as main field | ❌ **MISSING** |
| Status | Required dropdown | `status` (enum) | ⚠️ See status gap below |
| Private | Optional checkbox | ❌ No column | ❌ **MISSING** |
| **Change Reason** | Optional dropdown | ❌ No column | ❌ **MISSING** |
| Accounting Method | Auto-inherited | ❌ Not tracked | ❌ Missing |
| Due Date | Optional date | ❌ No column | ❌ **MISSING** |
| Invoiced Date | Optional date | ❌ No column | ❌ **MISSING** |
| **Designated Reviewer** | Optional user select | ❌ No column | ❌ **MISSING** |
| **Request Received From** | Optional user select | `requested_by` (nullable string) | ⚠️ String only, not user FK |
| Description | Optional text | `description` (required) | ⚠️ We make it required, Procore optional |
| **Schedule Impact** | Optional number | ❌ No column | ❌ **MISSING** |
| **Location** | Optional dropdown | ❌ No column | ❌ **MISSING** |
| **Reference** | Optional text | ❌ No column | ❌ **MISSING** |
| **Executed** | Optional checkbox | ❌ No column | ❌ **MISSING** |
| **Field Change** | Optional checkbox | ❌ No column | ❌ **MISSING** |
| **Paid in Full** | Optional checkbox | ❌ No column | ❌ **MISSING** |
| Attachments | Optional | ✅ (via attachments API) | ✅ |

**Commitment CO Schedule of Values tab (Procore):**
- Prime Contract Line Item, Change Event Line Item, Sub Jobs, Budget Code, Description, Cost Amount, Tax Codes
- **We have:** `commitment_change_order_lines` table with `cost_code_id`, `budget_line_id`, `amount`, `description`

---

## Status Values

### Prime Contract Change Orders

| Status | Procore | Our Implementation |
|--------|---------|-------------------|
| Draft | (implicit) | `draft` |
| Proposed | ✅ (implied) | `Proposed` (Title Case — inconsistent) |
| Out for Signature | ✅ | ❌ **MISSING** |
| Approved | ✅ | `Approved` (Title Case) |
| Executed | ✅ | `executed` (lowercase) |
| Void | Not specified | `void` |
| Rejected | Not specified | `Rejected` (Title Case) |

**Critical bug:** Status values are mixed case — `"Proposed"`, `"Approved"`, `"Rejected"` (Title Case) vs `"draft"`, `"executed"`, `"void"` (lowercase). The list page filter normalizes via `.toLowerCase()` as a workaround.

### Commitment Change Orders

| Status | Procore | Our Implementation |
|--------|---------|-------------------|
| Pending - In Review | ✅ | `pending` (different label) |
| Out for Signature | ✅ | ❌ **MISSING** |
| Approved | ✅ | `approved` |
| Executed | ✅ (via DocuSign) | `executed` |
| Draft | ✅ | `draft` |
| Void | Not specified | `void` |
| Rejected | Not specified | `rejected` |

---

## API & Code Quality Issues

| Issue | Detail | Severity |
|-------|--------|----------|
| **Rejection reason not stored** | `prime_contract_change_orders` has no `rejection_reason` column; the reject route validates it in the request body but silently drops it | 🔴 Bug |
| **Duplicate API namespaces** | Commitment COs have 3 different API paths: `/api/commitments/[id]/change-orders`, `/api/projects/[id]/commitment-change-orders`, and the deprecated `/api/projects/[id]/contracts/[id]/change-orders` | 🟡 Technical debt |
| **Missing export route** | `page-actions.tsx` calls `/api/projects/${projectId}/commitment-change-orders/export` but this route does not exist | 🔴 Bug |
| **Commitment CO create** uses direct Supabase browser client query for `prime_contracts` dropdown instead of an API route | 🟡 Pattern violation |
| **`ChangeOrdersTab.tsx`** self-fetches data instead of using the `useCommitmentChangeOrders` hook | 🟡 Inconsistency |
| **`PrimeContractChangeOrdersTab.tsx`** uses HTML `<Table>` instead of `<DataTable>` | 🟡 Design system violation |
| **Status case inconsistency** — prime COs use Title Case, commitment COs use lowercase | 🟡 Data integrity |
| **Hook uses local state** (`useState`/`useEffect`) instead of TanStack Query | 🟡 Pattern violation |

---

## Procore Workflows We Don't Support

| Workflow | Procore | Our Implementation |
|----------|---------|-------------------|
| Tier configuration (1-tier, 2-tier, 3-tier) | ✅ Configurable per project | ❌ Single-tier only |
| PCO → CCO (2-tier) | ✅ | ❌ |
| Change Event → CO | ✅ | ❌ (Change Events tool exists separately) |
| DocuSign integration | ✅ "Complete with DocuSign" | ❌ |
| Approval order enforcement | ✅ Must un-approve in reverse order | ❌ No enforcement |
| Email on create | ✅ "Create & Email" button | ❌ |
| Revised Substantial Completion Date tracking | ✅ | ❌ |
| Designated Reviewer assignment + notification | ✅ | ❌ |

---

## Priority Gap Summary

### P0 — Bugs (broken today)
1. **Rejection reason not stored** on prime COs (data loss)
2. **Missing commitment CO export route** (404 error when clicking Export on commitment tab)

### P1 — High-impact user-facing gaps
3. **Commitment CO `title` field** — Procore requires this; we use `description` as a catch-all
4. **Designated Reviewer** — missing from both prime and commitment CO tables and forms
5. **"Out for Signature" status** — missing from both tracks
6. **Status casing normalization** — fix prime COs to use consistent lowercase values
7. **Commitment CO missing fields** — Due Date, Invoiced Date, Executed, Paid in Full, Field Change, Schedule Impact, Reference, Location

### P2 — Medium-impact structural gaps
8. **Review Date column** — missing from both list views
9. **Contract column** in list view — should link back to the parent contract
10. **Designated Reviewer column** in list view — after adding the field
11. **Revised Substantial Completion Date** on prime COs
12. **Request Received From** — upgrade from string to proper user FK on commitment COs

### P3 — Architecture / code quality
13. Clean up 3 duplicate commitment CO API namespaces → consolidate to canonical `/api/commitments/[id]/change-orders`
14. Migrate `ChangeOrdersTab.tsx` to use `useCommitmentChangeOrders` hook
15. Migrate `PrimeContractChangeOrdersTab.tsx` from HTML table to `<DataTable>`
16. Migrate `useCommitmentChangeOrders` hook from local state to TanStack Query
17. Auto-assign CO numbers (sequential, per-project)

---

## Sources

- [Create a Prime Contract Change Order](https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/create-a-prime-contract-change-order)
- [Create a Commitment Change Order](https://v2.support.procore.com/product-manuals/commitments-project/tutorials/create-a-commitment-change-order-cco)
- [Change Order Diagrams (Tier System)](https://v2.support.procore.com/product-manuals/change-orders-project/diagrams)
- [View Change Orders](https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/view-change-orders)
- [Determine Order in Which Change Orders Were Approved](https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/determine-the-order-in-which-change-orders-were-approved)
- Live DOM manifest: `.claude/procore-manifests/change-orders/manifest.json` (note: incomplete crawl — rowActions and filters were empty; recommend recrawl)
