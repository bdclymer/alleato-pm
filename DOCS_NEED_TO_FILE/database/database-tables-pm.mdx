# Supabase Tables - Project Management

## Budget Tables

| Name                      | Description            |
| ------------------------- |----------------------- |
| budget_codes                     | Project-specific budget code hierarchies and organization |
| budget_items                     | Legacy/alternate budget items (deprecated - use budget_line_items) |
| budget_line_items                | Core budget entries defining allocated amounts per cost code/type |
| budget_modifications             | Formal approved changes to project budget baseline |
| budget_snapshots                 | Point-in-time captures of budget state for historical comparison |
| cost_code_division_updates_audit | Audit trail for cost code division structure changes |
| cost_code_divisions              | CSI MasterFormat divisions for organizing cost codes (01-49) |
| cost_code_types                  | Categories of costs (Labor, Materials, Equipment, Subcontractor, etc.) |
| cost_codes                       | Standardized construction cost codes (CSI format) |
| cost_factors                     | Multipliers/factors applied to cost calculations |
| cost_forecasts                   | Projected final cost estimates for budget line items |
| financial_contracts              | Financial summary data for prime contracts |
| forecasting                      | Budget forecast-to-complete calculations and projections |
| direct_cost_line_items           | Individual line items within direct cost transactions |
| direct_costs                     | Direct project costs (not associated with commitments) |

## Change Events, Change Orders & Commitments

| Name                      | Description            |
| ------------------------- |----------------------- |
| change_event_line_items          | Individual cost impacts within a change event (by cost code) |
| change_events                    | Potential project changes awaiting approval/conversion to change orders |
| change_order_approvals           | Approval workflow tracking for change orders |
| change_order_costs               | Cost breakdown for change order line items |
| change_order_line_items          | Detailed line items within change orders (deprecated - use change_order_lines) |
| change_order_lines               | Line items showing scope and cost changes in change orders |
| change_orders                    | Formal approved changes to project scope/budget/schedule |
| commitment_changes               | Modifications to existing commitment contracts (PCOs, SCOs) |
| commitments                      | Subcontracts and purchase orders (financial commitments to vendors/subs) |

## Directory Tables

| Name                      | Description            | Can Delete? |
| ------------------------- |----------------------- |------------ |
| companies                        | Organizations/vendors/subcontractors in the system | NO - Core directory entity with FK references |
| company_context                  | Additional context and metadata for companies | MAYBE - Check if populated/used |
| contacts                         | Individual people associated with companies | NO - Core directory entity (use people table instead) |
| contracts                        | Prime contracts with project owners (NOT subcontracts) | NO - Core financial entity |
| employees                        | Internal company employees | NO - Core directory entity (use people table instead) |
| clients                          | Current paying clients/project owners | NO - Core business entity |
| prospects                        | Potential leads not yet converted to clients | MAYBE - Business data, check if used |
| users                            | Lightweight user records (id, email only) - FK target for many tables | NO - Referenced by 15+ tables (change_events, submittals, reviews, etc.) |
| project_users                    | User-to-project assignments with roles (junction table) | NO - CRITICAL: Used extensively in RLS policies for authorization |
| users_auth                       | Links people records to Supabase auth.users (1:1 mapping) | NO - Core auth integration, references people table |
| app_users                        | Legacy user profiles with full metadata (name, avatar, password_hash) | YES - Deprecated in favor of people + users_auth pattern |
| permission_templates             | Reusable permission sets for role assignment | NO - Core permissions system |
| project_roles                    | Role definitions within projects (PM, Super, Admin, etc.) | NO - Core permissions system |
| project_role_members             | User assignments to project roles | NO - Core permissions system |


## Document Management Tables

| Name                             | Description            |
| -------------------------------- |----------------------- |
| attachments                      | File attachments linked to various entities (change events, RFIs, etc.) |
| documents                        | Project documents (plans, specs, contracts) |
| document_chunks                  | AI-processed text chunks from documents for RAG/search |
| document_executive_summaries     | AI-generated summaries of documents |
| document_group_access            | Group-level access controls for documents |
| document_insights                | AI-extracted insights and key information from documents |
| document_metadata                | Additional metadata and tags for documents |
| document_rows                    | Structured data rows extracted from documents |
| document_user_access             | User-level access controls for documents |
| files                            | Binary file storage references |

## Daily Logging & Field Reports

| Name                             | Description            |
| -------------------------------- |----------------------- |
| daily_logs                       | Daily field reports (weather, activities, issues) |
| daily_log_equipment              | Equipment usage tracked in daily logs |
| daily_log_manpower               | Labor/manpower tracked in daily logs |
| daily_log_notes                  | Free-form notes and observations in daily logs |
| daily_recaps                     | Daily summary reports and recaps |

## Billing & Invoicing

| Name                             | Description            |
| -------------------------------- |----------------------- |
| billing_periods                  | Billing cycles for owner invoices |

## System & Integration Tables

| Name                             | Description            |
| -------------------------------- |----------------------- |
| briefing_runs                    | AI briefing generation execution logs |
| chunks                           | Generic text chunks for AI processing |
| code_examples                    | Code snippet examples (development/documentation) |
| discrepancies                    | Identified discrepancies in data or processes |
| erp_sync_log                     | ERP system integration sync logs |

---

## User Tables Architecture Explained

### Overview

Alleato-Procore uses **4 user-related tables** with distinct purposes. Understanding these is critical for safe database modifications.

### Current Architecture (as of 2026-01-10)

```
┌─────────────────┐
│  auth.users     │ ← Supabase Auth (system table)
│  (Supabase)     │
└────────┬────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
    ┌────▼──────┐                    ┌────▼────────┐
    │  users    │                    │ users_auth  │
    │ (simple)  │                    │ (auth link) │
    └─────┬─────┘                    └──────┬──────┘
          │                                 │
          │ FK references (15+ tables)      │ FK to people
          │                                 │
          ▼                            ┌────▼─────┐
    ┌───────────────┐                 │  people  │
    │ change_events │                 │ (unified)│
    │  submittals   │                 └──────────┘
    │   reviews     │
    │  daily_logs   │
    └───────────────┘

    ┌──────────────┐
    │ project_users│ ← Junction table: users ↔ projects
    │ (authz/RLS)  │    Used in ALL RLS policies
    └──────────────┘

    ┌──────────────┐
    │  app_users   │ ← Legacy/deprecated
    │ (DEPRECATED) │    Safe to delete
    └──────────────┘
```

### Table Details

#### 1. `users` Table
**Structure:**
```typescript
{
  id: uuid,           // Primary key
  email: string,      // Unique email
  created_at: timestamp,
  updated_at: timestamp
}
```

**Purpose:** Lightweight user reference table
**Used By:** 15+ tables as foreign key target
**FK References:**
- `change_events.created_by` → `users.id`
- `change_events.updated_by` → `users.id`
- `change_event_approvals.approver_id` → `users.id`
- `change_event_attachments.uploaded_by` → `users.id`
- `change_event_history.changed_by` → `users.id`
- `cost_forecasts.created_by` → `users.id`
- `daily_logs.created_by` → `users.id`
- `submittal_*` tables (multiple)
- `review_comments.created_by` → `users.id`
- `reviews.reviewer_id` → `users.id`
- Plus more...

**Can Delete?** ❌ **NO** - Core table with extensive foreign key dependencies

---

#### 2. `project_users` Table
**Structure:**
```typescript
{
  id: uuid,
  project_id: integer,     // FK to projects
  user_id: uuid,           // FK to users
  role: string,            // 'viewer', 'standard', 'admin', 'owner'
  permissions: json,       // Custom permissions
  assigned_at: timestamp
}
```

**Purpose:** Junction table linking users to projects with role-based access control
**Critical Usage:** Used in **ALL RLS policies** for authorization

**Example RLS Policy Usage:**
```sql
-- From change_events RLS policies
CREATE POLICY "change_events_select_policy" ON change_events
FOR SELECT TO authenticated
USING (
  project_id IN (
    SELECT project_id
    FROM project_users
    WHERE user_id = auth.uid()
  )
);
```

**Performance Indexes:**
- `idx_project_users_user_project` ON (user_id, project_id)
- `idx_project_users_role` ON (project_id, role)

**Can Delete?** ❌ **NO - CRITICAL** - Deleting this breaks ALL authorization/RLS policies system-wide

---

#### 3. `users_auth` Table
**Structure:**
```typescript
{
  person_id: uuid,         // Primary key, FK to people
  auth_user_id: uuid,      // FK to auth.users (Supabase)
  last_login_at: timestamp
}
```

**Purpose:** Bridge table linking `people` records to Supabase `auth.users`
**Architecture:** Part of new unified directory system (migration from old user model)
**Relationship:** 1:1 mapping (one person = one auth account)

**Migration Context:**
- Old system: `app_users` (standalone user table)
- New system: `people` + `users_auth` (unified contacts/users)
- `people.person_type` = 'user' → has matching `users_auth` record
- `people.person_type` = 'contact' → no `users_auth` record

**Can Delete?** ❌ **NO** - Core authentication integration table

---

#### 4. `app_users` Table (DEPRECATED)
**Structure:**
```typescript
{
  id: uuid,                // FK to auth.users
  email: string,
  name: string,
  full_name: string,
  avatar_url: string,
  password_hash: string,   // ⚠️ Stored locally (insecure)
  role: string,            // 'admin' | 'user'
  email_verified: boolean,
  created_at: timestamp,
  updated_at: timestamp
}
```

**Purpose:** Legacy user profile table (before `people` + `users_auth` migration)
**Status:** **DEPRECATED** - Replaced by `people` + `users_auth` pattern
**Usage:** Only 2 code references (auth signup, use-users hook)
**FK References:** Only 3 tables reference this:
- `projects.budget_locked_by` → `app_users.id`
- `schedule_of_values.approved_by` → `app_users.id`

**Migration Path:**
1. Migrate `app_users` data to `people` + `users_auth`
2. Update FK references to point to new tables
3. Then safe to delete

**Can Delete?** ✅ **YES** - After data migration to `people` + `users_auth`

---

### Deletion Safety Summary

| Table | Can Delete? | Reason | Migration Required? |
|-------|-------------|--------|---------------------|
| `users` | ❌ NO | Referenced by 15+ tables as FK target | N/A |
| `project_users` | ❌ NO | **CRITICAL** - Used in ALL RLS authorization policies | N/A |
| `users_auth` | ❌ NO | Core auth integration (people ↔ auth.users) | N/A |
| `app_users` | ✅ YES | Deprecated, replaced by people + users_auth | ✅ Required |

---

### Before Deleting ANY User Table

**ALWAYS check:**
```sql
-- 1. Find all foreign key references
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'table_name_here';

-- 2. Check RLS policy dependencies
SELECT schemaname, tablename, policyname, definition
FROM pg_policies
WHERE definition ILIKE '%table_name_here%';

-- 3. Count actual rows
SELECT COUNT(*) FROM table_name_here;
```

---

### Recommended Actions

#### ✅ Safe to Do Now:
1. **Mark `app_users` as deprecated** in code comments
2. **Plan migration** from `app_users` → `people` + `users_auth`
3. **Document FK dependencies** for all user tables

#### ⚠️ Requires Planning:
1. **Migrate `app_users` data** to unified `people` table
2. **Update 3 FK references** to point to new tables
3. **Test RLS policies** still work after migration
4. **THEN delete `app_users`** table

#### ❌ Never Do:
1. Delete `users` table (breaks 15+ FK references)
2. Delete `project_users` table (breaks ALL authorization)
3. Delete `users_auth` table (breaks auth system)
4. Delete any user table without FK dependency check

---

### Related Tables

**Directory System:**
- `people` - Unified table for users + contacts
- `project_directory_memberships` - Project access control
- `distribution_groups` - User groupings for notifications
- `permission_templates` - Reusable permission sets
- `project_roles` - Role definitions
- `project_role_members` - Role assignments

**See:** `20240104_create_directory_tables.sql` for full directory system architecture