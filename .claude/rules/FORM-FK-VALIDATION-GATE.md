# Form ↔ Database FK Validation Gate

**Trigger:** Any time you are creating or editing a form that writes to a database table via dropdown/select fields.

## Before writing ANY form code that includes select/dropdown fields

1. Open `frontend/src/types/database.types.ts`
2. Find the table the form writes to
3. For EACH dropdown field, check:
   - What column does the selected value get stored in?
   - What table does that column's FK point to? (check `Relationships` array)
   - What API does the dropdown fetch its options from?
   - What table does THAT API query?
4. **If the FK target table and the dropdown source table are DIFFERENT → you have an ID mismatch**

## If mismatch found

You MUST add:
- **Read path**: API returns a mapped ID that the form can match against its dropdown options
- **Write path**: API resolves the form's dropdown ID back to the correct FK-compatible ID before INSERT/UPDATE

## Known mismatches

| Form Field | DB Column FK Target | Dropdown Source | Fix |
|-----------|-------------------|----------------|-----|
| Budget Code | `budget_lines` | `project_cost_codes` | Map via `cost_code_id` + `cost_type_id` |
| Vendor | `companies` | `vendors` | Map via name match |

## Verification

After any form edit work, ALWAYS test:
1. Create a record with dropdown selections
2. Navigate away
3. Come back and click Edit
4. **ALL dropdowns must show the correct pre-filled values**

If any dropdown shows a placeholder ("Select...") instead of the saved value, you have an ID mismatch.

## Full reference

`docs/patterns/form-id-mismatch-prevention.md`

## Why this gate exists

A single ID mismatch between database FK targets and form dropdown sources caused budget code and vendor fields to disappear every time a user clicked Edit on change events. This was invisible during creation (values get saved) but broke every edit flow. It cost an entire night of debugging because the root cause (different tables with different UUIDs) wasn't checked upfront.
