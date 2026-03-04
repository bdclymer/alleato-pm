# Implementation Report — Commitments

**Date:** 2026-03-03
**Agent:** financial-tools-lead (direct fix, post Phase 2)
**Status:** Fixes Applied — Score revised upward

---

## Why This Was Missed in Phase 2

Commitments was called the "gold standard" reference and skipped by implementors. After Phase 2 completed, all 6 other tools had been patched to 7.5/10 — **past** Commitments' 7/10. This was contradictory and incorrect.

**Revised Score: 8/10** (up from 7/10)

---

## Investigation Report Corrections

1. **"Header Pattern Violation"** — FALSE. `UnifiedTablePage` provides its own header. Same pattern used by all other tools correctly.
2. **"Missing Empty State"** — FALSE. `emptyState` prop is configured on `UnifiedTablePage` (line 379 of page.tsx).
3. **"Recycle bin restore unclear"** — This was ACCURATE. The UI had no Restore button. But the API route already existed at `POST /api/commitments/[id]/restore`.

---

## Fixes Applied

### 1. StatusBadge Migration (MEDIUM — same fix as all other tools)

**File:** `frontend/src/features/commitments/commitments-table-config.tsx`

- Added `import { StatusBadge } from "@/components/ds"`
- Removed manual `statusVariant()` function (had custom switch statement)
- Added `statusLabel()` helper — converts DB snake_case (`out_for_signature`) to display string (`"out for signature"`) that StatusBadge can look up in its STATUS_TO_VARIANT map
- Updated all 3 status render sites (table column, card view, list view) to use `<StatusBadge status={statusLabel(item.status)} />`
- Kept `Badge` with `typeVariant()` for the Type column (subcontract/purchase_order — these are category labels, not workflow statuses)

**Why:** Commitments was the ONLY tool still using manual `Badge` variant mapping after all other tools were migrated.

### 2. Recycle Bin Restore Button (HIGH)

**File:** `frontend/src/app/(main)/[projectId]/commitments/recycle-bin/page.tsx`

The API route `POST /api/commitments/[id]/restore` was fully implemented and working. The recycle bin page simply had no UI wired up to call it.

**Changes:**
- Converted static `const config` to a `useMemo` computed inside the component so it can reference the `handleRestore` callback
- Added `handleRestore` callback that calls `POST /api/commitments/${id}/restore`
- Added `rowActions` config to `GenericDataTable` with a "Restore" row action button
- On success: toast notification + removes record from local list + increments active count
- On failure: descriptive error toast

---

## Items Already Correct (No Changes Needed)

| Item | Status | Evidence |
|------|--------|----------|
| All CRUD operations | Already complete | 16 API endpoints, all 5 operations working |
| Recycle bin API | Already complete | `POST /api/commitments/[id]/restore` + `DELETE /api/commitments/[id]/permanent-delete` |
| Empty state | Already configured | `emptyState` prop at line 379 of page.tsx |
| Header pattern | Already correct | Uses `UnifiedTablePage` (same as other tools) |
| Toast notifications | Already used | All hooks use `toast()` from sonner |
| AlertDialog confirmations | Already used | Delete uses `AlertDialog`, not `window.confirm` |
| Settings page | Already functional | Route exists and renders |
| Export | Already working | `ExportDialog` component in place |

---

## TypeScript Status

Zero errors in commitments files. Zero new errors introduced.

---

## Files Modified

- `frontend/src/features/commitments/commitments-table-config.tsx` — StatusBadge migration, removed statusVariant(), added statusLabel()
- `frontend/src/app/(main)/[projectId]/commitments/recycle-bin/page.tsx` — Added restore functionality via `POST /api/commitments/[id]/restore`
