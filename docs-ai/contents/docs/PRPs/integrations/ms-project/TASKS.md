# Microsoft Project Integration — Implementation Tasks

## Progress Summary

| Phase | Tasks | Completed | Status |
|-------|-------|-----------|--------|
| Phase 1: Foundation (Data Layer + Auth) | 4 | 0 | Not Started |
| Phase 2: OAuth2 Flow (API Layer) | 5 | 0 | Not Started |
| Phase 3: Sync Service (Business Logic) | 3 | 0 | Not Started |
| Phase 4: UI Layer | 5 | 0 | Not Started |
| Phase 5: Environment & Config | 2 | 0 | Not Started |
| **Total** | **19** | **0** | **Not Started** |

---

## Phase 1: Foundation (Data Layer + Auth)

- [ ] **Task 1:** Create database migration `supabase/migrations/YYYYMMDDHHMMSS_ms_project_integration.sql`
  - [ ] Create `integration_tokens` table (user_id UUID, provider TEXT, access_token, refresh_token, org_url, tenant_id)
  - [ ] Create `ms_project_sync_state` table (project_id INTEGER, ms_project_id TEXT, status, timestamps)
  - [ ] Add `ms_project_task_id TEXT` and `ms_project_sync_at TIMESTAMPTZ` to `schedule_tasks`
  - [ ] Add `ms_project_dependency_id TEXT` to `schedule_dependencies`
  - [ ] Add RLS policies on both new tables
  - [ ] Run `npm run db:types` and verify types regenerated
  - [ ] Verify: `node -e` query to confirm tables exist

- [ ] **Task 2:** Create `frontend/src/lib/ms-project/types.ts`
  - [ ] DataverseProject, DataverseTask, DataverseDependency interfaces
  - [ ] MsProjectConnection, MsProjectSyncConfig, SyncResult types
  - [ ] OperationSet types
  - [ ] LINK_TYPE_MAP and REVERSE_LINK_TYPE_MAP constants

- [ ] **Task 3:** Create `frontend/src/lib/ms-project/field-mapping.ts`
  - [ ] `dataverseTaskToAlleato()` — converts Dataverse task to ScheduleTask
  - [ ] `alleatoTaskToDataverse()` — converts ScheduleTask to Dataverse entity
  - [ ] `dataverseDependencyToAlleato()` — converts dependency with link type mapping
  - [ ] `deriveStatus()` — infers not_started/in_progress/complete from effort values
  - [ ] Hours-to-days conversion (8hr workday)

- [ ] **Task 4:** Create `frontend/src/lib/ms-project/client.ts`
  - [ ] DataverseClient class with constructor(orgUrl, accessToken, onTokenRefresh)
  - [ ] `listProjects()` — GET msdyn_projects with pagination
  - [ ] `getProjectTasks(projectId)` — GET msdyn_projecttasks with $filter
  - [ ] `getProjectDependencies(projectId)` — GET msdyn_projecttaskdependencies
  - [ ] `createOperationSet()` — POST msdyn_CreateOperationSetV1
  - [ ] `addPssCreate()` / `addPssUpdate()` — queue write operations
  - [ ] `executeOperationSet()` — POST msdyn_ExecuteOperationSetV1
  - [ ] Pagination via @odata.nextLink
  - [ ] 401 retry with token refresh callback
  - [ ] Proper OData headers on all requests

---

## Phase 2: OAuth2 Flow (API Layer)

- [ ] **Task 5:** Create `frontend/src/app/api/integrations/microsoft/auth/route.ts`
  - [ ] GET handler: authenticate user via Supabase
  - [ ] Generate CSRF state parameter, store in cookie
  - [ ] Build Azure AD authorization URL with MSAL
  - [ ] Redirect user to Azure AD login
  - [ ] Scopes: globaldisco.crm.dynamics.com/.default + offline_access

- [ ] **Task 6:** Create `frontend/src/app/api/integrations/microsoft/callback/route.ts`
  - [ ] GET handler: validate state cookie (CSRF)
  - [ ] Exchange authorization code for tokens via MSAL
  - [ ] Call Global Discovery Service to get org URL
  - [ ] Upsert tokens into integration_tokens table
  - [ ] Redirect user back to app with success indicator
  - [ ] Handle error cases (user denied, code expired)

- [ ] **Task 7:** Create `frontend/src/app/api/integrations/microsoft/disconnect/route.ts`
  - [ ] DELETE handler: remove integration_tokens row
  - [ ] Clean up related ms_project_sync_state rows
  - [ ] Return success response

- [ ] **Task 8:** Create `frontend/src/app/api/integrations/microsoft/status/route.ts`
  - [ ] GET handler: check if connected (token exists + not expired)
  - [ ] Return { isConnected, orgUrl, tokenExpiresAt }
  - [ ] Auto-refresh if token expired but refresh_token available

- [ ] **Task 9:** Create `frontend/src/app/api/integrations/microsoft/projects/route.ts`
  - [ ] GET handler: load tokens, instantiate DataverseClient
  - [ ] Call listProjects() and return results
  - [ ] Handle token refresh failure (return 401)

---

## Phase 3: Sync Service (Business Logic)

- [ ] **Task 10:** Create `frontend/src/lib/ms-project/sync.ts`
  - [ ] `pullTasks()` — fetch Dataverse tasks → match by ms_project_task_id → upsert schedule_tasks
  - [ ] `pullDependencies()` — fetch Dataverse deps → match → upsert schedule_dependencies
  - [ ] `pushTasks()` — find modified tasks → OperationSet → update Dataverse
  - [ ] Batch OperationSet operations in groups of 200
  - [ ] Update ms_project_sync_state after each sync
  - [ ] Parent task resolution (ms_project_task_id → Alleato UUID)
  - [ ] Conflict resolution: last-write-wins based on updated_at

- [ ] **Task 11:** Create `frontend/src/app/api/projects/[projectId]/scheduling/sync/ms-project/route.ts`
  - [ ] POST handler: body { msProjectId, direction }
  - [ ] Auth check + load tokens
  - [ ] Instantiate DataverseClient with org_url + access_token
  - [ ] Call pullTasks() and/or pushTasks() based on direction
  - [ ] Return SyncResult

- [ ] **Task 12:** Create `frontend/src/app/api/projects/[projectId]/scheduling/sync/ms-project/status/route.ts`
  - [ ] GET handler: query ms_project_sync_state for project
  - [ ] Return sync status, last sync times, errors

---

## Phase 4: UI Layer

- [ ] **Task 13:** Create `frontend/src/hooks/use-ms-project.ts`
  - [ ] `useMsProjectConnection()` — fetch /status, manage connection state
  - [ ] `useMsProjectProjects()` — fetch /projects
  - [ ] `useMsProjectSync(projectId)` — fetch sync status, trigger sync
  - [ ] Uses plain useState + useEffect + useCallback (NOT React Query — matches use-schedule-tasks.ts pattern)
  - [ ] Add 'use client' directive, useRef cancellation flag

- [ ] **Task 14:** Create `frontend/src/components/scheduling/ms-project-connection.tsx`
  - [ ] 'use client' component
  - [ ] Connected state: org URL display + Disconnect button
  - [ ] Disconnected state: Connect button (redirects to /auth)
  - [ ] Loading state while checking connection
  - [ ] Design system compliant (Button, Badge from ui/)

- [ ] **Task 15:** Create `frontend/src/components/scheduling/ms-project-picker.tsx`
  - [ ] Dialog modal listing MS Project projects
  - [ ] Loading/empty/error states
  - [ ] Select + confirm to link with Alleato project
  - [ ] Follow import-export-modal.tsx pattern

- [ ] **Task 16:** Create `frontend/src/components/scheduling/sync-status.tsx`
  - [ ] Compact indicator for schedule page toolbar
  - [ ] Shows: last sync time, status, sync button
  - [ ] Auto-polls during active sync (5s interval)
  - [ ] StatusBadge from @/components/ds

- [ ] **Task 17:** Update `frontend/src/app/(main)/[projectId]/schedule/page.tsx`
  - [ ] Add MsProjectConnectionPanel to settings area
  - [ ] Add SyncStatusIndicator to toolbar
  - [ ] Minimal changes — add components only, don't restructure

---

## Phase 5: Environment & Configuration

- [ ] **Task 18:** Update `.env.local` and `.env.example`
  - [ ] Add AZURE_CLIENT_ID placeholder
  - [ ] Add AZURE_CLIENT_SECRET placeholder
  - [ ] Add AZURE_TENANT_ID placeholder (default: 'common')

- [ ] **Task 19:** Install npm packages
  - [ ] `npm install @azure/msal-node --legacy-peer-deps`
  - [ ] Verify: package.json updated, lock file regenerated
  - [ ] Verify: `npm run build` still succeeds

---

## Final Validation

- [ ] `npm run lint` — zero errors
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `npm run build` — production build succeeds
- [ ] `npm run test:unit` — all existing tests pass
- [ ] Database tables verified via node -e query
- [ ] Dev server starts without route conflicts
- [ ] OAuth flow tested end-to-end (requires Azure AD app)
- [ ] Pull sync verified with real MS Project data
- [ ] Push sync verified with OperationSet

---

## Session Log

| Session | Date | Tasks Completed | Notes |
|---------|------|-----------------|-------|
| — | — | — | Not started |
