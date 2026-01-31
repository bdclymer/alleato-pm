# Directory, Auth & Permissions — Database Reference

This document covers every Supabase table involved in user management, company/project directory, authentication, and permissions.

---

## How It All Connects

```
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

---

## Tables

### 1. `people`

**What it does:** The single source of truth for every person in the system — both users who can log in and contacts who cannot.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `first_name` | text | **Required** |
| `last_name` | text | **Required** |
| `email` | text | Nullable. Unique constraint for person_type='user' |
| `person_type` | text | **Required.** `'user'` or `'contact'` |
| `status` | text | `'active'` or `'inactive'` |
| `company_id` | UUID (FK) | → `companies.id`. Optional company association |
| `job_title` | text | |
| `phone_business` | text | |
| `phone_mobile` | text | |
| `address_line1` | text | |
| `address_line2` | text | |
| `city` | text | |
| `state` | text | |
| `zip` | text | |
| `country` | text | |
| `business_unit` | text | |
| `profile_photo_url` | text | |
| `notes` | text | |
| `metadata` | JSONB | Arbitrary extra data |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Key points:**
- `person_type = 'user'` → someone who will eventually be able to log in (via invite flow)
- `person_type = 'contact'` → directory-only entry, never gets an auth account
- A person exists globally. They become part of a project via `project_directory_memberships`
- A person can be in multiple projects

---

### 2. `users_auth`

**What it does:** Links a `people` record to a Supabase `auth.users` record. This is how the system knows which person corresponds to which login.

| Column | Type | Notes |
|--------|------|-------|
| `person_id` | UUID (PK, FK) | → `people.id`. One-to-one |
| `auth_user_id` | UUID (unique) | → `auth.users.id` in Supabase Auth |
| `last_login_at` | timestamptz | |

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

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Same as `auth.users.id` |
| `email` | text | **Required** |
| `full_name` | text | |
| `role` | text | Display role label |
| `is_admin` | boolean | **If `true`, bypasses ALL permission checks** |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Key points:**
- `id` matches `auth.users.id` (NOT `people.id`)
- `is_admin = true` makes `PermissionService.hasPermission()` return `true` for every module, every project, no questions asked
- Set via `POST /api/dev/make-admin` (dev only)
- This is NOT the same as the "Admin" permission template — the template is project-scoped, this is app-wide

---

### 4. `companies`

**What it does:** Global company directory. Companies exist system-wide and can be associated with multiple projects.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `name` | text | **Required** |
| `address` | text | |
| `city` | text | |
| `state` | text | |
| `website` | text | |
| `type` | text | |
| `status` | text | |
| `currency_code` | text | |
| `currency_symbol` | text | |
| `logo_url` | text | |
| `title` | text | |
| `notes` | text | |
| `metadata` | JSONB | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Key points:**
- Global record. NOT project-scoped
- A person links to a company via `people.company_id`
- A company links to a project via `project_companies`

---

### 5. `project_companies`

**What it does:** Associates a global company with a specific project and stores project-specific metadata for that company.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `project_id` | INTEGER (FK) | → `projects.id` |
| `company_id` | UUID (FK) | → `companies.id` |
| `company_type` | text | `YOUR_COMPANY`, `VENDOR`, `SUBCONTRACTOR`, `SUPPLIER`, `CONNECTED_COMPANY` |
| `primary_contact_id` | UUID (FK) | → `people.id`. Main contact for this company on this project |
| `business_phone` | text | Project-specific phone (may differ from global company phone) |
| `email_address` | text | Project-specific email |
| `erp_vendor_id` | text | ERP system identifier |
| `logo_url` | text | Project-specific logo |
| `status` | text | `ACTIVE` or `INACTIVE` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraints:**
- `(project_id, company_id)` — one association per company per project
- `(project_id, erp_vendor_id)` — one ERP vendor ID per project

---

### 6. `project_directory_memberships`

**What it does:** The core join table that puts a person into a project's directory. Without a row here, a person is invisible to that project.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `project_id` | INTEGER (FK) | → `projects.id` |
| `person_id` | UUID (FK) | → `people.id` |
| `permission_template_id` | UUID (FK) | → `permission_templates.id`. Defines what this person can do |
| `status` | text | `'active'` or `'inactive'` |
| `role` | text | Display label (e.g., "Superintendent") |
| `invite_status` | text | `'not_invited'`, `'invited'`, `'accepted'`, `'expired'` |
| `invite_token` | text | Random 32-char token for invite link |
| `invite_expires_at` | timestamptz | 7 days from invite send |
| `invited_at` | timestamptz | |
| `last_invited_at` | timestamptz | |
| `is_employee_of_company` | boolean | |
| `is_insurance_manager` | boolean | |
| `employee_id` | text | Employer's employee ID |
| `metadata` | JSONB | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint:** `(project_id, person_id)` — one membership per person per project

**Key points:**
- This is the table that ALL permission checks ultimately depend on
- `PermissionService.getUserPermissions()` joins this table → `permission_templates` to get `rules_json`
- A person can be in the membership table but still unable to log in (if `users_auth` row doesn't exist yet)
- Invite flow: `not_invited` → admin sends invite → `invited` → user clicks link → `accepted`

---

### 7. `permission_templates`

**What it does:** Defines named permission sets that can be assigned to users via memberships. Controls what modules a user can access and at what level.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `name` | text | **Required.** e.g., "Admin", "Project Manager" |
| `description` | text | |
| `scope` | text | `'project'`, `'company'`, or `'global'` (only `project` is used today) |
| `rules_json` | JSONB | **Required.** The actual permission rules |
| `is_system` | boolean | `true` = cannot be edited or deleted |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**`rules_json` structure:**
```json
{
  "directory":     ["read", "write", "admin"],
  "budget":        ["read", "write", "admin"],
  "contracts":     ["read", "write", "admin"],
  "documents":     ["read", "write", "admin"],
  "schedule":      ["read", "write", "admin"],
  "submittals":    ["read", "write", "admin"],
  "rfis":          ["read", "write", "admin"],
  "change_orders": ["read", "write", "admin"]
}
```

**Permission levels:**
- `read` — can view
- `write` — can view + create + edit (implies `read`)
- `admin` — full access (implies `read` + `write`)

**Seeded system templates:**

| Name | Scope | Permissions |
|------|-------|------------|
| **Admin** | project | `admin` on all 8 modules |
| **Project Manager** | project | `read` + `write` on all 8 modules |
| **Subcontractor** | project | `read` on most, `read` + `write` on submittals and rfis |
| **View Only** | project | `read` on all 8 modules |

---

### 8. `user_directory_permissions`

**What it does:** Per-user permission overrides on top of the template. Allows granting a specific person a different permission level for a specific project.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `person_id` | UUID (FK) | → `people.id` |
| `project_id` | INTEGER (FK) | → `projects.id` |
| `permission_level` | text | **Required** |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Key points:**
- Currently not widely used in code — the template-based system handles most cases
- Exists for future fine-grained overrides

---

### 9. `user_project_roles`

**What it does:** Allows assigning multiple named roles to a single project membership (e.g., a person can be both "Superintendent" and "Safety Manager").

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `membership_id` | UUID (FK) | → `project_directory_memberships.id` |
| `role_name` | text | **Required.** e.g., "Superintendent" |
| `assigned_at` | timestamptz | |

**Key points:**
- These are display/organizational roles, NOT permission roles
- Permissions come from `permission_templates` via the membership

---

### 10. `distribution_groups`

**What it does:** Project-scoped groups for organizing people (e.g., "Safety Committee", "Daily Log Recipients").

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `project_id` | INTEGER (FK) | → `projects.id` |
| `name` | text | **Required.** Unique per project |
| `description` | text | |
| `status` | text | `'active'` or `'inactive'` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### 11. `distribution_group_members`

**What it does:** Junction table linking people to distribution groups.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `group_id` | UUID (FK) | → `distribution_groups.id` |
| `person_id` | UUID (FK) | → `people.id` |
| `created_at` | timestamptz | |

**Unique constraint:** `(group_id, person_id)`

---

### 12. `user_email_notifications`

**What it does:** Per-person, per-project email notification preferences.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `person_id` | UUID (FK) | → `people.id` |
| `project_id` | INTEGER (FK) | → `projects.id` |
| `emails_default` | boolean | |
| `rfis_default` | boolean | |
| `submittals_default` | boolean | |
| `daily_log_default` | boolean | |
| `delay_log_default` | boolean | |
| `punchlist_items_default` | boolean | |
| `weather_delay_email` | boolean | |
| `weather_delay_phone` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### 13. `user_schedule_notifications`

**What it does:** Per-person, per-project schedule notification preferences.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `person_id` | UUID (FK) | → `people.id` |
| `project_id` | INTEGER (FK) | → `projects.id` |
| `upon_schedule_changes` | boolean | |
| `upon_schedule_change_requests` | boolean | |
| `all_project_tasks_weekly` | boolean | |
| `project_schedule_lookahead_weekly` | boolean | |
| `resource_tasks_assigned_to_id` | UUID (FK) | → `people.id` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### 14. `app_roles`

**What it does:** Lookup table for application-level role names. Not currently used in permission checks.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `name` | text | **Required** |

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
```

### Admin Adds User to Project Directory
```
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
```

### Admin Adds Contact to Project Directory
```
Admin clicks "Add Contact" in project directory
    → DirectoryService.createPerson()
        → INSERT people (person_type='contact')
        → INSERT project_directory_memberships
    → No invite sent (contacts don't log in)
    → No auth.users or users_auth created
```

---

## Permission Check Flow

Every API route that checks permissions does this:

```
1. supabase.auth.getUser() → gets auth_user_id

2. PermissionService.hasPermission(auth_user_id, projectId, module, level)
    │
    ├─ Check user_profiles.is_admin → if true, return true (bypass everything)
    │
    └─ getUserPermissions(auth_user_id, projectId)
        │
        ├─ Query project_directory_memberships
        │   WHERE person.users_auth.auth_user_id = auth_user_id
        │   AND project_id = projectId
        │   AND status = 'active'
        │
        ├─ Get permission_template.rules_json
        │
        └─ Check if rules_json[module] includes requested level
            │
            ├─ 'admin' includes everything
            ├─ 'write' includes 'read'
            └─ 'read' is read-only
```

---

## Critical FK Type Rules

| Column | Type | Must Match |
|--------|------|-----------|
| `people.id` | UUID | All `person_id` FKs must be UUID |
| `projects.id` | INTEGER | All `project_id` FKs must be INTEGER |
| `companies.id` | UUID | All `company_id` FKs must be UUID |
| `permission_templates.id` | UUID | `permission_template_id` must be UUID |

**Historical bug:** `schedule_tasks.project_id` was created as UUID instead of INTEGER, breaking all queries silently. Always verify FK types match.
