# Invoices — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 17 | HIGH |
| Views & Navigation | 10 | HIGH |
| Fields & Data | 16 | HIGH |
| Statuses & Workflows | 10 | HIGH |
| Line Items / Schedule of Values | 8 | HIGH |
| Permissions | 3 | MEDIUM |
| Integrations | 8 | MEDIUM |
| Reporting & Export | 3 | MEDIUM |
| Advanced Features | 11 | MEDIUM |
| **TOTAL** | **86** | |

---

## 1. Core Actions

> Source: Codebase — `/invoicing/new` create form, `/api/projects/[projectId]/invoicing/owner` POST, PATCH, DELETE routes, `useDeleteOwnerInvoice` hook

### 1.1 Create (Owner Invoice)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create owner invoice with required fields only | 1. Navigate to `/767/invoices`<br>2. Click "New Invoice"<br>3. Fill Invoice Number, Billing Period, select Contract Type = Prime, select a contract<br>4. Click "Create Invoice" | Invoice created and appears in Owner tab with status "Draft"; row shows invoice number | HIGH | 🔲 | |
| 1.1.2 | Create owner invoice with all optional fields | Fill all fields: Invoice Number, Billing Period, Contract Type, Contract, Invoice Date, Due Date, Status, Description, Retention %, line items | All fields persisted; detail view shows every entered value | MEDIUM | 🔲 | |
| 1.1.3 | Create invoice linked to a commitment/subcontract | Select Contract Type = Commitment/Subcontract, select a commitment | Invoice created and commitment linked correctly | HIGH | 🔲 | |
| 1.1.4 | Create fails when Invoice Number is blank | Leave Invoice Number empty, fill all other required fields, submit | Validation error on Invoice Number field; form not submitted | HIGH | 🔲 | |
| 1.1.5 | Create fails when no contract selected | Fill Invoice Number and Billing Period, leave contract blank, submit | Validation error: contract selection required; form not submitted | HIGH | 🔲 | |
| 1.1.6 | Default status is Draft on create | Create invoice without changing status field | Invoice status badge shows "Draft" | HIGH | 🔲 | |
| 1.1.7 | Create invoice with retention enabled | Check "Include Retention", set 10%, add line items with amounts | Retention amount = 10% of this-month billing; Net Due reflects deduction | HIGH | 🔲 | |
| 1.1.8 | Create invoice with retention disabled | Uncheck "Include Retention" | Retention columns show $0.00; Net Due = This Month billing | MEDIUM | 🔲 | |

### 1.2 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit a draft invoice | Open invoice detail → PATCH invoice_number, period_start, period_end, notes → save | Changes persist; updated fields visible on detail and list | HIGH | 🔲 | |
| 1.2.2 | Edit invoice in Revise and Resubmit status | Set invoice to revise_and_resubmit → attempt edit | API allows edit (editableStatuses = draft + revise_and_resubmit); save succeeds | HIGH | 🔲 | |
| 1.2.3 | Cannot edit approved invoice | Approve invoice → attempt edit | API returns 400 "Cannot edit invoice"; error shown to user | HIGH | 🔲 | |
| 1.2.4 | Cannot edit paid invoice | Set invoice to paid → attempt edit | API returns 400 with status message; edit blocked | HIGH | 🔲 | |

### 1.3 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Delete a draft invoice | Row action menu → Delete → confirm | Invoice removed from Owner list; success toast shown | HIGH | 🔲 | |
| 1.3.2 | Cannot delete an approved invoice | Approve invoice → row action menu → Delete | Delete option disabled in UI (isDeletable check); if API called directly, returns 400 | HIGH | 🔲 | |
| 1.3.3 | Cannot delete a paid invoice | Set invoice to paid → attempt delete | Delete blocked; API returns 400 "Cannot delete approved or paid invoices" | HIGH | 🔲 | |
| 1.3.4 | Cancel delete leaves record intact | Click Delete → Cancel in confirmation dialog | Record remains in list unchanged | HIGH | 🔲 | |
| 1.3.5 | Delete cascades to line items | Create invoice with line items → delete invoice | Line items removed from DB (cascade); no orphan records | MEDIUM | 🔲 | |

---

## 2. Views & Navigation

> Source: Codebase — `frontend/src/app/(main)/[projectId]/invoices/page.tsx`, three-tab layout, UnifiedTablePage

### 2.1 List View Tabs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | Owner tab loads with correct columns | Navigate to `/767/invoices` (default tab = Owner) | Table renders with columns: Invoice #, Status, Company, Billing Period, Gross Amount, Net Amount, Paid Amount, Invoice Dates, Contract, % Complete | HIGH | 🔲 | |
| 2.1.2 | Subcontractor tab loads | Click "Subcontractor" tab (`?tab=subcontractor`) | Table renders with columns: Commitment #, Title, Vendor, Status, Invoiced, Remaining | HIGH | 🔲 | |
| 2.1.3 | Billing Periods tab loads | Click "Billing Periods" tab (`?tab=billing-periods`) | Table renders with columns: Period #, Period (date range), Status, Work Completed, Payment Due, Retention | HIGH | 🔲 | |
| 2.1.4 | Tab state persists in URL | Switch to Subcontractor tab, reload page | URL contains `?tab=subcontractor`; correct tab is active after reload | HIGH | 🔲 | |
| 2.1.5 | Owner tab is default when no tab param | Navigate to `/767/invoices` without query params | Owner tab active; owner invoices loaded | HIGH | 🔲 | |

### 2.2 Detail View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Navigate to invoice detail from row click | Click any row in Owner tab | Routes to `/767/invoicing/[invoiceId]` | HIGH | 🔲 | |
| 2.2.2 | Navigate to invoice detail via View row action | Row action menu → View | Routes to `/767/invoicing/[invoiceId]` | MEDIUM | 🔲 | |
| 2.2.3 | Navigate to commitment from Subcontractor tab row | Click a row in Subcontractor tab | Routes to `/767/commitments/[id]` | MEDIUM | 🔲 | |
| 2.2.4 | "New Invoice" button navigates to create form | Click "New Invoice" in Owner tab | Routes to `/767/invoicing/new` | HIGH | 🔲 | |

### 2.3 Billing Periods Management

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | "Create Billing Period" button opens dialog | On Billing Periods tab → click "Create Billing Period" | Dialog opens with Start Date, End Date, Billing Date fields | HIGH | 🔲 | |

---

## 3. Fields & Data

> Source: Codebase — `new/page.tsx` form fields, `invoicing-table-config.tsx` column definitions, `InvoiceStatusBadge.tsx` statuses, manifest `create-form` fields

### 3.1 Create / Edit Form Fields

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 3.1.1 | Invoice Number | Text | Yes | "INV-001", "APP-2026-01", free text | Blank → validation error | HIGH | 🔲 |
| 3.1.2 | Billing Period | Text | Yes | "January 2024", "2024-01" | Blank → validation error | HIGH | 🔲 |
| 3.1.3 | Contract Type | Dropdown | Yes | "Prime Contract" or "Commitment/Subcontract" | — | HIGH | 🔲 |
| 3.1.4 | Contract / Commitment | Dropdown | Yes | Loads from API; must select one | Blank → validation error | HIGH | 🔲 |
| 3.1.5 | Invoice Date | Date Picker | Yes | Any valid date via calendar picker | — | HIGH | 🔲 |
| 3.1.6 | Due Date | Date Picker | No | Any valid date; optional | — | MEDIUM | 🔲 |
| 3.1.7 | Status | Dropdown | No | Draft, Submitted, Approved, Paid, Void selectable on create | — | HIGH | 🔲 |
| 3.1.8 | Description / Notes | Textarea | No | Free text up to any length | — | LOW | 🔲 |
| 3.1.9 | Include Retention | Checkbox | No | Checked = retention applied; unchecked = $0 | — | HIGH | 🔲 |
| 3.1.10 | Retention % | Number | Conditional | 0–100; default 10 | Values > 100 or negative | HIGH | 🔲 |

### 3.2 List Table Fields (Owner Tab)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.2.1 | Invoice # displays correctly | Create invoice with number "INV-001" | List shows "INV-001"; if no number set, falls back to "INV-[id]" | HIGH | 🔲 | |
| 3.2.2 | Billing Period displays date range | Invoice with period_start and period_end set | Shows "Jan 1, 2024 – Jan 31, 2024" format | HIGH | 🔲 | |
| 3.2.3 | Invoice Dates column shows billing + due | Invoice with billing_date and due_date | Shows "Billing: [date]" and "Due: [date]" stacked | MEDIUM | 🔲 | |
| 3.2.4 | % Complete displays as integer | Invoice with percent_complete = 75.6 | Shows "76%" (rounded) | MEDIUM | 🔲 | |
| 3.2.5 | ERP Status column (hidden by default) | Toggle ERP Status column visible | Shows Acumatica ref number if synced, "—" if not | LOW | 🔲 | |
| 3.2.6 | Total Contract Amount column (hidden by default) | Toggle Total Contract Amount visible | Shows revised_contract_value or original_contract_value from prime contract | LOW | 🔲 | |

---

## 4. Statuses & Workflows

> Source: Codebase — `InvoiceStatusBadge.tsx` (8 statuses), API routes for submit/approve/revise, PATCH route `editableStatuses`

### 4.1 Status Display

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | Draft status badge renders | Create invoice (default) | Badge shows "Draft" in secondary style | HIGH | 🔲 | |
| 4.1.2 | Under Review badge renders | Submit invoice | Badge shows "Under Review" in default style | HIGH | 🔲 | |
| 4.1.3 | Approved badge renders | Approve invoice | Badge shows "Approved" in success (green) style | HIGH | 🔲 | |
| 4.1.4 | Revise and Resubmit badge renders | Request revision on under-review invoice | Badge shows "Revise and Resubmit" in destructive (red) style | HIGH | 🔲 | |
| 4.1.5 | Paid badge renders | Set invoice to paid | Badge shows "Paid" in success (green) style | HIGH | 🔲 | |
| 4.1.6 | Void badge renders | Set invoice to void | Badge shows "Void" in outline style | MEDIUM | 🔲 | |

### 4.2 Workflow Transitions (API)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.2.1 | Submit invoice (Draft → Under Review) | POST `/api/projects/767/invoicing/owner/[id]/submit` | Status changes to "under_review"; submitted_at timestamp set | HIGH | 🔲 | |
| 4.2.2 | Approve invoice (→ Approved) | POST `/api/projects/767/invoicing/owner/[id]/approve` | Status changes to "approved"; approved_at timestamp set | HIGH | 🔲 | |
| 4.2.3 | Request revision (Under Review → Revise and Resubmit) | POST `/api/projects/767/invoicing/owner/[id]/revise` with optional reason | Status changes to "revise_and_resubmit"; if reason provided, stored in notes | HIGH | 🔲 | |
| 4.2.4 | Cannot request revision on non-under-review invoice | POST `/revise` on a draft invoice | API returns 400 "Only invoices under review can be sent back for revision" | HIGH | 🔲 | |

---

## 5. Line Items / Schedule of Values

> Source: Codebase — `new/page.tsx` line item table, `owner_invoice_line_items` DB table, financial calculation logic

### 5.1 Line Item Management

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Add a line item on new invoice | Go to Line Items tab → click "Add Line Item" | New row appears with empty Cost Code, Description, numeric fields initialized to 0.00 | HIGH | 🔲 | |
| 5.1.2 | Fill line item and verify auto-calculations | Enter This Month Amount = 1000, Previously Billed = 500, Contract Amount = 5000 | Total Completed = 1500; % Complete = 30%; Retention = 100 (10%); Net Due = 900 | HIGH | 🔲 | |
| 5.1.3 | Remove a line item | Click trash icon on a line item row (when 2+ items exist) | Row removed; totals recalculate | HIGH | 🔲 | |
| 5.1.4 | Cannot remove last line item | When only 1 line item remains | Trash icon not shown; minimum 1 line item enforced | MEDIUM | 🔲 | |
| 5.1.5 | Summary tab reflects line item totals | Fill multiple line items → click Summary tab | Summary shows: Original Contract Amount, Previously Billed, This Month Billing, Total Completed, Retention, Net Due — all summed correctly | HIGH | 🔲 | |
| 5.1.6 | Retention calculation updates when % changes | Set Retention = 10%, add line item → change Retention to 5% | Retention amount halves; Net Due updates | HIGH | 🔲 | |
| 5.1.7 | Gross amount computed from line item scheduled values | Create invoice with line items having scheduled_value | GET list response computes gross_amount from sum of scheduled_values | HIGH | 🔲 | |
| 5.1.8 | Net amount computed from line item approved amounts | Create invoice with line items having approved_amount | GET list response computes net_amount from sum of approved_amounts | HIGH | 🔲 | |

---

## 6. Permissions

> Source: Codebase — API auth checks (401 for unauthenticated), RLS 42501 handling, delete restrictions

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 6.1.1 | Unauthenticated user cannot access invoices | Unauthenticated | GET `/api/projects/767/invoicing/owner` | Returns 401 "Authentication failed" or "User not found" | HIGH | 🔲 | |
| 6.1.2 | Authenticated user can view invoices | Authenticated standard user | Navigate to `/767/invoices` | List loads; invoices for this project visible | MEDIUM | 🔲 | |
| 6.1.3 | Invoice from different project is not accessible | Authenticated user | GET `/api/projects/767/invoicing/owner/[invoiceId]` where invoice belongs to a different project | Returns 404 "Invoice not found" (project_id scoping via prime_contracts join) | HIGH | 🔲 | |

---

## 7. Integrations

> Source: Codebase — prime_contracts FK, billing_periods FK, commitments tab, Acumatica ERP status column, subcontracts_with_totals view

### 7.1 Prime Contracts Integration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1.1 | Owner invoice links to prime contract | Create invoice with prime_contract_id | Invoice GET response includes contract_number, contract_title, total_contract_amount from prime_contracts join | HIGH | 🔲 | |
| 7.1.2 | Invoice scoped to correct project via contract | Create invoice → GET list for different project | Invoice not returned (filtered by prime_contracts.project_id) | HIGH | 🔲 | |
| 7.1.3 | Contract dropdown loads project contracts | Open new invoice form → Contract Type = Prime | Dropdown populated with project's prime contracts from API | HIGH | 🔲 | |

### 7.2 Billing Periods Integration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.2.1 | Invoice can be linked to a billing period | POST owner invoice with billing_period_id | Invoice created; GET returns with billing_period_id set | HIGH | 🔲 | |
| 7.2.2 | Create billing period from Billing Periods tab | Billing Periods tab → Create Billing Period → fill start/end/billing dates → submit | Billing period created; appears in Billing Periods list | HIGH | 🔲 | |
| 7.2.3 | Create billing period requires existing prime contract | No prime contract on project → attempt create billing period | Error shown: "No prime contract found for this project." | HIGH | 🔲 | |

### 7.3 Commitments / Subcontractors Integration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.3.1 | Subcontractor tab fetches from subcontracts_with_totals view | Navigate to Subcontractor tab | Table shows commitment data including invoiced_amount, balance_to_finish from DB view | MEDIUM | 🔲 | |
| 7.3.2 | ERP Status column shows Acumatica sync reference | Invoice with acumatica_ref_nbr set → toggle ERP Status column | Column shows the Acumatica reference number | LOW | 🔲 | |

---

## 8. Reporting & Export

> Source: Codebase — UnifiedTablePage toolbar export icon, Procore manifest columns (Invoice #, Status, Company, Billing Period, Gross Amount, Net Amount, Paid Amount, etc.)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Export owner invoice list as CSV | Owner tab → toolbar export icon | CSV downloads with all visible columns: Invoice #, Status, Company, Billing Period, Gross Amount, Net Amount, Paid Amount, Invoice Dates, Contract, % Complete | MEDIUM | 🔲 | |
| 8.1.2 | Export subcontractor list as CSV | Subcontractor tab → toolbar export icon | CSV downloads with columns: Commitment #, Title, Vendor, Status, Invoiced, Remaining | MEDIUM | 🔲 | |
| 8.1.3 | Export billing periods as CSV | Billing Periods tab → toolbar export icon | CSV downloads with columns: Period #, Period, Status, Work Completed, Payment Due, Retention | LOW | 🔲 | |

---

## 9. Advanced Features

> Source: Codebase — `page.tsx` search/filter logic, UnifiedTablePage toolbar, column visibility toggles, pagination, per-page selection

### 9.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Search by invoice number (Owner tab) | Type "INV-001" in search box | List filters to matching invoices in real time | HIGH | 🔲 | |
| 9.1.2 | Search by INV-[id] fallback | Type "INV-42" in search (where invoice has no number) | Invoice with id=42 shown (fallback search logic) | MEDIUM | 🔲 | |
| 9.1.3 | Search in Subcontractor tab | Switch to Subcontractor tab → type commitment title | Commitment rows filtered to matching results | HIGH | 🔲 | |
| 9.1.4 | Search in Billing Periods tab | Switch to Billing Periods tab → type "BP-001" | Billing period with period_number=1 shown | MEDIUM | 🔲 | |

### 9.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.2.1 | Filter owner invoices by status | Apply Status = Approved filter | Only approved invoices shown; URL updates with status param | HIGH | 🔲 | |
| 9.2.2 | Filter by billing period | Apply Billing Period filter | Only invoices for that billing period shown | MEDIUM | 🔲 | |
| 9.2.3 | Clear filters restores full list | Apply filter → click "Clear filters" | All invoices shown again; filter badge removed | HIGH | 🔲 | |
| 9.2.4 | Status filter persists in URL | Apply Status = Draft filter, reload page | Filter still active after reload (status in URL) | MEDIUM | 🔲 | |

### 9.3 Column Visibility

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.3.1 | Toggle hidden columns visible | Open column selector → enable "Total Contract Amount" and "ERP Status" | Both columns appear in table | LOW | 🔲 | |
| 9.3.2 | Invoice # is always visible | Try to hide "Invoice #" column | Column toggle not available for alwaysVisible columns; Invoice # stays | LOW | 🔲 | |

### 9.4 Pagination & Sorting

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.4.1 | Pagination controls work | Create 30+ invoices; default perPage = 25 | Page 1 shows 25 rows; page 2 shows remainder | MEDIUM | 🔲 | |
| 9.4.2 | Sort by Gross Amount | Click "Gross Amount" column header | Rows sort ascending then descending on second click | MEDIUM | 🔲 | |

---

## Sources

| # | Title | URL | Category |
|---|-------|-----|---------|
| 1 | About Invoicing - Procore Overview | https://v2.support.procore.com/process-guides/about-invoicing | Invoicing |
| 2 | Create an Owner Invoice | https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/create-an-owner-invoice | Invoicing |
| 3 | Edit an Owner Invoice | https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/edit-an-owner-invoice | Invoicing |
| 4 | Delete an Owner Invoice | https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/delete-an-owner-invoice | Invoicing |
| 5 | Submit an Owner Invoice | https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/submit-an-owner-invoice | Invoicing |
| 6 | Approve an Owner Invoice | https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/approve-an-owner-invoice | Invoicing |
| 7 | Request Revision of an Owner Invoice | https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/request-revision-of-an-owner-invoice | Invoicing |
| 8 | Create a Billing Period | https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/create-a-billing-period | Billing Periods |
| 9 | Subcontractor Invoices - Overview | https://v2.support.procore.com/product-manuals/invoicing-project/tutorials/create-a-subcontractor-invoice | Invoicing |
| 10 | Permissions Matrix - Invoicing | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-invoicing-permissions | Permissions |
| 11 | Invoicing (Reference) | https://v2.support.procore.com/reference-invoicing | Invoicing |
| 12 | Codebase — `/invoices/page.tsx` | `frontend/src/app/(main)/[projectId]/invoices/page.tsx` | Implementation |
| 13 | Codebase — `/invoices/new/page.tsx` | `frontend/src/app/(main)/[projectId]/invoices/new/page.tsx` | Implementation |
| 14 | Codebase — `invoicing-table-config.tsx` | `frontend/src/features/invoicing/invoicing-table-config.tsx` | Implementation |
| 15 | Codebase — Owner Invoice API (GET/POST) | `frontend/src/app/api/projects/[projectId]/invoicing/owner/route.ts` | Implementation |
| 16 | Codebase — Owner Invoice API (GET/PATCH/DELETE) | `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/route.ts` | Implementation |
| 17 | Codebase — Submit Route | `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/submit/route.ts` | Implementation |
| 18 | Codebase — Approve Route | `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/approve/route.ts` | Implementation |
| 19 | Codebase — Revise Route | `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/revise/route.ts` | Implementation |
| 20 | Codebase — Subcontractor API | `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/route.ts` | Implementation |
| 21 | Codebase — InvoiceStatusBadge | `frontend/src/components/invoicing/InvoiceStatusBadge.tsx` | Implementation |
| 22 | Procore Manifest — Invoicing | `.claude/procore-manifests/invoicing/manifest.json` | Reference |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
