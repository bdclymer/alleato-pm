---
title: PRP: Drawings Management System
description: Implement a comprehensive drawing management system that enables construction teams to upload, organize, version, and share architectural drawings with full revision tracking and collaboration capabilities.

keywords: ["prp", "drawings"]
---

## Goal

**Feature Goal**: Implement a comprehensive drawing management system that enables construction teams to upload, organize, version, and share architectural drawings with full revision tracking and collaboration capabilities.

**Deliverable**: A complete React/Next.js module with drawing areas (folders), file upload, revision control, PDF viewer, and collaboration tools integrated into the existing Alleato project management platform.

**Success Definition**: Users can upload drawings, organize them in hierarchical folders, track revisions with version history, view PDFs in-browser, share via QR codes, and link drawings to other project items with full audit trails.

## Why

**Business Value**: Construction projects require meticulous drawing management to ensure all teams work from the correct, most current plans. Version control prevents costly mistakes from outdated drawings, while organized folders enable quick access to specific plans during field work.

**Integration**: Drawings serve as the foundation for RFIs, submittals, change orders, and daily logs. This feature integrates with existing tools to provide a single source of truth for project documentation.

**Problems Solved**:

- Eliminates confusion from multiple drawing versions in circulation
- Prevents rework from outdated plans
- Enables field access via mobile devices and QR codes
- Provides audit trail for compliance and dispute resolution

## What

### Pages

- `/[projectId]/drawings/areas` - Drawing areas/folders management
- `/[projectId]/drawings/revisions` - Drawing log table with all revisions
- `/[projectId]/drawings/viewer/[drawingId]` - Full-screen PDF viewer
- `/[projectId]/drawings/[drawingId]` - Drawing detail page with tabs

### Database Schema

```sql
-- Core tables
drawing_areas (id, project_id, parent_area_id, name, description, sort_order)
drawing_sets (id, project_id, name, issued_at, status)
drawings (id, project_id, area_id, drawing_number, title, discipline, drawing_type)
drawing_revisions (id, drawing_id, revision_number, drawing_set, file_url, status, is_current)
drawing_sketches (id, drawing_revision_id, sketch_number, name, file_url)
drawing_downloads (id, drawing_revision_id, downloaded_by, downloaded_at)
drawing_related_items (id, drawing_id, related_type, related_id)
```

### API Endpoints
- Drawing areas CRUD: `/api/projects/[projectId]/drawing-areas`
- Drawings CRUD: `/api/projects/[projectId]/drawings`
- Revisions management: `/api/projects/[projectId]/drawings/[drawingId]/revisions`
- File operations: upload, download, qr-code generation
- Export functionality: PDF batch, CSV metadata

### Components
- `DrawingAreaSelector` - Hierarchical folder tree with create/edit
- `DrawingLogTable` - GenericDataTable with filters and bulk operations
- `DrawingViewer` - PDF.js-based viewer with navigation controls
- `DrawingUploadDialog` - Drag-drop upload with metadata form
- `RevisionHistory` - Timeline view of all versions
- `QRCodeModal` - Generate and display QR codes for field access

### Special Features
- Hierarchical folder organization with drag-drop reordering
- Multi-file upload with automatic revision detection
- Side-by-side revision comparison
- OCR text extraction for searchability
- Mobile-optimized viewer with pinch-zoom
- Email forwarding with attachments
- Audit trail for all operations

### Table Columns
Drawing Log Table:
- Drawing Number, Title, Revision, Discipline, Type
- Drawing Date, Received Date, Set, Status
- Created By, Modified Date, Actions

### Form Fields
Upload Drawing Form:
- File* (drag-drop zone)
- Drawing Number* (auto-detect from filename)
- Title*
- Discipline (dropdown: Architectural, Structural, MEP, etc.)
- Type (dropdown: Plan, Section, Detail, etc.)
- Revision (default: A)
- Drawing Date
- Received Date (defaults to today)
- Drawing Set (searchable dropdown)
- Description (rich text)

## Success Criteria

- [ ] Users can create hierarchical drawing areas/folders
- [ ] Multi-file upload with drag-drop works smoothly
- [ ] Revision tracking maintains complete version history
- [ ] PDF viewer loads large files efficiently (<3s for 50MB)
- [ ] QR codes work on mobile devices in the field
- [ ] Search finds drawings by number, title, or OCR text
- [ ] Export generates formatted PDF/CSV reports
- [ ] Audit trail captures all user actions
- [ ] Related items link to RFIs, submittals, etc.
- [ ] Email sharing includes proper attachments

## All Needed Context

### Documentation & References

```yaml
# Must Read - Core Documentation
- url: https://react-pdf.org/advanced#on-demand-rendering
  why: PDF.js lazy loading patterns for large drawings
  critical: Use virtualization for thumbnails, load pages on-demand

- url: https://github.com/wojtekmaj/react-pdf/tree/main/packages/react-pdf
  why: React-PDF v9 implementation patterns
  critical: Server component constraints, client-only rendering required

- url: https://pdfjs.express/documentation/web/guides/basics/opening
  why: PDF.js Express viewer implementation
  critical: Commercial license provides better performance for CAD drawings

- file: frontend/src/components/tables/generic-table-factory.tsx
  why: Table pattern for drawing log implementation
  pattern: Column definitions, filters, row actions, export handlers
  gotcha: Use TableLayout wrapper for responsive behavior

- file: frontend/src/hooks/use-supabase-upload.ts
  why: Existing file upload pattern with Supabase storage
  pattern: Progress tracking, error handling, metadata storage
  gotcha: Max file size limits, bucket configuration

- file: frontend/src/app/(main)/[projectId]/commitments/page.tsx
  why: Best example of table page with filters and actions
  pattern: Server components, data fetching, table configuration
  gotcha: Client boundary for interactive features

- file: frontend/src/components/budget/budget-table.tsx
  why: Hierarchical tree expansion pattern
  pattern: Depth padding, expand/collapse state, nested data
  gotcha: Performance with deep nesting levels

- docfile: docs/file-upload-storage-patterns.md
  why: Comprehensive file handling patterns documented
  section: Storage paths, metadata structure, error handling

- docfile: docs/pdf-viewer-libraries.md
  why: PDF viewer comparison and implementation guide
  section: React-PDF setup, performance optimization
```

### Current Codebase Tree

```bash
frontend/src/
├── app/
│   ├── (main)/
│   │   └── [projectId]/
│   │       ├── drawings/           # Existing basic implementation
│   │       │   └── page.tsx
│   │       └── ...
│   └── api/
│       └── projects/
│           └── [projectId]/
│               └── drawings/        # Basic API routes exist
├── components/
│   ├── tables/
│   │   └── generic-table-factory.tsx
│   ├── ui/
│   │   ├── file-upload.tsx
│   │   └── section-card.tsx
│   └── forms/
│       └── FileUploadField.tsx
├── hooks/
│   ├── use-supabase-upload.ts
│   └── use-drawings.ts            # Existing basic hook
└── types/
    └── database.types.ts
```

### Desired Codebase Tree with Files

```bash
frontend/src/
├── app/
│   ├── (main)/
│   │   └── [projectId]/
│   │       └── drawings/
│   │           ├── areas/
│   │           │   └── page.tsx          # Drawing folders management
│   │           ├── revisions/
│   │           │   └── page.tsx          # All revisions log table
│   │           ├── viewer/
│   │           │   └── [drawingId]/
│   │           │       └── page.tsx      # PDF viewer page
│   │           ├── [drawingId]/
│   │           │   └── page.tsx          # Drawing detail page
│   │           └── page.tsx              # Main drawings page (redirect)
│   └── api/
│       └── projects/
│           └── [projectId]/
│               ├── drawing-areas/
│               │   ├── route.ts          # Areas CRUD
│               │   └── [areaId]/
│               │       └── route.ts
│               └── drawings/
│                   ├── route.ts          # Drawings CRUD
│                   ├── export/
│                   │   └── route.ts      # Export handler
│                   └── [drawingId]/
│                       ├── route.ts
│                       ├── revisions/
│                       │   ├── route.ts
│                       │   └── [revisionId]/
│                       │       ├── route.ts
│                       │       ├── download/
│                       │       │   └── route.ts
│                       │       └── qr-code/
│                       │           └── route.ts
│                       └── related-items/
│                           └── route.ts
├── components/
│   └── drawings/
│       ├── DrawingAreaSelector.tsx      # Folder tree component
│       ├── DrawingAreaCard.tsx          # Individual folder card
│       ├── DrawingLogTable.tsx          # Main table configuration
│       ├── DrawingUploadDialog.tsx      # Upload with metadata
│       ├── DrawingViewer.tsx            # PDF viewer wrapper
│       ├── DrawingViewerControls.tsx    # Viewer toolbar
│       ├── DrawingRevisionHistory.tsx   # Version timeline
│       ├── DrawingDetailTabs.tsx        # Tabbed detail view
│       ├── DrawingQRCodeModal.tsx       # QR generation
│       ├── DrawingEmailDialog.tsx       # Email sharing
│       └── DrawingExportDialog.tsx      # Export options
├── hooks/
│   ├── use-drawing-areas.ts             # Areas CRUD operations
│   ├── use-drawings.ts                  # Enhanced with revisions
│   ├── use-drawing-upload.ts            # Upload handling
│   └── use-drawing-viewer.ts            # Viewer state management
├── lib/
│   ├── drawing-utils.ts                 # Helper functions
│   └── pdf-viewer-config.ts             # PDF.js configuration
└── types/
    └── drawings.types.ts                 # TypeScript interfaces
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: react-pdf requires client-only rendering
// Must use 'use client' directive, no server components
// Example: components/drawings/DrawingViewer.tsx must be client component

// CRITICAL: PDF.js worker setup in Next.js
// Copy worker to public folder in build step
// Set workerSrc: '/pdf.worker.min.js' not from CDN

// CRITICAL: Large file handling
// Use multipart upload for files > 6MB
// Implement chunking in use-supabase-upload.ts

// CRITICAL: Next.js dynamic route parameters
// Must use [projectId] not generic [id]
// Must use [drawingId] for drawing routes

// CRITICAL: Supabase storage paths
// Format: drawings/projects/{projectId}/{drawingId}/{filename}
// Use sanitized filenames to prevent path traversal

// CRITICAL: TypeScript strict mode
// All props must be properly typed
// No implicit any, use unknown for dynamic data
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// types/drawings.types.ts

import { Database } from '@/types/database.types';

export type DrawingStatus = 'draft' | 'under_review' | 'approved' | 'superseded' | 'void';

export interface DrawingArea {
  id: string;
  projectId: string;
  parentAreaId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  drawingCount?: number;
  children?: DrawingArea[];
  createdAt: string;
  updatedAt: string;
}

export interface Drawing {
  id: string;
  projectId: string;
  areaId: string | null;
  drawingNumber: string;
  title: string;
  discipline: string | null;
  drawingType: string | null;
  currentRevisionId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  area?: DrawingArea;
  currentRevision?: DrawingRevision;
  revisions?: DrawingRevision[];
}

export interface DrawingRevision {
  id: string;
  drawingId: string;
  revisionNumber: string;
  drawingSetId: string | null;
  drawingDate: string | null;
  receivedDate: string;
  status: DrawingStatus;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  isCurrentRevision: boolean;
  uploadedBy: string;
  description: string | null;
  createdAt: string;
  // Relations
  drawing?: Drawing;
  drawingSet?: DrawingSet;
  sketches?: DrawingSketch[];
  downloads?: DrawingDownload[];
}

export interface DrawingSet {
  id: string;
  projectId: string;
  name: string;
  issuedAt: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface DrawingSketch {
  id: string;
  drawingRevisionId: string;
  sketchNumber: string;
  name: string;
  description: string | null;
  sketchDate: string;
  fileUrl: string;
  createdBy: string;
  createdAt: string;
}

export interface DrawingDownload {
  id: string;
  drawingRevisionId: string;
  downloadedBy: string;
  downloadedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

// Zod schemas for validation
import { z } from 'zod';

export const drawingAreaSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  parentAreaId: z.string().uuid().optional(),
});

export const drawingUploadSchema = z.object({
  drawingNumber: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  discipline: z.string().optional(),
  drawingType: z.string().optional(),
  revisionNumber: z.string().default('A'),
  drawingDate: z.string().datetime().optional(),
  receivedDate: z.string().datetime(),
  drawingSetId: z.string().uuid().optional(),
  description: z.string().optional(),
  areaId: z.string().uuid().optional(),
});

export const drawingFilterSchema = z.object({
  search: z.string().optional(),
  discipline: z.string().optional(),
  drawingType: z.string().optional(),
  status: z.enum(['draft', 'under_review', 'approved', 'superseded', 'void']).optional(),
  areaId: z.string().uuid().optional(),
  drawingSetId: z.string().uuid().optional(),
});
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: CREATE database migration for drawing tables
  - IMPLEMENT: All drawing-related tables with proper relationships
  - FOLLOW pattern: supabase/migrations/20240xxx_add_drawings.sql
  - NAMING: drawing_areas, drawings, drawing_revisions, etc.
  - DEPENDENCIES: Run migration, generate types with npm run db:types
  - PLACEMENT: supabase/migrations/

Task 2: CREATE types/drawings.types.ts
  - IMPLEMENT: TypeScript interfaces and Zod schemas for all drawing entities
  - FOLLOW pattern: types/budget.types.ts structure and exports
  - NAMING: PascalCase interfaces, camelCase properties, Schema suffix for Zod
  - DEPENDENCIES: Import from database.types.ts after Task 1
  - PLACEMENT: frontend/src/types/

Task 3: CREATE hooks/use-drawing-areas.ts
  - IMPLEMENT: CRUD operations for drawing areas with hierarchy
  - FOLLOW pattern: hooks/use-budget-lines.ts for nested data
  - NAMING: useDrawingAreas, useCreateArea, useUpdateArea, useDeleteArea
  - DEPENDENCIES: Import types from Task 2
  - PLACEMENT: frontend/src/hooks/

Task 4: CREATE components/drawings/DrawingAreaSelector.tsx
  - IMPLEMENT: Hierarchical folder tree with SectionCard wrapper
  - FOLLOW pattern: components/budget/budget-table.tsx tree logic
  - NAMING: DrawingAreaSelector with proper TypeScript props
  - DEPENDENCIES: Uses hooks from Task 3
  - PLACEMENT: frontend/src/components/drawings/

Task 5: CREATE hooks/use-drawing-upload.ts
  - IMPLEMENT: Multi-file upload with Supabase storage integration
  - FOLLOW pattern: hooks/use-supabase-upload.ts with enhancements
  - NAMING: useDrawingUpload with progress tracking
  - DEPENDENCIES: Import types from Task 2, storage config
  - PLACEMENT: frontend/src/hooks/

Task 6: CREATE components/drawings/DrawingUploadDialog.tsx
  - IMPLEMENT: Drag-drop upload with metadata form
  - FOLLOW pattern: components/forms/FileUploadField.tsx
  - NAMING: DrawingUploadDialog with form validation
  - DEPENDENCIES: Uses upload hook from Task 5, schemas from Task 2
  - PLACEMENT: frontend/src/components/drawings/

Task 7: CREATE api/projects/[projectId]/drawing-areas/route.ts
  - IMPLEMENT: GET and POST handlers for drawing areas
  - FOLLOW pattern: api/projects/[projectId]/directory/groups/route.ts
  - NAMING: Named exports GET, POST with proper typing
  - DEPENDENCIES: Import types from Task 2, uses Supabase client
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/drawing-areas/

Task 8: CREATE api/projects/[projectId]/drawings/route.ts
  - IMPLEMENT: GET with filters and POST for new drawings
  - FOLLOW pattern: api/projects/[projectId]/commitments/route.ts
  - NAMING: Named exports with NextRequest/NextResponse types
  - DEPENDENCIES: Import schemas from Task 2
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/drawings/

Task 9: CREATE api/projects/[projectId]/drawings/[drawingId]/revisions/route.ts
  - IMPLEMENT: Revision management endpoints
  - FOLLOW pattern: api/projects/[projectId]/budget/lines/[lineId]/history/route.ts
  - NAMING: Handle revision creation and retrieval
  - DEPENDENCIES: Import types, handle file storage
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/

Task 10: CREATE components/drawings/DrawingLogTable.tsx
  - IMPLEMENT: GenericDataTable configuration for drawings
  - FOLLOW pattern: components/tables/commitments-table-config.ts
  - NAMING: DrawingLogTable with column definitions
  - DEPENDENCIES: Import from generic-table-factory.tsx
  - PLACEMENT: frontend/src/components/drawings/

Task 11: CREATE components/drawings/DrawingViewer.tsx
  - IMPLEMENT: PDF viewer with react-pdf library
  - FOLLOW pattern: New implementation using react-pdf docs
  - NAMING: DrawingViewer with client-only rendering
  - CRITICAL: Must use 'use client' directive
  - PLACEMENT: frontend/src/components/drawings/

Task 12: CREATE app/(main)/[projectId]/drawings/areas/page.tsx
  - IMPLEMENT: Drawing areas management page
  - FOLLOW pattern: app/(main)/[projectId]/directory/page.tsx
  - NAMING: Server component with data fetching
  - DEPENDENCIES: Uses DrawingAreaSelector from Task 4
  - PLACEMENT: As specified in path

Task 13: CREATE app/(main)/[projectId]/drawings/revisions/page.tsx
  - IMPLEMENT: Drawing log table page
  - FOLLOW pattern: app/(main)/[projectId]/commitments/page.tsx
  - NAMING: Server component with TableLayout wrapper
  - DEPENDENCIES: Uses DrawingLogTable from Task 10
  - PLACEMENT: As specified in path

Task 14: CREATE app/(main)/[projectId]/drawings/viewer/[drawingId]/page.tsx
  - IMPLEMENT: Full-screen PDF viewer page
  - FOLLOW pattern: New pattern with dynamic import for client component
  - NAMING: Server component shell with client viewer
  - DEPENDENCIES: Dynamically imports DrawingViewer from Task 11
  - PLACEMENT: As specified in path

Task 15: CREATE tests for drawing components
  - IMPLEMENT: Jest tests for components and hooks
  - FOLLOW pattern: __tests__/commitments.test.tsx
  - NAMING: describe blocks, proper test naming
  - COVERAGE: All major functionality tested
  - PLACEMENT: Adjacent to components in __tests__ folders
```

### Implementation Patterns & Key Details

```typescript
// Drawing Area Tree Pattern (from budget-table.tsx)
interface DrawingAreaTreeProps {
  areas: DrawingArea[];
  selectedAreaId?: string;
  onSelectArea: (areaId: string) => void;
}

const depthPaddingClasses = ["pl-0", "pl-4", "pl-8", "pl-12", "pl-16"];

export function DrawingAreaTree({ areas, selectedAreaId, onSelectArea }: DrawingAreaTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const renderArea = (area: DrawingArea, depth = 0) => {
    const isExpanded = expanded[area.id];
    const hasChildren = area.children && area.children.length > 0;
    const paddingClass = depthPaddingClasses[Math.min(depth, depthPaddingClasses.length - 1)];

    return (
      <div key={area.id}>
        <button
          onClick={() => onSelectArea(area.id)}
          className={cn(
            "w-full text-left p-3 rounded-lg hover:bg-accent",
            paddingClass,
            selectedAreaId === area.id && "bg-primary/10"
          )}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(prev => ({ ...prev, [area.id]: !prev[area.id] }));
                }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            <span className="font-medium">{area.name}</span>
            <Badge variant="secondary">{area.drawingCount || 0}</Badge>
          </div>
          {area.description && (
            <p className="text-sm text-muted-foreground mt-1">{area.description}</p>
          )}
        </button>
        {isExpanded && area.children?.map(child => renderArea(child, depth + 1))}
      </div>
    );
  };

  return <div className="space-y-1">{areas.map(area => renderArea(area))}</div>;
}

// File Upload Pattern with Revision (enhanced from use-supabase-upload.ts)
export function useDrawingUpload(projectId: string, drawingId?: string) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const uploadDrawing = async (file: File, metadata: DrawingUploadSchema) => {
    setIsUploading(true);
    try {
      // PATTERN: Storage path with project scoping
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const storagePath = `drawings/projects/${projectId}/${drawingId || 'new'}/${timestamp}_${sanitizedFileName}`;

      // PATTERN: Chunked upload for large files
      if (file.size > 6 * 1024 * 1024) {
        // Implement multipart upload
        const chunkSize = 5 * 1024 * 1024;
        const chunks = Math.ceil(file.size / chunkSize);

        for (let i = 0; i < chunks; i++) {
          const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
          // Upload chunk...
          setProgress((i + 1) / chunks * 100);
        }
      } else {
        // Direct upload for small files
        const { data, error } = await supabase.storage
          .from('drawings')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        // Create database record
        const revision = await createDrawingRevision({
          ...metadata,
          fileUrl: data.path,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        });

        return revision;
      }
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return { uploadDrawing, progress, isUploading };
}

// PDF Viewer Pattern (react-pdf implementation)
'use client';  // CRITICAL: Must be client component

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// CRITICAL: Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface DrawingViewerProps {
  fileUrl: string;
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

export function DrawingViewer({ fileUrl, initialPage = 1, onPageChange }: DrawingViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [scale, setScale] = useState(1.0);

  // PATTERN: Lazy loading for performance
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    // Preload adjacent pages
    setVisiblePages(new Set([1, 2, 3].filter(p => p <= numPages)));
  };

  // PATTERN: Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && pageNumber > 1) {
        goToPage(pageNumber - 1);
      } else if (e.key === 'ArrowRight' && pageNumber < numPages) {
        goToPage(pageNumber + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pageNumber, numPages]);

  const goToPage = (page: number) => {
    setPageNumber(page);
    onPageChange?.(page);

    // Update visible pages for lazy loading
    const pagesToLoad = new Set<number>();
    for (let i = Math.max(1, page - 1); i <= Math.min(numPages, page + 1); i++) {
      pagesToLoad.add(i);
    }
    setVisiblePages(pagesToLoad);
  };

  return (
    <div className="flex flex-col h-full">
      <DrawingViewerControls
        pageNumber={pageNumber}
        numPages={numPages}
        scale={scale}
        onPageChange={goToPage}
        onScaleChange={setScale}
      />
      <div className="flex-1 overflow-auto bg-gray-100">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div>Loading PDF...</div>}
        >
          {/* Render only visible pages for performance */}
          {Array.from(visiblePages).map(pageNum => (
            <Page
              key={pageNum}
              pageNumber={pageNum}
              scale={scale}
              renderMode="canvas"
              className={pageNum === pageNumber ? 'block' : 'hidden'}
            />
          ))}
        </Document>
      </div>
    </div>
  );
}
```

### Integration Points

```yaml
DATABASE:
  - migration: "Add drawing tables with hierarchical areas and revisions"
  - generate types: "npm run db:types after migration"
  - RLS policies: "Add policies for drawing access control"

STORAGE:
  - bucket: "drawings" in Supabase storage
  - path pattern: "drawings/projects/{projectId}/{drawingId}/{filename}"
  - max file size: "Configure in Supabase dashboard (500MB for drawings)"

CONFIG:
  - add to: .env.local
    NEXT_PUBLIC_MAX_DRAWING_SIZE: "524288000"  # 500MB in bytes
    NEXT_PUBLIC_PDF_WORKER_URL: "/pdf.worker.min.js"

  - add to: next.config.js
    webpack: (config) => {
      config.resolve.alias.canvas = false;  # For PDF.js
      return config;
    }

ROUTES:
  - main pages: app/(main)/[projectId]/drawings/*
  - api routes: app/api/projects/[projectId]/drawings/*
  - api routes: app/api/projects/[projectId]/drawing-areas/*

DEPENDENCIES:
  - install: "npm install react-pdf pdfjs-dist"
  - install: "npm install qrcode.js" # For QR code generation
  - copy worker: "Copy pdf.worker.min.js to public folder"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```
# After each file creation
cd frontend
npm run lint                    # ESLint with TypeScript rules
npm run typecheck               # Full TypeScript validation
npm run format                  # Prettier formatting

# Fix any issues immediately
npm run lint:fix
npm run format:write

# Expected: Zero errors before proceeding
```
### Level 2: Unit Tests (Component Validation)

```
# Test components as created
npm test -- components/drawings/DrawingAreaSelector.test.tsx
npm test -- components/drawings/DrawingUploadDialog.test.tsx
npm test -- hooks/use-drawing-upload.test.ts

# Test coverage for drawings module
npm test -- --coverage components/drawings/
npm test -- --coverage hooks/use-drawing

# Expected: >80% coverage, all tests passing
```
### Level 3: Integration Testing (System Validation)

```
# Start dev server
cd frontend && npm run dev &
sleep 10  # Allow Next.js to compile

# Test drawing areas page loads
curl -I http://localhost:3000/test-project/drawings/areas
# Expected: 200 OK

# Test file upload endpoint
curl -X POST http://localhost:3000/api/projects/test-project/drawings \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-drawing.pdf" \
  -F "metadata={\"drawingNumber\":\"A-101\",\"title\":\"Floor Plan\"}"
# Expected: 201 Created with drawing ID

# Test PDF viewer loads
curl -I http://localhost:3000/test-project/drawings/viewer/test-drawing-id
# Expected: 200 OK

# Test revision creation
curl -X POST http://localhost:3000/api/projects/test-project/drawings/test-id/revisions \
  -H "Content-Type: application/json" \
  -d '{"revisionNumber":"B","status":"approved"}'
# Expected: 201 Created

# Production build validation
npm run build
# Expected: Successful build, no type errors

# Bundle size check
npm run analyze
# Expected: Drawing module < 500KB gzipped
```

### Level 4: E2E and Performance Validation

```
# Playwright E2E tests
npm run test:e2e -- drawings.spec.ts

# Specific user flows
npm run test:e2e -- --grep "upload drawing"
npm run test:e2e -- --grep "create folder"
npm run test:e2e -- --grep "view PDF"

# Performance testing with Lighthouse
npx lighthouse http://localhost:3000/project/drawings \
  --output=json \
  --output-path=./lighthouse-drawings.json

# Expected metrics:
# - First Contentful Paint < 1.5s
# - Time to Interactive < 3s
# - PDF load time < 3s for 50MB file

# Mobile testing
npm run test:mobile -- drawings

# Accessibility audit
npx axe http://localhost:3000/project/drawings/viewer/test-id

# Load testing for large files
node scripts/test-large-drawing-upload.js
# Expected: 100MB file uploads successfully

# QR code field test
# Generate QR code and test with mobile device
# Expected: QR code opens drawing on mobile browser
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] TypeScript compilation: `npm run typecheck` - zero errors
- [ ] Linting passed: `npm run lint` - zero warnings
- [ ] Tests passing: `npm test` - 100% pass rate
- [ ] E2E tests passing: `npm run test:e2e drawings` - all scenarios
- [ ] Production build: `npm run build` - successful
- [ ] Bundle size: Drawing module < 500KB gzipped

### Feature Validation

- [ ] Drawing areas: Create, edit, delete, reorder folders
- [ ] File upload: Drag-drop, multi-file, progress tracking
- [ ] Revision control: Version history, status workflow
- [ ] PDF viewer: Fast loading, zoom, navigation, thumbnails
- [ ] Search: Find by number, title, or OCR text content
- [ ] QR codes: Generate and scan successfully on mobile
- [ ] Export: PDF and CSV with proper formatting
- [ ] Audit trail: All actions logged with user and timestamp
- [ ] Related items: Link to RFIs, submittals functional
- [ ] Email sharing: Send with attachments working

### Code Quality Validation

- [ ] Follows GenericDataTable pattern for consistency
- [ ] Uses existing file upload hooks and patterns
- [ ] Proper TypeScript interfaces, no any types
- [ ] Server/Client components correctly separated
- [ ] Error handling for all edge cases
- [ ] Loading states for all async operations
- [ ] Responsive design works on mobile
- [ ] Accessibility: Keyboard navigation, ARIA labels
- [ ] Performance: Lazy loading, virtualization implemented
- [ ] Security: Path sanitization, file type validation

### React/Next.js Specific

- [ ] 'use client' directives used appropriately
- [ ] Dynamic imports for heavy components (PDF viewer)
- [ ] Proper data fetching in server components
- [ ] No hydration mismatches
- [ ] API routes follow Next.js patterns
- [ ] Middleware for auth on drawing routes
- [ ] Image optimization for thumbnails
- [ ] Proper caching strategies implemented

### Documentation & Deployment

- [ ] README updated with drawing feature setup
- [ ] API documentation complete
- [ ] Environment variables documented
- [ ] Migration instructions included
- [ ] Storage bucket configuration documented
- [ ] PDF.js worker setup instructions

---

## Anti-Patterns to Avoid

- ❌ Don't load entire PDF in memory - use streaming
- ❌ Don't store files in database - use Supabase storage
- ❌ Don't skip file type validation - security risk
- ❌ Don't hardcode drawing areas - must be dynamic
- ❌ Don't use generic [id] parameters - breaks routing
- ❌ Don't forget audit trails - compliance requirement
- ❌ Don't ignore mobile users - field access critical
- ❌ Don't skip revision tracking - core requirement

---

## Procore Crawl Data Reference

Based on the analysis of `/Users/meganharrison/Documents/github/alleato-pm/docs/PRPs/drawings/`, the Drawings tool should replicate these Procore features:

### Key UI Elements from Procore

| Component | Description | Implementation Priority |
|-----------|-------------|------------------------|
| Drawing Log | Table with columns, filters, bulk actions | High |
| Drawing Viewer | Full-screen PDF with toolbar controls | High |
| Areas/Folders | Hierarchical organization structure | High |
| Upload Dialog | Multi-file with metadata capture | High |
| Revision History | Timeline view of all versions | Medium |
| QR Code Generator | For mobile field access | Medium |
| Email Forwarding | Share drawings with attachments | Low |
| Sketches/Markup | Annotations on drawings | Low |

### Detected Commands from Analysis

| Action | Implementation |
|--------|---------------|
| Upload Drawing | Multi-file drag-drop with metadata |
| Create Area | Hierarchical folder creation |
| Update Revision | New version with status workflow |
| Download Drawing | Direct file download with audit |
| Generate QR Code | Mobile-scannable links |
| Export to PDF/CSV | Batch export with formatting |
| Link to RFI | Related items association |

The implementation follows Procore's UI patterns while leveraging Alleato's existing component library for consistency.

---

### Confidence Score**: 9/10

This PRP provides comprehensive context for implementing the Drawings feature with:

- Complete database schema based on analysis
- Reusable patterns from existing codebase
- Detailed implementation tasks with dependencies
- Specific validation steps at each level
- Integration with existing infrastructure
- Performance optimization strategies
- Mobile and accessibility considerations

The implementation should proceed smoothly with minimal blockers using this guide.
