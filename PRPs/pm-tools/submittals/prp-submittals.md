# Submittals Module — Product Requirements Prompt (PRP)

**Version**: 1.0
**Created**: 2026-01-28
**Confidence Score**: 8/10

---

## Goal

**Feature Goal**: Build a fully functional submittals module with CRUD operations, detail view, workflow responses, distribution management, and form dialogs — matching the Procore submittals tool UI and behavior.

**Deliverable**: Enhanced submittals feature with:
- Database schema (8 tables with RLS)
- Service class with full CRUD + filtering
- React hooks for data fetching
- Create/Edit form dialogs
- Detail view page with tabs (General, Related Items, Emails, Change History)
- List view enhancements (real column mapping to Procore's 12 columns)
- Workflow response tracking
- Distribution management

**Success Definition**: A user can create, view, edit, filter, and delete submittals. Submittals show correct Procore-matching columns (Spec, #, Rev, Title, Type, Status, Responsible Contractor, Received From, Ball In Court, Approvers, Response, Sent Date). Detail view displays distribution summary, description, and workflow responses. All tabs function (Items, Packages, Spec Sections, Ball In Court, Recycle Bin).

---

## Why

**Business Value**: Submittals are a core construction workflow for tracking shop drawings, product data, samples, and other contractor deliverables that require approval before work proceeds. Missing or late submittals delay construction projects.

**Integration**: Connects with existing Directory (contacts/companies), Drawings (linked drawings), and project structure. Shares patterns with change-orders, RFIs, and other Procore tools already in the codebase.

**Problems Solved**: Currently the submittals list view exists but uses placeholder data from an `active_submittals` view. There is no create/edit form, no detail view, no workflow tracking, and columns don't match Procore's actual UI. This PRP completes the module.

---

## What

### Pages

| Page | Route | Type | Description |
|------|-------|------|-------------|
| Submittals List | `/(main)/[projectId]/submittals/page.tsx` | Server Component (exists) | List view with tabs, status cards, table |
| Submittal Detail | `/(main)/[projectId]/submittals/[submittalId]/page.tsx` | Server Component (NEW) | Detail view with General/Related/Emails/History tabs |
| Submittal Edit | N/A (dialog) | Client Component (NEW) | Edit form dialog opened from detail view |

### Database Schema

8 tables derived from Procore crawl analysis:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `submittals` | Main entity | number, revision, title, specification_section, submittal_type, status, ball_in_court, responsible_contractor_id, received_from_id, submittal_manager_id, description, is_private, deleted_at |
| `submittal_packages` | Groups of submittals | name, description |
| `submittal_workflow_steps` | Approval chain steps | submittal_id, step_order, step_type |
| `submittal_responses` | Per-approver responses | submittal_id, responder_id, response_status (Pending/Approved/Approved as Noted), comments |
| `submittal_distributions` | Distribution events | submittal_id, from_id, message |
| `submittal_distribution_recipients` | M2M recipients | distribution_id, recipient_id |
| `submittal_attachments` | Files on submittals/responses | file_name, file_url, is_current, polymorphic parent |
| `submittal_linked_drawings` | M2M to drawings | submittal_id, drawing_id |

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects/[projectId]/submittals` | List submittals with filters |
| POST | `/api/projects/[projectId]/submittals` | Create submittal |
| GET | `/api/projects/[projectId]/submittals/[submittalId]` | Get submittal detail with relations |
| PUT | `/api/projects/[projectId]/submittals/[submittalId]` | Update submittal |
| DELETE | `/api/projects/[projectId]/submittals/[submittalId]` | Soft-delete submittal |

### Components

| Component | Type | Description |
|-----------|------|-------------|
| `SubmittalsClient` | Client (exists, enhance) | List view with GenericDataTable |
| `SubmittalDetailClient` | Client (NEW) | Detail view with tabs, distribution summary, workflow responses |
| `SubmittalFormDialog` | Client (NEW) | Create/Edit form with all fields from FORMS.md |
| `SubmittalWorkflowResponses` | Client (NEW) | Workflow response cards showing approver status |
| `SubmittalDistributionSummary` | Client (NEW) | From/To/Message/Attachments distribution display |

### Table Columns (Procore Match)

Current list view has 9 columns. Procore has 12. Update to match:

| Column | Field | Type | Currently Exists |
|--------|-------|------|-----------------|
| Spec | specification_section | text | No |
| # | number | text | Yes (as submittal_number) |
| Rev. | revision | integer | No |
| Title | title | text | Yes |
| Type | submittal_type | text | Yes (as submittal_type_name) |
| Status | status | badge | Yes (as statusDisplay) |
| Responsible C. | responsible_contractor | text (FK) | No |
| Received From | received_from | text (FK) | No |
| Ball In Court | ball_in_court | text | No |
| Approvers | approvers | text[] | No |
| Response | response | text | No |
| Sent Date | sent_date | date | No |

### Form Fields (from FORMS.md)

**General Information**: title*, specification_section, number*, revision*, submittal_type, submittal_package_id, responsible_contractor_id, received_from_id, submittal_manager_id*, status, cost_code_id, location_id

**Distribution & Scheduling**: distribution_list[], ball_in_court, lead_time, required_on_site_date

**Content**: is_private, description*, attachments[]

**Workflow**: workflow_template, workflow_steps[]

### Status State Machine

```
Draft → Open → Distributed → Closed
```

Response statuses per approver: Submitted, Pending, Approved, Approved as Noted

---

## Success Criteria

- [ ] All 8 database tables created with RLS policies
- [ ] Submittals list shows all 12 Procore columns
- [ ] Create/Edit form dialog works with all fields from FORMS.md
- [ ] Detail view shows distribution summary, description, workflow responses
- [ ] 5 tabs function: Items (list), Packages (grouped), Spec Sections (grouped), Ball In Court (filtered), Recycle Bin (soft-deleted)
- [ ] Status cards show correct counts per status
- [ ] Filters match Procore: Approver, Ball In Court, Created By, Current Revision, Division, Location, Number, Private, Received From, Response, Responsible Contractor
- [ ] Soft delete moves submittals to Recycle Bin tab
- [ ] Type checking passes: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`

---

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_ **Yes** — this PRP includes database schema, form fields, column mappings, status states, codebase patterns, file paths, and specific interface definitions.

### Documentation & References

```yaml
# MUST READ - Codebase files
- file: frontend/src/app/(tables)/submittals/submittals-client.tsx
  why: Existing list view component to enhance — add Procore columns, improve tab behavior
  pattern: GenericDataTable config, TableLayout wrapper, status cards, tab navigation
  gotcha: Uses SubmittalTableRow local type — must align with new database columns

- file: frontend/src/app/(tables)/submittals/submittals-data.ts
  why: Existing data fetching — uses active_submittals view and createServiceClient()
  pattern: Server-side fetching with Supabase service client, default project ID from env
  gotcha: Currently reads from active_submittals VIEW — may need to create this view or switch to table

- file: frontend/src/app/(main)/[projectId]/submittals/page.tsx
  why: Server component entry point — passes projectId and fetched data to client
  pattern: Async server component, params Promise destructuring, numeric project ID resolution

- file: frontend/src/services/directoryService.ts
  why: Reference service class pattern — class-based, Supabase client injection, DTO types, pagination
  pattern: Constructor with typed client, separate create/update DTOs, paginated responses, activity logging
  gotcha: Uses project_directory_memberships for RLS/access check — submittals must follow same pattern (NOT project_members)

- file: frontend/src/hooks/use-contacts.ts
  why: Reference hook pattern — useState/useCallback wrapping Supabase queries
  pattern: Interface-first, options object, returns data + options + loading + error + refetch + create
  gotcha: Uses project_directory_memberships join for project filtering

- file: frontend/src/hooks/use-change-orders.ts
  why: Reference hook for CRUD pattern with projectId filtering
  pattern: Auto-fetch on mount, graceful column degradation, options array for dropdowns

- file: frontend/src/components/tables/generic-table-factory.tsx
  why: GenericDataTable config structure — columns, filters, search, rendering
  pattern: Config-driven, serializable render types (badge, currency, truncate), no functions in config
  gotcha: RenderConfig must use string enum types, NOT function renderers

- file: frontend/src/components/domain/contacts/ContactFormDialog.tsx
  why: Reference form dialog — React Hook Form + Zod, create/update, nested dialogs
  pattern: Parent-controlled open state, form reset on open, async submit, toast feedback

- file: frontend/src/hooks/use-companies.ts
  why: Hook for company dropdowns — used for responsible_contractor field
  pattern: Same structure as use-contacts but queries companies table
  gotcha: Returns company options with value/label — use for responsible_contractor dropdown

- file: frontend/src/lib/schemas/common.ts
  why: Zod schema helpers for number inputs (NaN handling)
  pattern: optionalNumber, requiredNumber, optionalPositiveNumber utilities

- file: .claude/scaffolds/crud-resource/hook.ts
  why: Scaffold template for new hooks — guaranteed correct FK types and patterns
  pattern: Replace __ENTITY__ placeholders, INTEGER project_id, soft delete, dropdown options

- file: .claude/scaffolds/crud-resource/service.ts
  why: Scaffold template for service class — class-based, paginated, error handling
  pattern: Typed Supabase client constructor, PGRST116 handling, separate DTOs

- file: .claude/scaffolds/crud-resource/migration.sql
  why: Scaffold template for migration — correct FK types, RLS, triggers, indexes
  pattern: UUID PK, INTEGER project_id FK, audit fields, updated_at trigger, 4 RLS policies

# MUST READ - Spec artifacts from Procore crawl
- file: scripts/playwright-crawl/procore-crawls/submittals/spec/COMMANDS.md
  why: All 24 domain commands — CRUD, workflow, distribution, export, navigation
  pattern: Command key → Label → Trigger → Source → Category

- file: scripts/playwright-crawl/procore-crawls/submittals/spec/FORMS.md
  why: Complete form field definitions — 14 General, 4 Distribution, 3 Content fields
  pattern: Field → Label → Type → Required → Widget → Notes

- file: scripts/playwright-crawl/procore-crawls/submittals/spec/MUTATIONS.md
  why: CRUD operations, state machine, workflow responses, distribution model
  pattern: Command → Input → Tables Affected → Side Effects

- file: scripts/playwright-crawl/procore-crawls/submittals/spec/schema.sql
  why: Database schema — 8 tables with all columns, indexes, RLS, triggers
  pattern: Review before creating migration — adjust FK types per Supabase Types Gate
```

### Current Codebase Tree (relevant files)

```
frontend/src/
├── app/
│   ├── (main)/[projectId]/submittals/
│   │   └── page.tsx                          # Server component (EXISTS)
│   ├── (tables)/submittals/
│   │   ├── submittals-client.tsx              # Client list view (EXISTS - ENHANCE)
│   │   ├── submittals-data.ts                 # Data fetching (EXISTS - ENHANCE)
│   │   └── settings/
│   │       ├── general/page.tsx               # Settings page (EXISTS)
│   │       ├── custom-fields/page.tsx         # Custom fields (EXISTS)
│   │       ├── workflow-templates/page.tsx     # Workflow templates (EXISTS)
│   │       └── preferences.ts                 # Settings prefs (EXISTS)
│   └── api/projects/[projectId]/
│       └── submittals/                        # API routes (NEW)
├── components/
│   ├── tables/generic-table-factory.tsx       # GenericDataTable (EXISTS)
│   ├── domain/submittals/                     # Domain components (NEW)
│   └── layouts/                               # TableLayout (EXISTS)
├── hooks/
│   ├── use-submittals.ts                      # Submittals hook (NEW)
│   └── use-contacts.ts                        # Contact hook (EXISTS - reference)
├── services/
│   ├── submittalService.ts                    # Service class (NEW)
│   └── directoryService.ts                    # Reference service (EXISTS)
├── lib/schemas/
│   ├── common.ts                              # Zod helpers (EXISTS)
│   └── submittal.ts                           # Submittal schema (NEW)
└── types/
    └── database.types.ts                      # Generated types (REGENERATE)
```

### Desired Codebase Tree (files to add)

```
frontend/src/
├── app/
│   ├── (main)/[projectId]/submittals/
│   │   ├── page.tsx                           # EXISTS — no change needed
│   │   └── [submittalId]/
│   │       └── page.tsx                       # NEW — Detail view server component
│   ├── (tables)/submittals/
│   │   ├── submittals-client.tsx              # ENHANCE — Update columns, improve tabs
│   │   ├── submittals-data.ts                 # ENHANCE — Add detail fetch, filter support
│   │   └── submittal-detail-client.tsx        # NEW — Detail view client component
│   └── api/projects/[projectId]/submittals/
│       ├── route.ts                           # NEW — GET list, POST create
│       └── [submittalId]/
│           └── route.ts                       # NEW — GET detail, PUT update, DELETE soft-delete
├── components/domain/submittals/
│   ├── SubmittalFormDialog.tsx                 # NEW — Create/Edit dialog
│   ├── SubmittalWorkflowResponses.tsx         # NEW — Workflow response cards
│   └── SubmittalDistributionSummary.tsx       # NEW — Distribution from/to display
├── hooks/
│   └── use-submittals.ts                      # NEW — CRUD hook with filtering
├── services/
│   └── submittalService.ts                    # NEW — Service class with pagination
└── lib/schemas/
    └── submittal.ts                           # NEW — Zod validation schema
```

### Known Gotchas

```typescript
// CRITICAL: projects.id is INTEGER, not UUID
// All project_id foreign keys MUST be integer NOT NULL REFERENCES projects(id)
// Violation causes silent query failures (UUID vs INTEGER mismatch)

// CRITICAL: Route parameters must use specific names
// Use [submittalId] NOT [id] — see .claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md

// CRITICAL: GenericTableConfig renderConfig uses string enum types
// Use { type: "badge", variantMap: {...} } NOT function renderers
// See generic-table-factory.tsx for valid RenderConfig union types

// CRITICAL: active_submittals VIEW must be created or replaced
// Current submittals-data.ts reads from this view
// Either create a Postgres VIEW or switch to direct table queries

// CRITICAL: Next.js 15 async params
// Server components receive params as Promise: params: Promise<{ projectId: string }>
// Must await: const { projectId } = await params;

// CRITICAL: Supabase Types Gate
// Run npm run db:types BEFORE writing any database code
// Read frontend/src/types/database.types.ts to verify columns exist

// GOTCHA: Form number inputs return NaN for empty fields
// Use optionalNumber from lib/schemas/common.ts in Zod schemas

// GOTCHA: 'use client' directive required for any component using:
// useState, useEffect, useCallback, event handlers, browser APIs
```

---

## Implementation Blueprint

### Data Models and Structure

```typescript
// === Zod Schema: lib/schemas/submittal.ts ===

import { z } from "zod";
import { optionalNumber, optionalPositiveNumber } from "./common";

export const createSubmittalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  number: z.string().min(1, "Number is required"),
  revision: z.number().int().min(0).default(0),
  specification_section: z.string().optional(),
  submittal_type: z.string().optional(),
  submittal_package_id: z.string().uuid().optional(),
  responsible_contractor_id: optionalNumber,
  received_from_id: z.string().uuid().optional(),
  submittal_manager_id: z.string().uuid({ message: "Submittal Manager is required" }),
  status: z.string().default("Draft"),
  cost_code_id: optionalNumber,
  location_id: optionalNumber,
  final_due_date: z.string().optional(), // ISO date string (may be read-only in some contexts)
  lead_time: optionalPositiveNumber,
  required_on_site_date: z.string().optional(), // ISO date string
  is_private: z.boolean().default(false),
  description: z.string().min(1, "Description is required"),
});

export const updateSubmittalSchema = createSubmittalSchema.partial();

export type CreateSubmittalInput = z.infer<typeof createSubmittalSchema>;
export type UpdateSubmittalInput = z.infer<typeof updateSubmittalSchema>;

// === Service types: services/submittalService.ts ===

export interface SubmittalWithRelations {
  id: string;
  project_id: number;
  number: string;
  revision: number;
  title: string;
  specification_section: string | null;
  submittal_type: string | null;
  status: string;
  ball_in_court: string | null;
  responsible_contractor_id: number | null;
  received_from_id: string | null;
  submittal_manager_id: string | null;
  description: string | null;
  is_private: boolean;
  lead_time: number | null;
  required_on_site_date: string | null;
  sent_date: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined relations
  responsible_contractor?: { id: number; name: string } | null;
  received_from?: { id: string; first_name: string; last_name: string } | null;
  submittal_manager?: { id: string; first_name: string; last_name: string } | null;
  submittal_package?: { id: string; name: string } | null;
  workflow_responses?: SubmittalResponseRow[];
  distributions?: SubmittalDistributionRow[];
  attachments?: SubmittalAttachmentRow[];
}

export interface SubmittalResponseRow {
  id: string;
  responder_id: string;
  response_status: string; // Pending, Approved, Approved as Noted
  comments: string | null;
  responded_at: string | null;
  responder?: { first_name: string; last_name: string; company?: string };
}

export interface SubmittalDistributionRow {
  id: string;
  from_id: string;
  message: string | null;
  distributed_at: string | null;
  from?: { first_name: string; last_name: string; company?: string };
  recipients?: { id: string; first_name: string; last_name: string; company?: string }[];
  attachments?: SubmittalAttachmentRow[];
}

export interface SubmittalAttachmentRow {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  is_current: boolean;
}

export interface SubmittalFilters {
  search?: string;
  status?: string;
  submittal_type?: string;
  responsible_contractor_id?: number;
  received_from_id?: string;
  ball_in_court?: string;
  specification_section?: string;
  is_private?: boolean;
  includeDeleted?: boolean; // For Recycle Bin tab
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
# === PHASE 1: DATA LAYER ===

Task 1: CREATE Supabase migration for submittals schema
  - IMPLEMENT: 8 tables from spec/schema.sql with RLS, indexes, triggers
  - FOLLOW pattern: .claude/scaffolds/crud-resource/migration.sql
  - CRITICAL: project_id must be INTEGER (not UUID) — projects.id is INTEGER
  - CRITICAL: RLS policies must use project_directory_memberships (NOT project_members). Follow the scaffold pattern:
      SELECT 1 FROM project_directory_memberships pdm
      JOIN people p ON p.id = pdm.person_id
      WHERE p.auth_user_id = auth.uid() AND pdm.project_id = <table>.project_id
  - CRITICAL: Run npm run db:types after migration, verify all tables exist in database.types.ts
  - TABLES: submittals, submittal_packages, submittal_workflow_steps, submittal_responses, submittal_distributions, submittal_distribution_recipients, submittal_attachments, submittal_linked_drawings
  - INCLUDE: active_submittals VIEW (or update existing view) with joined company/contact names

Task 2: CREATE frontend/src/lib/schemas/submittal.ts
  - IMPLEMENT: Zod schemas for create and update operations
  - FOLLOW pattern: frontend/src/lib/schemas/common.ts (optionalNumber helpers)
  - FIELDS: title*, number*, revision*, submittal_manager_id*, description* (required), plus all optional fields from FORMS.md
  - EXPORT: createSubmittalSchema, updateSubmittalSchema, CreateSubmittalInput, UpdateSubmittalInput

Task 3: CREATE frontend/src/services/submittalService.ts
  - IMPLEMENT: Class-based service with Supabase client injection
  - FOLLOW pattern: frontend/src/services/directoryService.ts (class structure, DTOs, pagination)
  - METHODS: list(projectId, filters), getById(projectId, submittalId), create(projectId, data), update(projectId, submittalId, data), softDelete(projectId, submittalId)
  - INCLUDE: getById must join workflow_responses, distributions, attachments
  - INCLUDE: list must support all SubmittalFilters fields
  - INCLUDE: Pagination support (page, pageSize, total count)

Task 4: CREATE frontend/src/hooks/use-submittals.ts
  - IMPLEMENT: React hook wrapping submittalService
  - FOLLOW pattern: frontend/src/hooks/use-contacts.ts (interface-first, useState/useCallback)
  - RETURNS: submittals[], isLoading, error, refetch, createSubmittal, updateSubmittal, deleteSubmittal
  - OPTIONS: projectId, filters (SubmittalFilters), limit, enabled

# === PHASE 2: API LAYER ===

Task 5: CREATE frontend/src/app/api/projects/[projectId]/submittals/route.ts
  - IMPLEMENT: GET (list with filters) and POST (create)
  - FOLLOW pattern: Existing API routes in api/projects/[projectId]/
  - GET: Parse query params for filters, call submittalService.list()
  - POST: Validate body with createSubmittalSchema, call submittalService.create()
  - NAMING: Use [projectId] NOT [id]

Task 6: CREATE frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts
  - IMPLEMENT: GET (detail), PUT (update), DELETE (soft-delete)
  - GET: Call submittalService.getById() with joined relations
  - PUT: Validate body with updateSubmittalSchema, call submittalService.update()
  - DELETE: Call submittalService.softDelete()
  - NAMING: Use [submittalId] NOT [id]

# === PHASE 3: UI LAYER ===

Task 7: ENHANCE frontend/src/app/(tables)/submittals/submittals-data.ts
  - ENHANCE: Add fetchSubmittalDetail() for detail page
  - ADD: Join queries for responsible_contractor, received_from, submittal_manager names
  - ADD: Support for fetching deleted submittals (Recycle Bin)
  - KEEP: Existing fetchSubmittals() and resolveSubmittalsProjectId()
  - CLEANUP: Remove `(supabase as any)` cast and `Record<string, unknown>` type — replace with proper typed queries against submittals table (or updated active_submittals VIEW) after migration creates the tables
  - IMPORTANT: Update SubmittalRow type to use Database["public"]["Tables"]["submittals"]["Row"] from generated types

Task 8: ENHANCE frontend/src/app/(tables)/submittals/submittals-client.tsx
  - ENHANCE: Update table columns to match Procore's 12 columns
  - ADD: Spec, Rev, Responsible C., Received From, Ball In Court, Approvers, Response, Sent Date columns
  - ADD: Real filter options matching Procore (11 filters from COMMANDS.md)
  - ADD: onClick handler for Create Submittal menu item → open SubmittalFormDialog
  - ADD: Row click → navigate to detail view /[projectId]/submittals/[submittalId]
  - UPDATE: Status values to match Procore (Draft, Open, Distributed, Closed)
  - KEEP: Existing tab structure, status cards, export dropdown

Task 9: CREATE frontend/src/components/domain/submittals/SubmittalFormDialog.tsx
  - IMPLEMENT: Create/Edit dialog with React Hook Form + Zod
  - FOLLOW pattern: frontend/src/components/domain/contacts/ContactFormDialog.tsx
  - SECTIONS: General Information (14 fields), Distribution & Scheduling (4 fields), Content (3 fields)
  - INCLUDE: Searchable dropdowns for contacts (submittal_manager, received_from) and companies (responsible_contractor)
  - INCLUDE: Rich text editor for description field (or textarea as MVP)
  - INCLUDE: File upload for attachments
  - ACTIONS: Create/Update button, Update & Send Emails button, Cancel, Delete (edit mode)

Task 10: CREATE frontend/src/app/(tables)/submittals/submittal-detail-client.tsx
  - IMPLEMENT: Detail view with 4 tabs (General, Related Items, Emails, Change History)
  - GENERAL TAB: Distribution summary (From/To/Message/Attachments), Description, Workflow Responses
  - INCLUDE: Edit button → opens SubmittalFormDialog in edit mode
  - INCLUDE: Actions dropdown (Create Revision, Duplicate, Email, Delete)
  - INCLUDE: Redistribute button
  - FOLLOW pattern: Detail view in other tools (use Card components, Tabs)

Task 11: CREATE frontend/src/app/(main)/[projectId]/submittals/[submittalId]/page.tsx
  - IMPLEMENT: Server component for detail page
  - FOLLOW pattern: frontend/src/app/(main)/[projectId]/submittals/page.tsx
  - FETCH: submittal detail with relations via fetchSubmittalDetail()
  - PASS: Data to SubmittalDetailClient component
  - NAMING: Use [submittalId] parameter name

Task 12: CREATE frontend/src/components/domain/submittals/SubmittalWorkflowResponses.tsx
  - IMPLEMENT: Workflow response cards showing approver name, company, status, comments, attachments
  - DISPLAY: Person name + company, response status badge, comments text, attachment links with CURRENT badge
  - STATUSES: Submitted, Pending, Approved, Approved as Noted (each with distinct badge variant)

Task 13: CREATE frontend/src/components/domain/submittals/SubmittalDistributionSummary.tsx
  - IMPLEMENT: Distribution display with From, To, Message, Attachments sections
  - FROM: Submittal Manager name + company
  - TO: List of recipients with name + company
  - MESSAGE: Distribution message text
  - ATTACHMENTS: File list with download links

# === PHASE 4: INTEGRATION ===

Task 14: INTEGRATE list view with real data
  - WIRE: SubmittalsClient to use new hook/service for real-time data
  - ADD: Create Submittal menu item opens SubmittalFormDialog
  - ADD: Row click navigates to detail page
  - ADD: Recycle Bin tab shows soft-deleted submittals
  - ADD: Packages tab groups submittals by package
  - ADD: Spec Sections tab groups by specification_section
  - TEST: All tabs render correct data

Task 15: INTEGRATE form dialog with API
  - WIRE: SubmittalFormDialog submit to API routes
  - ADD: Toast notifications for success/error
  - ADD: Refetch list after create/update/delete
  - ADD: Contact/company dropdowns fetch from existing hooks
  - TEST: Create, edit, delete operations work end-to-end

# === PHASE 5: TESTING & VALIDATION ===

Task 16: Validate types and build
  - RUN: npm run db:types (regenerate after migration)
  - RUN: npx tsc --noEmit (zero type errors)
  - RUN: npm run lint (zero lint errors)
  - RUN: npm run build (production build succeeds)
  - VERIFY: No route conflicts (npm run check:routes)
  - VERIFY: Dev server starts (npm run dev)

Task 17: Manual verification
  - TEST: Navigate to /[projectId]/submittals — list view renders
  - TEST: Click "Add Submittal" → form dialog opens with all fields
  - TEST: Fill form and submit → submittal appears in list
  - TEST: Click submittal row → detail view renders with correct data
  - TEST: Edit button → form opens pre-filled
  - TEST: Delete → submittal moves to Recycle Bin tab
  - TEST: All 5 tabs render appropriate content
  - TEST: Filters narrow results correctly
  - TEST: Status cards show correct counts
```

### Implementation Patterns & Key Details

```typescript
// === Service Class Pattern ===
// Follow directoryService.ts structure

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Match directoryService.ts pattern: ReturnType<typeof createClient<Database>>
type TypedClient = ReturnType<typeof createClient<Database>>;

export class SubmittalService {
  constructor(private supabase: TypedClient) {}

  async list(projectId: number, filters: SubmittalFilters = {}) {
    let query = this.supabase
      .from("submittals")
      .select("*, submittal_packages(name)", { count: "exact" })
      .eq("project_id", projectId);

    // Soft delete filter
    if (filters.includeDeleted) {
      query = query.not("deleted_at", "is", null);
    } else {
      query = query.is("deleted_at", null);
    }

    // Apply filters
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,number.ilike.%${filters.search}%`);
    }

    return query.order("created_at", { ascending: false });
  }

  async getById(projectId: number, submittalId: string) {
    return this.supabase
      .from("submittals")
      .select(`
        *,
        submittal_packages(id, name),
        submittal_responses(*, responder:people(*)),
        submittal_distributions(*, recipients:submittal_distribution_recipients(*, recipient:people(*)))
      `)
      .eq("id", submittalId)
      .eq("project_id", projectId)
      .single();
  }
}

// === Hook Pattern ===
// Follow use-contacts.ts structure

export function useSubmittals(options: UseSubmittalsOptions = {}): UseSubmittalsReturn {
  const { projectId, filters, limit = 100, enabled = true } = options;
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubmittals = useCallback(async () => {
    if (!enabled || !projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const service = new SubmittalService(supabase);
      const { data, error: queryError } = await service.list(
        typeof projectId === "string" ? parseInt(projectId, 10) : projectId,
        filters
      );
      if (queryError) throw new Error(queryError.message);
      setSubmittals(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch submittals"));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, filters, limit, enabled]);

  useEffect(() => { fetchSubmittals(); }, [fetchSubmittals]);

  // ... createSubmittal, updateSubmittal, deleteSubmittal methods
  return { submittals, isLoading, error, refetch: fetchSubmittals, ... };
}

// === GenericTableConfig for Procore Columns ===
// Update submittals-client.tsx table config

const tableConfig: GenericTableConfig = {
  columns: [
    { id: "specification_section", label: "Spec", defaultVisible: true, type: "text" },
    { id: "number", label: "#", defaultVisible: true, type: "text", isPrimary: true },
    { id: "revision", label: "Rev.", defaultVisible: true, type: "text" },
    { id: "title", label: "Title", defaultVisible: true, type: "text" },
    { id: "submittal_type", label: "Type", defaultVisible: true, type: "text" },
    {
      id: "status", label: "Status", defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: { Draft: "secondary", Open: "default", Distributed: "outline", Closed: "success" },
        defaultVariant: "outline",
      },
    },
    { id: "responsible_contractor_name", label: "Responsible C.", defaultVisible: true, type: "text" },
    { id: "received_from_name", label: "Received From", defaultVisible: true, type: "text" },
    { id: "ball_in_court", label: "Ball In Court", defaultVisible: true, type: "text" },
    { id: "approvers", label: "Approvers", defaultVisible: true, type: "text" },
    {
      id: "response", label: "Response", defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: { Pending: "secondary", Approved: "success", "Approved as Noted": "default" },
        defaultVariant: "outline",
      },
    },
    { id: "sent_date", label: "Sent Date", defaultVisible: true, type: "date" },
  ],
  searchFields: ["title", "number", "specification_section", "responsible_contractor_name"],
  filters: [
    { id: "status-filter", label: "Status", field: "status", options: [
      { value: "Draft", label: "Draft" },
      { value: "Open", label: "Open" },
      { value: "Distributed", label: "Distributed" },
      { value: "Closed", label: "Closed" },
    ]},
    // Add remaining 10 filters from COMMANDS.md
  ],
  exportFilename: "submittals-export.csv",
  enableViewSwitcher: true,
  enableSorting: true,
  defaultSortColumn: "number",
  defaultSortDirection: "asc",
};

// === Form Dialog Pattern ===
// Follow ContactFormDialog.tsx

interface SubmittalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submittal?: SubmittalWithRelations | null; // null = create mode
  projectId: number;
  onSuccess?: () => void;
}

// useForm with zodResolver(createSubmittalSchema)
// Reset form when dialog opens
// Separate Create vs Update submit handlers
// Toast notifications on success/error
```

### Integration Points

```yaml
DATABASE:
  - migration: "Create 8 submittals tables with RLS, indexes, triggers"
  - view: "Create or update active_submittals VIEW with joined names"
  - client: "@/lib/supabase/client" (browser), "@/lib/supabase/service" (server)
  - types: "Regenerate via npm run db:types after migration"

ROUTES:
  - list page: "/(main)/[projectId]/submittals/page.tsx" (EXISTS)
  - detail page: "/(main)/[projectId]/submittals/[submittalId]/page.tsx" (NEW)
  - API list: "/api/projects/[projectId]/submittals/route.ts" (NEW)
  - API detail: "/api/projects/[projectId]/submittals/[submittalId]/route.ts" (NEW)

EXISTING HOOKS:
  - useContacts: "For submittal_manager, received_from dropdowns"
  - useCompanies: "For responsible_contractor dropdown (if exists, else create)"

COMPONENTS:
  - GenericDataTable: "Config-driven table for list view"
  - TableLayout: "Standard layout wrapper"
  - shadcn/ui: "Badge, Button, Card, Dialog, DropdownMenu, Tabs, Form, Input, Select, etc."
```

---

## Validation Loop

### Level 1: Syntax & Style

```bash
# After migration
npm run db:types

# After each file
npx tsc --noEmit
npm run lint

# Expected: Zero errors
```

### Level 2: Unit Verification

```bash
# Verify types generated correctly
grep -A 5 "submittals" frontend/src/types/database.types.ts

# Verify route structure
find frontend/src/app -path "*submittals*" -name "*.tsx" -o -name "*.ts" | sort

# Verify no route conflicts
npm run check:routes
```

### Level 3: Integration Testing

```bash
# Start dev server
npm run dev

# Verify list page loads
curl -s http://localhost:3000/25108/submittals | grep -q "Submittals"

# Verify API responds
curl -s http://localhost:3000/api/projects/25108/submittals | head -c 200

# Production build
npm run build
```

### Level 4: Manual Validation

```bash
# Open browser to http://localhost:3000/25108/submittals
# 1. Verify 12 columns render in table
# 2. Click "Add Submittal" — form dialog opens
# 3. Fill required fields, submit — row appears in table
# 4. Click row — detail view loads
# 5. Click Edit — form opens pre-filled
# 6. Delete — submittal moves to Recycle Bin tab
# 7. Check each tab: Items, Packages, Spec Sections, Ball In Court, Recycle Bin
```

---

## Final Validation Checklist

### Technical
- [ ] All 4 validation levels pass
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — success
- [ ] `npm run check:routes` — no conflicts
- [ ] `npm run db:types` — all 8 tables in database.types.ts

### Feature
- [ ] 12 Procore-matching columns in list view
- [ ] Create/Edit form dialog with all FORMS.md fields
- [ ] Detail view with distribution summary + workflow responses
- [ ] 5 tabs functional (Items, Packages, Spec Sections, Ball In Court, Recycle Bin)
- [ ] 11 filters from Procore filter panel
- [ ] Status cards with correct counts
- [ ] Soft delete → Recycle Bin
- [ ] Row click → detail view navigation

### Code Quality
- [ ] Service class follows directoryService.ts pattern
- [ ] Hook follows use-contacts.ts pattern
- [ ] Form dialog follows ContactFormDialog.tsx pattern
- [ ] GenericTableConfig uses serializable render types only
- [ ] All FK types match PK types (INTEGER for project_id)
- [ ] RLS policies on all 8 tables
- [ ] [submittalId] parameter name (not [id])

---

## Anti-Patterns to Avoid

- Do NOT use `[id]` for route parameters — use `[submittalId]`
- Do NOT use UUID for `project_id` — it's INTEGER in `projects.id`
- Do NOT put function renderers in GenericTableConfig — use serializable render types
- Do NOT write from scratch when scaffolds exist — check `.claude/scaffolds/`
- Do NOT skip `npm run db:types` before writing database code
- Do NOT assume column names — read `database.types.ts` first
- Do NOT use `createClient()` in server components — use `createServiceClient()`
- Do NOT create inline styles — use Tailwind CSS classes
- Do NOT skip RLS policies — every table needs them

---

## Procore Crawl Data Reference

### Sitemap

| Page | Description | Screenshot |
|------|-------------|------------|
| Submittals List | Main list with tabs and table | `screenshots/submittals-list.png` |
| Submittal Detail | Detail view with General tab | `screenshots/submittals-detail.png` |
| Edit Form | Full edit form with all fields | `screenshots/submittals-detail-open_edit_submittal_form.png` |
| Filter Panel | Filter dropdown with 11 options | `screenshots/submittals-list-open_filter_panel.png` |
| Create Menu | Create dropdown (Submittal, Package) | `screenshots/submittals-list-open_create_submittal_dialog.png` |
| Export Menu | Export dropdown (PDF, CSV, Excel) | `screenshots/submittals-list-open_export_menu.png` |
| Actions Menu | Detail actions overflow menu | `screenshots/submittals-detail-open_actions_overflow_menu_on_detail.png` |
| Reports Menu | Reports dropdown | `screenshots/submittals-list-open_reports_menu.png` |
| Tab: Ball In Court | Ball In Court tab view | `screenshots/submittals-tab-ball-in-court.png` |
| Tab: Packages | Packages tab view | `screenshots/submittals-tab-packages.png` |
| Tab: Spec Sections | Spec Sections tab view | `screenshots/submittals-tab-spec-sections.png` |
| Tab: Recycle Bin | Recycle Bin tab view | `screenshots/submittals-tab-recycle-bin.png` |

### Crawl Data Files

| Category | File | Path | Description |
|----------|------|------|-------------|
| Summary | Crawl Summary | `crawl-summary.json` | Structured JSON with all crawl data |
| Summary | README | `README.md` | Module overview with stats |
| Reports | Sitemap | `reports/sitemap-table.md` | Page URLs |
| Reports | Detailed Report | `reports/detailed-report.json` | Full analysis |
| Spec | Commands | `spec/COMMANDS.md` | 24 domain commands |
| Spec | Mutations | `spec/MUTATIONS.md` | CRUD + state machine |
| Spec | Schema | `spec/schema.sql` | 8 database tables |
| Spec | Forms | `spec/FORMS.md` | UI form fields |

**Base Path**: `scripts/playwright-crawl/procore-crawls/submittals/`

### Key UI Elements from Screenshots

**List View:**
- Toolbar: "Create" dropdown (Submittal, Submittal Package), Export dropdown (PDF, CSV, Excel)
- Tabs: Items | Packages | Spec Sections | Ball In Court | Recycle Bin
- Table: 12 columns (Spec, #, Rev, Title, Type, Status, Responsible C., Received From, Ball In Court, Approvers, Response, Sent Date)
- Filters: "Add Filter" button opening panel with 11 filter options

**Detail View:**
- Header: Title, Number & Revision, Status badge
- Toolbar: Edit button, Redistribute button, Actions dropdown
- General tab: Distribution summary (From/To/Message/Attachments), Description (rich text), Workflow Responses section
- Detail tabs: General | Related Items (0) | Emails (0) | Change History (23)

**Edit Form:**
- General Information: Title*, Specification, Number* & Revision*, Submittal Type, Submittal Package, Responsible Contractor, Received From, Submittal Manager*, Status, Final Due Date, Cost Code, Location, Linked Drawings
- Distribution & Scheduling: Distribution List (tag chips), Ball In Court, Lead Time (days), Required On-Site Date
- Content: Private checkbox, Description* (rich text editor), Attachments (drag-drop)
- Workflow: Template selector, Add Step button
- Actions: Cancel, Update (orange), Update & Send Emails, Delete (trash icon)

### UI Components Detected

| Label | Command Key |
|-------|-------------|
| Create Submittal | `create_submittal` |
| Create Submittal Package | `create_submittal_package` |
| Edit | `edit_submittal` |
| Update | `update_submittal` |
| Update & Send Emails | `update_and_send_emails` |
| Delete | `delete_submittal` |
| Create Revision | `create_revision` |
| Duplicate Submittal | `duplicate_submittal` |
| Redistribute | `redistribute` |
| Email | `email_submittal` |
| Export PDF | `export_pdf` |
| Export CSV | `export_csv` |
| Export Excel | `export_excel` |
| Add Filter | `add_filter` |
| Bulk Actions | `bulk_actions` |
