# Invoicing — Verification Report

**Generated:** 2026-04-09
**Method:** Codebase inventory (Phase 1) + Procore docs research (Phase 2) cross-compared
**Phase 3 live crawl:** Pending (not run in this session)

---

## Summary

| Category | Complete | Partial | Missing | Total | Score |
|----------|----------|---------|---------|-------|-------|
| DB Schema | 3 | 1 | 3 | 7 | 43% |
| API Routes | 5 | 1 | 6 | 12 | 42% |
| Form Fields | 5 | 2 | 12 | 19 | 26% |
| Table Columns | 4 | 2 | 6 | 12 | 33% |
| Statuses / Workflow | 4 | 2 | 3 | 9 | 44% |
| Pages | 3 | 2 | 5 | 10 | 30% |
| **Overall** | — | — | — | — | **~35%** |

---

## Database Schema

| Table / Column | Spec | Status | Notes |
|---------------|------|--------|-------|
| `owner_invoices` | Present | ✅ COMPLETE | All key columns exist incl. financial fields |
| `owner_invoice_line_items` | Present | ⚠️ PARTIAL | Missing: `scheduled_value`, `work_completed_previous`, `work_completed_this_period`, `materials_stored`, `retainage_percent`, `retainage_amount`, `retainage_released`, `balance_to_finish` — only has `description`, `category`, `approved_amount` |
| `billing_periods` | Present | ✅ COMPLETE | Referenced in owner_invoices; `name` column added |
| `subcontractor_invoices` | Required | ❌ MISSING | Migration written but never applied to DB |
| `subcontractor_invoice_line_items` | Required | ❌ MISSING | Same migration, not applied |
| Payments issued table | Required | ❌ MISSING | No table, no migration |
| Invoice settings table | Required | ❌ MISSING | No table for configurable settings |

---

## API Routes

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/invoicing/owner` | GET | ✅ COMPLETE | List with filters |
| `/invoicing/owner` | POST | ✅ COMPLETE | Create with prime_contract validation |
| `/invoicing/owner/[id]` | GET, PATCH, DELETE | ✅ COMPLETE | Detail, edit (draft/R&R only), delete |
| `/invoicing/owner/[id]/submit` | POST | ⚠️ PARTIAL | Transitions to `under_review` (correct), but no pre-condition check on current status |
| `/invoicing/owner/[id]/approve` | POST | ⚠️ PARTIAL | Transitions to `approved`, but no pre-condition check |
| `/invoicing/owner/[id]/revise` | POST | ✅ COMPLETE | Has correct pre-condition (under_review only) |
| `/invoicing/subcontractor` | GET | ❌ MISSING | Returns subcontracts view, NOT invoice data. True sub invoice CRUD entirely missing |
| `/invoicing/subcontractor/[id]` | ALL | ❌ MISSING | No route exists |
| `/invoicing/billing-periods` | ALL | ❌ MISSING | No routes exist despite being documented |
| `/invoicing/payments` | ALL | ❌ MISSING | No payments tracking routes |
| `/invoicing/settings` | GET, PATCH | ❌ MISSING | No settings routes |
| Line item management on SOV | ALL | ❌ MISSING | No add/update/delete for SOV line items |

---

## Form Fields

### Owner Invoice Create Form
| Field | Procore | Alleato | Status |
|-------|---------|---------|--------|
| Prime Contract / Billing Period | Required | ✅ prime_contract_id dropdown | ✅ COMPLETE |
| Invoice # | Required | ✅ optional text | ✅ COMPLETE |
| Period Start | Auto-populated | ✅ date picker | ✅ COMPLETE |
| Period End | Auto-populated | ✅ date picker | ✅ COMPLETE |
| Status | Required (default Draft) | ✅ enum dropdown | ✅ COMPLETE |
| Billing Date | Required | ❌ missing | ❌ MISSING |
| Attachments | Optional | ❌ missing | ❌ MISSING |

### Owner Invoice Edit Form (Slideover)
| Field | Procore | Alleato | Status |
|-------|---------|---------|--------|
| Invoice # | Editable | ✅ present | ✅ COMPLETE |
| Period Start/End | Editable | ✅ present | ✅ COMPLETE |
| Status | Editable | ✅ present | ✅ COMPLETE |
| Notes | Editable | ✅ present | ✅ COMPLETE |
| SOV line item editing | Core feature | ❌ missing | ❌ MISSING |
| Billing Date | Editable | ❌ missing | ❌ MISSING |

### Owner Invoice Line Items (SOV)
| Column | Procore | Alleato | Status |
|--------|---------|---------|--------|
| Description | Yes | ✅ present | ✅ COMPLETE |
| Category | Yes | ✅ present | ✅ COMPLETE |
| Approved Amount | Yes | ✅ present (approved_amount) | ✅ COMPLETE |
| Scheduled Value | Yes | ❌ missing | ❌ MISSING |
| Work Completed Previous | Yes | ❌ missing | ❌ MISSING |
| Work Completed This Period $ | Yes | ❌ missing | ❌ MISSING |
| Work Completed This Period % | Yes | ❌ missing | ❌ MISSING |
| Materials Presently Stored | Yes | ❌ missing | ❌ MISSING |
| Total Completed & Stored | Yes | ❌ missing | ❌ MISSING |
| Retainage % | Yes | ❌ missing | ❌ MISSING |
| Retainage $ | Yes | ❌ missing | ❌ MISSING |
| Retainage Released | Yes | ❌ missing | ❌ MISSING |
| Net Amount This Period | Yes | ❌ missing | ❌ MISSING |
| Balance to Finish | Yes | ❌ missing | ❌ MISSING |

### Subcontractor Invoice
| Feature | Procore | Alleato | Status |
|---------|---------|---------|--------|
| Create form | Full SOV-based form | ❌ "Coming soon" toast | ❌ MISSING |
| Edit form | Full SOV editing | ❌ none | ❌ MISSING |
| Detail view | 4–6 tabs incl. SOV | ❌ none | ❌ MISSING |

---

## Table Columns (List View)

### Owner Tab
| Column | Procore | Alleato | Status |
|--------|---------|---------|--------|
| Invoice # | Yes | ✅ present | ✅ COMPLETE |
| Status | Yes | ✅ present | ✅ COMPLETE |
| Gross Amount | Yes (Aug 2025) | ✅ present | ✅ COMPLETE |
| Net Amount | Yes (Aug 2025) | ✅ present | ✅ COMPLETE |
| Billing Period | Yes | ⚠️ billing_period_id (no name displayed) | ⚠️ PARTIAL |
| Payment Status | Yes | ❌ missing | ❌ MISSING |
| Previous Changes | Yes | ❌ missing | ❌ MISSING |
| Current Changes | Yes | ❌ missing | ❌ MISSING |
| Contract # | Yes | ⚠️ contract_number shown | ⚠️ PARTIAL |

### Subcontractor Tab
| Column | Procore | Alleato | Status |
|--------|---------|---------|--------|
| Contract # | Yes | ✅ contract_number | ✅ COMPLETE |
| Status | Yes | ✅ status | ✅ COMPLETE |
| Total Contract Amount | Yes | ✅ mapped from total_sov_amount | ✅ COMPLETE |
| Billing Period | Yes | ❌ not a column | ❌ MISSING |
| Invoice # | Yes | ❌ showing commitment data, not invoice | ❌ MISSING |
| % Billed | Yes | ✅ percent_billed calculated | ✅ COMPLETE |
| Payment Status | Yes | ❌ missing | ❌ MISSING |

---

## Statuses / Workflow

| Status | Procore | DB Enum | UI Badge | Transition Logic | Status |
|--------|---------|---------|----------|-----------------|--------|
| Draft | Yes | ✅ | ✅ | — | ✅ COMPLETE |
| Under Review | Yes | ✅ | ✅ | Submit → under_review | ✅ COMPLETE |
| Revise & Resubmit | Yes | ✅ | ✅ | under_review → R&R (with pre-condition) | ✅ COMPLETE |
| Approved | Yes | ✅ | ✅ | under_review → approved | ⚠️ PARTIAL (no pre-condition check) |
| Approved as Noted | Yes | ❌ not in enum | ❌ no badge | — | ❌ MISSING |
| Pending Owner Approval | Yes | ❌ not in enum | ❌ no badge | — | ❌ MISSING |
| Paid | Yes | ✅ | ✅ | — | ⚠️ PARTIAL (no payment record integration) |
| Void | Yes | ✅ | ✅ | — | ⚠️ PARTIAL (no void action button) |
| Submit pre-condition check | Required | ❌ | — | Any status can be submitted | ❌ MISSING |
| Approve pre-condition check | Required | ❌ | — | Any status can be approved | ❌ MISSING |

---

## Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Owner invoice list | `/[projectId]/invoicing` (Owner tab) | ✅ COMPLETE | UnifiedTablePage, filters partially working |
| Owner invoice detail | `/[projectId]/invoicing/[invoiceId]` | ⚠️ PARTIAL | Missing SOV editing, billing_date, export PDF |
| Create owner invoice | `/[projectId]/invoicing/new` | ⚠️ PARTIAL | Missing billing_date, attachments |
| Subcontractor list | `/[projectId]/invoicing` (Sub tab) | ❌ MISSING | Shows subcontract summaries, not real invoices |
| Subcontractor detail | `/[projectId]/invoicing/sub/[id]` | ❌ MISSING | Does not exist |
| Create subcontractor invoice | — | ❌ MISSING | "Coming soon" toast |
| Billing periods management | — | ❌ MISSING | Tab exists but renders nothing |
| Payments issued | — | ❌ MISSING | No page |
| Invoicing settings | — | ❌ MISSING | No page |

---

## Additional Issues Found

1. **Two conflicting `OwnerInvoice` type definitions** — `invoicing-table-config.tsx` (current) and `config/tables/invoicing.config.tsx` (legacy). Detail page and `InvoiceLineItemsTable` still import the legacy one.
2. **Filter dropdowns have empty options** — `billing_period_id` and `prime_contract_id` filters show no options (options array is hardcoded as `[]`).
3. **Billing Periods tab renders nothing** — tab link exists in the UI but no content component is mounted.
4. **Due date is placeholder** — hardcoded as `created_at + 30 days` instead of coming from billing period's due date.
5. **Retention calculation uses hardcoded 5%** in `InvoiceLineItemsTable` — the detail page uses the correct `contract_retention_percentage` from the API but the component doesn't.
6. **No `notes` field** in the create form — only available in edit.
7. **Submit action transitions to `under_review` directly** — Procore's status is also `under_review` on submission (not a separate "submitted" status), so this is correct naming-wise, but missing pre-condition check (should only allow from `draft` or `revise_and_resubmit`).
