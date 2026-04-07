# Commitments Gap Analysis Report
**Run:** 2026-04-07  
**Source of Truth:** `.claude/procore-manifests/commitments/manifest.json` (re-crawled 2026-04-07)  
**Implementation Paths:** `frontend/src/app/(main)/[projectId]/commitments/`, `frontend/src/app/api/commitments/`

---

## Executive Summary

The Commitments implementation is **largely complete** (8/10). Core list view, detail page, change orders, invoices, and SOV tabs are all functional. Two meaningful gaps remain: a missing **Contract Company column** in the list table and an **unwired Attachments tab**.

| Layer | Status | Notes |
|---|---|---|
| DB | ✅ Complete | All columns present |
| API | ⚠️ Partial | Non-project-scoped routes; no project-scoped list endpoint |
| UI — List | ⚠️ Partial | Missing Contract Company column |
| UI — Detail | ⚠️ Partial | Attachments tab component exists but not wired |
| UI — Labels | ⚠️ Partial | 3 column label mismatches vs Procore |
| Workflow | ✅ Complete | Create, Edit, Delete, Bulk Delete, ERP Sync, Export |

---

## List View Column Analysis

### Procore Columns (17) vs Our Implementation

| Procore Column | Our Column ID | Status | Notes |
|---|---|---|---|
| Number | `number` | ✅ | |
| Contract Company | — | ❌ **MISSING** | Present in card view only (`item.contract_company?.name`) |
| Title | `title` | ✅ | |
| ERP Status | `erp_status` | ✅ | |
| Status | `status` | ✅ | |
| Executed | `executed` | ✅ | |
| SSOV Status | `ssov_status` | ✅ | |
| Original Contract Amount | `original_amount` | ⚠️ | Label: "Original Amount" (missing "Contract") |
| Approved Change Orders | `approved_change_orders` | ✅ | Label: "Approved COs" — acceptable abbreviation |
| Revised Contract Amount | `revised_contract_amount` | ⚠️ | Label: "Revised Amount" (missing "Contract") |
| Pending Change Orders | `pending_change_orders` | ✅ | |
| Draft Change Orders | `draft_change_orders` | ✅ | |
| Invoiced | `invoiced_amount` | ✅ | |
| Payments Issued | `payments_issued` | ✅ | |
| % Paid | `percent_paid` | ✅ | |
| Remaining Balance Outstanding | `remaining_balance` | ⚠️ | Label: "Remaining Balance" (missing "Outstanding") |
| Private | `is_private` | ✅ | |

### Our Extra Columns (not in Procore)
- `type` — useful for filtering (Subcontract / PO); Procore uses tabs instead
- `billed_to_date` — likely same data as "Invoiced"; consider deduplication
- `balance_to_finish` — Procore doesn't surface this separately in list
- `created_at` — internal column; acceptable

---

## Detail Page Tab Analysis

| Procore Tab | Our Tab | Status |
|---|---|---|
| General Information | General | ✅ |
| Subcontractor SOV | Subcontractor SOV (subcontracts only) | ✅ |
| WFIs / RFQs | RFQs | ✅ |
| Change Orders | Change Orders | ✅ |
| Invoices | Invoices | ✅ |
| Payments | Payments Issued | ✅ |
| Emails | Emails | ✅ |
| Change History | Change History | ✅ |
| Advanced Settings | Advanced Settings | ✅ |
| Attachments | ❌ Not wired | `AttachmentsTab` component exists at `components/commitments/tabs/AttachmentsTab.tsx` but NOT imported or rendered in detail page |

---

## API Coverage

| Endpoint | Method | Status |
|---|---|---|
| `/api/commitments` | GET (list) | ✅ |
| `/api/commitments` | POST (create) | ❌ Returns 501 "Deprecated endpoint" — create uses separate subcontract/PO routes |
| `/api/commitments/[id]` | GET | ✅ |
| `/api/commitments/[id]` | PUT | ✅ |
| `/api/commitments/[id]` | DELETE (soft) | ✅ |
| `/api/commitments/[id]` | PATCH (inline edit) | ✅ |
| `/api/commitments/[id]/change-orders` | GET/POST | ✅ |
| `/api/commitments/[id]/invoices` | GET | ✅ |
| `/api/commitments/[id]/rfqs` | GET/POST | ✅ |
| `/api/commitments/[id]/emails` | GET | ✅ |
| `/api/commitments/[id]/advanced-settings` | GET/PUT | ✅ |
| `/api/commitments/[id]/attachments` | GET/POST | ✅ (route exists) |
| `/api/commitments/[id]/export` | GET | ✅ |
| `/api/projects/[projectId]/commitments` | ANY | ❌ Route file does not exist — inconsistent with other financial tools |

**Note:** The list API lives at `/api/commitments` (non-project-scoped) rather than `/api/projects/[projectId]/commitments`. This is a structural inconsistency but functional since `projectId` is passed as a query param.

---

## Findings

### GAP-001 — Missing Contract Company Column
- **gap_id:** GAP-001
- **layer:** ui
- **severity:** high
- **status:** open
- **spec_ref:** `manifest.json → list-purchase-orders → columns[1]` (Contract Company)
- **code_ref:** `frontend/src/features/commitments/commitments-table-config.tsx:23-42`
- **evidence:** Procore shows "Contract Company" as the 2nd column in the list. Our `commitmentColumns` array has no entry for `contract_company`. The value IS fetched (used in card view at line 296) so data is available — the column just isn't defined.

### GAP-002 — Attachments Tab Not Wired to Detail Page
- **gap_id:** GAP-002
- **layer:** ui
- **severity:** medium
- **status:** open
- **spec_ref:** Procore commitments detail — Attachments tab
- **code_ref:** `frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx:784-802`
- **evidence:** `AttachmentsTab` component exists at `components/commitments/tabs/AttachmentsTab.tsx` and the API route `GET/POST /api/commitments/[id]/attachments` exists, but neither is imported nor rendered in the detail page. The tab is not listed in `PageTabs`.

### GAP-003 — Column Label Mismatches (3 columns)
- **gap_id:** GAP-003
- **layer:** ui
- **severity:** low
- **status:** open
- **spec_ref:** `manifest.json → list-purchase-orders → columns`
- **code_ref:** `frontend/src/features/commitments/commitments-table-config.tsx:29,33,38`
- **evidence:**
  - "Original Amount" → should be "Original Contract Amount"
  - "Revised Amount" → should be "Revised Contract Amount"
  - "Remaining Balance" → should be "Remaining Balance Outstanding"

### GAP-004 — Non-Project-Scoped API Route
- **gap_id:** GAP-004
- **layer:** api
- **severity:** low
- **status:** open
- **spec_ref:** Other financial tools pattern (`/api/projects/[projectId]/...`)
- **code_ref:** `frontend/src/app/api/commitments/route.ts`
- **evidence:** Commitments list/detail routes live at `/api/commitments/` rather than `/api/projects/[projectId]/commitments/`. Works functionally but diverges from the project-scoped pattern used by change-events, change-orders, budget, direct-costs, etc.

---

## Prioritized Remediation Tasks

| Priority | Task | Gap | Effort |
|---|---|---|---|
| 1 | Add `contract_company` column to `commitmentColumns` and `buildCommitmentTableColumns` | GAP-001 | Small |
| 2 | Import and wire `AttachmentsTab` into detail page, add "Attachments" to PageTabs | GAP-002 | Small |
| 3 | Fix 3 column label strings | GAP-003 | Trivial |
| 4 | (Optional) Move commitment APIs to project-scoped routes | GAP-004 | Large — low priority |
