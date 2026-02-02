| description: |
| -- |
| PRP to implement the Procore-style RFI tool (list + detail + create + edit) in the Alleato Next.js app, with Supabase-backed data, table filters, Ball In Court tracking, and Playwright E2E coverage. |

## Goal

**Feature Goal**: Deliver a production-ready, Procore-inspired RFI (Request for Information) tool that lists, creates, edits, and manages RFIs from Supabase with project-scoped routing, status workflow, Ball In Court tracking, and full CRUD operations.

**Deliverable**: RFI list page with GenericDataTable, status summary cards, filters; RFI detail/edit page; Create RFI form with Draft/Open actions; API routes for CRUD; React Query hook; Zod validation schemas; Playwright E2E tests.

**Success Definition**:
- `/[projectId]/rfis` renders real RFI data from Supabase with status counts, table filters, search, and action menu
- `/[projectId]/rfis/new` provides a form with Procore-required fields and Draft/Open save actions
- `/[projectId]/rfis/[rfiId]` shows RFI detail with edit capability
- API routes handle full CRUD with proper auth and validation
- Playwright tests cover list rendering, create flow, and edit flow with real user interactions

## Why

- RFIs are a core Procore coordination artifact for field questions and design clarification
- Completes the RFI pillar alongside existing tools (Submittals, Commitments, Direct Costs, Invoices)
- Enables downstream workflows: Ball In Court tracking, change event linking, response management
- Database tables (`rfis`, `rfi_assignees`) already exist with data -- this is purely a UI/API implementation task

## What

Implement a Procore-style RFI tool using existing Supabase `rfis` and `rfi_assignees` tables. The UI mimics Procore behavior (status workflow, required fields for Open, Ball In Court, configurable columns) and reuses existing Alleato table/layout patterns (GenericDataTable, React Hook Form + Zod, server/client component split).

### Pages

| Route | Type | Description |
|-------|------|-------------|
| `/[projectId]/rfis` | Server + Client | RFI list with table, filters, status cards |
| `/[projectId]/rfis/new` | Client | Create RFI form |
| `/[projectId]/rfis/[rfiId]` | Server + Client | RFI detail/edit page |

### Database Schema (ALREADY EXISTS)

**Table: `rfis`**
- `id` UUID (PK)
- `project_id` INTEGER (FK -> projects.id) **CRITICAL: INTEGER, not UUID**
- `number` INTEGER (sequential per project)
- `subject` TEXT
- `question` TEXT
- `status` TEXT (default: 'Open')
- `due_date` DATE
- `date_initiated` DATE
- `closed_date` DATE
- `rfi_manager` TEXT
- `received_from` TEXT
- `assignees` TEXT[] (array)
- `distribution_list` TEXT[] (array)
- `ball_in_court` TEXT
- `responsible_contractor` TEXT
- `specification` TEXT
- `location` TEXT
- `sub_job` TEXT
- `cost_code` TEXT
- `rfi_stage` TEXT
- `schedule_impact` TEXT
- `cost_impact` TEXT
- `reference` TEXT
- `is_private` BOOLEAN
- `created_by` TEXT
- `rfi_manager_employee_id` INTEGER (FK -> employees.id)
- `ball_in_court_employee_id` INTEGER (FK -> employees.id)
- `created_by_employee_id` INTEGER (FK -> employees.id)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

**Table: `rfi_assignees`**
- `rfi_id` UUID (FK -> rfis.id, CASCADE)
- `employee_id` INTEGER (FK -> employees.id, CASCADE)
- `is_primary` BOOLEAN (default: false)
- `created_at` TIMESTAMPTZ

**Indexes**: `idx_rfis_project_id`, `idx_rfis_status`, `idx_rfis_number_project`, `idx_rfis_due_date`

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects/[projectId]/rfis` | List RFIs with pagination, filters |
| POST | `/api/projects/[projectId]/rfis` | Create new RFI |
| GET | `/api/projects/[projectId]/rfis/[rfiId]` | Get single RFI |
| PATCH | `/api/projects/[projectId]/rfis/[rfiId]` | Update RFI |
| DELETE | `/api/projects/[projectId]/rfis/[rfiId]` | Delete RFI |

### Components

| Component | Location | Description |
|-----------|----------|-------------|
| `RfisClient` | `(main)/[projectId]/rfis/rfis-client.tsx` | Client wrapper with table, filters, modals |
| `RfiFormDialog` | `components/domain/rfi-form-dialog.tsx` | Create/Edit RFI form dialog |
| `RfiDetailView` | `(main)/[projectId]/rfis/[rfiId]/rfi-detail.tsx` | Detail view with edit |

### Table Columns

| Column | Field | Sortable | Filterable |
|--------|-------|----------|------------|
| # | `number` | Yes | No |
| Subject | `subject` | Yes | Yes (search) |
| Status | `status` | Yes | Yes (dropdown) |
| Assignees | `assignees` | No | Yes |
| Due Date | `due_date` | Yes | Yes (overdue filter) |
| Ball In Court | `ball_in_court` | Yes | Yes |
| RFI Manager | `rfi_manager` | Yes | Yes |
| Responsible Contractor | `responsible_contractor` | Yes | Yes |
| Received From | `received_from` | Yes | Yes |
| Created | `created_at` | Yes | No |

### Form Fields (Create/Edit)

**Required for Open status**: Subject, Assignees, Due Date, Question
**Required for Draft status**: Subject only

| Field | Type | Required (Open) | Required (Draft) |
|-------|------|-----------------|------------------|
| Subject | text input | Yes | Yes |
| Question | textarea (rich text) | Yes | No |
| Assignees | multi-select (employees) | Yes | No |
| Due Date | date picker | Yes | No |
| Number | auto-generated integer | Auto | Auto |
| RFI Manager | select (employee) | No | No |
| Received From | select (employee/company) | No | No |
| Responsible Contractor | select (company) | No | No |
| Distribution List | multi-select (employees) | No | No |
| Location | text | No | No |
| Specification | text | No | No |
| Cost Code | select | No | No |
| Schedule Impact | select (Yes/No/TBD) | No | No |
| Cost Impact | select (Yes/No/TBD) | No | No |
| Reference | text | No | No |
| Private | checkbox | No | No |

### RFI Status Workflow

```
Draft ──────> Open ──────> Closed
  │                          │
  └── Close ─────────────────┘
                              │
                    Closed-Revised (reopened)
```

**Status values in DB**: `draft`, `open`, `pending`, `closed`, `void`

**Ball In Court logic**:
- On create (Open): Ball In Court = Assignees
- On response from assignee: Ball In Court shifts to RFI Manager
- On close: Ball In Court cleared

### Success Criteria

- [ ] `/[projectId]/rfis` loads real RFI rows from Supabase with search, filters, and status badges
- [ ] Status summary cards show counts for Draft/Open/Pending/Closed
- [ ] Action menu (View/Edit/Delete) per row, matching Submittals table behavior
- [ ] `/[projectId]/rfis/new` provides form with required fields and Draft/Open actions
- [ ] `/[projectId]/rfis/[rfiId]` shows detail view with edit capability
- [ ] API routes validate auth, projectId, and use Zod schemas
- [ ] React Query hook provides CRUD operations with optimistic updates
- [ ] Playwright E2E tests cover create, read, edit workflows with real interactions
- [ ] TypeScript compiles with zero errors

## All Needed Context

### Context Completeness Check

_This PRP includes: existing database schema verified from `database.types.ts`, proven UI patterns from Submittals/Commitments, Procore crawl data with screenshots, incident prevention patterns, and complete implementation blueprint. An implementing agent has everything needed for one-pass success._

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Procore RFI Documentation
- url: https://v2.support.procore.com/product-manuals/rfi-project/tutorials
  why: RFI domain overview, required fields, workflow
  critical: Required fields differ between Draft and Open status

- url: https://v2.support.procore.com/product-manuals/rfi-project/tutorials/create-an-rfi/
  why: Create flow behavior and required fields
  critical: Draft needs only Subject; Open needs Subject + Assignees + Due Date + Question

- url: https://v2.support.procore.com/product-manuals/rfi-project/tutorials/respond-to-an-rfi/
  why: Response flow and Ball In Court shift
  critical: Response shifts Ball In Court from Assignees to RFI Manager

- url: https://v2.support.procore.com/product-manuals/rfi-project/tutorials/close-an-rfi/
  why: Close workflow from Items tab
  critical: Both Draft and Open can be closed

# Existing Pattern Files (FOLLOW THESE EXACTLY)
- file: frontend/src/app/(main)/[projectId]/submittals/page.tsx
  why: Project-scoped server component pattern
  pattern: Resolve projectId -> fetch -> render client component
  gotcha: params is Promise<{projectId}> in Next.js 15 -- MUST await

- file: frontend/src/app/(tables)/(procore)/submittals/submittals-client.tsx
  why: GenericDataTable config, status badges, filters, summary cards
  pattern: useMemo for row mapping, GenericDataTable with columnConfigs
  gotcha: Status values must be lowercase to match DB

- file: frontend/src/app/(tables)/(procore)/submittals/submittals-data.ts
  why: Supabase server-side data fetching pattern
  pattern: createServiceClient + query with error handling
  gotcha: Returns empty array on error

- file: frontend/src/hooks/use-submittals.ts
  why: React Query hook pattern for CRUD
  pattern: useQuery + useMutation with queryClient invalidation
  gotcha: Use router.refresh() after mutations for server component revalidation

- file: frontend/src/services/submittal-service.ts
  why: Service class pattern
  pattern: Static methods with Supabase client, pagination, filtering
  gotcha: Uses Database["public"]["Tables"] for type extraction

- file: frontend/src/lib/schemas/submittal-schema.ts
  why: Zod validation schema pattern
  pattern: z.object with field-specific validators
  gotcha: Status enum must match DB CHECK constraint values exactly

- file: frontend/src/app/api/projects/[projectId]/submittals/route.ts
  why: API route pattern with auth and validation
  pattern: Validate projectId as number, check auth, use Zod, return proper status codes
  gotcha: Next.js 15 async params -- must await params

- file: frontend/src/components/domain/submittal-form-dialog.tsx
  why: Form dialog pattern with React Hook Form + Zod
  pattern: useForm with zodResolver, Dialog + DialogContent, form.reset on open
  gotcha: Reset form when dialog opens to clear stale data

- file: frontend/src/lib/supabase/queries.ts
  why: Existing getProjectRfis() query helper
  pattern: Already accepts supabase client, projectId, options (status, limit)
  gotcha: Ready to use -- don't recreate

- file: frontend/src/types/database-extensions.ts
  why: Existing RFI type and RfiStatus union
  pattern: type RFI = Database["public"]["Tables"]["rfis"]["Row"]
  gotcha: RfiStatus = "draft" | "open" | "pending" | "closed" | "void"

- file: frontend/drizzle/schema.ts
  why: Full Drizzle schema for rfis table (line ~3780) and rfi_assignees (line ~5199)
  pattern: Complete field definitions with types and constraints
  gotcha: Source of truth for DB schema alongside database.types.ts

# Existing RFI Code (REPLACE/UPGRADE THESE)
- file: frontend/src/app/(main)/[projectId]/rfis/page.tsx
  why: Current placeholder page to replace
  pattern: Shows "Coming soon" -- replace with real implementation
  gotcha: File exists, EDIT don't create new

- file: frontend/src/app/(main)/[projectId]/rfis/new/page.tsx
  why: Current placeholder form page to replace
  pattern: Has deprecated header -- replace with ProjectPageHeader + PageContainer
  gotcha: File exists, EDIT don't create new

- file: frontend/src/app/(tables)/(procore)/rfis/page.tsx
  why: Current mock data RFI table page
  pattern: Working table UI but uses mock data with wrong field names
  gotcha: Mock uses "priority" (not in schema) and "assignee" (should be "assignees" array)
```

### Current Codebase Tree (Relevant Files)

```bash
frontend/src/
├── app/
│   ├── (main)/[projectId]/rfis/
│   │   ├── page.tsx                    # PLACEHOLDER - replace with real list
│   │   └── new/
│   │       └── page.tsx                # PLACEHOLDER - replace with real form
│   ├── (tables)/(procore)/rfis/
│   │   └── page.tsx                    # MOCK DATA - upgrade to real data
│   └── api/projects/[projectId]/
│       └── submittals/route.ts         # PATTERN to follow for RFI routes
├── components/domain/
│   └── submittal-form-dialog.tsx       # PATTERN to follow for RFI form
├── hooks/
│   └── use-submittals.ts              # PATTERN to follow for RFI hook
├── services/
│   └── submittal-service.ts           # PATTERN to follow for RFI service
├── lib/
│   ├── schemas/
│   │   └── submittal-schema.ts        # PATTERN to follow for RFI schema
│   └── supabase/
│       └── queries.ts                 # HAS getProjectRfis() already
└── types/
    ├── database.types.ts              # Source of truth for DB types
    └── database-extensions.ts         # HAS type RFI and RfiStatus
```

### Desired Codebase Tree (Files to Create/Modify)

```bash
frontend/src/
├── app/
│   ├── (main)/[projectId]/rfis/
│   │   ├── page.tsx                    # MODIFY: Server component, fetch + render RfisClient
│   │   ├── rfis-client.tsx             # CREATE: Client wrapper (table, filters, modals)
│   │   ├── new/
│   │   │   └── page.tsx                # MODIFY: Create RFI form with all fields
│   │   └── [rfiId]/
│   │       ├── page.tsx                # CREATE: RFI detail server component
│   │       └── rfi-detail.tsx          # CREATE: RFI detail client component
│   └── api/projects/[projectId]/rfis/
│       ├── route.ts                    # CREATE: GET (list) + POST (create)
│       └── [rfiId]/
│           └── route.ts               # CREATE: GET (single) + PATCH + DELETE
├── components/domain/
│   └── rfi-form-dialog.tsx             # CREATE: Form dialog for create/edit
├── hooks/
│   └── use-rfis.ts                    # CREATE: React Query hook for CRUD
├── services/
│   └── rfi-service.ts                 # CREATE: Service class for RFI operations
└── lib/schemas/
    └── rfi-schema.ts                  # CREATE: Zod schemas for validation
```

### Known Gotchas & Incident Prevention

```typescript
// CRITICAL (INC-002): project_id is INTEGER, NOT UUID
// projects.id is INTEGER. rfis.project_id is INTEGER.
// NEVER use UUID for project_id. This broke schedule_tasks on 2026-01-28.
// Verify: grep "project_id" in database.types.ts -> type is `number`

// CRITICAL (INC-007): Status values must be lowercase in DB
// UI can show "Open" but DB stores "open"
// Use .toLowerCase() when comparing/storing status values
// CHECK constraint violation will crash if values don't match

// CRITICAL (INC-006): Clear .next cache when creating new routes
// After creating [rfiId] directory, run: rm -rf frontend/.next
// Then restart dev server before testing with Playwright

// CRITICAL: Next.js 15 async params
// params is a Promise in server components and route handlers
// MUST: const { projectId } = await params;
// NOT: const { projectId } = params; // This will fail

// CRITICAL: Route naming
// Use [projectId] and [rfiId] -- NEVER generic [id]
// Run npm run check:routes after creating new route directories

// CRITICAL: Auth in RLS policies
// Use users_auth table for auth_user_id lookup
// NOT people.auth_user_id (column doesn't exist)
// Pattern: auth.uid() -> users_auth.auth_user_id -> users_auth.employee_id

// IMPORTANT: Always console.error actual Supabase errors
// Don't swallow errors silently -- log them for debugging
// Pattern: if (error) { console.error('RFI fetch error:', error); }

// IMPORTANT: Form reset on dialog open
// When opening create/edit dialog, call form.reset()
// Prevents stale data from previous form state

// MANDATORY (Gate 10): Page Header Consistency
// ALL project pages MUST use ProjectPageHeader + PageContainer from @/components/layout
// NEVER use ProjectToolPage (deprecated) or PageHeader from @/components/design-system
// Pattern:
//   import { PageContainer, ProjectPageHeader } from "@/components/layout";
//   <>
//     <ProjectPageHeader title="RFIs" description="..." actions={<div>...</div>} />
//     <PageContainer>{/* content */}</PageContainer>
//   </>
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// frontend/src/lib/schemas/rfi-schema.ts
import { z } from "zod";

// Base schema for all RFI operations
export const rfiBaseSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  question: z.string().optional(),
  due_date: z.string().nullable().optional(),
  assignees: z.array(z.string()).optional().default([]),
  rfi_manager: z.string().nullable().optional(),
  received_from: z.string().nullable().optional(),
  responsible_contractor: z.string().nullable().optional(),
  distribution_list: z.array(z.string()).optional().default([]),
  location: z.string().nullable().optional(),
  specification: z.string().nullable().optional(),
  cost_code: z.string().nullable().optional(),
  schedule_impact: z.string().nullable().optional(),
  cost_impact: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  is_private: z.boolean().optional().default(false),
  rfi_stage: z.string().nullable().optional(),
});

// Create as Draft -- only subject required
export const rfiDraftSchema = rfiBaseSchema;

// Create as Open -- subject + assignees + due_date + question required
export const rfiOpenSchema = rfiBaseSchema.extend({
  question: z.string().min(1, "Question is required for Open RFIs"),
  due_date: z.string().min(1, "Due date is required for Open RFIs"),
  assignees: z.array(z.string()).min(1, "At least one assignee is required for Open RFIs"),
});

export type RfiFormValues = z.infer<typeof rfiBaseSchema>;
```

```typescript
// frontend/src/types/database-extensions.ts already has:
// export type RFI = Database["public"]["Tables"]["rfis"]["Row"];
// export type RfiStatus = "draft" | "open" | "pending" | "closed" | "void";

// Additional types needed in hooks/services:
export type RfiInsert = Database["public"]["Tables"]["rfis"]["Insert"];
export type RfiUpdate = Database["public"]["Tables"]["rfis"]["Update"];
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: CREATE frontend/src/lib/schemas/rfi-schema.ts
  - IMPLEMENT: Zod schemas for draft and open RFI creation, edit validation
  - FOLLOW pattern: frontend/src/lib/schemas/submittal-schema.ts
  - NAMING: rfiDraftSchema, rfiOpenSchema, rfiEditSchema, RfiFormValues
  - PLACEMENT: lib/schemas/

Task 2: CREATE frontend/src/services/rfi-service.ts
  - IMPLEMENT: RfiService class with static CRUD methods
  - FOLLOW pattern: frontend/src/services/submittal-service.ts
  - METHODS: list(projectId, options), getById(rfiId), create(data), update(rfiId, data), delete(rfiId)
  - NAMING: RfiService, proper TS types from database.types.ts
  - CRITICAL: projectId is NUMBER, rfiId is STRING (UUID)

Task 3: CREATE frontend/src/hooks/use-rfis.ts
  - IMPLEMENT: React Query hook with useQuery for list, useMutation for create/update/delete
  - FOLLOW pattern: frontend/src/hooks/use-submittals.ts
  - NAMING: useRfis(projectId), useCreateRfi(), useUpdateRfi(), useDeleteRfi()
  - DEPENDENCIES: RfiService from Task 2, schemas from Task 1

Task 4: CREATE frontend/src/app/api/projects/[projectId]/rfis/route.ts
  - IMPLEMENT: GET (paginated list with filters) + POST (create RFI)
  - FOLLOW pattern: frontend/src/app/api/projects/[projectId]/submittals/route.ts
  - CRITICAL: await params, validate projectId as number, check auth
  - USE: Zod schema from Task 1 for POST validation

Task 5: CREATE frontend/src/app/api/projects/[projectId]/rfis/[rfiId]/route.ts
  - IMPLEMENT: GET (single) + PATCH (update) + DELETE
  - FOLLOW pattern: submittals/[submittalId]/route.ts if it exists, otherwise match Task 4 pattern
  - NAMING: [rfiId] NOT [id] -- MANDATORY

Task 6: CREATE frontend/src/components/domain/rfi-form-dialog.tsx
  - IMPLEMENT: Dialog with React Hook Form + Zod for create/edit
  - FOLLOW pattern: frontend/src/components/domain/submittal-form-dialog.tsx
  - FIELDS: Subject, Question (textarea), Assignees (multi-select), Due Date, RFI Manager, etc.
  - ACTIONS: "Save as Draft" and "Create Open" buttons with different validation
  - RESET: form.reset() when dialog opens

Task 7: MODIFY frontend/src/app/(main)/[projectId]/rfis/page.tsx
  - IMPLEMENT: Server component that fetches RFIs and renders RfisClient
  - FOLLOW pattern: frontend/src/app/(main)/[projectId]/submittals/page.tsx
  - CRITICAL: const { projectId } = await params; (Next.js 15 async params)
  - PASS: fetched data to client component as props

Task 8: CREATE frontend/src/app/(main)/[projectId]/rfis/rfis-client.tsx
  - IMPLEMENT: Client wrapper with GenericDataTable, status summary cards, filters, action menu
  - FOLLOW pattern: submittals-client.tsx (GenericDataTable config)
  - COLUMNS: Number, Subject, Status (badge), Assignees, Due Date, Ball In Court, RFI Manager
  - FILTERS: Status dropdown, search, overdue toggle
  - ACTIONS: View, Edit (opens form dialog), Delete (with confirmation)
  - STATUS CARDS: Draft, Open, Pending, Closed with counts

Task 9: MODIFY frontend/src/app/(main)/[projectId]/rfis/new/page.tsx
  - IMPLEMENT: Full create RFI page with form fields
  - FOLLOW pattern: existing form pages in the codebase
  - BUTTONS: "Save as Draft" (validates rfiDraftSchema) + "Create Open" (validates rfiOpenSchema)
  - ON SUCCESS: redirect to /[projectId]/rfis with toast notification

Task 10: CREATE frontend/src/app/(main)/[projectId]/rfis/[rfiId]/page.tsx
  - IMPLEMENT: Server component for RFI detail
  - FOLLOW pattern: project-scoped server components
  - NAMING: [rfiId] directory, NOT [id]
  - CRITICAL: Run npm run check:routes after creating this directory

Task 11: CREATE frontend/src/app/(main)/[projectId]/rfis/[rfiId]/rfi-detail.tsx
  - IMPLEMENT: Client component for RFI detail/edit view
  - SECTIONS: RFI info header, Question section, General Information sidebar, Response section (future)
  - ACTIONS: Edit, Close, Delete from detail view

Task 12: CREATE frontend/tests/e2e/rfis.spec.ts
  - IMPLEMENT: Full E2E tests with real user interactions (NOT smoke tests)
  - FOLLOW pattern: tests/e2e/submittals.spec.ts
  - REQUIRED: Create RFI test, Read/list test, Edit test, Delete test, Validation test
  - SELECTORS: Role-based (getByRole) preferred
  - CLEANUP: Delete test data in afterAll
  - AUTH: Uses saved session automatically (tests/.auth/user.json)
```

### Implementation Patterns & Key Details

```typescript
// SERVER COMPONENT PATTERN (page.tsx)
// File: frontend/src/app/(main)/[projectId]/rfis/page.tsx
import { createClient } from "@/lib/supabase/server";
import { getProjectRfis } from "@/lib/supabase/queries";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { RfisClient } from "./rfis-client";

export default async function RfisPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params; // CRITICAL: await params in Next.js 15
  const projectIdNum = parseInt(projectId, 10);

  const supabase = await createClient();
  const rfis = await getProjectRfis(supabase, projectIdNum);

  return (
    <>
      <ProjectPageHeader
        title="RFIs"
        description="Requests for Information"
        actions={<div>{/* Create RFI button */}</div>}
      />
      <PageContainer>
        <RfisClient rfis={rfis} projectId={projectIdNum} />
      </PageContainer>
    </>
  );
}

// CLIENT COMPONENT PATTERN (rfis-client.tsx)
"use client";

import { useMemo } from "react";
import { GenericDataTable } from "@/components/ui/generic-data-table";
import type { RFI } from "@/types/database-extensions";

interface RfisClientProps {
  rfis: RFI[];
  projectId: number;
}

export function RfisClient({ rfis, projectId }: RfisClientProps) {
  const statusCounts = useMemo(() => ({
    draft: rfis.filter(r => r.status === "draft").length,
    open: rfis.filter(r => r.status === "open").length,
    pending: rfis.filter(r => r.status === "pending").length,
    closed: rfis.filter(r => r.status === "closed").length,
  }), [rfis]);

  // ... GenericDataTable config, filters, action menu
}

// API ROUTE PATTERN
// File: frontend/src/app/api/projects/[projectId]/rfis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rfiOpenSchema, rfiDraftSchema } from "@/lib/schemas/rfi-schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params; // CRITICAL: await
  const projectIdNum = parseInt(projectId, 10);
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("rfis")
    .select("*")
    .eq("project_id", projectIdNum) // INTEGER comparison
    .order("number", { ascending: false });

  if (error) {
    console.error("RFI list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);
  const body = await request.json();

  // Use draft or open schema based on status
  const schema = body.status === "draft" ? rfiDraftSchema : rfiOpenSchema;
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  // ... insert with project_id: projectIdNum
}

// HOOK PATTERN
// File: frontend/src/hooks/use-rfis.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useRfis(projectId: number) {
  return useQuery({
    queryKey: ["rfis", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/rfis`);
      if (!res.ok) throw new Error("Failed to fetch RFIs");
      return res.json();
    },
  });
}

export function useCreateRfi(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: RfiFormValues & { status: string }) => {
      const res = await fetch(`/api/projects/${projectId}/rfis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create RFI");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfis", projectId] });
      router.refresh();
      toast.success("RFI created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create RFI: ${error.message}`);
    },
  });
}
```

### Integration Points

```yaml
DATABASE:
  - tables: rfis (EXISTS), rfi_assignees (EXISTS)
  - queries: frontend/src/lib/supabase/queries.ts#getProjectRfis (EXISTS)
  - client: createClient() from @/lib/supabase/server (server) or @/lib/supabase/client (browser)
  - types: frontend/src/types/database.types.ts (generate fresh with npm run db:types)

ROUTES:
  - list page: frontend/src/app/(main)/[projectId]/rfis/page.tsx (EXISTS - modify)
  - create page: frontend/src/app/(main)/[projectId]/rfis/new/page.tsx (EXISTS - modify)
  - detail page: frontend/src/app/(main)/[projectId]/rfis/[rfiId]/page.tsx (CREATE)
  - API list/create: frontend/src/app/api/projects/[projectId]/rfis/route.ts (CREATE)
  - API detail/update/delete: frontend/src/app/api/projects/[projectId]/rfis/[rfiId]/route.ts (CREATE)

NAVIGATION:
  - Project sidebar should link to /[projectId]/rfis
  - Check frontend/src/config/project-home.ts for navigation config

EXISTING CODE TO REUSE:
  - getProjectRfis() from queries.ts
  - type RFI and RfiStatus from database-extensions.ts
  - GenericDataTable component
  - ProjectPageHeader + PageContainer from @/components/layout (MANDATORY -- Gate 10)
  - toast from sonner for notifications
```

## Validation Loop

### Level 1: Syntax & Style

```bash
# Run after EACH file creation
cd /Users/meganharrison/Documents/github/alleato-procore/frontend
npx tsc --noEmit                    # TypeScript check
npm run lint                        # ESLint

# Route conflict check (after creating [rfiId] directory)
npm run check:routes
```

### Level 2: Database Verification

```bash
# Generate fresh types BEFORE coding
npm run db:types

# Test RFI query works
node -e '
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
(async () => {
  const { data, error } = await supabase
    .from("rfis")
    .select("id, number, subject, status, project_id, assignees, due_date, ball_in_court")
    .limit(5);
  if (error) { console.error("QUERY FAILED:", error); process.exit(1); }
  console.log("QUERY WORKS - rows:", data.length);
  console.log(JSON.stringify(data[0], null, 2));
})();
'
```

### Level 3: Integration Testing

```bash
# Clear cache (MANDATORY for new routes)
cd /Users/meganharrison/Documents/github/alleato-procore/frontend
rm -rf .next
npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10
tail -20 /tmp/nextjs-dev.log  # Verify "Ready"

# Test routes compile
curl -s http://localhost:3000/31/rfis | head -20
curl -s http://localhost:3000/api/projects/31/rfis | head -20
```

### Level 4: E2E Tests

```bash
# Run RFI-specific Playwright tests
cd /Users/meganharrison/Documents/github/alleato-procore/frontend
npx playwright test tests/e2e/rfis.spec.ts --headed
```

## Final Validation Checklist

### Technical Validation

- [ ] `npm run db:types` run and types verified
- [ ] `npx tsc --noEmit` -- zero errors
- [ ] `npm run lint` -- zero errors
- [ ] `npm run check:routes` -- no conflicts
- [ ] `npm run build` -- successful production build
- [ ] RFI query test returns data (node -e script)

### Feature Validation

- [ ] RFI list renders real data with correct columns
- [ ] Status summary cards show accurate counts
- [ ] Search filters RFIs by subject
- [ ] Status filter works (Draft/Open/Pending/Closed)
- [ ] Action menu: View navigates to detail, Edit opens form, Delete removes
- [ ] Create as Draft: only subject required, saves with status "draft"
- [ ] Create as Open: validates subject + assignees + due_date + question
- [ ] Detail page shows all RFI fields
- [ ] Edit updates RFI and refreshes list

### Code Quality Validation

- [ ] Server/client component split followed correctly
- [ ] No `any`, `@ts-ignore`, or leftover `console.log`
- [ ] All API routes check auth and validate input with Zod
- [ ] Error handling with console.error for Supabase errors
- [ ] Form resets on dialog open
- [ ] Toast notifications for success/error

### E2E Testing Validation

- [ ] Create RFI test: opens form, fills fields, submits, verifies in table
- [ ] Read test: navigates to list, verifies data renders with correct values
- [ ] Edit test: opens existing RFI, changes field, saves, verifies update
- [ ] Delete test: removes RFI, verifies disappears
- [ ] Validation test: submits empty required fields, verifies error messages
- [ ] Cleanup: test data deleted in afterAll

---

## Anti-Patterns to Avoid

- Don't keep mock RFI data after wiring Supabase
- Don't create new table patterns -- use GenericDataTable
- Don't use `[id]` for route params -- use `[rfiId]` and `[projectId]`
- Don't use UUID for project_id -- it's INTEGER
- Don't use `people.auth_user_id` in RLS -- use `users_auth` table
- Don't skip `await params` in Next.js 15 server components
- Don't use client hooks (useState, useEffect) in server components
- Don't swallow Supabase errors silently -- always console.error
- Don't hardcode status strings -- use RfiStatus type
- Don't skip form.reset() when opening dialogs
- Don't write smoke tests -- write real E2E with form interactions
- Don't use `ProjectToolPage` (deprecated) or `PageHeader` from design-system -- use `ProjectPageHeader` + `PageContainer` from `@/components/layout`

---

## Procore Crawl Data Reference

### Crawl Data Files

| Category | File | Path | Description |
|----------|------|------|-------------|
| Summary | README | `PRPs/pm-tools/rfis/crawl-rfis/README.mdx` | Module overview with screenshots |
| Summary | Crawl Status | `PRPs/pm-tools/rfis/crawl-rfis/RFIS-CRAWL-STATUS.mdx` | 50 pages crawled, UI element counts |
| Reports | Reports Dir | `PRPs/pm-tools/rfis/crawl-rfis/reports/` | Sitemap and detailed reports |
| Pages | RFI List | `PRPs/pm-tools/rfis/crawl-rfis/pages/rfi_list/` | List view screenshot + DOM + metadata |
| Pages | RFI Detail | `PRPs/pm-tools/rfis/crawl-rfis/pages/rfi_562949957101832/` | Detail view screenshot + DOM |
| Pages | Edit Form | `PRPs/pm-tools/rfis/crawl-rfis/pages/edit/` | Edit form screenshot + DOM |
| Pages | Close RFI | `PRPs/pm-tools/rfis/crawl-rfis/pages/close-an-rfi/` | Close workflow |
| Pages | Export | `PRPs/pm-tools/rfis/crawl-rfis/pages/export-rfis/` | Export functionality |

**Base Path**: `PRPs/pm-tools/rfis/crawl-rfis/`

### Screenshots

#### RFI List View
_Shows Procore's RFI list with AG Grid table, status column, assignees, due dates, and toolbar_

![Procore RFI List](crawl-rfis/pages/rfi_list/screenshot.png)

**Key UI Elements to Replicate:**
- Table with columns: #, Subject, Linked To, Status, Responsible Contractor, Received From
- Status badges with color coding
- Toolbar with search, filters, column customization
- Export button
- "Create" button for new RFIs

#### RFI Edit Form
_Shows Procore's RFI edit form with Request section (subject, question) and General Information sidebar_

![Procore RFI Edit Form](crawl-rfis/pages/edit/screenshot.png)

**Key UI Elements to Replicate:**
- Two-column layout: main content (Request) + sidebar (General Information)
- Request section: Subject input, Question rich text area, Attachments
- General Information: Number, Due Date, RFI Manager, Status, Received From, Assignees, Distribution List, Ball In Court
- Response section below request
- Action buttons: Save, Close, Delete

### UI Components Detected (from Crawl Metadata)

| Element Type | Count |
|-------------|-------|
| Links | 112 |
| Clickable elements | 131 |
| Dropdowns | 25 |
| Buttons | 100 |

**Filters detected**: Status, Responsible Contractor, Received From, Assignees, RFI Manager, Ball In Court, Overdue, Location, Cost Code, Sub Job, RFI Stage, Created By

---

## Confidence Score

**9.0 / 10**

**Strengths:**
- Database tables verified as existing with exact schema from database.types.ts
- Proven UI patterns from Submittals available to follow
- Procore crawl data with 50 pages of screenshots and metadata
- All incident patterns documented with prevention steps
- Existing query helper (getProjectRfis) ready to use
- Clear required vs optional field definitions from Procore docs

**Remaining risks:**
- RLS policies may need verification if not already applied to rfis table
- Employee select components may need to be built if not existing
- Rich text editor for Question field may require new component
