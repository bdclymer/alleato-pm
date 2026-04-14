# Invoicing — Retainage on Subcontractor Invoices: Verification Report

**Generated:** 2026-04-14  
**Sources used:** Tier 1 (RAG — 12 chunks), Tier 2 (Manifest), Tier 3 (WebFetch — full Procore support article)  
**Procore article:** https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/set-or-release-retainage-on-a-subcontractor-invoice

---

## Summary

| Category | Complete | Partial | Missing | Score |
|----------|----------|---------|---------|-------|
| DB Schema | 6 | 1 | 1 | 85% |
| API Routes | 3 | 1 | 1 | 70% |
| Form Fields / UI Inputs | 3 | 1 | 2 | 60% |
| Calculations | 1 | 0 | 1 | 50% |
| Workflows | 2 | 1 | 1 | 66% |
| **Overall** | — | — | — | **66%** |

---

## Procore Ground Truth (from support article + RAG)

### How Retainage Works in Procore

1. **Enable retainage on the commitment first** — Advanced Settings tab on the subcontract/PO:
   - `Enable Completed Work Retainage` checkbox
   - `Enable Stored Material Retainage` checkbox
   - `Default Retainage %` field

2. **Setting retainage on an invoice line item** — In the SOV (Edit mode):
   - Enter `Work Retainage this Period (%)` → system auto-calculates the `$` amount
   - OR enter `Work Retainage this Period ($)` → system auto-calculates the `%`
   - The % applies only to **"Work Completed This Period"** (Column E), NOT cumulative
   - Similarly for materials: applies only to **"Materials Stored This Period"**

3. **Releasing retainage** — In the same SOV table (Edit mode):
   - Enter amount in `Total Retainage Released` column per line item
   - Can be partial (50%) or full (100% of withheld amount)
   - System reduces "Total Retainage" by the released amount

4. **Create Invoice for Release of Retainage** — Separate flow:
   - A dedicated invoice type where all billing amounts are $0
   - Only the `retainage_released` values are filled
   - Prerequisite: retainage must have been withheld on prior invoices

5. **Prerequisites** (Procore-enforced):
   - Retainage must be enabled on the commitment
   - Invoice must be in Draft status to edit retainage amounts

---

## Database Schema

| Column | Procore Equivalent | Exists | Status | Notes |
|--------|--------------------|--------|--------|-------|
| `retainage_pct` | Work Retainage % | ✅ | COMPLETE | G703 column I1 |
| `retainage_amount` | Work Retainage $ this period | ✅ | **PARTIAL** | Calculation bug — see below |
| `materials_retainage_pct` | Materials Retainage % | ✅ | COMPLETE | |
| `materials_retainage_amount` | Materials Retainage $ this period | ✅ | COMPLETE | |
| `previous_work_retainage` | Work Retainage From Previous Application | ✅ | COMPLETE | |
| `previous_materials_retainage` | Materials Retainage From Previous Application | ✅ | COMPLETE | |
| `work_retainage_released` | Total Retainage Released (work) | ✅ | COMPLETE | DB column exists |
| `materials_retainage_released` | Total Retainage Released (materials) | ✅ | COMPLETE | DB column exists |
| `is_retainage_release` | Dedicated Release Invoice flag | ✅ | COMPLETE | On `subcontractor_invoices` |
| `net_amount_this_period` | Net amount (billing minus retainage) | ✅ | **PARTIAL** | Formula depends on buggy retainage_amount |
| `total_retainage` (computed) | Total Retainage column in list view | ❌ | MISSING | Not exposed as column in list query |

---

## Critical Bug: Retainage Calculation (WRONG)

### Files affected
- `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/line-items/route.ts` (line 134)
- `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/route.ts` (line 419)

### The bug

**Current (WRONG):**
```ts
const workRetainageAmount = ((previous + thisPeriod) * workRetainagePct) / 100;
```

**Correct:**
```ts
const workRetainageAmount = (thisPeriod * workRetainagePct) / 100;
```

### Why this is wrong

Procore's "Work Retainage This Period" applies the retainage % **only to work completed in the current billing period** (Column E). The previous periods' retainage is already tracked in `previous_work_retainage` and carried forward automatically.

By multiplying by `(previous + thisPeriod)`, we are:
1. Re-applying retainage on work that was already retained in prior invoices
2. Producing an inflated `retainage_amount` that double-counts previous retainage
3. Causing `net_amount_this_period` to be negative in subsequent billing periods (since the generated column uses `retainage_amount`)

**Impact:** Every invoice after the first one has incorrect retainage and net amounts.

---

## API Routes

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `invoices/[invoiceId]/line-items` | PATCH | **PARTIAL** | Calculation bug on line 134 |
| `invoices` | POST | **PARTIAL** | Same calculation bug on line 419 |
| `invoices/[invoiceId]/line-items` | PATCH for retainage_released | ❌ MISSING | Cannot set `work_retainage_released` or `materials_retainage_released` via PATCH |
| `invoices` | POST (is_retainage_release) | ✅ COMPLETE | Flag accepted and persisted |
| `commitments/[id]/advanced-settings` | GET/PUT | ✅ COMPLETE | enable_completed_work_retainage, default_retainage_percent all present |

---

## UI / Form Fields

| Feature | Procore | Our Implementation | Status |
|---------|---------|-------------------|--------|
| View retainage columns in SOV | Scrollable G703 columns | DetailTab.tsx — full G703 table | ✅ COMPLETE |
| Edit Work Retainage % per line item | Input field in Edit mode | Editable `retainage_pct` input | ✅ COMPLETE |
| Edit Materials Retainage % per line item | Input field in Edit mode | Editable `materials_retainage_pct` input | ✅ COMPLETE |
| Bidirectional % ↔ $ auto-calculate | Enter % → $ shown, or enter $ → % shown | Only % input, $ auto-calculated | **PARTIAL** — dollar input not supported |
| "Set Retainage on All Line Items" bulk action | Sidebar with % for work + materials | RetainageSidebar in DetailTab | ✅ COMPLETE |
| Edit Retainage Released per line item | `Total Retainage Released` input per row | Columns shown READ-ONLY only | ❌ MISSING |
| Create Invoice for Release of Retainage | Dedicated invoice creation flow in UI | Button in InvoicesTab (createRetainageReleaseInvoice) creates the record but no dedicated entry form | **PARTIAL** — creates blank retainage release invoice but no UI to fill released amounts on line items |
| Default retainage auto-population on new invoice | % from commitment settings auto-fills all line items | Not implemented | ❌ MISSING |
| Retainage columns conditionally shown | Only shown if retainage enabled on commitment | Always shown regardless of commitment settings | ❌ MISSING |
| Total Retainage column in invoice list | Shown in Procore's invoice list | Not in list view columns | ❌ MISSING |

---

## Workflows

| Workflow | Procore | Our Implementation | Status |
|----------|---------|-------------------|--------|
| Set retainage on Draft invoice | Edit SOV → enter % → save | ✅ Works (with calc bug) | PARTIAL |
| Release retainage on line items | Enter amount in Released column → save | Not editable in UI | ❌ MISSING |
| Invoice-level retainage release invoice | Create → dedicated type | Backend supports it, UI flow incomplete | PARTIAL |
| Draft status guard for editing | Only Draft/Revise editable | ✅ Enforced in PATCH route | COMPLETE |

---

## Evidence

- RAG article chunks: 12 results, 56-67% confidence on retainage topics
- WebFetch full article: https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/set-or-release-retainage-on-a-subcontractor-invoice
- Manifest: `.claude/procore-manifests/invoicing/manifest.json` — po-invoices-list includes "Total Retainage" column
- Code: `frontend/src/components/invoicing/subcontractor-detail-tabs/DetailTab.tsx`
- Code: `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/line-items/route.ts` (line 134)
- Code: `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/route.ts` (line 419)
- Migration: `supabase/migrations/20260409000006_split_work_materials_retainage.sql`
- Migration: `supabase/migrations/20260410110000_invoice_line_items_retainage_columns.sql`
- Migration: `supabase/migrations/20260413000004_retainage_release_invoice_flag.sql`
