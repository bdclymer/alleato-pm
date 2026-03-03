# Investigation Report — Change Events

**Score:** 7/10
**Date:** 2025-03-03
**Status:** Core CRUD Complete, Pattern & Validation Gaps

---

## Procore Reference

**Expected Features (Construction Change Events):**
- Change event creation and tracking
- Status workflow (proposed → approved → rejected)
- Cost impact tracking
- Document attachment
- Notification system
- Change log/history

**Procore Actions:**
- Create change event
- Edit/update event
- Approve/reject with comments
- Track change history
- Generate reports

---

## What Exists in Codebase

**Files Found:**
- Pages: 4 (main + [id] + [id]/edit + new)
- API Routes: 12 endpoints
- Hook: 1 (`use-change-events.ts`)
- Components: 10 (forms, modals, detail views)

**CRUD Status:**
| Operation | API | Service | Hook | UI | Status |
|-----------|-----|---------|------|----|--------|
| List | ✅ | ✅ | ✅ | ✅ | OK |
| Create | ✅ | ✅ | ✅ | ✅ | OK |
| Read | ✅ | ✅ | ✅ | ✅ | OK |
| Update | ✅ | ✅ | ✅ | ✅ | OK |
| Delete | ✅ | ✅ | ✅ | ✅ | OK |

---

## Gap Analysis

### Critical Issues
*None blocking core functionality.*

### High Issues

1. **Header Pattern Violation** — Not using ProjectPageHeader
   - Impact: Design system inconsistency

2. **Workflow State Validation** — Unclear if state transitions are validated
   - Example: Can user move event from "Rejected" back to "Proposed"?
   - Impact: Workflow integrity issues

3. **Cost Impact Tracking** — Change events should calculate cost impacts
   - Need to verify: Cost calculations are correct and match Procore
   - Impact: Financial reporting accuracy

### Medium Issues

1. **Form Validation** — Create/edit forms may lack:
   - Required field validation (title, description, cost impact)
   - Number validation (negative costs)
   - Date validation (event date vs. approval date logic)

2. **Missing Approval Workflow** — No clear approve/reject action buttons
   - Need: Dedicated approval UI component
   - Impact: Users cannot manage workflow states

3. **Document Attachment** — No indication of file attachment support
   - Procore allows change event documentation
   - Impact: Missing feature for construction workflows

### Low Issues

1. **Edit Page Clarity** — [id]/edit page exists but unclear diff/audit trail
2. **No History View** — Change log might not be visible to users
3. **Status Indicators** — List view may not show event status clearly

---

## Recommended Fixes (Priority Order)

1. **HIGH:** Implement approval/reject workflow UI
   - Add buttons: "Approve", "Reject", "Request Changes"
   - Implement state machine for valid transitions
   - Effort: Medium

2. **HIGH:** Add document attachment support
   - Use file upload component
   - Store file references in database
   - Effort: Medium

3. **HIGH:** Refactor page header to ProjectPageHeader
   - Effort: Low

4. **MEDIUM:** Add workflow state validation
   - Implement state machine to prevent invalid transitions
   - Effort: Low-Medium

5. **MEDIUM:** Enhance form validation
   - Add required field validation
   - Validate cost calculations
   - Effort: Low

6. **LOW:** Add change history/audit log view
   - Display who changed what and when
   - Effort: Medium

---

## Files Audited

- `frontend/src/app/(main)/[projectId]/change-events/page.tsx` — Main list
- `frontend/src/app/(main)/[projectId]/change-events/new/page.tsx` — Create form
- `frontend/src/hooks/use-change-events.ts` — Data hook
- `frontend/src/components/change-events/` — Components

---

## Summary

Change Events has core functionality but lacks approval workflow and document attachments. The feature is usable for basic CRUD but incomplete for real construction workflows. Moderate priority fix.
