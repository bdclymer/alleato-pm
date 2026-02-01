# Authentication Error Patterns

## Pattern: Missing users_auth Link

### Symptom
RLS policies fail with error:
```
column p.auth_user_id does not exist
```

### Root Cause
Attempting to join directly to `people.auth_user_id` when the schema uses a separate `users_auth` linking table.

### Schema Structure
```sql
-- people table does NOT have auth_user_id column
CREATE TABLE people (
    id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT
);

-- users_auth is the linking table
CREATE TABLE users_auth (
    auth_user_id UUID PRIMARY KEY,
    person_id INTEGER REFERENCES people(id)
);
```

### Wrong Pattern (Will Fail)
```sql
-- ❌ WRONG - people table has no auth_user_id column
CREATE POLICY "users_view_own_data"
ON some_table
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM project_directory_memberships pdm
        JOIN people p ON p.id = pdm.person_id
        WHERE p.auth_user_id = auth.uid()  -- ❌ Column doesn't exist
        AND pdm.project_id = some_table.project_id
    )
);
```

### Correct Pattern (Use users_auth)
```sql
-- ✅ CORRECT - use users_auth linking table
CREATE POLICY "users_view_own_data"
ON some_table
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM project_directory_memberships pdm
        JOIN users_auth ua ON ua.person_id = pdm.person_id  -- ✅ Use users_auth
        WHERE ua.auth_user_id = auth.uid()  -- ✅ auth_user_id is in users_auth
        AND pdm.project_id = some_table.project_id
    )
);
```

### Prevention Steps
1. **Before writing RLS policies:**
   ```bash
   # Generate fresh types
   npm run db:types

   # Search for existing RLS pattern in migrations
   grep -r "users_auth" supabase/migrations/
   ```

2. **Verify auth pattern:**
   - Check if `people` table has `auth_user_id` column (it doesn't)
   - Use `users_auth` table for auth.uid() lookups
   - Join path: `users_auth.person_id → people.id`

3. **Template for RLS policies:**
   ```sql
   -- Standard auth check pattern
   EXISTS (
       SELECT 1 FROM project_directory_memberships pdm
       JOIN users_auth ua ON ua.person_id = pdm.person_id
       WHERE ua.auth_user_id = auth.uid()
       AND pdm.project_id = [table].project_id
   )
   ```

### Historical Incidents
- **2026-02-01**: Specifications migration RLS policies failed with this exact error
- **Fix**: Replaced all `people p` joins with `users_auth ua` joins
- **Files affected**: `20260201000001_add_specifications_system.sql` (25 policies updated)

### Verification Query
```sql
-- Test if users_auth link exists for current user
SELECT ua.*, p.first_name, p.last_name
FROM users_auth ua
JOIN people p ON ua.person_id = p.id
WHERE ua.auth_user_id = auth.uid();
```

### Related Patterns
- See: `database-issues.md` for foreign key type matching
- See: `api-routing-errors.md` for permission validation in routes
