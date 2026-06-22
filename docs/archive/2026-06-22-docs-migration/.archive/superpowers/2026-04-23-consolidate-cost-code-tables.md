# Consolidate project_cost_codes → project_budget_codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the dual-table problem by merging `project_cost_codes` into `project_budget_codes`, so budget lines and contract SOV line items reference the same table — matching how Procore models cost codes.

**Architecture:** Write a single Supabase migration that migrates all `project_cost_codes` rows into `project_budget_codes`, backfills two affected FK columns, and swaps the FK constraints. Then update every API route and hook that currently queries `project_cost_codes` to query `project_budget_codes` instead. Finally, simplify the import-from-budget flow to pass `project_budget_code_id` directly instead of the workaround matching code.

**Tech Stack:** PostgreSQL (Supabase), Next.js 15 App Router, TypeScript, React Query

---

## Background

`project_budget_codes` and `project_cost_codes` hold the same data (cost_code_id + cost_type_id per project) in two separate tables with different UUIDs. History:
- Migration `20260317000004` added `contract_line_items.budget_code_id` pointing to `project_budget_codes` ✓
- Migration `20260317000005` immediately changed it to `project_cost_codes` as a band-aid ✗

Procore has one concept: a "budget code" = cost code + cost type. No split. This migration restores the correct model.

### Tables with `budget_code_id` after migration
| Table | FK target (before) | FK target (after) |
|-------|-------------------|-------------------|
| `contract_line_items.budget_code_id` | `project_cost_codes.id` | `project_budget_codes.id` |
| `direct_cost_line_items.budget_code_id` | unforced string ref to `project_cost_codes.id` | `project_budget_codes.id` (with new FK) |
| `budget_lines.project_budget_code_id` | `project_budget_codes.id` | unchanged |
| `prime_contract_sovs.budget_code_id` | `project_budget_codes.id` | unchanged |

---

## Files Changed

| File | Action | Why |
|------|--------|-----|
| `supabase/migrations/20260423XXXXXX_consolidate_cost_codes.sql` | **Create** | DB migration: merge tables, backfill, fix FKs |
| `frontend/src/app/api/projects/[projectId]/budget-codes/route.ts` | **Modify** | Switch GET + POST from `project_cost_codes` → `project_budget_codes` |
| `frontend/src/app/api/projects/[projectId]/budget-codes/bulk/route.ts` | **Modify** | Switch bulk endpoints |
| `frontend/src/lib/budget/compute-grand-totals.ts` | **Modify** | Switch `project_cost_codes` query used for direct-cost rollup |
| `frontend/src/app/api/projects/[projectId]/budget/direct-costs/route.ts` | **Modify** | Switch translation-layer query |
| `frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/route.ts` | **Modify** | Map `budget_lines.id → project_budget_codes.id` via `project_budget_code_id` |
| `frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/[lineItemId]/route.ts` | **Modify** | Same mapping fix |
| `frontend/src/lib/acumatica/sync.ts` | **Modify** | Insert to `project_budget_codes` instead of `project_cost_codes` |
| `frontend/src/hooks/use-project-cost-codes.ts` | **Modify** | Switch hook to query `project_budget_codes` |
| `frontend/src/components/project-setup-wizard/cost-code-setup.tsx` | **Modify** | Switch table |
| `frontend/src/components/project-setup-wizard/budget-setup.tsx` | **Modify** | Switch table |
| `frontend/src/app/(main)/[projectId]/direct-costs/page.tsx` | **Modify** | Switch table |
| `frontend/src/components/domain/contracts/ImportFromBudgetModal.tsx` | **Modify** | Return `project_budget_code_id` from budget lines in new-contract flow |
| `frontend/src/components/domain/contracts/ContractForm.tsx` | **Modify** | Use `project_budget_code_id` directly; remove workaround matching code |
| `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/import/route.ts` | **Modify** | Pass `project_budget_code_id` directly onto `budget_code_id` |

---

## Task 1: Write the Database Migration

**Files:**
- Create: `supabase/migrations/20260423000002_consolidate_cost_codes.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260423000002_consolidate_cost_codes.sql
--
-- Consolidates project_cost_codes into project_budget_codes so that
-- budget lines and contract SOV items reference the same table.
-- Reverses the band-aid applied in migration 20260317000005.

-- 1. Make cost_type_id nullable on project_budget_codes.
--    Acumatica sync creates entries without a cost type (direct-cost transactions
--    only carry a cost code, not a cost type breakdown).
ALTER TABLE project_budget_codes
  ALTER COLUMN cost_type_id DROP NOT NULL;

-- 2. Migrate project_cost_codes rows into project_budget_codes.
--    Skip rows that already exist (matched by project_id + cost_code_id + cost_type_id).
INSERT INTO project_budget_codes (
  project_id,
  cost_code_id,
  cost_type_id,
  description,
  description_mode,
  is_active,
  created_at,
  updated_at
)
SELECT
  pcc.project_id,
  pcc.cost_code_id,
  pcc.cost_type_id,
  COALESCE(cc.title, pcc.cost_code_id, 'Unknown') AS description,
  'auto'                                           AS description_mode,
  COALESCE(pcc.is_active, true),
  COALESCE(pcc.created_at, NOW()),
  NOW()
FROM project_cost_codes pcc
LEFT JOIN cost_codes cc ON cc.id = pcc.cost_code_id
WHERE NOT EXISTS (
  SELECT 1
  FROM project_budget_codes pbc
  WHERE pbc.project_id   = pcc.project_id
    AND pbc.cost_code_id = pcc.cost_code_id
    AND (
      (pbc.cost_type_id = pcc.cost_type_id)
      OR (pbc.cost_type_id IS NULL AND pcc.cost_type_id IS NULL)
    )
);

-- 3. Build a temporary mapping: project_cost_codes.id -> project_budget_codes.id
CREATE TEMP TABLE _pcc_to_pbc AS
SELECT
  pcc.id  AS old_id,
  pbc.id  AS new_id
FROM project_cost_codes pcc
JOIN project_budget_codes pbc
  ON pbc.project_id   = pcc.project_id
 AND pbc.cost_code_id = pcc.cost_code_id
 AND (
   (pbc.cost_type_id = pcc.cost_type_id)
   OR (pbc.cost_type_id IS NULL AND pcc.cost_type_id IS NULL)
 );

-- 4. Backfill contract_line_items.budget_code_id
UPDATE contract_line_items cli
SET    budget_code_id = m.new_id
FROM   _pcc_to_pbc m
WHERE  cli.budget_code_id = m.old_id;

-- 5. Backfill direct_cost_line_items.budget_code_id
UPDATE direct_cost_line_items dcli
SET    budget_code_id = m.new_id
FROM   _pcc_to_pbc m
WHERE  dcli.budget_code_id = m.old_id;

DROP TABLE _pcc_to_pbc;

-- 6. Swap FK on contract_line_items: project_cost_codes -> project_budget_codes
ALTER TABLE contract_line_items
  DROP CONSTRAINT IF EXISTS contract_line_items_budget_code_id_fkey;

ALTER TABLE contract_line_items
  ADD CONSTRAINT contract_line_items_budget_code_id_fkey
  FOREIGN KEY (budget_code_id) REFERENCES project_budget_codes(id) ON DELETE SET NULL;

-- 7. Add FK on direct_cost_line_items (previously unforced)
ALTER TABLE direct_cost_line_items
  DROP CONSTRAINT IF EXISTS direct_cost_line_items_budget_code_id_fkey;

ALTER TABLE direct_cost_line_items
  ADD CONSTRAINT direct_cost_line_items_budget_code_id_fkey
  FOREIGN KEY (budget_code_id) REFERENCES project_budget_codes(id) ON DELETE RESTRICT;

-- 8. Drop project_cost_codes now that all references are migrated
DROP TABLE project_cost_codes;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the Supabase MCP tool `apply_migration` with the SQL above. Verify it reports success with no errors.

- [ ] **Step 3: Verify in Supabase**

Run these queries via the Supabase MCP `execute_sql` to confirm:

```sql
-- Should return 0 (no old constraint)
SELECT COUNT(*) FROM information_schema.table_constraints
WHERE constraint_name = 'contract_line_items_budget_code_id_fkey'
  AND constraint_type = 'FOREIGN KEY';

-- Should exist (new constraint)
SELECT tc.constraint_name, ccu.table_name AS references_table
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'contract_line_items'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Should return 0 (table dropped)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'project_cost_codes';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260423000002_consolidate_cost_codes.sql
git commit -m "migration: consolidate project_cost_codes into project_budget_codes"
```

---

## Task 2: Regenerate TypeScript Types

**Files:**
- Modify: `frontend/src/types/database.types.ts` (auto-generated)

- [ ] **Step 1: Regenerate types**

```bash
cd frontend && npm run db:types
```

Expected: `database.types.ts` updated. Verify `project_cost_codes` no longer appears in it, and `project_budget_codes` now has `cost_type_id: string | null`.

- [ ] **Step 2: Run the type checker**

```bash
cd frontend && npm run typecheck 2>&1 | head -50
```

This will reveal every TypeScript error caused by the table removal — the list becomes the work queue for Tasks 3–9.

- [ ] **Step 3: Commit the regenerated types**

```bash
git add frontend/src/types/database.types.ts
git commit -m "chore: regenerate DB types after cost code table consolidation"
```

---

## Task 3: Update the `/budget-codes` API

This is the central endpoint. 17+ call sites feed its returned `id` values into `budget_code_id` on line items. Switching it to return `project_budget_codes.id` fixes all of them without touching the call sites.

**Files:**
- Modify: `frontend/src/app/api/projects/[projectId]/budget-codes/route.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/budget-codes/bulk/route.ts`

- [ ] **Step 1: Update the GET handler in `budget-codes/route.ts`**

Change the query on line 78 from `project_cost_codes` to `project_budget_codes`:

```typescript
// Before (line 78):
const { data: projectBudgetCodesData, error: projectBudgetCodesError } =
  await supabase
    .from("project_cost_codes")     // ← old
    .select(
      `id, cost_code_id, cost_type_id,
       cost_codes ( title, division_id, division_title ),
       cost_code_types ( id, code, description )`,
    )
    .eq("project_id", projectIdNum)
    .eq("is_active", true)
    .order("cost_code_id", { ascending: true });

// After:
const { data: projectBudgetCodesData, error: projectBudgetCodesError } =
  await supabase
    .from("project_budget_codes")   // ← new
    .select(
      `id, cost_code_id, cost_type_id,
       cost_codes ( title, division_id, division_title ),
       cost_code_types ( id, code, description )`,
    )
    .eq("project_id", projectIdNum)
    .eq("is_active", true)
    .order("cost_code_id", { ascending: true });
```

The rest of the GET handler is already typed to `ProjectBudgetCodeRow` — no other changes needed.

- [ ] **Step 2: Update the POST handler in `budget-codes/route.ts`**

Change the duplicate check (line 230) and insert (line 246) from `project_cost_codes` to `project_budget_codes`:

```typescript
// Duplicate check (line 230):
const { data: existingCode } = await supabase
  .from("project_budget_codes")          // ← was project_cost_codes
  .select("id")
  .eq("project_id", projectIdNum)
  .eq("cost_code_id", cost_code_id)
  .eq("cost_type_id", costTypeUuid)
  .maybeSingle();

// Insert (line 246):
const { data: newProjectBudgetCode, error: insertError } = await supabase
  .from("project_budget_codes")          // ← was project_cost_codes
  .insert({
    project_id: projectIdNum,
    cost_code_id,
    cost_type_id: costTypeUuid,
    description: COALESCE_FROM_COST_CODE_TITLE,  // see note below
    is_active: true,
  })
  .select(`id, cost_code_id, cost_type_id,
           cost_codes ( title, division_id, division_title ),
           cost_code_types ( code, description )`)
  .single();
```

`project_budget_codes` requires `description`. Resolve it from `cost_codes.title` before the insert:

```typescript
// Add before the insert:
const { data: costCodeRow } = await supabase
  .from("cost_codes")
  .select("title")
  .eq("id", cost_code_id)
  .maybeSingle();
const description = costCodeRow?.title || cost_code_id;

// Then in the insert:
.insert({
  project_id: projectIdNum,
  cost_code_id,
  cost_type_id: costTypeUuid,
  description,
  is_active: true,
})
```

- [ ] **Step 3: Update `budget-codes/bulk/route.ts`**

Change every `.from("project_cost_codes")` to `.from("project_budget_codes")` (lines 68, 117, 124, 132). The column shape is identical — no other changes needed.

- [ ] **Step 4: Run the type checker**

```bash
cd frontend && npm run typecheck 2>&1 | grep "budget-codes"
```

Expected: no errors in these files.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/projects/[projectId]/budget-codes/
git commit -m "fix(budget-codes): switch API from project_cost_codes to project_budget_codes"
```

---

## Task 4: Update `compute-grand-totals.ts`

This file builds a translation map `project_cost_codes.id → cost_codes.id` to roll up direct costs onto budget lines. After migration the same map is built from `project_budget_codes`.

**Files:**
- Modify: `frontend/src/lib/budget/compute-grand-totals.ts`

- [ ] **Step 1: Change the project cost codes query (line 529)**

```typescript
// Before (line 528-531):
supabase
  .from("project_cost_codes")
  .select("id, cost_code_id")
  .eq("project_id", projectIdNum),

// After:
supabase
  .from("project_budget_codes")
  .select("id, cost_code_id")
  .eq("project_id", projectIdNum),
```

The variable that receives the result is destructured as `projectCostCodesRes` and the map is called `pccToCostCodeId`. Leave the variable names as-is (renaming them is a distraction and won't change behaviour).

- [ ] **Step 2: Run the type checker**

```bash
cd frontend && npm run typecheck 2>&1 | grep "compute-grand-totals"
```

Expected: no errors.

- [ ] **Step 3: Run the existing unit tests**

```bash
cd frontend && npm run test:unit -- --testPathPattern=compute-grand-totals
```

Expected: all pass. If any fail due to mock data referencing `project_cost_codes`, update the mocks to reference `project_budget_codes`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/budget/compute-grand-totals.ts \
        frontend/src/lib/budget/compute-grand-totals.unit.test.ts
git commit -m "fix(budget): compute-grand-totals reads project_budget_codes for direct-cost rollup"
```

---

## Task 5: Update `budget/direct-costs/route.ts`

This route translates `cost_codes.id` strings → `project_cost_codes.id` UUIDs to filter `direct_cost_line_items`. After migration these UUIDs come from `project_budget_codes`.

**Files:**
- Modify: `frontend/src/app/api/projects/[projectId]/budget/direct-costs/route.ts`

- [ ] **Step 1: Change the translation query (line 132)**

```typescript
// Before (lines 131-137):
const { data: pccRows } = await supabase
  .from("project_cost_codes")
  .select("id")
  .eq("project_id", projectIdNum)
  .in("cost_code_id", costCodeIds);
projectCostCodeIds = (pccRows || []).map((r) => r.id);

// After:
const { data: pccRows } = await supabase
  .from("project_budget_codes")
  .select("id")
  .eq("project_id", projectIdNum)
  .in("cost_code_id", costCodeIds);
projectCostCodeIds = (pccRows || []).map((r) => r.id);
```

- [ ] **Step 2: Run the type checker**

```bash
cd frontend && npm run typecheck 2>&1 | grep "direct-costs"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/projects/[projectId]/budget/direct-costs/route.ts
git commit -m "fix(direct-costs): use project_budget_codes for budget_code_id translation"
```

---

## Task 6: Update Change Events Line Item Routes

These routes map `change_event_line_items.budget_code_id` (which stores a `budget_lines.id`) to a project cost code UUID for display. Currently they join `budget_lines → project_cost_codes`. Since `budget_lines` already has `project_budget_code_id`, we can use that directly — simpler and no join needed.

**Files:**
- Modify: `frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/route.ts`
- Modify: `frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/[lineItemId]/route.ts`

- [ ] **Step 1: Simplify the mapping in `line-items/route.ts` (lines 85–108)**

Replace the two-step join (budget_lines → project_cost_codes) with a single-step lookup using `project_budget_code_id`:

```typescript
// Before (lines 85-109):
// budget_lines.id → project_cost_codes.id
const budgetLineToProjectCostCode = new Map<string, string>();
if (budgetCodeIds.length > 0) {
  const { data: budgetLines } = await supabase
    .from('budget_lines')
    .select('id, cost_code_id, cost_type_id')
    .in('id', budgetCodeIds);

  if (budgetLines && budgetLines.length > 0) {
    const { data: pccs } = await supabase
      .from('project_cost_codes')
      .select('id, cost_code_id, cost_type_id')
      .eq('project_id', parseInt(projectId, 10));

    if (pccs) {
      for (const bl of budgetLines) {
        const match = pccs.find(
          p => p.cost_code_id === bl.cost_code_id && p.cost_type_id === bl.cost_type_id
        );
        if (match) budgetLineToProjectCostCode.set(bl.id, match.id);
      }
    }
  }
}

// After — budget_lines.project_budget_code_id IS the UUID we want:
const budgetLineToProjectCostCode = new Map<string, string>();
if (budgetCodeIds.length > 0) {
  const { data: budgetLines } = await supabase
    .from('budget_lines')
    .select('id, project_budget_code_id')
    .in('id', budgetCodeIds);

  for (const bl of budgetLines ?? []) {
    if (bl.project_budget_code_id) {
      budgetLineToProjectCostCode.set(bl.id, bl.project_budget_code_id);
    }
  }
}
```

Any downstream code that uses `budgetLineToProjectCostCode` continues to work unchanged — the map still produces the same UUID shape, just from the correct table.

- [ ] **Step 2: Apply the same simplification in `line-items/[lineItemId]/route.ts` (lines 155–216)**

Find the equivalent two-step mapping block in that file and replace it with the same pattern:

```typescript
// Find the block that queries 'project_cost_codes' to resolve a budget code.
// Replace with:
const { data: budgetLine } = await supabase
  .from('budget_lines')
  .select('id, project_budget_code_id')
  .eq('id', validatedData.budgetCodeId)
  .maybeSingle();

// Use budgetLine?.project_budget_code_id as the resolved budget code UUID.
// Remove the fallback query to project_cost_codes.
```

- [ ] **Step 3: Run the type checker**

```bash
cd frontend && npm run typecheck 2>&1 | grep "change-events"
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/api/projects/[projectId]/change-events/
git commit -m "fix(change-events): resolve budget code via budget_lines.project_budget_code_id directly"
```

---

## Task 7: Update Acumatica Sync

The sync creates `project_cost_codes` entries on the fly for cost codes that don't yet have a project entry, then uses those UUIDs as `direct_cost_line_items.budget_code_id`. Switch this to `project_budget_codes`.

`project_budget_codes` requires `description` (now optional after our migration makes `cost_type_id` nullable, but `description` is still required). Resolve description from `cost_codes.title`.

**Files:**
- Modify: `frontend/src/lib/acumatica/sync.ts`

- [ ] **Step 1: Update the query that loads existing codes (line 291)**

```typescript
// Before (lines 291-303):
const { data: existingProjectCostCodes, error: projectCostCodesError } = await supabase
  .from("project_cost_codes")
  .select("id, cost_code_id")
  .eq("project_id", projectId);

// ...
const projectCostCodeByCode = new Map<string, string>();
for (const row of existingProjectCostCodes ?? []) {
  if (row.cost_code_id) projectCostCodeByCode.set(row.cost_code_id, row.id);
}

// After:
const { data: existingProjectCostCodes, error: projectCostCodesError } = await supabase
  .from("project_budget_codes")
  .select("id, cost_code_id")
  .eq("project_id", projectId);

// rest unchanged
```

- [ ] **Step 2: Update the on-the-fly insert (lines 323–331)**

```typescript
// Before:
const { data: insertedCostCode, error: insertProjectCostCodeError } = await supabase
  .from("project_cost_codes")
  .insert({
    project_id: projectId,
    cost_code_id: normalizedCostCode,
    is_active: true,
  })
  .select("id")
  .single();

// After — project_budget_codes requires description:
const { data: costCodeMeta } = await supabase
  .from("cost_codes")
  .select("title")
  .eq("id", normalizedCostCode)
  .maybeSingle();

const { data: insertedCostCode, error: insertProjectCostCodeError } = await supabase
  .from("project_budget_codes")
  .insert({
    project_id: projectId,
    cost_code_id: normalizedCostCode,
    description: costCodeMeta?.title ?? normalizedCostCode,
    is_active: true,
    // cost_type_id intentionally omitted — Acumatica transactions don't carry it
  })
  .select("id")
  .single();
```

- [ ] **Step 3: Update the error message string (line 334)**

```typescript
// Before:
result.errors.push(`Failed to insert project_cost_codes entry...`);

// After:
result.errors.push(`Failed to insert project_budget_codes entry for ${normalizedCostCode}: ${insertProjectCostCodeError.message}`);
```

- [ ] **Step 4: Run the type checker**

```bash
cd frontend && npm run typecheck 2>&1 | grep "acumatica"
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/acumatica/sync.ts
git commit -m "fix(acumatica): sync direct costs to project_budget_codes instead of project_cost_codes"
```

---

## Task 8: Update Hooks and Setup Wizard

**Files:**
- Modify: `frontend/src/hooks/use-project-cost-codes.ts`
- Modify: `frontend/src/components/project-setup-wizard/cost-code-setup.tsx`
- Modify: `frontend/src/components/project-setup-wizard/budget-setup.tsx`
- Modify: `frontend/src/app/(main)/[projectId]/direct-costs/page.tsx`

- [ ] **Step 1: Update `use-project-cost-codes.ts` (line 102)**

```typescript
// Before:
.from("project_cost_codes")

// After:
.from("project_budget_codes")
```

The hook selects `id, cost_code_id, cost_type_id, is_active` — all columns that exist on `project_budget_codes`.

- [ ] **Step 2: Update `cost-code-setup.tsx` (line 155, 321, 356)**

Replace every `.from("project_cost_codes")` with `.from("project_budget_codes")`.

The setup wizard reads `id, cost_code_id, cost_type_id, is_active` and inserts `{ project_id, cost_code_id, cost_type_id, is_active }`. Add `description` to each insert:

```typescript
// Before insert:
.insert({ project_id: projectId, cost_code_id: ..., cost_type_id: ..., is_active: true })

// After — resolve description first:
// Either batch-resolve from cost_codes before the insert loop,
// or inline: description: costCodeTitle ?? cost_code_id
.insert({ project_id: projectId, cost_code_id: ..., cost_type_id: ..., description: costCodeTitle ?? cost_code_id, is_active: true })
```

Look at the existing code to confirm whether `costCodeTitle` is already in scope at the insert site. It should be since the setup wizard already displays names.

- [ ] **Step 3: Update `budget-setup.tsx` (line 97, 217)**

Same pattern — replace `project_cost_codes` with `project_budget_codes`. Add `description` to any insert.

- [ ] **Step 4: Update `direct-costs/page.tsx` (line 70)**

```typescript
// Before:
.from("project_cost_codes")

// After:
.from("project_budget_codes")
```

- [ ] **Step 5: Run the type checker**

```bash
cd frontend && npm run typecheck 2>&1 | grep -E "use-project-cost|cost-code-setup|budget-setup|direct-costs/page"
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/hooks/use-project-cost-codes.ts \
  frontend/src/components/project-setup-wizard/ \
  frontend/src/app/\(main\)/\[projectId\]/direct-costs/page.tsx
git commit -m "fix: switch hooks and setup wizard to project_budget_codes"
```

---

## Task 9: Fix the Import-From-Budget End-to-End Flow

This is the reason we started all of this. After migration, `budget_lines` and `contract_line_items` both reference `project_budget_codes`. The import flow can now pass `project_budget_code_id` directly — no lookup, no guessing.

**Files:**
- Modify: `frontend/src/components/domain/contracts/ImportFromBudgetModal.tsx`
- Modify: `frontend/src/components/domain/contracts/ContractForm.tsx`
- Modify: `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/import/route.ts`

### Part A — `ImportFromBudgetModal.tsx`: expose `project_budget_code_id` in the budget line fetch

The modal fetches from `/api/projects/${projectId}/budget`. Check what that endpoint returns for each line item and confirm `project_budget_code_id` is included. If not, add it.

- [ ] **Step 1: Check the `/api/projects/[projectId]/budget` response**

```bash
grep -n "project_budget_code_id\|lineItems" \
  frontend/src/app/api/projects/[projectId]/budget/route.ts | head -20
```

If `project_budget_code_id` is not in the lineItems shape, find where lineItems are assembled and add the field.

- [ ] **Step 2: Update `BudgetLineItem` interface in `ImportFromBudgetModal.tsx`**

```typescript
// Before (line 21):
interface BudgetLineItem {
  id: string;
  costCode: string;
  costCodeDescription: string;
  costType: string;
  description: string;
  originalBudgetAmount: number;
}

// After:
interface BudgetLineItem {
  id: string;
  costCode: string;
  costCodeDescription: string;
  costType: string;
  description: string;
  originalBudgetAmount: number;
  projectBudgetCodeId: string | null;   // ← add this
}
```

### Part B — `ContractForm.tsx`: use `projectBudgetCodeId` directly

- [ ] **Step 3: Replace the workaround matching code in `handleImportFromBudgetSuccess` (lines 623–680)**

```typescript
const handleImportFromBudgetSuccess = (items: unknown[]) => {
  const importedItems = Array.isArray(items) ? items : [];
  if (importedItems.length === 0) return;

  let unmappedCount = 0;
  const mapped: SOVLineItem[] = importedItems.map((raw, index) => {
    const item = raw as {
      id?: string;
      costCode?: string;
      costCodeDescription?: string;
      description?: string;
      originalBudgetAmount?: number;
      projectBudgetCodeId?: string | null;
    };

    // Direct pass-through — both tables now reference project_budget_codes
    const budgetCodeId = item.projectBudgetCodeId ?? "";
    if (!budgetCodeId) unmappedCount++;

    // Label comes from the budget-codes dropdown that's already loaded
    const matchingCode = budgetCodes.find((bc) => bc.id === budgetCodeId);

    return {
      id: `sov-import-${Date.now()}-${index}`,
      budgetCodeId,
      budgetCodeLabel: matchingCode?.fullLabel ?? item.costCodeDescription ?? item.costCode ?? "",
      description: item.costCodeDescription || item.description || item.costCode || "",
      amount: item.originalBudgetAmount || 0,
      billedToDate: 0,
      amountRemaining: item.originalBudgetAmount || 0,
    };
  });

  setFormData((prev) => ({
    ...prev,
    sovItems: [...(prev.sovItems || []), ...mapped],
  }));

  if (unmappedCount > 0) {
    toast.warning(
      `${unmappedCount} item${unmappedCount !== 1 ? "s" : ""} had no budget code — please select manually before saving.`,
    );
  } else {
    toast.success(`Imported ${mapped.length} SOV line item${mapped.length === 1 ? "" : "s"}`);
  }
};
```

### Part C — `line-items/import/route.ts`: pass `project_budget_code_id` onto inserted rows

- [ ] **Step 4: Update the import route insert (line 169)**

The route fetches `budget_lines` and inserts `contract_line_items`. Add `project_budget_code_id` to the select and write it to `budget_code_id`:

```typescript
// In the budget query select (line 71):
let budgetQuery = supabase
  .from("budget_lines")
  .select(
    `id, cost_code_id, cost_type_id, description, original_amount,
     project_budget_code_id,          -- ← add this
     cost_codes ( title ),
     cost_code_types ( code, description )`,
  )
  ...

// In the insert (line 169):
const { data: insertedItem, error: insertError } = await supabase
  .from("contract_line_items")
  .insert({
    contract_id: contractId,
    line_number: lineNumber,
    description,
    cost_code_id: budgetLine.cost_code_id,
    budget_code_id: budgetLine.project_budget_code_id ?? null,  // ← direct pass-through
    quantity: 1,
    unit_of_measure: "LS",
    unit_cost: budgetLine.original_amount,
    total_cost: budgetLine.original_amount,
  })
  .select("*")
  .single();
```

- [ ] **Step 5: Run the type checker**

```bash
cd frontend && npm run typecheck 2>&1 | grep -E "ContractForm|ImportFromBudget|line-items/import"
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/components/domain/contracts/ImportFromBudgetModal.tsx \
  frontend/src/components/domain/contracts/ContractForm.tsx \
  frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/import/route.ts
git commit -m "fix(prime-contracts): import-from-budget passes project_budget_code_id directly — no lookup needed"
```

---

## Task 10: Full Typecheck, Smoke Test, and Cleanup

- [ ] **Step 1: Run the full typecheck**

```bash
cd frontend && npm run typecheck 2>&1 | grep -v "node_modules" | head -30
```

Expected: zero errors. Fix any remaining references to `project_cost_codes` that the type checker surfaces.

- [ ] **Step 2: Run the lint check**

```bash
cd frontend && npm run lint 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 3: Smoke test the critical flows**

Test these manually in the browser at `http://localhost:3000`:

1. **Budget page** — loads without error, budget codes dropdown works
2. **New Prime Contract** → Import from Budget → creates contract with SOV → budget codes are pre-filled correctly (no "select manually" warning)
3. **Edit existing Prime Contract** → SOV line items show correct budget codes
4. **Direct Costs** — create a direct cost, budget code dropdown loads

- [ ] **Step 4: Verify no orphaned `project_cost_codes` references remain**

```bash
grep -rn "project_cost_codes" \
  frontend/src/ \
  supabase/migrations/ \
  --include="*.ts" --include="*.tsx" --include="*.sql" \
  | grep -v ".next" \
  | grep -v "database.types.ts" \
  | grep -v "node_modules"
```

Expected: zero results (except possibly in old migration files that are historical — those are fine).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: cleanup — verify no remaining project_cost_codes references"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ DB migration that merges tables and fixes FKs
- ✅ Backfill existing `contract_line_items` and `direct_cost_line_items` rows
- ✅ `/budget-codes` API switches to `project_budget_codes`
- ✅ `compute-grand-totals` direct-cost rollup fixed
- ✅ `direct-costs` route translation layer fixed
- ✅ Change events routes simplified (use `project_budget_code_id` directly)
- ✅ Acumatica sync fixed
- ✅ Hooks and setup wizard fixed
- ✅ Import-from-budget end-to-end fixed (the original bug)
- ✅ Workaround matching code in `ContractForm.tsx` removed

**Known edge cases not covered here (separate tasks):**
- `change_event_line_items.budget_code_id` still references `budget_lines.id` — this is a separate design issue unrelated to the `project_cost_codes` vs `project_budget_codes` split
- `prime_contract_sovs` table is only used in the payment-application populate-SOV route; it already references `project_budget_codes` so no change needed
