# RLS Policy Fix Summary

## Problem
`new row violates row-level security policy for table "direct_costs"`

## Root Cause
Test user (test1@mail.com) was not in the `project_members` table, so the RLS policy correctly blocked the INSERT operation.

## RLS Policy (Working as Designed)
```sql
CREATE POLICY "Users can create direct costs in their projects"
  ON direct_costs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = direct_costs.project_id
      AND pm.user_id = auth.uid()
    )
  );
```

## Solution Applied
Added test user to project_members table with admin access:

```sql
INSERT INTO project_members (project_id, user_id, access)
VALUES (
  25108,
  '6ae4299f-6c21-4e99-b6a1-ccb1fe5aa7f6',
  'admin'
);
```

## Test Results

### Before Fix
```
Error: new row violates row-level security policy for table "direct_costs"
```

### After Fix
```json
{
  "id": "261c0e46-db7f-40d4-94eb-4bb2aa17fd96",
  "project_id": 25108,
  "cost_type": "Expense",
  "date": "2026-01-10",
  "status": "Draft",
  "description": "RLS Test Insert",
  "total_amount": 100,
  "created_at": "2026-01-10T21:05:55.639291+00:00",
  "created_by_user_id": "6ae4299f-6c21-4e99-b6a1-ccb1fe5aa7f6"
}
```

✅ **INSERT SUCCESSFUL**

## Database State

### Test User
- **Email:** test1@mail.com
- **UUID:** 6ae4299f-6c21-4e99-b6a1-ccb1fe5aa7f6
- **Authentication:** Working (Bearer token validated)

### Project Access
- **Project ID:** 25108
- **Project Name:** Goodwill Tremont
- **User Access:** admin
- **Permissions:** Full access (INSERT, SELECT, UPDATE, DELETE)

### Other Available Projects
- 25117: Aspire Kissimmee Gardens
- 25113: Radial Martinsville VA
- 25114: Radial Avon IN
- 120: Radial Miami

## Migration Status
Migration file `20260110_fix_direct_costs_schema.sql` is applied to production database.

## API Ready
The direct costs API endpoint is now ready for testing with:
- **Bearer Token:** From test1@mail.com authentication
- **Project ID:** 25108 (or any project the user has access to)

## Important Notes

1. **RLS Policy is Correct** - It enforces project-based access control
2. **User Must Be in project_members** - This is by design for security
3. **Schema Field Names:**
   - project_members uses `access` (not `role`)
   - project_id is `bigint` type (not UUID)

## Verification Script
Location: `.claude/fix-rls-complete.mjs`

To re-run verification:
```bash
export $(grep SUPABASE_SERVICE_ROLE_KEY .env | xargs)
node .claude/fix-rls-complete.mjs
```

## Status: ✅ RESOLVED

The RLS policy is working correctly. Users can now insert direct_costs for projects they have access to via the project_members table.
