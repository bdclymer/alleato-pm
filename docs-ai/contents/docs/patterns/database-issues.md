# Database Error Patterns

## Pattern: Foreign Key Type Mismatch

### Symptom
Queries return no results even when data exists. No error messages, just silent failures.

### Root Cause
Foreign key column type doesn't match the referenced primary key type (UUID vs INTEGER).

### Example Failure
```sql
-- projects table has INTEGER id
CREATE TABLE projects (
    id INTEGER PRIMARY KEY  -- ← INTEGER
);

-- ❌ WRONG - using UUID for project_id FK
CREATE TABLE schedule_tasks (
    id SERIAL PRIMARY KEY,
    project_id UUID REFERENCES projects(id)  -- ❌ Type mismatch!
);

-- Query will NEVER match
SELECT * FROM schedule_tasks
WHERE project_id = 31;  -- Comparing UUID to INTEGER fails silently
```

### Correct Pattern
```sql
-- ✅ CORRECT - FK type matches PK type
CREATE TABLE schedule_tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id)  -- ✅ INTEGER matches INTEGER
);
```

### Type Mapping Reference

| Referenced Table | PK Column | PK Type | Your FK Type |
|-----------------|-----------|---------|--------------|
| `projects` | `id` | `INTEGER` | `project_id INTEGER` |
| `companies` | `id` | `INTEGER` | `company_id INTEGER` |
| `people` | `id` | `INTEGER` | `person_id INTEGER` |
| `users_auth` | `auth_user_id` | `UUID` | `auth_user_id UUID` |
| `contracts` | `id` | `INTEGER` | `contract_id INTEGER` |

### Prevention Steps

**MANDATORY: Before creating any table with foreign keys:**

1. **Generate fresh types:**
   ```bash
   npm run db:types
   ```

2. **Read the types file:**
   ```bash
   # Check the referenced table's PK type
   grep -A 5 "export interface projects" frontend/src/types/database.types.ts
   ```

3. **Verify type match:**
   ```typescript
   // In database.types.ts
   export interface projects {
     Row: {
       id: number  // ← INTEGER, not UUID!
     }
   }
   ```

4. **Use matching type in migration:**
   ```sql
   CREATE TABLE my_table (
       project_id INTEGER  -- ✅ Matches projects.id type
   );
   ```

### Detection Query
```sql
-- Find FK type mismatches (PostgreSQL)
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    col.data_type AS fk_type,
    ref_col.data_type AS pk_type
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.columns col
    ON col.table_name = tc.table_name AND col.column_name = kcu.column_name
JOIN information_schema.columns ref_col
    ON ref_col.table_name = ccu.table_name AND ref_col.column_name = ccu.column_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND col.data_type != ref_col.data_type;  -- ← Type mismatch!
```

## Pattern: Missing Type Generation Before Migration

### Symptom
Migration creates tables that don't match existing schema patterns. TypeScript errors after migration.

### Root Cause
Writing migrations without first checking current schema state via generated types.

### Wrong Workflow
```bash
# ❌ WRONG - write migration blind
vim supabase/migrations/new_migration.sql
npx supabase db push
npm run db:types  # Too late!
```

### Correct Workflow
```bash
# ✅ CORRECT - types first
npm run db:types  # Generate from current state
cat frontend/src/types/database.types.ts | grep -A 10 "projects"  # Verify types

# Now write migration with verified types
vim supabase/migrations/new_migration.sql

# Apply migration
npx supabase db push

# Regenerate types to include new tables
npm run db:types
```

### Historical Incidents
- **2026-01-28**: `schedule_tasks` created with UUID project_id (should be INTEGER)
- **Impact**: All queries failed silently, E2E tests stuck on loading spinners
- **Root cause**: Didn't check `projects.id` type before creating FK
- **Fix**: Dropped and recreated table with INTEGER project_id

## Pattern: Column Name Case Sensitivity

### Symptom
TypeScript errors: `Property 'columnName' does not exist on type`

### Root Cause
Database uses snake_case, TypeScript expects exact match.

### Prevention
1. **Use exact column names from schema:**
   ```typescript
   // ❌ WRONG - camelCase doesn't match DB
   .select('firstName, lastName')

   // ✅ CORRECT - snake_case matches DB
   .select('first_name, last_name')
   ```

2. **Check generated types:**
   ```typescript
   // From database.types.ts
   export interface people {
     Row: {
       first_name: string | null  // ← snake_case, not firstName
       last_name: string | null
     }
   }
   ```

### Related Patterns
- See: `authentication-errors.md` for RLS policy examples
- See: `.claude/rules/SUPABASE-GATE.md` for full workflow

## Pattern: CHECK Constraint Violation on Insert

### Symptom
API POST returns 500 error. Supabase error:
```
{
  "code": "23514",
  "message": "new row for relation \"vertical_markup\" violates check constraint \"vertical_markup_markup_type_check\""
}
```

### Root Cause
The database table has a CHECK constraint that restricts allowed values for a column, but the frontend UI sends values that don't match the constraint. This commonly happens when:
1. UI uses PascalCase/display labels but the DB constraint expects lowercase values
2. UI offers more options than the DB constraint allows
3. The constraint was created in a migration but never communicated to the frontend code

### Example Failure
```sql
-- Database constraint allows ONLY these lowercase values:
CONSTRAINT vertical_markup_markup_type_check
  CHECK (markup_type = ANY (ARRAY['insurance','bond','fee','overhead','custom']))
```

```typescript
// ❌ WRONG - Frontend sends PascalCase values that violate the constraint
const COMMON_MARKUP_TYPES = [
  "Overhead",     // DB expects "overhead"
  "Profit",       // Not in constraint at all!
  "General Liability Insurance",  // Not in constraint!
];

// Select sends the display label as the value
<SelectItem key={type} value={type}>{type}</SelectItem>
```

### Correct Pattern
```typescript
// ✅ CORRECT - Map display labels to database-safe values
const MARKUP_TYPE_OPTIONS = [
  { label: "Overhead", value: "overhead" },
  { label: "Insurance", value: "insurance" },
  { label: "Bond", value: "bond" },
  { label: "Fee", value: "fee" },
  { label: "Custom", value: "custom" },
];

// Select uses the lowercase value for submission, label for display
<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
```

### Prevention Steps

1. **Check for CHECK constraints before building UI dropdowns:**
   ```bash
   # Search migrations for CHECK constraints on the target table
   grep -r "CHECK\|constraint" supabase/migrations/ | grep "your_table"
   ```

2. **Test inserts directly before building UI:**
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
       .insert({ your_column: "test_value" })
       .select().single();
     console.log(error ? "FAILED: " + error.message : "SUCCESS");
   })();
   '
   ```

3. **Always log the actual Supabase error in API routes:**
   ```typescript
   if (error) {
     console.error("Insert error:", error);  // ← Log the real error
     return NextResponse.json(
       { error: error.message || "Generic fallback" },
       { status: 500 },
     );
   }
   ```

### Detection
If an API POST returns 500 and you see `code: "23514"` in Supabase, it's always a CHECK constraint violation. The `message` field will name the exact constraint.

### Historical Incidents
- **2026-02-01**: `vertical_markup` insert failed with CHECK constraint violation. UI sent "Overhead" (PascalCase) but DB constraint only allowed "overhead" (lowercase). Also, UI offered 9 options (Profit, General Liability Insurance, etc.) but DB only allowed 5 values. Additionally, the percentage field showed a placeholder "10" but had empty actual value, causing client-side "Please fill in all fields" validation error.
- **Impact**: Users could not create any vertical markup entries on the budget settings page
- **Fix**: Replaced string array with label/value mapping, aligned UI options with DB constraint, set percentage default to "10" instead of empty string, added console.error logging to API route

### Related Patterns
- See: `SUPABASE-GATE.md` - Always test queries before claiming "fixed"
- See: `ROOT-CAUSE-GATE.md` - Gather runtime evidence before modifying code

## Pattern: Misleading Placeholder vs Empty Value in Forms

### Symptom
Form validation fails with "Please fill in all fields" even though the field appears to have a value. The input shows a number or text, but submitting triggers the validation error.

### Root Cause
The input uses `placeholder` to display a suggested value, but the actual React state (`value`) is an empty string. Users (and developers debugging) see "10" in the field and assume it's populated, but `value=""` with `placeholder="10"` just shows gray hint text.

### Example Failure
```typescript
// ❌ WRONG - Appears to show "10" but state is empty
const [percentage, setPercentage] = useState("");

<Input
  type="number"
  placeholder="10"   // ← Shows "10" visually
  value={percentage}  // ← But actual value is ""
  onChange={(e) => setPercentage(e.target.value)}
/>

// Validation check fails:
if (!percentage) {  // "" is falsy → fails
  toast.error("Please fill in all fields");
}
```

### Correct Pattern
```typescript
// ✅ CORRECT - Use a default value instead of placeholder
const [percentage, setPercentage] = useState("10");

<Input
  type="number"
  value={percentage}  // ← Actual value is "10"
  onChange={(e) => setPercentage(e.target.value)}
/>
```

### Prevention Steps
- When a field has a "common default" that most users would use, set it as the initial state value, not as a placeholder
- Reserve `placeholder` for hint text that describes what to enter (e.g., "Enter amount"), not for default values
- When resetting form state after submission, reset to the default value, not empty string

### Historical Incidents
- **2026-02-01**: Vertical markup "Add Markup" dialog showed "10" in percentage field but `newPercentage` was `""`. Users clicked "Add Markup" and got "Please fill in all fields" without understanding why.
- **Fix**: Changed `useState("")` to `useState("10")` and updated the reset logic to match

## Pattern: Swallowed API Errors (Generic Error Messages)

### Symptom
API returns 500 but the toast just says "Failed to create X" with no useful information. Server logs don't show the actual database error. Debugging requires adding console.error statements and retrying.

### Root Cause
API route catches the Supabase error but doesn't log it or return the actual message:

```typescript
// ❌ WRONG - Error is swallowed
if (error) {
  return NextResponse.json(
    { error: "Failed to create vertical markup" },  // Generic, unhelpful
    { status: 500 },
  );
}
```

### Correct Pattern
```typescript
// ✅ CORRECT - Log and return actual error
if (error) {
  console.error("Vertical markup insert error:", error);  // Server log
  return NextResponse.json(
    { error: error.message || "Failed to create vertical markup" },  // Specific
    { status: 500 },
  );
}
```

### Prevention Steps
- **Always** `console.error` the actual Supabase/database error object in API routes
- Return `error.message` to the client (it contains the constraint name or column info)
- Keep the generic message as a fallback only
- When debugging 500 errors, check server logs (`tail /tmp/nextjs-dev.log`) first

### Historical Incidents
- **2026-02-01**: Vertical markup POST returned 500 with "Failed to create vertical markup". No server-side logging. Required manual `node -e` Supabase test to discover the CHECK constraint error `23514`. Added `console.error` logging and specific error message passthrough.

### Related Patterns
- See: `ROOT-CAUSE-GATE.md` - Gather runtime evidence (actual error messages) before modifying code
