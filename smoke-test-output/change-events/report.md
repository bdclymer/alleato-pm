# Change Events — Smoke Test Report

**Date:** 2026-04-13  
**Tester:** Claude (automated)  
**Project:** Project 767 (Alleato AI)  
**Environment:** localhost:3000  
**Overall Verdict:** PARTIAL

---

## Executive Summary

Core CRUD flows (Create, Read, Edit, Delete) work but with significant caveats:
- **Detail and Edit pages take ~8–13 seconds to load** due to an infinite re-render loop in `use-change-event-detail.ts`
- **5 API endpoints return errors** (history, approvals, lineage, origin-options, commitment-options)
- **Delete is hard-delete** — CE doesn't appear in Recycle Bin (soft-delete not implemented)
- **Build error** in `AdminFeedbackWidget.tsx` (`html-to-image` unresolved by Turbopack) — cosmetic/dev-only issue

---

## Phase 3: API Health Check

| Endpoint | Method | Status | Verdict | Notes |
|----------|--------|--------|---------|-------|
| `/change-events` | GET | 200 | PASS | Returns paginated list |
| `/change-events/{id}` | GET | 200 | PASS | Returns full CE data |
| `/change-events/{id}/line-items` | GET | 200 | PASS | |
| `/change-events/{id}/prime-contract-change-orders` | GET | 200 | PASS | |
| `/change-events/{id}/related-items` | GET | 200 | PASS | |
| `/change-events/{id}/history` | GET | **500** | **FAIL** | "Could not find a relationship between 'change_event_history' and 'users'" — DB join broken |
| `/change-events/{id}/approvals` | GET | **500** | **FAIL** | "Could not find a relationship between 'change_event_approvals' and 'appr...'" — DB join broken |
| `/change-events/{id}/attachments` | GET | 200 | PASS | |
| `/change-events/{id}/lineage` | GET | **500** | **FAIL** | "column change_event_pco_links.created_at does not exist" — missing column |
| `/change-events/rfqs` | GET | 200 | PASS | |
| `/change-events/origin-options` | GET | **400** | **NOTE** | Requires `?type=` query param — expected behavior, misleading without param |
| `/change-events/commitment-options` | GET | **405** | **FAIL** | Method Not Allowed — POST or different method required? |

---

## Phase 4: Page Load Check

| Page | URL | Loaded | JS Errors | Load Time | Verdict |
|------|-----|--------|-----------|-----------|---------|
| List | /767/change-events | Yes | html-to-image (cosmetic) | <2s | PASS |
| Create | /767/change-events/new | Yes | html-to-image (cosmetic) | <2s | PASS |
| Detail | /767/change-events/{id} | Yes (slow) | html-to-image (cosmetic) | ~8–13s | PARTIAL |
| Edit | /767/change-events/{id}/edit | Yes (slow) | html-to-image (cosmetic) | ~8–13s | PARTIAL |

**Root cause of slow detail/edit load:** `use-change-event-detail.ts` triggers multiple rapid re-fetches visible in dev logs (4+ calls to the detail endpoint in succession). The `finally { setIsLoading(false) }` block gets overridden by `setIsLoading(true)` from a re-triggered useEffect before it can settle. Likely caused by unstable `useCallback` dependencies.

---

## Phase 5: CRUD Tests

### 5.1 Create (test 1.1.1 — required fields only)

| Check | Result |
|-------|--------|
| Form loads | PASS |
| Required fields (Title, Type, Scope) accepted | PASS |
| Auto-number generated (011) | PASS |
| Default status = Open | PASS |
| Redirect to detail page after create | PASS |
| "Change event created successfully" toast | PASS |
| DB verify: record exists with correct fields | PASS |

**Verdict: PASS**

### 5.2 DB Validation After Create

```json
{
  "id": "d3bdf777-0d2d-4485-a7f4-8c6b652a5f73",
  "title": "Smoke Test CE - 202604122050",
  "type": "Owner Change",
  "scope": "TBD",
  "status": "Open",
  "number": "011"
}
```
All required fields saved correctly. **PASS**

### 5.3 Read / Detail (test 2.2.1)

| Check | Result |
|-------|--------|
| Detail page loads | PASS (slow ~8s) |
| Title and number correct | PASS |
| Status badge shown | PASS |
| Tabs visible (General, Lineage, Related Items, Comments, Emails, Change History) | PARTIAL |

**Note:** Test matrix expects "Prime Contract Change Orders" tab — implementation shows "Lineage" instead. 

**Verdict: PARTIAL**

### 5.4 Edit / Pre-fill (test 1.2.4)

| Check | Result |
|-------|--------|
| Edit page loads | PASS (slow ~8s) |
| Title pre-filled correctly | PASS |
| Status pre-filled (Open) | PASS |
| Type pre-filled (Owner Change) | PASS |
| Scope pre-filled (TBD) | PASS |
| Expecting Revenue pre-filled (Yes) | PASS |
| Title update saved | PASS |
| "Change event updated!" toast | PASS |
| DB verify: updated title persisted | PASS |

**Verdict: PASS**

### 5.5 Delete (test 1.3.1)

| Check | Result |
|-------|--------|
| DELETE API returns 204 | PASS |
| Record 404 after delete | PASS |
| Record appears in Recycle Bin | **FAIL** |

**Issue:** Delete is hard-delete (204 No Content). CE does not appear in Recycle Bin tab. Test matrix expects soft-delete to Recycle Bin.

**Verdict: FAIL**

### 5.6 Validation — Missing Required Field (test 1.1.3)

| Check | Result |
|-------|--------|
| "Title is required" error message in DOM | PASS |
| Form not submitted (stays on /new) | PASS |
| Error visible in viewport | PARTIAL |

**Note:** Form auto-scrolls to line-items section on failed submit, pushing validation errors above the fold. User must scroll up to see the "Title is required" message — this is a UX issue.

**Verdict: PARTIAL**

---

## Failures Summary

| # | Severity | Issue | File/Endpoint | Error |
|---|----------|-------|---------------|-------|
| 1 | **HIGH** | `/history` returns 500 | `/change-events/{id}/history/route.ts` | "Could not find a relationship between 'change_event_history' and 'users'" — missing Supabase FK join |
| 2 | **HIGH** | `/approvals` returns 500 | `/change-events/{id}/approvals/route.ts` | "Could not find a relationship between 'change_event_approvals' and 'approvals'" — missing FK join |
| 3 | **HIGH** | `/lineage` returns 500 | `/change-events/{id}/lineage/route.ts` | "column change_event_pco_links.created_at does not exist" — missing column in migration |
| 4 | **HIGH** | Detail + Edit pages load in ~8–13s | `use-change-event-detail.ts` | Infinite re-render loop — `useCallback` dependencies cause repeated `setIsLoading(true)` |
| 5 | **MEDIUM** | Delete is hard-delete, not soft-delete | `DELETE /change-events/{id}` | CE doesn't appear in Recycle Bin tab — soft-delete not implemented |
| 6 | **MEDIUM** | `/commitment-options` returns 405 | `/change-events/commitment-options/route.ts` | Method Not Allowed — may be POST-only |
| 7 | **LOW** | Build error: `html-to-image` unresolved by Turbopack | `AdminFeedbackWidget.tsx` | Turbopack can't resolve `html-to-image` package despite it being in node_modules — run with `next dev` (no `--turbopack`) as workaround |
| 8 | **LOW** | Validation errors scroll out of view | Create form | Form auto-scrolls to line items on failed submit, hiding required-field errors |

---

## Screenshots

| File | Description |
|------|-------------|
| `screenshots/list-page.png` | List page initial load (Turbopack build) |
| `screenshots/list-no-line-items.png` | No Line Items tab with CE records |
| `screenshots/p3-new.png` | Create form |
| `screenshots/p2-detail-8s.png` | Detail page after 8s |
| `screenshots/p4-edit-8s.png` | Edit page with pre-filled fields |
| `screenshots/create-result.png` | After successful create (toast visible) |
| `screenshots/create-detail.png` | Newly created CE detail |
| `screenshots/edit-result.png` | After successful edit (toast visible) |
| `screenshots/recycle-bin.png` | Recycle Bin showing 0 items after delete |
| `screenshots/validation-error.png` | Validation test (Title is required in DOM) |

---

## Checklist: HIGH-Priority Tests

| Test ID | Name | Verdict |
|---------|------|---------|
| 1.1.1 | Create with required fields | PASS |
| 1.1.3 | Create fails with missing title | PARTIAL (error in DOM, not visible in viewport) |
| 1.1.4 | Auto-number increments | PASS (010 → 011) |
| 1.1.6 | Create with line items | NOT TESTED |
| 1.2.1 | Edit header fields | PASS |
| 1.2.2 | Cancel edit discards changes | NOT TESTED |
| 1.2.4 | Edit opens pre-filled | PASS |
| 1.3.1 | Delete (soft) single CE | FAIL (hard delete, no recycle bin) |
| 1.3.3 | Cancel delete leaves record intact | NOT TESTED |
| 1.3.4 | Bulk delete multiple CEs | NOT TESTED |
| 2.1.1 | List view with correct columns | PASS |
| 2.1.5 | Recycle Bin tab | FAIL (empty after delete) |
| 2.2.1 | Detail tabs visible | PARTIAL (Lineage instead of Prime Contract COs) |
| 2.3.1 | Expand row to see line items | NOT TESTED |
| 3.1.1 | Status dropdown options | PASS (Open, Pending, Closed, Void) |
| 3.1.2 | Type dropdown options | PASS (Owner Change, Allowance visible) |
| 3.1.3 | Scope dropdown options | PASS (TBD, In Scope, Out of Scope) |
| 3.2.1 | Add a line item | NOT TESTED |
| 3.3.1 | Markup on cost ROM | NOT TESTED |
| 4.1.1 | Default status is Open | PASS |
| 7.1.1 | Create RFQ from CE | NOT TESTED |
| 10.1.1 | Search by number | NOT TESTED |
| 10.1.2 | Search by title | NOT TESTED |
| 10.2.1 | Filter by status | NOT TESTED |
| 10.4.1 | Footer totals with filters | NOT TESTED |
| 10.5.1 | History records status changes | FAIL (history API 500) |
