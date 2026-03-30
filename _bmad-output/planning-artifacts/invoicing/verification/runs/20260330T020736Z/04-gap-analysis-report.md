# Invoicing Gap Analysis Report

**Run ID:** 20260330T020736Z
**Feature:** Invoicing
**Generated:** 2026-03-30
**Workers:** db_parity_worker, api_parity_worker, ui_parity_worker

---

## 1. Executive Summary

The invoicing tool has **69 gaps** identified across three layers (database, API, UI). The feature is currently **non-functional for its core use cases**: subcontractor invoicing is entirely missing, individual owner invoice operations fail due to broken FK joins, and the commitment invoice workflow shows summaries instead of the Procore AIA G702/G703 requisition model.

| Severity | Database | API | UI | Total |
|----------|----------|-----|----|-------|
| Critical | 4 | 4 | 3 | **11** |
| High | 9 | 6 | 11 | **26** |
| Medium | 7 | 5 | 8 | **20** |
| Low | 5 | 2 | 5 | **12** |
| **Total** | **25** | **17** | **27** | **69** |

**Key assessment:** Of the 11 critical gaps, 8 are runtime data failures (broken joins, wrong FK columns, missing tables). The remaining 3 are feature-complete omissions (subcontractor invoicing, owner invoice line item CRUD, invoice status mismatch). No part of the invoicing tool is ready for production use.

---

## 2. Critical Gaps (11 total)

### Theme A: Subcontractor Invoicing Entirely Missing (3 gaps)

**DB-001 — No `subcontractor_invoices` table**
Procore's subcontractor invoicing workflow requires a dedicated table with columns tracking billing period, contract, status (NOT_INVITED, INVITED, UNDER_REVIEW, APPROVED, REVISE_AND_RESUBMIT), ERP status, and per-period financial snapshots. No such table exists. The frontend tab is marked "coming soon."

**API-001 — No subcontractor invoice routes**
No routes exist under `/api/projects/[projectId]/invoicing/subcontractor`. Procore's subcontractor list has 5 filters, a status summary bar with 5 states, ERP Status column, row selection, and bulk actions. This is half the invoicing tool with zero implementation.

**UI-001 — Subcontractor Invoices tab is a stub**
The tab fires a "coming soon" toast. The Procore equivalent shows 12 columns, 5 filters, and a status summary bar. Currently shows nothing of value to the user.

### Theme B: Owner Invoice Operations Fail at Runtime (2 gaps)

**API-003 — Broken FK join: uses `contracts` instead of `prime_contracts`**
All individual owner invoice operations (GET, PATCH, DELETE, submit, approve) perform a join using `contracts!inner(project_id)`. The `owner_invoices.prime_contract_id` column references the `prime_contracts` table, not `contracts`. All these endpoints will return a Supabase relation error in production — every single-invoice operation is broken.

**API-004 — `commitments/[id]/invoices` POST uses wrong FK column and wrong type**
The POST handler inserts into `owner_invoices` using `contract_id: parseInt(id)` but the schema column is `prime_contract_id` (UUID). The insert will fail or produce a NULL FK. Additionally, it is semantically wrong — passing a commitment UUID as a prime contract ID.

### Theme C: Invoice Status Model Mismatch (2 gaps)

**DB-003 — `invoice_status` enum missing Procore status values**
The DB enum has: `draft, pending, approved, paid, void`. Procore uses: `DRAFT, UNDER_REVIEW, APPROVED, REVISE_AND_RESUBMIT` for owner invoices and adds `NOT_INVITED, INVITED` for subcontractor invoices. Four values are missing: `under_review`, `revise_and_resubmit`, `not_invited`, `invited`.

**UI-003 — Invoice status badge doesn't match Procore**
The UI uses `draft/submitted/approved/paid/void`. Procore uses `DRAFT/UNDER REVIEW/APPROVED/REVISE AND RESUBMIT`. The status badge component has no entries for `under_review` or `revise_and_resubmit`, so those statuses will render incorrectly once DB-003 is fixed.

### Theme D: `owner_invoices` status is unconstrained (1 gap)

**DB-004 — `owner_invoices.status` is an unconstrained string**
Typed as `string | null` in DB types rather than constrained to the `invoice_status` enum. Invalid status values can be inserted without error, causing silent data corruption.

### Theme E: Invoice Line Items Cannot Be Created or Edited (2 gaps)

**DB-002 — No per-invoice SOV snapshot table for PO/subcontract requisitions**
Procore PO Invoices shows 15-column per-invoice financial snapshots. `purchase_order_sov_items` only stores running totals, not per-period snapshots. No commitment invoice requisition table exists.

**API-002 — No owner invoice line items CRUD endpoints**
`InvoiceLineItemsTable` is read-only with hardcoded 5% retention. Without line item CRUD, all invoices will show $0 totals. The AIA G702/G703 workflow is entirely built around editing SOV line items per invoice, making the entire owner invoicing workflow non-functional.

### Theme F: Invoice Status Unconstrained + Missing Columns (1 gap — already counted above)

*(DB-003 and DB-004 already covered in Theme C above.)*

---

## 3. High Gaps (26 total)

### Database High Gaps (9)

| Gap ID | Title | Impact |
|--------|-------|--------|
| DB-005 | `owner_invoices` missing `gross_amount` column | Requires aggregate join on every list query; blocks list sorting |
| DB-006 | `owner_invoices` missing `net_amount` column | Cannot display net amount without runtime calculation |
| DB-007 | `owner_invoices` missing `paid_amount` and no payment tracking table | No payment recording workflow possible |
| DB-008 | `owner_invoices` missing `percent_complete` column | Cannot sort/filter by completion in list |
| DB-009 | `owner_invoices` missing `company_id` FK | Extra join on every list query; blocks Prime Contract filter |
| DB-010 | No ERP status column at invoice level | Invoice-level ERP sync state cannot be tracked |
| DB-011 | No invitation tracking for subcontractor workflow | NOT_INVITED → INVITED transitions impossible without this |
| DB-012 | `billing_periods` uses boolean `is_closed` instead of status enum | Cannot represent future states (draft, locked, under_review) |
| DB-013 | `billing_periods` missing `prime_contract_id` FK | Cannot filter billing periods by prime contract efficiently |

### API High Gaps (6)

| Gap ID | Title | Impact |
|--------|-------|--------|
| API-005 | No REVISE AND RESUBMIT status transition endpoint | Key Procore workflow step entirely missing |
| API-006 | No billing period update/close/delete endpoints | Cannot close a billing period — a key workflow gate |
| API-007 | Billing periods route targets wrong table (`contract_billing_periods`) | Billing Periods tab will show wrong data |
| API-008 | No invoice attachments endpoints | No way to attach documents to invoices |
| API-009 | Owner invoice list GET has no query-param filters | Full table scan on every list; performance degrades with data |
| API-010 | No "paid" status transition endpoint | Cannot mark invoices as paid or record payment details |

### UI High Gaps (11)

| Gap ID | Title | Impact |
|--------|-------|--------|
| UI-004 | Owner invoice filters wrong (Status filter instead of Prime Contract) | Wrong filter set vs. Procore spec |
| UI-005 | Status summary bar absent from both invoice lists | Key navigation element missing |
| UI-006 | Invoice creation entry point wrong (standalone form vs. from commitment) | Workflow diverges from Procore model |
| UI-007 | Invoice detail uses deprecated layout pattern (`ProjectPageHeader + PageContainer`) | Violates Page Layout Gate |
| UI-008 | Invoice detail has no tabs (should have 5: Details, Line Items, Approvals, Payments, Activity) | Core navigation structure missing |
| UI-009 | Commitment Invoices tab shows summary instead of AIA G702/G703 requisition table | 15-column SOV table replaced by summary cards |
| UI-010 | Billing Periods page uses mock data — no real API integration | Non-functional; Create button does nothing |
| UI-011 | Billing Periods tab on invoicing list fires "coming soon" toast | Feature inaccessible |
| UI-012 | Create invoice form missing SOV line items, dates, attachments | Cannot create a valid invoice |
| UI-013 | Invoice detail line items table missing SOV columns | Shows 3 columns vs. Procore's 9-column AIA G703 set |
| UI-014 | No approval workflow timeline on invoice detail | Approvals tab missing entirely |

---

## 4. Medium and Low Gaps

### Medium Gaps (20)

| Gap ID | Layer | Title |
|--------|-------|-------|
| DB-014 | DB | `purchase_order_sov_items` missing `stored_materials` per line |
| DB-015 | DB | No `invoice_position` (requisition sequence number) column |
| DB-016 | DB | `billing_periods` missing `name`/`label` column |
| DB-017 | DB | Two overlapping billing period tables with no enforced relationship |
| DB-018 | DB | No index on `owner_invoices.status` |
| DB-019 | DB | No index on `owner_invoices.billing_period_id` |
| DB-020 | DB | `subcontract_sov_items` missing `unit_cost`, `quantity`, `uom` columns |
| API-011 | API | No invoicing export endpoint |
| API-012 | API | Commitment invoices endpoint returns SOV summary not discrete invoice records |
| API-013 | API | PATCH blocks all non-draft edits (prevents REVISE AND RESUBMIT editing) |
| API-014 | API | Legacy `/api/invoices` route targets Acumatica ERP table (not app invoices) |
| API-015 | API | No project-level `billing_periods` table routes — Billing Periods tab unbuildable |
| UI-015 | UI | Due date hardcoded as `created_at + 30 days` |
| UI-016 | UI | Commitment detail RFQs, Payments Issued, Emails, Change History tabs are stubs |
| UI-017 | UI | Contract column shows raw integer ID instead of contract name |
| UI-018 | UI | No export capability — Export PDF button fires "coming soon" toast |
| UI-019 | UI | Billing Periods page uses deprecated `DataTable` component |
| UI-020 | UI | No payment recording UI — Payments Issued tab is a stub |
| UI-021 | UI | `InvoicesTab` on commitment detail uses legacy `DataTable` |
| UI-022 | UI | Invoice edit form missing `invoice_date` and `due_date` fields |

### Low Gaps (12)

| Gap ID | Layer | Title |
|--------|-------|-------|
| DB-021 | DB | `owner_invoice_line_items` missing `quantity`, `unit_cost`, `uom` |
| DB-022 | DB | `owner_invoices` missing `due_date` |
| DB-023 | DB | `owner_invoices` missing `billing_date` |
| DB-024 | DB | `billing_periods` missing `created_by` audit column |
| DB-025 | DB | No `invoice_attachments` table |
| API-016 | API | Submit/approve routes lack precondition guards |
| API-017 | API | No ERP sync status in owner invoice list response |
| UI-023 | UI | Wrong primary CTA label ("Create Invoice" should be "Create Billing Period") |
| UI-024 | UI | Commitment invoices tab heading should be "Invoices (Requisitions)" |
| UI-025 | UI | Retention rate hardcoded at 5% |
| UI-026 | UI | No line item create/edit/delete UI |
| UI-027 | UI | Billing Periods breadcrumb links to wrong route (`/invoices` instead of `/invoicing`) |

---

## 5. Dependency Map

Fixes must follow the DB → API → UI dependency chain. Several chains are tightly coupled:

```
DB-001 (subcontractor_invoices table)
  └─► API-001 (subcontractor invoice routes)
        └─► UI-001 (Subcontractor Invoices tab)

DB-002 (commitment invoice requisition table)
  └─► API-012 (commitment invoice records CRUD)
        └─► UI-009 (AIA G702/G703 requisition table in commitment)

DB-003 (invoice_status enum)
  + DB-004 (constrain owner_invoices.status)
    └─► UI-003 (status badge)
          └─► UI-005 (status summary bar)

API-003 (fix broken FK join) — must fix BEFORE any invoice detail works
API-004 (fix wrong FK column in POST) — must fix BEFORE invoice creation works

DB-005/DB-006/DB-007/DB-008/DB-009 (owner_invoices columns)
  └─► UI-002 (owner invoice list columns)

DB-012 (billing_periods status enum)
  + DB-013 (billing_periods prime_contract_id)
  + DB-016 (billing_periods name column)
    └─► API-006/API-007/API-015 (billing period routes)
          └─► UI-010/UI-011 (Billing Periods pages)

DB-025 (invoice_attachments table)
  └─► API-008 (invoice attachments routes)

API-005 (revise endpoint)
  + API-013 (PATCH allow revise_and_resubmit)
    └─► UI workflow for REVISE AND RESUBMIT

DB-007 (paid_amount / payment tracking table)
  └─► API-010 (pay endpoint)
        └─► UI-008 Payments tab + UI-020 (payment recording UI)
```

**Standalone fixes (no dependencies, unblock critical paths):**
- API-003 and API-004: pure code changes to existing routes — fix first, they unblock all invoice detail work
- DB-004: add CHECK constraint to existing column
- UI-007: swap deprecated layout for PageShell

---

## 6. Recommended Fix Order

### Sprint 1 — Unblock Existing Functionality (no new tables needed)

1. **API-003** — Fix broken FK join (`contracts` → `prime_contracts`) in owner invoice route
2. **API-004** — Fix wrong FK column (`contract_id` → `prime_contract_id`) in commitment invoice POST
3. **DB-003 + DB-004** — Add missing enum values; constrain `owner_invoices.status` to enum
4. **UI-003** — Update `InvoiceStatusBadge` to match new enum values
5. **UI-007** — Migrate invoice detail to `PageShell`

### Sprint 2 — Owner Invoice Core Columns + Billing Periods Foundation

6. **DB-005 to DB-009** — Add `gross_amount`, `net_amount`, `paid_amount`, `percent_complete`, `company_id` to `owner_invoices`
7. **DB-012 + DB-013 + DB-016** — Refactor `billing_periods` (status enum, prime_contract_id FK, name column)
8. **API-006 + API-007 + API-015** — Fix billing period routes (correct table, add PATCH/DELETE)
9. **UI-002** — Update owner invoice list columns
10. **UI-010 + UI-011** — Wire Billing Periods page to real data

### Sprint 3 — Invoice Line Items CRUD + Commitment Invoices

11. **DB-002** — Create commitment invoice requisition snapshot table
12. **API-002** — Build owner invoice line item CRUD endpoints
13. **API-012** — Rebuild commitment invoices endpoint to return discrete invoice records
14. **UI-008 + UI-009 + UI-012 + UI-013** — Rebuild invoice detail tabs; add SOV columns; fix create form

### Sprint 4 — Subcontractor Invoicing

15. **DB-001 + DB-010 + DB-011** — Create `subcontractor_invoices` table with ERP status and invitation tracking
16. **API-001** — Build all subcontractor invoice routes
17. **UI-001** — Build Subcontractor Invoices tab

### Sprint 5 — Workflow Transitions + Payments

18. **DB-007** — Add payment tracking table/columns
19. **API-005 + API-010 + API-013** — REVISE AND RESUBMIT endpoint; pay endpoint; fix PATCH guard
20. **UI-005 + UI-014 + UI-020** — Status summary bar; approval timeline; payment recording UI

### Sprint 6 — Cleanup + Performance + Low-Priority Items

21. **DB-018 + DB-019** — Add indexes on `owner_invoices.status` and `billing_period_id`
22. **DB-025 + API-008** — Invoice attachments table and routes
23. **API-014** — Deprecate legacy `/api/invoices` ERP route or clearly mark ERP-only
24. **UI-019 + UI-021** — Migrate Billing Periods page and `InvoicesTab` to `UnifiedTablePage`
25. Remaining low-severity items: UI-023 through UI-027, DB-021 through DB-024, API-016, API-017
