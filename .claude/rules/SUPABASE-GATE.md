# Supabase Types Gate (MANDATORY)

## The Rule (5 seconds to read, saves hours of debugging)

**BEFORE writing ANY database code:**

1. Run `npm run db:types` (from frontend dir)
2. Read `frontend/src/types/database.types.ts`
3. Verify the table/column you need exists
4. **Verify FK column types match PK column types**
5. THEN write code

## Triggers

This gate applies when your task involves:

- Supabase queries
- SQL or migrations
- API routes with database calls
- React hooks fetching data
- Any file importing from `@/types/database.types`
- **Creating new tables with foreign keys**

## What "Read the Types" Means

```bash
# Generate types (use absolute path!)
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > /Users/meganharrison/Documents/github/alleato-procore/frontend/src/types/database.types.ts

# Then use Read tool on:
frontend/src/types/database.types.ts
```
Look for:
- Table exists in `Tables` interface
- Column names match exactly (case-sensitive)
- Relationships via foreign keys
- **FK column type matches referenced PK type** (see below)

## CRITICAL: Foreign Key Type Matching

When creating a table with a foreign key, the FK column type MUST match the PK type:

| Referenced Table | PK Type | Your FK Column Type |
|-----------------|---------|---------------------|
| `projects` | `id: number` | `project_id INTEGER` |
| `users` | `id: string` (UUID) | `user_id UUID` |
| `companies` | `id: number` | `company_id INTEGER` |

**INCIDENT (2026-01-28):** Claude created `schedule_tasks.project_id` as UUID, but `projects.id` is INTEGER. This broke ALL queries silently.

## Violations (DO NOT DO)

- Writing `.from('some_table')` without verifying `some_table` exists
- Referencing `.select('column_name')` without checking column exists
- Creating migrations that reference non-existent tables
- Assuming schema from memory or past conversations
- **Creating FK with wrong type (UUID vs INTEGER)**
- **Modifying service code based on grep searches without reading types**

## Why This Exists

Schema mismatches cause:
- Runtime errors that look like bugs
- Hours of debugging wrong code
- RLS policy failures that seem mysterious
- Type errors that cascade through the codebase
- **Silent query failures when FK types don't match PK types**

Reading types first catches all of this in seconds.

## MANDATORY: Test Query Before Claiming "Fixed"

**INCIDENT (2026-02-01):** Agent claimed direct costs page was "fixed" without testing the query. User reported: "I'm still getting this fucking error." Agent then tested and found FK type mismatch.

**BEFORE claiming a Supabase query works, you MUST test it:**

```bash
node -e '
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  const { data, error } = await supabase
    .from("your_table")
    .select(`
      *,
      relation:other_table(column1, column2)
    `)
    .limit(1);

  if (error) {
    console.error("❌ QUERY FAILED:");
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log("✅ QUERY WORKS");
  console.log("Returned:", data.length, "rows");
})();
'
```

**ONLY claim "fixed" if you see "✅ QUERY WORKS".**

**DO NOT claim "fixed" based on:**

- ❌ Page loads without crashing
- ❌ TypeScript compiles
- ❌ No syntax errors
- ❌ Looks correct

**ONLY claim "fixed" based on:**

- ✅ Actual query test shows SUCCESS
- ✅ Query returns data or empty array (not error)

## Verification Checklist for Supabase Queries

- [ ] Read existing `database.types.ts`
- [ ] For each FK join, verify:
  - [ ] FK column exists in source table
  - [ ] Referenced table exists
  - [ ] FK column type MATCHES PK type (INTEGER to INTEGER, UUID to UUID)
  - [ ] FK constraint exists in schema (check `foreignKeyName` in types)
- [ ] Test query with `node -e` script
- [ ] Query succeeds with ✅ QUERY WORKS
- [ ] **ONLY THEN** claim it works
