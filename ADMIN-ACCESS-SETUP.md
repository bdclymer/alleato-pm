# Super Admin Access Setup

## What Was Fixed

### 1. SQL Script Correction
**Problem:** The script was trying to update a `users` table that doesn't exist.

**Fix:** Updated [scripts/set-admin-access.sql](scripts/set-admin-access.sql) to use the correct `user_profiles` table.

### 2. Automated Setup Script
**Created:** [frontend/scripts/set-admin.mjs](frontend/scripts/set-admin.mjs)

This script:
- Checks if the user exists in `user_profiles`
- Sets `is_admin = true`
- Verifies the change
- Provides clear feedback

**Usage:**
```bash
cd frontend
npm run set-admin megan@megankharrison.com
```

### 3. Admin Status Verification
**Created:**
- API endpoint: `/api/auth/admin-check`
- Web page: `/admin-check`

Visit `http://localhost:3000/admin-check` to verify your admin status in the browser.

## How Super Admin Works

### Auth Flow
1. User logs in via Supabase Auth
2. System checks `user_profiles.is_admin`
3. If `is_admin = true`, the user gets:
   - ✅ Access to ALL projects (no membership required)
   - ✅ Bypass of ALL permission checks
   - ✅ Full read/write/admin access to every module

### Implementation Details

#### Auth Guard ([lib/supabase/auth-guard.ts](frontend/src/lib/supabase/auth-guard.ts))
- Lines 56-73: Check admin status and return synthetic membership
- Lines 119-128: Bypass permission checks for admins

#### Permission Service ([services/permissionService.ts](frontend/src/services/permissionService.ts))
- Lines 39-58: `isAppAdmin()` checks `user_profiles.is_admin`
- Lines 130-133: Admin users bypass all permission checks in `hasPermission()`

#### Protected API Routes
Routes using `verifyProjectAccess()` or `verifyProjectPermission()` automatically respect admin status.

Example from [api/projects/[projectId]/directory/activity/route.ts](frontend/src/app/api/projects/[projectId]/directory/activity/route.ts):
```typescript
const authResult = await verifyProjectAccess(projectIdNum);
if (isAuthError(authResult)) return authResult;

const permissionService = new PermissionService(supabase);
await permissionService.requirePermission(user.id, projectId, "directory", "read");
// ✅ Admin users pass this check automatically
```

## Verification Steps

### Option 1: Use the Web Interface
1. Start the dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/admin-check`
3. Check that:
   - ✅ "Logged In" shows "Yes"
   - ✅ "Admin Access" shows "✅ Enabled"
   - ✅ You see the green success message

### Option 2: Use the API Directly
```bash
# Get your session cookie from browser DevTools
# Then make a request:
curl -b "your-session-cookie" http://localhost:3000/api/auth/admin-check
```

Expected response:
```json
{
  "authenticated": true,
  "email": "megan@megankharrison.com",
  "isAdmin": true,
  "adminAccess": {
    "enabled": true,
    "description": "✅ You have super admin access to all projects"
  }
}
```

### Option 3: Test Project Access
1. Try accessing a project you're NOT a member of
2. Navigate to: `http://localhost:3000/[projectId]/budget`
3. ✅ You should see the page (not a 403 error)
4. ✅ All features should work without permission errors

## Troubleshooting

### Issue: "User profile not found"
**Cause:** User hasn't logged in yet to create their profile.

**Fix:** Log in to the application once to trigger profile creation.

### Issue: "No person record found"
**Cause:** Missing entry in `users_auth` table linking auth user to person.

**Fix:** Run this SQL:
```sql
-- First, find your auth user ID
SELECT id, email FROM auth.users WHERE email = 'megan@megankharrison.com';

-- Then create a person record if needed
INSERT INTO people (first_name, last_name, email, person_type)
VALUES ('Megan', 'Harrison', 'megan@megankharrison.com', 'user')
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Finally, link auth user to person
INSERT INTO users_auth (auth_user_id, person_id)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'megan@megankharrison.com'),
  (SELECT id FROM people WHERE email = 'megan@megankharrison.com')
)
ON CONFLICT DO NOTHING;
```

### Issue: "Still getting 403 errors"
**Possible causes:**
1. Not logged in as the admin user
2. Browser cache - try hard refresh (Cmd+Shift+R)
3. API route not using auth guard - check if it calls `verifyProjectAccess()`

**Debug steps:**
1. Check `/admin-check` page shows admin enabled
2. Check browser console for errors
3. Check server logs for permission failures

## Current Status

✅ Admin user set: `megan@megankharrison.com`
✅ Auth guard respects admin status
✅ Permission service bypasses checks for admins
✅ Verification tools available

## Files Changed/Created

### Fixed
- `scripts/set-admin-access.sql` - Corrected table name

### Created
- `frontend/scripts/set-admin.mjs` - Automated admin setup
- `frontend/src/app/api/auth/admin-check/route.ts` - Diagnostic API
- `frontend/src/app/(main)/admin-check/page.tsx` - Admin check UI
- `ADMIN-ACCESS-SETUP.md` - This documentation

### Modified
- `frontend/package.json` - Added `set-admin` script

## Next Steps

1. Visit `/admin-check` to verify your admin status
2. Test accessing projects you're not a member of
3. Try features that normally require permissions
4. If issues persist, check the troubleshooting section above

## Support

If you're still experiencing issues, run the diagnostic and share the output:
```bash
npm run set-admin megan@megankharrison.com
```

Then visit `/admin-check` and screenshot the results.
