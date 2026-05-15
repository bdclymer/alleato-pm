# Auth Migration Runbook (Phase 1, 2026-05-15)

> **Scope:** Full sequence of changes that closed the auth waterfall identified in `CONSOLIDATED-IMPLEMENTATION-PLAN.md` §2. This document is the runbook — what was done, in what order, how to verify, how to roll back. For the JWT hook-registration UI step only, see the companion [AUTH-JWT-HOOK-RUNBOOK.md](./AUTH-JWT-HOOK-RUNBOOK.md).

## Sequence Overview

| Step | What | Migration / file | Status |
|---|---|---|---|
| 1.1 | Backfill `user_profiles` from `auth.users` | `20260516000000_backfill_user_profiles.sql` | ✅ Applied 2026-05-15 |
| 1.2 | Wrap bare `auth.uid()` in 167 RLS policies as `(select auth.uid())` | `20260516010000_wrap_auth_uid_in_rls_policies.sql` | ✅ Applied 2026-05-15 |
| 1.3 | Create Custom Access Token Hook function + register in Dashboard | `20260517000000_custom_access_token_hook.sql` + Dashboard UI | ✅ Function applied; hook registered 2026-05-15 |
| 1.4 | React `cache()` helper for server-component user lookups | `frontend/src/lib/auth/current-user.ts` | ✅ Shipped |
| 1.5 | Rewrite `is_admin()` to read from JWT | `20260517010000_rewrite_is_admin_to_read_jwt.sql` | ✅ Applied 2026-05-15 |
| 1.6 | Close RLS enforcement gaps on `projects`, `documents`, `rfis`, `change_orders`, `prime_contracts`, `owner_invoices` | `20260522000000_close_rls_enforcement_gaps.sql` | ✅ Applied 2026-05-15 |

All six steps must remain landed together. Rolling back any one in isolation may degrade or break the others.

---

## 1.1 Backfill `user_profiles`

**Problem:** 24 of 49 `auth.users` rows had no matching `user_profiles` row, so admin checks fell through to non-admin and protected pages silently misbehaved.

**Migration:** `supabase/migrations/20260516000000_backfill_user_profiles.sql`

```sql
insert into user_profiles (id, email, is_admin, created_at)
select u.id, u.email, false, u.created_at
from auth.users u
left join user_profiles p on p.id = u.id
where p.id is null;
```

A trigger created in the same change set keeps the table in sync on future signups (`on insert on auth.users → insert into user_profiles`).

**Verify:**
```sql
select (select count(*) from auth.users) = (select count(*) from user_profiles);
```
Expect `true`. As of 2026-05-15: both = **53**.

**Rollback:** Revert the trigger; truncate user_profiles rows added by the backfill (filter on `created_at` close to migration time). Generally unnecessary — the trigger is idempotent.

---

## 1.2 Wrap `auth.uid()` in all RLS policies

**Problem:** 167 of 179 policies used bare `auth.uid()` which Postgres re-evaluates per row. Multi-row queries became O(n) function calls.

**Migration:** `supabase/migrations/20260516010000_wrap_auth_uid_in_rls_policies.sql`

Generated drop+recreate of every affected policy with `auth.uid()` replaced by `(select auth.uid())`. Postgres caches the subquery result for the lifetime of the statement.

**Verify:**
```sql
select count(*)
from pg_policies
where qual ~ 'auth\.uid\(\)' and qual !~ '\(select auth\.uid\(\)\)';
```
Expect `0` (or only the 12 policies that were already correct).

`EXPLAIN ANALYZE` on a multi-row SELECT shows `InitPlan` evaluated once instead of per-row Function Scan.

**Rollback:** Re-apply the prior policy definitions. The wrapper form is a strict improvement; rollback should only be needed if a policy contains a side-effect that breaks under InitPlan semantics (none known).

---

## 1.3 Custom Access Token Hook

**Problem:** Every page render did a `SELECT is_admin FROM user_profiles` to gate admin features. This was a second round-trip stacked on top of `getUser()`.

**Migration:** `supabase/migrations/20260517000000_custom_access_token_hook.sql`

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare claims jsonb; user_is_admin boolean; user_role text;
begin
  select is_admin, coalesce(role, 'team')
    into user_is_admin, user_role
  from public.user_profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{is_admin}', to_jsonb(coalesce(user_is_admin, false)));
  claims := jsonb_set(claims, '{app_role}', to_jsonb(coalesce(user_role, 'team')));
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on table public.user_profiles to supabase_auth_admin;
```

**UI registration (required, cannot be done from migration):** See [AUTH-JWT-HOOK-RUNBOOK.md](./AUTH-JWT-HOOK-RUNBOOK.md) Step 2. Confirmed registered 2026-05-15.

**Verify:** Log in fresh, decode the access token at jwt.io. Payload must contain `is_admin` and `app_role` claims. Or run:

```bash
# Quick decode of an access token (Node)
node -e 'const t=process.argv[1];const p=t.split(".")[1];console.log(JSON.parse(Buffer.from(p,"base64url").toString()))' "$ACCESS_TOKEN"
```

**Rollback:** Deregister the hook in Dashboard → Auth → Hooks. JWTs reissued afterward will lack the claim. Pair with rollback of step 1.5 below (or `is_admin()` returns `false` for everyone).

---

## 1.4 React `cache()` for server-component auth

**File:** `frontend/src/lib/auth/current-user.ts`

```ts
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
```

Server components should now call `getCurrentUser()` instead of `supabase.auth.getUser()` directly. React dedupes within a single request, so multiple components calling it during one render produce a single Supabase round-trip.

**Verify:** Open Network panel on `/projects/67`. Should see exactly one `/auth/v1/user` request per page render, regardless of how many server components ran.

**Rollback:** Delete the file and let callers go back to direct `getUser()`. No data impact.

---

## 1.5 Rewrite `is_admin()` to read JWT

**Migration:** `supabase/migrations/20260517010000_rewrite_is_admin_to_read_jwt.sql`

```sql
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'is_admin')::boolean, false);
$$;
```

Removes the per-call SELECT against `user_profiles`. Depends on step 1.3 — until the hook is registered AND a fresh JWT is issued, `is_admin()` returns `false` for everyone.

**Verify:**
```sql
-- As an admin user, after fresh login:
select is_admin();  -- expect true
```

Or call `/api/auth/admin-check` and confirm `isAdmin: true` for known admin emails.

**Rollback:** Restore the prior `is_admin()` body (see [AUTH-JWT-HOOK-RUNBOOK.md](./AUTH-JWT-HOOK-RUNBOOK.md) §Rollback step 2). Must be done in tandem with deregistering the hook (1.3) or admin checks fail open.

---

## 1.6 Close RLS enforcement gaps

**Problem:** RLS regression harness at `tests/rls-regression/` revealed six tables where a "member-none" persona (zero project memberships) could SELECT every row: `projects`, `documents`, `rfis`, `change_orders`, `prime_contracts`, `owner_invoices`.

**Migration:** `supabase/migrations/20260522000000_close_rls_enforcement_gaps.sql`

Pattern (copied from working policies on `document_metadata` and `insight_cards`):

- `SECURITY DEFINER` helper `current_is_app_admin()` → reads `user_profiles.is_admin` directly (single eval per query)
- `SECURITY DEFINER` helper `current_is_project_member(bigint)` → scope by membership via `users_auth → people → project_directory_memberships`
- Each table's SELECT/INSERT/UPDATE/DELETE policies rewritten to use these helpers

`documents` is admin-only as a Phase 7 stopgap (table is slated to be dropped).

`owner_invoices` has no `project_id`; scope is resolved through `prime_contract_id → prime_contracts.project_id`.

**Verify:** Run the RLS regression harness:
```bash
cd tests/rls-regression && npm run test
```
The `member-none` persona must see `0` rows on every table.

**Rollback:** Revert each table's policies to the prior wide-open definitions (`USING (true)` etc.). **NOT RECOMMENDED.** Re-opens privilege leaks.

### Known follow-ups (Phase 1.6 not fully closed)

- `documents` is admin-only until Phase 7 drops the table. Non-admin tools that historically read it now return zero rows — verify all such reads have migrated to `document_metadata` before the soak period ends.
- `owner_invoices` `WITH CHECK` on insert currently mirrors SELECT. If an owner invoice ever needs to be created by a project member who is NOT yet linked via `prime_contracts.project_id`, that path will fail. Confirm with the invoicing team.
- The regression harness must be added to CI (currently runs manually).

---

## Full Rollout Verification Checklist

After all six steps land in an environment, confirm:

- [ ] `select count(*) from user_profiles` = `select count(*) from auth.users`
- [ ] `pg_policies` shows zero bare `auth.uid()` references
- [ ] Custom Access Token Hook is registered in Dashboard → Auth → Hooks
- [ ] Fresh JWT contains `is_admin` and `app_role` claims (decode at jwt.io)
- [ ] `is_admin()` returns `true` for known admin user; `false` for known non-admin
- [ ] Network panel on `/projects/67` shows ONE `/auth/v1/user` request, NO `user_profiles` SELECT
- [ ] `tests/rls-regression` passes for all six newly-secured tables
- [ ] `/api/auth/admin-check` returns correct value for admin and non-admin users

If any step fails, do NOT roll back individual steps in isolation — see the dependency notes above.

---

## Related Documents

- [AUTH-JWT-HOOK-RUNBOOK.md](./AUTH-JWT-HOOK-RUNBOOK.md) — Dashboard UI step + JWT verification details
- [CONSOLIDATED-IMPLEMENTATION-PLAN.md §2](../architecture/CONSOLIDATED-IMPLEMENTATION-PLAN.md) — Original Phase 1 plan
- [TABLE-INVENTORY.md — `user_profiles` entry](../architecture/TABLE-INVENTORY.md) — Updated to reflect 53-row backfilled state
