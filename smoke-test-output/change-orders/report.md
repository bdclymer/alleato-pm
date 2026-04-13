# Smoke Test Report — Change Orders

**Date:** 2026-04-13  
**Tester:** Claude Code (automated)  
**Environment:** localhost:3000 · Project 767  
**Duration:** ~25 minutes  
**Overall Verdict:** ❌ FAIL

---

## Summary

| Category | Result |
|----------|--------|
| API Health | ✅ PASS — all endpoints return 200 when authenticated |
| Page Loads | ✅ PASS — list, create forms, detail all render |
| Create Prime CO | ✅ PASS |
| Create Commitment CO | ❌ FAIL — wrong API endpoint, always 404 |
| Validation | ✅ PASS — required field errors render correctly |
| Edit Prime CO | ❌ FAIL — Status not pre-filled; PUT rejects status field |
| Approve / Reject | ❌ FAIL — UI buttons missing (handlers exist but not wired) |
| Delete (API) | ✅ PASS — status guard enforced correctly |
| Delete (UI) | ⚠️ PARTIAL — menu appears, outcome unverified |
| Search | ⚠️ PARTIAL — search box renders, filtering unclear |
| Tabs / Navigation | ✅ PASS |

---

## API Health (Phase 3)

All endpoints return **200** when called from an authenticated browser session.  
Note: Curl-based calls returned 500 during Fast Refresh rebuilds early in the session — this is a Next.js dev-mode artifact, not a production bug.

| Endpoint | Method | Status | Verdict |
|----------|--------|--------|---------|
| `/api/projects/767/prime-contract-change-orders` | GET | 200 | ✅ PASS |
| `/api/projects/767/prime-contract-change-orders/1717` | GET | 200 | ✅ PASS |
| `/api/projects/767/prime-contract-change-orders/1717/line-items` | GET | 200 | ✅ PASS |
| `/api/projects/767/prime-contract-change-orders/1717/attachments` | GET | 200 | ✅ PASS |
| `/api/projects/767/prime-contract-change-orders/export` | GET | 200 | ✅ PASS |
| `/api/projects/767/commitment-change-orders` | GET | 200 | ✅ PASS |
| `/api/projects/767/commitment-change-orders/export` | GET | 200 | ✅ PASS |

---

## Page Load Check (Phase 4)

| Page | URL | Loaded | JS Errors | Verdict |
|------|-----|--------|-----------|---------|
| List (Prime tab) | /767/change-orders | ✅ | None | ✅ PASS |
| List (Commitments tab) | /767/change-orders?tab=commitment | ✅ | None | ✅ PASS |
| Create Prime CO | /767/change-orders/prime/new | ✅ | None | ✅ PASS |
| Create Commitment CO | /767/change-orders/commitment/new | ✅ | None | ✅ PASS |
| Detail (Prime CO) | /767/change-orders/prime/1717 | ✅ | None | ✅ PASS |
| Edit (Prime CO) | /767/change-orders/prime/1717?edit=1 | ✅ | None | ✅ PASS |

> **Note:** Liveblocks returns 403 consistently — likely not configured in this env. Not a change-orders bug.

---

## CRUD Tests (Phase 5)

### 5.1 Create Prime CO (test 1.1.1) ✅ PASS

- Navigated to `/767/change-orders/prime/new`
- Filled PCCO Number (`SMK-001`) and Title (`Smoke Test Prime CO`)
- Clicked Create → success toast "Change order created"
- Redirected to `/767/change-orders/prime/1717`
- Detail page loaded with all fields correctly persisted
- PCCO number auto-generated as `001` (server-side, correct)

### 5.2 Validation — Prime CO (tests 1.1.3, 1.1.4) ✅ PASS

- Submitted with blank PCCO Number → inline error "PCCO number is required" ✅
- Submitted with blank Title → inline error "Title is required" ✅
- Form not submitted in either case ✅

### 5.3 Create Commitment CO (test 1.2.1) ❌ FAIL — **CRITICAL**

**Root cause:** The create handler in `commitment/new/page.tsx` calls:
```
POST /api/commitments/${data.contract_id}/change-orders
```
This route does **not exist**. The correct routes are:
- `/api/projects/[projectId]/commitment-change-orders` (POST)
- `/api/projects/[projectId]/contracts/[contractId]/change-orders` (POST)

The create always fails silently (stays on the form, no toast error visible, returns 500).

**File:** [frontend/src/app/(main)/[projectId]/change-orders/commitment/new/page.tsx](frontend/src/app/(main)/[projectId]/change-orders/commitment/new/page.tsx) · line ~123

**Fix needed:** Change the fetch URL to the correct API endpoint.

### 5.4 Validation — Commitment CO (tests 1.2.2, 1.2.3, 1.2.4) ✅ PASS

- Submitted blank → all three required fields show inline errors:
  - "Commitment is required"
  - "Title is required"  
  - "CO number is required"

### 5.5 Edit Prime CO — Status not pre-filled (test 1.3.2) ❌ FAIL — **HIGH**

When opening edit mode (`?edit=1`), the **Status dropdown shows "Select status"** instead of the saved value ("Proposed"). The `form.reset()` call correctly receives `co.status = "proposed"` but the shadcn `<Select>` component does not visually update after reset.

**Consequence:** The edit form immediately fails validation on submit ("Status is required") unless the user manually re-selects the status.

**File:** [frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx](frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx) · line ~549

### 5.6 Edit Save — API rejects status (test 1.3.1) ❌ FAIL — **HIGH**

Even if the user manually selects a status and submits, the **PUT endpoint rejects any body that includes `status`**:
```json
{ "error": "Status cannot be changed via update. Use the approve or reject endpoints." }
```

But the edit form's Zod schema requires `status` as a field (`z.string().min(1, "Status is required")`), so it's always included in the PUT body. This creates an irreconcilable conflict:

- Form requires status → always sends it
- API rejects status → always returns 400

**The edit save flow is completely broken for prime COs.**

**Fix options:**
1. Remove `status` from the edit schema and form UI (status changes should go through approve/reject)
2. Strip `status` from the PUT body on the client before sending

### 5.7 Approve / Reject Actions (tests 4.1.3–4.1.5) ❌ FAIL — **HIGH**

`handleApprove` and `handleReject` functions are defined in the prime CO detail component, but **no UI button calls them**. The action menu (MoreHorizontal dropdown) only contains:
- Edit
- Export CSV  
- Delete

Approve and Reject are **completely absent from the UI**.

The `/api/projects/767/prime-contract-change-orders/1717/approve` endpoint exists and returns 200, but there's no way to trigger it from the UI.

**File:** [frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx](frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx) · lines 628, 647, 1266–1290

### 5.8 Delete (API guard) ✅ PASS

The DELETE endpoint correctly enforces:
- Approved COs → 409 "Cannot delete a change order with status 'approved'"
- Only draft/pending/rejected → allowed to delete

### 5.9 Delete (UI) ⚠️ PARTIAL

Row action menu renders correctly with View / Edit / Delete options. Clicking Delete on an approved CO shows no feedback (toast not visible in screenshot — may have appeared briefly). Could not verify full delete flow for a draft CO within smoke test timeframe.

---

## Bugs Found

| # | Severity | Component | Description |
|---|----------|-----------|-------------|
| 1 | 🔴 CRITICAL | Commitment CO Create | Wrong API endpoint — creates always fail silently |
| 2 | 🟠 HIGH | Prime CO Edit | Status not pre-filled when opening edit mode |
| 3 | 🟠 HIGH | Prime CO Edit | PUT API rejects `status` field; edit save is broken |
| 4 | 🟠 HIGH | Prime CO Detail | Approve and Reject buttons missing from action menu |
| 5 | 🟡 MEDIUM | Prime CO Delete | No user feedback when deleting an approved CO |

---

## Screenshots

| File | What it shows |
|------|---------------|
| `01-list-page.png` | Prime Contract tab loaded with 12 COs |
| `02-commitments-tab.png` | Commitments tab (0 items, empty state) |
| `03-prime-new-form.png` | Create Prime CO form |
| `04-validation-pcco-missing.png` | "PCCO number is required" error |
| `05-validation-title-missing.png` | "Title is required" error |
| `06-create-prime-result.png` | After create — "Change order created" toast |
| `07-prime-detail-loaded.png` | Prime CO detail showing all sections |
| `16-edit-mode.png` | Edit form — Status shows "Select status" (bug) |
| `19-status-dropdown-open.png` | Status dropdown options visible |
| `24-commitment-new-form.png` | Commitment CO create form |
| `25-commitment-validation.png` | All 3 required field errors showing |
| `26-commitment-dropdown.png` | Commitment dropdown with contract options |
| `31-row-action-menu.png` | List row with View/Edit/Delete menu |
| `34-search-results.png` | Search in progress |

---

## Recommended Fix Priority

1. **Fix commitment CO create API path** — `commitment/new/page.tsx` line ~123, change to `/api/projects/${projectId}/commitment-change-orders`
2. **Fix prime CO edit save** — remove `status` from the edit form schema OR strip it client-side before PUT
3. **Add Approve/Reject to action menu** — wire `handleApprove` and `setShowRejectDialog(true)` to DropdownMenuItems
4. **Fix Status pre-fill in edit** — use `form.setValue('status', co.status)` in a separate effect or force re-render after data loads
