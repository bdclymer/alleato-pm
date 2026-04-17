# Form ↔ Database ID Mismatch Prevention

## The Problem (2026-03-30)

Change event edit form showed empty dropdowns for Budget Code and Vendor because:

- `change_event_line_items.budget_code_id` → FK to `budget_lines.id`
- `BudgetCodeSelector` dropdown → uses `project_cost_codes.id`
- **Different tables, different UUIDs. Form can never match.**

- `change_event_line_items.vendor_id` → FK to `companies.id`
- `VendorCombobox` dropdown → uses `vendors.id`
- **Different tables, different UUIDs. Form can never match.**

This pattern will recur anywhere a form dropdown loads options from a different table than what the database column references.

## The Rule

**BEFORE building any form that edits a database record with FK dropdowns:**

1. Check `database.types.ts` — find the FK relationship for each column
2. Check the form component — find what table/API each dropdown loads its options from
3. **If the FK target table ≠ the dropdown source table → you MUST add ID resolution**

## Known Mismatches in This Codebase

| Column | FK Target | Form Dropdown Source | Resolution |
|--------|-----------|---------------------|------------|
| `change_event_line_items.budget_code_id` | `budget_lines` | `project_cost_codes` (via `/api/projects/[id]/budget-codes`) | Match through `cost_code_id` + `cost_type_id` |
| `change_event_line_items.vendor_id` | `companies` | `vendors` (via `/api/projects/[id]/vendors`) | Match by company name |
| `*.commitment_id` | `subcontracts` or `purchase_orders` | Combined list with `sub-`/`po-` prefixes | Prefix-based parsing (already working) |
| `direct_costs.vendor_id` | `companies` | `/api/projects/[id]/vendors` (project-scoped companies) | Form injects the record's existing `vendor:companies(*)` as a synthetic option + uses `selectedLabel` fallback so Edit always renders the saved vendor even if it's outside the scoped dropdown set |

## Scope Mismatch (variant)

Even when the dropdown endpoint and the FK column reference the same table, you can hit the
same symptom ("Select vendor..." placeholder on Edit) if the dropdown is **scoped** and the
stored FK is **global**. Example: `/api/projects/[id]/vendors` only returns vendors in
`project_vendors` for this project, but `direct_costs.vendor_id` can point at any
`companies.id` (imports, older records, company removed from project, etc.).

**Required defence for every edit form with a scoped FK dropdown:**

1. The GET API for the record must return the FK target's human-readable label
   (e.g. `vendor:companies(name, id)`).
2. The form must inject the currently-assigned FK target into the dropdown options when it
   isn't already present, AND pass a `selectedLabel` fallback to the combobox so the user
   never sees a placeholder when the FK is populated.
3. Verification: load a record whose FK points at a target outside the scoped set → click
   Edit → the combobox MUST show the assigned label, not the placeholder.

## Checklist for Any New Edit Form

- [ ] List every dropdown/select field in the form
- [ ] For each: what API does it fetch options from? What `id` field does it use?
- [ ] For each: what column does the database store? What table does the FK point to?
- [ ] If they differ: add mapping in the API (read path) and reverse-mapping (write path)
- [ ] Test by: load record → click Edit → verify all dropdowns show correct selections

## How the Fix Works

### Read path (API → Form)
The GET API maps stored IDs to form-compatible IDs:
- `projectBudgetCodeId`: budget_lines.id → project_cost_codes.id (via cost_code_id + cost_type_id)
- `formVendorId`: companies.id → vendors.id (via name matching)

### Write path (Form → API)
The POST/PATCH line items API resolves form IDs back to FK-compatible IDs:
- If `budgetCodeId` not found in `budget_lines`, checks `project_cost_codes` and finds matching budget_line
- If `vendorId` not found in `companies`, checks `vendors` table and gets `company_id`
