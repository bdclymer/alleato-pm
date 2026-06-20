# Directory, Auth & Permissions — Database Reference

This document covers every Supabase table involved in user management, company/project directory, authentication, and permissions.

---

## How It All Connects

```text
                    ┌──────────────────┐
                    │  Supabase Auth   │
                    │  (auth.users)    │
                    └────────┬─────────┘
                             │ auth_user_id
                    ┌────────▼─────────┐
                    │   users_auth     │  Links Supabase auth → people
                    └────────┬─────────┘
                             │ person_id
                    ┌────────▼─────────┐
    ┌───────────────│     people       │───────────────┐
    │               │ (person_type:    │               │
    │               │  'user'|'contact')│               │
    │               └────────┬─────────┘               │
    │ company_id             │ person_id               │ person_id
    │                        │                         │
┌───▼────────┐    ┌──────────▼──────────────┐   ┌─────▼──────────────────┐
│ companies  │    │ project_directory_       │   │ distribution_group_    │
│ (global)   │    │ memberships             │   │ members                │
└───┬────────┘    │ (person + project +     │   └────────────────────────┘
    │             │  permission_template)   │
    │             └──────────┬──────────────┘
    │ company_id             │ permission_template_id
    │                        │
┌───▼────────────┐  ┌───────▼──────────────┐
│ project_       │  │ permission_templates  │
│ companies      │  │ (rules_json defines   │
│ (per-project)  │  │  module permissions)  │
└────────────────┘  └──────────────────────┘

┌────────────────┐
│ user_profiles  │  App-level admin flag (is_admin)
│ (id = auth     │  Bypasses ALL permission checks
│  user id)      │
└────────────────┘
```

## Tables

### 1. `people`

**What it does:** The single source of truth for every person in the system — both users who can log in and contacts who cannot.

| Column              | Type        | Notes                                              |
| ------------------- | ----------- | -------------------------------------------------- |
| `id`                | UUID (PK)   | Auto-generated                                     |
| `first_name`        | text        | **Required**                                       |
| `last_name`         | text        | **Required**                                       |
| `email`             | text        | Nullable. Unique constraint for person_type='user' |
| `person_type`       | text        | **Required.** `'user'` or `'contact'`              |
| `status`            | text        | `'active'` or `'inactive'`                         |
| `company_id`        | UUID (FK)   | → `companies.id`. Optional company association     |
| `job_title`         | text        |                                                    |
| `phone_business`    | text        |                                                    |
| `phone_mobile`      | text        |                                                    |
| `address_line1`     | text        |                                                    |
| `address_line2`     | text        |                                                    |
| `city`              | text        |                                                    |
| `state`             | text        |                                                    |
| `zip`               | text        |                                                    |
| `country`           | text        |                                                    |
| `business_unit`     | text        |                                                    |
| `profile_photo_url` | text        |                                                    |
| `notes`             | text        |                                                    |
| `metadata`          | JSONB       | Arbitrary extra data                               |
| `created_at`        | timestamptz |                                                    |
| `updated_at`        | timestamptz |                                                    |

**Key points:**

- `person_type = 'user'` → someone who will eventually be able to log in (via invite flow)
- `person_type = 'contact'` → directory-only entry, never gets an auth account
- A person exists globally. They become part of a project via `project_directory_memberships`
- A person can be in multiple projects

---

### 2. `users_auth`

**What it does:** Links a `people` record to a Supabase `auth.users` record. This is how the system knows which person corresponds to which login.

| Column          | Type          | Notes                              |
| --------------- | ------------- | ---------------------------------- |
| `person_id`     | UUID (PK, FK) | → `people.id`. One-to-one          |
| `auth_user_id`  | UUID (unique) | → `auth.users.id` in Supabase Auth |
| `last_login_at` | timestamptz   |                                    |

**Key points:**

- Only exists for `person_type = 'user'` people who have accepted an invite or signed up
- Created during **self-signup** (`/api/auth/signup`) or during **invite acceptance** (`inviteService.acceptInvite`)
- If a person has no `users_auth` row, they cannot log in
- This is the join table that `auth-guard.ts` uses to resolve auth user → person → project membership

**When it gets created:**

1. **Self-signup:** User fills out `/auth/sign-up` form → API creates `auth.users` + `people` + `users_auth` in one transaction
2. **Invite acceptance:** Admin adds user to directory → sends invite → user clicks link → `acceptInvite()` creates `auth.users` + `users_auth`

---

### 3. `user_profiles`

**What it does:** App-level user profile with the **admin bypass flag**.

| Column       | Type        | Notes                                         |
| ------------ | ----------- | --------------------------------------------- |
| `id`         | UUID (PK)   | Same as `auth.users.id`                       |
| `email`      | text        | **Required**                                  |
| `full_name`  | text        |                                               |
| `role`       | text        | Display role label                            |
| `is_admin`   | boolean     | **If `true`, bypasses ALL permission checks** |
| `created_at` | timestamptz |                                               |
| `updated_at` | timestamptz |                                               |

**Key points:**

- `id` matches `auth.users.id` (NOT `people.id`)
- `is_admin = true` makes `PermissionService.hasPermission()` return `true` for every module, every project, no questions asked
- Set via `POST /api/dev/make-admin` (dev only)
- This is NOT the same as the "Admin" permission template — the template is project-scoped, this is app-wide

---

### 4. `companies`

**What it does:** Global company directory. Companies exist system-wide and can be associated with multiple projects.

| Column            | Type        | Notes        |
| ----------------- | ----------- | ------------ |
| `id`              | UUID (PK)   |              |
| `name`            | text        | **Required** |
| `address`         | text        |              |
| `city`            | text        |              |
| `state`           | text        |              |
| `website`         | text        |              |
| `type`            | text        |              |
| `status`          | text        |              |
| `currency_code`   | text        |              |
| `currency_symbol` | text        |              |
| `logo_url`        | text        |              |
| `title`           | text        |              |
| `notes`           | text        |              |
| `metadata`        | JSONB       |              |
| `created_at`      | timestamptz |              |
| `updated_at`      | timestamptz |              |

**Key points:**

- Global record. NOT project-scoped
- A person links to a company via `people.company_id`
- A company links to a project via `project_companies`

---

### 5. `project_companies`

**What it does:** Associates a global company with a specific project and stores project-specific metadata for that company.

| Column               | Type         | Notes                                                                      |
| -------------------- | ------------ | -------------------------------------------------------------------------- |
| `id`                 | UUID (PK)    |                                                                            |
| `project_id`         | INTEGER (FK) | → `projects.id`                                                            |
| `company_id`         | UUID (FK)    | → `companies.id`                                                           |
| `company_type`       | text         | `YOUR_COMPANY`, `VENDOR`, `SUBCONTRACTOR`, `SUPPLIER`, `CONNECTED_COMPANY` |
| `primary_contact_id` | UUID (FK)    | → `people.id`. Main contact for this company on this project               |
| `business_phone`     | text         | Project-specific phone (may differ from global company phone)              |
| `email_address`      | text         | Project-specific email                                                     |
| `erp_vendor_id`      | text         | ERP system identifier                                                      |
| `logo_url`           | text         | Project-specific logo                                                      |
| `status`             | text         | `ACTIVE` or `INACTIVE`                                                     |
| `created_at`         | timestamptz  |                                                                            |
| `updated_at`         | timestamptz  |                                                                            |

**Unique constraints:**

- `(project_id, company_id)` — one association per company per project
- `(project_id, erp_vendor_id)` — one ERP vendor ID per project

---

### 6. `project_directory_memberships`

**What it does:** The core join table that puts a person into a project's directory. Without a row here, a person is invisible to that project.

| Column                   | Type         | Notes                                                        |
| ------------------------ | ------------ | ------------------------------------------------------------ |
| `id`                     | UUID (PK)    |                                                              |
| `project_id`             | INTEGER (FK) | → `projects.id`                                              |
| `person_id`              | UUID (FK)    | → `people.id`                                                |
| `permission_template_id` | UUID (FK)    | → `permission_templates.id`. Defines what this person can do |
| `user_type`              | text         | `'employee'`, `'client'`, `'subcontractor'`, or `'developer'`. Default: `'employee'` |
| `status`                 | text         | `'active'` or `'inactive'`                                   |
| `role`                   | text         | Display label (e.g., "Superintendent")                       |
| `invite_status`          | text         | `'not_invited'`, `'invited'`, `'accepted'`, `'expired'`      |
| `invite_token`           | text         | Random 32-char token for invite link                         |
| `invite_expires_at`      | timestamptz  | 7 days from invite send                                      |
| `invited_at`             | timestamptz  |                                                              |
| `last_invited_at`        | timestamptz  |                                                              |
| `is_employee_of_company` | boolean      |                                                              |
| `is_insurance_manager`   | boolean      |                                                              |
| `employee_id`            | text         | Employer's employee ID                                       |
| `metadata`               | JSONB        |                                                              |
| `created_at`             | timestamptz  |                                                              |
| `updated_at`             | timestamptz  |                                                              |

**Unique constraint:** `(project_id, person_id)` — one membership per person per project

**Key points:**

- This is the table that ALL permission checks ultimately depend on
- `PermissionService.getUserPermissions()` joins this table → `permission_templates` to get `rules_json`
- `user_type` controls post-login routing and client-dashboard access checks
- A person can be in the membership table but still unable to log in (if `users_auth` row doesn't exist yet)
- Invite flow: `not_invited` → admin sends invite → `invited` → user clicks link → `accepted`

---

### 7. `permission_templates`

**What it does:** Defines named permission sets that can be assigned to users via memberships. Controls what modules a user can access and at what level.

| Column        | Type        | Notes                                                                  |
| ------------- | ----------- | ---------------------------------------------------------------------- |
| `id`          | UUID (PK)   |                                                                        |
| `name`        | text        | **Required.** e.g., "Admin", "Project Manager"                         |
| `description` | text        |                                                                        |
| `scope`       | text        | `'project'`, `'company'`, or `'global'` (only `project` is used today) |
| `rules_json`  | JSONB       | **Required.** The actual permission rules                              |
| `is_system`   | boolean     | `true` = cannot be edited or deleted                                   |
| `created_at`  | timestamptz |                                                                        |
| `updated_at`  | timestamptz |                                                                        |

**`rules_json` structure:**

```json
{
  "directory": ["read", "write", "admin"],
  "budget": ["read", "write", "admin"],
  "contracts": ["read", "write", "admin"],
  "documents": ["read", "write", "admin"],
  "schedule": ["read", "write", "admin"],
  "submittals": ["read", "write", "admin"],
  "rfis": ["read", "write", "admin"],
  "change_orders": ["read", "write", "admin"]
}
```markdown
**Permission levels:**

- `read` — can view
- `write` — can view + create + edit (implies `read`)
- `admin` — full access (implies `read` + `write`)

**Seeded system templates:**

| Name                  | Scope   | Permissions                                                                          |
| --------------------- | ------- | ------------------------------------------------------------------------------------ |
| **Project Admin**     | project | `admin` on all 8 modules                                                             |
| **Project Manager**   | project | `read` + `write` on 7 modules, `read` only on budget                                |
| **Subcontractor**     | project | `read` on directory, contracts, documents; `read` + `write` on submittals and rfis   |
| **Client (View Only)**| project | `read` on directory, documents, schedule only                                        |

---

### 8. `user_directory_permissions`

**What it does:** Per-user permission overrides on top of the template. Allows granting a specific person a different permission level for a specific project.

| Column             | Type         | Notes           |
| ------------------ | ------------ | --------------- |
| `id`               | UUID (PK)    |                 |
| `person_id`        | UUID (FK)    | → `people.id`   |
| `project_id`       | INTEGER (FK) | → `projects.id` |
| `permission_level` | text         | **Required**    |
| `created_at`       | timestamptz  |                 |
| `updated_at`       | timestamptz  |                 |

**Key points:**

- Currently not widely used in code — the template-based system handles most cases
- Exists for future fine-grained overrides

---

### 9. `user_project_roles`

**What it does:** Allows assigning multiple named roles to a single project membership (e.g., a person can be both "Superintendent" and "Safety Manager").

| Column          | Type        | Notes                                |
| --------------- | ----------- | ------------------------------------ |
| `id`            | UUID (PK)   |                                      |
| `membership_id` | UUID (FK)   | → `project_directory_memberships.id` |
| `role_name`     | text        | **Required.** e.g., "Superintendent" |
| `assigned_at`   | timestamptz |                                      |

**Key points:**

- These are display/organizational roles, NOT permission roles
- Permissions come from `permission_templates` via the membership

---

### 10. `distribution_groups`

**What it does:** Project-scoped groups for organizing people (e.g., "Safety Committee", "Daily Log Recipients").

| Column        | Type         | Notes                            |
| ------------- | ------------ | -------------------------------- |
| `id`          | UUID (PK)    |                                  |
| `project_id`  | INTEGER (FK) | → `projects.id`                  |
| `name`        | text         | **Required.** Unique per project |
| `description` | text         |                                  |
| `status`      | text         | `'active'` or `'inactive'`       |
| `created_at`  | timestamptz  |                                  |
| `updated_at`  | timestamptz  |                                  |

---

### 11. `distribution_group_members`

**What it does:** Junction table linking people to distribution groups.

| Column       | Type        | Notes                      |
| ------------ | ----------- | -------------------------- |
| `id`         | UUID (PK)   |                            |
| `group_id`   | UUID (FK)   | → `distribution_groups.id` |
| `person_id`  | UUID (FK)   | → `people.id`              |
| `created_at` | timestamptz |                            |

**Unique constraint:** `(group_id, person_id)`

---

### 12. `user_email_notifications`

**What it does:** Per-person, per-project email notification preferences.

| Column                    | Type         | Notes           |
| ------------------------- | ------------ | --------------- |
| `id`                      | UUID (PK)    |                 |
| `person_id`               | UUID (FK)    | → `people.id`   |
| `project_id`              | INTEGER (FK) | → `projects.id` |
| `emails_default`          | boolean      |                 |
| `rfis_default`            | boolean      |                 |
| `submittals_default`      | boolean      |                 |
| `daily_log_default`       | boolean      |                 |
| `delay_log_default`       | boolean      |                 |
| `punchlist_items_default` | boolean      |                 |
| `weather_delay_email`     | boolean      |                 |
| `weather_delay_phone`     | boolean      |                 |
| `created_at`              | timestamptz  |                 |
| `updated_at`              | timestamptz  |                 |

---

### 13. `user_schedule_notifications`

**What it does:** Per-person, per-project schedule notification preferences.

| Column                              | Type         | Notes           |
| ----------------------------------- | ------------ | --------------- |
| `id`                                | UUID (PK)    |                 |
| `person_id`                         | UUID (FK)    | → `people.id`   |
| `project_id`                        | INTEGER (FK) | → `projects.id` |
| `upon_schedule_changes`             | boolean      |                 |
| `upon_schedule_change_requests`     | boolean      |                 |
| `all_project_tasks_weekly`          | boolean      |                 |
| `project_schedule_lookahead_weekly` | boolean      |                 |
| `resource_tasks_assigned_to_id`     | UUID (FK)    | → `people.id`   |
| `created_at`                        | timestamptz  |                 |
| `updated_at`                        | timestamptz  |                 |

---

### 14. `app_roles`

**What it does:** Lookup table for application-level role names. Not currently used in permission checks.

| Column | Type      | Notes        |
| ------ | --------- | ------------ |
| `id`   | UUID (PK) |              |
| `name` | text      | **Required** |

**Key points:**

- This table exists but is not actively consumed by the permission system
- Permissions flow through `permission_templates.rules_json`, not through this table

---

## Auth Flow Summary

### Self-Signup

```

User fills /auth/sign-up form
    → POST /api/auth/signup
        → supabase.auth.signUp() → creates auth.users row
        → INSERT people (person_type='user')
        → INSERT users_auth (links auth_user_id ↔ person_id)
    → User gets confirmation email → clicks link → /auth/callback → session created

```markdown
### Admin Adds User to Project Directory

```sql
Admin clicks "Add User" in project directory
    → DirectoryService.createPerson()
        → INSERT people (person_type='user')
        → INSERT project_directory_memberships (invite_status='not_invited')
    → Auto-sends invite via POST /api/projects/{id}/directory/people/{id}/invite
        → inviteService.sendInvite()
            → Generates invite_token, sets invite_status='invited'
            → Sends email with invite link
    → User clicks invite link → /invite?token=xxx
        → inviteService.acceptInvite()
            → supabase.auth.admin.createUser() → creates auth.users
            → INSERT users_auth (links auth_user_id ↔ person_id)
            → UPDATE membership: invite_status='accepted'
        → Redirect to /auth/set-password

```markdown
### Admin Adds Contact to Project Directory

```

Admin clicks "Add Contact" in project directory
    → DirectoryService.createPerson()
        → INSERT people (person_type='contact')
        → INSERT project_directory_memberships
    → No invite sent (contacts don't log in)
    → No auth.users or users_auth created

```diff
---

## Permission Check Flow

There are two code paths that check permissions:

### API Routes (via `auth-guard.ts`)

Uses two separate queries (no join):

```text
1. supabase.auth.getUser() → gets auth_user_id

2. verifyProjectPermission(projectId, module, level)
    │
    ├─ Query users_auth WHERE auth_user_id = auth_user_id → gets person_id
    │
    ├─ Query project_directory_memberships
    │   WHERE person_id = person_id
    │   AND project_id = projectId
    │   AND status = 'active'
    │
    ├─ Check user_profiles.is_admin → if true, return (bypass everything)
    │
    ├─ If no permission_template_id → deny (403)
    │
    ├─ Query permission_templates WHERE id = template_id → get rules_json
    │
    └─ Check if rules_json[module] includes requested level
        ├─ 'admin' includes everything
        ├─ 'write' includes 'read'
        └─ 'read' is read-only

```markdown
### Service Layer (via `PermissionService`)

Uses a single joined query:

```

1. PermissionService.hasPermission(auth_user_id, projectId, module, level)
    │
    ├─ Check user_profiles.is_admin → if true, return true (bypass everything)
    │
    └─ getUserPermissions(auth_user_id, projectId)
        │
        ├─ Single joined query:
        │   project_directory_memberships
        │     JOIN people ON person_id
        │     JOIN users_auth ON auth_user_id
        │     JOIN permission_templates ON template_id
        │   WHERE users_auth.auth_user_id = auth_user_id
        │   AND project_id = projectId AND status = 'active'
        │
        └─ Check if rules_json[module] includes requested level

```sql
### Client-Side (via `useProjectPermissions` hook)

The sidebar and client components use the `useProjectPermissions` hook, which follows the same two-query pattern as `auth-guard.ts` and also fetches `user_type` from the membership.

---

## User Type Content Restriction

In addition to module-level permissions, the `user_type` column on `project_directory_memberships` controls broad content access:

### Client Users (`user_type = 'client'`)

Client users are identified by
`project_directory_memberships.user_type = 'client'`. The active client-facing
route guard lives server-side in
`frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx`: non-admin
users must have an active membership for the project, and non-client members are
redirected to `/{projectId}/home`.

General project-scoped access is enforced by
`frontend/src/app/(main)/[projectId]/layout.tsx`, which verifies an active
project membership before rendering project pages.

**Post-login routing:** `post-login-router.ts` routes client users with a single project directly to `/{projectId}/client-dashboard` instead of `/{projectId}/home`.

**Navigation filtering:** The sidebar uses `useProjectPermissions()` which returns `userType`. Tools marked `adminOnly: true` are hidden unless `userType` is `'developer'` or `isAppAdmin` is true.

### Removed Legacy Client Redirect Path

The old client-side `ClientRedirect` / `useIsClient` path has been removed. It
was not imported by the app and could drift from canonical lowercase
`user_type = 'client'` semantics. Do not reintroduce a client-side wrapper as
the source of truth for broad access control; use server-side membership checks
and route guards.

---

## Critical FK Type Rules

| Column                    | Type    | Must Match                            |
| ------------------------- | ------- | ------------------------------------- |
| `people.id`               | UUID    | All `person_id` FKs must be UUID      |
| `projects.id`             | INTEGER | All `project_id` FKs must be INTEGER  |
| `companies.id`            | UUID    | All `company_id` FKs must be UUID     |
| `permission_templates.id` | UUID    | `permission_template_id` must be UUID |

**Historical bug:** `schedule_tasks.project_id` was created as UUID instead of INTEGER, breaking all queries silently. Always verify FK types match.

---

## Row Level Security (RLS) Policies

All directory and permission tables have RLS enabled. The examples below show the expected policy patterns. Verify actual policies against the Supabase dashboard or migration files, as policy names and exact implementations may differ:

### `people` Table

```sql
-- Users can read people in projects they're members of
CREATE POLICY "people_select" ON people
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      WHERE pdm.person_id = people.id
      AND pdm.project_id IN (
        SELECT project_id FROM project_directory_memberships
        WHERE person_id = (SELECT person_id FROM users_auth WHERE auth_user_id = auth.uid())
      )
    )
  );

-- Only admins can insert/update people
CREATE POLICY "people_insert" ON people
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );
```sql
### `project_directory_memberships` Table

```sql
-- Users can see memberships for projects they're in
CREATE POLICY "memberships_select" ON project_directory_memberships
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_directory_memberships
      WHERE person_id = (SELECT person_id FROM users_auth WHERE auth_user_id = auth.uid())
    )
  );

-- Only users with 'admin' permission on directory module can modify
CREATE POLICY "memberships_insert" ON project_directory_memberships
  FOR INSERT WITH CHECK (
    -- Check via permission service or is_admin flag
    -- Implemented in application layer
  );
```sql
### `users_auth` Table

```sql
-- Users can only see their own auth link
CREATE POLICY "users_auth_select" ON users_auth
  FOR SELECT USING (auth_user_id = auth.uid());

-- Only system can create auth links
CREATE POLICY "users_auth_insert" ON users_auth
  FOR INSERT WITH CHECK (false); -- Handled by service role
```

---

## Common Queries & Examples

### Get All Users for a Project

```typescript
// Via DirectoryService
const directoryService = new DirectoryService(supabase);
const members = await directoryService.getProjectMembers(projectId);

// Raw query
const { data, error } = await supabase
  .from("project_directory_memberships")
  .select(
    `
    id,
    person_id,
    permission_template_id,
    status,
    role,
    people (
      id,
      first_name,
      last_name,
      email,
      person_type,
      company_id,
      companies (
        id,
        name
      )
    ),
    permission_templates (
      id,
      name,
      rules_json
    )
  `,
  )
  .eq("project_id", projectId)
  .eq("status", "active");
```typescript
### Check if User Has Permission

```typescript
import { PermissionService } from "@/services/permissionService";

const permissionService = new PermissionService(supabase);

// Check if user can write to budget module
const canEdit = await permissionService.hasPermission(
  authUserId,
  projectId,
  "budget",
  "write",
);

if (!canEdit) {
  return new Response("Forbidden", { status: 403 });
}
```typescript
### Get User's Own Permissions

```typescript
// Via PermissionService
const permissions = await permissionService.getUserPermissions(
  authUserId,
  projectId,
);

// Returns:
// {
//   directory: ['read', 'write', 'admin'],
//   budget: ['read', 'write'],
//   contracts: ['read'],
//   // ... etc
// }
```typescript
### Add User to Project

```typescript
import { DirectoryService } from "@/services/directoryService";
import { InviteService } from "@/services/inviteService";

const directoryService = new DirectoryService(supabase);
const inviteService = new InviteService(supabase);

// 1. Create person record
const person = await directoryService.createPerson({
  first_name: "Jane",
  last_name: "Smith",
  email: "jane.smith@example.com",
  person_type: "user",
  company_id: companyId,
});

// 2. Add to project directory
const membership = await directoryService.addToProject({
  project_id: projectId,
  person_id: person.id,
  permission_template_id: templateId,
  role: "Project Manager",
});

// 3. Send invite
await inviteService.sendInvite({
  project_id: projectId,
  person_id: person.id,
  invited_by: currentUserId,
});
```

### Get Person's Auth User ID

```typescript
// From person_id to auth_user_id
const { data } = await supabase
  .from("users_auth")
  .select("auth_user_id")
  .eq("person_id", personId)
  .single();

const authUserId = data?.auth_user_id;

// From auth_user_id to person_id
const { data: authData } = await supabase
  .from("users_auth")
  .select("person_id")
  .eq("auth_user_id", authUserId)
  .single();

const personId = authData?.person_id;
```sql
---

## API Endpoints Reference

### Directory Management

| Endpoint                                                       | Method | Permission Required | Description                |
| -------------------------------------------------------------- | ------ | ------------------- | -------------------------- |
| `/api/projects/[projectId]/directory/people`                   | GET    | `directory:read`    | List all people in project |
| `/api/projects/[projectId]/directory/people`                   | POST   | `directory:write`   | Add person to project      |
| `/api/projects/[projectId]/directory/people/[personId]`        | PUT    | `directory:write`   | Update person details      |
| `/api/projects/[projectId]/directory/people/[personId]`        | DELETE | `directory:admin`   | Remove person from project |
| `/api/projects/[projectId]/directory/people/[personId]/invite` | POST   | `directory:write`   | Send invitation email      |

### Permission Templates

| Endpoint                                              | Method | Permission Required | Description                       |
| ----------------------------------------------------- | ------ | ------------------- | --------------------------------- |
| `/api/projects/[projectId]/permission-templates`      | GET    | `directory:read`    | List available templates          |
| `/api/projects/[projectId]/permission-templates`      | POST   | `directory:admin`   | Create custom template            |
| `/api/projects/[projectId]/permission-templates/[id]` | PUT    | `directory:admin`   | Update template (non-system only) |
| `/api/projects/[projectId]/permission-templates/[id]` | DELETE | `directory:admin`   | Delete template (non-system only) |

### User Profile

| Endpoint                            | Method | Permission Required | Description                 |
| ----------------------------------- | ------ | ------------------- | --------------------------- |
| `/api/user/profile`                 | GET    | Authenticated       | Get current user's profile  |
| `/api/user/profile`                 | PUT    | Authenticated       | Update own profile          |
| `/api/user/permissions/[projectId]` | GET    | Authenticated       | Get permissions for project |

### Development/Admin Only

| Endpoint              | Method | Permission Required | Description                    |
| --------------------- | ------ | ------------------- | ------------------------------ |
| `/api/dev/make-admin` | POST   | Dev mode only       | Set `is_admin = true` for user |

---

## Troubleshooting Common Issues

### User Gets "You do not have permission" Error Despite Being Admin

**Symptoms:** User is logged in and shows as admin but gets 403 errors accessing resources

**Root Cause:** Missing `users_auth` link between auth user and person record

**Diagnosis:**
1. Check if user exists in auth:
   ```sql
   SELECT id, email FROM auth.users WHERE email = '<user_email>';
   ```sql
1. Check if person record exists:

   ```sql
   SELECT id, first_name, last_name, email FROM people
   WHERE email = '<user_email>' OR (first_name ILIKE '%<name>%');
   ```
1. Check if users_auth link exists:

   ```sql
   SELECT * FROM users_auth WHERE auth_user_id = '<auth_user_id>';
   ```sql
2. Check project membership:

   ```sql
   SELECT pdm.*, pt.name as template_name
   FROM project_directory_memberships pdm
   LEFT JOIN permission_templates pt ON pt.id = pdm.permission_template_id
   WHERE pdm.person_id = '<person_id>' AND pdm.project_id = <project_id>;
   ```

**Solution:**
Create missing users_auth link:

```sql
INSERT INTO users_auth (auth_user_id, person_id)
VALUES ('<auth_user_id>', '<person_id>');
```sql
**Prevention:**

- Ensure signup/invite flows create users_auth records
- Add database constraints to prevent orphaned records
- Monitor for missing links in user onboarding

**Resolved Example:** 2026-01-31 - Fixed missing link for <megan@nutritionsolutionslifestyle.com>

### User Can't Log In

**Symptoms:** User exists in directory but gets "Invalid credentials" error

**Diagnosis:**

1. Check if `users_auth` row exists:

   ```sql
   SELECT * FROM users_auth WHERE person_id = '<person_id>';
   ```sql
2. Check `people.person_type`:

   ```sql
   SELECT person_type FROM people WHERE id = '<person_id>';
   ```

1. Check invite status:

   ```sql
   SELECT invite_status, invite_expires_at
   FROM project_directory_memberships
   WHERE person_id = '<person_id>';
   ```sql

**Solutions:**

- If no `users_auth`: User hasn't accepted invite or signed up. Resend invite.
- If `person_type = 'contact'`: Contacts can't log in. Change to 'user' if needed.
- If `invite_status = 'expired'`: Resend invite via `/api/.../invite`

---

### User Can't See Project

**Symptoms:** User logs in but project doesn't appear in their list

**Diagnosis:**

1. Check membership exists:

   ```sql
   SELECT * FROM project_directory_memberships
   WHERE person_id = (SELECT person_id FROM users_auth WHERE auth_user_id = '<auth_user_id>')
   AND project_id = <project_id>;
   ```

2. Check membership status:

   ```sql
   SELECT status FROM project_directory_memberships WHERE id = '<membership_id>';
   ```sql

**Solutions:**

- If no membership: User not added to project. Use directory UI to add.
- If `status = 'inactive'`: Reactivate membership.

---

### User Can't Access Module

**Symptoms:** User sees "You don't have permission to access this module"

**Diagnosis:**

1. Check if user is admin:

   ```sql
   SELECT is_admin FROM user_profiles WHERE id = '<auth_user_id>';
   ```

2. Check permission template:

   ```sql
   SELECT pt.rules_json
   FROM project_directory_memberships pdm
   JOIN permission_templates pt ON pt.id = pdm.permission_template_id
   JOIN users_auth ua ON ua.person_id = pdm.person_id
   WHERE ua.auth_user_id = '<auth_user_id>'
   AND pdm.project_id = <project_id>;
   ```sql

**Solutions:**

- If `is_admin = false` and template has no permission for module: Assign different template or create custom one
- If template has `read` but user needs `write`: Upgrade template
- If checking fails: Verify `PermissionService.hasPermission()` logic

---

### Invite Link Not Working

**Symptoms:** User clicks invite link but gets error

**Diagnosis:**

1. Check if token is valid:

   ```sql
   SELECT invite_status, invite_expires_at, invite_token
   FROM project_directory_memberships
   WHERE invite_token = '<token>';
   ```

2. Check expiration:

   ```sql
   SELECT invite_expires_at < NOW() as is_expired
   FROM project_directory_memberships
   WHERE invite_token = '<token>';
   ```typescript

**Solutions:**

- If token not found: Link is invalid or already used
- If expired: Resend invite (generates new token)
- If `invite_status = 'accepted'`: User already accepted, can log in directly

---

### FK Type Mismatch Errors

**Symptoms:** Queries return empty results or silent failures

**Diagnosis:**

```sql
-- Check FK types match PK types
SELECT
  'projects.id' as pk_column,
  pg_typeof(id) as pk_type,
  'table.project_id' as fk_column,
  pg_typeof(project_id) as fk_type
FROM projects, <your_table> LIMIT 1;
```

**Solutions:**

- If types don't match (e.g., INTEGER vs UUID): Run migration to fix column type
- Always use `database.types.ts` as source of truth
- Run `npm run db:types` after any schema change

---

## Best Practices

### When Creating New Features

1. **Always check permissions first:**

   ```typescript
   const hasPermission = await permissionService.hasPermission(
     authUserId,
     projectId,
     "module_name",
     "write",
   );

   if (!hasPermission) {
     return new Response("Forbidden", { status: 403 });
   }
   ```sql
2. **Use service classes:**
   - `DirectoryService` for people/membership operations
   - `PermissionService` for permission checks
   - `InviteService` for invite flow
   - Don't write raw Supabase queries in routes

3. **Always join through proper tables:**

   ```typescript
   // CORRECT: auth_user_id → users_auth → people → memberships
   const { data } = await supabase
     .from("project_directory_memberships")
     .select("*, people!inner(*, users_auth!inner(auth_user_id))")
     .eq("people.users_auth.auth_user_id", authUserId);

   // WRONG: Trying to join auth.users directly
   ```sql
4. **Verify FK types before creating tables:**
   - Check `database.types.ts` for PK types
   - Match FK types exactly
   - `projects.id` = INTEGER, `people.id` = UUID, `companies.id` = UUID

### When Debugging Permission Issues

1. Check in this order:
   - Is user admin? (`user_profiles.is_admin`)
   - Does membership exist? (`project_directory_memberships`)
   - Is membership active? (`status = 'active'`)
   - Does template grant permission? (`permission_templates.rules_json`)

2. Use the permission service helper:

   ```typescript
   const permissions = await permissionService.getUserPermissions(
     authUserId,
     projectId,
   );
   console.log("User permissions:", permissions);
   ```

3. Test with dev admin flag:

   ```bash
   POST /api/dev/make-admin
   { "userId": "<auth_user_id>" }
   ```sql

### When Managing Invites

1. **Always set expiration:**
   - Default: 7 days from `invited_at`
   - Update on resend: `last_invited_at = NOW(), invite_expires_at = NOW() + INTERVAL '7 days'`

2. **Track invite status:**
   - `not_invited` → User added to directory but no invite sent
   - `invited` → Invite sent, waiting for user
   - `accepted` → User clicked link and set password
   - `expired` → Invite expired, needs resend

3. **Generate secure tokens:**

   ```typescript
   import crypto from "crypto";
   const token = crypto.randomBytes(32).toString("hex");
   ```

### When Adding People to Projects

1. **Choose correct person_type:**
   - `user` → Will eventually log in (needs invite)
   - `contact` → Directory-only (no auth account)

2. **Always assign permission template:**
   - Don't leave `permission_template_id` null
   - Use system templates or create project-specific ones

3. **Set proper company association:**
   - Link to global `companies` table via `people.company_id`
   - Link company to project via `project_companies`

---

## Testing Guidelines

### Unit Tests

Test permission service logic:

```typescript
describe("PermissionService", () => {
  it("should grant access to admin users", async () => {
    // Mock is_admin = true
    const hasPermission = await permissionService.hasPermission(
      adminUserId,
      projectId,
      "budget",
      "admin",
    );
    expect(hasPermission).toBe(true);
  });

  it("should respect permission templates", async () => {
    // Mock template with only 'read' on budget
    const hasWrite = await permissionService.hasPermission(
      userId,
      projectId,
      "budget",
      "write",
    );
    expect(hasWrite).toBe(false);
  });
});
```javascript
### E2E Tests

Test full user flows:

```typescript
test("user can accept invite and access project", async ({ page }) => {
  // 1. Admin adds user
  await page.goto(`/${projectId}/directory/users`);
  await page.click('button:has-text("Add User")');
  await page.fill("#email", "newuser@example.com");
  await page.click('button:has-text("Send Invite")');

  // 2. User receives invite (mock email)
  const inviteToken = await getInviteToken(newUserEmail);

  // 3. User accepts invite
  await page.goto(`/invite?token=${inviteToken}`);
  await page.fill("#password", "SecurePassword123!");
  await page.click('button:has-text("Accept Invite")');

  // 4. Verify user can access project
  await page.goto(`/${projectId}`);
  await expect(page.locator("h1")).toContainText("Project Dashboard");
});
```

### Manual Testing Checklist

- [ ] Self-signup creates all required records (auth.users, people, users_auth)
- [ ] Invite flow creates users_auth on acceptance
- [ ] Admin users bypass all permission checks
- [ ] Non-admin users see only permitted modules
- [ ] Contacts cannot log in
- [ ] Users see only projects they're members of
- [ ] Expired invites cannot be accepted
- [ ] Resending invite generates new token
- [ ] Permission template changes take effect immediately

---

## Migration History

### Key Migrations

| Date       | Migration                                                        | Purpose                                         |
| ---------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| 2026-01-31 | `20260131095023_add_user_type_and_seed_permission_templates.sql`  | Add `user_type` column, seed 4 system templates, backfill existing memberships |
| 2026-01-31 | `20260131_add_client_dashboard_support.sql`                      | Client dashboard views and RLS policies          |

> **Note:** Earlier migrations that created the base tables (`people`, `users_auth`, `permission_templates`, `project_directory_memberships`) predate the current migration naming convention. Consult the `supabase/migrations/` directory for the full history.

### Schema Evolution Rules

1. **Never change PK types** (breaks all FKs)
2. **Add columns as nullable first** (allows gradual rollout)
3. **Backfill data before adding NOT NULL** (prevents constraint violations)
4. **Update RLS policies after schema changes** (maintain security)
5. **Regenerate types immediately** (`npm run db:types`)

---

## Related Documentation

- [Directory System Overview](../features/directory-system.md)
- [Permission System Architecture](../architecture/permissions.md)
- [Invite Flow Implementation](../features/invite-system.md)
- [Supabase RLS Best Practices](../architecture/supabase-rls.md)
- [API Route Guards](../api/auth-guards.md)

---

**Last Updated:** 2026-01-31
**Maintained By:** Engineering Team
