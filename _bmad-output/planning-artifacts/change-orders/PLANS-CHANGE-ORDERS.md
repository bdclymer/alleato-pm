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
```

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

### Phase 3: Form Implementation

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

### Phase 4: List View Enhancement

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

### Phase 5: Review Workflow

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

### Phase 6: Package Management

**Priority:** Medium - Advanced organization
**Complexity:** Medium
**Dependencies:** Phase 2, 5 (APIs and Review)

**Deliverables:**

- Package creation and management
- Package-level calculations
- Package detail views
- Package grouping in lists

### Phase 7: PDF Generation

**Priority:** Medium - Document export
**Complexity:** High
**Dependencies:** Phase 5 (Detail views)

**Deliverables:**

- PDF template system
- Individual change order PDFs
- Package-level PDF exports
- Custom branding support

### Phase 8: Reports & Analytics

**Priority:** Low - Business intelligence
**Complexity:** Medium
**Dependencies:** All previous phases

**Deliverables:**

- Unexecuted change orders report
- Overdue change orders report
- Change orders by reason analytics
- Budget impact reports

### Phase 9: Testing & Polish

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
```

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
```

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
