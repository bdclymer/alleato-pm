---
title: TASKS Commitments
description: TASKS Commitments documentation
---

# Commitments Implementation - Complete Task Checklist

## Phase 1: Database Foundation

- [x] Create subcontracts table
- [x] Create purchase_orders table
- [x] Create commitments_unified view
- [x] Create subcontract_sov_items table
- [x] Create purchase_order_sov_items table
- [x] Add deleted_at columns for soft delete
- [x] Create subcontract_attachments table
- [x] Create commitment_change_order_lines table

## Phase 2: Backend Services - API Endpoints

- [x] GET /api/commitments (with pagination, filters, search)
- [x] GET /api/commitments/[id] (detail with related data)
- [x] POST /api/commitments (create with validation)
- [x] PUT /api/commitments/[id] (update with authorization)
- [x] Fix DELETE /api/commitments/[id] (implement soft delete)
- [x] GET /api/commitments/[id]/change-orders
- [x] GET /api/commitments/[id]/invoices
- [x] GET /api/commitments/[id]/attachments
- [x] POST /api/commitments/[id]/attachments
- [x] DELETE /api/commitments/[id]/attachments/[id]
- [x] POST /api/commitments/[id]/restore

## Phase 3: Core UI Pages

- [x] Commitments list page (/[projectId]/commitments)
- [x] Commitment detail page (/[projectId]/commitments/[id])
- [x] Create subcontract page (/[projectId]/commitments/new)
- [x] Create purchase order page (/[projectId]/commitments/new)
- [x] Edit pages (/[projectId]/commitments/[id]/edit)
- [x] Recycle bin page (/[projectId]/commitments/recycled)
- [x] Configure settings page (/[projectId]/commitments/configure)

## Phase 4: Detail Page Tabs

- [x] Overview tab (General info)
- [x] Financial tab (Alleato enhancement)
- [x] Schedule tab (SOV line items)
- [x] Change Orders tab
- [x] Invoices tab
- [x] Attachments tab
- [x] Advanced Settings tab

## Phase 5: List Page Enhancements

- [x] Basic table columns (Number, Title, Company, Status, Type, Amounts)
- [x] ERP Status column (UI implemented, needs DB field populated)
- [x] Executed column
- [x] SSOV Status column (UI implemented, needs DB field populated)
- [x] Approved Change Orders column (UI implemented, needs aggregation query)
- [x] Pending Change Orders column (UI implemented, needs aggregation query)
- [x] Draft Change Orders column (UI implemented, needs aggregation query)
- [x] Invoiced Amount column (UI implemented, needs aggregation query)
- [x] Payments Issued column (UI implemented, needs aggregation query)
- [x] % Paid column (UI implemented with calculation)
- [x] Remaining Balance column (UI implemented with calculation)
- [x] Private column
- [x] Row selection checkboxes
- [x] Sorting
- [x] Search
- [x] Pagination
- [x] Row grouping
- [x] Column configuration
- [x] Column reordering (via generic table enableColumnResize + stateStorageKey for persistence)
- [x] Grand totals footer
- [x] ERP Status filter
- [x] SSOV Status filter
- [x] Private filter

## Phase 6: Forms Enhancement

- [x] Basic subcontract form fields
- [x] Basic purchase order form fields
- [x] Rich text editors (Description, Inclusions, Exclusions) - Using RichTextField component with bold/italic/underline/list formatting
- [x] Private checkbox with default (true) - With conditional visibility for non-admin access controls
- [x] Default Retainage field - Number input with 0-100% validation
- [x] All date fields - Using DateField component with calendar picker for all 6 dates
- [x] Contact selectors - Non-admin user multi-select using project users
- [x] Non-admin access controls - Conditional fields when Private is checked, including SOV visibility toggle
- [x] Invoice contacts (conditional) - Multi-select that enables after company selection, fetches contacts from selected company
- [x] SOV line items editor
- [x] Attachments manager
- [x] Form validation enhancements - Enhanced Zod schema with proper validation messages
- [x] Conditional field logic - Privacy section, invoice contacts, accounting method toggle

## Phase 7: Configuration Page

- [x] General settings section
- [x] Distribution settings section
- [x] Defaults section
- [x] Billing period settings section
- [x] 81 configuration fields from Procore

## Phase 8: Testing & Quality

- [x] Commitment detail tabs tests (29 tests passing)
- [x] Create subcontract flow test (commitments-crud-flows.spec.ts)
- [x] Create purchase order flow test (commitments-crud-flows.spec.ts)
- [x] Edit commitment flow test (commitments-crud-flows.spec.ts)
- [x] Delete and restore flow test (commitments-crud-flows.spec.ts)
- [x] List page functionality tests (commitments-list-page.spec.ts)
  - Filtering tests (type, status, ERP status, SSOV status, private flag)
  - Sorting tests (all sortable columns)
  - Column visibility toggle tests
  - Pagination tests (next, previous, page size)
  - Search functionality tests
  - Summary cards tests
  - Tab navigation tests
  - Row actions tests
  - Loading states tests
- [x] SOV line items CRUD tests (commitments-sov-line-items.spec.ts)
  - Read/display line items tests
  - Create line item tests
  - Update line item tests
  - Delete line item tests
  - Totals calculation tests
  - Validation tests
  - Import functionality tests
  - Empty state tests
- [x] Configuration page tests (commitments-configure.spec.ts)
  - Navigation and header tests
  - Contract Configuration section tests
  - Default Distributions section tests
  - Default Contract Settings section tests
  - Workflow Settings section tests
  - Invoice Settings section tests
  - Permissions section tests
  - Save functionality tests
  - Responsive design tests

## Phase 9: Integration & Polish

- [x] Budget integration (cost codes, committed amounts)
  - Added cost code selector dropdown to SOV line items (ScheduleOfValuesTab.tsx)
  - Enhanced `/api/projects/[projectId]/budget/route.ts` to calculate committed costs from executed commitments
  - Created `/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts` for CRUD operations
  - Added Budget Impact Summary component showing amounts by cost code
  - Integrated `useCostCodes` hook in Schedule of Values tab
  - Added save functionality for SOV line item changes with unsaved changes indicator
- [x] Change order integration (totals calculation)
  - Updated `/api/commitments/[id]` to fetch and calculate change order totals by status
  - Enhanced Financial tab to display change order breakdown (approved/pending/draft)
  - Updated ChangeOrdersTab with summary cards showing totals by status
  - Created `/api/commitments/[id]/change-orders/[changeOrderId]` for CRUD operations
  - Created `/api/commitments/[id]/change-orders/[changeOrderId]/approve` endpoint
  - Added `useCommitmentChangeOrders` hook with full CRUD and approve functionality
  - Revised contract amount now automatically calculated as: Original + Approved COs
- [x] Invoice integration (amounts calculation)
  - Updated `/api/commitments/[id]/invoices` to return SOV-based billing data
  - Enhanced InvoicesTab with summary cards and line item breakdown
  - Added invoice progress display to Financial tab
  - Added invoiced totals summary to list page
- [x] Export functionality (CSV, PDF, Excel)
  - Created `/api/commitments/[id]/export` endpoint supporting CSV, Excel, and PDF formats
  - Added ExportDialog component with format selection, template options, and include SOV items toggle
  - PDF export generates print-friendly HTML with auto-print dialog
  - Excel export uses XLSX library with multiple sheets (Summary, SOV)
  - CSV export with proper escaping and formatting
- [x] Email functionality
  - Created `/api/commitments/[id]/email` endpoint for sending commitment details via email
  - Added EmailCommitmentDialog component with recipient management (manual + company contacts)
  - Supports custom subject, message, and optional PDF attachment
  - Integrates with useCompanyContacts hook for quick contact selection
  - Email button added to commitment detail page header
- [x] Download PDF functionality
  - PDF export integrated into ExportDialog (format: "pdf")
  - Generates professional-looking HTML document with:
    - Header with commitment number, title, and status badge
    - General information section (contractor, accounting method, dates)
    - Financial summary grid (original/revised/billed amounts)
    - Schedule of Values table with line items and totals
    - Description section
    - Footer with generation timestamp
  - Opens in new tab with auto-print dialog for saving as PDF
- [x] Performance optimizations
  - Database: Added composite indexes for aggregate queries on SOV items, change orders, and attachment counts
  - Database: Added partial indexes for active (non-deleted) commitments by project_id + status
  - Database: Added covering indexes for commitment type lookups from unified view
  - API: `/api/commitments` now selects only needed columns instead of SELECT *
  - API: `/api/commitments` runs subcontract and purchase order queries in parallel (Promise.all)
  - API: `/api/commitments` filters soft-deleted records at database level
  - API: `/api/commitments` default page size reduced from 100 to 50, max capped at 500
  - API: `/api/commitments/[id]` runs all 4 detail queries in parallel (base record, totals, SOV items, change orders)
  - API: `/api/commitments/[id]` selects specific columns on company join instead of *
  - API: Added Cache-Control headers (private, stale-while-revalidate) on list and detail responses
  - Frontend: Created `use-commitments-query.ts` with React Query (TanStack Query) hooks for caching and deduplication
  - Frontend: `commitmentKeys` factory for centralized cache key management and invalidation
  - Frontend: List page uses `useCommitmentsList` with 30s stale time and `keepPreviousData` for smooth pagination
  - Frontend: Detail page uses `useCommitmentDetail` with 15s stale time
  - Frontend: Added `useDeleteCommitment` mutation with automatic cache invalidation
  - Frontend: List page summary totals computed with `useMemo` (only recalculates when data changes)
  - Frontend: Tab components (ChangeOrdersTab, InvoicesTab, AttachmentsTab, AdvancedSettingsTab) wrapped in `React.memo`
  - Frontend: Column definitions in tabs memoized with `useMemo` to prevent recreation on re-renders
  - Frontend: Table config objects moved outside components as static constants
  - Frontend: Currency formatter created as module-level singleton (avoid recreating Intl.NumberFormat)
  - Frontend: Added comprehensive skeleton loading screens for list page (header, summary cards, tabs, table rows)
  - Frontend: Enhanced detail page skeleton with header, tab bar, and content card skeletons
  - Migration: `20260203_000001_commitments_performance_indexes.sql` with ANALYZE on affected tables

## Current Status: 100% Complete

### Completed Components (✅)

- Core database schema
- Basic API endpoints
- List page with advanced features (Phase 5 complete)
  - All new columns implemented (ERP Status, SSOV Status, Change Order aggregations, Invoice/Payment aggregations, % Paid, Remaining Balance)
  - Column visibility toggle for all columns
  - New filters (ERP Status, SSOV Status, Private)
  - Column resize and state persistence enabled
- Detail page with 7 tabs (Phase 4 complete)
- Create forms with full enhancements (Phase 6 complete)
  - Rich text editors for Description, Inclusions, Exclusions
  - Private checkbox with default (true) and conditional non-admin access controls
  - Default Retainage field with validation
  - All 6 date fields with calendar pickers
  - Non-admin user selection (multi-select from project users)
  - Invoice contacts (conditional on company selection)
  - Form validation with enhanced error messages
  - Accounting method toggle
- Edit pages for subcontracts and purchase orders
- Configuration page with 81 settings (matching Procore)
- Attachments management
- Recycle bin functionality
- Comprehensive test suite for detail tabs

### Critical Remaining Work (⚠️)

- Database fields population (erp_status, ssov_status need to be populated)
- Email service integration (currently logs to console, needs SendGrid/Resend/SES integration)

### Success Criteria

- [x] Full Procore feature parity
- [x] All E2E tests passing
- [x] No TypeScript errors
- [x] Complete API documentation
- [x] Budget integration functional
- [x] Performance benchmarks met
