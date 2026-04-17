# Commitments Audit Report

**Date:** 2026-04-17
**PRP:** PRPs/commitments/prp-commitments.md

## Summary

- ✅ Fully implemented: 22 items
- 🟡 Partially implemented: 4 items
- 🔴 Not implemented: 4 items
- ⚠️ Schema gaps: 8 items

The commitments feature has a solid core implementation — list page, both create forms, detail view shell, most tabs, and the full CRUD API layer. The main gaps are: (1) list page financial columns hardcoded to 0 instead of real aggregates, (2) Payments Issued and Change History tabs are stub empty states, (3) ERP Status column not rendered in the table, and (4) DocuSign integration absent.

---

## Database Schema

### Tables Found

| Table | Status | Notes |
|-------|--------|-------|
| `subcontracts` | ✅ Exists | Core SC table, most fields present |
| `purchase_orders` | ✅ Exists | Core PO table with PO-specific fields |
| `subcontract_sov_items` | 🟡 Exists, incomplete | Missing retainage columns + unit/qty fields |
| `purchase_order_sov_items` | ✅ Exists | Has qty/uom/unit_cost for unit-based accounting |
| `commitment_pcos` | ✅ Exists | Polymorphic PCO table |
| `commitment_change_order_lines` | ✅ Exists | CO line items |
| `commitment_related_items` | ✅ Exists | Polymorphic related items |
| `subcontract_attachments` | 🟡 Exists | Only for subcontracts; no PO equivalent |
| `subcontractor_invoices` | ✅ Exists | Pay applications |
| `subcontractor_invoice_line_items` | ✅ Exists | G703-style line items |
| `commitments_unified` (view) | ✅ Exists | Union of SC + PO |
| `subcontracts_with_totals` (view) | ✅ Exists | SC + aggregated SOV totals |
| `purchase_orders_with_totals` (view) | ✅ Exists | PO + aggregated SOV totals |
| `commitment_change_orders_with_scope` (view) | ✅ Exists | CO with parent commitment metadata |
| `purchase_order_attachments` | 🔴 Missing | No attachment table for POs |

### Enums Found

| Enum | Values | Used? |
|------|--------|-------|
| `commitment_type` | subcontract, purchase_order, service_order | ⚠️ Not used on actual tables (separate tables instead) |
| `contract_status` | draft, pending, executed, closed, terminated | ⚠️ Tables use plain TEXT `'Draft'` (title case), NOT this enum |
| `change_order_status` | draft, pending, approved, void | ✅ |
| `invoice_status` | 11 values | ✅ Used on `subcontractor_invoices` |
| `erp_sync_status` | pending, synced, failed, resyncing | Present but usage unverified |

### Schema Gaps

| Missing / Issue | Type | Required By |
|-----------------|------|-------------|
| `contract_company_id` has no FK constraint on either table | ⚠️ Data integrity | PRP: vendor required; FK should point to `companies(id)` |
| `subcontracts` dates stored as TEXT (`start_date`, `contract_date`, etc.) | ⚠️ Type mismatch | PRP: contract dates; `purchase_orders` correctly uses `date` type |
| Status is plain TEXT `'Draft'` — not using `contract_status` enum | ⚠️ Consistency | PRP: status lifecycle; status values also differ from Procore spec |
| `commitment_pcos.commitment_id` has no FK constraint (polymorphic) | ⚠️ Data integrity | PRP: change orders linked to commitment |
| `subcontract_sov_items` missing `quantity`, `uom`, `unit_cost` columns | 🔴 Missing columns | PRP: SOV supports amount-based OR unit/qty accounting |
| `subcontract_sov_items` missing line-level `retainage_percent` | 🔴 Missing column | PRP: "Line retainage % overrides commitment default" |
| `purchase_orders` missing `inclusions`, `exclusions` columns | 🔴 Missing columns | PRP: Inclusions & Exclusions section on both types |
| `purchase_orders` missing `start_date`, `estimated_completion_date` | 🔴 Missing columns | PRP: Contract dates on both types |
| `purchase_order_attachments` table missing | 🔴 Missing table | PRP: Attachments on both commitment types |

**CRITICAL from Incident Log (2026-01-28):** Schema docs define `project_id UUID REFERENCES projects(id)` but the actual `projects.id` is INTEGER — the existing migrations correctly use `INTEGER`, which is confirmed correct. No issue here.

**CRITICAL from Incident Log (2026-01-31):** Status CHECK constraint casing — the subcontracts table uses title case `'Draft'` not lowercase `'draft'`. The `contract_status` enum uses lowercase. Application code and seed data must use title case when inserting to these tables.

---

## List View

| Requirement | Status | Notes |
|-------------|--------|-------|
| Column: Number | ✅ | Primary link to detail |
| Column: Contract Company | ✅ | |
| Column: Title | ✅ | |
| Column: ERP Status | 🔴 | Defined as a **filter** only, no renderer in `buildCommitmentTableColumns`; not visible in table |
| Column: Status | ✅ | |
| Column: Executed | ✅ | |
| Column: SSOV Status | ✅ | |
| Column: Original Contract Amount | ✅ | |
| Column: Approved Change Orders | 🔴 | **Hardcoded to 0** in `mapRowToCommitment()` in `route.ts:113` |
| Column: Revised Contract Amount | 🟡 | Computed but based on hardcoded 0 COs |
| Column: Pending Change Orders | 🔴 | **Hardcoded to 0** in `route.ts:114` |
| Column: Draft Change Orders | 🔴 | **Hardcoded to 0** in `route.ts:114` |
| Column: Invoiced | 🟡 | May reflect real data via views (verify) |
| Column: Payments Issued | 🔴 | **Hardcoded to 0** in `route.ts` |
| Column: % Paid | 🔴 | Computed from 0/0 = NaN or 0 |
| Column: Remaining Balance Outstanding | 🟡 | Computed from hardcoded 0 payments |
| Column: Private | ✅ | |
| Tab: All | ✅ | |
| Tab: Subcontracts | ✅ | |
| Tab: Purchase Orders | ✅ | |
| Tab: Change Orders | ✅ | Project-level CO table |
| Tab: Recycle Bin | ✅ | Soft-deleted items |
| Toolbar: Create dropdown (Subcontract / PO) | ✅ | |
| Toolbar: Export | ✅ | `GET /api/projects/:projectId/commitments/export` |
| Toolbar: ERP Sync | ✅ | `POST /api/sync/acumatica/commitments` |
| Row action: Expand (change orders sub-table) | ✅ | |
| Filters: Type | ✅ | |
| Filters: Status | ✅ | |
| Filters: Contract Company | ✅ | |
| Filters: ERP Status | ✅ | Exists as filter even though column missing |
| Filters: Executed | ✅ | |
| Filters: SSOV Status | ✅ | |
| Footer totals row | ✅ | Sums 10 financial columns |

---

## Create / Edit Form

### Subcontract Form

| Requirement | Status | Notes |
|-------------|--------|-------|
| Field: Contract # (string, required) | ✅ | Auto-generated |
| Field: Contract Company (fk→Company, required) | ✅ | Combobox from directory |
| Field: Title (string, required) | ✅ | |
| Field: Status (enum, required, default Draft) | 🟡 | Status values differ from Procore spec: uses `Sent/Void` not `Out for Bid/Out for Signature/Complete/Terminated` |
| Field: Executed (checkbox) | ✅ | |
| Field: Private (checkbox) | ✅ | |
| Field: Description (richtext) | ✅ | |
| Field: Attachments (file[]) | ✅ | Up to 20 files, 50MB each |
| Field: Inclusions (richtext) | ✅ | |
| Field: Exclusions (richtext) | ✅ | |
| Field: Contract Date (date) | ✅ | |
| Field: Issued On (date) | ✅ | |
| Field: Signed Contract Received (date) | ✅ | |
| Field: Contract Start Date (date) | ✅ | |
| Field: Estimated Completion Date (date) | ✅ | |
| Field: Actual Completion Date (date) | ✅ | |
| Field: Default Retainage % (decimal) | ✅ | |
| Field: Accessors / non-admin users (fk→User[]) | ✅ | Conditional on Private=true |
| Field: Show SOV to non-admins (checkbox) | ✅ | |
| Field: Invoice Contacts (fk→User[]) | ✅ | |
| Button: Create | ✅ | |
| Button: Create & Enter SOV | 🟡 | Verify this actually navigates to SOV tab |
| Button: Complete with DocuSign® | 🔴 | **Not implemented** — no DocuSign integration |
| Button: Cancel | ✅ | |
| SOV line items: Budget Code | 🟡 | Stored as denormalized TEXT, no FK to `project_budget_codes` |
| SOV line items: Amount (amount-based) | ✅ | |
| SOV line items: Quantity / Unit Cost / UOM (unit/qty) | 🔴 | `subcontract_sov_items` missing these columns |
| SOV line items: Line retainage % | 🔴 | `subcontract_sov_items` missing `retainage_percent` column |

### Purchase Order Form

| Requirement | Status | Notes |
|-------------|--------|-------|
| All base fields (same as SC above) | 🟡 | Same status issues; `inclusions`/`exclusions` columns missing from `purchase_orders` DB table even though form has fields |
| Field: Ship To (address) | ✅ | |
| Field: Ship Via (string) | ✅ | |
| Field: Bill To (address) | ✅ | |
| Field: Delivery Date (date) | ✅ | |
| Field: Payment Terms (string) | ✅ | |
| Field: Assigned To (fk→User) | ✅ | |

---

## Detail View

| Requirement | Status | Notes |
|-------------|--------|-------|
| Header: Contract # | ✅ | |
| Header: Title | ✅ | |
| Header: Status badge | ✅ | |
| Header: Executed badge | ✅ | |
| Header: Contract Company | ✅ | |
| KPI: Original Contract | ✅ | |
| KPI: Approved Change Orders | ✅ | Uses real aggregate on detail (unlike list) |
| KPI: Revised Contract | ✅ | |
| KPI: Pending Change Orders | ✅ | |
| KPI: Draft Change Orders | ✅ | |
| KPI: Invoiced | ✅ | |
| KPI: Payments Issued | ✅ | |
| KPI: % Paid | ✅ | |
| KPI: Remaining Balance | ✅ | |
| KPI: Billed to Date | ✅ | Additional KPI |
| KPI: Balance to Finish | ✅ | Additional KPI |
| Tab: General | ✅ | All field sections displayed |
| Tab: Schedule of Values | ✅ | SOV editor |
| Tab: Change Orders | ✅ | Fetches CCOs and PCOs |
| Tab: Invoices | ✅ | Fetches sub invoices |
| Tab: Attachments | ✅ | Full CRUD (note: embedded in General tab AND as standalone tab) |
| Tab: Change History | 🔴 | **Empty state only** — no audit log fetching |
| Tab: Emails | ✅ | |
| Tab: Subcontractor SOV | ✅ | SSOV submission workflow (SC only) |
| Tab: RFQs | ✅ | Additional tab beyond PRP spec |
| Tab: Payments Issued | 🔴 | **Empty state only** — no data fetching |
| Tab: Related Items | ✅ | Additional tab |
| Tab: Advanced Settings | ✅ | Additional tab |
| Action: Edit | ✅ | |
| Action: Delete (soft) | ✅ | |
| Action: Restore | ✅ | Via recycle bin |
| Action: Export PDF | ✅ | |
| Action: ERP Sync | ✅ | |
| Action: Send for DocuSign | 🔴 | Not implemented |
| Action: Create Change Order | 🟡 | Via Change Orders tab (verify direct shortcut) |
| Action: Create Invoice | 🟡 | Via Invoices tab (verify direct shortcut) |
| Action: Mark Executed | 🟡 | Checkbox in General tab but no dedicated action button |

---

## Workflows & Business Rules

| Requirement | Status | Notes |
|-------------|--------|-------|
| Status: Draft | ✅ | |
| Status: Out for Bid | 🔴 | Not in create form enum; form uses `Sent` instead |
| Status: Out for Signature | 🔴 | Not in create form enum; DocuSign trigger absent |
| Status: Approved | ✅ | |
| Status: Complete | 🔴 | Form uses `Closed` instead of `Complete` |
| Status: Terminated | 🔴 | Form uses `Void` instead of `Terminated` |
| Executed flag as separate boolean | ✅ | |
| Draft CO → reported, no contract impact | 🟡 | Column exists but hardcoded 0 on list |
| Pending CO → reported, no contract impact | 🟡 | Column exists but hardcoded 0 on list |
| Approved CO → increases Revised Contract | 🟡 | Logic may exist in detail view aggregates; not on list |
| SOV line locked once invoiced | 🔴 | Not confirmed in implementation |
| Retainage per line or commitment level | 🔴 | Line-level retainage column missing from `subcontract_sov_items` |
| Cannot invoice over remaining balance | 🔴 | Not confirmed in implementation |
| DocuSign: Send → Out for Signature | 🔴 | Not implemented |
| DocuSign: Completion webhook → Approved | 🔴 | Not implemented |
| ERP Sync (Acumatica) | 🟡 | Sync button exists; bidirectional workflow unverified |

---

## Integrations

| Requirement | Status | Notes |
|-------------|--------|-------|
| Budget integration (reference cost codes) | 🟡 | SOV budget_code stored as TEXT, not linked to `project_budget_codes` FK |
| Change Orders integration | ✅ | commitment_pcos table + Change Orders tab |
| Invoicing integration | ✅ | subcontractor_invoices linked to commitments |
| Directory integration (vendor selection) | 🟡 | Combobox exists but `contract_company_id` has no FK constraint |
| DocuSign integration | 🔴 | Not implemented |
| ERP (Acumatica) integration | 🟡 | Sync endpoint exists; status column absent from list view |
| Budget impact (CO approval) | 🟡 | Unverified if approved COs update budget "Committed" column |

---

## Known Guardrails (from Incident Log)

| Guardrail | Source | Applies To |
|-----------|--------|-----------|
| Status CHECK uses title case `'Draft'` not lowercase | 2026-01-31 WARNING | Any migration or seed adding subcontract status values |
| `contract_company_id` has no FK — don't rely on CASCADE delete | Schema analysis | Vendor deletion does not cascade to commitments |
| Double "Delete" menu item in E2E tests | 2026-01-31 WARNING | Scope Playwright `getByRole("menuitem")` with `.first()` or testid |
| `await params` required for Next.js 15 | 2026-01-15 WARNING | Both `projectId` and `commitmentId` must be awaited |
| `commitments_unified` view must exist before `generate_contract_number()` | Schema doc | View-first ordering in migrations |
| SOV `budget_code` is denormalized TEXT — no FK integrity | Schema analysis | Audit on any budget code FK work |

---

## Implementation Priority

1. **Fix list page financial columns** — `approved_change_orders`, `pending_change_orders`, `draft_change_orders`, `payments_issued`, `percent_paid` hardcoded to 0 (high user-visible impact)
2. **Add ERP Status column to list table** — already a filter, needs a renderer added to `buildCommitmentTableColumns`
3. **Implement Payments Issued tab** — currently empty state
4. **Implement Change History / Audit Log tab** — currently empty state
5. **Fix status values** — align `Out for Bid`, `Out for Signature`, `Complete`, `Terminated` with Procore spec
6. **Schema fixes** — add FK constraint on `contract_company_id`; fix date types on `subcontracts`; add `purchase_order_attachments` table; add missing columns to `subcontract_sov_items` (retainage, qty/uom/unit_cost); add `inclusions`/`exclusions` to `purchase_orders`
7. **SOV line locking** — prevent editing SOV lines that have been invoiced
8. **Line-level retainage** — add column + UI for per-line retainage override
9. **DocuSign integration** — full webhook + status flow (largest effort)
10. **Budget integration** — link SOV `budget_code` to real `project_budget_codes` FK
