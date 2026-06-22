# Directory RLS And Attribution-Only Contacts Plan

## Implementation Status

First safe slice applied in `supabase/migrations/20260503090000_directory_attribution_contacts_access_boundary.sql`.

Completed:

- Created `public.project_contact_references`.
- Enabled RLS on `project_contact_references` with authenticated read/write policies scoped by app admin or `current_has_project_access(project_id)`.
- Added `public.current_has_project_access(bigint)`.
- Seeded the project-scoped system template `No Access`.
- Backfilled `5,992` attribution references from already-project-assigned `document_metadata` participant/sender identities that matched existing `people.email` rows.
- Regenerated Supabase types; `project_contact_references` and `current_has_project_access` now exist in `frontend/src/types/database.types.ts`.
- Updated backend project assignment to use `project_contact_references` before falling back to project directory membership and project company domain signals.

Verified:

- `npm run db:migrations:verify-applied -- supabase/migrations/20260503090000_directory_attribution_contacts_access_boundary.sql`
- `pytest backend/tests/test_project_assignment.py`

Not done yet:

- Existing core directory tables still need RLS/grant hardening.
- `current_is_project_member()` has not been replaced globally.
- The directory UI does not yet show a separate "Attribution only" section.

## Context

The project directory is currently doing too many jobs at once:

- It stores real app users who may log in.
- It stores external contacts who should appear in the directory.
- It provides project/company/contact signals for email, meeting, and attachment attribution.
- It is also used by database helpers such as `current_is_project_member()` as an access boundary.

Those are related, but they are not the same access concept. A person can be important for matching an invoice email to a project without having any right to open that project in the app.

## Current Live Findings

Live Supabase inspection showed that core directory tables have policy rows, but RLS is disabled on the tables themselves:

- `people`
- `companies`
- `project_companies`
- `project_directory_memberships`
- `permission_templates`
- `person_company_templates`
- `users_auth`

The same tables also have broad `anon` and `authenticated` grants. This means the current policy text does not actually protect those tables yet.

Current permission helpers:

- `current_person_id()` maps `auth.uid()` to `people.id` through `users_auth`, falling back to `people.auth_user_id`.
- `current_is_app_admin()` checks `user_profiles.is_admin`.
- `current_is_project_member(project_id)` checks only for an active `project_directory_memberships` row.

The gap: `current_is_project_member()` does not know the difference between an access-bearing project user and a contact/reference row. If a contact ever gets an auth link, an active membership row can become project access even when the business intent was only attribution.

## Product Model

Use five separate concepts:

| Concept | Meaning | Suggested Storage |
| --- | --- | --- |
| Person | We know who this person is. | `people` |
| Company relationship | We know what company they belong to. | `people.company_id` |
| Project company | The company participates in a project. | `project_companies` |
| Project access | This person may open project data in the app. | `project_directory_memberships` with an access-bearing state/template |
| Attribution contact | This person helps map emails/files to a project but has no app access. | New `project_contact_references` table or an explicit non-access membership state |

## Recommendation

Do not use only a "No Access" permission template as the security boundary.

A `No Access` template is useful as a visible admin label, but it should not be the thing that prevents project access. The database helper and policies must be able to tell "access member" from "attribution-only reference."

Preferred implementation:

1. Add a new table named `project_contact_references`.
2. Use it for email, attachment, permit, invoice, meeting, and company-domain matching.
3. Keep `project_directory_memberships` for people who can appear as project members and may eventually receive access.
4. Add a `No Access` project permission template for UI clarity, but keep it out of access checks unless paired with an explicit access-bearing membership state.

Fallback implementation:

1. Add `membership_kind` to `project_directory_memberships`.
2. Allowed values: `access`, `directory_only`, `attribution_only`.
3. Update `current_is_project_member()` to require `membership_kind = 'access'`.
4. Update app permission loading to deny `attribution_only` before template resolution.

The preferred table is safer because attribution records can have their own evidence, confidence, and review state without polluting the user-access table.

## Proposed Schema

```sql
create table public.project_contact_references (
  id uuid primary key default gen_random_uuid(),
  project_id integer not null references public.projects(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  reference_type text not null check (
    reference_type in (
      'email_sender',
      'email_recipient',
      'meeting_participant',
      'attachment_sender',
      'invoice_contact',
      'permit_contact',
      'manual_reference'
    )
  ),
  source_system text,
  source_document_metadata_id text,
  confidence numeric(4, 3),
  status text not null default 'active' check (status in ('active', 'inactive', 'rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, person_id, reference_type, source_document_metadata_id)
);
```

Recommended indexes:

```sql
create index idx_project_contact_references_project_status
  on public.project_contact_references (project_id, status);

create index idx_project_contact_references_person
  on public.project_contact_references (person_id);

create index idx_project_contact_references_company
  on public.project_contact_references (company_id)
  where company_id is not null;

create index idx_project_contact_references_source_doc
  on public.project_contact_references (source_document_metadata_id)
  where source_document_metadata_id is not null;
```

## RLS Policy Direction

Use security definer helper functions for repeated checks, and keep RLS predicates indexed. This follows the Supabase guidance to avoid expensive row-by-row function work and to use indexed lookup paths.

### Helper Functions

Keep:

- `current_person_id()`
- `current_is_app_admin()`

Replace or extend:

```sql
create or replace function public.current_has_project_access(p_project_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with current_person as (
    select p.id
    from public.people p
    where p.id = public.current_person_id()
      and p.person_type = 'user'
  )
  select exists (
    select 1
    from current_person cp
    join public.person_company_templates pct on pct.person_id = cp.id
    join public.permission_templates pt on pt.id = pct.template_id
    where pt.scope = 'company'
      and exists (
        select 1
        from jsonb_each(pt.rules_json) as module_rules(module, levels)
        where levels ? 'read'
           or levels ? 'write'
           or levels ? 'admin'
      )
  )
  or exists (
    select 1
    from current_person cp
    join public.project_directory_memberships m on m.person_id = cp.id
    join public.permission_templates pt on pt.id = m.permission_template_id
    where m.project_id = p_project_id
      and m.status = 'active'
      and pt.scope in ('project', 'global')
      and exists (
        select 1
        from jsonb_each(pt.rules_json) as module_rules(module, levels)
        where levels ? 'read'
           or levels ? 'write'
           or levels ? 'admin'
      )
  );
$$;
```

If `membership_kind` is added instead of a new table, include:

```sql
and m.membership_kind = 'access'
```

### Core Policies

`users_auth`

- Select: current user may read only their own auth link; app admins may read all.
- Insert/update/delete: service role only.

`people`

- Select: app admins can read all; project-access users can read people in projects they can access; service role can read/write for ingestion.
- Insert/update: app admins or users with `directory:write` on at least one access-bearing project.
- Delete: app admins only, or avoid delete and use `status = 'inactive'`.

`companies`

- Select: app admins can read all; project-access users can read companies attached to projects they can access.
- Insert/update: app admins or users with `directory:write`.
- Delete: app admins only, preferably soft-delete/inactivate.

`project_companies`

- Select: app admins or project-access users for that project.
- Insert/update: app admins or `directory:write` users for that project.
- Delete: app admins only or `directory:admin` if that level is adopted consistently.

`project_directory_memberships`

- Select: app admins or project-access users for that project.
- Insert/update: app admins or `directory:write` users for that project.
- Delete: app admins only or `directory:admin`; prefer setting `status = 'inactive'`.
- Must reject assigning company-scoped templates to project memberships.

`permission_templates`

- Select: authenticated users can read templates, filtered by UI scope.
- Insert/update/delete: app admins only.
- System templates cannot be deleted.

`person_company_templates`

- Select: own row or app admin.
- Insert/update/delete: app admin only.

`project_contact_references`

- Select: app admins or project-access users for that project.
- Insert/update: service role ingestion, app admins, or users with `directory:write`.
- Delete: app admins only; prefer `status = 'rejected'`.

## No Access Template

Add a system project template named `No Access`:

```json
{
  "directory": ["none"],
  "budget": ["none"],
  "contracts": ["none"],
  "documents": ["none"],
  "schedule": ["none"],
  "submittals": ["none"],
  "rfis": ["none"],
  "change_orders": ["none"]
}
```

Purpose:

- Give admins a plain label when someone is known to the project but should not have access.
- Make UI state easier to understand.
- Support future conversion from reference/contact to real project member.

Non-purpose:

- It must not be the only database security control.
- It must not make `current_is_project_member()` return true for app access.

## Directory UI Labels

Use precise labels:

- `Job Title`: employment title stored on `people.job_title`.
- `Project Role`: project responsibility like Superintendent, Architect, Safety Manager.
- `Access Template`: permission preset like Project Manager, Read Only, No Access.
- `Access State`: Has access, Not invited, Invite sent, Directory only, Attribution only.

Avoid using `Role / Job Title` because role can mean project role or access role.

## Rollout Plan

### Phase 1: Read-Only Audit

1. Capture live RLS status, policies, grants, helper functions, and row counts.
2. Count:
   - active contact memberships
   - active null-template memberships
   - contacts with auth links
   - project members with templates that have no access-bearing rules
3. Identify API routes that still rely on broad table access instead of explicit permission guardrails.

### Phase 2: Attribution Model

1. Add `project_contact_references`.
2. Backfill references from `document_metadata.project_id` plus participant/sender people matches.
3. Update project assignment logic to use:
   - `project_contact_references`
   - `project_companies`
   - `people.company_id`
4. Keep low-confidence matches in review instead of writing silently.

### Phase 3: Access Model

1. Add `No Access` system template.
2. Add either:
   - preferred: new access helper `current_has_project_access()`, or
   - fallback: `membership_kind` on `project_directory_memberships`.
3. Update permission loaders and API guardrails to deny attribution-only records before template resolution.
4. Update `/[projectId]/directory` to show separate columns or badges for access state and job title/project role.

### Phase 4: RLS Hardening

1. Revoke broad grants from `anon` on core directory tables.
2. Revoke broad write grants from `authenticated`.
3. Enable RLS on each table in a controlled migration.
4. Drop permissive policies such as `authenticated_read_pdm`, `authenticated_insert_pdm`, `authenticated_update_pdm`, `authenticated_read_people`, and equivalent company/template policies.
5. Add targeted policies using `current_is_app_admin()`, `current_has_project_access()`, and directory permission checks.

### Phase 5: Verification

Required checks before applying to production:

1. App admin can load `/permissions`.
2. App admin can load `/1026/directory`.
3. Project Admin can read and update directory rows for their project.
4. Read Only user can read allowed project data but cannot mutate directory rows.
5. No Access user cannot load project data.
6. Attribution-only contact cannot log in and cannot satisfy project access helpers.
7. Service role ingestion can still create people/contact/reference rows.
8. Email/attachment assignment still maps known senders to company/project.

Required database checks:

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and relname in (
    'people',
    'companies',
    'project_companies',
    'project_directory_memberships',
    'permission_templates',
    'person_company_templates',
    'users_auth',
    'project_contact_references'
  );
```

```sql
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'people',
    'companies',
    'project_companies',
    'project_directory_memberships',
    'permission_templates',
    'person_company_templates',
    'users_auth',
    'project_contact_references'
  )
order by table_name, grantee, privilege_type;
```

## Failure Mode And Guardrail

Cause:

- The access system currently treats active project membership as both directory inclusion and project authorization.

Detection gap:

- Existing policies and app helpers do not consistently distinguish auth-linked access users from non-access contacts or attribution records.

Prevention:

- Make access state explicit in schema.
- Update helper functions to check access-bearing state.
- Add a regression query/test that fails when an attribution-only contact satisfies `current_has_project_access()`.
- Keep service-role ingestion paths separate from authenticated user policies.

## Open Decisions

1. Use the preferred `project_contact_references` table or the fallback `membership_kind` column?
2. Should `No Access` appear in normal template pickers, or only in an advanced access-state control?
3. Should directory-only contacts appear in the main members table or a separate contacts/reference section?
4. Should contact references be visible to all project users with directory read, or only to directory write/admin users?
5. Should app admins be the only users allowed to convert attribution-only contacts into invited users?
