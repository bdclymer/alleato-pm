# Change Orders - Work Specification for Alleato-Procore

## Overview
Implement and complete the Change Orders feature in the alleato-procore construction management platform.
This is an EXISTING codebase with established patterns. Read CLAUDE.md first for all conventions.

## Important Notes
- Many tasks are already partially implemented. Audit first before implementing.
- Follow the patterns in CLAUDE.md (mandatory gates, scaffolding, route naming, etc.)
- The codebase uses Next.js 15, Supabase, shadcn/ui, React Query, Playwright for tests
- Check existing change order files before creating new ones

---

## ureadme

---
title: README
description: README documentation
---

# Change Orders Documentation - Standardized Structure

This directory contains the complete documentation for the Change Orders feature following the standardized 6-file structure defined in `/PLANS/TEMPLATE-STRUCTURE.md`.

## File Organization

### 📋 Core Documentation Files

1. **TASKS-ChangeOrders.md** - Complete task checklist with 9 implementation phases (15% complete)
2. **PLANS-ChangeOrders.md** - Comprehensive implementation plan with current status and file paths
3. **SCHEMA-ChangeOrders.md** - Complete database schema with 6 core tables and migrations
4. **FORMS-ChangeOrders.md** - Detailed form specifications with 8 forms and validation rules
5. **API_ENDPOINTS-ChangeOrders.md** - Complete API documentation with 25+ endpoints
6. **UI-ChangeOrders.md** - Component specifications with responsive design and accessibility

### 📁 Archive

- **`.archive/`** - Contains original files:
  - `specs-change-orders.mdx` (original comprehensive specs)
  - `crawl-change-orders/` (Procore analysis data with 46 pages of reference material)

## Current Implementation Status: 15% Complete

### ✅ Completed

- System analysis and documentation
- Basic list view implementation at `/[projectId]/change-orders/page.tsx`
- Empty state and loading states
- Status badge components
- Tab navigation structure

### ⚠️ In Progress

- Database schema design (ready for implementation)
- API endpoint specifications (ready for development)

### ❌ Not Started

- Change order creation form (stub only)
- Detail view and editing capabilities
- Multi-tier approval workflow
- Package-based organization
- PDF generation system
- Reports and analytics

## Key Features from Procore Analysis

Based on comprehensive analysis of Procore's 46-page change orders system:

1. **Package-Based Organization** - Change orders grouped into packages (PCO-001, PCO-002, etc.)
2. **Multi-Contract Support** - Prime contracts vs Commitments with separate workflows
3. **Multi-Tier Approvals** - Configurable 1-4 tier approval hierarchy
4. **Complete Audit Trail** - Full change history and review tracking
5. **Rich Line Items** - Detailed financial breakdown with budget code integration
6. **Document Management** - File attachments with categorization
7. **Comprehensive Reporting** - Unexecuted, overdue, and analytics reports

## Implementation Phases (12 weeks total)

1. **Phase 1-2: Foundation** (Weeks 1-4) - Database + APIs
2. **Phase 3-4: Core Functionality** (Weeks 3-5) - Forms + Enhanced Lists
3. **Phase 5: Workflow** (Weeks 5-7) - Approval system
4. **Phase 6-7: Advanced Features** (Weeks 6-9) - Packages + PDFs
5. **Phase 8: Reports** (Weeks 8-10) - Analytics and reporting
6. **Phase 9: Polish** (Weeks 9-12) - Testing and production readiness

## Quick Navigation

- **For Development**: Start with SCHEMA and API_ENDPOINTS
- **For UI/UX Work**: Reference FORMS and UI specifications
- **For Project Management**: Track progress via TASKS checklist
- **For Architecture**: See PLANS for complete overview

## Next Actions

1. Implement database migrations from SCHEMA-ChangeOrders.md
2. Create API endpoints from API_ENDPOINTS-ChangeOrders.md
3. Build change order creation form from FORMS-ChangeOrders.md
4. Enhance existing list view per UI-ChangeOrders.md specifications

---

*This documentation follows the standardized structure to ensure Claude Code can efficiently work with any tool documentation without confusion or redundancy.*

---

## uchange orders

---
title: change orders
description: change orders documentation
---

## Goal

**Feature Goal**: Deliver a Procore-aligned Change Orders tool for prime contracts that supports listing, creating, viewing, approving/rejecting, and converting change events into change orders with correct permissions and status transitions.

**Deliverable**: New/updated Next.js App Router pages, supporting components, and API integrations for prime contract change orders; updated tests and validation coverage.

**Success Definition**: Users can create and manage prime contract change orders end-to-end (create → review → approve/reject) with correct status handling, reviewer workflow, and data integrity; Playwright tests and quality checks pass; verification report generated.

## Why

* Change orders are a critical financial workflow; without a complete tool, users cannot track approved and pending contract modifications.
* Aligns with Procore workflows (designated reviewer, approval status rules, tiered change orders), enabling future parity.
* Unblocks change-event-to-change-order conversion flow and prevents dead links in UI.

## What

The Change Orders tool should:

* Provide a list view for prime contract change orders scoped to a project with filters and status badges.
* Offer a detail view for a single change order (summary, reviewer response, approval actions, history).
* Provide a creation flow consistent with Procore fields (change order number, description, amount, status, requested date, reviewer, etc.).
* Support approval and rejection flows with reviewer comments, updating status and audit fields.
* Integrate change events conversion, routing to the correct change order detail page.
* Ensure table usage consistency (contract_change_orders vs change_orders) and correct API usage.

### Success Criteria

* [ ] List page uses the prime contract change orders dataset and links to detail page.
* [ ] Detail page displays change order metadata, reviewer response, and approval/rejection actions.
* [ ] New change order form writes to contract_change_orders via existing API route.
* [ ] Approval and rejection update status + approved_by/approved_date/rejection_reason appropriately.
* [ ] Change event conversion routes to the change order detail page without 404.
* [ ] Playwright tests for change order API and UI pass; new tests added for UI flows.

## All Needed Context

### Context Completeness Check

*Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"*

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/create-a-prime-contract-change-order#steps
  why: Procore PCCO creation workflow, required permissions, and field-level behavior.
  critical: Explains required fields (status, designated reviewer, due date, schedule impact) and submit actions.
- url: https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/approve-or-reject-prime-contract-change-orders#steps
  why: Reviewer approval/rejection flow and status transition rules.
  critical: Status prerequisites (Pending - In Review/Revised) and reviewer response requirements.
- url: https://v2.support.procore.com/es-419/product-manuals/change-orders-project/tutorials
  why: Index of Change Orders tutorials for related flows (view/edit/export/tiers).
  critical: Use as a roadmap for parity and future enhancements.
- url: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
  why: App Router route handler conventions used in existing API routes.
  critical: Named exports (GET/POST/etc.) and request/response semantics.
- url: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
  why: Dynamic route naming and parameter usage for /[projectId]/change-orders/[changeOrderId].
  critical: Use consistent param names (projectId, changeOrderId) to avoid routing issues.
- url: https://react-hook-form.com/get-started#SchemaValidation
  why: Change order form uses react-hook-form with zodResolver.
  critical: Ensure form default values align with zod schema and type inference.
- url: https://zod.dev/?id=basic-usage
  why: Validation schemas for change orders are zod-based.
  critical: Align server-side schema with UI form data and payloads.

- file: frontend/src/app/(main)/[projectId]/change-orders/page.tsx
  why: Current Change Orders list page uses GenericDataTable.
  pattern: Table configuration (columns/filters) + Supabase data loading.
  gotcha: Uses change_orders table and field names (co_number) that diverge from contract_change_orders.
- file: frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx
  why: Current Change Order creation UI.
  pattern: react-hook-form + zodResolver + UI components.
  gotcha: Posts to contract_change_orders API; ensure list/detail use same table.
- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/route.ts
  why: Contract change orders API for list/create.
  pattern: Supabase auth, permission checks, zod validation.
  gotcha: Requires projectId + contractId; UI must carry both to use this route.
- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/route.ts
  why: Single change order CRUD route.
  pattern: GET/PUT/DELETE handling and status validation.
  gotcha: Requires contractId; detail page must know contractId or use alternate endpoint.
- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve/route.ts
  why: Approve change order endpoint.
  pattern: Status update + contract value update.
  gotcha: Must supply correct changeOrderId + contractId and handle reviewer permissions.
- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/reject/route.ts
  why: Reject change order endpoint with rejection_reason.
  pattern: Updates status + rejection metadata.
  gotcha: Requires rejection_reason and reviewer permission validation.
- file: frontend/src/hooks/use-change-orders.ts
  why: Existing change order data hook pattern.
  pattern: supabase client query + create helper.
  gotcha: Still uses change_orders table and legacy fields (co_number).
- file: frontend/src/types/contract-change-orders.ts
  why: Prime contract change order types.
  pattern: TypeScript interface patterns for API responses.
  gotcha: Ensure UI uses this type instead of legacy ChangeOrder type.
- file: frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx
  why: Detail page layout + actions pattern.
  pattern: Tabs, cards, action buttons, data fetch patterns.
  gotcha: Uses client component and local state for fetch/error handling.
- file: frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx
  why: Change event → change order conversion UI.
  pattern: Dialog + fetch POST + route to change order detail.
  gotcha: Target contract options are hardcoded and route expects /change-orders/[id] which doesn’t exist yet.
- file: frontend/drizzle/schema.ts
  why: Source of truth for contract_change_orders table and constraints.
  pattern: Status checks + approval/rejection validation.
  gotcha: valid_approval_date check enforces approved_by/approved_date/rejection_reason rules.
- file: frontend/tests/e2e/prime-contracts/api-change-orders.spec.ts
  why: API-level tests for change orders.
  pattern: Playwright APIRequestContext + supabase setup.
  gotcha: Use as baseline when updating API usage or contracts.
- file: frontend/tests/e2e/prime-contracts/change-orders-schema.spec.ts
  why: Schema-driven tests for status rules and constraints.
  pattern: direct supabase interactions for validation.
  gotcha: Must keep UI/API consistent with schema rules.

- docfile: PRPs/ai_docs/procore-change-orders.md
  why: Consolidated summary of Procore change order workflows and fields.
  section: All sections
```markdown
### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
.
├── backend
├── frontend
│   ├── src
│   │   ├── app
│   │   │   ├── (main)
│   │   │   │   ├── [projectId]
│   │   │   │   │   ├── change-orders
│   │   │   │   │   ├── prime-contracts
│   │   │   │   │   └── commitments
│   │   │   ├── api
│   │   │   │   ├── change-orders
│   │   │   │   └── projects
│   │   ├── components
│   │   ├── hooks
│   │   ├── lib
│   │   └── types
│   └── tests
└── scripts
```markdown
### Desired Codebase tree with files to be added and responsibility of file

```bash
PRPs/
└── change-orders.md                           # This PRP
frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx
  # Change order detail page (summary + reviewer response + actions)
frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/edit/page.tsx
  # Edit form for change order (optional if edit in detail)
frontend/src/components/change-orders/ChangeOrderDetail.tsx
  # Reusable detail UI (summary, status, history)
frontend/src/components/change-orders/ChangeOrderReviewerResponse.tsx
  # Reviewer response + approve/reject controls
frontend/src/components/change-orders/ChangeOrderSummaryCards.tsx
  # Metrics header for CO amount/status
frontend/src/hooks/use-contract-change-orders.ts
  # Hook tailored to contract_change_orders (avoid legacy change_orders)
frontend/tests/e2e/change-orders/change-order-ui.spec.ts
  # UI flow tests (list → detail → approve/reject)
```markdown
### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Next.js App Router dynamic routes require consistent param names.
// Use [projectId] and [changeOrderId] everywhere for change orders.
// CRITICAL: contract_change_orders table has a check constraint:
//   approved_by + approved_date required for approved/rejected statuses.
//   rejected also requires rejection_reason.
// Avoid mixing change_orders (legacy) with contract_change_orders (prime contracts).
// 'use client' is required for forms and interactive components (react-hook-form, useState).
// Avoid console.log, @ts-ignore, and any (explicitly banned).
```

## Implementation Blueprint

### Data models and structure

```typescript
// Prefer existing types in frontend/src/types/contract-change-orders.ts
// Add any missing types to align with schema constraints.

export type ChangeOrderStatus = "pending" | "approved" | "rejected";

export interface ContractChangeOrder {
  id: string;
  contract_id: string;
  change_order_number: string;
  description: string;
  amount: number;
  status: ChangeOrderStatus;
  requested_by: string | null;
  requested_date: string;
  approved_by: string | null;
  approved_date: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}
```sql
### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ALIGN DATA ACCESS TO contract_change_orders
  - UPDATE: frontend/src/hooks/use-change-orders.ts OR create new hook in frontend/src/hooks/use-contract-change-orders.ts
  - IMPLEMENT: supabase queries against contract_change_orders table
  - FOLLOW pattern: frontend/src/hooks/use-change-orders.ts
  - NAMING: PascalCase interfaces, camelCase fields
  - GOTCHA: Avoid legacy change_orders table / co_number field

Task 2: UPDATE CHANGE ORDERS LIST PAGE
  - UPDATE: frontend/src/app/(main)/[projectId]/change-orders/page.tsx
  - IMPLEMENT: fetch contract_change_orders (requires joining contracts to project)
  - FOLLOW pattern: frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx
  - ADD: rowClickPath to /{projectId}/change-orders/{id}
  - DEPENDENCIES: Task 1 hook/type alignment

Task 3: CREATE CHANGE ORDER DETAIL PAGE
  - CREATE: frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx
  - IMPLEMENT: fetch change order + related contract + reviewer state
  - FOLLOW pattern: frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx
  - GOTCHA: Existing API routes require contractId; detail page must resolve contractId
    (e.g., fetch by changeOrderId using a new route or join via contract_change_orders)
  - DEPENDENCIES: Task 1 types + data access

Task 4: IMPLEMENT APPROVE/REJECT UI
  - CREATE: ChangeOrderReviewerResponse component
  - IMPLEMENT: call approve/reject API routes, require reviewer comments on reject
  - FOLLOW pattern: frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx
  - GOTCHA: contract_change_orders schema enforces approved_by/approved_date/rejection_reason

Task 5: UPDATE CHANGE ORDER CREATION FLOW
  - UPDATE: frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx
  - IMPLEMENT: include additional Procore fields as needed (reviewer, due date, schedule impact)
  - FOLLOW pattern: existing form + validation schema in API route
  - DEPENDENCIES: Task 1 types + Task 4 UI conventions

Task 6: UPDATE CHANGE EVENT CONVERSION ROUTE + UI
  - UPDATE: ChangeEventConvertDialog to pull real contracts and route to detail page
  - IMPLEMENT: API route to convert change event to contract_change_orders if missing
  - FOLLOW pattern: other project change-events API routes
  - GOTCHA: Avoid hardcoded options and ensure change order detail route exists

Task 7: TESTS
  - ADD: Playwright UI tests for list → detail → approve/reject
  - UPDATE: API tests if contractId resolution changes
  - FOLLOW pattern: frontend/tests/e2e/prime-contracts/api-change-orders.spec.ts
```typescript
### Implementation Patterns & Key Details

```typescript
// Detail page data fetch: resolve contractId
// Option A: add a /api/projects/[projectId]/change-orders/[changeOrderId] route
// that joins contract_change_orders + prime_contracts to ensure project scoping.
// Option B: fetch contractId via contract_change_orders in the page, then call
// existing /contracts/[contractId]/change-orders/[changeOrderId].

// Reviewer response pattern
interface ChangeOrderReviewerResponseProps {
  changeOrderId: string;
  contractId: string;
  projectId: string;
  status: ChangeOrderStatus;
}

export function ChangeOrderReviewerResponse({ changeOrderId, contractId, projectId }: ChangeOrderReviewerResponseProps) {
  // use client: uses state + fetch
  // must send rejection_reason on reject; approved_by/approved_date handled server-side
}
```markdown
### Integration Points

```yaml
DATABASE:
  - table: contract_change_orders (frontend/drizzle/schema.ts)
  - constraint: valid_approval_date check for approved/rejected status
  - policy: Users can view change orders in their projects; editors can create/update
ROUTES:
  - ui: app/(main)/[projectId]/change-orders/page.tsx
  - ui: app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx
  - api: app/api/projects/[projectId]/contracts/[contractId]/change-orders/*
CONFIG:
  - no new env vars expected
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
npm run quality --prefix frontend
```markdown
### Level 2: Unit Tests (Component Validation)

```bash
cd frontend
npx playwright test tests/e2e/prime-contracts/api-change-orders.spec.ts
```markdown
### Level 3: Integration Testing (System Validation)

```bash
cd frontend
npx playwright test tests/e2e/change-orders/change-order-ui.spec.ts
```markdown
### Level 4: Creative & Domain-Specific Validation

```bash
cd frontend
npx playwright test --reporter=html
```

## Final Validation Checklist

### Technical Validation

* [ ] npm run quality --prefix frontend
* [ ] Playwright API tests pass
* [ ] Playwright UI tests pass

### Feature Validation

* [ ] List, create, detail, approve/reject flows work end-to-end
* [ ] Designated reviewer flow matches Procore
* [ ] Change event conversion leads to detail page

### Code Quality Validation

* [ ] No banned patterns (any, @ts-ignore, console.log)
* [ ] Server/client component boundaries correct

### TypeScript/Next.js Specific

* [ ] Dynamic route params match naming conventions
* [ ] Route handlers use named exports only

---

## Anti-Patterns to Avoid

* ❌ Mixing change_orders (legacy) and contract_change_orders in the same flow
* ❌ Creating new routing params that conflict with existing conventions
* ❌ Ignoring schema constraints (valid_approval_date)
* ❌ Hardcoding change order options or reviewer lists

---

## Confidence Score

**Confidence Score**: 8/10

## Notes on RAG Usage

* Attempted RAG query via `./query-rag-raw.sh "Change orders status workflow in Procore"`.
* Request failed (local API not running). If possible, re-run after starting the app server.

---

## uplans changeorders

---
title: PLANS ChangeOrders
description: PLANS ChangeOrders documentation
---

# Change Orders Implementation Plan

## Executive Summary

The Change Orders management system enables users to create, review, approve, and track change orders across multiple contract types (Commitment and Prime Contract). Based on comprehensive analysis of Procore's implementation and current system capabilities, this plan outlines a phased approach to deliver a production-ready change orders tool.

**Current Status: 15% Complete**

## Current Implementation Status (15% Complete)

### ✅ COMPLETED PHASES

- **System Analysis**: Comprehensive analysis of Procore's 46-page change orders system
- **Documentation**: Detailed requirements and technical specifications
- **Basic List View**: Functional table view with status badges and empty state
- **Navigation**: Tab structure and routing implemented
- **UI Foundation**: Basic components and styling in place

**File Structure Completed:**

```text
frontend/src/app/(main)/[projectId]/change-orders/
├── page.tsx ✅ (list view implemented)
├── new/page.tsx ⚠️ (stub only)
└── [changeOrderId]/ ❌ (not implemented)
```markdown
### ⚠️ REMAINING WORK

**Critical Missing Components:**

- Complete change order creation form (0% complete)
- Change order detail/edit view (0% complete)
- Database schema and migrations (0% complete)
- API endpoints for CRUD operations (0% complete)
- Multi-tier approval workflow (0% complete)
- Package-based organization (0% complete)
- PDF generation (0% complete)
- Line items management (0% complete)
- File attachment system (0% complete)
- Email notification system (0% complete)

## Implementation Phases Detail

### Phase 1: Database Foundation (Weeks 1-2)

**Priority:** Critical - Foundation for all other work
**Complexity:** Medium
**Dependencies:** None

**Deliverables:**

- Complete database schema with 6 core tables
- RLS policies for security
- Database migrations
- TypeScript types generation

**Key Tables:**

- `change_orders` (main entity)
- `change_order_packages` (package grouping)
- `change_order_lines` (financial details)
- `change_order_reviews` (approval workflow)
- `change_order_attachments` (file management)
- `change_order_audit_log` (change tracking)

### Phase 2: Backend Services (Weeks 2-4)

**Priority:** Critical - API foundation
**Complexity:** High
**Dependencies:** Phase 1 (Database)

**Deliverables:**

- Full CRUD API endpoints
- Filtering and pagination
- File upload handling
- Email notification service
- CSV export functionality

**API Endpoints Required:**

```text
GET    /api/projects/{id}/change-orders
POST   /api/projects/{id}/change-orders
GET    /api/projects/{id}/change-orders/{coId}
PUT    /api/projects/{id}/change-orders/{coId}
DELETE /api/projects/{id}/change-orders/{coId}
POST   /api/projects/{id}/change-orders/{coId}/approve
POST   /api/projects/{id}/change-orders/{coId}/reject
GET    /api/projects/{id}/change-orders/export/csv
GET    /api/projects/{id}/change-order-packages
```

### Phase 3: Form Implementation (Weeks 3-5)

**Priority:** High - Core user functionality
**Complexity:** Medium-High
**Dependencies:** Phase 2 (APIs)

**Deliverables:**

- Multi-step creation form
- Line items table editor
- File attachment component
- User picker for reviewers
- Form validation and error handling

**File Path:** `/frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx`
**Current Status:** Stub only - needs complete implementation

### Phase 4: List View Enhancement (Weeks 4-5)

**Priority:** Medium - Improve existing functionality
**Complexity:** Low-Medium
**Dependencies:** Phase 2 (APIs)

**Deliverables:**

- Add missing table columns (Date Initiated, Revision, Reviewer, Review Date)
- Implement Prime vs Commitments tabs
- Functional CSV export
- Reports dropdown menu
- Package grouping view

**File Path:** `/frontend/src/app/(main)/[projectId]/change-orders/page.tsx`
**Current Status:** 50% complete - basic table working, needs enhancement

### Phase 5: Review Workflow (Weeks 5-7)

**Priority:** High - Core business functionality
**Complexity:** High
**Dependencies:** Phase 2, 3 (APIs and Forms)

**Deliverables:**

- Change order detail view
- Approval/rejection interface
- Multi-tier approval workflow
- Notification system
- Review history tracking

**File Path:** `/frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx`
**Current Status:** Not implemented

### Phase 6: Package Management (Weeks 6-8)

**Priority:** Medium - Advanced organization
**Complexity:** Medium
**Dependencies:** Phase 2, 5 (APIs and Review)

**Deliverables:**

- Package creation and management
- Package-level calculations
- Package detail views
- Package grouping in lists

### Phase 7: PDF Generation (Weeks 7-9)

**Priority:** Medium - Document export
**Complexity:** High
**Dependencies:** Phase 5 (Detail views)

**Deliverables:**

- PDF template system
- Individual change order PDFs
- Package-level PDF exports
- Custom branding support

### Phase 8: Reports & Analytics (Weeks 8-10)

**Priority:** Low - Business intelligence
**Complexity:** Medium
**Dependencies:** All previous phases

**Deliverables:**

- Unexecuted change orders report
- Overdue change orders report
- Change orders by reason analytics
- Budget impact reports

### Phase 9: Testing & Polish (Weeks 9-12)

**Priority:** Critical - Production readiness
**Complexity:** Medium
**Dependencies:** All previous phases

**Deliverables:**

- Comprehensive test suite (80%+ coverage)
- E2E testing scenarios
- Performance optimization
- Mobile responsiveness
- Security audit

## File Structure & Deliverables

### Database Files

```text
/supabase/migrations/
├── [timestamp]_change_orders_schema.sql ❌
├── [timestamp]_change_order_packages.sql ❌
├── [timestamp]_change_order_lines.sql ❌
├── [timestamp]_change_order_reviews.sql ❌
└── [timestamp]_change_order_attachments.sql ❌

/frontend/src/lib/database.types.ts ⚠️
(needs regeneration after migrations)
```markdown
### API Files

```text
/frontend/src/app/api/projects/[projectId]/
├── change-orders/route.ts ❌
├── change-orders/[id]/route.ts ❌
├── change-orders/[id]/approve/route.ts ❌
├── change-orders/[id]/reject/route.ts ❌
├── change-orders/export/route.ts ❌
└── change-order-packages/route.ts ❌
```

### Frontend Components

```text
/frontend/src/components/domain/change-orders/
├── ChangeOrderForm.tsx ❌
├── ChangeOrderDetailView.tsx ❌
├── LineItemsTable.tsx ❌
├── ApprovalWorkflow.tsx ❌
├── PackageView.tsx ❌
├── ChangeOrderList.tsx ⚠️ (basic version exists)
└── ChangeOrderPDF.tsx ❌
```markdown
### Frontend Pages

```text
/frontend/src/app/(main)/[projectId]/change-orders/
├── page.tsx ✅ (50% complete)
├── new/page.tsx ⚠️ (stub only)
├── [changeOrderId]/page.tsx ❌
└── [changeOrderId]/edit/page.tsx ❌
```

## Production Readiness Assessment

### Quality Metrics

- **Code Coverage:** Target 85%+ (Current: 0%)
- **Performance:** <2s page load (Current: Unknown)
- **Security:** Zero critical vulnerabilities (Current: Not assessed)
- **Accessibility:** WCAG 2.1 AA compliance (Current: Not assessed)
- **Browser Support:** Chrome, Firefox, Safari, Edge latest 2 versions (Current: Not tested)

### Risk Assessment

**High Risk Areas:**

1. **Multi-tier Approval Workflow** - Complex business logic, potential edge cases
2. **PDF Generation** - Performance impact with large documents
3. **Email Notifications** - Delivery reliability, spam concerns
4. **File Attachments** - Storage limits, security scanning

**Mitigation Strategies:**

- Comprehensive testing for approval workflows
- PDF generation optimization and caching
- Email service redundancy and monitoring
- File upload validation and virus scanning

### Dependencies

- **External Services:** Email provider (SendGrid/AWS SES), PDF generation library
- **Internal Systems:** User management, project access controls, budget integration
- **Database:** PostgreSQL with proper indexing strategy

## Technical Implementation Details

### Key Architectural Decisions

1. **Package-Based Organization:** Following Procore's model for grouping related change orders
2. **Multi-Tier Approvals:** Configurable workflow supporting 1-4 approval tiers
3. **Audit Trail:** Complete change history for compliance requirements
4. **File Storage:** Supabase Storage for attachments with security policies
5. **PDF Generation:** Server-side rendering for consistent formatting

### User Experience Flows

1. **Create Change Order:** New → Form → Line Items → Review → Submit
2. **Review Process:** Notification → Detail View → Approve/Reject → Next Tier
3. **Package Management:** Create Package → Add COs → Generate PDF → Export
4. **Reporting:** Filter → Export → Schedule → Share

## Testing Strategy

- **Unit Tests:** All business logic components (80%+ coverage)
- **Integration Tests:** API endpoints and database operations
- **E2E Tests:** Complete user workflows from creation to approval
- **Performance Tests:** Large data sets and concurrent users
- **Security Tests:** Authorization, injection attacks, file upload

## Timeline Summary

- **Weeks 1-2:** Foundation (Database + APIs)
- **Weeks 3-5:** Core Functionality (Forms + Enhanced Lists)
- **Weeks 5-7:** Approval Workflow
- **Weeks 6-9:** Advanced Features (Packages + PDFs)
- **Weeks 8-10:** Reports & Analytics
- **Weeks 9-12:** Testing & Production Polish

**Total Estimated Duration:** 12 weeks for full implementation
**Minimum Viable Product:** 6 weeks (through Phase 5)
**Current Progress:** Week 1 of 12 (15% complete)

---

## uschema changeorders

---
title: SCHEMA ChangeOrders
description: SCHEMA ChangeOrders documentation
---

# Change Orders Database Schema

## Database Tables Overview

The Change Orders system uses 6 core tables to manage the complete lifecycle from creation to execution:

1. **change_orders** - Main entity with polymorphic support for different contract types
2. **change_order_packages** - Package-based organization grouping related change orders
3. **change_order_lines** - Financial breakdown with budget code linkage
4. **change_order_reviews** - Multi-tier approval workflow tracking
5. **change_order_attachments** - Document and file management
6. **change_order_audit_log** - Complete audit trail for compliance

### Relationship Diagram

```text
change_order_packages (1:many) → change_orders
change_orders (1:many) → change_order_lines
change_orders (1:many) → change_order_reviews
change_orders (1:many) → change_order_attachments
change_orders (1:many) → change_order_audit_log
```sql
## Table Definitions

### 1. change_orders (Main Entity)

```sql
CREATE TABLE change_orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,

  -- Package Organization
  package_id BIGINT REFERENCES change_order_packages(id),

  -- Contract Relationship (Polymorphic)
  change_order_type ENUM('COMMITMENT', 'PRIME_CONTRACT', 'FUNDING', 'CLIENT_CONTRACT') NOT NULL,
  contract_id BIGINT NOT NULL,

  -- Identification
  number VARCHAR(50) UNIQUE NOT NULL,
  revision INT DEFAULT 0,
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Classification
  change_reason_id BIGINT REFERENCES change_reasons(id),
  scope ENUM('IN_SCOPE', 'OUT_OF_SCOPE') DEFAULT 'IN_SCOPE',

  -- Workflow
  status ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'PENDING_BILLABLE', 'REJECTED', 'WITHDRAWN', 'EXECUTED') NOT NULL DEFAULT 'DRAFT',

  -- Dates
  date_initiated DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  review_date DATE,
  executed_date DATE,
  signed_order_received_date DATE,
  revised_completion_date DATE,

  -- Workflow Assignment
  designated_reviewer_id BIGINT REFERENCES users(id),

  -- Properties
  private BOOLEAN DEFAULT FALSE,
  executed BOOLEAN DEFAULT FALSE,
  schedule_impact ENUM('YES', 'NO', 'UNKNOWN'),

  -- Related Items
  change_event_id BIGINT REFERENCES change_events(id),

  -- Audit
  created_by_user_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by_user_id BIGINT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Foreign Keys
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (package_id) REFERENCES change_order_packages(id),

  -- Indexes
  INDEX idx_project_id (project_id),
  INDEX idx_package_id (package_id),
  INDEX idx_contract_id (contract_id),
  INDEX idx_status (status),
  INDEX idx_change_order_type (change_order_type),
  INDEX idx_created_at (created_at),
  INDEX idx_number (number),
  INDEX idx_due_date (due_date),
  INDEX idx_designated_reviewer (designated_reviewer_id)
);
```sql
### 2. change_order_packages (Package Organization)
```sql
CREATE TABLE change_order_packages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL REFERENCES projects(id),

  -- Identification
  package_number VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Type
  change_order_type ENUM('COMMITMENT', 'PRIME_CONTRACT', 'FUNDING', 'CLIENT_CONTRACT') NOT NULL,

  -- Status
  status ENUM('DRAFT', 'PENDING', 'APPROVED', 'EXECUTED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',

  -- Calculated Fields (updated by triggers)
  total_amount DECIMAL(15, 2) DEFAULT 0,
  change_orders_count INT DEFAULT 0,

  -- Audit
  created_by_user_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by_user_id BIGINT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE KEY unique_package_number (project_id, package_number),

  -- Indexes
  INDEX idx_project_id (project_id),
  INDEX idx_status (status),
  INDEX idx_change_order_type (change_order_type),
  INDEX idx_created_at (created_at)
);
```

### 3. change_order_lines (Financial Breakdown)

```sql
CREATE TABLE change_order_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_order_id BIGINT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- Budget Integration
  cost_code_id BIGINT REFERENCES cost_codes(id),
  budget_line_id BIGINT REFERENCES budget_lines(id),

  -- Line Item Details
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(12, 4) DEFAULT 1,
  unit_of_measure VARCHAR(20) DEFAULT 'LS',
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Calculated Amount
  extended_amount DECIMAL(14, 2) GENERATED ALWAYS AS (
    CASE WHEN quantity IS NOT NULL AND quantity > 0
    THEN quantity * unit_price
    ELSE unit_price END
  ) STORED,

  -- Ordering
  line_order INT DEFAULT 0,

  -- Additional Info
  notes TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_change_order_id (change_order_id),
  INDEX idx_cost_code_id (cost_code_id),
  INDEX idx_budget_line_id (budget_line_id),
  INDEX idx_line_order (line_order)
);
```sql
### 4. change_order_reviews (Multi-tier Approval)
```sql
CREATE TABLE change_order_reviews (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_order_id BIGINT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- Approval Tier (1-4 tiers supported)
  tier INT NOT NULL DEFAULT 1,
  approver_user_id BIGINT REFERENCES users(id),

  -- Review Status
  approval_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'DELEGATED', 'SKIPPED') DEFAULT 'PENDING',

  -- Review Details
  approval_notes TEXT,
  rejection_reason ENUM('NEEDS_REVISION', 'UNBUDGETED', 'TIMELINE_ISSUE', 'INCOMPLETE', 'SCOPE_CHANGE', 'OTHER'),
  rejection_comments TEXT,

  -- Impact Assessment
  schedule_impact ENUM('YES', 'NO', 'UNKNOWN'),
  budget_impact_notes TEXT,

  -- Dates
  approved_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,

  -- Delegation
  delegated_to_user_id BIGINT REFERENCES users(id),
  delegation_reason TEXT,

  -- DocuSign Integration (Future)
  docusign_envelope_id VARCHAR(255),
  signature_status ENUM('NOT_REQUIRED', 'PENDING', 'SIGNED', 'DECLINED') DEFAULT 'NOT_REQUIRED',
  signed_at TIMESTAMP NULL,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE KEY unique_approval (change_order_id, tier),

  -- Indexes
  INDEX idx_change_order_id (change_order_id),
  INDEX idx_approval_status (approval_status),
  INDEX idx_tier (tier),
  INDEX idx_approver (approver_user_id),
  INDEX idx_approved_at (approved_at)
);
```sql
### 5. change_order_attachments (Document Management)

```sql
CREATE TABLE change_order_attachments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_order_id BIGINT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),

  -- File Categories
  attachment_type ENUM('DRAWING', 'SPECIFICATION', 'PHOTO', 'CALCULATION', 'CORRESPONDENCE', 'OTHER') DEFAULT 'OTHER',

  -- Upload Information
  uploaded_by_user_id BIGINT NOT NULL REFERENCES users(id),
  upload_session_id VARCHAR(255), -- For chunked uploads

  -- File Status
  status ENUM('UPLOADING', 'READY', 'PROCESSING', 'FAILED') DEFAULT 'UPLOADING',
  virus_scan_status ENUM('PENDING', 'CLEAN', 'INFECTED', 'FAILED'),

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_change_order_id (change_order_id),
  INDEX idx_uploaded_by (uploaded_by_user_id),
  INDEX idx_attachment_type (attachment_type),
  INDEX idx_status (status)
);
```sql
### 6. change_order_audit_log (Complete Audit Trail)
```sql
CREATE TABLE change_order_audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_order_id BIGINT NOT NULL REFERENCES change_orders(id),

  -- Action Information
  action ENUM('CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'SUBMIT', 'DELETE', 'RECOVER', 'SIGN', 'EXECUTE', 'DELEGATE') NOT NULL,
  entity_type ENUM('CHANGE_ORDER', 'LINE_ITEM', 'ATTACHMENT', 'REVIEW', 'PACKAGE') DEFAULT 'CHANGE_ORDER',
  entity_id BIGINT, -- ID of the specific entity being changed

  -- Change Details
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,

  -- Context
  user_id BIGINT NOT NULL REFERENCES users(id),
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),

  -- Additional Context
  reason TEXT,
  metadata JSON,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_change_order_id (change_order_id),
  INDEX idx_action (action),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_entity (entity_type, entity_id)
);
```

## Data Migration Scripts

### Migration from Current Structure

```sql
-- Step 1: Add new columns to existing change_orders table
ALTER TABLE change_orders
ADD COLUMN package_id BIGINT REFERENCES change_order_packages(id),
ADD COLUMN revision INT DEFAULT 0,
ADD COLUMN change_order_type ENUM('COMMITMENT', 'PRIME_CONTRACT') DEFAULT 'COMMITMENT',
ADD COLUMN contract_id BIGINT NOT NULL DEFAULT 0,
ADD COLUMN description TEXT,
ADD COLUMN change_reason_id BIGINT,
ADD COLUMN scope ENUM('IN_SCOPE', 'OUT_OF_SCOPE') DEFAULT 'IN_SCOPE',
ADD COLUMN date_initiated DATE DEFAULT CURRENT_DATE,
ADD COLUMN due_date DATE,
ADD COLUMN review_date DATE,
ADD COLUMN designated_reviewer_id BIGINT REFERENCES users(id),
ADD COLUMN private BOOLEAN DEFAULT FALSE,
ADD COLUMN schedule_impact ENUM('YES', 'NO', 'UNKNOWN'),
ADD COLUMN change_event_id BIGINT,
ADD COLUMN created_by_user_id BIGINT REFERENCES users(id),
ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id),
ADD COLUMN deleted_at TIMESTAMP NULL,
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Step 2: Populate contract_id from commitment_id for existing records
UPDATE change_orders
SET contract_id = commitment_id,
    change_order_type = 'COMMITMENT',
    created_by_user_id = (SELECT id FROM users LIMIT 1) -- Placeholder
WHERE commitment_id IS NOT NULL;

-- Step 3: Create new tables
-- (Execute all CREATE TABLE statements from above)

-- Step 4: Create default packages for existing change orders
INSERT INTO change_order_packages (project_id, package_number, title, change_order_type, created_by_user_id)
SELECT DISTINCT
  project_id,
  CONCAT('PKG-', RIGHT(CONCAT('000', ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY id)), 3)) as package_number,
  'Legacy Package' as title,
  'COMMITMENT' as change_order_type,
  created_by_user_id
FROM change_orders
WHERE package_id IS NULL;

-- Step 5: Update change_orders to reference packages
UPDATE change_orders co
JOIN change_order_packages cop ON co.project_id = cop.project_id
SET co.package_id = cop.id
WHERE co.package_id IS NULL AND cop.title = 'Legacy Package';
```markdown
## Views and Helper Functions

### Total Amount Calculation View
```sql
CREATE VIEW change_order_totals AS
SELECT
  co.id as change_order_id,
  co.number,
  co.title,
  COALESCE(SUM(li.extended_amount), 0) as total_amount,
  COUNT(li.id) as line_items_count,
  co.status,
  co.change_order_type
FROM change_orders co
LEFT JOIN change_order_lines li ON co.id = li.change_order_id
WHERE co.is_deleted = FALSE
GROUP BY co.id, co.number, co.title, co.status, co.change_order_type;
```sql
### Package Summary View

```sql
CREATE VIEW package_summaries AS
SELECT
  p.id as package_id,
  p.package_number,
  p.title as package_title,
  p.status as package_status,
  COUNT(co.id) as change_orders_count,
  COALESCE(SUM(cot.total_amount), 0) as package_total_amount,
  COUNT(CASE WHEN co.status = 'APPROVED' THEN 1 END) as approved_count,
  COUNT(CASE WHEN co.status = 'PENDING' THEN 1 END) as pending_count
FROM change_order_packages p
LEFT JOIN change_orders co ON p.id = co.package_id AND co.is_deleted = FALSE
LEFT JOIN change_order_totals cot ON co.id = cot.change_order_id
GROUP BY p.id, p.package_number, p.title, p.status;
```sql
### Approval Status Function
```sql
DELIMITER //
CREATE FUNCTION get_approval_status(change_order_id BIGINT)
RETURNS VARCHAR(20)
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE approval_count INT DEFAULT 0;
  DECLARE rejection_count INT DEFAULT 0;
  DECLARE pending_count INT DEFAULT 0;

  SELECT
    COUNT(CASE WHEN approval_status = 'APPROVED' THEN 1 END),
    COUNT(CASE WHEN approval_status = 'REJECTED' THEN 1 END),
    COUNT(CASE WHEN approval_status = 'PENDING' THEN 1 END)
  INTO approval_count, rejection_count, pending_count
  FROM change_order_reviews
  WHERE change_order_id = change_order_id;

  IF rejection_count > 0 THEN
    RETURN 'REJECTED';
  ELSEIF pending_count > 0 THEN
    RETURN 'PENDING';
  ELSEIF approval_count > 0 THEN
    RETURN 'APPROVED';
  ELSE
    RETURN 'NO_REVIEWS';
  END IF;
END //
DELIMITER ;
```

## Performance Considerations

### Indexing Strategy

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_co_project_status ON change_orders(project_id, status);
CREATE INDEX idx_co_project_type ON change_orders(project_id, change_order_type);
CREATE INDEX idx_co_reviewer_status ON change_orders(designated_reviewer_id, status);
CREATE INDEX idx_co_due_date_status ON change_orders(due_date, status);

-- Package-related indexes
CREATE INDEX idx_package_project_type ON change_order_packages(project_id, change_order_type);

-- Line items performance
CREATE INDEX idx_li_co_order ON change_order_lines(change_order_id, line_order);

-- Audit log partitioning (for high-volume environments)
-- Partition by created_at monthly for better performance
```markdown
### Query Optimization Examples
```sql
-- Efficient change order list with totals
SELECT
  co.id,
  co.number,
  co.title,
  co.status,
  co.due_date,
  co.designated_reviewer_id,
  cot.total_amount,
  cot.line_items_count,
  p.package_number
FROM change_orders co
LEFT JOIN change_order_totals cot ON co.id = cot.change_order_id
LEFT JOIN change_order_packages p ON co.package_id = p.id
WHERE co.project_id = ?
  AND co.is_deleted = FALSE
  AND (? IS NULL OR co.status = ?)
  AND (? IS NULL OR co.change_order_type = ?)
ORDER BY co.created_at DESC
LIMIT ? OFFSET ?;

-- Efficient approval workflow query
SELECT
  co.id,
  co.number,
  co.title,
  cor.tier,
  cor.approval_status,
  cor.approved_at,
  u.name as approver_name
FROM change_orders co
JOIN change_order_reviews cor ON co.id = cor.change_order_id
LEFT JOIN users u ON cor.approver_user_id = u.id
WHERE co.designated_reviewer_id = ?
  AND cor.approval_status = 'PENDING'
ORDER BY co.due_date ASC;
```sql
### Triggers for Data Consistency

```sql
-- Update package totals when change orders change
DELIMITER //
CREATE TRIGGER update_package_totals_after_co_update
AFTER UPDATE ON change_orders
FOR EACH ROW
BEGIN
  IF NEW.package_id IS NOT NULL THEN
    UPDATE change_order_packages
    SET
      total_amount = (
        SELECT COALESCE(SUM(cot.total_amount), 0)
        FROM change_order_totals cot
        JOIN change_orders co2 ON cot.change_order_id = co2.id
        WHERE co2.package_id = NEW.package_id
      ),
      change_orders_count = (
        SELECT COUNT(*)
        FROM change_orders co3
        WHERE co3.package_id = NEW.package_id AND co3.is_deleted = FALSE
      )
    WHERE id = NEW.package_id;
  END IF;
END //
DELIMITER ;
```

This comprehensive schema provides the foundation for a robust change orders system with proper audit trails, multi-tier approvals, and performance optimization.

---

## uapi endpoints changeorders

---
title: API_ENDPOINTS ChangeOrders
description: API_ENDPOINTS ChangeOrders documentation
---

# Change Orders API Endpoints Specification

## Endpoint Overview

### Core CRUD Operations

- `GET /api/projects/{projectId}/change-orders` - List/filter change orders
- `POST /api/projects/{projectId}/change-orders` - Create new change order
- `GET /api/projects/{projectId}/change-orders/{id}` - Get change order details
- `PUT /api/projects/{projectId}/change-orders/{id}` - Update change order
- `DELETE /api/projects/{projectId}/change-orders/{id}` - Delete change order

### Workflow Operations

- `POST /api/projects/{projectId}/change-orders/{id}/submit` - Submit for review
- `POST /api/projects/{projectId}/change-orders/{id}/approve` - Approve change order
- `POST /api/projects/{projectId}/change-orders/{id}/reject` - Reject change order
- `POST /api/projects/{projectId}/change-orders/{id}/delegate` - Delegate review
- `POST /api/projects/{projectId}/change-orders/{id}/execute` - Execute change order

### Package Management

- `GET /api/projects/{projectId}/change-order-packages` - List packages
- `POST /api/projects/{projectId}/change-order-packages` - Create package
- `GET /api/projects/{projectId}/change-order-packages/{id}` - Package details
- `PUT /api/projects/{projectId}/change-order-packages/{id}` - Update package

### Line Items & Attachments

- `GET /api/projects/{projectId}/change-orders/{id}/line-items` - List line items
- `POST /api/projects/{projectId}/change-orders/{id}/line-items` - Add line item
- `PUT /api/projects/{projectId}/change-orders/{id}/line-items/{itemId}` - Update line item
- `DELETE /api/projects/{projectId}/change-orders/{id}/line-items/{itemId}` - Delete line item
- `POST /api/projects/{projectId}/change-orders/{id}/attachments` - Upload attachment
- `DELETE /api/projects/{projectId}/change-orders/{id}/attachments/{attachmentId}` - Remove attachment

### Export & Reporting

- `GET /api/projects/{projectId}/change-orders/export/csv` - CSV export
- `GET /api/projects/{projectId}/change-orders/{id}/pdf` - PDF generation
- `GET /api/projects/{projectId}/change-order-packages/{id}/pdf` - Package PDF
- `GET /api/projects/{projectId}/reports/change-orders/unexecuted` - Unexecuted report
- `GET /api/projects/{projectId}/reports/change-orders/overdue` - Overdue report
- `GET /api/projects/{projectId}/reports/change-orders/by-reason` - Analytics by reason

### Bulk Operations

- `POST /api/projects/{projectId}/change-orders/bulk/approve` - Bulk approve
- `POST /api/projects/{projectId}/change-orders/bulk/reject` - Bulk reject
- `POST /api/projects/{projectId}/change-orders/bulk/submit` - Bulk submit

## Detailed Specifications

### 1. List Change Orders

**Method**: GET
**URL**: `/api/projects/{projectId}/change-orders`
**Purpose**: Retrieve paginated list of change orders with filtering

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | int | No | 1 | Page number |
| limit | int | No | 25 | Items per page (max 100) |
| status | string | No | null | Filter by status |
| contractType | string | No | null | 'prime' or 'commitment' |
| packageId | int | No | null | Filter by package |
| designatedReviewerId | int | No | null | Filter by reviewer |
| search | string | No | null | Search title/description |
| sort | string | No | 'createdAt' | Sort field |
| order | string | No | 'desc' | 'asc' or 'desc' |
| includeDeleted | boolean | No | false | Include soft-deleted records |
| dueDateFrom | date | No | null | Due date range start |
| dueDateTo | date | No | null | Due date range end |

#### Request

```http
GET /api/projects/123/change-orders?status=pending&contractType=prime&page=1&limit=25
Authorization: Bearer <token>
```markdown
#### Response (200 OK)
```json
{
  "data": [
    {
      "id": 562949956482890,
      "number": "CO-001",
      "revision": 1,
      "title": "Phase 1 & 2 Changes - Full Scope",
      "status": "pending",
      "contractType": "commitment",
      "scope": "out_of_scope",
      "amount": 5062.35,
      "dateInitiated": "2025-05-13",
      "dueDate": "2025-05-27",
      "reviewDate": null,
      "designatedReviewer": {
        "id": 456,
        "name": "Dawson, Jesse",
        "email": "jesse@example.com"
      },
      "contract": {
        "id": 123456,
        "title": "General Contractor Agreement",
        "company": "Goodwill Industries of Central Indiana, LLC"
      },
      "package": {
        "id": 1,
        "packageNumber": "PCO-001",
        "title": "Phase 1 Changes & Permit Requirements"
      },
      "lineItemsCount": 2,
      "attachmentsCount": 1,
      "createdAt": "2025-05-13T09:51:00Z",
      "createdBy": {
        "id": 123,
        "name": "Nick Jepson"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 25,
    "totalRecords": 15,
    "totalPages": 1
  },
  "summary": {
    "totalAmount": 125000.50,
    "pendingCount": 5,
    "pendingAmount": 45000.00,
    "approvedCount": 8,
    "approvedAmount": 65000.50,
    "rejectedCount": 2,
    "rejectedAmount": 15000.00
  },
  "_links": {
    "self": "/api/projects/123/change-orders?page=1",
    "first": "/api/projects/123/change-orders?page=1",
    "last": "/api/projects/123/change-orders?page=1"
  }
}
```markdown
### 2. Create Change Order

**Method**: POST
**URL**: `/api/projects/{projectId}/change-orders`
**Purpose**: Create new change order with line items and attachments

#### Request

```json
{
  "packageId": 1,
  "contractType": "commitment",
  "contractId": 123456,
  "number": "CO-002",
  "title": "Electrical Upgrades Phase 2",
  "description": "Additional electrical work for expanded scope",
  "changeReasonId": 5,
  "scope": "in_scope",
  "dateInitiated": "2025-05-15",
  "dueDate": "2025-06-01",
  "designatedReviewerId": 456,
  "private": false,
  "lineItems": [
    {
      "description": "Additional outlets installation",
      "costCodeId": 1001,
      "quantity": 12,
      "unitOfMeasure": "EA",
      "unitPrice": 125.00,
      "notes": "Ground floor outlets"
    },
    {
      "description": "Circuit breaker upgrade",
      "costCodeId": 1002,
      "quantity": 1,
      "unitOfMeasure": "LS",
      "unitPrice": 850.00
    }
  ],
  "attachmentIds": [101, 102]
}
```markdown
#### Response (201 Created)
```json
{
  "id": 562949956482891,
  "number": "CO-002",
  "revision": 0,
  "title": "Electrical Upgrades Phase 2",
  "description": "Additional electrical work for expanded scope",
  "status": "draft",
  "contractType": "commitment",
  "scope": "in_scope",
  "amount": 2350.00,
  "changeReason": {
    "id": 5,
    "name": "Scope Addition",
    "code": "SCOPE_ADD"
  },
  "dateInitiated": "2025-05-15",
  "dueDate": "2025-06-01",
  "designatedReviewer": {
    "id": 456,
    "name": "Dawson, Jesse",
    "email": "jesse@example.com"
  },
  "contract": {
    "id": 123456,
    "title": "Electrical Contractor Agreement",
    "company": "ABC Electrical Services"
  },
  "package": {
    "id": 1,
    "packageNumber": "PCO-001",
    "title": "Phase 1 Changes & Permit Requirements"
  },
  "lineItems": [
    {
      "id": 1,
      "description": "Additional outlets installation",
      "costCode": {
        "id": 1001,
        "code": "16-100",
        "name": "Electrical - Outlets"
      },
      "quantity": 12,
      "unitOfMeasure": "EA",
      "unitPrice": 125.00,
      "extendedAmount": 1500.00,
      "notes": "Ground floor outlets"
    },
    {
      "id": 2,
      "description": "Circuit breaker upgrade",
      "costCode": {
        "id": 1002,
        "code": "16-200",
        "name": "Electrical - Panels"
      },
      "quantity": 1,
      "unitOfMeasure": "LS",
      "unitPrice": 850.00,
      "extendedAmount": 850.00
    }
  ],
  "attachments": [
    {
      "id": 101,
      "fileName": "electrical_plan.pdf",
      "fileSize": 1024000,
      "attachmentType": "drawing"
    }
  ],
  "createdAt": "2025-05-15T14:30:00Z",
  "createdBy": {
    "id": 123,
    "name": "Nick Jepson"
  },
  "_links": {
    "self": "/api/projects/123/change-orders/562949956482891",
    "edit": "/api/projects/123/change-orders/562949956482891",
    "submit": "/api/projects/123/change-orders/562949956482891/submit"
  }
}
```

#### Error (400 Bad Request)

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid change order data",
  "details": [
    {
      "field": "contractId",
      "code": "INVALID_CONTRACT",
      "message": "Contract not found or not eligible for change orders"
    },
    {
      "field": "lineItems",
      "code": "REQUIRED_FIELD",
      "message": "At least one line item is required"
    },
    {
      "field": "lineItems[0].unitPrice",
      "code": "INVALID_AMOUNT",
      "message": "Unit price must be greater than 0"
    }
  ]
}
```typescript
### 3. Get Change Order Details
**Method**: GET
**URL**: `/api/projects/{projectId}/change-orders/{id}`
**Purpose**: Retrieve complete change order details with relationships

#### Request
```http
GET /api/projects/123/change-orders/562949956482890
Authorization: Bearer <token>
```markdown
#### Response (200 OK)

```json
{
  "id": 562949956482890,
  "number": "CO-001",
  "revision": 1,
  "title": "Phase 1 & 2 Changes - Full Scope",
  "description": "Additional work for carpet installation and plumbing modifications per owner request",
  "status": "approved",
  "contractType": "commitment",
  "scope": "out_of_scope",
  "amount": 5062.35,
  "changeReason": {
    "id": 5,
    "name": "Owner Request",
    "code": "OWNER_REQ"
  },
  "dateInitiated": "2025-05-13",
  "dueDate": "2025-05-27",
  "reviewDate": "2025-05-25",
  "executionDate": null,
  "signedOrderReceivedDate": null,
  "revisedCompletionDate": null,
  "scheduleImpact": "no",
  "private": false,
  "executed": false,
  "designatedReviewer": {
    "id": 456,
    "name": "Dawson, Jesse",
    "email": "jesse@example.com",
    "phone": "+1-555-0123"
  },
  "contract": {
    "id": 123456,
    "title": "General Contractor Agreement",
    "company": "Goodwill Industries of Central Indiana, LLC",
    "contractNumber": "GC-2025-001",
    "contractType": "commitment",
    "originalValue": 2500000.00,
    "currentValue": 2505062.35
  },
  "package": {
    "id": 1,
    "packageNumber": "PCO-001",
    "title": "Phase 1 Changes & Permit Requirements",
    "status": "approved",
    "totalAmount": 15062.35,
    "changeOrdersCount": 3
  },
  "changeEvent": {
    "id": 789012,
    "number": "CE-007",
    "title": "Phase 1 & 2 Carpet Selection"
  },
  "lineItems": [
    {
      "id": 1,
      "description": "Carpet Installation - Premium Grade",
      "costCode": {
        "id": 1001,
        "code": "09-680",
        "name": "Carpet & Rugs"
      },
      "budgetLine": {
        "id": 2001,
        "description": "Flooring - Common Areas",
        "budgetedAmount": 15000.00,
        "actualAmount": 12000.00
      },
      "quantity": 500,
      "unitOfMeasure": "SF",
      "unitPrice": 15.00,
      "extendedAmount": 7500.00,
      "notes": "Upgraded to premium material per owner selection",
      "lineOrder": 1
    },
    {
      "id": 2,
      "description": "Plumbing Materials and Labor",
      "costCode": {
        "id": 1002,
        "code": "22-100",
        "name": "Plumbing"
      },
      "quantity": 1,
      "unitOfMeasure": "LS",
      "unitPrice": 5047.35,
      "extendedAmount": 5047.35,
      "lineOrder": 2
    }
  ],
  "attachments": [
    {
      "id": 1,
      "fileName": "carpet_specifications.pdf",
      "filePath": "projects/123/change-orders/562949956482890/carpet_specifications.pdf",
      "fileSize": 2048000,
      "mimeType": "application/pdf",
      "attachmentType": "specification",
      "uploadedBy": {
        "id": 123,
        "name": "Nick Jepson"
      },
      "createdAt": "2025-05-13T09:00:00Z",
      "downloadUrl": "/api/files/download/1?token=abc123"
    }
  ],
  "reviews": [
    {
      "id": 1,
      "tier": 1,
      "approver": {
        "id": 456,
        "name": "Dawson, Jesse",
        "email": "jesse@example.com"
      },
      "approvalStatus": "approved",
      "approvalNotes": "Approved as submitted. Scope and pricing are reasonable for the upgrade requested.",
      "scheduleImpact": "no",
      "approvedAt": "2025-05-25T10:15:00Z",
      "signatureStatus": "not_required"
    }
  ],
  "relatedItems": [
    {
      "id": 1,
      "relatedItemType": "rfi",
      "relatedItemId": 45,
      "relatedItemNumber": "RFI-045",
      "relatedItemTitle": "Carpet Specifications Clarification",
      "relationshipType": "supports",
      "notes": "This RFI provided the specifications that led to this change order"
    }
  ],
  "auditLog": [
    {
      "id": 1,
      "action": "create",
      "user": {
        "id": 123,
        "name": "Nick Jepson"
      },
      "timestamp": "2025-05-13T09:51:00Z",
      "details": "Change order created"
    },
    {
      "id": 2,
      "action": "submit",
      "user": {
        "id": 123,
        "name": "Nick Jepson"
      },
      "timestamp": "2025-05-13T10:15:00Z",
      "details": "Submitted for review"
    },
    {
      "id": 3,
      "action": "approve",
      "user": {
        "id": 456,
        "name": "Dawson, Jesse"
      },
      "timestamp": "2025-05-25T10:15:00Z",
      "details": "Approved by designated reviewer"
    }
  ],
  "budgetImpact": {
    "affectedBudgetLines": [
      {
        "budgetLineId": 2001,
        "description": "Flooring - Common Areas",
        "originalAmount": 15000.00,
        "impactAmount": 7500.00,
        "newProjectedAmount": 22500.00,
        "variancePercent": 50.0
      }
    ],
    "totalBudgetImpact": 12547.35,
    "projectOriginalBudget": 2500000.00,
    "projectCurrentBudget": 2512547.35
  },
  "permissions": {
    "canEdit": true,
    "canDelete": false,
    "canApprove": true,
    "canExecute": true,
    "canViewPrivate": true
  },
  "createdAt": "2025-05-13T09:51:00Z",
  "createdBy": {
    "id": 123,
    "name": "Nick Jepson",
    "email": "nick@example.com"
  },
  "updatedAt": "2025-05-25T10:15:00Z",
  "updatedBy": {
    "id": 456,
    "name": "Dawson, Jesse",
    "email": "jesse@example.com"
  },
  "_links": {
    "self": "/api/projects/123/change-orders/562949956482890",
    "edit": "/api/projects/123/change-orders/562949956482890",
    "approve": "/api/projects/123/change-orders/562949956482890/approve",
    "execute": "/api/projects/123/change-orders/562949956482890/execute",
    "pdf": "/api/projects/123/change-orders/562949956482890/pdf",
    "package": "/api/projects/123/change-order-packages/1",
    "contract": "/api/projects/123/commitments/123456"
  }
}
```markdown
### 4. Update Change Order
**Method**: PUT
**URL**: `/api/projects/{projectId}/change-orders/{id}`
**Purpose**: Update change order fields based on current status

#### Request
```json
{
  "title": "Phase 1 & 2 Changes - REVISED SCOPE",
  "description": "Updated description with revised scope details",
  "dueDate": "2025-06-15",
  "designatedReviewerId": 789,
  "lineItems": [
    {
      "id": 1,
      "description": "Carpet Installation - Premium Grade Plus",
      "quantity": 550,
      "unitPrice": 16.00
    },
    {
      "id": 2,
      "description": "Plumbing Materials and Labor",
      "quantity": 1,
      "unitPrice": 5247.35
    }
  ]
}
```

#### Response (200 OK)

```json
{
  "id": 562949956482890,
  "number": "CO-001",
  "revision": 2,
  "title": "Phase 1 & 2 Changes - REVISED SCOPE",
  "description": "Updated description with revised scope details",
  "status": "draft",
  "amount": 14047.35,
  "dueDate": "2025-06-15",
  "designatedReviewer": {
    "id": 789,
    "name": "Project Manager",
    "email": "pm@example.com"
  },
  "updatedAt": "2025-05-26T14:30:00Z",
  "updatedBy": {
    "id": 123,
    "name": "Nick Jepson"
  },
  "_links": {
    "self": "/api/projects/123/change-orders/562949956482890"
  }
}
```markdown
### 5. Approve Change Order
**Method**: POST
**URL**: `/api/projects/{projectId}/change-orders/{id}/approve`
**Purpose**: Approve change order and advance workflow

#### Request
```json
{
  "approvalNotes": "Approved with conditions. Please update material specifications before proceeding.",
  "scheduleImpact": "no",
  "conditions": [
    "Update carpet specifications to include stain resistance",
    "Confirm plumbing work schedule with mechanical contractor"
  ],
  "requireSignature": false,
  "nextTierReviewerId": null
}
```yaml
#### Response (200 OK)

```json
{
  "id": 562949956482890,
  "status": "approved",
  "reviewDate": "2025-05-26T15:45:00Z",
  "currentTier": 1,
  "nextTier": null,
  "approvalComplete": true,
  "review": {
    "id": 1,
    "tier": 1,
    "approvalStatus": "approved",
    "approvalNotes": "Approved with conditions. Please update material specifications before proceeding.",
    "scheduleImpact": "no",
    "approvedAt": "2025-05-26T15:45:00Z",
    "approver": {
      "id": 456,
      "name": "Dawson, Jesse"
    }
  },
  "notifications": {
    "emailsSent": [
      {
        "recipient": "nick@example.com",
        "type": "approval_notification",
        "status": "sent"
      }
    ]
  },
  "_links": {
    "self": "/api/projects/123/change-orders/562949956482890",
    "execute": "/api/projects/123/change-orders/562949956482890/execute"
  }
}
```yaml
### 6. CSV Export
**Method**: GET
**URL**: `/api/projects/{projectId}/change-orders/export/csv`
**Purpose**: Export filtered change orders as CSV

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status |
| contractType | string | No | Filter by contract type |
| dateFrom | date | No | Created date range start |
| dateTo | date | No | Created date range end |
| includeLineItems | boolean | No | Include line item details |

#### Request
```http
GET /api/projects/123/change-orders/export/csv?status=approved&includeLineItems=true
Authorization: Bearer <token>
Accept: text/csv
```

#### Response (200 OK)

```csv
Number,Title,Status,Contract Type,Contract Company,Amount,Date Initiated,Due Date,Review Date,Designated Reviewer,Line Items Count,Created By,Created Date
CO-001,Phase 1 & 2 Changes - Full Scope,approved,commitment,Goodwill Industries,5062.35,2025-05-13,2025-05-27,2025-05-25,Dawson Jesse,2,Nick Jepson,2025-05-13 09:51:00
CO-002,Electrical Upgrades Phase 2,pending,commitment,ABC Electrical,2350.00,2025-05-15,2025-06-01,,Dawson Jesse,2,Nick Jepson,2025-05-15 14:30:00
```yaml
### 7. Generate PDF
**Method**: GET
**URL**: `/api/projects/{projectId}/change-orders/{id}/pdf`
**Purpose**: Generate formatted PDF for change order

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| template | string | No | PDF template ('standard', 'detailed') |
| includeAttachments | boolean | No | Append attachments to PDF |

#### Request
```http
GET /api/projects/123/change-orders/562949956482890/pdf?template=detailed&includeAttachments=true
Authorization: Bearer <token>
Accept: application/pdf
```markdown
#### Response (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="CO-001_Phase_1_2_Changes.pdf"
Content-Length: 524288

%PDF-1.4
[Binary PDF content]
```markdown
### 8. Bulk Operations
**Method**: POST
**URL**: `/api/projects/{projectId}/change-orders/bulk/approve`
**Purpose**: Approve multiple change orders in one operation

#### Request
```json
{
  "changeOrderIds": [562949956482890, 562949956482891, 562949956482892],
  "approvalNotes": "Batch approval for Phase 1 scope items. All items reviewed and approved as submitted.",
  "scheduleImpact": "no",
  "maintainDueDates": true,
  "sendNotifications": true,
  "effectiveDate": "2025-05-26"
}
```

#### Response (200 OK)

```json
{
  "processed": 3,
  "successful": 2,
  "failed": 1,
  "results": [
    {
      "changeOrderId": 562949956482890,
      "status": "success",
      "newStatus": "approved",
      "message": "Successfully approved"
    },
    {
      "changeOrderId": 562949956482891,
      "status": "success",
      "newStatus": "approved",
      "message": "Successfully approved"
    },
    {
      "changeOrderId": 562949956482892,
      "status": "error",
      "error": "INSUFFICIENT_PERMISSIONS",
      "message": "User not authorized to approve this change order"
    }
  ],
  "notifications": {
    "emailsSent": 4,
    "emailsFailed": 0
  },
  "summary": {
    "totalApproved": 2,
    "totalAmount": 7412.35
  }
}
```

## Authentication & Authorization

### Authentication Requirements

- All endpoints require valid Bearer token
- Token must be associated with user having project access
- Session validation on each request

### Authorization Matrix

| Role | Create | Edit Own | Edit Any | Approve | Execute | Delete | View Private |
|------|--------|----------|----------|---------|---------|--------|-------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Project Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Reviewer | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Standard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read Only | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Error Codes & Handling

### Standard HTTP Status Codes

- `200 OK` - Successful operation
- `201 Created` - Resource created successfully
- `400 Bad Request` - Validation errors or malformed request
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate number)
- `422 Unprocessable Entity` - Business logic validation failed
- `500 Internal Server Error` - Server error

### Custom Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| VALIDATION_ERROR | Form validation failed | 400 |
| INVALID_CONTRACT | Contract not eligible | 400 |
| DUPLICATE_NUMBER | Change order number exists | 409 |
| INSUFFICIENT_PERMISSIONS | User lacks required permissions | 403 |
| INVALID_STATUS_TRANSITION | Cannot change from current status | 422 |
| BUDGET_EXCEEDED | Amount exceeds budget limits | 422 |
| REVIEWER_NOT_FOUND | Designated reviewer not valid | 400 |
| PACKAGE_NOT_FOUND | Package does not exist | 404 |
| FILE_UPLOAD_FAILED | Attachment upload error | 422 |
| PDF_GENERATION_FAILED | PDF creation error | 500 |

### Rate Limiting

- 100 requests per minute per user for standard operations
- 10 requests per minute for PDF generation
- 5 requests per minute for bulk operations
- Rate limit headers included in all responses

This comprehensive API specification provides all necessary endpoints for a complete change orders management system with proper authentication, validation, and error handling.

---

## uui changeorders

---
title: UI ChangeOrders
description: UI ChangeOrders documentation
---

# Change Orders UI Components Specification

## Component Specifications

### 1. ChangeOrdersList

**File**: `frontend/src/app/(main)/[projectId]/change-orders/page.tsx`
**Purpose**: Main list view with filtering, sorting, and summary metrics
**Status**: 50% complete (basic table implemented, needs enhancement)

#### Props Interface

```typescript
interface ChangeOrdersListProps {
  projectId: string;
  initialFilters?: {
    status?: string;
    contractType?: string;
    packageId?: number;
  };
}
```markdown
#### Current Implementation Features
- ✅ Basic data table with columns: Number, Title, Contract, Status, Amount, Due Date
- ✅ Tab navigation (All, Pending, Approved, Draft)
- ✅ Status badges with color coding
- ✅ Summary cards showing counts and totals
- ✅ Empty state with CTA
- ✅ Loading state

#### Required Enhancements
- ❌ Add missing columns: Date Initiated, Revision, Reviewer, Review Date
- ❌ Implement Prime vs Commitments tabs
- ❌ Add proper filtering system
- ❌ Implement CSV export functionality
- ❌ Create Reports dropdown menu
- ❌ Add package grouping view
- ❌ Implement bulk selection and actions
- ❌ Add search functionality

#### Layout Structure
```typescript
┌─────────────────────────────────────────────────────────────┐
│                      Change Orders                         │
├─────────────────────────────────────────────────────────────┤
│ Summary Cards Row                                           │
│ [5 Pending/$45K] [8 Approved/$65K] [2 Rejected/$15K]      │
├─────────────────────────────────────────────────────────────┤
│ Tabs & Actions Row                                          │
│ [Prime] [Commitments] [All]    [Export▼] [Reports▼] [New+] │
├─────────────────────────────────────────────────────────────┤
│ Filters & Search Row                                        │
│ Status:[All▼] Package:[All▼] Reviewer:[All▼] [Search...] 🔍 │
├─────────────────────────────────────────────────────────────┤
│ Data Table                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ #  │Title    │Contract│Status │Amount │Due Date│Actions │ │
│ │────┼─────────┼────────┼───────┼───────┼────────┼────────│ │
│ │CO-1│Phase 1..│ABC Corp│Pending│$5,062 │05/27/25│[...]   │ │
│ │CO-2│Elect... │XYZ Elec│Draft  │$2,350 │06/01/25│[...]   │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Pagination                                                  │
│ [← Prev] Page 1 of 3 [Next →]          25 per page [▼]     │
└─────────────────────────────────────────────────────────────┘

```typescript
### 2. ChangeOrderCreateForm
**File**: `frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx`
**Purpose**: Multi-step form for creating new change orders
**Status**: 5% complete (stub only)

#### Props Interface
```typescript
interface ChangeOrderCreateFormProps {
  projectId: string;
  initialData?: Partial<ChangeOrder>;
  onSuccess: (changeOrder: ChangeOrder) => void;
  onCancel: () => void;
}
```

#### Layout Structure

```text
┌─────────────────────────────────────────────────────────────┐
│  Create Change Order                           Step 1 of 4  │
├─────────────────────────────────────────────────────────────┤
│ Progress Bar: ████████░░░░░░░░░░░░░░░░░░░░░░░░              │
├─────────────────────────────────────────────────────────────┤
│ Step Content Area                                           │
│                                                             │
│ [Dynamic content based on current step]                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Form Navigation                                             │
│                           [Cancel] [← Back] [Next Step →]  │
└─────────────────────────────────────────────────────────────┘
```typescript
### 3. ChangeOrderDetail

**File**: `frontend/src/app/(main)/[projectId]/change-orders/[id]/page.tsx`
**Purpose**: Detailed view with editing, approval, and action capabilities
**Status**: Not implemented

#### Props Interface

```typescript
interface ChangeOrderDetailProps {
  changeOrderId: string;
  projectId: string;
  mode?: 'view' | 'edit';
}
```markdown
#### Layout Structure
```

┌─────────────────────────────────────────────────────────────┐
│  CO-001: Phase 1 & 2 Changes                     [Edit] [▼] │
├─────────────────────────────────────────────────────────────┤
│ Status & Key Info Row                                       │
│ [APPROVED] PCO-001 │ $5,062.35 │ Due: 05/27 │ Reviewer: J.D│
├─────────────────────────────────────────────────────────────┤
│ Tab Navigation                                              │
│ [General] [Line Items] [Attachments] [Reviews] [History]   │
├─────────────────────────────────────────────────────────────┤
│ Tab Content Area                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │             [Dynamic tab content]                       │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Action Buttons                                              │
│ [Approve] [Reject] [Execute] [Generate PDF] [Email]        │
└─────────────────────────────────────────────────────────────┘

```typescript
### 4. LineItemsTable
**File**: `frontend/src/components/domain/change-orders/LineItemsTable.tsx`
**Purpose**: Editable table for managing change order line items
**Status**: Not implemented

#### Props Interface
```typescript
interface LineItemsTableProps {
  lineItems: ChangeOrderLineItem[];
  onChange: (lineItems: ChangeOrderLineItem[]) => void;
  readOnly?: boolean;
  showTotals?: boolean;
}

interface ChangeOrderLineItem {
  id?: number;
  description: string;
  costCodeId?: number;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  extendedAmount: number;
  notes?: string;
}
```bash
#### Layout Structure

```bash
┌─ Line Items ────────────────────────────────────────────────┐
│                                              [Add Item +]  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │Desc        │Code    │Qty │UoM│Unit Price│Amount │Actions│ │
│ │────────────┼────────┼────┼───┼──────────┼───────┼───────│ │
│ │Site Work   │01-100  │100 │SF │ $15.00   │$1,500 │[🗑️]   │ │
│ │Materials   │02-200  │  1 │LS │$5,047    │$5,047 │[🗑️]   │ │
│ │[+ Add Row] │        │    │   │          │       │       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Subtotal: $6,547.00                                         │
│ Tax: $0.00                                                  │
│ Total: $6,547.00                                            │
└─────────────────────────────────────────────────────────────┘
```

### 5. ApprovalWorkflow

**File**: `frontend/src/components/domain/change-orders/ApprovalWorkflow.tsx`
**Purpose**: Multi-tier approval interface with review history
**Status**: Not implemented

#### Props Interface

```typescript
interface ApprovalWorkflowProps {
  changeOrder: ChangeOrder;
  reviews: ChangeOrderReview[];
  currentUserCanApprove: boolean;
  onApprove: (data: ApprovalData) => void;
  onReject: (data: RejectionData) => void;
}
```markdown
#### Layout Structure
```typescript
┌─ Approval Workflow ─────────────────────────────────────────┐
│                                                             │
│ Current Status: PENDING APPROVAL (Tier 1 of 2)             │
│                                                             │
│ ┌─ Tier 1: Project Manager ─────────────────────[PENDING]┐ │
│ │ Assigned: Dawson, Jesse                                │ │
│ │ Due: 05/27/2025                                        │ │
│ │ [Approve] [Reject] [Request Changes] [Delegate]        │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ Tier 2: Executive Approval ──────────────────[WAITING]┐ │
│ │ Assigned: TBD (after Tier 1)                          │ │
│ │ Due: TBD                                               │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                             │
│ Review History:                                             │
│ • 05/13 - Created by Nick Jepson                          │
│ • 05/13 - Submitted for review                            │
│ • 05/25 - Pending approval from Dawson, Jesse             │
└─────────────────────────────────────────────────────────────┘

```typescript
### 6. ChangeOrderPackages
**File**: `frontend/src/components/domain/change-orders/ChangeOrderPackages.tsx`
**Purpose**: Package-based organization and management
**Status**: Not implemented

#### Props Interface
```typescript
interface ChangeOrderPackagesProps {
  projectId: string;
  packages: ChangeOrderPackage[];
  selectedPackageId?: number;
  onPackageSelect: (packageId: number) => void;
}
```

#### Layout Structure

```bash
┌─ Change Order Packages ─────────────────────────────────────┐
│                                                             │
│ ┌─ PCO-001: Phase 1 Changes ─────────────────────[APPROVED]┐│
│ │ Total: $15,062.35 │ 3 Change Orders │ Due: 05/30/2025  ││
│ │                                                          ││
│ │ Change Orders:                                           ││
│ │ • CO-001: Carpet Installation ($7,500)      [APPROVED]  ││
│ │ • CO-002: Plumbing Work ($5,047)            [APPROVED]  ││
│ │ • CO-003: Electrical ($2,515)               [PENDING]   ││
│ │                                                          ││
│ │ [View Package] [Generate PDF] [Edit] [...]              ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─ PCO-002: Phase 2 Additions ───────────────────[PENDING]┐│
│ │ Total: $8,250.00 │ 2 Change Orders │ Due: 06/15/2025   ││
│ │ [View Package] [Edit] [...]                             ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ [+ New Package]                                             │
└─────────────────────────────────────────────────────────────┘
```typescript
### 7. StatusBadge

**File**: `frontend/src/components/ui/status-badge.tsx`
**Purpose**: Consistent status indicators across all change order views
**Status**: ✅ Implemented (basic version exists)

#### Props Interface

```typescript
interface StatusBadgeProps {
  status: ChangeOrderStatus;
  variant?: 'default' | 'compact' | 'detailed';
  showIcon?: boolean;
}

type ChangeOrderStatus =
  | 'draft'
  | 'submitted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'withdrawn';
```markdown
#### Visual Design
```

Status Badge Variants:
┌─────────────────┐ ┌─────────┐ ┌──────────────────────────┐
│ 🟡 PENDING      │ │ PENDING │ │ 🟡 PENDING              │
│                 │ │         │ │ Awaiting Tier 1 Review  │
│ Default         │ │ Compact │ │ Detailed                │
└─────────────────┘ └─────────┘ └──────────────────────────┘

```typescript
### 8. ExportDropdown
**File**: `frontend/src/components/domain/change-orders/ExportDropdown.tsx`
**Purpose**: Export options menu with CSV and PDF generation
**Status**: Not implemented

#### Props Interface
```typescript
interface ExportDropdownProps {
  selectedChangeOrders?: number[];
  projectId: string;
  filters?: ChangeOrderFilters;
}
```markdown
#### Layout Structure

```text
┌─ Export ▼ ──────────────────────────────────────────────────┐
│                                                             │
│ ┌─ Export Options ──────────────────────────────────────┐   │
│ │ 📄 Export to CSV                                      │   │
│ │ 📋 Export Selected to CSV                            │   │
│ │ ───────────────────────────                          │   │
│ │ 📃 Generate PDF (Single)                             │   │
│ │ 📑 Generate Package PDF                               │   │
│ │ ───────────────────────────                          │   │
│ │ 📊 Export Summary Report                              │   │
│ │ 📈 Export Budget Impact                               │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 9. ReportsDropdown

**File**: `frontend/src/components/domain/change-orders/ReportsDropdown.tsx`
**Purpose**: Predefined reports and analytics access
**Status**: Not implemented

#### Props Interface

```typescript
interface ReportsDropdownProps {
  projectId: string;
  userRole: string;
}
```markdown
#### Layout Structure
```typescript
┌─ Reports ▼ ─────────────────────────────────────────────────┐
│                                                             │
│ ┌─ Standard Reports ────────────────────────────────────┐   │
│ │ 📊 Unexecuted Change Orders                          │   │
│ │ ⏰ Overdue Change Orders                              │   │
│ │ 📈 Budget Impact Summary                              │   │
│ │ ───────────────────────────                          │   │
│ │ 🏷️  Change Orders by Reason                          │   │
│ │ 👤 Change Orders by Reviewer                          │   │
│ │ 📅 Change Orders by Date Range                        │   │
│ │ ───────────────────────────                          │   │
│ │ ⚡ Quick Analytics Dashboard                          │   │
│ │ 🔧 Custom Report Builder                              │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

```typescript
### 10. FileUploadZone
**File**: `frontend/src/components/domain/change-orders/FileUploadZone.tsx`
**Purpose**: Drag-and-drop file upload with progress tracking
**Status**: Not implemented

#### Props Interface
```typescript
interface FileUploadZoneProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  changeOrderId?: number;
}
```

#### Layout Structure

```text
┌─ File Upload ───────────────────────────────────────────────┐
│                                                             │
│ ┌─ Drop Zone ───────────────────────────────────────────┐  │
│ │  📎 Drop files here or [Browse Files]                │  │
│ │                                                       │  │
│ │  Max 10 files, 50MB each                            │  │
│ │  Supported: PDF, DOC, JPG, PNG, DWG                 │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Upload Progress:                                            │
│ ┌─ spec_document.pdf (2.3 MB) ─────────────────[Complete]┐ │
│ │ ████████████████████████████████████████████ 100%    │ │
│ │ ✓ Uploaded and processed                              │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ site_photo.jpg (1.8 MB) ────────────────────[78%]─────┐ │
│ │ █████████████████████████████░░░░░░░░░░░ 78%          │ │
│ │ ⏳ Uploading...                                       │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```bash
## Responsive Design Details

### Desktop Layout (≥1024px)

- Full table with all columns visible
- Side-by-side form layout for create/edit
- Expandable detail panels
- Multi-column package view

### Tablet Layout (768px - 1023px)

- Condensed table with priority columns
- Stacked form layout
- Collapsible sidebar panels
- Single-column package cards

### Mobile Layout (≤767px)

- Card-based list view instead of table
- Single-step form progression
- Full-screen modals
- Touch-optimized controls

### Mobile Card Layout Example

```bash
┌─────────────────────────────────────────┐
│ CO-001                          PENDING │
│ Phase 1 & 2 Changes - Full Scope       │
│                                         │
│ ABC Construction          $5,062.35     │
│ Due: 05/27/25            Reviewer: J.D  │
│                                         │
│ [View] [Approve] [...]                  │
├─────────────────────────────────────────┤
│ CO-002                            DRAFT │
│ Electrical Upgrades Phase 2            │
│                                         │
│ XYZ Electrical           $2,350.00      │
│ Due: 06/01/25           Reviewer: None  │
│                                         │
│ [Edit] [Submit] [...]                   │
└─────────────────────────────────────────┘
```

## State Management Patterns

### Global State (Zustand)

```typescript
interface ChangeOrderStore {
  // List state
  changeOrders: ChangeOrder[];
  packages: ChangeOrderPackage[];
  filters: ChangeOrderFilters;
  pagination: PaginationState;

  // UI state
  selectedIds: number[];
  isLoading: boolean;

  // Actions
  fetchChangeOrders: (projectId: string, filters?: ChangeOrderFilters) => void;
  createChangeOrder: (data: CreateChangeOrderData) => void;
  updateChangeOrder: (id: number, data: UpdateChangeOrderData) => void;
  approveChangeOrder: (id: number, data: ApprovalData) => void;
  setFilters: (filters: Partial<ChangeOrderFilters>) => void;
  toggleSelection: (id: number) => void;
}
```tsx
### Form State (React Hook Form)
```typescript
// Multi-step form state management
const useChangeOrderForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const form = useForm<ChangeOrderFormData>();

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);
  const goToStep = (step: number) => setCurrentStep(step);

  return { form, currentStep, nextStep, prevStep, goToStep };
};
```

## Performance Considerations

### Virtual Scrolling

- Implement virtual scrolling for large change order lists
- Lazy load line items and attachments
- Progressive loading for package contents

### Optimistic Updates

- Immediate UI feedback for status changes
- Rollback on API failure
- Conflict resolution for concurrent edits

### Caching Strategy

- React Query for server state management
- Cache invalidation on mutations
- Background refetch for stale data

### Bundle Optimization

- Code splitting for report components
- Lazy loading for PDF generation
- Dynamic imports for file upload

## Accessibility Features

### Keyboard Navigation

- Tab order follows logical flow
- Arrow keys for table navigation
- Escape key to close modals
- Enter/Space for actions

### Screen Reader Support

- Proper heading hierarchy
- ARIA labels for all controls
- Table headers and descriptions
- Status announcements

### Visual Accessibility

- High contrast mode support
- Scalable fonts and controls
- Clear focus indicators
- Color + text for status

This comprehensive UI specification ensures a consistent, accessible, and performant user experience across all change order functionality while maintaining proper separation of concerns and reusable component patterns.

---

## uforms changeorders

---
title: FORMS ChangeOrders
description: FORMS ChangeOrders documentation
---

# Change Orders Forms Specification

## Form List

1. **ChangeOrderCreateForm** - Multi-step creation form for new change orders
2. **ChangeOrderEditForm** - Edit existing change orders (draft/approved states)
3. **PackageCreateForm** - Create new change order packages
4. **LineItemsEditor** - Manage line items within change orders
5. **ApprovalWorkflowForm** - Approve, reject, or delegate change orders
6. **BulkActionForm** - Batch operations on multiple change orders
7. **AttachmentUploadForm** - File upload and attachment management
8. **RelatedItemsForm** - Link change orders to other project items

## Form Specifications

### 1. ChangeOrderCreateForm

**Location**: `/[projectId]/change-orders/new`
**Component**: `frontend/src/components/domain/change-orders/ChangeOrderCreateForm.tsx`
**Purpose**: Multi-step form for creating new change orders with full validation

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| packageId | Select/Create | No | Existing package or new | Package grouping |
| newPackageTitle | Text | Conditional | Max 500 chars | If creating new package |
| contractType | Radio | Yes | prime/commitment | Contract classification |
| contractId | Select | Yes | Active contracts only | Related contract |
| number | Text | Yes | Unique per project | Auto-generated with override |
| title | Text | Yes | 1-500 chars | Change order title |
| description | TextArea | No | Max 2000 chars | Detailed description |
| changeReasonId | Select | No | Predefined reasons | Categorization |
| scope | Select | Yes | IN_SCOPE/OUT_OF_SCOPE | Budget impact flag |
| dateInitiated | Date | No | Past/present/future | Default: today |
| dueDate | Date | No | >= dateInitiated | Review deadline |
| designatedReviewerId | UserSelect | No | Project members only | Primary reviewer |
| private | Toggle | No | Boolean | Visibility restriction |
| lineItems | Array | Yes | Min 1 item | Financial breakdown |
| attachments | FileUpload | No | Multiple files | Supporting documents |

#### Form Layout

```bash
┌─────────────────────────────────────────────────────────────┐
│                    Create Change Order                      │
├─────────────────────────────────────────────────────────────┤
│ Step 1: Basic Information                         [1 of 4] │
│                                                             │
│ Package: [Existing Package ▼] [+ New Package]              │
│ Contract Type: ○ Prime Contract  ○ Commitment               │
│ Contract: [Select Contract ▼]                              │
│ Number: [CO-001] (auto-generated)                          │
│ Title: [________________________________]                   │
│                                                             │
│                              [Cancel] [Next Step →]        │
├─────────────────────────────────────────────────────────────┤
│ Step 2: Details & Scope                          [2 of 4] │
│                                                             │
│ Description:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │                                                         │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Change Reason: [Select Reason ▼]                           │
│ Scope: ○ In Scope  ○ Out of Scope                          │
│ Date Initiated: [MM/DD/YYYY]                               │
│ Due Date: [MM/DD/YYYY]                                     │
│ Designated Reviewer: [Select User ▼]                       │
│ Private: ☐ Restrict visibility                             │
│                                                             │
│                              [← Back] [Next Step →]        │
├─────────────────────────────────────────────────────────────┤
│ Step 3: Line Items                               [3 of 4] │
│                                                             │
│ ┌─ Line Items ──────────────────────────────────────────── │
│ │ Description     │Code   │Qty │UoM │Price    │Amount     │ │
│ │ Site Work       │01-100 │100 │SF  │$15.00   │$1,500.00  │ │
│ │ [Add Line Item +]                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Total Amount: $1,500.00                                     │
│                                                             │
│                              [← Back] [Next Step →]        │
├─────────────────────────────────────────────────────────────┤
│ Step 4: Attachments & Review                     [4 of 4] │
│                                                             │
│ Attachments:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📎 Drop files here or [Browse Files]                   │ │
│ │                                                         │ │
│ │ • spec_document.pdf (2.3 MB) [✓ Uploaded]              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Review Summary:                                             │
│ • Contract: ABC Construction                                │
│ • Total Amount: $1,500.00                                   │
│ • Line Items: 1                                            │
│ • Attachments: 1                                           │
│                                                             │
│              [← Back] [Save Draft] [Submit for Review]     │
└─────────────────────────────────────────────────────────────┘
```typescript
#### Conditional Logic

- **Package Selection**: If "New Package" selected, show packageTitle field
- **Contract Type**: Filters available contracts in contractId dropdown
- **Designated Reviewer**: Only shows users with project access
- **Line Items**: Minimum 1 required, auto-calculate extended amounts
- **Save vs Submit**: "Save Draft" keeps status='draft', "Submit" changes to 'submitted'

### 2. ChangeOrderEditForm

**Location**: `/[projectId]/change-orders/[id]/edit`
**Component**: `frontend/src/components/domain/change-orders/ChangeOrderEditForm.tsx`
**Purpose**: Edit existing change orders with status-dependent field restrictions

#### Editable Fields by Status

**Draft Status (Full Edit):**

- All fields except: number, contractId, contractType, createdAt
- Can add/remove line items
- Can add/remove attachments

**Submitted Status (Limited Edit):**

- title, description, dueDate only
- Cannot modify line items
- Can add attachments, cannot remove existing ones

**Approved Status (Minimal Edit):**

- description, designatedReviewerId only
- No line item changes
- View-only for financial fields

#### Form Layout

```bash
┌─────────────────────────────────────────────────────────────┐
│                     Edit Change Order                      │
│                         CO-001                             │
├─────────────────────────────────────────────────────────────┤
│ Status: [APPROVED] Package: PCO #001                        │
│                                                             │
│ Title: [Phase 1 & 2 Changes - Full Scope]                 │
│ Description: [Multiple line textarea]                       │
│                                                             │
│ ⚠️ This change order is APPROVED. Only limited fields      │
│    can be modified.                                         │
│                                                             │
│ Contract: ABC Construction (Read-only)                      │
│ Total Amount: $5,062.35 (Read-only)                        │
│ Due Date: [05/27/2025]                                     │
│ Reviewer: [Dawson, Jesse ▼]                                │
│                                                             │
│ Line Items (Read-only):                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Carpet Installation - Premium │ 500SF │ $15.00│$7,500.00│ │
│ │ Plumbing Materials           │  1LS  │$5047.35│$5,047.35│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [Cancel] [Save Changes]       │
└─────────────────────────────────────────────────────────────┘
```

### 3. PackageCreateForm

**Location**: Modal dialog from create form or package management
**Component**: `frontend/src/components/domain/change-orders/PackageCreateForm.tsx`
**Purpose**: Create new change order packages for organization

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| packageNumber | Text | Yes | Unique per project | Auto-generated (PCO-001) |
| title | Text | Yes | 1-500 chars | Package title |
| description | TextArea | No | Max 2000 chars | Package description |
| contractType | Radio | Yes | prime/commitment | Package classification |

#### Form Layout

```text
┌─────────────────────────────────────────────────────────────┐
│                   Create Change Order Package              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Package Number: [PCO-002] (auto-generated)                 │
│ Title: [_________________________________]                  │
│                                                             │
│ Description:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Type: ○ Prime Contract  ○ Commitment                       │
│                                                             │
│                              [Cancel] [Create Package]     │
└─────────────────────────────────────────────────────────────┘
```bash
### 4. LineItemsEditor

**Component**: `frontend/src/components/domain/change-orders/LineItemsEditor.tsx`
**Purpose**: Embedded editor for managing line items within change orders

#### Line Item Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| description | Text | Yes | 1-500 chars | Item description |
| costCodeId | Select | No | Active cost codes | Budget code link |
| quantity | Number | No | >= 0, 4 decimals | Item quantity |
| unitOfMeasure | Select | No | Standard units | Unit type |
| unitPrice | Currency | Yes | >= 0, 2 decimals | Price per unit |
| extendedAmount | Currency | Calculated | quantity × unitPrice | Total line amount |
| notes | TextArea | No | Max 1000 chars | Additional notes |

#### Component Layout

```bash
┌─ Line Items Editor ─────────────────────────────────────────┐
│                                                             │
│ ┌─ Line Item 1 ──────────────────────────────────[Remove]┐ │
│ │ Description: [Site Work Preparation______________]      │ │
│ │ Cost Code: [01-100 - Site Work ▼]                      │ │
│ │ Quantity: [100] UoM: [SF ▼] Price: [$15.00]           │ │
│ │ Amount: $1,500.00 (calculated)                         │ │
│ │ Notes: [_________________________________]              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ Line Item 2 ──────────────────────────────────[Remove]┐ │
│ │ Description: [Material Upgrade___________________]      │ │
│ │ Cost Code: [02-200 - Materials ▼]                      │ │
│ │ Quantity: [1] UoM: [LS ▼] Price: [$3,562.35]          │ │
│ │ Amount: $3,562.35 (calculated)                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [+ Add Line Item]                                           │
│                                                             │
│ Total: $5,062.35                                            │
└─────────────────────────────────────────────────────────────┘
```

### 5. ApprovalWorkflowForm

**Location**: Modal dialog from change order detail view
**Component**: `frontend/src/components/domain/change-orders/ApprovalWorkflowForm.tsx`
**Purpose**: Approve, reject, or delegate change orders with comments

#### Approval Action Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| action | Radio | Yes | approve/reject/delegate | Review action |
| approvalNotes | TextArea | No | Max 2000 chars | Reviewer comments |
| scheduleImpact | Radio | No | yes/no/unknown | Schedule assessment |
| delegateToUserId | Select | Conditional | Project members | If delegating |
| delegationReason | TextArea | Conditional | Max 500 chars | Delegation reason |

#### Rejection Sub-form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| rejectionReason | Select | Yes | Predefined categories | Rejection category |
| rejectionComments | TextArea | Yes | Max 2000 chars | Detailed explanation |
| allowResubmission | Toggle | Yes | Boolean | Creator can resubmit |

#### Form Layout

```bash
┌─────────────────────────────────────────────────────────────┐
│                    Review Change Order                     │
│                         CO-001                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Change Order Summary:                                       │
│ • Title: Phase 1 & 2 Changes - Full Scope                 │
│ • Amount: $5,062.35                                         │
│ • Line Items: 2                                            │
│ • Due Date: 05/27/2025                                     │
│                                                             │
│ Review Action:                                              │
│ ○ Approve    ○ Reject    ○ Request Changes    ○ Delegate   │
│                                                             │
│ [If Approve selected]                                       │
│ Schedule Impact: ○ Yes  ○ No  ○ Unknown                    │
│                                                             │
│ Comments:                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Approved as submitted. Scope and pricing look good.    │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ☐ Require signature (DocuSign)                            │
│                                                             │
│                              [Cancel] [Submit Review]      │
└─────────────────────────────────────────────────────────────┘
```bash
### 6. BulkActionForm

**Location**: Modal dialog from change orders list
**Component**: `frontend/src/components/domain/change-orders/BulkActionForm.tsx`
**Purpose**: Batch operations on multiple selected change orders

#### Bulk Action Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| selectedIds | Array | Yes | Min 1 item | Change order IDs |
| action | Radio | Yes | approve/reject/submit | Bulk action |
| uniformNotes | TextArea | No | Max 2000 chars | Same notes for all |
| maintainDueDates | Toggle | Yes | Boolean | Keep existing dates |
| sendNotifications | Toggle | Yes | Boolean | Email notifications |
| effectiveDate | Date | Yes | Today or future | Action effective date |

#### Form Layout

```bash
┌─────────────────────────────────────────────────────────────┐
│                     Bulk Action                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Selected Change Orders: 3 items                            │
│ • CO-001: Phase 1 & 2 Changes ($5,062.35)                 │
│ • CO-002: Electrical Upgrades ($12,500.00)                │
│ • CO-003: Plumbing Revisions ($2,750.00)                  │
│                                                             │
│ Action: ○ Approve All  ○ Reject All  ○ Submit All         │
│                                                             │
│ Notes (applied to all):                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Batch approval for Phase 1 scope items.                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ☐ Maintain existing due dates                              │
│ ☑ Send email notifications                                 │
│ Effective Date: [05/15/2025]                               │
│                                                             │
│                              [Cancel] [Apply to All]       │
└─────────────────────────────────────────────────────────────┘
```

### 7. AttachmentUploadForm

**Component**: `frontend/src/components/domain/change-orders/AttachmentUploadForm.tsx`
**Purpose**: File upload with drag-and-drop and metadata management

#### Upload Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| files | FileList | Yes | Max 10 files, 50MB each | File selection |
| attachmentType | Select | No | Predefined categories | File classification |
| description | Text | No | Max 255 chars | File description |

#### Supported File Types

- Documents: PDF, DOC, DOCX, TXT
- Images: JPG, PNG, TIFF, GIF
- Drawings: DWG, PDF
- Spreadsheets: XLS, XLSX, CSV

#### Component Layout

```text
┌─ File Attachments ──────────────────────────────────────────┐
│                                                             │
│ ┌─ Drop Zone ───────────────────────────────────────────┐  │
│ │  📎 Drop files here or [Browse Files]                │  │
│ │                                                       │  │
│ │  Max 10 files, 50MB each                            │  │
│ │  Supported: PDF, DOC, JPG, PNG, DWG                 │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Uploaded Files:                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📄 spec_document.pdf (2.3 MB)             [Remove]     │ │
│ │    Type: [Specification ▼]                              │ │
│ │    Description: [Updated specifications_______________]  │ │
│ │    Status: ✓ Uploaded                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📷 site_photo.jpg (1.8 MB)               [Remove]      │ │
│ │    Type: [Photo ▼]                                     │ │
│ │    Status: ⏳ Uploading... (78%)                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [Clear All] [Done]            │
└─────────────────────────────────────────────────────────────┘
```markdown
### 8. RelatedItemsForm

**Location**: Modal dialog from change order detail view
**Component**: `frontend/src/components/domain/change-orders/RelatedItemsForm.tsx`
**Purpose**: Link change orders to other project items (RFIs, submittals, etc.)

#### Related Item Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| relatedItemType | Select | Yes | RFI/Submittal/Inspection/Document | Item type |
| relatedItemId | Autocomplete | Yes | Active items only | Item search |
| relationshipType | Select | Yes | Supports/Contradicts/Clarifies | Relationship nature |
| notes | TextArea | No | Max 1000 chars | Relationship context |

#### Form Layout

```text
┌─────────────────────────────────────────────────────────────┐
│                    Add Related Item                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Item Type: [RFI ▼]                                         │
│                                                             │
│ Search Item:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Search RFIs...___________________________]           │ │
│ │                                                         │ │
│ │ ▼ RFI-045: Carpet Specifications                       │ │
│ │   RFI-046: Electrical Panel Location                   │ │
│ │   RFI-047: Plumbing Fixture Selection                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Relationship: [Supports ▼]                                 │
│                                                             │
│ Notes:                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ This RFI clarified the carpet specifications that      │ │
│ │ led to the material upgrade in this change order.      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [Cancel] [Add Relationship]   │
└─────────────────────────────────────────────────────────────┘
```

## Form Validation Rules

### Global Validation Rules

- **Required Fields**: Clear visual indicators (*) and error messages
- **Character Limits**: Real-time counters for text fields
- **Number Validation**: Positive numbers only for quantities and prices
- **Date Validation**: Future dates for due dates, logical date ranges
- **File Upload**: Size limits, type restrictions, virus scanning

### Field-Specific Validation

```typescript
// Example validation schema
const changeOrderSchema = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 500,
    pattern: /^[a-zA-Z0-9\s\-_.,()&]+$/ // Alphanumeric + common symbols
  },
  amount: {
    type: 'currency',
    min: 0,
    max: 999999999.99,
    precision: 2
  },
  dueDate: {
    type: 'date',
    min: () => new Date(), // Today or later
    format: 'MM/DD/YYYY'
  },
  lineItems: {
    type: 'array',
    minLength: 1,
    itemSchema: {
      description: { required: true, maxLength: 500 },
      unitPrice: { required: true, type: 'currency', min: 0 }
    }
  }
}
```

### Error Handling Patterns

- **Inline Validation**: Real-time feedback as user types
- **Form-Level Validation**: On submit attempt with scroll to first error
- **API Error Handling**: Clear messages for server-side validation failures
- **Optimistic Updates**: Immediate UI feedback with rollback on error

## Accessibility Features

### Keyboard Navigation

- Tab order follows logical form flow
- Arrow keys for radio button groups
- Enter/Space for button activation
- Escape key to close modals

### Screen Reader Support

- Proper ARIA labels for all form controls
- Field descriptions and error announcements
- Progress indicators for multi-step forms
- Status updates for dynamic content

### Visual Accessibility

- High contrast mode support
- Scalable fonts and UI elements
- Clear focus indicators
- Error states with color + text indicators

This comprehensive forms specification ensures consistent user experience across all change order interactions while maintaining proper validation and accessibility standards.

---

## utasks changeorders

---
title: TASKS ChangeOrders
description: TASKS ChangeOrders documentation
---

# Change Orders Implementation - Complete Task Checklist

**Current Status: 15% Complete**

## Phase 1: Database Foundation

- [x] Analyze Procore change orders structure (from crawl data)
- [x] Design change order schema with package support
- [ ] Create database migration for change_orders table
- [ ] Create database migration for change_order_packages table
- [ ] Create database migration for change_order_lines table
- [ ] Create database migration for change_order_reviews table
- [ ] Create database migration for change_order_attachments table
- [ ] Set up proper indexes and foreign key constraints
- [ ] Create RLS policies for change orders
- [ ] Test all database operations

## Phase 2: Backend Services

- [ ] Create change order CRUD API endpoints
- [ ] Create change order package API endpoints
- [ ] Create line items management API endpoints
- [ ] Implement filtering and pagination
- [ ] Create approval workflow API endpoints
- [ ] Add file attachment handling
- [ ] Implement CSV export functionality
- [ ] Create PDF generation service
- [ ] Add email notification system
- [ ] Write comprehensive API tests

## Phase 3: Form Implementation

- [ ] Build change order creation form
- [ ] Implement package selection/creation
- [ ] Create line items table editor
- [ ] Add file upload component
- [ ] Implement user picker for reviewers
- [ ] Add contract selection (prime vs commitment)
- [ ] Create change reason dropdown
- [ ] Add form validation
- [ ] Implement save as draft functionality
- [ ] Connect form to API endpoints

## Phase 4: List View Enhancement

- [x] Create basic list view (currently implemented)
- [ ] Add missing table columns (Date Initiated, Revision, Reviewer, Review Date)
- [ ] Implement Prime vs Commitments tabs
- [ ] Add proper filtering capabilities
- [ ] Implement CSV export functionality
- [ ] Create Reports dropdown menu
- [ ] Add package grouping view
- [ ] Improve status badges and indicators
- [ ] Add bulk action capabilities
- [ ] Optimize loading and pagination

## Phase 5: Review Workflow

- [ ] Create change order detail view
- [ ] Implement approval modal/interface
- [ ] Add rejection workflow with reasons
- [ ] Create multi-tier approval support
- [ ] Implement designated reviewer assignment
- [ ] Add review comments system
- [ ] Create notification system
- [ ] Implement approval delegation
- [ ] Add review history tracking
- [ ] Create escalation logic

## Phase 6: Package Management

- [ ] Implement package creation
- [ ] Create package detail view
- [ ] Add package-level PDF generation
- [ ] Implement package summary calculations
- [ ] Create package grouping in list view
- [ ] Add package status tracking
- [ ] Implement package-level exports
- [ ] Create package analytics
- [ ] Add package search and filtering
- [ ] Implement package archival

## Phase 7: Advanced Features

- [ ] Create DocuSign integration (future)
- [ ] Implement revision tracking
- [ ] Add budget impact calculation
- [ ] Create related items linking
- [ ] Implement change order templates
- [ ] Add claimable variations support
- [ ] Create signature tracking
- [ ] Implement advanced reporting
- [ ] Add financial impact analysis
- [ ] Create dashboard widgets

## Phase 8: Reports & Analytics

- [ ] Create Unexecuted Change Orders report
- [ ] Create Overdue Change Orders report
- [ ] Implement Change Orders by Reason analytics
- [ ] Add budget variance reports
- [ ] Create approval workflow metrics
- [ ] Implement time-to-approval tracking
- [ ] Add vendor/contractor performance reports
- [ ] Create executive dashboard integration
- [ ] Implement custom report builder
- [ ] Add report scheduling

## Phase 9: Testing & Polish

- [ ] Write unit tests for all components
- [ ] Create integration tests
- [ ] Implement E2E test scenarios
- [ ] Add performance testing
- [ ] Create accessibility testing
- [ ] Implement mobile responsiveness
- [ ] Add error boundary components
- [ ] Create comprehensive documentation
- [ ] Perform security audit
- [ ] Conduct user acceptance testing

## Success Criteria Checklist

- [ ] Users can create change orders with line items
- [ ] Multi-tier approval workflow functions correctly
- [ ] Package-based organization works as expected
- [ ] PDF generation produces proper formatted documents
- [ ] CSV export includes all required columns
- [ ] Email notifications are sent at appropriate times
- [ ] Budget impact is calculated and displayed correctly
- [ ] Reports provide actionable insights
- [ ] Mobile interface is fully functional
- [ ] Performance meets requirements (<2s load time)
- [ ] Security audit passes with no critical issues
- [ ] All E2E tests pass consistently

## Current Status: 15% Complete

**Completed:** System analysis, documentation, basic list view
**In Progress:** Database schema design
**Next Priority:** Database migrations and API foundation

