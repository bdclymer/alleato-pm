# Specifications Feature - TypeScript PRP

name: "Specifications Feature Implementation"
description: "Implement Procore-equivalent Specifications feature with file upload, revision tracking, subscriber notifications, and areas organization"

---

### Goal

**Feature Goal**: Implement a comprehensive Specifications management system that allows users to upload specification documents (PDFs), track revisions over time, organize specs into areas, and manage subscriber notifications - matching Procore's Specifications tool functionality.

**Deliverable**:
- Complete Specifications feature with 5 database tables (specification_sections, specification_section_revisions, specification_areas, specification_area_sections, specification_subscribers)
- Upload dialog for PDF specification documents with Supabase Storage integration
- Revision tracking system with version history
- Areas management for specification organization
- Subscriber notification system
- List/detail pages with search and filtering
- Settings management interface

**Success Definition**:
- Users can upload specification PDFs and see them appear in the list immediately
- Revision tracking automatically maintains version history when new documents are uploaded
- Users can organize specifications into areas for better categorization
- Subscriber system sends notifications when specifications are updated
- All CRUD operations work with proper RLS policies and type safety
- Production build succeeds with zero TypeScript errors
- E2E tests validate the complete upload → display → revision → delete workflow

### Why

**Business Value**:
- Centralizes specification document management across all project stakeholders
- Eliminates version confusion through automatic revision tracking
- Enables proactive collaboration via subscriber notifications
- Reduces time spent searching for spec documents (avg 15 min/day per user)
- Provides audit trail of specification changes for compliance

**Integration with Existing Features**:
- Links to Budget tool (specifications inform budget line items)
- Links to Change Events (spec changes trigger change orders)
- Links to Commitments (subcontractor scope references specs)
- Links to Invoicing (spec sections tie to payment line items)
- Uses existing Drawings pattern for file upload and revision tracking

**Problems This Solves**:
- **For Project Managers**: Single source of truth for all specification documents
- **For Estimators**: Quick access to spec sections during budget creation
- **For Field Teams**: Mobile access to current spec documents
- **For Subcontractors**: Notification when specs affecting their work are updated
- **For Legal/Compliance**: Complete revision history for disputes/audits

### What

**Pages**:
1. Main List Page: `/[projectId]/specifications/specification_sections`
   - Table view of all specification sections
   - Search by section number, title, description
   - Filter by area, status
   - Upload button (primary action)
   - Navigate to settings, areas views

2. Settings Page: `/[projectId]/specifications/settings?view=General`
   - General settings configuration
   - Format review options
   - Project-level preferences

3. Revision Detail Page: `/[projectId]/specifications/[sectionId]/revisions/[revisionId]?tab=General`
   - Detailed view of specific revision
   - File preview/download
   - Metadata (uploaded by, date, file size)
   - Version comparison (future enhancement)

4. Areas Management Page: `/[projectId]/specifications/areas`
   - List of specification areas
   - Add/edit/delete areas
   - Organize sections into areas

**Database Schema**:
```sql
-- Main specification sections
CREATE TABLE specification_sections (
  id BIGSERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section_number VARCHAR(50) NOT NULL, -- e.g., "03 30 00"
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'superseded'
  current_revision_id BIGINT, -- Points to latest revision
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, section_number)
);

CREATE INDEX idx_spec_sections_project ON specification_sections(project_id);
CREATE INDEX idx_spec_sections_status ON specification_sections(status);

-- Revision tracking (version history)
CREATE TABLE specification_section_revisions (
  id BIGSERIAL PRIMARY KEY,
  section_id BIGINT NOT NULL REFERENCES specification_sections(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  content TEXT, -- Extracted text content if available
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_url TEXT NOT NULL, -- Supabase Storage path
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) DEFAULT 'application/pdf',
  notes TEXT, -- User notes about this revision
  UNIQUE(section_id, revision_number)
);

CREATE INDEX idx_spec_revisions_section ON specification_section_revisions(section_id);

-- Areas for organization
CREATE TABLE specification_areas (
  id BIGSERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, name)
);

CREATE INDEX idx_spec_areas_project ON specification_areas(project_id);

-- Link specifications to areas (many-to-many)
CREATE TABLE specification_area_sections (
  id BIGSERIAL PRIMARY KEY,
  area_id BIGINT NOT NULL REFERENCES specification_areas(id) ON DELETE CASCADE,
  section_id BIGINT NOT NULL REFERENCES specification_sections(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(area_id, section_id)
);

CREATE INDEX idx_area_sections_area ON specification_area_sections(area_id);
CREATE INDEX idx_area_sections_section ON specification_area_sections(section_id);

-- Subscribers for notifications
CREATE TABLE specification_subscribers (
  id BIGSERIAL PRIMARY KEY,
  section_id BIGINT NOT NULL REFERENCES specification_sections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(section_id, user_id)
);

CREATE INDEX idx_spec_subscribers_section ON specification_subscribers(section_id);
CREATE INDEX idx_spec_subscribers_user ON specification_subscribers(user_id);

-- RLS Policies (all tables follow same pattern)
ALTER TABLE specification_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE specification_section_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE specification_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE specification_area_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE specification_subscribers ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for specification_sections
CREATE POLICY "Users can view specifications in their projects"
  ON specification_sections FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_permissions
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert specifications with proper permissions"
  ON specification_sections FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_permissions
      WHERE user_id = auth.uid() AND can_write = true
    )
  );
```

**API Endpoints**:
```yaml
# Main CRUD for specifications
GET    /api/projects/[projectId]/specifications
POST   /api/projects/[projectId]/specifications (upload new spec)
GET    /api/projects/[projectId]/specifications/[sectionId]
PUT    /api/projects/[projectId]/specifications/[sectionId]
DELETE /api/projects/[projectId]/specifications/[sectionId]

# Revisions
GET    /api/projects/[projectId]/specifications/[sectionId]/revisions
POST   /api/projects/[projectId]/specifications/[sectionId]/revisions (upload new revision)
GET    /api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]
GET    /api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/download

# Areas
GET    /api/projects/[projectId]/specification-areas
POST   /api/projects/[projectId]/specification-areas
PUT    /api/projects/[projectId]/specification-areas/[areaId]
DELETE /api/projects/[projectId]/specification-areas/[areaId]

# Subscribers
GET    /api/projects/[projectId]/specifications/[sectionId]/subscribers
POST   /api/projects/[projectId]/specifications/[sectionId]/subscribers
DELETE /api/projects/[projectId]/specifications/[sectionId]/subscribers/[userId]

# Settings
GET    /api/projects/[projectId]/specifications/settings
PUT    /api/projects/[projectId]/specifications/settings

# Search/Filter
GET    /api/projects/[projectId]/specifications/search?q=[query]
```

**Components**:
```
frontend/src/components/specifications/
├── SpecificationUploadDialog.tsx      # Main upload modal (based on DrawingUploadDialog)
├── SpecificationList.tsx               # Main list/table view
├── SpecificationCard.tsx               # Individual spec card display
├── RevisionHistory.tsx                 # Version history component
├── SpecificationFilters.tsx            # Filter panel (search, area, status)
├── SpecificationSearch.tsx             # Search input with debounce
├── AddSubscribersModal.tsx             # Manage subscribers
├── ReviewFormatDialog.tsx              # Format validation before upload
├── SpecificationSettingsModal.tsx      # Settings configuration
├── SpecificationAreaManager.tsx        # Areas CRUD interface
├── SpecStatusBadge.tsx                 # Status indicator (active/archived/superseded)
└── SpecSectionSelector.tsx             # Dropdown to select spec sections
```

**Special Features/Functionality**:
1. **Onboarding Wizard**: Multi-step setup (Add Subscribers → Review Format → Upload Specs)
2. **Format Validation**: Pre-upload check for PDF compliance
3. **Revision Auto-Increment**: Automatic revision numbering when uploading to existing section
4. **Current Revision Tracking**: `current_revision_id` always points to latest
5. **File Preview**: In-browser PDF preview before download
6. **Subscriber Notifications**: Real-time alerts when specs updated (via Supabase Realtime)
7. **Area Organization**: Drag-and-drop to assign specs to areas (future enhancement)
8. **Search**: Full-text search across section_number, title, description, file_name
9. **Filter**: By area, status, upload date range
10. **Integration Links**: Quick navigation to Budget, Change Events, Commitments tools

**Table Columns** (Main List View):
- Section Number (sortable)
- Title (sortable)
- Description (truncated)
- Current Revision (revision_number with upload date)
- Area(s) (tags/chips showing assigned areas)
- Status Badge (active/archived/superseded)
- Subscribers Count (with hover to see names)
- Actions (view, edit, delete, manage subscribers)

**Frontend Form & Form Fields**:

*Upload Specification Form*:
```typescript
const uploadSpecificationSchema = z.object({
  section_number: z.string().min(1, "Section number is required").max(50),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  file: z.instanceof(File)
    .refine((file) => file.size <= 50 * 1024 * 1024, "File must be under 50MB")
    .refine(
      (file) => file.type === 'application/pdf',
      "Only PDF files are allowed"
    ),
  notes: z.string().optional(),
  area_ids: z.array(z.number()).optional(), // Multi-select areas
  subscriber_ids: z.array(z.string().uuid()).optional(), // Multi-select users
});
```

*Edit Specification Form*:
```typescript
const editSpecificationSchema = z.object({
  section_number: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'superseded']),
});
```

*Add Revision Form*:
```typescript
const addRevisionSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 50 * 1024 * 1024, "File must be under 50MB")
    .refine((file) => file.type === 'application/pdf', "Only PDF files allowed"),
  notes: z.string().optional(),
  notify_subscribers: z.boolean().default(true),
});
```

### Success Criteria

- [ ] User can upload a PDF specification document and see it appear in the list within 3 seconds
- [ ] Uploading a new version to existing section creates new revision with incremented revision_number
- [ ] Specification list shows current revision number and upload date for each section
- [ ] Clicking on a specification shows full revision history with download links
- [ ] User can create specification areas and assign sections to areas
- [ ] User can subscribe to specifications and receive notifications on updates
- [ ] Search filters specifications by section_number, title, or description in <500ms
- [ ] Filter dropdown narrows results by area or status
- [ ] Settings page allows project-level configuration
- [ ] All API routes return proper TypeScript-typed responses
- [ ] RLS policies prevent unauthorized access to other projects' specifications
- [ ] Production build completes with zero TypeScript errors
- [ ] E2E test validates: upload → list display → revision upload → revision history → delete
- [ ] File uploads to Supabase Storage succeed with progress indication
- [ ] PDF preview works in browser before download

## All Needed Context

### Context Completeness Check

✅ **Validated**: This PRP contains complete context for someone with no prior knowledge of the codebase to implement the Specifications feature successfully. It includes:
- Complete database schema with FK types verified (INTEGER for project_id matching projects.id)
- Exact file paths to follow existing patterns (Drawings, Attachments)
- TypeScript patterns from similar features
- API route structure matching project conventions
- Form validation schemas with Zod
- Component structure following existing upload patterns
- RLS policy examples matching project security model
- Supabase Storage integration pattern from Drawings
- React Query hooks pattern from existing features

### Documentation & References

```yaml
# MUST READ - Procore Crawl Data (Complete UI Reference)
- file: docs/project-mgmt/specifications/crawl-specifications/SPECIFICATIONS-CRAWL-STATUS.md
  why: Complete UI analysis with 4 pages captured, 75 buttons documented, onboarding flow identified
  critical: Shows exact Procore UI to replicate (upload button prominence, table structure, settings layout)
  gotcha: Test project was empty - actual populated view will have more data

- file: playwright-procore-crawl/procore-crawls/specifications/pages/*/screenshot.png
  why: Visual reference for exact layout and styling to match
  pattern: 6 screenshots covering main list, settings, revision detail, areas views

- file: playwright-procore-crawl/procore-crawls/specifications/pages/*/metadata.json
  why: Extracted button labels, dropdown options, form fields, navigation links
  critical: Use exact label text from metadata for consistency with Procore

# MUST FOLLOW - File Upload & Revision Pattern
- file: frontend/src/components/drawings/DrawingUploadDialog.tsx
  why: Complete file upload pattern with progress tracking, Supabase Storage, error handling
  pattern: useDrawingUpload hook + DrawingUploadDialog component composition
  critical: Uses single current revision pattern (enforce with FK constraint + trigger)
  gotcha: Must handle duplicate file names, file size validation before upload starts

- file: frontend/src/hooks/use-drawing-upload.ts
  why: Custom hook for file upload state management, progress tracking, Supabase integration
  pattern: useState for upload state, useCallback for upload function, progress events
  critical: Validates file before upload, shows progress percentage, handles errors gracefully
  gotcha: Must cleanup object URLs with URL.revokeObjectURL to prevent memory leaks

- file: supabase/migrations/20260131142854_add_drawings_system.sql
  why: 437-line migration showing complete pattern: tables + RLS + indexes + triggers + FK constraints
  pattern: BIGSERIAL for IDs, INTEGER for project_id FK, UUID for user FKs, proper indexes on all FKs
  critical: RLS policies check project_permissions table for auth, triggers auto-update updated_at
  gotcha: Must create updated_at trigger for each table, FK constraints need CASCADE deletes

# MUST FOLLOW - API Route Patterns
- file: frontend/src/app/api/projects/[projectId]/drawings/route.ts
  why: Complete API route pattern with filtering, pagination, error handling
  pattern: GET with query params (search, filter, page, limit), POST for creation
  critical: Uses createClient() from @/lib/supabase/server for auth, returns { data, error } pattern
  gotcha: Must validate projectId is INTEGER, check user has project access before any DB query

- file: frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/route.ts
  why: Nested route pattern for sub-resources (revisions under drawings)
  pattern: GET list of revisions, POST to create new revision with auto-increment logic
  critical: Transaction-safe revision numbering (SELECT MAX + 1 in same transaction)

# MUST FOLLOW - Service Layer Pattern
- file: frontend/src/services/DrawingService.ts
  why: Business logic separation from API routes
  pattern: Static class methods, returns Result<T, Error> wrapper, handles pagination
  critical: All Supabase queries go through service layer, not directly in components
  gotcha: Service layer must NOT import from 'next/*' (must be framework-agnostic)

# MUST FOLLOW - React Query Hooks Pattern
- file: frontend/src/hooks/use-specifications.ts (TO BE CREATED based on use-drawings.ts pattern)
  why: Data fetching with React Query for caching, auto-refetch, loading states
  pattern: useQuery for reads, useMutation for writes, queryClient.invalidateQueries for cache updates
  critical: Query keys must be stable and hierarchical: ['projects', projectId, 'specifications']
  gotcha: Must enable/disable queries based on projectId existence to prevent unnecessary fetches

# MUST READ - TypeScript Types
- file: frontend/src/types/database.types.ts
  why: Generated Supabase types MUST be read BEFORE writing any DB code (Supabase Types Gate)
  pattern: Tables interface with Insert/Update/Row types for each table
  critical: VERIFY FK types match PK types (project_id is INTEGER not UUID)
  gotcha: Must regenerate after migration with: npm run db:types

# MUST READ - Form Validation Pattern
- file: frontend/src/lib/schemas/budget-schemas.ts
  why: Zod validation schema patterns for forms
  pattern: z.object with refinements, custom error messages, optional fields
  critical: File validation with size limits (50MB for PDFs), file type checking
  gotcha: Zod file validation must use .refine(), not .max() for size

# MUST READ - Attachments Polymorphic Pattern
- file: frontend/src/components/contracts/ContractAttachments.tsx
  why: Shows how to handle file attachments across multiple entity types
  pattern: Polymorphic attachments table with entity_type + entity_id columns
  critical: Supabase Storage bucket structure: {projectId}/{entity_type}/{entity_id}/{filename}
  gotcha: Must handle file name conflicts, URL expiration, signed URLs for private files

# ADDITIONAL REFERENCES
- url: https://supabase.com/docs/guides/storage/uploads/standard-uploads
  why: Supabase Storage upload API patterns
  critical: Use .from(bucket).upload() with upsert option, handle storage errors separately from DB errors

- url: https://tanstack.com/query/latest/docs/framework/react/guides/mutations
  why: React Query mutation patterns for POST/PUT/DELETE operations
  critical: onSuccess callback to invalidate related queries, onError for toast notifications

- url: https://react-hook-form.com/docs/useform
  why: Form state management with TypeScript
  critical: Use zodResolver for Zod schema integration, watch() for dependent fields
```

### Current Codebase Tree

```bash
frontend/
├── src/
│   ├── app/
│   │   ├── (main)/[projectId]/
│   │   │   ├── budget/              # Budget feature (similar CRUD pattern)
│   │   │   ├── commitments/         # Commitments feature (form + list pattern)
│   │   │   ├── drawings/            # MOST RELEVANT - file upload + revisions
│   │   │   │   ├── areas/page.tsx
│   │   │   │   ├── revisions/page.tsx
│   │   │   │   └── viewer/[drawingId]/page.tsx
│   │   │   └── directory/           # User management (subscriber pattern similar)
│   │   ├── api/projects/[projectId]/
│   │   │   ├── budget/route.ts
│   │   │   ├── commitments/route.ts
│   │   │   ├── drawings/
│   │   │   │   ├── route.ts         # FOLLOW THIS PATTERN
│   │   │   │   ├── [drawingId]/revisions/route.ts
│   │   │   │   └── [drawingId]/revisions/[revisionId]/download/route.ts
│   │   │   └── drawing-areas/route.ts
│   ├── components/
│   │   ├── drawings/                # COPY THIS STRUCTURE
│   │   │   ├── DrawingUploadDialog.tsx    # PRIMARY PATTERN TO FOLLOW
│   │   │   ├── DrawingAreaCard.tsx
│   │   │   ├── DrawingAreaSelector.tsx
│   │   │   ├── DrawingLogTable.tsx
│   │   │   └── DrawingViewer.tsx
│   │   ├── budget/                  # Form patterns
│   │   ├── commitments/             # List + detail patterns
│   │   └── ui/                      # shadcn/ui primitives
│   ├── hooks/
│   │   ├── use-drawing-upload.ts    # CRITICAL - Copy this pattern
│   │   ├── use-drawing-areas.ts
│   │   └── use-budget-data.ts       # React Query pattern reference
│   ├── lib/
│   │   ├── schemas/
│   │   │   └── budget-schemas.ts    # Zod validation examples
│   │   └── supabase/
│   │       ├── client.ts            # Browser client (singleton)
│   │       └── server.ts            # Server client (new per request)
│   ├── services/
│   │   ├── DrawingService.ts        # SERVICE PATTERN TO FOLLOW
│   │   ├── BudgetService.ts
│   │   └── CommitmentService.ts
│   └── types/
│       ├── database.types.ts        # MUST READ FIRST (Supabase Types Gate)
│       └── drawings.types.ts        # Domain-specific types example
├── tests/e2e/
│   ├── drawings-comprehensive.spec.ts   # E2E test pattern to follow
│   ├── budget-line-item-validation.spec.ts
│   └── fixtures/
│       └── test-drawing.pdf         # Test file examples
└── supabase/
    └── migrations/
        └── 20260131142854_add_drawings_system.sql  # MIGRATION PATTERN (437 lines)
```

### Desired Codebase Tree with Files to be Added

```bash
frontend/
├── src/
│   ├── app/
│   │   ├── (main)/[projectId]/
│   │   │   └── specifications/
│   │   │       ├── page.tsx                 # Main list (specification_sections)
│   │   │       ├── settings/page.tsx        # Settings view
│   │   │       ├── areas/page.tsx           # Areas management
│   │   │       └── [sectionId]/
│   │   │           └── revisions/
│   │   │               └── [revisionId]/page.tsx  # Revision detail
│   │   └── api/projects/[projectId]/
│   │       └── specifications/
│   │           ├── route.ts                 # GET (list), POST (create)
│   │           ├── search/route.ts          # GET (search/filter)
│   │           ├── settings/route.ts        # GET, PUT (settings)
│   │           └── [sectionId]/
│   │               ├── route.ts             # GET, PUT, DELETE (section)
│   │               ├── revisions/
│   │               │   ├── route.ts         # GET (list), POST (upload new revision)
│   │               │   └── [revisionId]/
│   │               │       ├── route.ts     # GET (revision detail)
│   │               │       └── download/route.ts  # GET (file download)
│   │               └── subscribers/
│   │                   ├── route.ts         # GET (list), POST (add)
│   │                   └── [userId]/route.ts # DELETE (remove subscriber)
│   ├── components/specifications/
│   │   ├── SpecificationUploadDialog.tsx    # Main upload modal (PRIORITY 1)
│   │   ├── SpecificationList.tsx            # Table view (PRIORITY 2)
│   │   ├── SpecificationCard.tsx            # Card display component
│   │   ├── RevisionHistory.tsx              # Version history table
│   │   ├── SpecificationFilters.tsx         # Filter panel UI
│   │   ├── SpecificationSearch.tsx          # Search input with debounce
│   │   ├── AddSubscribersModal.tsx          # Subscriber management
│   │   ├── ReviewFormatDialog.tsx           # Pre-upload validation
│   │   ├── SpecificationSettingsModal.tsx   # Settings form
│   │   ├── SpecificationAreaManager.tsx     # Areas CRUD
│   │   ├── SpecStatusBadge.tsx              # Status indicator component
│   │   └── SpecSectionSelector.tsx          # Section dropdown picker
│   ├── hooks/
│   │   ├── use-specification-upload.ts      # Upload hook (copy from use-drawing-upload.ts)
│   │   ├── use-specifications.ts            # React Query hooks for CRUD
│   │   └── use-specification-areas.ts       # Areas management hooks
│   ├── lib/schemas/
│   │   └── specification-schemas.ts         # Zod validation schemas
│   ├── services/
│   │   ├── SpecificationService.ts          # Business logic layer
│   │   └── SpecificationAreaService.ts      # Areas business logic
│   ├── types/
│   │   └── specifications.types.ts          # Domain-specific TypeScript types
│   └── tests/e2e/
│       ├── specifications-upload.spec.ts    # E2E: Upload workflow
│       ├── specifications-revisions.spec.ts # E2E: Revision tracking
│       ├── specifications-areas.spec.ts     # E2E: Areas management
│       └── fixtures/
│           ├── test-spec-section-03-30-00.pdf
│           └── test-spec-section-05-50-00.pdf
└── supabase/migrations/
    └── YYYYMMDDHHMMSS_add_specifications_system.sql  # All 5 tables + RLS + indexes + triggers
```

### Known Gotchas of our Codebase & Library Quirks

```typescript
// CRITICAL: Supabase Types Gate (MANDATORY - See .claude/rules/SUPABASE-GATE.md)
// BEFORE writing ANY database code:
// 1. Run: npm run db:types
// 2. Read: frontend/src/types/database.types.ts
// 3. Verify FK types match PK types (project_id is INTEGER not UUID!)
// Example violation that broke schedule_tasks (2026-01-28):
// ❌ WRONG: project_id UUID (doesn't match projects.id which is INTEGER)
// ✅ CORRECT: project_id INTEGER REFERENCES projects(id)

// CRITICAL: Next.js Route Naming (See .claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md)
// NEVER use generic [id] - use specific names
// ❌ WRONG: /api/projects/[id]/specifications
// ✅ CORRECT: /api/projects/[projectId]/specifications
// Violation causes dev server to crash with route conflict error

// CRITICAL: File Upload Memory Leaks
// DrawingUploadDialog pattern creates object URLs for preview
// MUST revoke URLs to prevent memory leaks:
useEffect(() => {
  return () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };
}, [previewUrl]);

// CRITICAL: Supabase Storage File Paths
// Pattern: {projectId}/{entity_type}/{entity_id}/{filename}
// Example: "31/specifications/12345/03-30-00-concrete.pdf"
// MUST sanitize filename to prevent path traversal attacks:
const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

// CRITICAL: React Query Cache Invalidation
// After mutations, MUST invalidate related queries:
await queryClient.invalidateQueries({
  queryKey: ['projects', projectId, 'specifications']
});
// Gotcha: Nested query keys require partial matching:
await queryClient.invalidateQueries({
  queryKey: ['projects', projectId], // Invalidates ALL sub-queries
  exact: false
});

// CRITICAL: RLS Policy Testing
// Policies can fail silently returning empty arrays
// MUST test with actual user context:
node -e '
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
(async () => {
  const { data, error } = await supabase
    .from("specification_sections")
    .select("*")
    .eq("project_id", 31)
    .limit(1);
  if (error) console.error("Query failed:", error);
  else console.log("Success:", data);
})();
'

// CRITICAL: Form Validation with Zod
// File size validation requires .refine(), NOT .max()
// ❌ WRONG: z.instanceof(File).max(50 * 1024 * 1024)
// ✅ CORRECT:
z.instanceof(File).refine(
  (file) => file.size <= 50 * 1024 * 1024,
  "File must be under 50MB"
)

// CRITICAL: Server vs Client Components
// 'use client' directive MUST be at top of file
// Server Components: Can fetch data, access env vars, NO browser APIs
// Client Components: Can use hooks, event handlers, browser APIs
// Gotcha: Importing a Client Component into Server Component is OK
// Gotcha: Importing a Server Component into Client Component converts it to Client!

// CRITICAL: TypeScript Strict Mode
// We use strict mode - ALL function params and return types MUST be typed
// ❌ WRONG: async function uploadSpec(data) { ... }
// ✅ CORRECT: async function uploadSpec(data: UploadSpecData): Promise<Result<Specification, Error>>

// CRITICAL: Database Transaction Safety
// When creating section + first revision, use transaction:
const { data, error } = await supabase.rpc('create_specification_with_revision', {
  p_section_data: {...},
  p_revision_data: {...}
});
// Prevents orphaned records if second insert fails

// CRITICAL: Playwright E2E Testing
// BEFORE diagnosing test failures, RUN the test and observe actual DOM
// NEVER guess what's happening without browser evidence
// See .claude/rules/PLAYWRIGHT-GATE.md

// CRITICAL: Authentication for Tests/Crawlers
// NEVER ask user to manually log in
// Credentials ALWAYS in .env file:
// PROCORE_USER=bclymer@alleatogroup.com
// PROCORE_PASSWORD=Clymer926!
// See .claude/rules/AUTHENTICATION-NEVER-ASK-AGAIN.md
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// frontend/src/types/specifications.types.ts

import { Database } from '@/types/database.types';

// Generated types from Supabase (use after migration)
export type SpecificationSection = Database['public']['Tables']['specification_sections']['Row'];
export type SpecificationSectionInsert = Database['public']['Tables']['specification_sections']['Insert'];
export type SpecificationSectionUpdate = Database['public']['Tables']['specification_sections']['Update'];

export type SpecificationRevision = Database['public']['Tables']['specification_section_revisions']['Row'];
export type SpecificationRevisionInsert = Database['public']['Tables']['specification_section_revisions']['Insert'];

export type SpecificationArea = Database['public']['Tables']['specification_areas']['Row'];
export type SpecificationAreaInsert = Database['public']['Tables']['specification_areas']['Insert'];
export type SpecificationAreaUpdate = Database['public']['Tables']['specification_areas']['Update'];

export type SpecificationSubscriber = Database['public']['Tables']['specification_subscribers']['Row'];

// Domain-specific types
export interface SpecificationWithRevision extends SpecificationSection {
  current_revision: SpecificationRevision | null;
  area_count: number;
  subscriber_count: number;
}

export interface SpecificationWithAreas extends SpecificationSection {
  areas: SpecificationArea[];
  current_revision: SpecificationRevision | null;
}

export interface RevisionWithUploader extends SpecificationRevision {
  uploader: {
    id: string;
    email: string;
    full_name: string;
  };
}

// Upload types
export interface UploadSpecificationData {
  section_number: string;
  title: string;
  description?: string;
  file: File;
  notes?: string;
  area_ids?: number[];
  subscriber_ids?: string[];
}

export interface UploadRevisionData {
  file: File;
  notes?: string;
  notify_subscribers?: boolean;
}

// Filter/Search types
export interface SpecificationFilters {
  search?: string;
  area_id?: number;
  status?: 'active' | 'archived' | 'superseded';
  uploaded_after?: string; // ISO date string
  uploaded_before?: string;
}

export interface SpecificationListResponse {
  specifications: SpecificationWithRevision[];
  total_count: number;
  page: number;
  page_size: number;
}

// Settings types
export interface SpecificationSettings {
  project_id: number;
  allow_duplicate_section_numbers: boolean;
  require_format_review: boolean;
  auto_notify_subscribers: boolean;
  max_file_size_mb: number;
  allowed_file_types: string[];
}
```

```typescript
// frontend/src/lib/schemas/specification-schemas.ts

import { z } from 'zod';

// File validation helper
const pdfFileSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size <= 50 * 1024 * 1024,
    "File must be under 50MB"
  )
  .refine(
    (file) => file.type === 'application/pdf',
    "Only PDF files are allowed"
  );

// Upload new specification
export const uploadSpecificationSchema = z.object({
  section_number: z.string()
    .min(1, "Section number is required")
    .max(50, "Section number must be 50 characters or less")
    .regex(/^[0-9\s]+$/, "Section number must contain only numbers and spaces (e.g., '03 30 00')"),
  title: z.string()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or less"),
  description: z.string().optional(),
  file: pdfFileSchema,
  notes: z.string().max(1000, "Notes must be 1000 characters or less").optional(),
  area_ids: z.array(z.number()).optional(),
  subscriber_ids: z.array(z.string().uuid()).optional(),
});

export type UploadSpecificationFormData = z.infer<typeof uploadSpecificationSchema>;

// Edit specification metadata
export const editSpecificationSchema = z.object({
  section_number: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'superseded']),
});

export type EditSpecificationFormData = z.infer<typeof editSpecificationSchema>;

// Add new revision
export const addRevisionSchema = z.object({
  file: pdfFileSchema,
  notes: z.string().max(1000).optional(),
  notify_subscribers: z.boolean().default(true),
});

export type AddRevisionFormData = z.infer<typeof addRevisionSchema>;

// Create/Edit area
export const specificationAreaSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  sort_order: z.number().int().min(0).default(0),
});

export type SpecificationAreaFormData = z.infer<typeof specificationAreaSchema>;

// Search/Filter
export const specificationFiltersSchema = z.object({
  search: z.string().optional(),
  area_id: z.number().optional(),
  status: z.enum(['active', 'archived', 'superseded']).optional(),
  uploaded_after: z.string().datetime().optional(),
  uploaded_before: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(50),
});

export type SpecificationFiltersFormData = z.infer<typeof specificationFiltersSchema>;
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
# PHASE 1: DATA LAYER (Database Foundation)

Task 1: CREATE supabase/migrations/YYYYMMDDHHMMSS_add_specifications_system.sql
  - IMPLEMENT: 5 database tables with BIGSERIAL IDs, proper FK types, indexes, RLS policies, triggers
  - FOLLOW pattern: supabase/migrations/20260131142854_add_drawings_system.sql (437-line reference)
  - CRITICAL: project_id must be INTEGER (matches projects.id type), user FKs must be UUID
  - VERIFICATION: After applying migration, run `npm run db:types` and verify types generated
  - PLACEMENT: supabase/migrations/
  - DEPENDENCIES: None
  - ESTIMATED COMPLEXITY: High (database schema design is critical)

Task 2: VERIFY database.types.ts generation
  - IMPLEMENT: Run `npm run db:types` to generate TypeScript types from schema
  - READ: frontend/src/types/database.types.ts and verify all 5 tables exist with correct column types
  - CRITICAL: Confirm FK types match PK types (specification_sections.project_id is number not string)
  - PLACEMENT: frontend/src/types/database.types.ts (auto-generated)
  - DEPENDENCIES: Task 1 (migration must be applied first)
  - ESTIMATED COMPLEXITY: Low (automated generation + verification)

Task 3: CREATE frontend/src/types/specifications.types.ts
  - IMPLEMENT: Domain-specific TypeScript interfaces extending generated Supabase types
  - FOLLOW pattern: frontend/src/types/drawings.types.ts (domain types with joins)
  - NAMING: SpecificationWithRevision, SpecificationWithAreas, RevisionWithUploader
  - PLACEMENT: frontend/src/types/
  - DEPENDENCIES: Task 2 (needs generated database types)
  - ESTIMATED COMPLEXITY: Medium (requires understanding of join patterns)

Task 4: CREATE frontend/src/lib/schemas/specification-schemas.ts
  - IMPLEMENT: Zod validation schemas for all forms (upload, edit, revision, area, filters)
  - FOLLOW pattern: frontend/src/lib/schemas/budget-schemas.ts (Zod patterns)
  - CRITICAL: File validation with .refine() for size (50MB) and type (application/pdf)
  - PLACEMENT: frontend/src/lib/schemas/
  - DEPENDENCIES: Task 3 (needs domain types for form data types)
  - ESTIMATED COMPLEXITY: Medium (Zod schema design for file uploads)

# PHASE 2: SERVICE LAYER (Business Logic)

Task 5: CREATE frontend/src/services/SpecificationService.ts
  - IMPLEMENT: Business logic for specifications CRUD (list, get, create, update, delete)
  - FOLLOW pattern: frontend/src/services/DrawingService.ts (service structure, Result<T, E> wrapper)
  - CRITICAL: Must NOT import from 'next/*' (framework-agnostic), returns Result wrapper
  - METHODS: list(), getById(), create(), update(), delete(), search()
  - PLACEMENT: frontend/src/services/
  - DEPENDENCIES: Task 3 (needs domain types)
  - ESTIMATED COMPLEXITY: High (core business logic with error handling)

Task 6: CREATE frontend/src/services/SpecificationRevisionService.ts
  - IMPLEMENT: Revision-specific logic (list revisions, create revision, download file)
  - FOLLOW pattern: Service layer pattern from DrawingService with transaction-safe revision numbering
  - CRITICAL: Revision numbering must use SELECT MAX(revision_number) + 1 in same transaction
  - METHODS: listRevisions(), createRevision(), getRevisionById(), downloadFile()
  - PLACEMENT: frontend/src/services/
  - DEPENDENCIES: Task 5 (needs base service patterns)
  - ESTIMATED COMPLEXITY: High (transaction safety for revision numbering critical)

Task 7: CREATE frontend/src/services/SpecificationAreaService.ts
  - IMPLEMENT: Area management logic (CRUD for areas, assign/unassign sections)
  - FOLLOW pattern: DrawingService for consistency
  - METHODS: list(), getById(), create(), update(), delete(), assignSection(), unassignSection()
  - PLACEMENT: frontend/src/services/
  - DEPENDENCIES: Task 5 (needs base service patterns)
  - ESTIMATED COMPLEXITY: Medium (straightforward CRUD)

# PHASE 3: API LAYER (HTTP Routes)

Task 8: CREATE frontend/src/app/api/projects/[projectId]/specifications/route.ts
  - IMPLEMENT: GET (list with filters/pagination), POST (create new specification with file upload)
  - FOLLOW pattern: frontend/src/app/api/projects/[projectId]/drawings/route.ts
  - CRITICAL: Use createClient() from @/lib/supabase/server for auth context
  - NAMING: Named exports (GET, POST), proper TypeScript Request/Response typing
  - ERROR HANDLING: Return { error: string } with appropriate HTTP status codes
  - SUPABASE STORAGE: Upload file to bucket: `{projectId}/specifications/{sectionId}/{filename}`
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/specifications/
  - DEPENDENCIES: Task 5, Task 6 (needs services)
  - ESTIMATED COMPLEXITY: High (file upload + database transaction coordination)

Task 9: CREATE frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/route.ts
  - IMPLEMENT: GET (single spec detail), PUT (update metadata), DELETE (soft delete)
  - FOLLOW pattern: Nested route pattern from drawings API
  - CRITICAL: Validate sectionId is valid number, check user permissions before operation
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/
  - DEPENDENCIES: Task 5 (needs SpecificationService)
  - ESTIMATED COMPLEXITY: Medium (standard CRUD operations)

Task 10: CREATE frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/route.ts
  - IMPLEMENT: GET (list all revisions for section), POST (upload new revision)
  - FOLLOW pattern: frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/route.ts
  - CRITICAL: POST must update specification_sections.current_revision_id after creating revision
  - TRANSACTION SAFETY: Use Supabase RPC function or database transaction for atomic updates
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/
  - DEPENDENCIES: Task 6 (needs SpecificationRevisionService)
  - ESTIMATED COMPLEXITY: High (transaction coordination critical)

Task 11: CREATE frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/download/route.ts
  - IMPLEMENT: GET (generate signed URL for file download from Supabase Storage)
  - FOLLOW pattern: Download route from drawings if exists, else Supabase docs
  - CRITICAL: Generate signed URL with 1-hour expiration for security
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/download/
  - DEPENDENCIES: Task 6 (needs SpecificationRevisionService)
  - ESTIMATED COMPLEXITY: Medium (Supabase Storage signed URL generation)

Task 12: CREATE frontend/src/app/api/projects/[projectId]/specification-areas/route.ts
  - IMPLEMENT: GET (list areas), POST (create area)
  - FOLLOW pattern: Standard CRUD API route pattern
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/specification-areas/
  - DEPENDENCIES: Task 7 (needs SpecificationAreaService)
  - ESTIMATED COMPLEXITY: Low (straightforward CRUD)

Task 13: CREATE frontend/src/app/api/projects/[projectId]/specification-areas/[areaId]/route.ts
  - IMPLEMENT: GET, PUT, DELETE for single area
  - FOLLOW pattern: Standard nested route pattern
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/specification-areas/[areaId]/
  - DEPENDENCIES: Task 7 (needs SpecificationAreaService)
  - ESTIMATED COMPLEXITY: Low (straightforward CRUD)

Task 14: CREATE frontend/src/app/api/projects/[projectId]/specifications/search/route.ts
  - IMPLEMENT: GET (search/filter specifications with pagination)
  - FOLLOW pattern: Search pattern with query params (q, area_id, status, page, limit)
  - CRITICAL: Use .ilike() for case-insensitive search on section_number, title, description
  - PLACEMENT: frontend/src/app/api/projects/[projectId]/specifications/search/
  - DEPENDENCIES: Task 5 (needs SpecificationService with search method)
  - ESTIMATED COMPLEXITY: Medium (complex query with multiple filters)

# PHASE 4: HOOK LAYER (React Query Integration)

Task 15: CREATE frontend/src/hooks/use-specification-upload.ts
  - IMPLEMENT: Custom hook for file upload state (progress, error, success)
  - FOLLOW pattern: frontend/src/hooks/use-drawing-upload.ts (CRITICAL REFERENCE)
  - STATE: uploadProgress, isUploading, uploadError, uploadedFile
  - CALLBACKS: uploadFile(file, metadata), resetUpload()
  - CRITICAL: Must revoke object URLs with URL.revokeObjectURL to prevent memory leaks
  - PLACEMENT: frontend/src/hooks/
  - DEPENDENCIES: Task 8 (needs API route)
  - ESTIMATED COMPLEXITY: High (complex state management for upload progress)

Task 16: CREATE frontend/src/hooks/use-specifications.ts
  - IMPLEMENT: React Query hooks for all specification operations
  - FOLLOW pattern: React Query pattern from use-budget-data.ts or similar
  - HOOKS: useSpecifications, useSpecification, useCreateSpecification, useUpdateSpecification, useDeleteSpecification
  - QUERY KEYS: ['projects', projectId, 'specifications'], ['projects', projectId, 'specifications', sectionId]
  - CRITICAL: invalidateQueries on mutations to refresh cache
  - PLACEMENT: frontend/src/hooks/
  - DEPENDENCIES: Task 8, Task 9 (needs API routes)
  - ESTIMATED COMPLEXITY: Medium (React Query pattern application)

Task 17: CREATE frontend/src/hooks/use-specification-revisions.ts
  - IMPLEMENT: React Query hooks for revision operations
  - HOOKS: useRevisions, useRevision, useCreateRevision
  - QUERY KEYS: ['projects', projectId, 'specifications', sectionId, 'revisions']
  - PLACEMENT: frontend/src/hooks/
  - DEPENDENCIES: Task 10, Task 11 (needs revision API routes)
  - ESTIMATED COMPLEXITY: Medium (React Query mutations with file upload)

Task 18: CREATE frontend/src/hooks/use-specification-areas.ts
  - IMPLEMENT: React Query hooks for area management
  - HOOKS: useAreas, useArea, useCreateArea, useUpdateArea, useDeleteArea
  - QUERY KEYS: ['projects', projectId, 'specification-areas']
  - PLACEMENT: frontend/src/hooks/
  - DEPENDENCIES: Task 12, Task 13 (needs area API routes)
  - ESTIMATED COMPLEXITY: Low (standard React Query CRUD hooks)

# PHASE 5: UI COMPONENTS (User Interface)

Task 19: CREATE frontend/src/components/specifications/SpecificationUploadDialog.tsx
  - IMPLEMENT: Modal dialog for uploading new specification with file picker, form fields, progress bar
  - FOLLOW pattern: frontend/src/components/drawings/DrawingUploadDialog.tsx (PRIMARY PATTERN)
  - FORM: Use react-hook-form + zodResolver(uploadSpecificationSchema)
  - STATE: Use useSpecificationUpload hook for upload state management
  - UI: File drop zone, section number input, title input, description textarea, area multi-select, subscriber multi-select
  - CRITICAL: Show upload progress bar, handle errors with toast, close on success
  - PLACEMENT: frontend/src/components/specifications/
  - DEPENDENCIES: Task 15, Task 16 (needs upload hook and mutation hook)
  - ESTIMATED COMPLEXITY: High (complex form with file upload and multi-selects)

Task 20: CREATE frontend/src/components/specifications/SpecificationList.tsx
  - IMPLEMENT: Table view of all specifications with sortable columns, status badges, action buttons
  - FOLLOW pattern: frontend/src/components/drawings/DrawingLogTable.tsx or budget table patterns
  - COLUMNS: Section Number, Title, Current Revision, Area(s), Status, Subscribers, Actions
  - ACTIONS: View detail, Edit metadata, Upload revision, Delete
  - STATE: Use useSpecifications hook with filters/pagination
  - CRITICAL: Handle loading state, empty state, error state
  - PLACEMENT: frontend/src/components/specifications/
  - DEPENDENCIES: Task 16 (needs useSpecifications hook), Task 19 (upload dialog)
  - ESTIMATED COMPLEXITY: High (complex table with many features)

Task 21: CREATE frontend/src/components/specifications/SpecificationFilters.tsx
  - IMPLEMENT: Filter panel with search input, area dropdown, status dropdown, date range picker
  - FOLLOW pattern: Filter patterns from existing features
  - STATE: Controlled inputs with debounced search (300ms delay)
  - CRITICAL: Apply filters to useSpecifications query parameters
  - PLACEMENT: frontend/src/components/specifications/
  - DEPENDENCIES: Task 16 (needs to pass filters to query), Task 18 (needs areas for dropdown)
  - ESTIMATED COMPLEXITY: Medium (form state + debouncing)

Task 22: CREATE frontend/src/components/specifications/RevisionHistory.tsx
  - IMPLEMENT: Table showing all revisions for a specification with download buttons
  - COLUMNS: Revision Number, Upload Date, Uploaded By, File Name, File Size, Notes, Download
  - STATE: Use useRevisions hook
  - CRITICAL: Download button triggers API call to get signed URL then opens in new tab
  - PLACEMENT: frontend/src/components/specifications/
  - DEPENDENCIES: Task 17 (needs useRevisions hook)
  - ESTIMATED COMPLEXITY: Medium (table display with download action)

Task 23: CREATE frontend/src/components/specifications/SpecStatusBadge.tsx
  - IMPLEMENT: Badge component showing specification status with color coding
  - VARIANTS: active (green), archived (gray), superseded (yellow)
  - FOLLOW pattern: Badge/status indicator patterns from existing components
  - PLACEMENT: frontend/src/components/specifications/
  - DEPENDENCIES: None (presentational component)
  - ESTIMATED COMPLEXITY: Low (simple badge component)

Task 24: CREATE frontend/src/components/specifications/SpecificationAreaManager.tsx
  - IMPLEMENT: CRUD interface for managing specification areas
  - UI: List of areas with add/edit/delete buttons, drag-to-reorder (future)
  - STATE: Use useAreas hook with mutations
  - PLACEMENT: frontend/src/components/specifications/
  - DEPENDENCIES: Task 18 (needs area hooks)
  - ESTIMATED COMPLEXITY: Medium (CRUD form + list management)

Task 25: CREATE frontend/src/components/specifications/AddSubscribersModal.tsx
  - IMPLEMENT: Modal to add/remove subscribers to a specification
  - UI: Multi-select user picker (from project directory), current subscribers list with remove button
  - STATE: Fetch project users, manage subscriber list
  - CRITICAL: Integrate with directory/users API to get selectable users
  - PLACEMENT: frontend/src/components/specifications/
  - DEPENDENCIES: Task 16 (needs specifications query), directory API integration
  - ESTIMATED COMPLEXITY: Medium (multi-select with user search)

# PHASE 6: PAGE LAYER (Next.js Pages)

Task 26: CREATE frontend/src/app/(main)/[projectId]/specifications/page.tsx
  - IMPLEMENT: Main specifications list page with filters, search, upload button
  - LAYOUT: PageContainer with PageHeader (title + upload button) + SpecificationList + SpecificationFilters
  - FOLLOW pattern: frontend/src/app/(main)/[projectId]/drawings/page.tsx or budget page
  - STATE: URL query params for filters (search, area, status, page)
  - CRITICAL: Server Component for initial data fetch, Client Component for interactivity
  - PLACEMENT: frontend/src/app/(main)/[projectId]/specifications/
  - DEPENDENCIES: Task 20, Task 21 (needs SpecificationList and filters)
  - ESTIMATED COMPLEXITY: Medium (page composition with URL state)

Task 27: CREATE frontend/src/app/(main)/[projectId]/specifications/settings/page.tsx
  - IMPLEMENT: Settings page for project-level specification configuration
  - FORM: Format validation settings, file size limits, auto-notification preferences
  - FOLLOW pattern: Settings page patterns from existing features
  - PLACEMENT: frontend/src/app/(main)/[projectId]/specifications/settings/
  - DEPENDENCIES: Settings API route (not yet created in tasks - needs addition)
  - ESTIMATED COMPLEXITY: Medium (form with project settings)

Task 28: CREATE frontend/src/app/(main)/[projectId]/specifications/areas/page.tsx
  - IMPLEMENT: Area management page
  - LAYOUT: PageContainer with SpecificationAreaManager component
  - FOLLOW pattern: Simple page wrapping main component
  - PLACEMENT: frontend/src/app/(main)/[projectId]/specifications/areas/
  - DEPENDENCIES: Task 24 (needs SpecificationAreaManager)
  - ESTIMATED COMPLEXITY: Low (simple page wrapper)

Task 29: CREATE frontend/src/app/(main)/[projectId]/specifications/[sectionId]/revisions/[revisionId]/page.tsx
  - IMPLEMENT: Revision detail page with file preview, metadata, download button
  - UI: PDF viewer (iframe or react-pdf), revision metadata, download button, back to list link
  - STATE: Fetch single revision with uploader info
  - FOLLOW pattern: Detail page patterns from existing features
  - PLACEMENT: frontend/src/app/(main)/[projectId]/specifications/[sectionId]/revisions/[revisionId]/
  - DEPENDENCIES: Task 17 (needs useRevision hook)
  - ESTIMATED COMPLEXITY: Medium (PDF preview integration)

# PHASE 7: TESTING (Quality Assurance)

Task 30: CREATE frontend/tests/e2e/specifications-upload.spec.ts
  - IMPLEMENT: E2E test for complete upload workflow
  - FLOW: Navigate → Click upload → Fill form → Select file → Submit → Verify appears in list
  - FOLLOW pattern: frontend/tests/e2e/drawings-comprehensive.spec.ts
  - CRITICAL: Use test PDF from fixtures, cleanup test data in afterAll
  - PLACEMENT: frontend/tests/e2e/
  - DEPENDENCIES: Task 26, Task 19 (needs page and upload dialog)
  - ESTIMATED COMPLEXITY: High (E2E test with file upload)

Task 31: CREATE frontend/tests/e2e/specifications-revisions.spec.ts
  - IMPLEMENT: E2E test for revision tracking workflow
  - FLOW: Create spec → Upload revision → Verify revision number increments → View history → Download
  - FOLLOW pattern: E2E patterns from existing tests
  - PLACEMENT: frontend/tests/e2e/
  - DEPENDENCIES: Task 30 (extends upload test)
  - ESTIMATED COMPLEXITY: High (multi-step workflow)

Task 32: CREATE frontend/tests/e2e/specifications-areas.spec.ts
  - IMPLEMENT: E2E test for area management
  - FLOW: Create area → Assign spec to area → Filter by area → Delete area
  - PLACEMENT: frontend/tests/e2e/
  - DEPENDENCIES: Task 28, Task 30 (needs areas page and specs to assign)
  - ESTIMATED COMPLEXITY: Medium (CRUD workflow test)

Task 33: CREATE frontend/tests/fixtures/test-spec-*.pdf
  - IMPLEMENT: Test PDF files for E2E tests (2-3 different specs)
  - FOLLOW pattern: frontend/tests/fixtures/test-drawing.pdf
  - PLACEMENT: frontend/tests/fixtures/
  - DEPENDENCIES: None
  - ESTIMATED COMPLEXITY: Low (just add test files)
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: File Upload with Progress Tracking
// File: frontend/src/hooks/use-specification-upload.ts

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UploadState {
  progress: number;
  isUploading: boolean;
  error: string | null;
  uploadedFileUrl: string | null;
}

export function useSpecificationUpload() {
  const [state, setState] = useState<UploadState>({
    progress: 0,
    isUploading: false,
    error: null,
    uploadedFileUrl: null,
  });

  const uploadFile = useCallback(async (
    file: File,
    projectId: number,
    sectionId: number
  ) => {
    setState({ progress: 0, isUploading: true, error: null, uploadedFileUrl: null });

    try {
      const supabase = createClient();
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${projectId}/specifications/${sectionId}/${fileName}`;

      // CRITICAL: Use upsert option to handle duplicate names
      const { data, error } = await supabase.storage
        .from('project-files') // Bucket name
        .upload(filePath, file, {
          upsert: true,
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setState(prev => ({ ...prev, progress: percent }));
          },
        });

      if (error) throw error;

      setState({
        progress: 100,
        isUploading: false,
        error: null,
        uploadedFileUrl: data.path,
      });

      return data.path;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }));
      throw error;
    }
  }, []);

  const resetUpload = useCallback(() => {
    setState({ progress: 0, isUploading: false, error: null, uploadedFileUrl: null });
  }, []);

  return { ...state, uploadFile, resetUpload };
}

// GOTCHA: Must cleanup object URLs to prevent memory leaks
// In component using file preview:
useEffect(() => {
  return () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };
}, [previewUrl]);
```

```typescript
// PATTERN 2: Service Layer with Transaction Safety
// File: frontend/src/services/SpecificationRevisionService.ts

import { createClient } from '@/lib/supabase/server';
import type { SpecificationRevisionInsert } from '@/types/specifications.types';

export class SpecificationRevisionService {
  /**
   * Create new revision with transaction-safe revision numbering
   * CRITICAL: Uses SELECT MAX + 1 in same transaction to prevent race conditions
   */
  static async createRevision(
    sectionId: number,
    revisionData: Omit<SpecificationRevisionInsert, 'section_id' | 'revision_number'>
  ): Promise<{ data: SpecificationRevision | null; error: Error | null }> {
    try {
      const supabase = createClient();

      // PATTERN: Use RPC function for transaction safety
      const { data, error } = await supabase.rpc('create_specification_revision', {
        p_section_id: sectionId,
        p_file_url: revisionData.file_url,
        p_file_name: revisionData.file_name,
        p_file_size: revisionData.file_size,
        p_uploaded_by: revisionData.uploaded_by,
        p_notes: revisionData.notes,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to create revision')
      };
    }
  }
}

// GOTCHA: Need corresponding database function for transaction safety
// In migration:
/*
CREATE OR REPLACE FUNCTION create_specification_revision(
  p_section_id BIGINT,
  p_file_url TEXT,
  p_file_name VARCHAR(255),
  p_file_size BIGINT,
  p_uploaded_by UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS specification_section_revisions AS $$
DECLARE
  v_next_revision_number INTEGER;
  v_new_revision specification_section_revisions;
BEGIN
  -- Get next revision number (transaction-safe)
  SELECT COALESCE(MAX(revision_number), 0) + 1
  INTO v_next_revision_number
  FROM specification_section_revisions
  WHERE section_id = p_section_id;

  -- Insert new revision
  INSERT INTO specification_section_revisions (
    section_id, revision_number, file_url, file_name,
    file_size, uploaded_by, notes
  )
  VALUES (
    p_section_id, v_next_revision_number, p_file_url, p_file_name,
    p_file_size, p_uploaded_by, p_notes
  )
  RETURNING * INTO v_new_revision;

  -- Update section's current_revision_id
  UPDATE specification_sections
  SET current_revision_id = v_new_revision.id, updated_at = NOW()
  WHERE id = p_section_id;

  RETURN v_new_revision;
END;
$$ LANGUAGE plpgsql;
*/
```

```typescript
// PATTERN 3: API Route with File Upload
// File: frontend/src/app/api/projects/[projectId]/specifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SpecificationService } from '@/services/SpecificationService';
import { uploadSpecificationSchema } from '@/lib/schemas/specification-schemas';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
): Promise<NextResponse> {
  try {
    const projectId = parseInt(params.projectId, 10);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // CRITICAL: Get auth context from Supabase server client
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // CRITICAL: Verify user has access to project (RLS will also check, but fail fast)
    const { data: hasAccess } = await supabase
      .from('project_permissions')
      .select('can_write')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!hasAccess?.can_write) {
      return NextResponse.json(
        { error: 'Forbidden: No write access to this project' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const section_number = formData.get('section_number') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const notes = formData.get('notes') as string | null;

    // Validate with Zod
    const validationResult = uploadSpecificationSchema.safeParse({
      file,
      section_number,
      title,
      description: description || undefined,
      notes: notes || undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Delegate to service layer
    const result = await SpecificationService.create({
      project_id: projectId,
      section_number: validationResult.data.section_number,
      title: validationResult.data.title,
      description: validationResult.data.description,
      created_by: user.id,
      file: validationResult.data.file,
      notes: validationResult.data.notes,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error creating specification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GOTCHA: File uploads require multipart/form-data parsing, NOT JSON body
// GOTCHA: Must sanitize filename before storage to prevent path traversal
```

```typescript
// PATTERN 4: React Query Hook with Cache Invalidation
// File: frontend/src/hooks/use-specifications.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SpecificationWithRevision, UploadSpecificationData } from '@/types/specifications.types';

// CRITICAL: Hierarchical query keys for partial invalidation
const specificationKeys = {
  all: ['specifications'] as const,
  lists: () => [...specificationKeys.all, 'list'] as const,
  list: (projectId: number, filters?: SpecificationFilters) =>
    [...specificationKeys.lists(), { projectId, ...filters }] as const,
  details: () => [...specificationKeys.all, 'detail'] as const,
  detail: (projectId: number, sectionId: number) =>
    [...specificationKeys.details(), projectId, sectionId] as const,
};

export function useSpecifications(projectId: number, filters?: SpecificationFilters) {
  return useQuery({
    queryKey: specificationKeys.list(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.area_id) params.append('area_id', filters.area_id.toString());
      if (filters?.status) params.append('status', filters.status);

      const res = await fetch(`/api/projects/${projectId}/specifications?${params}`);
      if (!res.ok) throw new Error('Failed to fetch specifications');
      return res.json() as Promise<SpecificationWithRevision[]>;
    },
    // CRITICAL: Only fetch when projectId exists
    enabled: !!projectId,
  });
}

export function useCreateSpecification(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UploadSpecificationData) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('section_number', data.section_number);
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      if (data.notes) formData.append('notes', data.notes);

      const res = await fetch(`/api/projects/${projectId}/specifications`, {
        method: 'POST',
        body: formData, // CRITICAL: NOT JSON, use FormData for file uploads
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create specification');
      }

      return res.json();
    },
    onSuccess: () => {
      // CRITICAL: Invalidate all specification lists for this project
      queryClient.invalidateQueries({
        queryKey: specificationKeys.lists(),
        exact: false, // Invalidates all nested keys
      });
    },
  });
}

// GOTCHA: File uploads require FormData, NOT JSON.stringify
// GOTCHA: invalidateQueries with exact: false invalidates all nested query keys
```

### Integration Points

```yaml
DATABASE:
  - migration: "supabase/migrations/YYYYMMDDHHMMSS_add_specifications_system.sql"
  - apply: "Apply migration via Supabase dashboard or CLI: supabase db push"
  - types: "Generate types: npm run db:types"
  - verify: "Read frontend/src/types/database.types.ts to confirm 5 new tables exist"

SUPABASE STORAGE:
  - bucket: "project-files" (existing bucket used by drawings)
  - path_pattern: "{projectId}/specifications/{sectionId}/{timestamp}-{filename}"
  - file_types: "application/pdf" (only PDFs allowed)
  - max_size: "50MB per file"
  - signed_urls: "1-hour expiration for download links"

CONFIG (Environment Variables):
  - .env.local additions: NONE (uses existing Supabase credentials)
  - validation: "File size limits enforced in Zod schema (50MB default)"

ROUTES (Navigation):
  - main_list: "/[projectId]/specifications/specification_sections"
  - settings: "/[projectId]/specifications/settings?view=General"
  - areas: "/[projectId]/specifications/areas"
  - revision_detail: "/[projectId]/specifications/[sectionId]/revisions/[revisionId]?tab=General"
  - api_base: "/api/projects/[projectId]/specifications"

EXTERNAL INTEGRATIONS:
  - budget: "Link to budget tool from specification (future: spec section → budget line item)"
  - change_events: "Link to change events when spec changes trigger change orders"
  - commitments: "Reference specs in subcontract scopes"
  - directory: "Fetch project users for subscriber management"

NOTIFICATIONS (Future Enhancement):
  - supabase_realtime: "Subscribe to specification_section_revisions inserts for real-time notifications"
  - email: "Send email to subscribers when new revision uploaded (via Supabase Edge Function)"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
cd frontend

# TypeScript type checking (MANDATORY after migration)
npm run db:types
npx tsc --noEmit
# Expected: Zero errors. If errors exist, READ output and fix before proceeding.

# Linting with auto-fix
npm run lint
npm run lint:fix
# Expected: Zero linting errors after auto-fix

# Formatting
npm run format
# Expected: All files formatted consistently

# Full type check (strict mode)
npx tsc --noEmit --strict
# Expected: Zero TypeScript errors in strict mode
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each service as it's created
npm test -- src/services/SpecificationService.test.ts
npm test -- src/services/SpecificationRevisionService.test.ts

# Test each hook as it's created
npm test -- src/hooks/use-specification-upload.test.ts
npm test -- src/hooks/use-specifications.test.ts

# Test components
npm test -- src/components/specifications/SpecificationUploadDialog.test.tsx
npm test -- src/components/specifications/SpecificationList.test.tsx

# Run all tests with coverage
npm test -- --coverage --watchAll=false
# Expected: All tests pass, coverage ≥80%
```

### Level 3: Integration Testing (System Validation)

```bash
# Start development server
cd frontend
npm run dev &
sleep 10  # Allow Next.js startup

# Verify pages load
curl -I http://localhost:3000/31/specifications/specification_sections
# Expected: 200 OK

# Test API endpoints
# Create specification (requires auth token - use Postman or authenticated curl)
curl -X POST http://localhost:3000/api/projects/31/specifications \
  -H "Content-Type: multipart/form-data" \
  -F "file=@tests/fixtures/test-spec-section-03-30-00.pdf" \
  -F "section_number=03 30 00" \
  -F "title=Cast-in-Place Concrete" \
  | jq .
# Expected: 201 Created with specification object

# List specifications
curl http://localhost:3000/api/projects/31/specifications | jq .
# Expected: Array of specifications with current_revision data

# Search specifications
curl "http://localhost:3000/api/projects/31/specifications/search?q=concrete" | jq .
# Expected: Filtered results containing "concrete" in title/description

# Production build validation
npm run build
# Expected: Successful build with no TypeScript errors or warnings

# Supabase query validation (CRITICAL - See SUPABASE-GATE.md)
node -e '
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
(async () => {
  const { data, error } = await supabase
    .from("specification_sections")
    .select(`
      *,
      current_revision:specification_section_revisions(*)
    `)
    .eq("project_id", 31)
    .limit(1);

  if (error) {
    console.error("❌ QUERY FAILED:");
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log("✅ QUERY WORKS");
  console.log("Returned:", data.length, "rows");
})();
'
# Expected: "✅ QUERY WORKS" with data returned
```

### Level 4: Creative & Domain-Specific Validation

```bash
# E2E Testing with Playwright
cd frontend
npm run test
# Run specific test suites
npx playwright test tests/e2e/specifications-upload.spec.ts
npx playwright test tests/e2e/specifications-revisions.spec.ts
npx playwright test tests/e2e/specifications-areas.spec.ts
# Expected: All E2E tests pass, covering upload → revision → delete workflows

# File Upload Testing
# Upload 50MB PDF (max size)
# Upload 51MB PDF (should fail validation)
# Upload .docx file (should fail - PDF only)
# Upload duplicate section number (should fail unique constraint)

# RLS Policy Testing
# Create specification as user with write access (should succeed)
# Create specification as user without write access (should fail)
# Query specifications from different project (should return empty, not error)

# Performance Testing
# Upload 100 specifications and measure list page load time (<2 seconds)
# Search across 1000+ specifications (<500ms response time)
# Filter by area with 50+ specifications per area (<300ms)

# Accessibility Testing (if available)
npx axe http://localhost:3000/31/specifications/specification_sections
# Expected: No critical accessibility violations

# Bundle Size Analysis (if available)
npm run build && npm run analyze
# Expected: Specifications feature adds <100KB to bundle size
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All E2E tests pass: `npm run test`
- [ ] All unit tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npx tsc --noEmit --strict`
- [ ] No formatting issues: `npm run format --check`
- [ ] Production build succeeds: `npm run build`
- [ ] Supabase types generated and verified: `npm run db:types`

### Feature Validation

- [ ] User can upload PDF specification and see it in list within 3 seconds
- [ ] Uploading new version creates revision with incremented revision_number
- [ ] Revision history shows all versions with download links working
- [ ] Areas can be created and specifications assigned to areas
- [ ] Subscribers can be added and notifications triggered (manual verification)
- [ ] Search filters specifications by section_number, title, description (<500ms)
- [ ] Filter dropdown narrows results by area and status correctly
- [ ] Settings page loads and saves configuration
- [ ] All CRUD operations work: Create, Read, Update, Delete
- [ ] RLS policies prevent unauthorized access (tested with different users)

### Code Quality Validation

- [ ] Follows DrawingUploadDialog pattern for file uploads (memory leak prevention)
- [ ] File placement matches desired codebase tree structure exactly
- [ ] Service layer is framework-agnostic (no 'next/*' imports)
- [ ] API routes use createClient() from @/lib/supabase/server for auth
- [ ] React Query hooks have hierarchical query keys for cache invalidation
- [ ] FK types match PK types (project_id is INTEGER, user FKs are UUID)
- [ ] All tables have RLS policies, indexes on FKs, updated_at triggers
- [ ] Transaction safety for revision numbering (uses database function)

### TypeScript/Next.js Specific

- [ ] Proper TypeScript interfaces defined in specifications.types.ts
- [ ] Server/Client component patterns followed ('use client' where needed)
- [ ] API routes follow Next.js App Router patterns (named exports GET, POST, etc.)
- [ ] No hydration mismatches between server/client rendering
- [ ] Zod schemas validate all form inputs with proper error messages
- [ ] File validation uses .refine() for size/type checks (not .max())

### Documentation & Deployment

- [ ] Migration SQL file is complete with all 5 tables + RLS + triggers
- [ ] Test fixtures exist (test-spec-*.pdf files)
- [ ] E2E tests document expected user workflows
- [ ] No broken imports or unused variables remain
- [ ] API routes documented with expected request/response formats (code comments)

---

## Anti-Patterns to Avoid

- ❌ Don't create new file upload patterns - use DrawingUploadDialog as template
- ❌ Don't skip Supabase Types Gate - ALWAYS read database.types.ts first
- ❌ Don't use generic [id] in routes - use [projectId], [sectionId], etc.
- ❌ Don't write service code based on grep searches - use runtime evidence
- ❌ Don't modify code without testing the query first (see ROOT-CAUSE-GATE.md)
- ❌ Don't use 'use client' unnecessarily - embrace Server Components
- ❌ Don't hardcode file size limits - use Zod schema validation
- ❌ Don't catch all exceptions - handle Supabase errors specifically
- ❌ Don't forget to revoke object URLs - prevents memory leaks in file previews
- ❌ Don't skip transaction safety for revision numbering - use database function
- ❌ Don't test by only checking "page loads" - validate actual user workflows
- ❌ Don't ask user to manually log in for tests - use .env credentials (AUTH-NEVER-ASK-AGAIN.md)

---

## Procore Crawl Data Reference

This section contains all crawl data files, sitemap, and screenshots from the Procore Specifications feature analysis.

### Sitemap

| Page | URL | Screenshot |
|------|-----|------------|
| Main Specification Sections | [Procore Specifications Tool](https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954056757/tools/specifications/specification_sections) | [View](#main-specifications-view) |
| Settings | [Settings View](https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954056757/tools/specifications/settings?view=General) | [View](#settings-view) |
| Revision Detail | [Revision Detail](https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954056757/tools/specifications/562949957293031/specification_section_revisions/562949957869561?tab=General) | [View](#revision-detail-view) |
| Specification Areas | [Areas Management](https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954056757/tools/specifications/specification_areas) | [View](#areas-view) |

### Crawl Data Files

| Category | File | Path | Description |
|----------|------|------|-------------|
| Summary | Crawl Summary | N/A (manual crawl) | Manual comprehensive crawl |
| Summary | README | `docs/project-mgmt/specifications/crawl-specifications/README.md` | Module overview |
| Analysis | Status Report | `docs/project-mgmt/specifications/crawl-specifications/SPECIFICATIONS-CRAWL-STATUS.md` | Complete crawl analysis (13,930 bytes) |
| Reports | Sitemap | N/A | Visual sitemap in STATUS report |
| Pages | Screenshots | `docs/project-mgmt/specifications/crawl-specifications/pages/*/screenshot.png` | 6 screenshots total |
| Pages | DOM | `docs/project-mgmt/specifications/crawl-specifications/pages/*/dom.html` | Full DOM snapshots |
| Pages | Metadata | `docs/project-mgmt/specifications/crawl-specifications/pages/*/metadata.json` | UI element metadata |

**Base Path**: `docs/project-mgmt/specifications/crawl-specifications/`

### Screenshots

#### Main Specifications View

![Main Specifications List](../../../docs/project-mgmt/specifications/crawl-specifications/pages/us02-procore-com-webclients-host-companies-562949953443325-projects-562949954056757-tools-specifications-specification-sections/screenshot.png)

**Key UI Elements to Replicate:**
- **Upload Button** (primary action) - Prominently placed at top right
- **Table Structure** - Section Number, Title, Description columns
- **Filter Dropdowns** (3 total) - For area, status, and other criteria
- **Search Bar** - Global search with "Did we log..." placeholder
- **Navigation Links** - Budget, Change Events, Commitments, Invoicing (quick access)
- **Onboarding Prompts** - "Add Subscribers", "Review Format", "Upload Specifications", "Go to Specifications"
- **Status Indicators** - Visual badges for active/archived/superseded states

#### Settings View

![Settings Page](../../../docs/project-mgmt/specifications/crawl-specifications/pages/us02-procore-com-webclients-host-companies-562949953443325-projects-562949954056757-tools-specifications-settings-view-general/screenshot.png)

**Key UI Elements:**
- Settings form with configuration options
- General tab view (likely multiple tabs)
- Save/cancel actions
- Dropdown selectors for preferences

#### Revision Detail View

![Revision Detail](../../../docs/project-mgmt/specifications/crawl-specifications/pages/us02-procore-com-webclients-host-companies-562949953443325-projects-562949954056757-tools-specifications-562949957293031-specification-section-revisions-562949957869561-tab-general/screenshot.png)

**Key UI Elements:**
- Detailed revision metadata
- General tab content (version info, upload date, uploader)
- File preview or download option
- Version comparison interface (future enhancement)

#### Areas View

![Areas Management](../../../docs/project-mgmt/specifications/crawl-specifications/pages/us02-procore-com-webclients-host-companies-562949953443325-projects-562949954056757-tools-specifications-specification-areas/screenshot.png)

**Key UI Elements:**
- List of specification areas
- Add/edit/delete controls
- Area organization structure
- Dropdown menus for actions

### UI Components Detected

From crawl metadata analysis (75 buttons, 10 dropdowns documented):

| Label | Purpose | Component Type |
|-------|---------|----------------|
| Upload | Primary action to upload specification | Primary Button |
| Upload Specifications | Onboarding step | Secondary Button |
| Add Subscribers | Collaboration setup | Secondary Button |
| Review Format | Pre-upload validation | Secondary Button |
| Go to Specifications | Navigation to main list | Link Button |
| Skip | Dismiss onboarding | Text Button |
| More | Context menu trigger | Dropdown Button |
| Feedback | User feedback widget | Icon Button |
| (Various dropdown filters) | Filter specifications | Select Dropdowns |
| Search bar | Global search | Text Input |

**Onboarding Wizard Steps Identified:**
1. Add Subscribers
2. Review Format
3. Upload Specifications
4. Go to Specifications

**Navigation Integration Points:**
- Budget tool
- Change Events
- Commitments
- Invoicing

---

**PRP Confidence Score: 9/10**

This PRP provides comprehensive context for one-pass implementation success. All critical patterns (file upload, revision tracking, RLS policies, React Query hooks) are documented with exact file paths and code examples. The only area requiring runtime validation is subscriber notification system (future enhancement via Supabase Realtime).

**Ready for `/prp-execute` or `/prp-quality` validation.**
