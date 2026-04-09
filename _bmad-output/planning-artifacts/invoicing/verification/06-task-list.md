# Invoicing — Verified Task List

**Generated:** 2026-04-09
**Based on:** Verification report (Phase 5) — codebase inventory vs Procore reference
**Overall completion:** ~35%

---

## HIGH Priority — Core Functionality Broken or Missing

### Database / Schema

- [ ] [M] **Apply subcontractor invoices migration** — run `20260111032127_add_subcontractor_invoices.sql` (or recreate it) against the DB, then `npm run db:types`. Currently the subcontractor tab is showing subcontract summaries because the actual invoice table doesn't exist.
- [ ] [L] **Expand `owner_invoice_line_items` for real SOV** — add columns: `scheduled_value`, `work_completed_previous`, `work_completed_this_period`, `work_completed_this_period_pct`, `materials_stored`, `retainage_pct`, `retainage_amount`, `retainage_released`, `balance_to_finish`, `net_amount_this_period`. Migration + type regen.
- [ ] [S] **Add `billing_date` to `owner_invoices`** — it's in the migration but not surfaced in the create/edit form.

### API Routes

- [ ] [L] **Build billing-periods CRUD API** — `GET/POST /invoicing/billing-periods`, `GET/PATCH/DELETE /invoicing/billing-periods/[id]`. Required before subcontractor invoices can work (billing period is a required field on creation).
- [ ] [L] **Build subcontractor invoice CRUD API** — `GET/POST /invoicing/subcontractor/invoices`, `GET/PATCH/DELETE /invoicing/subcontractor/invoices/[id]`, plus submit/approve/revise action routes. The current `subcontractor/route.ts` must be replaced — it returns subcontract data, not invoice data.
- [ ] [S] **Add pre-condition checks to submit and approve routes** — `submit` should only accept `draft` or `revise_and_resubmit` invoices; `approve` should only accept `under_review`. Both currently accept any status.

### Pages / UI

- [ ] [L] **Build billing periods management page** — the tab exists and renders nothing. Needs a list view (open/closed periods), create form, and edit. Required before subcontractor invoice flow can work.
- [ ] [L] **Build subcontractor invoice create + detail pages** — currently a "coming soon" toast. Full SOV-based form needed.
- [ ] [M] **Fix filter dropdown empty options** — `billing_period_id` and `prime_contract_id` filters have hardcoded `options: []`. Wire them up to fetch live options from the API.

---

## HIGH Priority — Wrong / Broken Existing Behavior

- [ ] [S] **Fix due date calculation on invoice detail** — currently hardcoded `created_at + 30 days`. Should come from `billing_period.due_date` via the API join. Fix the GET route to return this and update the detail page.
- [ ] [S] **Fix retention in `InvoiceLineItemsTable`** — hardcoded 5% rate. Should use `contract_retention_percentage` from the API (already returned by the detail endpoint). Pass it as a prop.
- [ ] [M] **Resolve dual `OwnerInvoice` type conflict** — `[invoiceId]/page.tsx` and `InvoiceLineItemsTable` still import from the legacy `config/tables/invoicing.config.tsx`. Migrate both to `features/invoicing/invoicing-table-config.tsx` and delete the legacy file.

---

## MEDIUM Priority — Missing Features

### Status Workflow
- [ ] [S] **Add `Approved as Noted` status** to DB enum, badge component, and approve route (as a separate action). Procore supports approving with exceptions.
- [ ] [S] **Add Void action button** — the `void` status exists in the DB enum but there's no UI action to trigger it. Add action button on detail page.
- [ ] [S] **Add `billing_date` field to create and edit forms** — currently missing from both.

### SOV / Line Items
- [ ] [L] **Build SOV editing UI on owner invoice detail** — after expanding the DB columns, build an editable grid on the Detail tab (yellow-field editing matching Procore's pattern: Work Completed This Period, Materials Stored, Retainage). This is the core billing interface.
- [ ] [S] **Add line item add/edit/delete to owner invoice** — currently line items are read-only with no way to manage them from the UI.

### Subcontractor Tab
- [ ] [M] **Replace subcontractor list with real invoice data** — after the sub invoice API is built, rewrite the subcontractor tab to show actual `subcontractor_invoices` rows (with Invoice #, Billing Period, Status, Amount) rather than the subcontract summary view.

### Billing Periods
- [ ] [M] **Auto-populate Period Start/End on owner invoice create** — when user selects a billing period, the period_start and period_end fields should auto-fill from the selected period's dates.

### Attachments
- [ ] [M] **Add file attachment support to create/edit forms** — Procore supports drag-and-drop file attachments on invoices. Not present in our forms.

---

## MEDIUM Priority — Polish / Data Quality

- [ ] [S] **Show billing period name** in list view instead of raw `billing_period_id` UUID — join to billing_periods in the GET list route and return `billing_period_name`.
- [ ] [S] **Add Payment Status column** to both Owner and Subcontractor tabs — Procore shows Unpaid / Partially Paid / Paid based on payment records.
- [ ] [S] **Add notes field to create form** — currently only available in the edit Slideover.
- [ ] [S] **Add Previous Changes / Current Changes columns** to owner invoice list — Procore shows these in the list view (Aug 2025 columns).

---

## LOW Priority

- [ ] [L] **Build Payments Issued tab** — per-commitment payment tracking (Payment #, Method, Amount, Date, Check #). Needs new DB table + API + UI.
- [ ] [L] **Build Invoicing Settings page** — configurable defaults for billing period dates, reminder emails, PDF footer text, allow over-billing toggle.
- [ ] [S] **Add Export PDF action** — currently a "coming soon" toast on the detail page.
- [ ] [S] **Add email / forward action** — Procore supports forwarding invoices by email to stakeholders.
- [ ] [S] **Add Grouping options** to list view — group by Prime Contract, Invoice Status, Payment Status.

---

## Execution Order (Recommended)

1. Apply subcontractor_invoices migration → `npm run db:types`
2. Expand owner_invoice_line_items columns → migration + type regen
3. Build billing-periods API routes
4. Build billing periods management page (list + create)
5. Fix pre-condition checks on submit/approve routes
6. Fix due date + retention bugs (quick wins)
7. Resolve dual OwnerInvoice type conflict
8. Fix filter dropdown options (billing period + prime contract)
9. Build subcontractor invoice CRUD API
10. Build subcontractor invoice create + detail pages
11. Build SOV editing UI on owner invoice detail
12. Add missing form fields (billing_date, notes, attachments)
13. Add missing list columns (payment status, billing period name)
14. Add missing statuses (Approved as Noted, Void action)
15. Payments Issued tab
16. Settings page
17. Export PDF + email actions
