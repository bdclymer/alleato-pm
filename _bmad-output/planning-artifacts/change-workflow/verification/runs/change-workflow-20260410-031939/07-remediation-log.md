# Remediation Log — Change Workflow

**Run ID**: change-workflow-20260410-031939
**Date**: 2026-04-10

---

## Completed Remediations

### TASK-001: Wire "Add To" Dropdown on Change Events List (GAP-001 — CRITICAL)
- **Status**: RESOLVED
- **Files Modified**:
  - `frontend/src/app/(main)/[projectId]/change-events/page.tsx` — Wired `ChangeEventSelectionBar` into UnifiedTablePage `topContent` prop
  - `frontend/src/components/domain/change-events/ChangeEventSelectionBar.tsx` — Added `AddToCommitmentCODialog` integration, removed toast placeholder
  - `frontend/src/components/domain/change-events/AddToCommitmentCODialog.tsx` — **CREATED** — New dialog for creating Commitment COs from selected change events
- **Notes**: The selection bar component already existed but was never rendered. Connected via `topContent` prop. The Prime Contract PCO dialog already worked; Commitment CO dialog was newly created.

### TASK-004: Expand Prime CO Create Form (GAP-007 — HIGH)
- **Status**: RESOLVED (background agent)
- **Files Modified**:
  - `frontend/src/app/(main)/[projectId]/change-orders/prime/new/page.tsx` — Added ~12 missing fields: description, change_reason, designated_reviewer, request_received_from, due_date, invoiced_date, schedule_impact, revised_substantial_completion_date, location, reference, executed, field_change, is_private, paid_in_full

### TASK-005: Expand Commitment CO Create Form (GAP-008 — HIGH)
- **Status**: RESOLVED (background agent)
- **Files Modified**:
  - `frontend/src/app/(main)/[projectId]/change-orders/commitment/new/page.tsx` — Added missing fields: invoiced_date, designated_reviewer, schedule_impact, location, reference, is_private, executed, field_change, paid_in_full

### TASK-006: Add Missing PCO DB Columns + Form Fields (GAP-006 — HIGH)
- **Status**: RESOLVED (background agent)
- **Files Modified**:
  - `frontend/src/app/(main)/[projectId]/pcos/new/page.tsx` — PCO form expanded with change_reason, location, reference, requestReceivedFrom, dueDate, isPrivate, fieldChange, paidInFull
  - PCO workspace component updated to support new fields

### TASK-007: Clone Action on Change Event Detail (GAP-009 — HIGH)
- **Status**: RESOLVED
- **Files Modified**:
  - `frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx` — Added Clone dropdown item that POSTs a copy and navigates to the new CE

### TASK-008: CSV Export on Change Orders List (GAP-010 — MEDIUM)
- **Status**: RESOLVED
- **Files Modified**:
  - `frontend/src/app/(main)/[projectId]/change-orders/change-orders-client.tsx` — Added export functions for both Prime and Commitment tabs, enabled onExport in toolbar configs

### TASK-002/003: SOV Line Items on CO Detail Pages (GAP-002 — CRITICAL)
- **Status**: IN PROGRESS (background agents)
- **Scope**:
  - Prime CO: API routes for pcco_line_items CRUD + inline add/edit/delete UI
  - Commitment CO: API routes for commitment_change_order_lines CRUD + inline add/edit/delete UI

---

## Additional Fixes (discovered during remediation)

### FIX: Duplicate toast import in change-orders-client.tsx
- **File**: `frontend/src/app/(main)/[projectId]/change-orders/change-orders-client.tsx`
- **Issue**: TASK-008 agent introduced a duplicate `import { toast } from "sonner"` line
- **Fix**: Removed duplicate import

### FIX: Missing `type` field on PCO filter configs
- **File**: `frontend/src/app/(main)/[projectId]/pcos/page.tsx`
- **Issue**: `pcoFilters` array items missing required `type: "select"` per `FilterConfig` interface
- **Fix**: Added `type: "select" as const` to both filter objects

---

## Gaps NOT Addressed in This Run

### GAP-003: Link to Existing Items (HIGH)
- Not addressed — requires additional API endpoints for searching existing PCOs/COs

### GAP-004: PCO → CO Conversion UI (HIGH)
- Partial — API route exists, UI action needs verification

### GAP-005: Change Orders Create Button Navigation (HIGH)
- Not addressed — needs page-actions audit

### GAP-011 through GAP-019: Medium/Low severity items
- Deferred — not blocking core workflow
