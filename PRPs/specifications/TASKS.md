# Specifications Feature - Implementation Tasks

**Status**: NOT STARTED
**Confidence Score**: 9/10
**PRP Document**: [prp-specifications.md](./prp-specifications.md)

---

## Progress Summary

**Phases**: 7 total (Data, Service, API, Hook, UI, Page, Testing)
**Total Tasks**: 33
**Completed**: 0
**In Progress**: 0
**Blocked**: 0

---

## PHASE 1: DATA LAYER (Database Foundation)

### Task 1: CREATE Database Migration
**Status**: ⬜ NOT STARTED
**File**: `supabase/migrations/YYYYMMDDHHMMSS_add_specifications_system.sql`
**Dependencies**: None
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Create 5 tables: specification_sections, specification_section_revisions, specification_areas, specification_area_sections, specification_subscribers
- Add BIGSERIAL IDs, INTEGER for project_id FK (matches projects.id)
- Create indexes on all foreign keys
- Add RLS policies for all tables (check project_permissions)
- Create updated_at triggers for timestamp columns
- Create database function for transaction-safe revision creation

**Verification**:
```bash
# Apply migration
cd frontend
npx supabase migration new add_specifications_system
# (paste migration SQL)
npx supabase db push
```

**Definition of Done**:
- [ ] Migration file created with all 5 tables
- [ ] All tables have RLS policies
- [ ] All tables have updated_at triggers
- [ ] Database function created for revision numbering
- [ ] Migration applied successfully

---

### Task 2: VERIFY Database Types Generation
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/types/database.types.ts` (auto-generated)
**Dependencies**: Task 1
**Complexity**: ⭐ Low

**Implementation**:
```bash
npm run db:types
```

**Verification**:
- Read `database.types.ts`
- Confirm `specification_sections` table exists with `project_id: number`
- Confirm `specification_section_revisions` table exists
- Confirm `specification_areas` table exists
- Confirm FK types match PK types

**Definition of Done**:
- [ ] Types generated successfully
- [ ] All 5 tables present in types file
- [ ] FK types verified (project_id is number, user FKs are string)

---

### Task 3: CREATE Domain Types
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/types/specifications.types.ts`
**Dependencies**: Task 2
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Define domain-specific interfaces extending Supabase types
- Create SpecificationWithRevision, SpecificationWithAreas, RevisionWithUploader
- Define UploadSpecificationData, UploadRevisionData interfaces
- Define SpecificationFilters, SpecificationListResponse interfaces

**Verification**:
```bash
npx tsc --noEmit
```

**Definition of Done**:
- [ ] File created with all domain types
- [ ] Types extend generated Supabase types
- [ ] No TypeScript compilation errors

---

### Task 4: CREATE Zod Validation Schemas
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/lib/schemas/specification-schemas.ts`
**Dependencies**: Task 3
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Create uploadSpecificationSchema with file validation
- Create editSpecificationSchema for metadata updates
- Create addRevisionSchema for new revisions
- Create specificationAreaSchema for areas
- Create specificationFiltersSchema for search/filter

**Verification**:
```typescript
// Test file validation
const result = uploadSpecificationSchema.safeParse({
  section_number: "03 30 00",
  title: "Test",
  file: new File([], "test.pdf", { type: 'application/pdf' })
});
console.log(result.success); // Should be true
```

**Definition of Done**:
- [ ] All 5 schemas created
- [ ] File validation uses .refine() for size and type
- [ ] Test validation with sample data passes

---

## PHASE 2: SERVICE LAYER (Business Logic)

### Task 5: CREATE SpecificationService
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/services/SpecificationService.ts`
**Dependencies**: Task 3
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Static class with list(), getById(), create(), update(), delete(), search() methods
- Returns Result<T, Error> wrapper pattern
- No 'next/*' imports (framework-agnostic)
- Handles Supabase query errors

**Verification**:
```bash
# Create basic test
npm test -- src/services/SpecificationService.test.ts
```

**Definition of Done**:
- [ ] Service class created with all CRUD methods
- [ ] Returns Result wrapper pattern
- [ ] No framework dependencies
- [ ] Basic unit tests pass

---

### Task 6: CREATE SpecificationRevisionService
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/services/SpecificationRevisionService.ts`
**Dependencies**: Task 5
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Methods: listRevisions(), createRevision(), getRevisionById(), downloadFile()
- Transaction-safe revision numbering using database function
- Update specification_sections.current_revision_id after creating revision

**Verification**:
```bash
npm test -- src/services/SpecificationRevisionService.test.ts
```

**Definition of Done**:
- [ ] Service created with revision methods
- [ ] Uses database function for transaction safety
- [ ] Updates current_revision_id correctly
- [ ] Unit tests verify revision numbering

---

### Task 7: CREATE SpecificationAreaService
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/services/SpecificationAreaService.ts`
**Dependencies**: Task 5
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Methods: list(), getById(), create(), update(), delete(), assignSection(), unassignSection()
- Handle many-to-many relationship with specification_area_sections

**Verification**:
```bash
npm test -- src/services/SpecificationAreaService.test.ts
```

**Definition of Done**:
- [ ] Service created with area methods
- [ ] Handles section assignment/unassignment
- [ ] Unit tests pass

---

## PHASE 3: API LAYER (HTTP Routes)

### Task 8: CREATE Main Specifications API Route
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/api/projects/[projectId]/specifications/route.ts`
**Dependencies**: Task 5, Task 6
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- GET: List specifications with filters/pagination
- POST: Create new specification with file upload
- Use createClient() from @/lib/supabase/server
- Validate projectId, check user permissions
- Upload file to Supabase Storage: `{projectId}/specifications/{sectionId}/{filename}`

**Verification**:
```bash
# Start dev server
npm run dev

# Test GET
curl http://localhost:3000/api/projects/31/specifications | jq .

# Test POST (requires auth token)
curl -X POST http://localhost:3000/api/projects/31/specifications \
  -F "file=@tests/fixtures/test-spec.pdf" \
  -F "section_number=03 30 00" \
  -F "title=Test Spec" | jq .
```

**Definition of Done**:
- [ ] GET endpoint returns specifications list
- [ ] POST endpoint creates specification with file upload
- [ ] Proper error handling with HTTP status codes
- [ ] RLS policies enforced via Supabase client

---

### Task 9: CREATE Single Specification API Route
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/route.ts`
**Dependencies**: Task 5
**Complexity**: ⭐⭐ Medium

**Implementation**:
- GET: Fetch single specification detail
- PUT: Update specification metadata
- DELETE: Soft delete specification (set status to 'archived')

**Verification**:
```bash
curl http://localhost:3000/api/projects/31/specifications/123 | jq .
```

**Definition of Done**:
- [ ] GET returns single specification
- [ ] PUT updates metadata
- [ ] DELETE marks as archived
- [ ] Validates sectionId is number

---

### Task 10: CREATE Revisions API Route
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/route.ts`
**Dependencies**: Task 6
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- GET: List all revisions for section
- POST: Upload new revision (increments revision_number, updates current_revision_id)
- Use transaction-safe database function

**Verification**:
```bash
# List revisions
curl http://localhost:3000/api/projects/31/specifications/123/revisions | jq .

# Upload new revision
curl -X POST http://localhost:3000/api/projects/31/specifications/123/revisions \
  -F "file=@tests/fixtures/test-spec-v2.pdf" \
  -F "notes=Updated concrete specs" | jq .
```

**Definition of Done**:
- [ ] GET returns revision list
- [ ] POST creates new revision with incremented number
- [ ] current_revision_id updated atomically
- [ ] Transaction safety verified

---

### Task 11: CREATE Revision Download API Route
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/download/route.ts`
**Dependencies**: Task 6
**Complexity**: ⭐⭐ Medium

**Implementation**:
- GET: Generate signed URL for file download from Supabase Storage
- 1-hour expiration for signed URL
- Return URL in response

**Verification**:
```bash
curl http://localhost:3000/api/projects/31/specifications/123/revisions/456/download | jq .
# Should return: { "url": "https://..." }
```

**Definition of Done**:
- [ ] Generates signed URL successfully
- [ ] URL has 1-hour expiration
- [ ] Returns JSON with url field

---

### Task 12-14: CREATE Areas API Routes
**Status**: ⬜ NOT STARTED
**Files**:
- `frontend/src/app/api/projects/[projectId]/specification-areas/route.ts`
- `frontend/src/app/api/projects/[projectId]/specification-areas/[areaId]/route.ts`

**Dependencies**: Task 7
**Complexity**: ⭐ Low (standard CRUD)

**Implementation**:
- GET /areas: List all areas
- POST /areas: Create area
- GET /areas/[id]: Get single area
- PUT /areas/[id]: Update area
- DELETE /areas/[id]: Delete area

**Verification**:
```bash
curl http://localhost:3000/api/projects/31/specification-areas | jq .
```

**Definition of Done**:
- [ ] All CRUD operations work
- [ ] Proper validation and error handling

---

### Task 14: CREATE Search API Route
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/api/projects/[projectId]/specifications/search/route.ts`
**Dependencies**: Task 5
**Complexity**: ⭐⭐ Medium

**Implementation**:
- GET with query params: q, area_id, status, page, limit
- Use .ilike() for case-insensitive search on section_number, title, description
- Return paginated results

**Verification**:
```bash
curl "http://localhost:3000/api/projects/31/specifications/search?q=concrete&status=active" | jq .
```

**Definition of Done**:
- [ ] Search works with multiple filters
- [ ] Pagination returns correct page
- [ ] Case-insensitive search works

---

## PHASE 4: HOOK LAYER (React Query Integration)

### Task 15: CREATE Upload Hook
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/hooks/use-specification-upload.ts`
**Dependencies**: Task 8
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Copy pattern from `use-drawing-upload.ts`
- State: uploadProgress, isUploading, uploadError, uploadedFileUrl
- Functions: uploadFile(file, metadata), resetUpload()
- Cleanup: URL.revokeObjectURL to prevent memory leaks

**Verification**:
```typescript
const { uploadFile, uploadProgress, isUploading } = useSpecificationUpload();
// Test upload simulation
```

**Definition of Done**:
- [ ] Hook created with upload state management
- [ ] Progress tracking works
- [ ] Memory leak prevention (URL.revokeObjectURL)
- [ ] Error handling functional

---

### Task 16: CREATE Specifications Query Hooks
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/hooks/use-specifications.ts`
**Dependencies**: Task 8, Task 9
**Complexity**: ⭐⭐ Medium

**Implementation**:
- useSpecifications, useSpecification, useCreateSpecification, useUpdateSpecification, useDeleteSpecification
- Query keys: ['projects', projectId, 'specifications']
- Cache invalidation on mutations

**Verification**:
```typescript
const { data, isLoading } = useSpecifications(31);
const { mutate } = useCreateSpecification(31);
```

**Definition of Done**:
- [ ] All CRUD hooks created
- [ ] Query keys hierarchical
- [ ] Cache invalidation works

---

### Task 17-18: CREATE Revision and Area Hooks
**Status**: ⬜ NOT STARTED
**Files**:
- `frontend/src/hooks/use-specification-revisions.ts`
- `frontend/src/hooks/use-specification-areas.ts`

**Dependencies**: Task 10, Task 12
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Follow same React Query pattern as Task 16
- Proper query keys and cache invalidation

**Definition of Done**:
- [ ] Hooks created for revisions and areas
- [ ] Query/mutation patterns consistent

---

## PHASE 5: UI COMPONENTS (User Interface)

### Task 19: CREATE Upload Dialog
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/components/specifications/SpecificationUploadDialog.tsx`
**Dependencies**: Task 15, Task 16
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Copy pattern from DrawingUploadDialog.tsx
- Form: react-hook-form + zodResolver(uploadSpecificationSchema)
- File drop zone, form fields, progress bar
- Multi-select for areas and subscribers

**Verification**:
- Test in browser: Upload file → See progress → Success toast → Close dialog

**Definition of Done**:
- [ ] Dialog renders with form
- [ ] File upload works with progress tracking
- [ ] Form validation shows errors
- [ ] Success/error handling functional

---

### Task 20: CREATE Specification List
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/components/specifications/SpecificationList.tsx`
**Dependencies**: Task 16, Task 19
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Table with columns: Section Number, Title, Current Revision, Area(s), Status, Actions
- Sortable columns
- Action buttons: View, Edit, Upload Revision, Delete
- Handle loading/empty/error states

**Verification**:
- Render in browser with test data
- Sort columns, click actions

**Definition of Done**:
- [ ] Table renders with all columns
- [ ] Sorting works
- [ ] Actions trigger correct functions
- [ ] Loading/empty states display

---

### Task 21: CREATE Filters Component
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/components/specifications/SpecificationFilters.tsx`
**Dependencies**: Task 16, Task 18
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Search input with debounce (300ms)
- Area dropdown (multi-select)
- Status dropdown (single select)
- Date range picker (optional)

**Verification**:
- Type in search → Wait 300ms → Query updates
- Select filter → Results update

**Definition of Done**:
- [ ] All filter inputs rendered
- [ ] Debounce works
- [ ] Filters apply to query

---

### Task 22-25: CREATE Supporting Components
**Status**: ⬜ NOT STARTED
**Files**:
- `RevisionHistory.tsx`
- `SpecStatusBadge.tsx`
- `SpecificationAreaManager.tsx`
- `AddSubscribersModal.tsx`

**Dependencies**: Various
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Follow existing component patterns
- Proper TypeScript typing
- Consistent styling

**Definition of Done**:
- [ ] All components created
- [ ] Render without errors
- [ ] Functionality tested

---

## PHASE 6: PAGE LAYER (Next.js Pages)

### Task 26: CREATE Main List Page
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/(main)/[projectId]/specifications/page.tsx`
**Dependencies**: Task 20, Task 21
**Complexity**: ⭐⭐ Medium

**Implementation**:
- PageContainer + PageHeader + SpecificationList + SpecificationFilters
- Server Component for initial fetch, Client Components for interactivity
- URL query params for filters

**Verification**:
```bash
# Navigate in browser
http://localhost:3000/31/specifications/specification_sections
```

**Definition of Done**:
- [ ] Page renders correctly
- [ ] Upload button opens dialog
- [ ] List displays specifications
- [ ] Filters work with URL params

---

### Task 27-29: CREATE Settings, Areas, Revision Detail Pages
**Status**: ⬜ NOT STARTED
**Files**:
- `specifications/settings/page.tsx`
- `specifications/areas/page.tsx`
- `specifications/[sectionId]/revisions/[revisionId]/page.tsx`

**Dependencies**: Various
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Follow existing page patterns
- Proper layouts and navigation

**Definition of Done**:
- [ ] All pages render
- [ ] Navigation works
- [ ] Functionality verified

---

## PHASE 7: TESTING (Quality Assurance)

### Task 30: CREATE Upload E2E Test
**Status**: ⬜ NOT STARTED
**File**: `frontend/tests/e2e/specifications-upload.spec.ts`
**Dependencies**: Task 26, Task 19
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Full user workflow: Navigate → Click Upload → Fill Form → Submit → Verify in List
- Use test PDF from fixtures
- Cleanup test data in afterAll

**Verification**:
```bash
npx playwright test tests/e2e/specifications-upload.spec.ts
```

**Definition of Done**:
- [ ] Test written following E2E standards
- [ ] Upload workflow passes
- [ ] Cleanup works

---

### Task 31-32: CREATE Revision and Area E2E Tests
**Status**: ⬜ NOT STARTED
**Files**:
- `specifications-revisions.spec.ts`
- `specifications-areas.spec.ts`

**Dependencies**: Task 30
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Revision test: Create → Upload Revision → Verify Increment → View History
- Area test: Create Area → Assign Spec → Filter by Area

**Verification**:
```bash
npx playwright test tests/e2e/specifications-revisions.spec.ts
npx playwright test tests/e2e/specifications-areas.spec.ts
```

**Definition of Done**:
- [ ] Both tests pass
- [ ] Cover full workflows
- [ ] Cleanup data

---

### Task 33: CREATE Test Fixtures
**Status**: ⬜ NOT STARTED
**Files**: `frontend/tests/fixtures/test-spec-*.pdf`
**Dependencies**: None
**Complexity**: ⭐ Low

**Implementation**:
- Add 2-3 test PDF files for E2E tests

**Definition of Done**:
- [ ] Test PDFs added to fixtures
- [ ] Used in E2E tests

---

## Session Log

_This section tracks AI agent progress during implementation._

### Session 1: [Date]
**Agent**: [Name]
**Tasks Completed**: None yet
**Notes**: PRP created, ready for implementation

---

## Blockers

_Track any blockers preventing progress._

No blockers currently.

---

## Notes

- **PRP Confidence Score**: 9/10
- **Estimated Total Time**: 40-60 hours for complete implementation
- **Critical Path**: Tasks 1-2 (database) must complete before all others
- **High-Risk Tasks**: Task 8 (file upload API), Task 10 (revision transaction safety), Task 19 (upload dialog)
- **Testing Strategy**: Unit tests for services, E2E tests for full workflows

---

**Last Updated**: 2026-02-01 (PRP creation)
