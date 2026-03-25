# Punch List -- Fix & Completion PRP

## Current State

The punch list feature is approximately 5% implemented. Two page files exist (one placeholder stub, one mock-data table), extensive PRP/crawl documentation exists, but there is **no database table, no API routes, no hooks, no services, no domain components, and no E2E tests**.

### Working (DO NOT TOUCH)

- **`(tables)/punch-list/page.tsx`**: Static mock-data table page with DataTable, status/priority badges, and action dropdown. Uses hardcoded mock data. The UI structure and column definitions are a valid starting reference. Leave the component structure but it will need to be connected to real data.
- **Crawl data** in `docs/PRPs/punch-list/crawl/`: 50 pages captured including screenshots, DOM, and metadata for list view, new item form, configure tab, my items, recycle bin, and 43 PDF views. All intact and useful for implementation reference.
- **PRP documents**: Both the feature spec (`punch-list/index.mdx`) and execution plan (`execution-plan-punch-list/index.mdx`) are comprehensive and match Procore's actual implementation.
- **DataTable component** at `frontend/src/components/tables/DataTable.tsx`: Shared component used by the tables page. Works fine.

### Broken (FIX THESE)

| File | Error | Root Cause |
|------|-------|------------|
| `frontend/src/app/(main)/[projectId]/punch-list/page.tsx` | Uses deprecated `ProjectToolPage` wrapper | Must use `ProjectPageHeader` + `PageContainer` per Page Header Consistency Gate |
| `frontend/src/app/(main)/[projectId]/punch-list/page.tsx` | Placeholder "Coming soon" text, no functionality | No backend exists yet; page was stubbed out |
| `supabase/migrations/20260201053417_create_table_metadata.sql` (line 76) | References `punch_list` table that does not exist | Table metadata seed data references a nonexistent table |

### Missing (BUILD THESE)

#### Database Layer
- `punch_items` table (core entity) -- with columns: id, project_id, number, title, description, status, priority, assignee_id, assignee_company, punch_item_manager_id, final_approver_id, due_date, date_notified, date_closed, date_resolved, closed_by_id, location, trade, type, reference, ball_in_court, is_private, is_deleted (soft delete for recycle bin), created_at, updated_at, created_by, updated_by
- RLS policies for project-scoped access
- Indexes on project_id, status, assignee_id, created_at

#### API Layer
- `PunchItemService.ts` -- service class with list (paginated + filtered), getById, create, update, softDelete, restore, bulkUpdate methods
- `use-punch-items.ts` -- React Query hook wrapping the service
- `api/projects/[projectId]/punch-items/route.ts` -- GET (list) and POST (create)
- `api/projects/[projectId]/punch-items/[punchItemId]/route.ts` -- GET, PATCH, DELETE

#### UI Layer
- Rebuilt main page using `ProjectPageHeader` + `PageContainer`
- `punch-list-client.tsx` -- client component with DataTable, summary cards, tab views (My Items / All Items / Recycle Bin), search, filters
- Punch item form dialog (Create/Edit)
- Status badge component (Draft, Work Required, Initiated, Closed)
- Updated `(tables)/punch-list/page.tsx` connected to real data

#### Testing
- `tests/e2e/punch-list.spec.ts` -- full CRUD E2E tests per testing standards

## Database Schema

### Current State
No `punch_items` table exists. The `table_metadata` migration references `punch_list` but the actual data table was never created.

### Required Schema

```sql
CREATE TABLE IF NOT EXISTS punch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Core fields
    number INTEGER NOT NULL, -- auto-incrementing per project
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'work_required', 'initiated', 'closed')),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),

    -- Assignment fields
    assignee_id UUID REFERENCES auth.users(id),
    assignee_company TEXT,
    punch_item_manager_id UUID REFERENCES auth.users(id),
    final_approver_id UUID REFERENCES auth.users(id),
    ball_in_court TEXT,

    -- Date fields
    due_date DATE,
    date_notified TIMESTAMPTZ,
    date_closed TIMESTAMPTZ,
    date_resolved TIMESTAMPTZ,

    -- Categorization
    location TEXT,
    trade TEXT,
    type TEXT,
    reference TEXT,

    -- Metadata
    is_private BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false, -- soft delete for recycle bin
    closed_by_id UUID REFERENCES auth.users(id),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_punch_items_project_id ON punch_items(project_id);
CREATE INDEX idx_punch_items_status ON punch_items(status);
CREATE INDEX idx_punch_items_assignee_id ON punch_items(assignee_id);
CREATE INDEX idx_punch_items_created_at ON punch_items(created_at DESC);
CREATE INDEX idx_punch_items_is_deleted ON punch_items(is_deleted);
CREATE INDEX idx_punch_items_project_number ON punch_items(project_id, number);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_punch_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_punch_items_updated_at
    BEFORE UPDATE ON punch_items
    FOR EACH ROW
    EXECUTE FUNCTION update_punch_items_updated_at();

-- RLS (use scaffold pattern from .claude/scaffolds/crud-resource/migration.sql)
```

**CRITICAL FK NOTE:** `project_id` MUST be `INTEGER`, not UUID. The `projects.id` column is INTEGER.

## Implementation Tasks

See `TASKS.md` in this directory for the full task checklist.

## Context for Executing Agent

### Existing Code to Reference (not rewrite)

- **`frontend/src/app/(tables)/punch-list/page.tsx`**: Has a good DataTable column structure, status/priority badge rendering, and action menu. Use this as UI reference but the real page needs real data.
- **`frontend/src/app/(main)/[projectId]/rfis/page.tsx`** and related files: Working feature with similar CRUD pattern (list page, detail page, new page, API routes, hook). Follow this pattern.
- **`frontend/src/app/(main)/[projectId]/direct-costs/`**: Another working CRUD feature with client component, filters, summary cards, bulk actions. Good pattern reference.
- **`frontend/src/hooks/use-rfis.ts`**: Working React Query hook pattern.
- **`frontend/src/components/tables/DataTable.tsx`**: Shared DataTable component already used by the mock page.

### Patterns to Follow

1. **Page Header**: Use `ProjectPageHeader` + `PageContainer` from `@/components/layout` (NOT `ProjectToolPage`)
2. **API Routes**: Place under `api/projects/[projectId]/punch-items/` with `[punchItemId]` for detail routes
3. **Service Class**: Follow service pattern from existing services (pagination, error handling)
4. **Hook**: React Query with `useQuery` / `useMutation` pattern from `use-rfis.ts`
5. **Form**: React Hook Form + Zod validation
6. **Soft Delete**: Use `is_deleted` boolean column for recycle bin functionality
7. **Status Badges**: Color-coded badges matching Procore's scheme (Draft=gray, Work Required=orange, Initiated=blue, Closed=green)

### Known Pitfalls

From incident log and project rules:
- **FK Type Mismatch**: `project_id` MUST be INTEGER (not UUID). `projects.id` is INTEGER. This has caused multiple incidents.
- **Route Naming**: Use `[punchItemId]` NOT `[id]`. Generic `[id]` causes conflicts.
- **Next.js Cache**: After creating new routes, ALWAYS clear `.next` cache before testing.
- **Supabase Types**: ALWAYS run `npm run db:types` after migration and read the types before writing code.
- **Test Queries**: Test every Supabase query with `node -e` before claiming it works.

### Use Scaffolding

This is a greenfield CRUD entity. **Use `/create-feature PunchItem`** to generate the base files, then customize:
- Add punch-list-specific fields to migration
- Add status workflow logic to service
- Add tab views (My Items / All Items / Recycle Bin) to page
- Add filter system matching Procore's filters

## Validation

### Level 1: Static Analysis
- `npx tsc --noEmit` -- zero errors in punch-list files
- `npm run lint` -- zero warnings in punch-list files
- `npm run check:routes` -- no conflicts

### Level 2: Unit Tests
- Service methods return expected data shapes
- Hook properly wraps service calls

### Level 3: Integration
- Route check passes
- All Supabase queries tested with `node -e` and return data
- Dev server starts and page loads without errors
- Dev server page renders data from database

### Level 4: E2E Tests (per E2E Testing Standards)
- **Create**: Open form, fill all fields, submit, verify new record appears in table
- **Read**: Navigate to list, verify data renders with correct values and formatting
- **Edit**: Open existing record, change a field, save, verify update persists
- **Delete**: Soft-delete record, verify it moves to Recycle Bin, verify restore works
- **Validation**: Submit empty required fields, verify error messages appear
- **Filters**: Apply status/assignee filters, verify table updates correctly
