---
description: "Generate Feature from Templates (use /create-feature instead for hardened validation)"
argument-hint: "<EntityName> [--skip-migration] [--skip-page]"
---

# /scaffold - DEPRECATED: Use /create-feature instead

**This skill is superseded by `/create-feature` which adds mandatory validation gates.**

Run `/create-feature` with the same arguments instead. It includes:

- FK type validation (prevents the INTEGER/UUID mismatch bug)
- Mandatory TypeScript compilation check
- Route conflict detection
- Import verification
- Field customization via `--fields`

If you are reading this, STOP and use `/create-feature $ARGUMENTS` instead.

---

# Legacy instructions below (kept for reference only)

## Arguments

```bash
$ARGUMENTS
```typescript
Parse the entity name and any flags:

- `--skip-migration` - Skip database migration (table already exists)
- `--skip-page` - Skip page and form dialog generation
- `--table <name>` - Override table name (default: derived from entity)

## STEP 1: Derive All Names

From the entity name (e.g., "ScheduleTask"), compute:

| Variable | Rule | Example |
|----------|------|---------|
| `ENTITY` | PascalCase as given | `ScheduleTask` |
| `entity` | camelCase | `scheduleTask` |
| `entities` | camelCase plural | `scheduleTasks` |
| `ENTITY_TABLE` | snake_case plural | `schedule_tasks` |
| `ENTITY_ID` | camelCase + "Id" | `scheduleTaskId` |
| `entity-kebab` | kebab-case plural | `schedule-tasks` |

If `--table` flag provided, use that for `ENTITY_TABLE` instead.

**IMPORTANT pluralization rules:**

- Most entities: add "s" (Task → Tasks, Contract → Contracts)
- Entities ending in "y": replace with "ies" (Company → Companies, Category → Categories)
- Entities ending in "s", "x", "z", "ch", "sh": add "es" (Status → Statuses)
- Irregular: handle manually (Person → People)

## STEP 2: Verify Database Types (MANDATORY - Supabase Gate)

Read `frontend/src/types/database.types.ts` using the Read tool.

**If `--skip-migration` is set:**

- Search the file for `ENTITY_TABLE` (the snake_case table name)
- If table NOT found: STOP. Tell user the table doesn't exist and they need to remove `--skip-migration`
- If table IS found: note the column names and types for use in later steps

**If `--skip-migration` is NOT set:**

- Search the file for `ENTITY_TABLE` to make sure it does NOT already exist
- If table already exists: WARN user and ask if they want to add `--skip-migration`
- Also verify that `projects` table exists and note that `projects.id` is INTEGER (not UUID)

## STEP 3: Read All Scaffold Templates

Read these files using the Read tool (all reads in parallel):

- `.claude/scaffolds/crud-resource/migration.sql`
- `.claude/scaffolds/crud-resource/service.ts`
- `.claude/scaffolds/crud-resource/hook.ts`
- `.claude/scaffolds/crud-resource/api-route.ts`
- `.claude/scaffolds/crud-resource/form-dialog.tsx`
- `.claude/scaffolds/crud-resource/page.tsx`

## STEP 4: Replace Placeholders

For each template, perform these exact replacements:

- `__ENTITY__` → `ENTITY` (PascalCase)
- `__entity__` → `entity` (camelCase)
- `__entities__` → `entities` (camelCase plural)
- `__ENTITY_TABLE__` → `ENTITY_TABLE` (snake_case)
- `__ENTITY_ID__` → `ENTITY_ID` (camelCase + Id)

## STEP 5: Write Files

Write each generated file to the correct location using the Write tool:

| Template | Output Path |
|----------|-------------|
| `migration.sql` | `supabase/migrations/{YYYYMMDDHHMMSS}_create_{ENTITY_TABLE}.sql` |
| `service.ts` | `frontend/src/services/{entity}Service.ts` |
| `hook.ts` | `frontend/src/hooks/use-{entities}.ts` |
| `api-route.ts` (list/create section) | `frontend/src/app/api/projects/[projectId]/{entities}/route.ts` |
| `api-route.ts` (single resource section) | `frontend/src/app/api/projects/[projectId]/{entities}/[{ENTITY_ID}]/route.ts` |
| `form-dialog.tsx` | `frontend/src/components/domain/{entities}/{ENTITY}FormDialog.tsx` |
| `page.tsx` | `frontend/src/app/(main)/[projectId]/{entities}/page.tsx` |

**For the API route split:** The `api-route.ts` template has two sections separated by a comment. The first section (GET + POST) goes to the collection route. The commented-out second section (GET by ID, PATCH, DELETE) should be uncommented and placed in the `[{ENTITY_ID}]` route file.

**Skip files based on flags:**

- `--skip-migration`: Skip the migration.sql file
- `--skip-page`: Skip form-dialog.tsx and page.tsx

For the migration timestamp, use the current date/time in `YYYYMMDDHHMMSS` format.

## STEP 6: Apply Migration (unless --skip-migration)

Use the Supabase MCP tool `mcp__supabase__apply_migration` to apply the migration.

If the MCP tool is not available, run via Bash:

```bash
npx supabase migration up --project-id "lgveqfnpkxvzbnnwuled"
```text
If that also fails, apply via `mcp__supabase__execute_sql` with the SQL content.

## STEP 7: Regenerate Types

Run via Bash tool:
```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > /Users/meganharrison/Documents/github/alleato-pm/frontend/src/types/database.types.ts
```

## STEP 8: Verify Setup

Perform ALL of these checks:

**8a. Types verification:**
Read `frontend/src/types/database.types.ts` and search for the new table name. Confirm:

- Table exists in the `Tables` interface
- `project_id` column is `number` type (NOT string/UUID)
- All expected columns are present

**8b. Route conflict check:**
Run via Bash:

```bash
bash scripts/check-route-conflicts.sh
```bash
If it fails, FIX the conflict before proceeding.

**8c. TypeScript check:**
Run via Bash:
```bash
npm run typecheck --prefix frontend 2>&1 | head -50
```diff
If there are type errors in the generated files, fix them.

## STEP 9: Report Results

Output a summary:

```markdown
## Scaffold Complete: {ENTITY}

### Files Created
- [ ] Migration: supabase/migrations/{timestamp}_create_{table}.sql
- [ ] Service: frontend/src/services/{entity}Service.ts
- [ ] Hook: frontend/src/hooks/use-{entities}.ts
- [ ] API Route (list): frontend/src/app/api/projects/[projectId]/{entities}/route.ts
- [ ] API Route (single): frontend/src/app/api/projects/[projectId]/{entities}/[{entityId}]/route.ts
- [ ] Form Dialog: frontend/src/components/domain/{entities}/{Entity}FormDialog.tsx
- [ ] Page: frontend/src/app/(main)/[projectId]/{entities}/page.tsx

### Verification
- [ ] Table exists in database.types.ts
- [ ] project_id is INTEGER (not UUID)
- [ ] No route conflicts
- [ ] TypeScript compiles

### Next Steps
1. Add domain-specific columns to the migration (then re-run steps 6-8)
2. Update service DTOs with new fields
3. Update form schema with new fields
4. Add any entity-specific relationships or business logic
```

## CRITICAL RULES (Enforced by this skill)

1. **project_id is ALWAYS INTEGER** - The scaffold template already has this correct. Never change it to UUID.
2. **Route params use [projectId]** - Never use [id]. The templates already have this correct.
3. **Read types BEFORE writing code** - Step 2 is mandatory and cannot be skipped.
4. **Apply migration BEFORE regenerating types** - Order matters.
5. **Verify AFTER generating** - Step 8 catches issues before the user encounters them.
