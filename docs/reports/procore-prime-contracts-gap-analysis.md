# Procore Research: Prime Contracts Gap Analysis

**Date:** 2026-04-09
**Question:** Compare our prime contracts implementation to Procore
**Sources used:** Tier 1 (RAG) | Tier 2 (Manifest — live DOM captures) | Codebase review

---

## Summary

Our Prime Contracts implementation is **solid on the core workflow** — contract creation,
tabbed detail view, change orders, invoices, and payments all exist. However, there are
**9 meaningful gaps** compared to Procore, ranging from a missing tab to missing columns
and fields.

Overall score: **~7/10** — functional but missing the SOV tab, Related Items tab, and
several column-level details Procore exposes.

---

## LIST VIEW — Column Comparison

| Column | Procore | Ours | Notes |
|--------|---------|------|-------|
| Number | ✅ | ✅ | |
| Owner/Client | ✅ | ✅ | |
| Title | ✅ | ✅ | |
| **ERP Status** | ✅ | ❌ | Procore shows ERP sync status |
| Status | ✅ | ✅ | |
| Executed | ✅ | ✅ | |
| Original Contract Amount | ✅ | ✅ | We label it "Original Amount" |
| Approved Change Orders | ✅ | ✅ | We label it "Approved COs" |
| Revised Contract Amount | ✅ | ✅ | We label it "Revised Amount" |
| Pending Change Orders | ✅ | ✅ | We label it "Pending COs" |
| Draft Change Orders | ✅ | ✅ | We label it "Draft COs" |
| Invoiced | ✅ | ✅ | |
| Payments Received | ✅ | ✅ (hidden) | We have it, hidden by default |
| % Paid | ✅ | ✅ (hidden) | We have it, hidden by default |
| Remaining Balance Outstanding | ✅ | ✅ (hidden) | We have it, hidden by default |
| Private | ✅ | ✅ (hidden) | We have it, hidden by default |
| **Attachments** | ✅ | ❌ | Procore shows attachment count/icon |
| Start Date | ➖ (not in list) | ✅ (hidden) | We added this, Procore doesn't show it |
| End Date | ➖ (not in list) | ✅ (hidden) | We added this, Procore doesn't show it |

**List view gaps:** ERP Status, Attachments count column

---

## CREATE FORM — Field Comparison

| Field | Procore | Ours | Notes |
|-------|---------|------|-------|
| Contract # | ✅ | ✅ | |
| Owner/Client | ✅ | ✅ | `client_id` |
| Title | ✅ | ✅ | |
| Status (default: Draft) | ✅ | ✅ | |
| Executed | ✅ (required!) | ✅ | Procore marks as required |
| **Default Retainage** | ✅ | ✅ | `retention_percentage` |
| Contractor | ✅ | ✅ | `contractor_id` |
| Architect/Engineer | ✅ | ✅ | `architect_engineer_id` |
| Description (rich text) | ✅ | ✅ | |
| Attachments | ✅ | ✅ | |
| Inclusions (rich text) | ✅ | ✅ | |
| Exclusions (rich text) | ✅ | ✅ | |
| Start Date | ✅ | ✅ | |
| **Estimated Completion Date** | ✅ | ⚠️ | We use `end_date` — name mismatch |
| Substantial Completion Date | ✅ | ✅ | |
| Actual Completion Date | ✅ | ✅ | |
| Signed Contract Received Date | ✅ | ✅ | |
| Contract Termination Date | ✅ | ✅ | |
| Private (checkbox) | ✅ | ✅ | `is_private` |
| **Access for Non-Admin Users** | ✅ | ❌ | User-level access control |
| **Allow non-admins to view SOV** | ✅ | ❌ | SOV visibility permission per-user |
| Original Contract Value (direct entry) | ⚠️ | ✅ | Procore derives this from the SOV |

**Create form gaps:**
- `end_date` should be labeled "Estimated Completion Date" to match Procore
- Missing contract privacy access policy: which non-admin users can view the contract
- Missing "Allow non-admins to view SOV items" permission checkbox

---

## DETAIL VIEW — Tab Comparison

| Tab | Procore | Ours | Notes |
|-----|---------|------|-------|
| General (overview) | ✅ | ✅ | We call it "overview" |
| **Schedule of Values** | ✅ | ❌ | **MISSING as dedicated tab** |
| Change Orders | ✅ | ✅ | |
| Invoices | ✅ | ✅ | |
| Payments Received | ✅ | ✅ | We call it "payments" |
| **Related Items** | ✅ | ❌ | **MISSING entirely** |
| Emails | ✅ | ✅ | |
| Change History | ✅ | ✅ | We call it "history" |
| Financial Markup | ✅ | ✅ | |
| Advanced Settings | ✅ | ✅ | |

**Detail tabs score: 8/10.** Missing **Schedule of Values** (dedicated tab) and **Related Items**.

### Contract Summary Section (on detail General tab)

Procore shows a "Contract Summary Report" panel with:

| Field | Procore | Ours |
|-------|---------|------|
| Original Contract Amount | ✅ | ✅ |
| Approved Change Orders | ✅ | ✅ |
| Revised Contract Amount | ✅ | ✅ |
| Pending Change Orders | ✅ | ✅ |
| Draft Change Orders | ✅ | ✅ |
| **Pending Revised Contract Amount** | ✅ | ✅ |
| Owner Invoices (Invoiced) | ✅ | ✅ |
| Payments Received | ✅ | ✅ |
| Percent Paid | ✅ | ✅ |
| Remaining Balance Outstanding | ✅ | ✅ |

Contract summary is fully covered in our `Contract` type.

---

## CHANGE ORDERS TAB — Column Comparison

| Column | Procore | Ours | Notes |
|--------|---------|------|-------|
| Number | ✅ | ✅ | |
| **Revision** | ✅ | ❌ | Procore tracks CO revision number |
| Title | ✅ | ✅ | |
| Status | ✅ | ✅ | |
| Executed | ✅ | ✅ | |
| Amount | ✅ | ✅ | |
| Date Initiated | ✅ | ✅ | |
| Due Date | ✅ | ✅ | |
| **Review Date** | ✅ | ❌ | Separate from Due Date in Procore |
| Designated Reviewer | ✅ | ✅ | |
| PCO | ✅ | ✅ | |

**CO tab gaps:** Revision column, Review Date column

Procore Change Order filters: Status, Executed, **Change Reason** (we have Status + Executed, missing Change Reason)

---

## PAYMENTS TAB — Column Comparison

| Column | Procore | Ours | Notes |
|--------|---------|------|-------|
| Invoice | ✅ | ✅ | |
| **ERP Status** | ✅ | ❌ | |
| Amount | ✅ | ✅ | |
| Date Paid | ✅ | ✅ | |
| Payment Number | ✅ | ✅ | |
| Invoice Number | ✅ | ✅ | |
| Check Number | ✅ | ✅ | `reference_number` |
| Notes | ✅ | ✅ | |
| **Attachments** | ✅ | ❌ | Per-payment attachment column |

---

## STATUS VALUES

Our statuses match Procore exactly:
`Draft → Out for Bid → Out for Signature → Approved → Complete → Terminated`

---

## GAP PRIORITY LIST

### 🔴 High (feature-level gaps — visible to clients)

| # | Gap | Impact |
|---|-----|--------|
| 1 | **Schedule of Values dedicated tab** | Procore's SOV is a first-class tab. Our SOV is embedded in the overview, which buries it. Clients expect it as a top-level tab. |
| 2 | **Related Items tab** | Completely missing. In Procore this links the prime contract to RFIs, submittals, and other items. |
| 3 | **`end_date` label mismatch** | We store the field but label it "End Date." Procore calls it "Estimated Completion Date." Client-facing mismatch. |

### 🟡 Medium (data completeness gaps)

| # | Gap | Impact |
|---|-----|--------|
| 4 | **CO Revision column** | Change orders can have revisions in Procore. We don't track or display revision numbers. |
| 5 | **CO Review Date column** | Separate from Due Date — specific to the designated reviewer's response deadline. |
| 6 | **CO Change Reason filter** | Procore exposes Change Reason as a filter on the COs tab. |
| 7 | **Contract Privacy access policy** | Non-admin user access control and SOV visibility toggles on the create/edit form. |

### 🟢 Low (cosmetic / ERP-related)

| # | Gap | Impact |
|---|-----|--------|
| 8 | **ERP Status columns** | List view + Payments tab. Only relevant if we integrate an ERP (Acumatica). |
| 9 | **Attachments count in list view** | Minor — Procore shows an attachments column in the list. |

---

## API Route Coverage

Our API routes for Prime Contracts are **complete**:

| Route | Status |
|-------|--------|
| `GET/POST /api/projects/[projectId]/contracts` | ✅ |
| `GET/PATCH/DELETE /api/projects/[projectId]/contracts/[contractId]` | ✅ |
| `GET/POST .../line-items` | ✅ |
| `GET/PATCH/DELETE .../line-items/[lineItemId]` | ✅ |
| `GET/POST .../payment-applications` | ✅ |
| `GET/PATCH/DELETE .../payment-applications/[applicationId]` | ✅ |
| `.../payment-applications/[applicationId]/line-items` | ✅ |
| `.../payment-applications/[applicationId]/populate-sov` | ✅ |
| `GET/POST .../payments` | ✅ |
| `GET/POST .../change-orders` | ✅ (under `/contracts/[contractId]/change-orders`) |
| `GET/POST /prime-contract-change-orders` (PCCOs) | ✅ |
| `.../attachments` | ✅ |
| `.../settings` | ✅ |

**Note from previous investigation:** Memory records showed "0 API routes (all CRUD broken)" for Prime Contracts — this appears to have been fixed since that investigation (2026-03-xx). The routes exist at `/api/projects/[projectId]/contracts/` (not `/prime-contracts/`).

---

## Sources

- Procore manifest: `.claude/procore-manifests/prime-contracts/manifest.json` (captured 2026-04-07)
- RAG article: https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/view-prime-contracts
- RAG article: https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/create-prime-contracts
- RAG article: https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/approve-or-reject-prime-contract-change-orders
- RAG article: https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/Update_the_Schedule_of_Values_on_a_Owner_Invoice
- Codebase: `frontend/src/features/prime-contracts/prime-contracts-table-config.tsx`
- Codebase: `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts`
