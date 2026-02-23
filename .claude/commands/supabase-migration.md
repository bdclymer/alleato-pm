---
description: "Create and apply a Supabase migration with type verification"
argument-hint: "<description of schema change>"
---

# /supabase-migration - Safe Schema Change

You are an automated migration engine. You DO NOT describe steps -- you EXECUTE them. Every step below is an action you perform using tools. Do not ask the user for confirmation between steps unless you encounter an ambiguity.

## Arguments

```bash
$ARGUMENTS
```
Parse the description of the desired schema change. Examples:

- "add columns phone, address to companies table"
- "create join table project_users linking projects and people"
- "add index on contracts.status"
- "add column due_date DATE to schedule_tasks"

## STEP 1: Read Current Database Types (MANDATORY)

Read `frontend/src/types/database.types.ts` using the Read tool.

This is NON-NEGOTIABLE. You must understand the current schema before writing ANY SQL.

From the types file, extract:

- All table names in `Tables` interface
- For each table mentioned in the user's request, note:
  - Column names and their TypeScript types
  - Which columns are nullable
  - Primary key type (number = INTEGER, string = UUID)

## STEP 2: Validate the Change

Before writing SQL, verify:

**For adding columns to existing tables:**

- Table exists in `database.types.ts`
- Column does NOT already exist
- If adding a FK column, verify the referenced table's PK type:

| Referenced Table PK Type | Your FK Column SQL Type |
|--------------------------|------------------------|
| `number` (e.g., `projects.id`) | `INTEGER` |
| `string` (e.g., `people.id`) | `UUID` |

**CRITICAL:** `projects.id` is INTEGER. Any `project_id` FK must be `INTEGER NOT NULL REFERENCES projects(id)`. This has caused bugs 3+ times.

**For creating new tables:**

- Table name does NOT already exist in types
- All FK references point to tables that DO exist
- FK column types match referenced PK types

**For creating join tables:**

- Both referenced tables exist
- PK types of both tables are noted
- Composite primary key or unique constraint planned

**For adding indexes:**

- Table and column both exist
- Index does not already exist (check migration files if uncertain)

## STEP 3: Generate Migration SQL

Create the migration SQL following these conventions:

**Table creation pattern:**

```sql
-- Always include:
-- 1. Primary key (UUID with gen_random_uuid() or SERIAL/INTEGER)
-- 2. project_id INTEGER FK if project-scoped
-- 3. created_at/updated_at timestamps
-- 4. created_by/updated_by UUID FKs to auth.users
-- 5. Indexes on all FKs
-- 6. updated_at trigger
-- 7. RLS enabled + 4 policies (SELECT, INSERT, UPDATE, DELETE)
```
**Column addition pattern:**
```sql
ALTER TABLE table_name
ADD COLUMN column_name TYPE [NOT NULL] [DEFAULT value];

-- Add index if it's a FK or frequently filtered
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column_name);
```

**Join table pattern:**

```sql
CREATE TABLE IF NOT EXISTS table_a_table_b (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_a_id TYPE NOT NULL REFERENCES table_a(id) ON DELETE CASCADE,
    table_b_id TYPE NOT NULL REFERENCES table_b(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(table_a_id, table_b_id)
);
```
**For RLS policies on project-scoped tables, use this exact pattern:**
```sql
CREATE POLICY "table_select_policy" ON table_name
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            WHERE pdm.project_id = table_name.project_id
            AND p.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );
```
## STEP 4: Write Migration File

Generate the filename with current timestamp:

- Format: `{YYYYMMDDHHMMSS}_{description_in_snake_case}.sql`
- Example: `20260131143000_add_phone_to_companies.sql`

Write the file to: `supabase/migrations/{filename}`

## STEP 5: Apply Migration

Try these in order until one works:

**Option A: Supabase MCP**
Use `mcp__supabase__apply_migration` with the migration name and SQL content.

**Option B: Execute SQL directly**
Use `mcp__supabase__execute_sql` with the SQL content.

**Option C: CLI**

```bash
npx supabase db push --project-id "lgveqfnpkxvzbnnwuled"
```
If the migration fails:
1. Read the error message carefully
2. Fix the SQL (common issues: wrong FK type, missing referenced table, syntax error)
3. Rewrite the migration file
4. Try again

## STEP 6: Regenerate Types

Run via Bash tool:
```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > /Users/meganharrison/Documents/github/alleato-pm/frontend/src/types/database.types.ts
```

## STEP 7: Verify Changes

Read `frontend/src/types/database.types.ts` and confirm:

**For new tables:**

- Table appears in `Tables` interface
- All columns present with correct types
- `project_id` is `number` (not `string`) if project-scoped

**For new columns:**

- Column appears in the table's `Row`, `Insert`, and `Update` types
- Type matches what was intended (e.g., `string` for TEXT, `number` for INTEGER)
- Nullability is correct (`string | null` vs `string`)

**For indexes/constraints:**

- No direct verification needed in types, but confirm migration ran without error

## STEP 8: Check for Downstream Impact

Search for files that import from or query the modified table:

```bash
# Find hooks, services, and API routes that reference this table
```
Use the Grep tool to search for the table name in:

- `frontend/src/hooks/`
- `frontend/src/services/`
- `frontend/src/app/api/`

If any existing code references columns that were renamed or removed, list those files so the user knows what needs updating.

## STEP 9: Report Results

Output a summary:

```markdown
## Migration Applied: {description}

### Migration File
`supabase/migrations/{filename}`

### Changes
- {description of each change}

### Type Verification
- [ ] Types regenerated
- [ ] New columns/tables visible in database.types.ts
- [ ] FK types match PK types

### Affected Files (may need updates)
- {list of files that reference the modified table, if any}
```

## CRITICAL RULES

1. **ALWAYS read database.types.ts first** - Never assume schema from memory
2. **FK types MUST match PK types** - INTEGER to INTEGER, UUID to UUID
3. **projects.id is INTEGER** - This is the #1 source of bugs
4. **Apply BEFORE regenerating types** - Types reflect the database, not vice versa
5. **Include RLS policies** for any new table - Missing RLS causes silent data access failures
6. **Include updated_at trigger** for any new table - Data integrity requires this
