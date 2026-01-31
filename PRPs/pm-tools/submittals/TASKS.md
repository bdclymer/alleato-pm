# Submittals Implementation Tasks

## 📊 Progress Dashboard

| Phase | Tasks | Status |
|-------|-------|--------|
| **Phase 1: Database** | 3 tasks | ⚪ Not Started |
| **Phase 2: API Routes** | 2 tasks | ⚪ Not Started |
| **Phase 3: Core UI** | 7 tasks | ⚪ Not Started |
| **Phase 4: Integration** | 2 tasks | ⚪ Not Started |
| **Phase 5: Validation** | 2 tasks | ⚪ Not Started |
| **TOTAL** | **16 tasks** | **0% Complete** |

---

## 🎯 Phase 1: Database Foundation
*Set up the data layer with proper schema and types*

### ✅ Prerequisites
- [ ] Verify you're on latest main branch
- [ ] Local Supabase running (`npx supabase start`)
- [ ] Types are current (`npm run db:types`)

### 📋 Tasks

#### 1.1 Create Database Schema
- [ ] **Create Supabase migration** for submittals tables
  - **File**: `supabase/migrations/[timestamp]_create_submittals_schema.sql`
  - **Tables to create**:
    - `submittals` (main table)
    - `submittal_packages`
    - `submittal_workflow_steps`
    - `submittal_responses`
    - `submittal_distributions`
    - `submittal_distribution_recipients`
    - `submittal_attachments`
    - `submittal_linked_drawings`
  - **Requirements**:
    - ⚠️ `project_id` must be INTEGER (not UUID)
    - ⚠️ RLS policies must use `project_directory_memberships`
    - Include indexes for performance
    - Create `active_submittals` VIEW
  - **Reference**: `scripts/playwright-crawl/procore-crawls/submittals/spec/schema.sql`
  - **Pattern**: `.claude/scaffolds/crud-resource/migration.sql`

#### 1.2 Create Validation Schemas
- [ ] **Create Zod schemas** for form validation
  - **File**: `frontend/src/lib/schemas/submittal.ts`
  - **Schemas needed**:
    - `createSubmittalSchema`
    - `updateSubmittalSchema`
    - `submittalFiltersSchema`
  - **Reference**: Form fields in `scripts/playwright-crawl/procore-crawls/submittals/spec/FORMS.md`
  - **Pattern**: `frontend/src/lib/schemas/common.ts` (use `optionalNumber` helpers)

#### 1.3 Create Service Layer
- [ ] **Create submittal service** for data operations
  - **File**: `frontend/src/services/submittalService.ts`
  - **Methods**:
    - `list()` - with filters and pagination
    - `getById()` - with joined relations
    - `create()` - with validation
    - `update()` - with validation
    - `softDelete()` - mark as deleted
  - **Pattern**: `frontend/src/services/directoryService.ts` (class-based with DI)

---

## 🔌 Phase 2: API Routes
*Create REST endpoints for client-server communication*

### 📋 Tasks

#### 2.1 List/Create Endpoint
- [ ] **Create list/create API route**
  - **File**: `frontend/src/app/api/projects/[projectId]/submittals/route.ts`
  - **Methods**:
    - `GET` - List with filters (query params)
    - `POST` - Create with Zod validation
  - ⚠️ **CRITICAL**: Use `[projectId]` naming (never generic `[id]`)

#### 2.2 Detail/Update/Delete Endpoint
- [ ] **Create detail API routes**
  - **File**: `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts`
  - **Methods**:
    - `GET` - Detail with relations
    - `PUT` - Update with validation
    - `DELETE` - Soft delete
  - ⚠️ **CRITICAL**: Use `[submittalId]` naming

---

## 🎨 Phase 3: User Interface
*Build the UI components and pages*

### 📋 Tasks

#### 3.1 Create React Hook
- [ ] **Create data fetching hook**
  - **File**: `frontend/src/hooks/use-submittals.ts`
  - **Returns**:
    - `submittals[]` - list data
    - `isLoading` - loading state
    - `error` - error state
    - `refetch()` - refresh data
    - `createSubmittal()` - create mutation
    - `updateSubmittal()` - update mutation
    - `deleteSubmittal()` - delete mutation
  - **Pattern**: `frontend/src/hooks/use-contacts.ts`

#### 3.2 Enhance List View
- [ ] **Update submittals table component**
  - **File**: `frontend/src/app/(tables)/submittals/submittals-client.tsx`
  - **12 Required Columns** (must match Procore exactly):
    1. Spec
    2. #
    3. Rev
    4. Title
    5. Type
    6. Status
    7. Responsible Contractor
    8. Received From
    9. Ball In Court
    10. Approvers
    11. Response
    12. Sent Date
  - **Status Values**: Draft, Open, Distributed, Closed
  - **Features**:
    - Row click → detail page navigation
    - 11 filter options
    - Status cards with counts
  - **Reference**: `scripts/playwright-crawl/procore-crawls/submittals/spec/COMMANDS.md`

#### 3.3 Create Form Dialog
- [ ] **Build create/edit form modal**
  - **File**: `frontend/src/components/domain/submittals/SubmittalFormDialog.tsx`
  - **Form Sections**:
    - General Information (14 fields)
    - Distribution & Scheduling (4 fields)
    - Content (3 fields)
  - **Features**:
    - React Hook Form + Zod validation
    - Searchable dropdowns for contacts/companies
    - File upload for attachments
  - **Pattern**: `frontend/src/components/domain/contacts/ContactFormDialog.tsx`

#### 3.4 Create Detail View
- [ ] **Build detail page component**
  - **File**: `frontend/src/app/(tables)/submittals/submittal-detail-client.tsx`
  - **4 Required Tabs**:
    1. General - Main info, distribution, responses
    2. Related Items - Linked drawings, RFIs, etc.
    3. Emails - Communication history
    4. Change History - Audit log
  - **Toolbar Actions**: Edit, Redistribute, Actions dropdown

#### 3.5 Create Detail Page
- [ ] **Create server component for detail route**
  - **File**: `frontend/src/app/(main)/[projectId]/submittals/[submittalId]/page.tsx`
  - **Function**: Fetch data server-side, pass to client component
  - ⚠️ **CRITICAL**: Use `[submittalId]` parameter

#### 3.6 Create Workflow Component
- [ ] **Build workflow response display**
  - **File**: `frontend/src/components/domain/submittals/SubmittalWorkflowResponses.tsx`
  - **Features**:
    - Response cards per person
    - Status badges (Pending, Approved, Rejected, etc.)
    - Comments display
    - Attachment indicators

#### 3.7 Create Distribution Component
- [ ] **Build distribution summary**
  - **File**: `frontend/src/components/domain/submittals/SubmittalDistributionSummary.tsx`
  - **Shows**:
    - From (sender)
    - To (recipient list)
    - Message
    - Attachments

---

## 🔧 Phase 4: Integration
*Connect all components together*

### 📋 Tasks

#### 4.1 Wire List View
- [ ] **Connect list page to data**
  - Connect to `use-submittals` hook
  - Wire "Add Submittal" button → form dialog
  - Connect row clicks → detail navigation
  - Wire Recycle Bin tab to soft-deleted items
  - Connect filter dropdowns to query

#### 4.2 Wire Form Dialog
- [ ] **Connect form to API**
  - Wire to create/update API routes
  - Add success/error toast notifications
  - Trigger data refetch on success
  - Connect contact/company searches

---

## ✅ Phase 5: Validation & Testing
*Ensure everything works correctly*

### 📋 Tasks

#### 5.1 Technical Validation
- [ ] **Run all quality checks**
  ```bash
  npm run db:types        # Regenerate types
  npx tsc --noEmit       # Must have 0 type errors
  npm run lint           # Must have 0 lint errors
  npm run build          # Must build successfully
  npm run check:routes   # No route conflicts
  ```

#### 5.2 User Acceptance Testing
- [ ] **Manual feature verification**
  - [ ] List page loads with 12 columns
  - [ ] Create button opens form dialog
  - [ ] Can create new submittal
  - [ ] List updates after creation
  - [ ] Row click navigates to detail
  - [ ] Detail page shows all 4 tabs
  - [ ] Edit button pre-fills form
  - [ ] Can update submittal
  - [ ] Delete moves to Recycle Bin
  - [ ] All filters work correctly
  - [ ] Status cards show accurate counts

---

## 📚 Quick Reference

### Key Files & Locations
```
📁 Database
├── supabase/migrations/              # SQL migrations
└── frontend/src/types/database.types.ts  # Generated types

📁 Backend
├── frontend/src/services/submittalService.ts
├── frontend/src/hooks/use-submittals.ts
└── frontend/src/app/api/projects/[projectId]/submittals/

📁 Frontend
├── frontend/src/app/(tables)/submittals/     # List views
├── frontend/src/app/(main)/[projectId]/submittals/  # Detail pages
└── frontend/src/components/domain/submittals/   # Components
```

### Reference Documents
- **PRP**: `PRPs/pm-tools/submittals/prp-submittals.md`
- **Crawl Data**: `scripts/playwright-crawl/procore-crawls/submittals/`
- **Specifications**: `scripts/playwright-crawl/procore-crawls/submittals/spec/`

### Common Commands
```bash
# Development workflow
npm run dev              # Start dev server
npm run db:types         # Update TypeScript types
npx tsc --noEmit        # Check for type errors

# Before committing
npm run quality          # Run all checks
npm run build           # Verify production build
```

---

## 📝 Session Log

### 2026-01-31
- Reorganized task list for clarity
- Grouped tasks by implementation phase
- Added visual indicators and better structure

### 2026-01-28
- Initial implementation planning
- Created PRP document
- Defined 17 implementation tasks

---

## 💡 Tips for Success

1. **Complete phases in order** - Each phase builds on the previous
2. **Test as you go** - Don't wait until the end to test
3. **Check types frequently** - Run `npx tsc --noEmit` after each task
4. **Use the patterns** - Referenced files show the correct approach
5. **Keep this updated** - Mark tasks complete as you finish them

---

**Remember**: The goal is feature parity with Procore. When in doubt, reference the crawl data in `scripts/playwright-crawl/procore-crawls/submittals/`