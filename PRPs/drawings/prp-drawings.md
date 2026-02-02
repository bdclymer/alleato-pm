# Drawings Feature - TypeScript PRP

name: "Drawings Feature Implementation"
description: "Implement Procore-equivalent Drawings tool with PDF upload, revision tracking, areas organization, viewer with markup, and drawing log table - replacing all hardcoded mock data with real database integration"

---

### Goal

**Feature Goal**: Transform the existing Drawings feature from a mock-data prototype into a fully functional production system with real database integration, file upload to Supabase Storage, revision tracking, hierarchical area organization, and a PDF viewer with markup support - matching Procore's Drawings tool.

**Deliverable**:
- 7 database tables applied and verified (drawing_areas, drawing_sets, drawings, drawing_revisions, drawing_sketches, drawing_downloads, drawing_related_items)
- 2 database views (drawing_log, drawing_areas_with_counts)
- DrawingService class following specifications pattern
- React Query hooks for all CRUD operations
- Upload dialog connected to real storage
- Drawing log table integrated with real data
- PDF viewer with markup/sketch support
- Areas management page with hierarchical tree
- E2E tests covering full CRUD workflows

**Success Definition**:
- Users can upload drawing PDFs and see them in the drawing log immediately
- Revision tracking maintains version history with current revision pointer
- Areas provide hierarchical folder organization for drawings
- Drawing viewer displays PDFs with zoom/pan/rotate and sketch overlay
- All mock data replaced with real Supabase queries
- Upload button on main page functional
- Production build succeeds with zero TypeScript errors
- E2E tests validate upload -> display -> revision -> delete workflow

### Why

**Business Value**:
- Centralizes construction drawing management across all project stakeholders
- Eliminates version confusion through automatic revision tracking (Procore pattern)
- Enables QR code sharing for field teams to access drawings on-site
- Provides download audit trail for compliance
- Reduces time searching for current drawing versions

**Integration with Existing Features**:
- Links to RFIs (drawings referenced in RFIs)
- Links to Submittals (drawing references on submittals)
- Links to Punch List (defects reference specific drawings)
- Uses existing `project_permissions` table for RLS (same pattern as specifications)
- Uses existing Supabase Storage `project-files` bucket

**Problems This Solves**:
- **Upload button is dead**: Currently has no onClick handler
- **All data is mock**: 100% hardcoded, no database queries
- **Two duplicate upload dialogs**: Need consolidation
- **DrawingLogTable not integrated**: Built but unused
- **Broken link path**: Board link uses wrong URL format
- **No service layer**: Hooks talk directly to non-existent tables

### What

**Pages**:
1. Main Drawing Log Page: `/(main)/[projectId]/drawings/page.tsx`
   - Table view with all drawings and current revision info
   - Search by drawing number, title
   - Filter by area, discipline, status, set
   - Upload button (primary action, opens upload dialog)
   - Detail panel with 6 tabs: General, Sketches, Download Log, Related Items, Emails, Change History
   - Viewer dialog for PDF preview

2. Areas Management Page: `/(main)/[projectId]/drawings/areas/page.tsx`
   - Hierarchical tree view of drawing areas
   - Add/edit/delete areas with drag-and-drop reorder
   - Drawing count per area

3. Revisions Page: `/(main)/[projectId]/drawings/revisions/page.tsx`
   - All revisions across drawings
   - Filter by drawing, set, date range

4. Board View: `/(main)/[projectId]/drawings/board/page.tsx`
   - Card/grid view of drawings (alternative to table)

5. Drawing Viewer: `/(main)/[projectId]/drawings/viewer/[drawingId]/page.tsx`
   - Full-screen PDF viewer with react-pdf
   - Zoom, pan, rotate, keyboard shortcuts
   - Sketch/markup overlay

**Database Schema** (migration exists: `20260131142854_add_drawings_system.sql`):

| Table | PK Type | Key Columns | FK References |
|-------|---------|-------------|---------------|
| `drawing_areas` | UUID | project_id (INTEGER), name, parent_area_id, sort_order | projects(id), drawing_areas(id) |
| `drawing_sets` | UUID | project_id (INTEGER), name, issued_at, status | projects(id) |
| `drawings` | UUID | project_id (INTEGER), area_id, drawing_number, title, discipline, drawing_type, current_revision_id | projects(id), drawing_areas(id), drawing_revisions(id) |
| `drawing_revisions` | UUID | drawing_id, revision_number, drawing_set_id, status, file_url, file_name, file_size, file_type, is_current_revision | drawings(id), drawing_sets(id) |
| `drawing_sketches` | UUID | drawing_revision_id, sketch_number, name, file_url | drawing_revisions(id) |
| `drawing_downloads` | UUID | drawing_revision_id, downloaded_by, downloaded_at | drawing_revisions(id) |
| `drawing_related_items` | UUID | drawing_id, related_type, related_id | drawings(id) |

**CRITICAL FK Type**: `project_id` is **INTEGER** (matches `projects.id`). All entity IDs are **UUID**.

**Views**:
- `drawing_log`: Joins drawings + current revision + area + set + uploader email
- `drawing_areas_with_counts`: Recursive CTE for hierarchical areas with drawing counts

**API Endpoints** (partially exist, need service layer integration):
- `GET/POST /api/projects/[projectId]/drawings` - List/create drawings
- `GET/POST /api/projects/[projectId]/drawings/[drawingId]/revisions` - List/create revisions
- `GET /api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/download` - Download file
- `GET/POST /api/projects/[projectId]/drawing-areas` - List/create areas
- `GET/PUT/DELETE /api/projects/[projectId]/drawing-areas/[areaId]` - Single area CRUD

**Components** (existing, need integration):
- `DrawingUploadDialog.tsx` (494 lines) - Hook-based upload with React Hook Form + Zod
- `upload-drawing-dialog.tsx` (387 lines) - DUPLICATE, must be consolidated
- `DrawingLogTable.tsx` (461 lines) - GenericDataTable with 15 columns, 6 filters, 3 bulk actions
- `DrawingViewer.tsx` (547 lines) - PDF viewer with react-pdf
- `DrawingAreaCard.tsx` - Area card component
- `DrawingAreaSelector.tsx` - Area dropdown selector

**Table Columns** (from Procore crawl):
| Column | Description |
|--------|-------------|
| Drawing No. | Unique identifier per project |
| Drawing Title | Descriptive title |
| Discipline | Category (Architectural, Structural, etc.) |
| Revision | Current revision letter/number |
| Set | Drawing set name |
| Drawing Date | Date on the drawing |
| Received Date | Date revision was received |
| Status | Under Review, Approved, Superseded, etc. |

**Upload Form Fields** (from Procore crawl):
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| File(s) | file | Yes | PDF, DWG, DXF accepted |
| Drawing Number | text | Yes | Auto-extracted from filename |
| Title | text | Yes | |
| Discipline | select | No | From DRAWING_DISCIPLINES constant |
| Drawing Type | select | No | From DRAWING_TYPES constant |
| Area | select | No | From drawing_areas |
| Set | select | No | From drawing_sets |
| Received Date | date | No | Defaults to today |

### Success Criteria

- [ ] Migration applied to database, types generated with drawings tables present
- [ ] DrawingService created following SpecificationService pattern
- [ ] Upload button on main page opens upload dialog and creates real records
- [ ] Drawing log table displays real data from drawing_log view
- [ ] Detail panel shows real revision history, sketches, downloads
- [ ] Areas page shows hierarchical tree with real data
- [ ] PDF viewer opens and renders uploaded drawing files
- [ ] Revision creation updates current_revision_id correctly (trigger verified)
- [ ] File upload to Supabase Storage works with RLS
- [ ] All mock data removed from drawings page
- [ ] Production build succeeds: `npm run build`
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] E2E tests pass for upload, view, revise, delete workflows

---

## All Needed Context

### Context Completeness Check

_This PRP was built from: (1) full codebase analysis of 40+ drawings files, (2) Procore crawl data with 25 UI actions and screenshots, (3) specifications feature as reference architecture, (4) migration SQL analysis, (5) incident log review. All context needed for one-pass implementation is included._

### Documentation & References

```yaml
# MUST READ - Pattern files
- file: frontend/src/services/SpecificationService.ts
  why: "Service class pattern - Result wrapper, pagination, Supabase client usage"
  pattern: "Class with static methods returning { data, error } Result wrapper"
  gotcha: "Must use createClient() from @/lib/supabase/server for API routes"

- file: frontend/src/hooks/use-specifications.ts
  why: "React Query hook pattern - query keys, mutations, cache invalidation"
  pattern: "useQuery/useMutation with hierarchical query keys ['drawings', projectId]"
  gotcha: "Must invalidate parent queries after mutations"

- file: frontend/src/app/api/projects/[projectId]/specifications/route.ts
  why: "API route pattern - async params, error handling, service layer calls"
  pattern: "const { projectId } = await params; // Next.js 15 async params"
  gotcha: "params must be awaited, projectId must be parsed to number"

- file: frontend/src/app/(main)/[projectId]/specifications/page.tsx
  why: "Page pattern - ProjectPageHeader, PageContainer, hook integration"
  pattern: "ProjectPageHeader + PageContainer layout, client component with hooks"
  gotcha: "Must use 'use client' directive for pages with hooks"

- file: frontend/src/components/drawings/DrawingLogTable.tsx
  why: "Already built table component using GenericDataTable factory"
  pattern: "15 columns, 6 filters, 3 bulk actions - wire to real data"
  gotcha: "Currently expects DrawingLogEntry type - must match drawing_log view"

- file: frontend/src/components/drawings/DrawingUploadDialog.tsx
  why: "Primary upload dialog - keep this, delete upload-drawing-dialog.tsx"
  pattern: "React Hook Form + Zod, useDrawingUpload hook, multi-file support"
  gotcha: "References tables that don't exist yet - needs migration applied first"

- file: frontend/src/types/drawings.types.ts
  why: "Domain types with temporary definitions and Zod schemas"
  pattern: "Must update to extend generated Supabase types after migration"
  gotcha: "Lines 11-12 say 'Temporary type definitions until migration is applied'"

- file: supabase/migrations/20260131142854_add_drawings_system.sql
  why: "Complete migration with 7 tables, 2 views, RLS policies, triggers"
  pattern: "project_id INTEGER, entity IDs UUID, project_permissions for RLS"
  gotcha: "Migration exists but NOT applied - database.types.ts has 0 drawings refs"

- file: PRPs/pm-tools/drawings/crawl-drawings/spec/COMMANDS.md
  why: "25 UI actions from Procore crawl"
  pattern: "Upload, Export, Filter, Search, Markup, Download, QR Code, etc."

- file: PRPs/pm-tools/drawings/crawl-drawings/spec/FORMS.md
  why: "Form field definitions from Procore"
  pattern: "8 core fields: drawing_no, title, discipline, revision, set, dates, status"
```

### Current Codebase Tree (drawings-related files)

```
frontend/src/
├── app/
│   ├── (main)/[projectId]/drawings/
│   │   ├── page.tsx                    # Main page (1372 lines, ALL MOCK DATA)
│   │   ├── areas/page.tsx              # Areas management page
│   │   ├── board/page.tsx              # Board/grid view
│   │   ├── revisions/page.tsx          # All revisions view
│   │   └── viewer/[drawingId]/page.tsx # PDF viewer page
│   ├── (tables)/drawings/page.tsx      # Table view (MOCK DATA)
│   └── api/projects/[projectId]/
│       ├── drawings/
│       │   ├── route.ts                # GET/POST drawings
│       │   ├── [drawingId]/revisions/
│       │   │   ├── route.ts            # GET/POST revisions
│       │   │   └── [revisionId]/download/route.ts
│       │   └── __tests__/route.test.ts
│       └── drawing-areas/
│           ├── route.ts                # GET/POST areas
│           └── [areaId]/route.ts       # GET/PUT/DELETE area
├── components/drawings/
│   ├── DrawingUploadDialog.tsx         # KEEP - hook-based upload (494 lines)
│   ├── upload-drawing-dialog.tsx       # DELETE - duplicate (387 lines)
│   ├── DrawingLogTable.tsx             # INTEGRATE - GenericDataTable (461 lines)
│   ├── DrawingViewer.tsx               # KEEP - PDF viewer (547 lines)
│   ├── DrawingAreaCard.tsx             # KEEP - area card
│   ├── DrawingAreaSelector.tsx         # KEEP - area dropdown
│   └── __tests__/                      # Unit tests
├── hooks/
│   ├── use-drawing-upload.ts           # Upload hook (needs DB tables)
│   ├── use-drawing-areas.ts            # Areas CRUD hook (needs DB tables)
│   └── __tests__/                      # Unit tests
├── services/                           # NO DrawingService exists!
└── types/
    └── drawings.types.ts               # Temporary types (needs migration)
```

### Desired Codebase Tree (files to add/modify)

```
frontend/src/
├── services/
│   └── DrawingService.ts               # NEW - Service class (follows SpecificationService)
├── hooks/
│   ├── use-drawings.ts                 # NEW - Main CRUD hooks (list, create, update, delete)
│   ├── use-drawing-revisions.ts        # NEW - Revision hooks
│   ├── use-drawing-upload.ts           # MODIFY - Wire to DrawingService
│   └── use-drawing-areas.ts            # MODIFY - Wire to DrawingService
├── types/
│   └── drawings.types.ts               # MODIFY - Replace temp types with generated types
├── components/drawings/
│   ├── DrawingUploadDialog.tsx          # MODIFY - Wire to real hooks
│   ├── upload-drawing-dialog.tsx        # DELETE - consolidate into above
│   └── DrawingLogTable.tsx              # MODIFY - Wire to real data
├── app/(main)/[projectId]/drawings/
│   ├── page.tsx                         # MODIFY - Replace mock data with hooks
│   ├── areas/page.tsx                   # MODIFY - Wire to real data
│   └── board/page.tsx                   # MODIFY - Wire to real data
├── app/(tables)/drawings/page.tsx       # MODIFY - Wire to real data
└── tests/e2e/
    └── drawings.spec.ts                # NEW - E2E tests
```

### Known Gotchas of our Codebase & Library Quirks

```typescript
// CRITICAL: Next.js 15 - params must be awaited
const { projectId } = await params; // NOT destructured directly

// CRITICAL: project_id is INTEGER, NOT UUID
// projects.id is number in database.types.ts
// All project_id FKs must be INTEGER in migrations

// CRITICAL: Supabase client differs by context
// Browser: import { createClient } from "@/lib/supabase/client" (singleton)
// Server/API: import { createClient } from "@/lib/supabase/server" (per-request)

// CRITICAL: RLS uses project_permissions table, NOT project_members
// Pattern: EXISTS (SELECT 1 FROM project_permissions WHERE project_id = X AND user_id = auth.uid())

// CRITICAL: GenericDataTable expects specific type shape
// DrawingLogTable uses GenericDataTable factory - data must match DrawingLogEntry interface

// CRITICAL: File upload requires storage RLS policies
// Storage bucket "project-files" exists but needs RLS policies applied
// See: supabase/migrations/20260201000002_add_storage_rls_policies.sql

// GOTCHA: Drawing viewer uses react-pdf which needs special Next.js config
// pdfjs worker must be configured in next.config.js

// GOTCHA: Two upload dialogs exist - consolidate into DrawingUploadDialog.tsx
// Delete upload-drawing-dialog.tsx after merging any unique functionality

// GOTCHA: Broken link on main page line ~596
// href={`/projects/${projectId}/drawings/board`} should be `/${projectId}/drawings/board`
```

---

## Implementation Blueprint

### Data Models and Structure

```typescript
// After migration is applied, types come from database.types.ts
// These are the key interfaces for the domain layer:

// From drawing_log view (main list query)
interface DrawingLogEntry {
  id: string;                    // drawing UUID
  project_id: number;
  area_id: string | null;
  drawing_number: string;
  title: string;
  discipline: string | null;
  drawing_type: string | null;
  drawing_created_at: string;
  drawing_updated_at: string;
  revision_id: string | null;    // current revision
  revision_number: string | null;
  drawing_date: string | null;
  received_date: string | null;
  status: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  revision_description: string | null;
  uploaded_by: string | null;
  revision_created_at: string | null;
  area_name: string | null;
  set_name: string | null;
  uploaded_by_email: string | null;
}

// Zod schemas (extend existing in drawings.types.ts)
const drawingCreateSchema = z.object({
  drawing_number: z.string().min(1),
  title: z.string().min(1),
  discipline: z.string().optional(),
  drawing_type: z.string().optional(),
  area_id: z.string().uuid().optional(),
});

const revisionCreateSchema = z.object({
  drawing_id: z.string().uuid(),
  revision_number: z.string().min(1),
  drawing_set_id: z.string().uuid().optional(),
  drawing_date: z.string().optional(),
  received_date: z.string(),
  status: z.enum(['draft', 'under_review', 'approved', 'superseded', 'void']),
  file: z.instanceof(File),
  description: z.string().optional(),
});
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: APPLY Database Migration
  - EXECUTE: Apply 20260131142854_add_drawings_system.sql via Supabase MCP
  - VERIFY: Run npm run db:types and confirm drawings tables in database.types.ts
  - CRITICAL: This unblocks ALL other tasks
  - BLOCKER: Nothing else can proceed until types are generated

Task 2: UPDATE Domain Types (drawings.types.ts)
  - MODIFY: frontend/src/types/drawings.types.ts
  - IMPLEMENT: Replace temporary type definitions with generated Supabase types
  - KEEP: Existing Zod schemas, constants (DRAWING_DISCIPLINES, DRAWING_TYPES)
  - ADD: DrawingLogEntry type matching drawing_log view columns
  - FOLLOW pattern: frontend/src/types/specifications.types.ts

Task 3: CREATE DrawingService
  - CREATE: frontend/src/services/DrawingService.ts
  - IMPLEMENT: Service class with Result wrapper pattern
  - METHODS: list (from drawing_log view), getById, create, update, delete
  - METHODS: listRevisions, createRevision, getCurrentRevision
  - METHODS: listSketches, createSketch
  - METHODS: recordDownload, listDownloads
  - METHODS: linkRelatedItem, unlinkRelatedItem, listRelatedItems
  - FOLLOW pattern: frontend/src/services/SpecificationService.ts
  - USES: createClient from @/lib/supabase/server (for API routes)
  - NAMING: Static methods, Result<T> return type

Task 4: CREATE DrawingAreaService
  - CREATE: frontend/src/services/DrawingAreaService.ts
  - IMPLEMENT: Areas CRUD with hierarchical support
  - METHODS: list (from drawing_areas_with_counts view), create, update, delete, reorder
  - FOLLOW pattern: frontend/src/services/SpecificationAreaService.ts

Task 5: CREATE DrawingSetService
  - CREATE: frontend/src/services/DrawingSetService.ts
  - IMPLEMENT: Drawing sets CRUD
  - METHODS: list, create, update, archive

Task 6: UPDATE API Routes to Use Services
  - MODIFY: frontend/src/app/api/projects/[projectId]/drawings/route.ts
  - MODIFY: frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/route.ts
  - MODIFY: frontend/src/app/api/projects/[projectId]/drawing-areas/route.ts
  - IMPLEMENT: Replace direct Supabase calls with service layer calls
  - PATTERN: const { projectId } = await params; const numericProjectId = parseInt(projectId);
  - ADD: Missing routes for sets, sketches, downloads, related items

Task 7: CREATE Main CRUD Hooks (use-drawings.ts)
  - CREATE: frontend/src/hooks/use-drawings.ts
  - IMPLEMENT: useDrawings (list), useDrawing (single), useCreateDrawing, useUpdateDrawing, useDeleteDrawing
  - FOLLOW pattern: frontend/src/hooks/use-specifications.ts
  - QUERY KEYS: ['drawings', projectId], ['drawings', projectId, drawingId]

Task 8: CREATE Revision Hooks (use-drawing-revisions.ts)
  - CREATE: frontend/src/hooks/use-drawing-revisions.ts
  - IMPLEMENT: useDrawingRevisions (list), useCreateRevision, useDownloadRevision
  - QUERY KEYS: ['drawings', projectId, drawingId, 'revisions']

Task 9: UPDATE Existing Hooks
  - MODIFY: frontend/src/hooks/use-drawing-upload.ts - Wire to API routes via fetch
  - MODIFY: frontend/src/hooks/use-drawing-areas.ts - Wire to API routes via fetch
  - PATTERN: fetch(`/api/projects/${projectId}/drawings`, { method, body })

Task 10: DELETE Duplicate Upload Dialog
  - DELETE: frontend/src/components/drawings/upload-drawing-dialog.tsx
  - VERIFY: DrawingUploadDialog.tsx has all needed functionality
  - UPDATE: Any imports referencing deleted file

Task 11: WIRE DrawingUploadDialog to Real Hooks
  - MODIFY: frontend/src/components/drawings/DrawingUploadDialog.tsx
  - IMPLEMENT: Connect form submission to useCreateDrawing + useCreateRevision
  - IMPLEMENT: File upload to Supabase Storage via useDrawingUpload
  - VERIFY: Upload creates drawing record, uploads file, creates revision record

Task 12: WIRE DrawingLogTable to Real Data
  - MODIFY: frontend/src/components/drawings/DrawingLogTable.tsx
  - VERIFY: DrawingLogEntry type matches drawing_log view output
  - UPDATE: Any type mismatches between component and real data

Task 13: REWRITE Main Drawings Page (LARGEST TASK)
  - MODIFY: frontend/src/app/(main)/[projectId]/drawings/page.tsx
  - REMOVE: ALL hardcoded mock data (~800 lines of constants)
  - INTEGRATE: useDrawings hook for table data
  - INTEGRATE: DrawingLogTable component for main table
  - INTEGRATE: DrawingUploadDialog with working onClick handler
  - INTEGRATE: Detail panel with real revision, sketch, download data
  - FIX: Board link href from /projects/${projectId} to /${projectId}
  - KEEP: Layout structure, detail panel tabs, viewer dialog
  - PATTERN: ProjectPageHeader + PageContainer

Task 14: UPDATE Areas Page
  - MODIFY: frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx
  - WIRE: To useDrawingAreas hook with real data
  - IMPLEMENT: Add/edit/delete area functionality

Task 15: UPDATE Table View Page
  - MODIFY: frontend/src/app/(tables)/drawings/page.tsx
  - REMOVE: Mock data
  - WIRE: To useDrawings hook

Task 16: CREATE E2E Tests
  - CREATE: frontend/tests/e2e/drawings.spec.ts
  - IMPLEMENT: Full CRUD workflow tests following E2E-TESTING-STANDARDS
  - TESTS: Upload drawing -> verify in table -> create revision -> view in viewer -> delete
  - TESTS: Create area -> assign drawing -> verify count -> delete area
  - TESTS: Filter by discipline, status, area
  - CLEANUP: Delete test data in afterAll
  - AUTH: Use saved auth state (tests/.auth/user.json)
```

### Implementation Patterns & Key Details

```typescript
// DrawingService pattern (follows SpecificationService)
import { createClient } from "@/lib/supabase/server";

type Result<T> = { data: T | null; error: string | null };

export class DrawingService {
  static async list(projectId: number, filters?: DrawingFilters): Promise<Result<DrawingLogEntry[]>> {
    const supabase = await createClient();
    let query = supabase
      .from('drawing_log')
      .select('*')
      .eq('project_id', projectId);

    if (filters?.area_id) query = query.eq('area_id', filters.area_id);
    if (filters?.discipline) query = query.eq('discipline', filters.discipline);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.search) {
      query = query.or(`drawing_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('drawing_number');
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  static async create(projectId: number, input: DrawingCreateInput): Promise<Result<Drawing>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('drawings')
      .insert({
        project_id: projectId,  // INTEGER, not UUID
        drawing_number: input.drawing_number,
        title: input.title,
        discipline: input.discipline,
        drawing_type: input.drawing_type,
        area_id: input.area_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  static async createRevision(drawingId: string, input: RevisionCreateInput): Promise<Result<DrawingRevision>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('drawing_revisions')
      .insert({
        drawing_id: drawingId,
        revision_number: input.revision_number,
        drawing_set_id: input.drawing_set_id,
        drawing_date: input.drawing_date,
        received_date: input.received_date,
        status: input.status || 'under_review',
        file_url: input.file_url,
        file_name: input.file_name,
        file_size: input.file_size,
        file_type: input.file_type,
        is_current_revision: true, // Trigger handles unsetting others
        description: input.description,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }
}

// Hook pattern (follows use-specifications.ts)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useDrawings(projectId: number | string, filters?: DrawingFilters) {
  return useQuery({
    queryKey: ['drawings', String(projectId), filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.area_id) params.set('area_id', filters.area_id);
      if (filters?.discipline) params.set('discipline', filters.discipline);
      if (filters?.status) params.set('status', filters.status);

      const res = await fetch(`/api/projects/${projectId}/drawings?${params}`);
      if (!res.ok) throw new Error('Failed to fetch drawings');
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useCreateDrawing(projectId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DrawingCreateInput) => {
      const res = await fetch(`/api/projects/${projectId}/drawings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create drawing');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawings', String(projectId)] });
    },
  });
}

// API route pattern (Next.js 15 async params)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const numericProjectId = parseInt(projectId, 10);
  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const result = await DrawingService.list(numericProjectId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
```

### Integration Points

```yaml
DATABASE:
  - migration: "supabase/migrations/20260131142854_add_drawings_system.sql (EXISTS, NOT APPLIED)"
  - client: "@/lib/supabase/client" (browser), "@/lib/supabase/server" (API routes)
  - storage: "project-files" bucket (existing)
  - RLS: project_permissions table join pattern

STORAGE:
  - bucket: "project-files"
  - path pattern: "drawings/{projectId}/{drawingId}/{filename}"
  - RLS: Needs storage policies (see 20260201000002_add_storage_rls_policies.sql)

ROUTES:
  - pages: app/(main)/[projectId]/drawings/*
  - API: app/api/projects/[projectId]/drawings/*
  - API: app/api/projects/[projectId]/drawing-areas/*
  - param: [projectId] (NEVER [id])
  - param: [drawingId] for drawing detail routes
  - param: [areaId] for area detail routes

STATE:
  - React Query for server state
  - URL search params for filters
  - Zustand for drawer/panel state (if needed)
```

---

## Validation Loop

### Level 1: Syntax & Style

```bash
# After each file creation
cd /Users/meganharrison/Documents/github/alleato-procore/frontend
npx tsc --noEmit
npm run lint
```

### Level 2: Database Verification

```bash
# After migration applied
npm run db:types
grep -c "drawing" src/types/database.types.ts  # Should be 50+

# Test query
node -e '
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await supabase.from("drawing_log").select("*").limit(1);
  if (error) { console.error("QUERY FAILED:", error); process.exit(1); }
  console.log("QUERY WORKS - drawing_log accessible");
})();
'
```

### Level 3: Integration Testing

```bash
# Dev server validation
cd /Users/meganharrison/Documents/github/alleato-procore/frontend
rm -rf .next
npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10
tail -20 /tmp/nextjs-dev.log  # Verify "Ready"

# Page load
curl -I http://localhost:3000/67/drawings  # Should be 200
```

### Level 4: E2E Testing

```bash
cd /Users/meganharrison/Documents/github/alleato-procore/frontend
npx playwright test tests/e2e/drawings.spec.ts --headed
```

---

## Final Validation Checklist

### Technical
- [ ] Migration applied: `drawing_areas`, `drawings`, etc. exist in database
- [ ] Types generated: `database.types.ts` has 50+ drawing references
- [ ] TypeScript passes: `npx tsc --noEmit` (0 errors)
- [ ] Lint passes: `npm run lint` (0 errors)
- [ ] Build passes: `npm run build` (success)

### Feature
- [ ] Upload button works: opens dialog, creates real records
- [ ] Drawing log table shows real data from database
- [ ] Detail panel shows real revisions, sketches, downloads
- [ ] Areas page shows hierarchical tree with drawing counts
- [ ] PDF viewer renders uploaded files
- [ ] Revision tracking updates current_revision_id
- [ ] Search and filter work on drawing log
- [ ] File download generates signed URL

### Code Quality
- [ ] DrawingService follows SpecificationService pattern
- [ ] All hooks follow React Query patterns
- [ ] API routes use async params pattern
- [ ] All mock data removed
- [ ] Duplicate upload dialog deleted
- [ ] Broken link paths fixed

### Testing
- [ ] E2E upload test passes
- [ ] E2E revision test passes
- [ ] E2E area management test passes
- [ ] E2E filter/search test passes
- [ ] All test data cleaned up

---

## Anti-Patterns to Avoid

- **DO NOT** use UUID for project_id (it's INTEGER)
- **DO NOT** skip migration application and write against mock types
- **DO NOT** create new upload dialog - consolidate existing ones
- **DO NOT** use `[id]` in route params - use `[drawingId]`, `[areaId]`
- **DO NOT** call Supabase directly from hooks - go through API routes and service layer
- **DO NOT** forget to clear `.next` cache after creating/modifying routes
- **DO NOT** skip storage RLS policies - uploads will fail silently
- **DO NOT** write tests that only check page load - full CRUD workflows required

---

## Procore Crawl Data Reference

### Sitemap

| Page | Description | Screenshot Directory |
|------|-------------|---------------------|
| Drawing Log | Main table view with all drawings | `drawings-areas` |
| Drawing Viewer | Fullscreen PDF viewer with tools | `drawings-viewer-fullscreen` |
| Revisions | Revision list for a drawing | `drawings-revisions` |
| Areas | Hierarchical area management | `drawings-areas` |

### Crawl Data Files

| Category | File | Path | Description |
|----------|------|------|-------------|
| Spec | Commands | `spec/COMMANDS.md` | 25 UI actions discovered |
| Spec | Forms | `spec/FORMS.md` | Upload/edit form fields |
| Spec | Schema | `spec/schema.sql` | Inferred database schema |
| Spec | Mutations | `spec/MUTATIONS.md` | Behavior specifications |
| Pages | Areas | `pages/drawings-areas/` | Areas view screenshot |
| Pages | Revisions | `pages/drawings-revisions/` | Revisions list screenshot |
| Pages | Viewer | `pages/drawings-viewer-fullscreen/` | Fullscreen viewer screenshot |

**Base Path**: `PRPs/pm-tools/drawings/crawl-drawings/`

### Key UI Elements from Procore Screenshots

**Drawing Log View:**
- Table with columns: Drawing No., Title, Discipline, Revision, Set, Drawing Date, Received Date, Status
- Upload button (top right)
- Filter bar with discipline, status, area, set filters
- Export dropdown (CSV, PDF)
- Bulk actions on selected rows

**Viewer:**
- PDF rendering with zoom controls
- Markup/sketch tools
- Info panel toggle
- Download button
- QR code generation tab
- Revision selector dropdown

**Areas:**
- Hierarchical tree with expand/collapse
- Drawing count per area
- Edit/Delete dropdown on each area
- Add Drawing Area button
- Create Locations button

### UI Components Detected

| Label | Command Key |
|-------|-------------|
| Upload | `upload` |
| Add Drawing Area | `add_drawing_area` |
| Export | `export` |
| Filter | `filter` |
| Download | `download` |
| Markup | `markup` |
| Info | `info` |
| Search | `search` |
| Sketches | `sketches` |
| QR Code | tab |
| Edit | `edit` |
| Delete | `delete` |
| CSV Export | `csv` |
| PDF Export | `pdf` |
| Reports | `reports` |
