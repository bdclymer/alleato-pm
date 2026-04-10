# UI Parity Gap Analysis — Change Workflow

**Source**: Background agent `ui-gap-worker` (completed)
**Scope**: All change workflow pages vs Procore UI

## Summary

20 UI-level gaps identified: 4 critical, 5 high, 8 medium, 3 low.
Note: Some of these were **already fixed** during our remediation phase.

---

## CRITICAL (4)

### UI-007: Prime CO create form missing 10+ fields
- **Status**: **FIXED** in TASK-004 — form now has 16 fields

### UI-015: PCO create form missing fields
- **Status**: **PARTIALLY FIXED** in TASK-006 — added change_reason, location, reference, etc.
- **Remaining**: Status select field (uses Save Draft/Submit pattern), Estimated Value as named form field

### UI-016: PCO edit mode is a stub ("coming soon" toast)
- **Status**: NOT FIXED — PCO records still read-only after creation
- **Priority**: Next sprint

### UI-017: PCO "Convert to Change Order" is a stub
- **Status**: NOT FIXED — core downstream workflow still missing
- **Priority**: Next sprint (depends on API-005 fix)

---

## HIGH (5)

### UI-003: No "Add To" on CE line items (individual row level)
- **Status**: **PARTIALLY FIXED** in TASK-001 — bulk "Add To" exists on selection bar, but per-line-item "Add To" dropdown is missing

### UI-009: Prime CO SOV is read-only
- **Status**: **FIXED** in TASK-002 — inline add/edit/delete now functional

### UI-011: Commitment CO has no tabs, SOV schema incomplete
- **Status**: **PARTIALLY FIXED** in TASK-003 — inline line items CRUD added, but no tab structure and line items lack CE/budget code linkage

### UI-012: "Request Received From" missing from Commitment CO forms
- **Status**: NOT FIXED — field exists in DB but not in create/edit forms

### UI-018: PCO detail lacks General/Attachments/Emails tab structure
- **Status**: NOT FIXED — uses version-based layout, no standard tabs

---

## MEDIUM (8)

### UI-001: CE list missing tabs (Line Items/No Line Items/RFQs/Recycle Bin)
- **Status**: ALREADY EXISTS — the page.tsx has 4 tabs. Agent analyzed table config, not actual page.

### UI-002: CE list missing column group headers
- **Status**: ALREADY EXISTS — column groups are implemented in the page.

### UI-004: Extra "Prime Contract Change Orders" tab on CE detail
- **Status**: Acceptable divergence from Procore

### UI-006: Convert to CO gated behind "approved" status
- **Status**: NOT FIXED — should allow from any non-void status via Add To

### UI-010: Prime CO list missing Change Reason column
- **Status**: NOT FIXED — column not in table config

### UI-013: CCO line items lack CE/budget code linkage fields
- **Status**: NOT FIXED — schema limitation (only description + amount)

### UI-014: Commitment CO list missing Change Reason column
- **Status**: NOT FIXED — column not in table config

### UI-020: window.confirm() for delete instead of AlertDialog
- **Status**: NOT FIXED — cosmetic inconsistency

---

## LOW (3)

### UI-004: Extra tab on CE detail (divergence, not bug)
### UI-005: "Expecting Revenue" uses raw HTML radios
### UI-019: CO list tab structure (verified working)

---

## Remediation Status Summary

| Status | Count |
|--------|-------|
| FIXED in this run | 4 (UI-007, UI-009, UI-015 partial, UI-003 partial) |
| Already existed (agent missed) | 2 (UI-001, UI-002) |
| NOT FIXED (deferred) | 14 |

## Key Remaining Priorities

1. **UI-016 + UI-017**: PCO edit mode + Convert to CO — these are the biggest remaining workflow gaps
2. **UI-012**: Request Received From field on CCO forms
3. **UI-013**: CCO line items need CE/budget code linkage (schema change required)
