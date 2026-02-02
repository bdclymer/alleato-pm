---
description: "Create a complete feature with validated Supabase table, API routes, hook, service, form, and page. Enforces all gates."
argument-hint: "<EntityName> [--fields 'name:text,amount:numeric,due_date:date'] [--skip-migration] [--skip-page] [--table <name>]"
---

# /create-feature - Hardened Feature Generator

You are an automated feature generator with MANDATORY validation gates.
You DO NOT describe steps -- you EXECUTE them.
You DO NOT skip validation -- if a gate fails, you STOP and fix it before continuing.

## Arguments

```
$ARGUMENTS
```

Parse:
- **EntityName** (required): PascalCase name, e.g., `ChangeOrder`, `DrawingArea`, `BudgetModification`
- **--fields** (optional): Comma-separated field definitions. Format: `fieldName:sqlType[:nullable]`
  - Examples: `amount:numeric`, `due_date:date:nullable`, `status:text`, `assignee_id:uuid:nullable`
  - If omitted, generates only `name` and `description` fields (customize after)
- **--skip-migration**: Table already exists, skip SQL generation
- **--skip-page**: Skip UI page/form generation (API + hook only)
- **--table <name>**: Override snake_case table name

---

## GATE 0: Read Patterns & Reference Docs (MANDATORY)

Read ALL of these files using the Read tool (in parallel):

**Reference docs (how to do things right):**
1. **`.claude/FK-TYPES-REFERENCE.md`** -- FK type lookup (which PKs are INTEGER vs UUID)
2. **`.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md`** -- Route naming rules (prevent `[id]` conflicts)
3. **`.claude/rules/SUPABASE-GATE.md`** -- Database type safety requirements

**Pattern docs (what has gone wrong before and how to avoid it):**
4. **`docs-ai/contents/docs/patterns/database-issues.md`** -- FK mismatch, CHECK constraints, table renames
5. **`docs-ai/contents/docs/patterns/api-routing-errors.md`** -- Route conflicts, async params
6. **`docs-ai/contents/docs/patterns/authentication-errors.md`** -- users_auth chain, RLS failures

**Prevention system:**
7. **`.claude/PREVENTION-CHECKLIST.md`** -- All 9 known failure gates with triggers and fixes

After reading, internalize these facts before writing ANY code:

**Database:**
- `projects.id` is `number` (INTEGER) -- project_id FK must be INTEGER
- `people.id` is `string` (UUID)
- `companies.id` is `string` (UUID)
- `auth.users.id` is `string` (UUID) -- created_by/updated_by are UUID

**API Routes:**
- Route params: `[projectId]`, `[companyId]`, `[contractId]` -- NEVER `[id]`
- Params are async in Next.js 15: `const { projectId } = await params`
- Server Supabase client: `await createClient()` (with await)
- Browser Supabase client: `createClient()` (no await)

**Known Failure Patterns (from pattern docs -- these have caused real incidents):**
- FK type mismatch INTEGER vs UUID (`database-issues.md`) -- Gate 1d catches this
- CHECK constraint case sensitivity (`database-issues.md`) -- use exact case from migration
- Table renamed but old name in code (`database-issues.md`) -- always use database.types.ts names
- Route param `[id]` vs `[projectId]` conflict (`api-routing-errors.md`) -- Gate 2b catches this
- Async params not awaited in Next.js 15 (`api-routing-errors.md`) -- template handles this
- Missing users_auth link breaks RLS (`authentication-errors.md`) -- test with real auth
- Missing RLS policies -- scaffold template includes them
- Stale `.next` cache after route creation -- Gate 2e clears cache

If `.claude/FK-TYPES-REFERENCE.md` doesn't exist or is outdated, generate fresh types first (Step 6 below) and read the types file to verify.

---

## STEP 1: Derive All Names

From EntityName (e.g., `DrawingArea`):

| Variable | Rule | Example |
|----------|------|---------|
| `ENTITY` | PascalCase | `DrawingArea` |
| `entity` | camelCase | `drawingArea` |
| `entities` | camelCase plural | `drawingAreas` |
| `ENTITY_TABLE` | snake_case plural | `drawing_areas` |
| `ENTITY_ID` | camelCase + "Id" | `drawingAreaId` |
| `entity-kebab` | kebab-case plural | `drawing-areas` |

Pluralization rules:
- Default: add "s"
- Ends in "y" (not vowel+y): replace "y" with "ies" (Category -> Categories)
- Ends in "s","x","z","ch","sh": add "es"
- Irregular: handle manually (Person -> People)

---

## GATE 1: Verify Database State (BLOCKING)

### 1a. Generate fresh types
```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > /Users/meganharrison/Documents/github/alleato-pm/frontend/src/types/database.types.ts
```

### 1b. Read the types file
Read `frontend/src/types/database.types.ts` using the Read tool.

### 1c. Validate
**If `--skip-migration` is set:**
- Search for `ENTITY_TABLE` in the types file
- **FAIL if table NOT found** -- tell user to remove `--skip-migration`
- If found: extract ALL column names and types. Store these for Step 3.

**If `--skip-migration` is NOT set:**
- Confirm `ENTITY_TABLE` does NOT already exist in types
- If it exists: WARN and ask user if they want `--skip-migration`
- Confirm `projects` table exists and `id` is `number` (INTEGER)

### 1d. FK Type Validation Checkpoint
For every field in `--fields` that ends in `_id`:
1. Identify the referenced table (e.g., `company_id` -> `companies`)
2. Find that table in `database.types.ts`
3. Check its `id` type
4. Map to SQL type:
   - `number` -> `INTEGER`
   - `string` -> `UUID`
5. **FAIL if types would mismatch** -- display error and stop

**This checkpoint is NON-NEGOTIABLE. It prevents the #1 recurring bug.**

---

## STEP 2: Read Scaffold Templates

Read ALL templates in parallel:
- `.claude/scaffolds/crud-resource/migration.sql`
- `.claude/scaffolds/crud-resource/service.ts`
- `.claude/scaffolds/crud-resource/hook.ts`
- `.claude/scaffolds/crud-resource/api-route.ts`
- `.claude/scaffolds/crud-resource/form-dialog.tsx`
- `.claude/scaffolds/crud-resource/page.tsx`

---

## STEP 3: Generate Code with Field Customization

### 3a. Replace standard placeholders
In every template:
- `__ENTITY__` -> `ENTITY` (PascalCase)
- `__entity__` -> `entity` (camelCase)
- `__entities__` -> `entities` (camelCase plural)
- `__ENTITY_TABLE__` -> `ENTITY_TABLE` (snake_case)
- `__ENTITY_ID__` -> `ENTITY_ID` (camelCase + Id)

### 3b. Customize fields (if `--fields` provided)
For the migration, replace the "Core fields" section with the user's fields:

```sql
-- Core fields (customize these)
-- Replace this section with actual fields from --fields arg
```

Map field types:
| Arg Type | SQL Type | TS Type |
|----------|----------|---------|
| `text` | `TEXT` | `string` |
| `numeric` | `NUMERIC(15,2)` | `number` |
| `integer` | `INTEGER` | `number` |
| `date` | `DATE` | `string` |
| `timestamp` | `TIMESTAMPTZ` | `string` |
| `boolean` | `BOOLEAN DEFAULT false` | `boolean` |
| `uuid` | `UUID` | `string` |
| `json` | `JSONB` | `Json` |

For the service DTOs, form schema, and page table, add the custom fields too.

For the Zod form schema, map to Zod validators:
| Arg Type | Zod Validator |
|----------|---------------|
| `text` | `z.string().min(1, "Required")` |
| `numeric` | `z.coerce.number()` |
| `integer` | `z.coerce.number().int()` |
| `date` | `z.string().optional()` |
| `boolean` | `z.boolean().default(false)` |
| `uuid` | `z.string().uuid().optional()` |

### 3c. ALWAYS keep these standard fields in migration
Never remove from the template:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE`
- `created_at`, `updated_at`, `created_by`, `updated_by`
- All indexes
- `updated_at` trigger
- All 4 RLS policies

---

## STEP 4: Write All Files

Write each file to the correct location:

| File | Path | Skip Condition |
|------|------|----------------|
| Migration | `supabase/migrations/{YYYYMMDDHHMMSS}_create_{ENTITY_TABLE}.sql` | `--skip-migration` |
| Service | `frontend/src/services/{entity}Service.ts` | never |
| Hook | `frontend/src/hooks/use-{entity-kebab}.ts` | never |
| API Route (collection) | `frontend/src/app/api/projects/[projectId]/{entity-kebab}/route.ts` | never |
| API Route (single) | `frontend/src/app/api/projects/[projectId]/{entity-kebab}/[{ENTITY_ID}]/route.ts` | never |
| Form Dialog | `frontend/src/components/domain/{entity-kebab}/{ENTITY}FormDialog.tsx` | `--skip-page` |
| Page | `frontend/src/app/(main)/[projectId]/{entity-kebab}/page.tsx` | `--skip-page` |

For the API route split: The template has two sections. First (GET+POST) goes to collection route. Second (GET by ID, PATCH, DELETE) goes to single-resource route (uncomment it).

---

## STEP 5: Apply Migration (unless --skip-migration)

Use `mcp__supabase__apply_migration` or `mcp__supabase__execute_sql`.

If it fails:
1. Read the error
2. Fix the SQL
3. Rewrite the migration file
4. Try again
5. If it fails again, STOP and report the error to the user

---

## STEP 6: Regenerate Types

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > /Users/meganharrison/Documents/github/alleato-pm/frontend/src/types/database.types.ts
```

---

## GATE 2: Post-Generation Validation (BLOCKING)

ALL of these must pass. If ANY fails, fix before continuing.

### 2a. Types Verification
Read `frontend/src/types/database.types.ts` and confirm:
- [ ] Table `ENTITY_TABLE` exists in `Tables` interface
- [ ] `project_id` column type is `number` (NOT `string`)
- [ ] All custom fields are present with correct types
- [ ] All Insert/Update variants are present

### 2b. Route Conflict Check
```bash
bash scripts/check-route-conflicts.sh
```
**If it fails: FIX immediately. Do not continue.**

### 2c. TypeScript Compilation
```bash
cd /Users/meganharrison/Documents/github/alleato-pm/frontend && npx tsc --noEmit 2>&1 | head -80
```

**If there are type errors in the generated files:**
1. Read the error messages
2. Fix each error
3. Re-run typecheck
4. Repeat until clean

**Common fixes:**
- Service method uses wrong column name -> check database.types.ts
- Hook type doesn't match -> update type extraction
- API route params wrong -> must use `Promise<{ projectId: string }>`
- Import path wrong -> verify file exists at expected location

### 2d. Import Verification
For each generated file, verify its imports resolve:
- Service imports `Database` from `@/types/database.types`
- Hook imports `Database` from `@/types/database.types`
- API route imports service from `@/services/{entity}Service`
- Page imports hook from `@/hooks/use-{entity-kebab}`
- Page imports form dialog from `@/components/domain/{entity-kebab}/{ENTITY}FormDialog`

### 2e. Clear Next.js Cache (if page files were created)
If page files were written (not `--skip-page`), clear the cache to prevent stale 404s:
```bash
rm -rf /Users/meganharrison/Documents/github/alleato-pm/frontend/.next
```
This is from Prevention Checklist Gate #1 -- stale cache has wasted 90+ minutes across 3 incidents.

---

## STEP 7: Add to Navigation (unless --skip-page)

Read `frontend/src/lib/menu-list.ts` and add the new entity to the project menu:
- Find the existing menu items array
- Add a new entry following the existing pattern
- Use the kebab-case path: `/{entity-kebab}`
- Use an appropriate Lucide icon

---

## STEP 8: Report Results

```
## Feature Created: {ENTITY}

### Files Created
- [ ] Migration: supabase/migrations/{timestamp}_create_{table}.sql
- [ ] Service: frontend/src/services/{entity}Service.ts
- [ ] Hook: frontend/src/hooks/use-{entity-kebab}.ts
- [ ] API (collection): frontend/src/app/api/projects/[projectId]/{entity-kebab}/route.ts
- [ ] API (single): frontend/src/app/api/projects/[projectId]/{entity-kebab}/[{entityId}]/route.ts
- [ ] Form: frontend/src/components/domain/{entity-kebab}/{Entity}FormDialog.tsx
- [ ] Page: frontend/src/app/(main)/[projectId]/{entity-kebab}/page.tsx
- [ ] Navigation: frontend/src/lib/menu-list.ts (updated)

### Validation Results
- [ ] Table exists in database.types.ts with correct types
- [ ] project_id is INTEGER (number), not UUID
- [ ] No route parameter conflicts
- [ ] TypeScript compiles with zero errors
- [ ] All imports resolve correctly

### Fields
{table of fields with SQL type, TS type, nullable status}

### Next Steps
1. Customize the form fields for your domain (add/remove fields in the Zod schema and form JSX)
2. Customize the table columns in the list page
3. Add any entity-specific business logic to the service
4. Add relationships to other entities if needed
```

---

## HARD RULES (These Cannot Be Overridden)

1. **project_id is ALWAYS `INTEGER NOT NULL REFERENCES projects(id)`** -- the template has this correct, never change it
2. **Route params are ALWAYS `[projectId]`** -- never `[id]`
3. **Params are ALWAYS awaited** -- `const { projectId } = await params` (Next.js 15)
4. **projectId is ALWAYS parsed** -- `parseInt(projectId, 10)`
5. **Types are generated BEFORE writing service/hook code** -- if `--skip-migration`, types must already be correct
6. **TypeScript MUST compile** -- Gate 2c is blocking. Do not report success with type errors.
7. **Use the scaffold templates** -- do NOT write from scratch. Read the template, replace placeholders, customize fields.
8. **All FK types must match PK types** -- Gate 1d is blocking. INTEGER to INTEGER, UUID to UUID.
9. **Server supabase client uses `await createClient()`** -- not `createClient()` without await
10. **Browser supabase client uses `createClient()`** -- no await (it's synchronous)
