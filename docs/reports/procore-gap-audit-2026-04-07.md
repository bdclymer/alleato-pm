# Procore Gap Audit — April 7, 2026

> Budget excluded — tool is being redone.
> All other 6 financial tools audited against captured Procore manifests.

---

## Summary Scorecard

| Tool | Status | P1 Gaps | P2 Gaps | P3 Gaps |
|---|---|---|---|---|
| Change Events | Partial | 3 | 3 | 2 |
| Change Orders | Partial | 5 | 5 | 5 |
| Commitments | Solid | 0 | 4 | 5 |
| Direct Costs | Solid | 0 | 5 | 7 |
| Invoicing | Partial | 5 | 5 | 3 |
| Prime Contracts | Partial | 6 | 5 | 5 |

---

## Change Events — Partial

### What We Have
- Tab filtering: Line Items / No Line Items / RFQs / Recycle Bin
- All core columns (CE Number, Title, Status, Scope, Type, Change Reason, Origin, Prime PCO, Cost ROM, RFQ Title, Commitment, Created)
- Filters: Status, Scope, Type, Origin, Expecting Revenue
- Row + bulk actions, export CSV, grand total footer
- Full create/edit form with line items (Budget Code, Vendor, Contract, UOM, Qty, Unit Cost, Revenue/Cost ROM)
- Detail page: General Info, Line Items, Attachments, History, Related Items, Prime COs, Approval, RFQ, Convert to CO, Comments

### P1 — Critical
1. **Plain textarea for Description** — Procore uses `richtext` with full toolbar (Bold, Italic, Align, Indent, Undo, etc.)
   - Fix: `frontend/src/components/domain/change-events/change-event-form/GeneralInfoSection.tsx`
2. **Missing 3 filter groups** — Over/Under, Budget, Budget Code Segments not implemented
   - Fix: `frontend/src/features/change-events/change-events-table-config.tsx`
3. **No column groups** — Procore groups columns visually: Change Event (5 cols) / Revenue (2) / Cost (4)
   - Fix: same file above

### P2 — Important
4. Line items table missing column group headers (Detail / Revenue / Cost)
5. "Add to Prime PCO/Budget" dropdown on detail page — verify vs. Procore structure
6. "Send RFQs" modal — verify field alignment with manifest

---

## Change Orders — Partial

### What We Have
- Dual-tab interface: Prime Contract COs / Commitment COs
- Table/card/list view modes, search, status filters, export CSV
- Approval/rejection workflow with rejection reason
- Line items (commitment COs), attachments, footer totals
- Both API paths for prime and commitment COs

### P1 — Critical
1. **Missing 5 columns in list** — Contract, Revision, Date Initiated, Contract Company, Designated Reviewer, Due Date, Review Date
   - Fix: `frontend/src/features/change-orders/change-orders-table-config.tsx`
2. **CO numbering mismatch** — We use `pcco_number`; Procore uses `#` + separate `Revision` field
3. **Designated Reviewer not wired** — Field exists in schema but not rendered in UI
4. **API route inconsistency** — Commitment COs use two different endpoint patterns simultaneously
   - Fetch: `/api/projects/[projectId]/commitment-change-orders/[id]`
   - Update: `/api/projects/[projectId]/contracts/[contractId]/change-orders/[id]`
5. **Status enum not fully used** — Schema supports 11 statuses (`no_charge`, `pending_in_review`, `void`, etc.) but UI only shows 3

### P2 — Important
6. No column groups (Procore uses single group with colspan=11)
7. Missing detail page fields: Revision, Date Initiated, Designated Reviewer, Review Date, Contract reference
8. Advanced filters missing: Date range, Reviewer, Contract, Company, Amount range
9. Bulk operations not wired (infrastructure exists, no UI)
10. No reports view (Procore shows Reports as toolbar action)

---

## Commitments — Solid

### What We Have
- Full list with 19 columns, tabs (Commitments / Subcontracts / Purchase Orders / Recycle Bin)
- Detail page with 10 tabs (General, SOV, Sub SOV, Change Orders, RFQs, Invoices, Payments, Emails, Change History, Advanced Settings)
- Financial KPI strip, export PDF/CSV, email delivery
- ERP sync (Acumatica), soft delete + recycle bin + permanent delete
- Complete API surface (CRUD, approve CO, restore, email, export)

### P2 — Important (stubs only)
1. **Payments Issued tab** — "Coming soon" stub
2. **Emails tab** — "Coming soon" stub
3. **Change History tab** — "Coming soon" stub
4. **PO Change Orders dedicated view** — Procore separates this (`list-purchase-order-change-orders` state)

### P3 — Nice-to-have
5. Inline cell editing on list (number/title support exists in API, no UI)
6. Bulk status update, bulk export
7. Date/amount range filters
8. Saved views

---

## Direct Costs — Solid

### What We Have
- Full CRUD (list, create, detail/edit, delete)
- Line items manager with budget code lookup, qty, UOM, unit cost
- Filters: status, cost type, date range, amount range, full-text search
- Two view modes: Summary / Cost Code (grouped by hierarchy)
- Bulk actions: Approve, Revise, Delete
- Import (CSV/Excel), Export (CSV/Excel/PDF with templates)
- Attachment manager, ERP sync (Acumatica), Zod validation throughout

### Broken — Fix These
1. **`erp_status` referenced in search logic but not in `DirectCostRow` type** — runtime undefined
   - Fix: `frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:288`
2. **Status enum mismatch** — `config.tsx` uses `"draft"/"pending_approval"/"paid"/"void"` but schema uses `"Draft"/"Pending"/"Revise and Resubmit"/"Approved"` — one file is stale
   - Fix: `frontend/src/config/tables/direct-costs.config.tsx` vs `frontend/src/lib/schemas/direct-costs.ts`

### P2 — Important
3. Approval/revision modal UI not implemented (schema exists, no UI handler)
4. Payment tracking UI — `DirectCostPaymentSchema` exists, no UI to record payment/mark paid
5. Summary stats dashboard not exposed on list page (data exists in `DirectCostSummary` type)

---

## Invoicing — Partial

### What We Have
- Owner invoices: list, create, detail, edit (draft/revise only), delete
- Status workflow: draft → under_review → approved → paid
- Submit and approve API endpoints
- KPI metrics (Total Invoiced, Pending, Approved, Paid)
- ERP sync (Acumatica AR invoices)
- G702/G703 components, Schedule of Values component

### P1 — Critical
1. **Subcontractor invoices list not implemented** — route shows "coming soon" toast
2. **PO/Commitment invoices view missing** — no `/prime-contracts/[contractId]/invoices` endpoint or UI
3. **`/revise` endpoint exists but not implemented** — no UI for revise-and-resubmit workflow
   - File: `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/revise/route.ts`
4. **Billing Periods tab** — "coming soon"
5. **Filter form incomplete** — missing: contract_company, payment_status, invoice_status, contract_type filters

### P2 — Important
6. ERP Status column missing from list view (Procore shows it)
7. Status label mismatch — we use `under_review`, Procore may use `submitted`
8. Invoice detail page needs full audit (597-line file, only first 100 lines verified)

---

## Prime Contracts — Partial

### What We Have
- List with 14 of 17 Procore columns
- Status filter only
- Full create form: General Info, Inclusions/Exclusions, Contract Dates, Privacy settings
- Detail page with all 5 Procore tabs: Overview (SOV), Change Orders, Invoices, Payments, Advanced Settings
- Complete CRUD API

### P1 — Critical
1. **ERP Status field missing** — not in data model, list columns, filters, or detail form
2. **`% Paid` column missing** from list view
3. **Private and Attachments columns** missing from list (Procore columns 16–17)
4. **`pending_revised_contract_amount`** missing from detail/data model
5. **`percentage_paid`** missing from detail form
6. **`default_retainage`** editable in create form but missing from detail edit

### P2 — Important
7. Only Status filter — Procore also filters by Owner/Client, ERP Status, Executed
8. Access policy UI simplified — Procore has 3 fields: `private`, `accessors` (select), `show_line_items_to_non_admins`
9. Change orders tab missing Designated Reviewer column
10. Inline "Edit" links on detail sections (Procore has section-level edit, we likely require full modal)
11. `change_reason` filter missing from change orders form section

---

## Cross-Cutting Observations

1. **Several manifests had empty `columns`/`filters`/`rowActions`** — the crawler may not be capturing dynamically-rendered elements. Consider re-running crawls with a longer wait or scroll-trigger.
2. **ERP Status** is missing from Prime Contracts, Change Orders, and Invoicing — all three need it added together.
3. **"Coming soon" stubs** in Commitments and Invoicing — these should be ticketed before the next client demo.
4. **Rich text editor** is missing from Change Events description — this one is visible and will stand out to clients.
