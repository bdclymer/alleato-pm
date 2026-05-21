# Auth JWT Hook — Runbook

## What This Does

The custom access token hook (`public.custom_access_token_hook`) runs at JWT issuance
time and embeds three claims into every access token:

- `is_admin` — boolean. `true` if `user_profiles.is_admin` OR `user_profiles.is_developer`.
  Developer implies admin, so any code path gated by `is_admin` automatically lets
  developers through.
- `is_developer` — boolean, sourced from `user_profiles.is_developer`. Use this
  for surfaces that should be hidden from regular admins (internal diagnostics,
  experimental features). Migration: `20260527000000_add_is_developer_role.sql`.
- `app_role` — text, sourced from `user_profiles.role` (defaults to `'team'`)

Before this hook, every page that needed to check admin status did a synchronous
`SELECT is_admin FROM user_profiles WHERE id = auth.uid()`. After the hook is
registered, `public.is_admin()` reads `auth.jwt() ->> 'is_admin'` instead — zero
extra DB round-trips. The same applies to `public.is_developer()`.

## How to make a user a developer

```sql
update public.user_profiles
   set is_developer = true
 where email = 'megan@megankharrison.com';
```

Users do not need to log out — the new claim shows up on the next token refresh
(within ~1 hour). To force it immediately, log out and back in.

## Step 1: Apply the Migrations (already done)

Both migrations were applied via Supabase MCP on 2026-05-17:

- `20260517000000_custom_access_token_hook.sql` — creates the function + grants
- `20260517010000_rewrite_is_admin_to_read_jwt.sql` — rewrites `is_admin()` to read JWT

## Step 2: Register the Hook in Supabase Dashboard (manual — required)

This step cannot be done via SQL migration. You must do it in the Dashboard UI.

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/lgveqfnpkxvzbnnwuled)
2. Navigate to **Authentication → Hooks**
3. Find **Custom Access Token** in the hook list
4. Click **Add hook** (or **Edit** if one already exists)
5. Select:
   - Hook type: **PostgreSQL Function**
   - Schema: `public`
   - Function: `custom_access_token_hook`
6. Click **Save**

Until this step is done, the hook function exists in the DB but is never called.
The `is_admin()` function already reads from JWT — it will return `false` for all
users until the hook is registered and a new JWT is issued.

**Test immediately after registering:** Log out and log back in, then call
`/api/auth/admin-check`. The response should show `isAdmin: true` for admin users.

## Step 3: Verify a JWT Contains the Claim

After registering the hook and logging in fresh:

1. Open browser devtools → Application → Local Storage
2. Find the Supabase `access_token` for `lgveqfnpkxvzbnnwuled`
3. Decode it at [jwt.io](https://jwt.io)
4. The payload should contain:
   ```json
   {
     "is_admin": true,
     "app_role": "admin"
   }
   ```
   (values will match whatever is in `user_profiles` for that user)

Alternatively, call the diagnostic endpoint:
```bash
curl -H "Authorization: Bearer <access_token>" \
  https://projects.alleatogroup.com/api/auth/admin-check
```

## Existing Sessions — When Do They Get the New Claim?

Existing JWT sessions do NOT get the `is_admin` claim immediately. The hook only
fires when a new access token is issued. Access tokens are short-lived (~1 hour)
and are refreshed automatically by `@supabase/ssr` on each server render via
`getUser()`. In practice:

- Next page load after hook registration → Supabase client calls `getUser()` →
  if token is expired or near-expiry, a new one is issued with the claim
- At worst, all sessions pick up the claim within 1 hour of hook registration

There is no action required for users; they do not need to log out.

## Rollback

If the hook causes issues:

1. **Deregister the hook** in Supabase Dashboard → Authentication → Hooks →
   Custom Access Token → remove or disable the hook
2. **Restore `is_admin()`** to the original implementation:
   ```sql
   create or replace function public.is_admin()
   returns boolean
   language plpgsql
   security definer
   as $$
   declare
     is_admin_user boolean;
   begin
     select coalesce(up.is_admin, false) into is_admin_user
     from user_profiles up
     where up.id = auth.uid();
     return is_admin_user;
   end;
   $$;
   ```
3. **Drop the hook function** if desired:
   ```sql
   drop function if exists public.custom_access_token_hook(jsonb);
   ```

Deregistering the hook is sufficient to stop it from firing — no user impact
until the next `is_admin()` RLS check triggers, which will fall back to returning
`false` from the JWT (since the claim won't be present). Restoring the plpgsql
version of `is_admin()` is required if you need RLS to keep working during rollback.

## Monitoring

Watch for auth errors after registering. Key signals:

- 401s spiking in Vercel runtime logs → hook may be failing silently
- `is_admin()` returning `false` for known admins → hook not registered or
  user hasn't refreshed their token yet
- Supabase Dashboard → Logs → Auth → filter for hook errors
