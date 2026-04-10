# Gap Analysis Report: Change Workflow

## Summary

The change workflow implementation has strong foundations across all three entities (Change Events, PCOs, Change Orders). The core CRUD, list pages, and detail pages exist. The primary gaps are in **workflow connectivity** (the "Add To" cascade that links entities), **missing form fields** on PCOs, and **SOV/line items** on Change Orders.

---

## CRITICAL Gaps (Block core workflow)

### GAP-001: No "Add To" Menu on Change Events List Page
- **Severity**: CRITICAL
- **Layer**: UI
- **Component**: `change-events/page.tsx`
- **Procore**: After selecting CE row(s), toolbar shows "Add to" with cascading options: Commitment, Commitment CO, Prime Contract PCO. This is THE primary workflow for creating downstream items from change events.
- **Our Behavior**: Selection bar exists but has no "Add To" action. Only bulk delete is available.
- **Impact**: Users cannot create PCOs or COs directly from change events — the entire lifecycle is broken.
- **Fix**: Add "Add To" dropdown to `ChangeEventSelectionBar` with cascading options.

### GAP-002: No SOV/Line Items Tab on Change Orders (Both Types)
- **Severity**: CRITICAL
- **Layer**: UI + API
- **Component**: `change-orders/prime/[primeCoId]/page.tsx`, `change-orders/commitment/[commitmentCoId]/page.tsx`
- **Procore**: Change orders have a "Schedule of Values" (SOV) tab showing line items with Budget Code, Description, Amount, etc. This is where the financial impact is detailed.
- **Our Behavior**: No SOV tab or line items on either CO detail page. Missing both API routes and UI.
- **Impact**: COs without line items have no financial breakdown — cannot track cost impact per cost code.

---

## HIGH Gaps (Missing key features)

### GAP-003: Change Events "Add To" — Link to Existing Items
- **Severity**: HIGH
- **Layer**: UI + API
- **Component**: Change events selection bar
- **Procore**: "Add To" also allows linking to EXISTING PCOs, COs, and commitments (not just creating new ones).
- **Our Behavior**: Only "add-to-pco" API exists. No UI for linking to existing items from the list page.

### GAP-004: PCO → CO Conversion Missing in UI
- **Severity**: HIGH
- **Layer**: UI
- **Component**: `pcos/[pcoId]/page.tsx`
- **Procore**: PCO detail page has "Convert to Change Order" action that creates a Prime Contract CO from the PCO.
- **Our Behavior**: API exists (`/pcos/{id}/convert-to-co`) but need to verify UI action button exists and works.

### GAP-005: Change Orders Page — No Create Button Navigation
- **Severity**: HIGH
- **Layer**: UI
- **Component**: `change-orders/page-actions.tsx`
- **Procore**: "Create" button on CO list creates appropriate type based on active tab.
- **Our Behavior**: Need to verify page-actions component routes correctly to prime/new or commitment/new based on active tab.

### GAP-006: Missing PCO Fields in Database + Form
- **Severity**: HIGH
- **Layer**: DB + UI
- **Component**: `potential_change_orders` table, `pcos/new/page.tsx`
- **Procore**: PCOs have change_reason, location, reference, request_received_from, due_date, private, field_change, paid_in_full
- **Our Behavior**: `potential_change_orders` table missing these columns. Form only has: number, title, type, status, description, estimated_value, schedule_impact_days, markup_percentage, rfq_required, root_cause.
- **Fix**: Add missing columns via migration, update form.

### GAP-007: Prime CO Create Form — Missing Fields
- **Severity**: HIGH
- **Layer**: UI
- **Component**: `change-orders/prime/new/page.tsx`
- **Procore**: Form has many fields: PCCO Number, Title, Status, Change Reason, Due Date, Invoiced Date, Designated Reviewer, Schedule Impact, Revised Substantial Completion Date, Description, Location, Reference, Private, Executed, Paid in Full, Field Change, Request Received From, Attachments
- **Our Behavior**: Form only has pcco_number, title, status, total_amount (4 fields). Missing ~15 fields.

### GAP-008: Commitment CO Create Form — Incomplete
- **Severity**: HIGH
- **Layer**: UI
- **Component**: `change-orders/commitment/new/page.tsx`
- **Procore**: Full set of fields including Designated Reviewer, Request Received From, Schedule Impact, Location, Reference, Private, Executed, Field Change, Paid in Full
- **Our Behavior**: Form has basic fields but need to verify completeness — has contract_id, title, change_order_number, description, status, change_reason, due_date, amount. Missing: designated_reviewer, request_received_from, schedule_impact, location, reference, private, executed, field_change, paid_in_full.

### GAP-009: Change Event Detail — Missing Clone Action
- **Severity**: HIGH
- **Layer**: UI
- **Component**: `change-events/[changeEventId]/page.tsx`
- **Procore**: Detail page has Clone action in the vertical ellipsis dropdown.
- **Our Behavior**: Has Edit, Export PDF, Email but no Clone.

---

## MEDIUM Gaps (Missing fields/options)

### GAP-010: Change Events List — Missing Predefined Views
- **Severity**: MEDIUM
- **Layer**: UI
- **Component**: `change-events/page.tsx`
- **Procore**: Has 6 predefined views: Classic Detail, Classic Summary, Complete View, Owners View, Scope View, Temporary View.
- **Our Behavior**: No predefined view system.

### GAP-011: Change Events — Missing Grouping Capability
- **Severity**: MEDIUM
- **Layer**: UI
- **Procore**: Line items view supports grouping by any column with drag-and-drop.
- **Our Behavior**: No grouping functionality in UnifiedTablePage.

### GAP-012: Prime CO Detail — Missing Approve/Reject UI Flow
- **Severity**: MEDIUM
- **Layer**: UI
- **Component**: `change-orders/prime/[primeCoId]/page.tsx`
- **Procore**: Designated reviewer can approve/reject when status is "Pending - In Review". Changes status and records reviewer.
- **Our Behavior**: API routes exist for approve/reject. Need to verify UI buttons exist on detail page.

### GAP-013: Change Events — Missing Production Quantities Section
- **Severity**: MEDIUM
- **Layer**: UI + DB
- **Procore**: Change events have a Production Quantities section with Sub Job, Cost Code, Description, Qty, UOM.
- **Our Behavior**: Not implemented.

### GAP-014: Change Orders List — Missing Export
- **Severity**: MEDIUM
- **Layer**: UI
- **Component**: `change-orders-client.tsx`
- **Procore**: Export functionality for change orders list.
- **Our Behavior**: `features.enableExport: false` explicitly disabled in both tabs.

### GAP-015: PCO — Missing Attachment Support
- **Severity**: MEDIUM
- **Layer**: UI + API
- **Component**: PCO pages
- **Procore**: PCOs have attachment upload/download.
- **Our Behavior**: No attachment API routes or UI for PCOs.

### GAP-016: Change Event Line Items — Missing Inline Add From Commitments/CSV
- **Severity**: MEDIUM
- **Layer**: UI
- **Procore**: Line items can be added via bulk add from approved commitments or CSV import.
- **Our Behavior**: Only individual line item add.

---

## LOW Gaps (Cosmetic/nice-to-have)

### GAP-017: Column Pinning and Auto-sizing
- **Severity**: LOW
- **Layer**: UI
- **Procore**: Columns can be pinned left/right and auto-sized.
- **Our Behavior**: Not in UnifiedTablePage.

### GAP-018: Row Height Options
- **Severity**: LOW
- **Layer**: UI
- **Procore**: Small/Medium/Large row height.
- **Our Behavior**: Fixed "compact" density.

### GAP-019: 28+ Filter Fields on Change Events
- **Severity**: LOW
- **Layer**: UI
- **Procore**: 28+ filterable fields with numeric operators (Between, Greater Than, etc.)
- **Our Behavior**: Basic status/scope/search filters.
