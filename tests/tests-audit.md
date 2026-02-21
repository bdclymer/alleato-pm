# E2E test coverage checklist

Organized by priority tier.

E2E Test Coverage Checklist
TIER 1 — High Value, Zero UI E2E Coverage

## 1. Direct Costs

- Asset Details
- Pages direct-costs/page.tsx, direct-costs/new/page.tsx, direct-costs/[costId]/page.tsx
- Schema lib/schemas/direct-costs.ts (381 lines — largest schema)
- Hooks use-direct-costs (implied via financial hooks)
- Existing Tests tests/financial/direct-costs.spec.ts (1 file, likely API-level)
- Missing E2E Create cost with line items, edit cost, status workflow (draft→pending→approved), bulk operations, attachment upload, delete/void

## 2. RFIs

- Asset Details
- Pages rfis/page.tsx, rfis/new/page.tsx, rfis/[rfiId]/page.tsx
- Schema lib/schemas/rfi-schema.ts
- Hooks use-rfis
- Existing Tests None
- Missing E2E Create RFI, edit RFI, status workflow (draft→open→pending→closed→void), assign responsible party, add responses, attachments

## 3. Prime Contracts

- Asset Details
- Pages prime-contracts/page.tsx, prime-contracts/new/page.tsx, prime-contracts/[contractId]/page.tsx, prime-contracts/[contractId]/edit/page.tsx
- Schema lib/schemas/prime-contract-change-order-schema.ts
- Hooks use-contracts, use-contract-change-orders
- Existing Tests 8 specs — ALL schema/API only (api-crud, database-schema, billing-payments-schema, line-items-schema, supporting-tables-schema, change-orders-schema, debug-auth, api-line-items)
- Missing E2E Create contract via form, edit contract, add line items, SOV management, change orders on prime contracts, billing/payments workflow
- TIER 2 — Medium Complexity, Zero UI E2E Coverage

1. Drawings

- Asset Details
- Pages drawings/page.tsx, drawings/areas/page.tsx, drawings/board/page.tsx, drawings/revisions/page.tsx, drawings/viewer/[drawingId]/page.tsx
- Schema lib/schemas/drawing-schemas.ts
- Services DrawingService.ts, DrawingAreaService.ts, DrawingSetService.ts
- Hooks use-drawings, use-drawing-areas, use-drawing-revisions, use-drawing-sets, use-drawing-upload
- Existing Tests None
- Missing E2E Create drawing area, create drawing set, upload drawing revision, navigate board view, open viewer, manage revisions list

1. Specifications

- Asset Details
- Pages specifications/page.tsx, specifications/[sectionId]/page.tsx
- Schema lib/schemas/specification-schemas.ts
- Services SpecificationService.ts, SpecificationAreaService.ts, SpecificationRevisionService.ts
- Hooks use-specifications, use-specification-areas, use-specification-revisions
- Existing Tests None
- Missing E2E Create specification section, add revisions, navigate to section detail, edit, delete
- TIER 3 — Standard CRUD, Zero UI E2E Coverage

1. Schedule

- Asset Details
- Pages schedule/page.tsx
- Hooks use-schedule-tasks
- Existing Tests None
- Missing E2E Create task, edit task, set dependencies, date changes, status updates

1. Punch List

- Asset Details
- Pages punch-list/page.tsx
- Components punch-item-form-dialog.tsx, punch-item-status-badge.tsx
- Services PunchItemService.ts
- Hooks use-punch-items
- Existing Tests None
- Missing E2E Create punch item via dialog, edit, status transitions (open→ready→closed), assign responsible party, delete

1. Invoices / Invoicing

- Asset Details
- Pages invoices/page.tsx, invoices/new/page.tsx, invoicing/page.tsx, invoicing/[invoiceId]/page.tsx
- Schema Part of lib/schemas/financial-schemas.ts
- Existing Tests None
- Missing E2E Create invoice, add line items, submit for approval, view invoice detail, payment tracking

1. Meetings

Asset Details
Pages meetings/page.tsx, meetings/[meetingId]/page.tsx
Hooks use-meetings
Existing Tests None
Missing E2E Create meeting, add agenda items, record minutes, assign action items, view detail
TIER 4 — Lower Priority / Minimal Forms
Feature Pages Existing Tests Missing E2E
Daily Log 1 page None Create log entry, add items by category
Documents 1 page None Upload document, organize folders
Photos 1 page None Upload photo, add metadata
Submittals 1 page None Create submittal, workflow
Transmittals 1 page None Create transmittal, add attachments
SOV 1 page None Line item management
Tasks 1 page None Create/assign tasks
Project Setup 1 page None Configure project settings
Client Dashboard 1 page None View-only verification
Reporting 1 page None Generate reports, export
EXISTING COVERAGE — Quality Review Recommended
These features have E2E specs but many contain legacy/debug files that should be audited for actual CRUD coverage:

## Feature Spec Count Concern

Budget 23 specs Many are debug/fix-verification files (e.g., budget-code-modal-debug, verify-searchparams-fix). Need to confirm real CRUD coverage exists.
Commitments 18 specs Mix of real tests and debug files (creation-debug, creation-flow). Consolidation needed.
Change Events 7 specs Appears comprehensive. Quick quality review.
Change Orders 7 specs Appears comprehensive (crud, contract-picker, reviewer-picker, reviewer-response). Quick quality review.
Contracts 4 specs Has form and smoke tests. May need deeper CRUD validation.
Directory 5 specs Has workflow and functionality tests. Verify full CRUD per entity type (users, companies, contacts).
Auth 3 specs Auth flow, redirect, logout. Likely adequate.
Chat 8 specs AI chat, RAG, team chat. Likely adequate for current scope.

## Summary Counts

Category Feature Count Estimated Test Specs Needed
Tier 1 (No UI E2E) 3 features ~9-12 specs
Tier 2 (No UI E2E) 2 features ~6-8 specs
Tier 3 (No UI E2E) 4 features ~8-12 specs
Tier 4 (No UI E2E) 10 features ~10-15 specs
Quality Review 8 features Audit + consolidate existing
Total 27 features ~33-47 new specs + audit of ~90 existing
