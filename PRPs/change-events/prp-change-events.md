name: "Change Events - Fix & Complete Implementation PRP"
description: |
  Fix the 5 blocking bugs in the existing Change Events feature and complete
  the remaining ~48% of work to bring it to production-ready status.

---

## Goal

**Feature Goal:** Fix all blocking bugs in the existing Change Events module so that the full CRUD lifecycle (create, read, update, delete), line items, attachments, history, and approval workflow operate end-to-end with real data.

**Deliverable:** A fully functional Change Events feature where a user can create a change event, add line items, upload attachments, view history, submit for approval, and optionally convert to a change order - all without encountering silent failures, empty results, or disconnected UI.

**Success Definition:**
1. Detail and edit pages load real data (no more `parseInt` of UUIDs yielding NaN)
2. Line items can be created, edited, and deleted via the API and reflected in the grid
3. Attachments upload, download, and delete correctly via Supabase storage
4. History endpoint returns audit trail entries
5. Approval workflow either functions end-to-end or is cleanly disabled with a "coming soon" state
6. Revenue source values align between UI selectors and API enums
7. RFQ endpoints are wired to the UI
8. All Playwright E2E tests pass against real data

## Why

**Business Value:** Change Events is a core financial tool in construction PM. Without it, users cannot track scope changes, design modifications, or unforeseen conditions that affect project cost. This is one of Procore's most-used financial features.

**Integration:** Change Events feed into:
- Budget modifications (cost impact flows to budget line items)
- Change Orders (conversion workflow)
- Prime Contracts (revenue impact)
- RFQs (vendor pricing requests)

**Problems Solved:**
- Currently ~52% complete with 5 blocking bugs preventing any real usage
- Users see empty detail pages, broken uploads, and disconnected approval UI
- Tests cannot pass because the underlying data flows are broken

## What

### Pages
| Page | Route | Status |
|------|-------|--------|
| Change Events List | `/[projectId]/change-events` | Renders but UUID bug blocks detail navigation |
| Create Change Event | `/[projectId]/change-events/new` | Bypasses API, direct Supabase insert (must fix) |
| Change Event Detail | `/[projectId]/change-events/[id]` | Broken - `parseInt(uuid)` = NaN |
| Edit Change Event | `/[projectId]/change-events/[id]/edit` | Broken - same UUID bug |

### Database Schema (EXISTS - No Changes Needed)
5 tables already deployed:
- `change_events` (UUID PK, project_id INTEGER/bigint)
- `change_event_line_items` (UUID PK, FK to change_events.id UUID)
- `change_event_attachments` (UUID PK, FK to change_events.id UUID)
- `change_event_history` (UUID PK, FK to change_events.id UUID)
- `change_event_approvals` (UUID PK, FK to change_events.id UUID)

Plus: `change_events_summary` materialized view, triggers, RLS policies, helper functions.

**CRITICAL FK NOTE:** `change_events.project_id` is `bigint` (INTEGER) matching `projects.id`. All other FKs use UUID. Do NOT change this.

### API Endpoints (21 total, ~12 broken)
| Group | Endpoints | Status |
|-------|-----------|--------|
| Change Events CRUD | GET/POST collection, GET/PATCH/DELETE detail | Working with UUIDs |
| Line Items | GET/POST collection, GET/PATCH/DELETE detail | BROKEN - parseInt on UUID |
| Attachments | GET/POST/DELETE, download | BROKEN - parseInt + wrong payload key |
| History | GET | BROKEN - parseInt on UUID |
| RFQs | GET/POST collection, POST response | Exists but not wired to UI |
| Approvals | None | Missing - table exists, no routes |

### Components (All exist, some broken)
| Component | File | Status |
|-----------|------|--------|
| ChangeEventForm | `components/domain/change-events/ChangeEventForm.tsx` | Bypasses API |
| ChangeEventGeneralSection | Same dir | Works |
| ChangeEventRevenueSection | Same dir | Wrong enum mapping |
| ChangeEventLineItemsGrid | Same dir | Broken (UUID bug in API) |
| ChangeEventAttachmentsSection | Same dir | Wrong payload key |
| ChangeEventApprovalWorkflow | Same dir | Calls non-existent endpoints |
| ChangeEventConvertDialog | Same dir | Not tested |
| ChangeEventsTableColumns | Same dir | Works |
| ChangeEventRfqForm | Same dir | Not wired |
| ChangeEventRfqResponseForm | Same dir | Not wired |

### Table Columns (List View)
| Column | Source |
|--------|--------|
| # (number) | `change_events.number` |
| Title | `change_events.title` |
| Type | `change_events.type` |
| Scope | `change_events.scope` |
| Status | `change_events.status` (badge) |
| Origin | `change_events.origin` |
| Revenue ROM | Sum from line items |
| Cost ROM | Sum from line items |
| Created | `change_events.created_at` |

### Form Fields (Create/Edit)
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Title | text | Yes | min 1, max 255 |
| Type | select | Yes | Enum: Owner Change, Design Change, etc. |
| Scope | select | Yes | Enum: TBD, In Scope, Out of Scope, Allowance |
| Status | select | Yes | Enum: Open, Pending Approval, Approved, etc. |
| Origin | select | No | Enum: Internal, RFI, Field |
| Reason | text | No | max 100 |
| Description | textarea | No | - |
| Expecting Revenue | checkbox | Yes | boolean |
| Revenue Source | select | Conditional | Only when expecting_revenue=true |
| Prime Contract | select | No | FK to contracts |

## Success Criteria

- [ ] Change Event detail page loads real data when navigating from list
- [ ] Create form submits via API (not direct Supabase insert)
- [ ] Line items CRUD works end-to-end (create, read, update, delete)
- [ ] Attachments upload via Supabase storage and display in UI
- [ ] History tab shows audit trail entries
- [ ] Revenue source values match between UI and API
- [ ] Approval workflow either works or shows "coming soon" placeholder
- [ ] RFQ creation and response submission functional
- [ ] Zero TypeScript compilation errors
- [ ] Playwright E2E tests pass for create, read, edit, delete workflows

---

## All Needed Context

### Context Completeness Check

_"If someone knew nothing about this codebase, would they have everything needed to fix these bugs?"_

**YES** - The 5 blocking bugs are clearly identified with exact file locations and the fix patterns are documented below.

### Documentation & References

```yaml
# MUST READ - Existing documentation
- file: PRPs/finance-tools/change-events/TASKS-CHANGE-EVENTS.md
  why: Reality checklist showing actual completion (52%) and all blocking issues
  pattern: Bug descriptions with exact symptoms
  gotcha: The "85% complete" claim elsewhere is wrong; use this file

- file: PRPs/finance-tools/change-events/SCHEMA-ChangeEvents.md
  why: Complete database schema with all 5 tables, constraints, indexes
  pattern: UUID PKs, INTEGER project_id, constraint values
  gotcha: Schema doc says project_id is UUID but actual DB has bigint - USE database.types.ts

- file: PRPs/finance-tools/change-events/API_ENDPOINTS-ChangeEvents.md
  why: Full API specification with request/response shapes
  pattern: REST endpoints, query params, response formats
  gotcha: Reality Check section documents the parseInt bug

- file: frontend/src/types/database.types.ts
  why: Source of truth for all table types and FK relationships
  pattern: Search for "change_events" to see exact column types
  gotcha: project_id is number (bigint), id is string (UUID)

# MUST READ - Pattern files to follow
- file: frontend/src/app/api/projects/[projectId]/contracts/route.ts
  why: Working API route pattern with proper projectId handling
  pattern: parseInt(projectId) for project_id, UUID strings for entity IDs
  gotcha: Never parseInt a UUID

- file: frontend/src/app/api/projects/[projectId]/budget/route.ts
  why: Another working API pattern with enrichment from materialized views
  pattern: Query + enrich pattern for calculated fields

- file: frontend/src/hooks/use-budget-data.ts
  why: Hook pattern with fetch, state management, error handling
  pattern: useCallback + useEffect + toast errors

- file: frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx
  why: Working list page pattern with navigation to detail
  pattern: Router.push with UUID id, not parseInt

- file: frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx
  why: Working form submission via API (not direct Supabase)
  pattern: fetch POST to API route, then router.push to detail

# Existing change events files to fix
- file: frontend/src/app/(main)/[projectId]/change-events/page.tsx
  why: Main list page - needs UUID navigation fix

- file: frontend/src/app/(main)/[projectId]/change-events/[id]/page.tsx
  why: Detail page - THE primary bug (parseInt of UUID)

- file: frontend/src/app/(main)/[projectId]/change-events/new/page.tsx
  why: Create page - must switch from direct Supabase to API call

- file: frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/route.ts
  why: Line items API - parseInt bug

- file: frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/route.ts
  why: Attachments API - parseInt bug + wrong payload key

- file: frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/history/route.ts
  why: History API - parseInt bug

- file: frontend/src/components/domain/change-events/ChangeEventForm.tsx
  why: Form component - direct Supabase insert must become API call

- file: frontend/src/components/domain/change-events/ChangeEventRevenueSection.tsx
  why: Revenue selector - slug vs enum mismatch

- file: frontend/src/components/domain/change-events/ChangeEventAttachmentsSection.tsx
  why: Attachment upload - sends 'files' instead of 'file'

- file: frontend/src/components/domain/change-events/ChangeEventApprovalWorkflow.tsx
  why: Calls non-existent endpoints - must implement or disable

- file: frontend/src/hooks/use-change-events.ts
  why: Data fetching hook - may need UUID fixes

- file: frontend/src/hooks/use-change-event-rfqs.ts
  why: RFQ hook - needs to be wired to UI
```

### Current Codebase Tree (Change Events files only)

```
frontend/src/
├── app/
│   ├── (main)/[projectId]/change-events/
│   │   ├── page.tsx                          # List page
│   │   ├── error.tsx                         # Error boundary
│   │   ├── new/page.tsx                      # Create form
│   │   └── [id]/
│   │       ├── page.tsx                      # Detail view
│   │       └── edit/page.tsx                 # Edit form
│   └── api/projects/[projectId]/change-events/
│       ├── route.ts                          # GET/POST collection
│       ├── validation.ts                     # Zod schemas
│       ├── [changeEventId]/
│       │   ├── route.ts                      # GET/PATCH/DELETE detail
│       │   ├── line-items/
│       │   │   ├── route.ts                  # GET/POST line items
│       │   │   └── [lineItemId]/route.ts     # PATCH/DELETE line item
│       │   ├── attachments/
│       │   │   ├── route.ts                  # GET/POST attachments
│       │   │   ├── [attachmentId]/route.ts   # GET/DELETE attachment
│       │   │   └── [attachmentId]/download/route.ts
│       │   └── history/route.ts              # GET history
│       └── rfqs/
│           ├── route.ts                      # GET/POST RFQs
│           └── [rfqId]/responses/route.ts    # POST responses
├── components/domain/change-events/
│   ├── ChangeEventForm.tsx
│   ├── ChangeEventGeneralSection.tsx
│   ├── ChangeEventRevenueSection.tsx
│   ├── ChangeEventLineItemsGrid.tsx
│   ├── ChangeEventAttachmentsSection.tsx
│   ├── ChangeEventApprovalWorkflow.tsx
│   ├── ChangeEventConvertDialog.tsx
│   ├── ChangeEventsTableColumns.tsx
│   ├── ChangeEventRfqForm.tsx
│   └── ChangeEventRfqResponseForm.tsx
├── hooks/
│   ├── use-change-events.ts
│   └── use-change-event-rfqs.ts
└── types/
    └── change-events.ts                      # TypeScript interfaces
```

### Desired Codebase Tree (files to ADD)

```
frontend/src/
├── app/api/projects/[projectId]/change-events/
│   └── [changeEventId]/
│       └── approvals/
│           └── route.ts                      # NEW: Approval CRUD endpoints
└── No other new files needed - all fixes are to existing files
```

### Known Gotchas

```typescript
// CRITICAL: project_id is INTEGER (bigint), entity IDs are UUID strings
// In API routes:
const projectIdNum = parseInt(projectId, 10);  // ✅ For project_id
const changeEventId = params.changeEventId;     // ✅ Keep as string (UUID)
// NEVER: parseInt(changeEventId)               // ❌ Returns NaN for UUIDs

// CRITICAL: Next.js 15 async params
// Route handlers in Next.js 15 have async params
const { projectId, changeEventId } = await params;  // ✅ Must await

// CRITICAL: Revenue source enum mismatch
// UI sends: 'match_latest_cost', 'percentage_markup', 'manual_entry', 'fixed_amount'
// API expects: 'Match Latest Cost', 'Latest Cost', 'Latest Price'
// Fix: Map in the component OR update the API CHECK constraint

// CRITICAL: Attachment payload
// UI currently sends: FormData with field name 'files' (array)
// API expects: FormData with field name 'file' (single)
// Fix: Align one side (recommend: update API to accept 'files')

// CRITICAL: Supabase client import
// Browser/client components: import { createClient } from "@/lib/supabase/client"
// Server/API routes: import { createClient } from "@/lib/supabase/server"
```

---

## Implementation Blueprint

### Data Models and Structure

No new database tables needed. Existing types from `database.types.ts`:

```typescript
// From frontend/src/types/database.types.ts (source of truth)
// change_events.Row
interface ChangeEventRow {
  id: string;                        // UUID
  project_id: number;                // INTEGER (bigint) - FK to projects.id
  number: string;
  title: string;
  type: string;                      // CHECK constraint enum
  reason: string | null;
  scope: string;                     // CHECK constraint enum
  status: string;                    // CHECK constraint enum
  origin: string | null;
  expecting_revenue: boolean;
  line_item_revenue_source: string | null;
  prime_contract_id: number | null;  // INTEGER FK to contracts.id
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;        // UUID
  updated_by: string | null;        // UUID
  deleted_at: string | null;
}

// Zod validation (update existing validation.ts)
import { z } from "zod";

export const changeEventCreateSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum([
    "Owner Change", "Design Change", "Allowance", "Scope Gap",
    "Unforeseen Condition", "Value Engineering", "Owner Requested",
    "Constructability Issue"
  ]),
  scope: z.enum(["TBD", "In Scope", "Out of Scope", "Allowance"]),
  status: z.enum(["Open", "Pending Approval", "Approved", "Rejected", "Closed", "Converted"]).default("Open"),
  origin: z.string().nullable().optional(),
  reason: z.string().max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  expecting_revenue: z.boolean().default(true),
  line_item_revenue_source: z.string().nullable().optional(),
  prime_contract_id: z.number().nullable().optional(),
});

export const changeEventLineItemSchema = z.object({
  budget_code_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  vendor_id: z.string().uuid().nullable().optional(),
  contract_id: z.string().uuid().nullable().optional(),
  unit_of_measure: z.string().max(50).nullable().optional(),
  quantity: z.number().min(0).nullable().optional(),
  unit_cost: z.number().min(0).nullable().optional(),
  revenue_rom: z.number().min(0).nullable().optional(),
  cost_rom: z.number().min(0).nullable().optional(),
  non_committed_cost: z.number().min(0).nullable().optional(),
  sort_order: z.number().int().default(0),
});

export const changeEventApprovalSchema = z.object({
  approver_id: z.string().uuid(),
  role: z.string().min(1),
  decision: z.enum(["pending", "approved", "rejected"]).default("pending"),
  comment: z.string().nullable().optional(),
});
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: FIX API routes - Remove parseInt on UUID changeEventId
  - FILES:
    - frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts
    - frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/route.ts
    - frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/[lineItemId]/route.ts
    - frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/route.ts
    - frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]/route.ts
    - frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]/download/route.ts
    - frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/history/route.ts
  - FIX: In every route handler, change:
      const changeEventId = parseInt(params.changeEventId, 10);
    TO:
      const { changeEventId } = await params;  // Keep as UUID string
  - KEEP: parseInt(projectId, 10) for project_id (that IS an integer)
  - TEST: curl GET /api/projects/31/change-events/{uuid} returns data
  - FOLLOW pattern: frontend/src/app/api/projects/[projectId]/contracts/route.ts

Task 2: FIX attachment API - Accept 'files' field and handle multiple uploads
  - FILE: frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/route.ts
  - FIX: Change FormData field from 'file' to 'files', handle array of files
  - PATTERN:
      const formData = await request.formData();
      const files = formData.getAll('files') as File[];  // Accept array
      // If single file compatibility needed:
      const singleFile = formData.get('file') as File | null;
      const allFiles = singleFile ? [singleFile] : files;
  - TEST: Upload single and multiple files, verify stored in Supabase storage

Task 3: FIX detail/edit pages - Stop parseInt on UUID id param
  - FILES:
    - frontend/src/app/(main)/[projectId]/change-events/[id]/page.tsx
    - frontend/src/app/(main)/[projectId]/change-events/[id]/edit/page.tsx
  - FIX: Change:
      const changeEventId = parseInt(params.id);
    TO:
      const { id: changeEventId } = await params;  // Keep as UUID string
  - FIX: Update all fetch calls to use UUID string, not number
  - TEST: Navigate from list to detail page, verify data loads

Task 4: FIX create form - Submit via API instead of direct Supabase insert
  - FILES:
    - frontend/src/components/domain/change-events/ChangeEventForm.tsx
    - frontend/src/app/(main)/[projectId]/change-events/new/page.tsx
  - FIX: Replace direct supabase.from('change_events').insert() with:
      const response = await fetch(`/api/projects/${projectId}/change-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
  - FIX: Include line_item_revenue_source, expecting_revenue in the payload
  - FOLLOW pattern: frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx

Task 5: FIX revenue source enum mapping
  - FILE: frontend/src/components/domain/change-events/ChangeEventRevenueSection.tsx
  - FIX: Map UI slug values to API enum values:
      const REVENUE_SOURCE_MAP: Record<string, string> = {
        'match_latest_cost': 'Match Latest Cost',
        'percentage_markup': 'Percentage Markup',
        'manual_entry': 'Manual Entry',
        'fixed_amount': 'Fixed Amount',
      };
  - ALTERNATIVE: Update the DB CHECK constraint to accept slug values
  - RECOMMENDATION: Map in component (less risky than schema change)

Task 6: FIX attachment upload payload
  - FILE: frontend/src/components/domain/change-events/ChangeEventAttachmentsSection.tsx
  - FIX: Ensure FormData uses field name that matches API (after Task 2)
  - FIX: Ensure download/delete calls use UUID changeEventId, not parseInt

Task 7: CREATE approval API endpoints
  - FILE: frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/approvals/route.ts (NEW)
  - IMPLEMENT:
    - GET: List approvals for a change event
    - POST: Create approval request (approver, role, decision=pending)
    - PATCH: Update approval decision (approved/rejected with comment)
  - FOLLOW pattern: Other subroute patterns in change-events API
  - USE: change_event_approvals table (already exists)

Task 8: FIX approval workflow component
  - FILE: frontend/src/components/domain/change-events/ChangeEventApprovalWorkflow.tsx
  - FIX: Point to new approval API endpoints from Task 7
  - FIX: Replace hardcoded numeric approver IDs with UUID user references
  - FIX: Wire approval actions (approve/reject) to PATCH endpoint

Task 9: WIRE RFQ UI to existing endpoints
  - FILES:
    - frontend/src/components/domain/change-events/ChangeEventRfqForm.tsx
    - frontend/src/components/domain/change-events/ChangeEventRfqResponseForm.tsx
    - frontend/src/app/(main)/[projectId]/change-events/page.tsx (RFQ tab)
  - FIX: Wire form submissions to POST /rfqs and POST /rfqs/{rfqId}/responses
  - FIX: Wire list display to GET /rfqs
  - USE: useProjectChangeEventRfqs hook (already exists)

Task 10: FIX hooks for UUID consistency
  - FILES:
    - frontend/src/hooks/use-change-events.ts
    - frontend/src/hooks/use-change-event-rfqs.ts
  - FIX: Ensure all API calls use UUID strings for change event IDs
  - FIX: Ensure type definitions match database.types.ts

Task 11: UPDATE Zod validation schemas
  - FILE: frontend/src/app/api/projects/[projectId]/change-events/validation.ts
  - FIX: Ensure schemas match actual DB constraints
  - ADD: changeEventApprovalSchema for new approval endpoints
  - VERIFY: All enum values match DB CHECK constraints

Task 12: UPDATE & RUN E2E tests
  - FILES: frontend/tests/e2e/change-events-*.spec.ts
  - FIX: Update any parseInt references to use UUID strings
  - RUN: Full test suite after all fixes
  - VERIFY: Create, read, edit, delete workflows pass
  - ADD: Test for line item CRUD, attachment upload, approval workflow
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: API Route - Proper UUID handling
// File: Any route under /change-events/[changeEventId]/
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; changeEventId: string }> }
) {
  const { projectId, changeEventId } = await params;  // Next.js 15 async params
  const projectIdNum = parseInt(projectId, 10);        // project_id IS integer
  // changeEventId stays as string (UUID)              // entity ID is UUID

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('change_event_line_items')
    .select('*')
    .eq('change_event_id', changeEventId)  // UUID comparison
    .order('sort_order', { ascending: true });
  // ...
}

// PATTERN 2: Form submission via API (not direct Supabase)
// File: ChangeEventForm.tsx
const handleSubmit = async (formData: ChangeEventFormData) => {
  setIsSubmitting(true);
  try {
    const response = await fetch(`/api/projects/${projectId}/change-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.title,
        type: formData.type,
        scope: formData.scope,
        status: 'Open',
        origin: formData.origin || null,
        reason: formData.reason || null,
        description: formData.description || null,
        expecting_revenue: formData.expectingRevenue,
        line_item_revenue_source: formData.revenueSource
          ? REVENUE_SOURCE_MAP[formData.revenueSource]
          : null,
        prime_contract_id: formData.primeContractId || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create change event');
    }

    const newEvent = await response.json();
    toast.success('Change event created');
    router.push(`/${projectId}/change-events/${newEvent.id}`);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to create');
  } finally {
    setIsSubmitting(false);
  }
};

// PATTERN 3: Detail page - UUID param handling
// File: [id]/page.tsx
export default function ChangeEventDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const changeEventId = params.id as string;  // UUID string, NOT parseInt!

  useEffect(() => {
    const fetchDetail = async () => {
      const res = await fetch(`/api/projects/${projectId}/change-events/${changeEventId}`);
      // ...
    };
    fetchDetail();
  }, [projectId, changeEventId]);
}

// PATTERN 4: Approval endpoint (new)
// File: approvals/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; changeEventId: string }> }
) {
  const { projectId, changeEventId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('change_event_approvals')
    .select('*')
    .eq('change_event_id', changeEventId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; changeEventId: string }> }
) {
  const { changeEventId } = await params;
  const body = await request.json();
  const validated = changeEventApprovalSchema.parse(body);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('change_event_approvals')
    .insert({
      change_event_id: changeEventId,
      approver: validated.approver_id,
      role: validated.role,
      decision: validated.decision,
      comment: validated.comment || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

### Integration Points

```yaml
DATABASE:
  - NO new migrations needed (all 5 tables exist)
  - client: "@/lib/supabase/client" (browser), "@/lib/supabase/server" (API routes)
  - materialized view: change_events_summary (already refreshed by triggers)

CONFIG:
  - No new env vars needed
  - Existing Supabase credentials in .env.local

ROUTES:
  - Existing pages: /[projectId]/change-events/*
  - Existing API: /api/projects/[projectId]/change-events/*
  - NEW API: /api/projects/[projectId]/change-events/[changeEventId]/approvals/ (1 new route file)

NAVIGATION:
  - Already in menu: frontend/src/lib/menu-list.ts line 167
  - No navigation changes needed
```

---

## Validation Loop

### Level 1: Syntax & Style

```bash
cd frontend
npx tsc --noEmit                    # Zero TypeScript errors
npm run lint                        # Zero ESLint errors
```

### Level 2: Unit Tests

```bash
cd frontend
npm run test:unit -- --testPathPattern=change-events
```

### Level 3: Integration Testing

```bash
# Start dev server
cd frontend && npm run dev &
sleep 10

# Test API endpoints with UUIDs
curl -s http://localhost:3000/api/projects/31/change-events | jq '.data | length'
# Expected: number > 0

# Test detail endpoint with UUID
curl -s http://localhost:3000/api/projects/31/change-events/{ACTUAL_UUID} | jq '.title'
# Expected: actual title string

# Test line items endpoint
curl -s http://localhost:3000/api/projects/31/change-events/{ACTUAL_UUID}/line-items | jq '. | length'
# Expected: number >= 0 (not an error)

# Test history endpoint
curl -s http://localhost:3000/api/projects/31/change-events/{ACTUAL_UUID}/history | jq '. | length'
# Expected: number >= 0

# Production build
npm run build
# Expected: Successful build
```

### Level 4: E2E Testing

```bash
cd frontend

# Run change events E2E tests
npx playwright test tests/e2e/change-events-comprehensive.spec.ts --headed

# Run all change events tests
npx playwright test tests/e2e/change-events-*.spec.ts

# Full test suite
npm run test
```

---

## Final Validation Checklist

### Technical Validation
- [ ] All API routes use UUID strings for changeEventId (not parseInt)
- [ ] All API routes use parseInt for projectId (it IS integer)
- [ ] Next.js 15 async params: `await params` in all route handlers
- [ ] TypeScript compilation: `npx tsc --noEmit` = 0 errors
- [ ] ESLint: `npm run lint` = 0 errors
- [ ] Production build: `npm run build` succeeds

### Feature Validation
- [ ] List page loads and displays change events
- [ ] Detail page loads real data when clicking a row
- [ ] Create form submits via API and redirects to detail
- [ ] Edit form pre-populates and saves changes
- [ ] Line items: create, update, delete via grid
- [ ] Attachments: upload, download, delete
- [ ] History: shows audit trail entries
- [ ] Revenue source: correct values saved to DB
- [ ] Approval workflow: functional or cleanly disabled
- [ ] RFQ: create RFQ and submit response

### Code Quality Validation
- [ ] No direct Supabase inserts from frontend (all go through API)
- [ ] No parseInt on UUID values
- [ ] All error states handled with toast notifications
- [ ] Loading states shown during async operations
- [ ] Form validation with Zod schemas
- [ ] Consistent patterns across all API routes

### Testing Validation
- [ ] E2E: Create change event workflow passes
- [ ] E2E: Edit change event workflow passes
- [ ] E2E: Delete change event workflow passes
- [ ] E2E: Line item CRUD passes
- [ ] E2E: Attachment upload/download passes

---

## Anti-Patterns to Avoid

- **DO NOT** use `parseInt()` on UUID strings - this is THE root cause of 80% of bugs
- **DO NOT** insert directly into Supabase from frontend components - always go through API routes
- **DO NOT** hardcode user/approver IDs - use auth context
- **DO NOT** ignore the revenue source enum mismatch - map values explicitly
- **DO NOT** create new database tables - all schema exists and is deployed
- **DO NOT** change `project_id` type - it IS integer/bigint and matches `projects.id`
- **DO NOT** use generic `[id]` route parameter name - existing `[id]` is acceptable here since it's already deployed, but document that it refers to a UUID

---

## Procore Crawl Data Reference

### Existing Documentation

| Category | File | Path |
|----------|------|------|
| Tasks | Reality Checklist | `PRPs/finance-tools/change-events/TASKS-CHANGE-EVENTS.md` |
| Schema | Database Design | `PRPs/finance-tools/change-events/SCHEMA-ChangeEvents.md` |
| API | Endpoint Specs | `PRPs/finance-tools/change-events/API_ENDPOINTS-ChangeEvents.md` |
| Forms | Form Specs | `PRPs/finance-tools/change-events/FORMS-ChangeEvents.md` |
| UI | Component Breakdown | `PRPs/finance-tools/change-events/UI-ChangeEvents.md` |
| Plans | Implementation Plan | `PRPs/finance-tools/change-events/PLANS-ChangeEvents.md` |

### Procore Support Screenshots

| Page | Path |
|------|------|
| Budget Modification from CE | `scripts/screenshot-capture/outputs/procore-support-docs/pages/create-a-budget-modification-from-a-change-event/` |
| Budget Changes from CE | `scripts/screenshot-capture/outputs/procore-support-docs/pages/create-budget-changes-from-a-change-event/` |

### Test Screenshots

| Screenshot | Path |
|------------|------|
| List Page | `frontend/tests/screenshots/change-events-list-page.png` |
| Form Fields | `frontend/tests/screenshots/change-events-form-fields.png` |
| After Create | `frontend/tests/screenshots/change-events-after-create.png` |

---

**Confidence Score: 9/10**

The bugs are precisely identified with exact file locations and fix patterns. The only uncertainty is the approval workflow - whether to fully implement it or show a "coming soon" state depends on priority. All other fixes are mechanical (remove parseInt, change field names, map enums).
