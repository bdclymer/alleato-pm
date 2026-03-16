# PRP: Microsoft Project for the Web — Bidirectional Sync Integration

---

## Goal

**Feature Goal:** Enable bidirectional synchronization between Alleato PM's scheduling tool and Microsoft Project for the Web (Dataverse-based), allowing users to connect their Microsoft account, import project schedules, and push task updates back.

**Deliverable:** OAuth2 connection flow, Dataverse API client, sync service, and UI components for connecting, importing, and syncing MS Project data with Alleato's `schedule_tasks` table.

**Success Definition:**
- User can authenticate via Azure AD OAuth2 and connect their MS Project account
- User can list and select MS Project projects from their Dataverse environment
- Tasks (with dependencies and milestones) sync into Alleato's schedule_tasks table
- Task updates in Alleato push back to MS Project via OperationSet API
- Sync state is tracked and visible in the UI

---

## Why

**Business value:** Construction firms commonly use Microsoft Project for scheduling. Alleato PM users need their MS Project schedules accessible within Alleato without manual CSV export/import workflows. This integration eliminates double-entry and keeps both systems in sync.

**Integration with existing features:** Extends the existing Schedule tool (Gantt chart, task CRUD, import/export) with a live external data source. Follows the established Acumatica integration pattern (client → sync service → database).

**Problems this solves:**
- Manual CSV export/import is error-prone and creates stale data
- No visibility into MS Project schedules within Alleato's project context
- Teams split between MS Project (schedulers) and Alleato (project managers) lack a single source of truth

---

## What — List of Deliverables

**Pages**
- Settings panel within Schedule page for MS Project connection management
- MS Project picker modal (list projects, select one to sync)

---

**Database Schema**
- `integration_tokens` table — stores encrypted OAuth tokens per user/provider
- `ms_project_sync_state` table — tracks sync status per project mapping
- New columns on `schedule_tasks`: `ms_project_task_id`, `ms_project_sync_at`
- New columns on `schedule_dependencies`: `ms_project_dependency_id`

---

**API Endpoints**
- `GET /api/integrations/microsoft/auth` — initiate OAuth2 flow (redirect to Azure AD)
- `GET /api/integrations/microsoft/callback` — handle OAuth2 callback, store tokens
- `DELETE /api/integrations/microsoft/disconnect` — revoke tokens, disconnect
- `GET /api/integrations/microsoft/status` — check connection status
- `GET /api/integrations/microsoft/projects` — list user's MS Project projects from Dataverse
- `POST /api/projects/[projectId]/scheduling/sync/ms-project` — trigger sync (pull or push)
- `GET /api/projects/[projectId]/scheduling/sync/ms-project/status` — sync status

---

**Components**
- `MsProjectConnectionPanel` — connection status, connect/disconnect buttons
- `MsProjectPickerModal` — browse and select MS Project projects
- `SyncStatusIndicator` — shows last sync time, status, errors

---

**Frontend Hooks**
- `useMsProjectConnection` — manages connection state, auth flow trigger
- `useMsProjectProjects` — fetches available MS Project projects
- `useMsProjectSync` — triggers and polls sync operations

---

## Success Criteria

- [ ] User can complete OAuth2 flow with Azure AD and see "Connected" status
- [ ] User can browse and select from their MS Project projects
- [ ] Pull sync imports tasks, dependencies, and milestones into schedule_tasks
- [ ] Push sync sends task updates back to MS Project via OperationSet API
- [ ] Sync handles pagination (5,000+ tasks per project)
- [ ] Tokens auto-refresh without user intervention
- [ ] Disconnect properly revokes tokens and cleans up
- [ ] TypeScript compiles with zero errors
- [ ] ESLint passes with zero errors
- [ ] All existing tests continue to pass

---

## All Needed Context

### Context Completeness Check

*This PRP provides everything needed for implementation: exact file patterns, database schemas, API contracts, field mappings, and integration patterns from the existing Acumatica client.*

### Documentation & References

```yaml
# MUST READ - Critical external documentation
- url: https://learn.microsoft.com/en-us/dynamics365/project-operations/project-management/schedule-api-preview
  why: Dataverse OperationSet API for creating/updating tasks — the ONLY way to write scheduling data
  critical: Direct PATCH/POST to msdyn_projecttask is NOT allowed — must use OperationSet wrapper

- url: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/authenticate-oauth
  why: OAuth2 authentication flow for Dataverse (scopes, token endpoints, delegated vs app permissions)
  critical: Scope format is https://{org}.crm.dynamics.com/user_impersonation — org URL varies per tenant

- url: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/discovery-service
  why: Global Discovery Service for discovering user's Dataverse org URL
  critical: GET https://globaldisco.crm.dynamics.com/api/discovery/v2.0/Instances returns ApiUrl per org

- url: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/authenticate-web-api
  why: HTTP headers and authentication pattern for Dataverse Web API calls
  critical: Must include OData-MaxVersion, OData-Version, Accept headers on every request

- url: https://www.npmjs.com/package/@azure/msal-node
  why: Microsoft Authentication Library for Node.js — handles OAuth2 auth code flow with PKCE
  critical: Use ConfidentialClientApplication for server-side auth code exchange

- docfile: docs-ai/contents/docs/PRPs/integrations/ms-project/docs/msal-dataverse-reference.md
  why: Practical implementation reference with encryption, discovery, batching patterns
  section: All sections — token management, AES-256-GCM encryption, OperationSet batching, retry

# MUST READ - Codebase files to follow as patterns
- file: frontend/src/lib/acumatica/client.ts
  why: THE integration client pattern — singleton, session management, retry on auth failure, OData queries
  pattern: Class with ensureSession(), auto-refresh, fetchEntity<TRaw, TFlat>() for typed API calls
  gotcha: Session TTL is 15 min; access tokens from Azure AD expire in ~60-75 min

- file: frontend/src/lib/acumatica/sync.ts
  why: Sync service pattern — fetch external data → match by external ID → upsert into Supabase
  pattern: syncVendors() and syncDirectCosts() show the exact match → update/insert loop
  gotcha: Must track sync state in a dedicated table (acumatica_sync_state pattern)

- file: frontend/src/lib/acumatica/types.ts
  why: Type definitions pattern — Raw vs Flat types for API response unwrapping
  pattern: RawVendor (wire format) → FlatVendor (unwrapped) via unwrap<T>() utility

- file: frontend/src/lib/services/scheduling-service.ts
  why: Service layer for schedule task CRUD — all database operations go through this
  pattern: Class instantiated with Supabase client, methods return { data, error } pattern
  gotcha: createTask() auto-generates sort_order; bulk import sets it explicitly

- file: frontend/src/types/scheduling.ts
  why: All scheduling type definitions (ScheduleTask, ScheduleDependency, ScheduleDeadline)
  pattern: TypeScript interfaces matching database schema exactly

- file: frontend/src/hooks/use-schedule-tasks.ts
  why: Schedule hooks use plain useState + useEffect + useCallback (NOT React Query)
  pattern: useState for data/loading/error, useRef cancellation flag, parallel fetch() calls, refetch callback
  gotcha: Does NOT use React Query — follow same plain state pattern for consistency

- file: frontend/src/lib/supabase/server.ts
  why: Server-side Supabase client creation pattern (used in all API routes)
  pattern: createClient() per request, cookie-based session, getApiRouteUser() for auth

- file: frontend/src/app/api/projects/[projectId]/scheduling/tasks/import/route.ts
  why: Existing bulk import API route — follow this exact pattern for sync endpoint
  pattern: Auth check → validate → loop create tasks → return { imported, failed, errors }

- file: frontend/src/components/scheduling/import-export-modal.tsx
  why: Existing schedule UI modal — follow Dialog/Tabs pattern for MS Project picker
  pattern: Dialog + Tabs + state management + loading/error/success states
```

### Current Relevant Codebase Tree

```
frontend/src/
├── app/
│   ├── api/
│   │   ├── integrations/           # NEW — OAuth routes go here
│   │   │   └── microsoft/
│   │   │       ├── auth/route.ts
│   │   │       ├── callback/route.ts
│   │   │       ├── disconnect/route.ts
│   │   │       └── status/route.ts
│   │   └── projects/[projectId]/
│   │       └── scheduling/
│   │           ├── tasks/
│   │           │   ├── route.ts         # existing CRUD
│   │           │   └── import/route.ts  # existing import
│   │           └── sync/               # NEW
│   │               └── ms-project/
│   │                   ├── route.ts     # trigger sync
│   │                   └── status/route.ts
│   └── (main)/[projectId]/
│       └── schedule/page.tsx           # existing — add connection UI
├── components/
│   └── scheduling/
│       ├── gantt-chart.tsx             # existing
│       ├── import-export-modal.tsx     # existing — pattern reference
│       ├── ms-project-connection.tsx   # NEW
│       ├── ms-project-picker.tsx       # NEW
│       └── sync-status.tsx             # NEW
├── hooks/
│   ├── use-schedule-tasks.ts           # existing
│   └── use-ms-project.ts              # NEW — connection + sync hooks
├── lib/
│   ├── acumatica/                      # PATTERN REFERENCE
│   │   ├── client.ts
│   │   ├── sync.ts
│   │   └── types.ts
│   ├── ms-project/                     # NEW — all MS Project integration code
│   │   ├── client.ts                   # Dataverse API client
│   │   ├── sync.ts                     # Bidirectional sync service
│   │   ├── types.ts                    # MS Project/Dataverse types
│   │   └── field-mapping.ts            # Field mapping between systems
│   ├── services/
│   │   └── scheduling-service.ts       # existing — sync service calls this
│   └── supabase/
│       └── server.ts                   # existing — server client pattern
├── types/
│   ├── database.types.ts               # existing — regenerate after migration
│   └── scheduling.ts                   # existing — add ms_project_task_id
└── ...
```

### Desired New Files (with responsibility)

```
frontend/src/lib/ms-project/client.ts          — Dataverse API client (auth, HTTP, pagination)
frontend/src/lib/ms-project/types.ts           — TypeScript types for Dataverse entities
frontend/src/lib/ms-project/sync.ts            — Bidirectional sync logic (pull + push)
frontend/src/lib/ms-project/field-mapping.ts   — Field mapping MS Project ↔ Alleato
frontend/src/hooks/use-ms-project.ts           — React Query hooks for connection + sync
frontend/src/components/scheduling/ms-project-connection.tsx  — Connection panel UI
frontend/src/components/scheduling/ms-project-picker.tsx      — Project picker modal
frontend/src/components/scheduling/sync-status.tsx            — Sync status indicator
frontend/src/app/api/integrations/microsoft/auth/route.ts     — OAuth2 initiate
frontend/src/app/api/integrations/microsoft/callback/route.ts — OAuth2 callback
frontend/src/app/api/integrations/microsoft/disconnect/route.ts — Disconnect
frontend/src/app/api/integrations/microsoft/status/route.ts   — Connection status
frontend/src/app/api/integrations/microsoft/projects/route.ts — List MS Projects
frontend/src/app/api/projects/[projectId]/scheduling/sync/ms-project/route.ts — Trigger sync
frontend/src/app/api/projects/[projectId]/scheduling/sync/ms-project/status/route.ts — Sync status
supabase/migrations/YYYYMMDDHHMMSS_ms_project_integration.sql — Schema changes
```

### Known Gotchas of Our Codebase & Library Quirks

```tsx
// CRITICAL: projects.id is INTEGER (number), NOT UUID
// Any FK column referencing projects must be INTEGER
// schedule_tasks.project_id is already INTEGER — verified

// CRITICAL: Next.js 15 App Router — params must be awaited
// const { projectId } = await params;  // NOT: const { projectId } = params;

// CRITICAL: Route parameter naming — NEVER use generic [id]
// Use [projectId], [companyId], etc. to avoid conflicts

// CRITICAL: After creating new route files, clear .next cache
// rm -rf frontend/.next && restart dev server

// CRITICAL: Dataverse OperationSet — ONLY way to write scheduling data
// Direct PATCH/POST to msdyn_projecttask does NOT work
// Must: CreateOperationSetV1 → PssCreateV1/PssUpdateV1 → ExecuteOperationSetV1
// Limit: 200 operations per OperationSet, 10 concurrent sets per user

// CRITICAL: Dataverse org URL varies per tenant
// Must use Global Discovery Service to find it, or ask user to provide it
// Format: https://{org}.crm.dynamics.com

// IMPORTANT: Supabase server client — create per request
// import { createClient } from "@/lib/supabase/server"
// const supabase = await createClient();

// IMPORTANT: Design system compliance
// Use components from @/components/ui/ or @/components/ds/
// Use semantic colors: bg-background, text-foreground, border-border
// Never use hardcoded colors (bg-gray-200, etc.)
```

---

## Database Schema

### Current Tables (Verified from database.types.ts)

**`schedule_tasks`** — Primary scheduling table
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID (string) | No | PK |
| project_id | INTEGER (number) | No | FK → projects.id |
| parent_task_id | UUID (string) | Yes | Self-reference FK |
| name | string | No | Required |
| start_date | string | Yes | ISO date |
| finish_date | string | Yes | ISO date |
| duration_days | number | Yes | Days |
| percent_complete | number | Yes | 0-100 |
| status | string | Yes | 'not_started' / 'in_progress' / 'complete' |
| is_milestone | boolean | Yes | |
| constraint_type | string | Yes | |
| constraint_date | string | Yes | |
| wbs_code | string | Yes | |
| sort_order | number | Yes | Display order |
| created_at | string | Yes | |
| updated_at | string | Yes | |

**`schedule_dependencies`** — Task relationships
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID (string) | No | PK |
| task_id | UUID (string) | No | FK → schedule_tasks.id |
| predecessor_task_id | UUID (string) | No | FK → schedule_tasks.id |
| dependency_type | string | No | 'finish_to_start' / 'start_to_start' / 'finish_to_finish' / 'start_to_finish' |
| lag_days | number | Yes | |
| created_at | string | Yes | |

**`schedule_deadlines`** — Task deadlines (one per task)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID (string) | No | PK |
| task_id | UUID (string) | No | FK → schedule_tasks.id (UNIQUE) |
| deadline_date | string | No | |
| deadline_type | string | Yes | |
| created_at | string | Yes | |

**`acumatica_sync_state`** — Pattern reference for sync tracking
| Column | Type | Notes |
|--------|------|-------|
| entity_name | string | PK — entity being synced |
| status | string | 'idle' / 'syncing' / 'error' |
| last_started_at | string | |
| last_success_at | string | |
| last_cursor | string | Pagination cursor |
| last_error | string | |
| last_stats | JSON | { imported, updated, failed } |
| updated_at | string | |

### New Tables Required

**`integration_tokens`** — OAuth token storage (encrypted)
```sql
CREATE TABLE integration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                    -- 'microsoft'
  access_token TEXT NOT NULL,                -- encrypted at app level
  refresh_token TEXT,                        -- encrypted at app level
  token_expires_at TIMESTAMPTZ NOT NULL,
  org_url TEXT,                              -- e.g., 'https://contoso.crm.dynamics.com'
  tenant_id TEXT,                            -- Azure AD tenant ID
  metadata JSONB DEFAULT '{}',              -- extra provider-specific data
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- RLS: Users can only access their own tokens
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tokens"
  ON integration_tokens FOR ALL
  USING (user_id = auth.uid());
```

**`ms_project_sync_state`** — Per-project sync tracking
```sql
CREATE TABLE ms_project_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ms_project_id TEXT NOT NULL,               -- Dataverse msdyn_projectid
  ms_project_name TEXT,
  sync_direction TEXT DEFAULT 'pull',        -- 'pull', 'push', 'bidirectional'
  status TEXT DEFAULT 'idle',                -- 'idle', 'syncing', 'error', 'success'
  last_pull_at TIMESTAMPTZ,
  last_push_at TIMESTAMPTZ,
  last_error TEXT,
  last_stats JSONB DEFAULT '{}',            -- { tasks_pulled, tasks_pushed, errors }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, ms_project_id)
);

ALTER TABLE ms_project_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sync state"
  ON ms_project_sync_state FOR ALL
  USING (user_id = auth.uid());
```

**New columns on `schedule_tasks`:**
```sql
ALTER TABLE schedule_tasks
  ADD COLUMN ms_project_task_id TEXT,        -- Dataverse msdyn_projecttaskid
  ADD COLUMN ms_project_sync_at TIMESTAMPTZ; -- Last synced timestamp
```

**New column on `schedule_dependencies`:**
```sql
ALTER TABLE schedule_dependencies
  ADD COLUMN ms_project_dependency_id TEXT;   -- Dataverse msdyn_projecttaskdependencyid
```

### FK Type Requirements (CRITICAL)

| FK Column | Must Be | Reason |
|-----------|---------|--------|
| project_id | INTEGER | projects.id is INTEGER |
| user_id | UUID | auth.users.id is UUID |
| task_id | UUID | schedule_tasks.id is UUID |
| predecessor_task_id | UUID | schedule_tasks.id is UUID |

---

## Implementation Blueprint

### Data Models and Structure

```typescript
// frontend/src/lib/ms-project/types.ts

// ============================================================
// Dataverse Entity Types (wire format from API)
// ============================================================

/** Dataverse project entity (msdyn_project) */
export interface DataverseProject {
  msdyn_projectid: string;
  msdyn_subject: string;
  msdyn_scheduledstart?: string;          // ISO datetime
  msdyn_scheduledend?: string;
  msdyn_progress?: number;                // 0-100 (read-only from API)
  msdyn_description?: string;
  statecode: number;                       // 0=Active, 1=Inactive
}

/** Dataverse task entity (msdyn_projecttask) */
export interface DataverseTask {
  msdyn_projecttaskid: string;
  msdyn_subject: string;
  msdyn_scheduledstart?: string;
  msdyn_scheduledend?: string;
  msdyn_effort?: number;                   // Total planned hours
  msdyn_effortcompleted?: number;          // Hours completed (read-only)
  msdyn_effortremaining?: number;          // Hours remaining (read-only)
  msdyn_outlinelevel?: number;             // 1 = top level
  _msdyn_parenttask_value?: string;        // Parent task GUID
  _msdyn_project_value?: string;           // Project GUID
  msdyn_wbsid?: string;                    // WBS identifier
}

/** Dataverse dependency entity (msdyn_projecttaskdependency) */
export interface DataverseDependency {
  msdyn_projecttaskdependencyid: string;
  _msdyn_predecessortask_value: string;
  _msdyn_successortask_value: string;
  msdyn_linktype: number;                  // 192350000=FS, 192350001=FF, 192350002=SS, 192350003=SF
  _msdyn_project_value: string;
}

// ============================================================
// Integration Types (internal use)
// ============================================================

export interface MsProjectConnection {
  isConnected: boolean;
  orgUrl?: string;
  tenantId?: string;
  tokenExpiresAt?: string;
}

export interface MsProjectSyncConfig {
  projectId: number;                       // Alleato project ID (INTEGER)
  msProjectId: string;                     // Dataverse project GUID
  msProjectName: string;
  syncDirection: 'pull' | 'push' | 'bidirectional';
}

export interface SyncResult {
  status: 'success' | 'partial' | 'error';
  tasksPulled: number;
  tasksPushed: number;
  dependenciesSynced: number;
  errors: Array<{ task: string; error: string }>;
  startedAt: string;
  completedAt: string;
}

// ============================================================
// OperationSet Types (for write operations)
// ============================================================

export interface OperationSetResponse {
  OperationSetId: string;
}

export interface OperationSetExecuteResponse {
  // Returns empty on success, errors in OData error format on failure
}

// Dataverse link type mapping
export const LINK_TYPE_MAP: Record<number, string> = {
  192350000: 'finish_to_start',
  192350001: 'finish_to_finish',
  192350002: 'start_to_start',
  192350003: 'start_to_finish',
};

export const REVERSE_LINK_TYPE_MAP: Record<string, number> = {
  finish_to_start: 192350000,
  finish_to_finish: 192350001,
  start_to_start: 192350002,
  start_to_finish: 192350003,
};
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
# ============================================================
# PHASE 1: Foundation (Data Layer + Auth)
# ============================================================

Task 1: CREATE supabase/migrations/YYYYMMDDHHMMSS_ms_project_integration.sql
  - IMPLEMENT: Database migration with all new tables and columns
  - Tables: integration_tokens, ms_project_sync_state
  - Columns: schedule_tasks.ms_project_task_id, schedule_tasks.ms_project_sync_at
  - Columns: schedule_dependencies.ms_project_dependency_id
  - RLS policies on both new tables
  - CRITICAL: project_id must be INTEGER (projects.id is INTEGER)
  - CRITICAL: user_id must be UUID (auth.users.id is UUID)
  - After creating: run `npm run db:types` to regenerate types

Task 2: CREATE frontend/src/lib/ms-project/types.ts
  - IMPLEMENT: All TypeScript interfaces and type definitions
  - FOLLOW pattern: frontend/src/lib/acumatica/types.ts (type structure)
  - Include: DataverseProject, DataverseTask, DataverseDependency
  - Include: MsProjectConnection, MsProjectSyncConfig, SyncResult
  - Include: OperationSet types, link type mappings
  - NAMING: PascalCase interfaces, camelCase properties

Task 3: CREATE frontend/src/lib/ms-project/field-mapping.ts
  - IMPLEMENT: Bidirectional field mapping between Dataverse and Alleato
  - Map: msdyn_subject ↔ name, msdyn_scheduledstart ↔ start_date, etc.
  - Convert: msdyn_effort (hours) → duration_days (days), using 8hr workday
  - Convert: msdyn_outlinelevel → parent_task_id (derive hierarchy from outline level)
  - Convert: msdyn_linktype (numeric enum) → dependency_type (string enum)
  - Handle: percent_complete (Alleato 0-100 ↔ Dataverse 0-100, same scale)

Task 4: CREATE frontend/src/lib/ms-project/client.ts
  - IMPLEMENT: Dataverse API client (singleton pattern, like Acumatica client)
  - FOLLOW pattern: frontend/src/lib/acumatica/client.ts (class structure, session mgmt)
  - Methods:
    - constructor(orgUrl: string, accessToken: string)
    - listProjects(): Promise<DataverseProject[]>
    - getProjectTasks(projectId: string): Promise<DataverseTask[]>
    - getProjectDependencies(projectId: string): Promise<DataverseDependency[]>
    - createOperationSet(projectId: string, description: string): Promise<string>
    - addCreateOperation(operationSetId: string, entity: object): Promise<void>
    - addUpdateOperation(operationSetId: string, entity: object): Promise<void>
    - executeOperationSet(operationSetId: string): Promise<void>
  - Handle: Pagination via @odata.nextLink
  - Handle: Rate limiting (429 → retry with Retry-After header)
  - Handle: Token refresh (call refresh callback when 401 received)
  - Headers: Authorization: Bearer {token}, OData-MaxVersion: 4.0, OData-Version: 4.0, Accept: application/json
  - CRITICAL: OperationSet limit is 200 operations — batch in groups of 200

# ============================================================
# PHASE 2: OAuth2 Flow (API Layer)
# ============================================================

Task 5: CREATE frontend/src/app/api/integrations/microsoft/auth/route.ts
  - IMPLEMENT: GET handler that redirects user to Azure AD authorization URL
  - Use @azure/msal-node ConfidentialClientApplication
  - Scopes: ['https://globaldisco.crm.dynamics.com/.default', 'offline_access']
  - Generate state parameter for CSRF protection (store in cookie)
  - Redirect URI: {APP_BASE_URL}/api/integrations/microsoft/callback
  - FOLLOW pattern: existing API routes for auth check + params await
  - ENV vars needed: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID

Task 6: CREATE frontend/src/app/api/integrations/microsoft/callback/route.ts
  - IMPLEMENT: GET handler for OAuth2 callback
  - Exchange authorization code for access + refresh tokens
  - Validate state parameter against cookie (CSRF protection)
  - Call Global Discovery Service to get user's Dataverse org URL
  - Store tokens + org_url in integration_tokens table (encrypted)
  - Redirect user back to schedule page with success indicator
  - Handle errors gracefully (user denied, code expired, etc.)

Task 7: CREATE frontend/src/app/api/integrations/microsoft/disconnect/route.ts
  - IMPLEMENT: DELETE handler to remove stored tokens
  - Delete from integration_tokens where user_id and provider='microsoft'
  - Optionally: revoke refresh token with Azure AD
  - Return success response

Task 8: CREATE frontend/src/app/api/integrations/microsoft/status/route.ts
  - IMPLEMENT: GET handler returning connection status
  - Check if integration_tokens row exists for current user + provider='microsoft'
  - Return: { isConnected, orgUrl, tokenExpiresAt }
  - If token is expired but refresh_token exists, attempt refresh

Task 9: CREATE frontend/src/app/api/integrations/microsoft/projects/route.ts
  - IMPLEMENT: GET handler listing user's MS Project projects
  - Load tokens from integration_tokens
  - If token expired, refresh using refresh_token
  - Instantiate DataverseClient with org_url + access_token
  - Call listProjects() and return results
  - Handle: token refresh failure → return 401 with reconnect message

# ============================================================
# PHASE 3: Sync Service (Business Logic)
# ============================================================

Task 10: CREATE frontend/src/lib/ms-project/sync.ts
  - IMPLEMENT: Bidirectional sync service
  - FOLLOW pattern: frontend/src/lib/acumatica/sync.ts (match → upsert loop)
  - Methods:
    - pullTasks(config: MsProjectSyncConfig, client: DataverseClient, supabase: SupabaseClient): Promise<SyncResult>
      1. Fetch all tasks from Dataverse for the MS Project
      2. Fetch all dependencies
      3. Load existing schedule_tasks for the Alleato project
      4. Match by ms_project_task_id (existing) or by name (first sync)
      5. For each Dataverse task:
         - If matched: UPDATE schedule_tasks with mapped fields
         - If new: INSERT into schedule_tasks with mapped fields + ms_project_task_id
      6. Sync dependencies similarly
      7. Update ms_project_sync_state
    - pushTasks(config: MsProjectSyncConfig, client: DataverseClient, supabase: SupabaseClient): Promise<SyncResult>
      1. Load schedule_tasks with ms_project_task_id NOT NULL (synced tasks only)
      2. For tasks with updated_at > ms_project_sync_at (modified since last sync):
         - Create OperationSet
         - Queue PssUpdateV1 operations (batch in groups of 200)
         - Execute OperationSet
      3. For tasks with ms_project_task_id IS NULL (new in Alleato):
         - Queue PssCreateV1 operations
      4. Update ms_project_sync_at on synced tasks
  - CRITICAL: OperationSet limit is 200 — split into multiple sets if needed
  - Handle: Conflict resolution (last-write-wins based on updated_at)
  - Handle: Deleted tasks (soft-match, don't delete in other system)

Task 11: CREATE frontend/src/app/api/projects/[projectId]/scheduling/sync/ms-project/route.ts
  - IMPLEMENT: POST handler to trigger sync
  - Body: { msProjectId, direction: 'pull' | 'push' | 'bidirectional' }
  - Auth check + project access validation
  - Load tokens, instantiate client
  - Call sync service (pullTasks and/or pushTasks)
  - Update ms_project_sync_state table
  - Return SyncResult

Task 12: CREATE frontend/src/app/api/projects/[projectId]/scheduling/sync/ms-project/status/route.ts
  - IMPLEMENT: GET handler returning sync status for a project
  - Query ms_project_sync_state for project_id
  - Return current status, last sync times, error info

# ============================================================
# PHASE 4: UI Layer
# ============================================================

Task 13: CREATE frontend/src/hooks/use-ms-project.ts
  - IMPLEMENT: Hooks using plain useState + useEffect + useCallback (NOT React Query)
  - FOLLOW pattern: frontend/src/hooks/use-schedule-tasks.ts (plain state management)
  - CRITICAL: The schedule hooks do NOT use React Query — use the same plain state pattern
  - Hooks:
    - useMsProjectConnection(): { data: MsProjectConnection | null, isLoading, error, refetch }
    - useMsProjectProjects(): { data: DataverseProject[], isLoading, error }
    - useMsProjectSync(projectId): { syncStatus, triggerSync, isLoading }
  - Pattern: useState for data/loading/error, useRef for cancellation, fetch() to API routes
  - Add 'use client' directive at top of file

Task 14: CREATE frontend/src/components/scheduling/ms-project-connection.tsx
  - IMPLEMENT: Connection panel component
  - Show: Connected/Disconnected status with org URL
  - Actions: Connect (redirects to OAuth), Disconnect (confirmation dialog)
  - Use: Button, Badge components from @/components/ui/
  - FOLLOW: Design system tokens (bg-background, text-foreground, etc.)
  - NAMING: 'use client' directive at top

Task 15: CREATE frontend/src/components/scheduling/ms-project-picker.tsx
  - IMPLEMENT: Modal to browse and select MS Project projects
  - FOLLOW pattern: frontend/src/components/scheduling/import-export-modal.tsx (Dialog structure)
  - List MS Project projects with name, start date, end date
  - Allow selection + confirm to link with current Alleato project
  - Handle: Loading state, empty state, error state
  - Use: Dialog, Button, Loader2 from existing components

Task 16: CREATE frontend/src/components/scheduling/sync-status.tsx
  - IMPLEMENT: Sync status indicator (compact, for schedule page header)
  - Show: Last sync time, status badge, sync button
  - Auto-poll status during active sync (every 5s)
  - Use: StatusBadge from @/components/ds for status display

Task 17: UPDATE frontend/src/app/(main)/[projectId]/schedule/page.tsx
  - ADD: MS Project connection panel in schedule settings/toolbar area
  - ADD: Sync status indicator near import/export button
  - IMPORT: MsProjectConnectionPanel, SyncStatusIndicator
  - FOLLOW: Existing page layout pattern (ProjectPageHeader + PageContainer)
  - Keep changes minimal — add components, don't restructure the page

# ============================================================
# PHASE 5: Environment & Configuration
# ============================================================

Task 18: UPDATE frontend/.env.local and frontend/.env.example
  - ADD: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID
  - ADD: AZURE_REDIRECT_URI (defaults to {APP_BASE_URL}/api/integrations/microsoft/callback)
  - ADD: TOKEN_ENCRYPTION_KEY (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
  - Token encryption uses AES-256-GCM — key is 32 bytes (64 hex chars)
  - NEVER commit actual secrets — only update .env.example with placeholder values

Task 19: INSTALL npm packages
  - RUN: cd frontend && npm install @azure/msal-node @azure/identity --legacy-peer-deps
  - NOTE: Use --legacy-peer-deps per existing project convention (Supabase peer dep conflicts)
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// Pattern 1: Dataverse Client (follow Acumatica client.ts)
// ============================================================

// frontend/src/lib/ms-project/client.ts
export class DataverseClient {
  private orgUrl: string;
  private accessToken: string;
  private onTokenRefresh?: () => Promise<string>;

  constructor(orgUrl: string, accessToken: string, onTokenRefresh?: () => Promise<string>) {
    this.orgUrl = orgUrl;
    this.accessToken = accessToken;
    this.onTokenRefresh = onTokenRefresh;
  }

  private get apiBase(): string {
    return `${this.orgUrl}/api/data/v9.2`;
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.apiBase}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // Handle token expiry — retry once with refreshed token
    if (res.status === 401 && this.onTokenRefresh) {
      this.accessToken = await this.onTokenRefresh();
      return this.fetch<T>(path, options);
    }

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Dataverse API error ${res.status}: ${error}`);
    }

    return res.json();
  }

  // Paginated fetch — follows @odata.nextLink until exhausted
  private async fetchAll<T>(path: string): Promise<T[]> {
    const results: T[] = [];
    let url: string | null = `${this.apiBase}${path}`;

    while (url) {
      const data = await this.fetch<{ value: T[]; '@odata.nextLink'?: string }>(url);
      results.push(...data.value);
      url = data['@odata.nextLink'] ?? null;
    }

    return results;
  }

  async listProjects(): Promise<DataverseProject[]> {
    return this.fetchAll<DataverseProject>(
      '/msdyn_projects?$select=msdyn_projectid,msdyn_subject,msdyn_scheduledstart,msdyn_scheduledend,msdyn_progress,statecode&$filter=statecode eq 0'
    );
  }

  async getProjectTasks(projectId: string): Promise<DataverseTask[]> {
    return this.fetchAll<DataverseTask>(
      `/msdyn_projecttasks?$filter=_msdyn_project_value eq ${projectId}&$select=msdyn_projecttaskid,msdyn_subject,msdyn_scheduledstart,msdyn_scheduledend,msdyn_effort,msdyn_effortcompleted,msdyn_outlinelevel,_msdyn_parenttask_value,msdyn_wbsid`
    );
  }

  async getProjectDependencies(projectId: string): Promise<DataverseDependency[]> {
    return this.fetchAll<DataverseDependency>(
      `/msdyn_projecttaskdependencies?$filter=_msdyn_project_value eq ${projectId}&$select=msdyn_projecttaskdependencyid,_msdyn_predecessortask_value,_msdyn_successortask_value,msdyn_linktype`
    );
  }

  // OperationSet write pattern
  async createOperationSet(projectId: string, description: string): Promise<string> {
    const result = await this.fetch<{ OperationSetId: string }>(
      '/msdyn_CreateOperationSetV1',
      {
        method: 'POST',
        body: JSON.stringify({ ProjectId: projectId, Description: description }),
      }
    );
    return result.OperationSetId;
  }

  async addPssCreate(operationSetId: string, entity: Record<string, unknown>): Promise<void> {
    await this.fetch('/msdyn_PssCreateV1', {
      method: 'POST',
      body: JSON.stringify({ Entity: entity, OperationSetId: operationSetId }),
    });
  }

  async addPssUpdate(operationSetId: string, entity: Record<string, unknown>): Promise<void> {
    await this.fetch('/msdyn_PssUpdateV1', {
      method: 'POST',
      body: JSON.stringify({ Entity: entity, OperationSetId: operationSetId }),
    });
  }

  async executeOperationSet(operationSetId: string): Promise<void> {
    await this.fetch('/msdyn_ExecuteOperationSetV1', {
      method: 'POST',
      body: JSON.stringify({ OperationSetId: operationSetId }),
    });
  }
}


// ============================================================
// Pattern 2: Field Mapping
// ============================================================

// frontend/src/lib/ms-project/field-mapping.ts
import { DataverseTask, DataverseDependency, LINK_TYPE_MAP, REVERSE_LINK_TYPE_MAP } from './types';
import { ScheduleTask, ScheduleDependency } from '@/types/scheduling';

const HOURS_PER_DAY = 8;

export function dataverseTaskToAlleato(
  task: DataverseTask,
  parentMap: Map<string, string> // ms_project_task_id → alleato task UUID
): Partial<ScheduleTask> {
  const parentMsId = task._msdyn_parenttask_value;
  return {
    name: task.msdyn_subject,
    start_date: task.msdyn_scheduledstart?.split('T')[0] ?? null,
    finish_date: task.msdyn_scheduledend?.split('T')[0] ?? null,
    duration_days: task.msdyn_effort ? Math.ceil(task.msdyn_effort / HOURS_PER_DAY) : null,
    percent_complete: task.msdyn_effortcompleted && task.msdyn_effort
      ? Math.round((task.msdyn_effortcompleted / task.msdyn_effort) * 100)
      : 0,
    wbs_code: task.msdyn_wbsid ?? null,
    parent_task_id: parentMsId ? (parentMap.get(parentMsId) ?? null) : null,
    is_milestone: (task.msdyn_effort ?? 0) === 0 && task.msdyn_scheduledstart === task.msdyn_scheduledend,
    status: deriveStatus(task),
  };
}

function deriveStatus(task: DataverseTask): 'not_started' | 'in_progress' | 'complete' {
  const effort = task.msdyn_effort ?? 0;
  const completed = task.msdyn_effortcompleted ?? 0;
  if (effort > 0 && completed >= effort) return 'complete';
  if (completed > 0) return 'in_progress';
  return 'not_started';
}

export function alleatoTaskToDataverse(
  task: ScheduleTask,
  msProjectId: string
): Record<string, unknown> {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.msdyn_projecttask',
    'msdyn_project@odata.bind': `/msdyn_projects(${msProjectId})`,
    msdyn_subject: task.name,
    msdyn_scheduledstart: task.start_date ? `${task.start_date}T00:00:00Z` : undefined,
    msdyn_scheduledend: task.finish_date ? `${task.finish_date}T00:00:00Z` : undefined,
    msdyn_effort: task.duration_days ? task.duration_days * HOURS_PER_DAY : undefined,
  };
}

export function dataverseDependencyToAlleato(
  dep: DataverseDependency
): { dependency_type: string } {
  return {
    dependency_type: LINK_TYPE_MAP[dep.msdyn_linktype] ?? 'finish_to_start',
  };
}


// ============================================================
// Pattern 3: OAuth2 API Route (auth initiation)
// ============================================================

// frontend/src/app/api/integrations/microsoft/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as msal from '@azure/msal-node';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

const msalConfig: msal.Configuration = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
  },
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cca = new msal.ConfidentialClientApplication(msalConfig);
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${process.env.APP_BASE_URL}/api/integrations/microsoft/callback`;

  const authUrl = await cca.getAuthCodeUrl({
    scopes: ['https://globaldisco.crm.dynamics.com/.default', 'offline_access'],
    redirectUri,
    state,
    prompt: 'consent',
  });

  // Store state in cookie for CSRF validation
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('ms_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}


// ============================================================
// Pattern 4: OAuth2 Callback
// ============================================================

// frontend/src/app/api/integrations/microsoft/callback/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${process.env.APP_BASE_URL}/auth/login`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // CSRF check
  const storedState = request.cookies.get('ms_auth_state')?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${process.env.APP_BASE_URL}/?error=invalid_state`);
  }

  if (error || !code) {
    return NextResponse.redirect(`${process.env.APP_BASE_URL}/?error=${error || 'no_code'}`);
  }

  const cca = new msal.ConfidentialClientApplication(msalConfig);
  const tokenResponse = await cca.acquireTokenByCode({
    code,
    scopes: ['https://globaldisco.crm.dynamics.com/.default', 'offline_access'],
    redirectUri: `${process.env.APP_BASE_URL}/api/integrations/microsoft/callback`,
  });

  // Discover user's Dataverse org URL via Global Discovery Service
  const discoveryRes = await fetch(
    'https://globaldisco.crm.dynamics.com/api/discovery/v2.0/Instances',
    { headers: { Authorization: `Bearer ${tokenResponse.accessToken}` } }
  );
  const discoveryData = await discoveryRes.json();
  const orgUrl = discoveryData.value?.[0]?.ApiUrl; // First org — could let user choose

  // Store tokens in database
  await supabase.from('integration_tokens').upsert({
    user_id: user.id,
    provider: 'microsoft',
    access_token: tokenResponse.accessToken,     // TODO: encrypt
    refresh_token: tokenResponse.refreshToken,   // TODO: encrypt
    token_expires_at: tokenResponse.expiresOn?.toISOString(),
    org_url: orgUrl,
    tenant_id: tokenResponse.tenantId,
  }, { onConflict: 'user_id,provider' });

  // Clear state cookie and redirect
  const response = NextResponse.redirect(`${process.env.APP_BASE_URL}/?ms_connected=true`);
  response.cookies.delete('ms_auth_state');
  return response;
}
```

### Integration Points

```yaml
DATABASE:
  - migration: supabase/migrations/YYYYMMDDHHMMSS_ms_project_integration.sql
  - tables: integration_tokens, ms_project_sync_state
  - columns: schedule_tasks.ms_project_task_id, schedule_tasks.ms_project_sync_at
  - columns: schedule_dependencies.ms_project_dependency_id
  - client: "@/lib/supabase/server" (createClient per request)

CONFIG:
  - add to: .env.local
  - AZURE_CLIENT_ID — Azure AD app registration client ID
  - AZURE_CLIENT_SECRET — Azure AD app registration client secret
  - AZURE_TENANT_ID — Azure AD tenant (use 'common' for multi-tenant)
  - APP_BASE_URL — already exists, used for redirect URI

PACKAGES:
  - @azure/msal-node — OAuth2 auth code flow
  - @azure/identity — optional, for service-to-service auth
  - Install with: npm install --legacy-peer-deps

ROUTES:
  - /api/integrations/microsoft/auth — OAuth initiate
  - /api/integrations/microsoft/callback — OAuth callback
  - /api/integrations/microsoft/disconnect — Remove connection
  - /api/integrations/microsoft/status — Check connection
  - /api/integrations/microsoft/projects — List MS Projects
  - /api/projects/[projectId]/scheduling/sync/ms-project — Trigger sync
  - /api/projects/[projectId]/scheduling/sync/ms-project/status — Sync status
```

---

## Known Pitfalls & Prevention

### From Pattern Analysis (Mandatory Review)

#### Database FK Type Mismatch (INCIDENT-LOG.md - CRITICAL)
**Historical Error:** schedule_tasks.project_id was created as UUID when projects.id is INTEGER, causing silent empty query results
**Prevention:** All new columns referencing projects must use INTEGER. All columns referencing auth.users must use UUID. Verify in database.types.ts after migration.
**Validation:** `grep "project_id" migration.sql` — must be `INTEGER`, never `UUID`

#### Next.js Route Parameter Conflicts (INCIDENT-LOG.md - CRITICAL)
**Historical Error:** Using generic `[id]` caused dev server crash
**Prevention:** All new API routes use specific names: `[projectId]`, never `[id]`
**Validation:** `npm run check:routes` after creating new routes

#### Next.js Cache Stale After New Routes (INCIDENT-LOG.md - CRITICAL)
**Historical Error:** New page.tsx showing 404 due to stale .next cache
**Prevention:** After creating any new route file: `rm -rf frontend/.next` then restart dev server
**Validation:** Dev server shows new routes in startup log

#### Async Params in Next.js 15 (INCIDENT-LOG.md - WARNING)
**Historical Error:** Accessing params without await caused runtime errors
**Prevention:** Always `const { projectId } = await params;` in all route handlers

#### Claiming Fixed Without Testing (INCIDENT-LOG.md - CRITICAL)
**Historical Error:** Code changes claimed "fixed" without running actual queries
**Prevention:** After sync implementation, run actual sync with real Dataverse data and verify tasks appear in schedule_tasks table

#### Acumatica OData Filter Pitfall (integration-errors.md)
**Relevance:** Dataverse OData is more robust than Acumatica's, but still test $filter queries carefully
**Prevention:** Test Dataverse queries with known project data before implementing sync loop

### MS Project / Dataverse Specific Pitfalls

#### OperationSet Is the ONLY Write Path
**Error:** Trying to directly PATCH msdyn_projecttask returns 403/500
**Prevention:** ALL write operations must go through CreateOperationSetV1 → PssCreate/PssUpdate → ExecuteOperationSetV1
**Limit:** 200 operations per OperationSet, 10 concurrent sets per user

#### Dataverse Org URL Is Tenant-Specific
**Error:** Hardcoding org URL fails for different tenants
**Prevention:** Use Global Discovery Service to discover org URL during OAuth callback, store in integration_tokens.org_url

#### Token Scope Must Match Org URL
**Error:** Token acquired for globaldisco.crm.dynamics.com won't work for contoso.crm.dynamics.com
**Prevention:** After discovering org URL, acquire a NEW token scoped to that specific org: `https://{org}.crm.dynamics.com/user_impersonation`

#### MSAL Does NOT Expose Refresh Tokens Directly
**Error:** Trying to read `tokenResponse.refreshToken` — it was removed from MSAL v2.x
**Prevention:** Serialize the ENTIRE token cache blob via `cca.getTokenCache().serialize()` and store that encrypted. Use `acquireTokenSilent()` for automatic refresh — MSAL handles refresh tokens internally within the cache.

#### OperationSet Is Asynchronous
**Error:** Querying tasks immediately after `msdyn_ExecuteOperationSetV1` returns stale/empty data
**Prevention:** ExecuteOperationSetV1 returns immediately but persists changes in background. Wait 3-5 seconds before querying to confirm writes.

#### Project License Required for Schedule APIs
**Error:** OperationSet calls return 403 for users without MS Project license
**Prevention:** The calling user MUST have a Microsoft Project license assigned. App-only (service principal) auth CANNOT use Schedule APIs.

#### msdyn_effort vs duration_days Conversion
**Error:** Treating msdyn_effort (hours) as days causes wildly wrong durations
**Prevention:** Always divide by HOURS_PER_DAY (8) when converting effort → duration_days

#### Outline Level ≠ Parent Task ID
**Error:** msdyn_outlinelevel tells you the nesting depth but NOT the parent task
**Prevention:** Use `_msdyn_parenttask_value` for parent task resolution, not outline level

---

## Validation Loop

### Level 1: Syntax & Style (After Each File)

```bash
cd frontend
npm run lint                     # ESLint with design system rules
npx tsc --noEmit                 # TypeScript strict mode check
# Expected: Zero errors
```

### Level 2: Existing Test Suite (Regression Check)

```bash
cd frontend
npm run test:unit                # Jest unit tests
# Expected: All existing tests pass — no regressions
```

### Level 3: Integration Testing

```bash
# 1. Apply migration
npm run db:types                 # Regenerate types after migration

# 2. Verify new tables exist
node -e "
const { createClient } = require('@supabase/supabase-js');
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
c.from('integration_tokens').select('id').limit(1).then(r => console.log('integration_tokens:', r.error || 'OK'));
c.from('ms_project_sync_state').select('id').limit(1).then(r => console.log('ms_project_sync_state:', r.error || 'OK'));
"

# 3. Verify new columns
node -e "
const { createClient } = require('@supabase/supabase-js');
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
c.from('schedule_tasks').select('ms_project_task_id,ms_project_sync_at').limit(1).then(r => console.log('schedule_tasks columns:', r.error || 'OK'));
"

# 4. Start dev server and verify routes
rm -rf .next
npm run dev &
sleep 10
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/integrations/microsoft/status
# Expected: 401 (not logged in) — NOT 404

# 5. Build check
npm run build
# Expected: Successful build, zero TypeScript errors
```

### Level 4: End-to-End Verification

```bash
# This requires actual Azure AD credentials configured in .env
# Manual test flow:
# 1. Navigate to schedule page
# 2. Click "Connect Microsoft Project"
# 3. Complete Azure AD login
# 4. Verify redirect back with "Connected" status
# 5. Click "Browse Projects" — see MS Project list
# 6. Select a project and trigger sync
# 7. Verify tasks appear in Gantt chart
```

---

## Final Validation Checklist

### Technical Validation
- [ ] All 4 validation levels completed successfully
- [ ] Existing tests still pass: `npm run test:unit`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npx tsc --noEmit`
- [ ] Production build succeeds: `npm run build`
- [ ] New database tables accessible via Supabase client
- [ ] New columns on schedule_tasks are queryable

### Feature Validation
- [ ] OAuth2 flow completes without errors
- [ ] Token storage and refresh work
- [ ] MS Project project listing returns data
- [ ] Pull sync creates tasks in schedule_tasks with ms_project_task_id set
- [ ] Dependencies sync correctly with proper types
- [ ] Push sync sends updates via OperationSet API
- [ ] Sync status is visible in UI
- [ ] Disconnect removes tokens and clears connection state
- [ ] Error cases handled (user denies OAuth, token expired, Dataverse unavailable)

### Code Quality
- [ ] Follows Acumatica integration pattern (client class, sync service, types)
- [ ] File placement matches desired codebase tree
- [ ] Design system compliance (semantic colors, no hardcoded values)
- [ ] All props typed explicitly (no `any`)
- [ ] API routes use `await params` pattern
- [ ] Route parameter names are specific (no generic `[id]`)
- [ ] Env vars documented in .env.example

---

## Anti-Patterns to Avoid

- Do NOT use Microsoft Graph API for scheduling data — it has NO access to Project for the Web task data
- Do NOT try to directly PATCH/POST to msdyn_projecttask — must use OperationSet
- Do NOT hardcode the Dataverse org URL — it varies per tenant
- Do NOT store OAuth tokens unencrypted in production (encrypt at app level)
- Do NOT skip validation because "it should work" — always run actual sync and verify data
- Do NOT create new patterns — follow the established Acumatica integration pattern exactly
- Do NOT use bg-gray-200 or any hardcoded colors — use semantic tokens
- Do NOT use generic `[id]` in route parameters

---

## Phased Delivery

### Phase 1 (MVP): One-Way Pull
Tasks 1-9, 10 (pullTasks only), 11-17, 18-19
**Outcome:** User connects MS Project, selects a project, pulls tasks into Alleato

### Phase 2: Push Updates Back
Task 10 (pushTasks), update Task 11 for bidirectional
**Outcome:** Task edits in Alleato sync back to MS Project

### Phase 3: Real-Time Sync (Future)
- Dataverse webhook subscriptions for change notifications
- Automatic sync on task modification in either system
- Conflict resolution UI for merge conflicts

---

**Confidence Score: 8/10**

Rationale: Comprehensive patterns from existing Acumatica integration, well-documented Dataverse API, clear field mappings. Main risk is the OperationSet complexity for write operations and the multi-tenant Dataverse org URL discovery. The OAuth flow is well-understood but requires Azure AD app registration (manual setup step).
