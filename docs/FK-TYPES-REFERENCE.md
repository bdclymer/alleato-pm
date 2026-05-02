# Foreign Key Types Reference

**Last updated:** 2026-05-01
**Source of truth:** `frontend/src/types/database.types.ts`

If this file is outdated, regenerate types and re-verify:

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > /Users/meganharrison/Documents/github/alleato-pm/frontend/src/types/database.types.ts
```
---

## Commonly Referenced Tables (FK Targets)

These are the tables you will most often create foreign keys TO.

| Table | PK Field | PK Type (TS) | SQL Type for FK | FK Column Name Convention |
|-------|----------|-------------|-----------------|---------------------------|
| `projects` | `id` | `number` | `INTEGER` | `project_id` |
| `people` | `id` | `string` | `UUID` | `person_id` |
| `companies` | `id` | `string` | `UUID` | `company_id` |
| `contracts` | `id` | `number` | `INTEGER` | `contract_id` |
| `change_orders` | `id` | `number` | `INTEGER` | `change_order_id` |
| `budget_lines` | `id` | `string` | `UUID` | `budget_line_id` |
| `cost_codes` | `id` | `string` | `UUID` | `cost_code_id` |
| `schedule_tasks` | `id` | `string` | `UUID` | `schedule_task_id` |
| `subcontracts` | `id` | `string` | `UUID` | `subcontract_id` |
| `purchase_orders` | `id` | `string` | `UUID` | `purchase_order_id` |
| `prime_contracts` | `id` | `string` | `UUID` | `prime_contract_id` |
| `change_events` | `id` | `string` | `UUID` | `change_event_id` |
| `submittals` | `id` | `string` | `UUID` | `submittal_id` |
| `documents` | `id` | `string` | `UUID` | `document_id` |
| `project_documents` | `id` | `number` | `BIGINT` | `project_document_id` |
| `rfis` | `id` | `string` | `UUID` | `rfi_id` |
| `daily_logs` | `id` | `string` | `UUID` | `daily_log_id` |
| `drawings` | `id` | `string` | `UUID` | `drawing_id` |
| `punch_items` | `id` | `string` | `UUID` | `punch_item_id` |
| `observations` | `id` | `string` | `UUID` | `observation_id` |
| `project_photos` | `id` | `number` | `BIGINT` | `project_photo_id` |
| `auth.users` | `id` | `string` | `UUID` | `created_by`, `updated_by` |

---

## The #1 Bug: projects.id is INTEGER, Not UUID

```sql
-- CORRECT
project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE

-- WRONG (causes silent query failures)
project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
```
This has caused bugs 3+ times. The scaffold templates have this correct. Never change it.

---

## Other INTEGER PK Tables (Legacy)

These tables use `number` (INTEGER) primary keys instead of UUID:

| Table | Notes |
|-------|-------|
| `contracts` | Legacy financial data |
| `change_orders` | Legacy financial data |
| `change_order_lines` | Legacy financial data |
| `change_order_costs` | Legacy financial data |
| `change_order_approvals` | Legacy financial data |
| `prime_contract_change_orders` | Legacy financial data |
| `prime_contract_sovs` | Legacy financial data |
| `prime_potential_change_orders` | Legacy financial data |
| `owner_invoice_line_items` | Legacy financial data |
| `rfi_assignees` | Legacy |
| `initiatives` | Legacy |
| `issues` | Legacy |

When creating FKs to these tables, use `INTEGER` not `UUID`.

---

## Standard New Table Template

Every new project-scoped table should follow this pattern:

```sql
CREATE TABLE IF NOT EXISTS new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- your fields here
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);
```

---

## Deprecated Tables (Do Not Create New FKs To These)

| Table | Status | Active Replacement |
|-------|--------|--------------------|
| `photos` | Deprecated — no API routes write to it | `project_photos` |

`photos` still exists in the schema and has a child table (`photo_links`) with an active FK. Do not drop `photos` without first migrating or dropping `photo_links`. Do not create new link tables that FK to `photos`.

---

## Tables with Corrected Types (Previous Errors Fixed 2026-05-01)

| Table | Was Listed As | Actual Type | Impact |
|-------|---------------|-------------|--------|
| `rfis` | INTEGER | UUID | FK columns must be `uuid`, not `integer` |
| `tasks` | "Legacy INTEGER" | UUID | AI-extracted table; id is uuid |
| `risks` | "Legacy INTEGER" | UUID | AI-extracted table; id is uuid |
| `decisions` | "Legacy INTEGER" | UUID | AI-extracted table; id is uuid |

---

## Quick Lookup: "What type should my FK be?"

1. Find the table you're referencing
2. Check its PK type in the table above or in `database.types.ts`
3. Use the matching SQL type

If the table isn't listed above, check `database.types.ts`:

- If `id: number` -> use `BIGINT` (or `INTEGER` for `projects`)
- If `id: string` -> use `UUID`
