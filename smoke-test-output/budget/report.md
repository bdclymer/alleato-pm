# Budget — Smoke Test Report

**Date:** 2026-04-13  
**Tester:** Claude Code (automated)  
**Project:** Alleato AI (ID: 767)  
**Overall Verdict:** 🔴 FAIL

---

## Summary

| Category | Passed | Failed | Total |
|----------|--------|--------|-------|
| API Endpoints (GET) | 7 | 3 | 10 |
| Pages Loaded | 3 | 0 | 3 |
| Tabs Loaded | 6 | 0 | 6 |
| CRUD: Create | 0 | 1 | 1 |
| CRUD: Lock/Unlock | 1 | 0 | 1 |
| CRUD: Modifications Create | 1 | 0 | 1 |
| CRUD: Modifications Delete | 0 | 1 | 1 |
| CRUD: Validation | 1 | 0 | 1 |

---

## API Health Check

| Endpoint | Method | Status | Verdict |
|----------|--------|--------|---------|
| `/api/projects/767/budget` | GET | 200 | ✅ PASS |
| `/api/projects/767/budget/details` | GET | 200 | ✅ PASS |
| `/api/projects/767/budget/forecast` | GET | 200 | ✅ PASS |
| `/api/projects/767/budget/direct-costs` | GET | 500 | ❌ FAIL |
| `/api/projects/767/budget/history` | GET | 200 | ✅ PASS |
| `/api/projects/767/budget/modifications` | GET | 200 | ✅ PASS |
| `/api/projects/767/budget/snapshots` | GET | 500 | ❌ FAIL |
| `/api/projects/767/budget/views` | GET | 200 | ✅ PASS |
| `/api/projects/767/budget/lock` | GET | 200 | ✅ PASS |
| `/api/projects/767/budget/export` | GET | 500 | ❌ FAIL |
| `/api/projects/767/budget/lines/{id}` | GET | 500 | ❌ FAIL |
| `/api/projects/767/budget/lines/{id}/history` | GET | 200 | ✅ PASS |

---

## Page Load Check

| Page | URL | Loaded | JS Errors | Verdict |
|------|-----|--------|-----------|---------|
| Budget Main | `/767/budget` | ✅ Yes | Liveblocks 403 (unrelated) | ✅ PASS |
| Setup | `/767/budget/setup` | ✅ Yes | None | ✅ PASS |
| Line Item New | `/767/budget/line-item/new` | ✅ Yes | None | ✅ PASS |

---

## Tab Load Check

| Tab | Loaded | Verdict |
|-----|--------|---------|
| Budget | ✅ Yes — table with 3 line items, grand total $401,000 | ✅ PASS |
| Budget Details | ✅ Yes — all cost codes listed with types | ✅ PASS |
| Budget Modifications | ✅ Yes — empty state, "New Modification" button present | ✅ PASS |
| Cost Codes | ✅ Yes — grouped by division | ✅ PASS |
| Forecasting | ✅ Yes — KPIs: $401K budget / $105K costs / $345K projected | ✅ PASS |
| Project Status Snapshots | ✅ Yes — empty state with Create Snapshot button | ✅ PASS |
| Change History | ✅ Yes — 31 total changes, 19 this month | ✅ PASS |

---

## CRUD Tests

### Create Budget Line Item (1.1.1) — ❌ FAIL

**Steps:** Navigate to `/767/budget/line-item/new`, select budget code "01-3127.L – Sr. Project Manager – Labor", enter amount $75,000, click "Create 1 Line Item"

**Result:** Form stays on page. Server returns 500 Internal Server Error.

**Root cause:** `costType` from the dropdown is a single-letter code (e.g., `"L"`) but the API route tries to store it directly as `cost_type_id` which is a UUID in the database.

```
POST /api/projects/767/budget → 500
Error: "invalid input syntax for type uuid: \"L\""
```

**Screenshot:** `screenshots/submit-result.png`

---

### Create Budget Modification — ✅ PASS

**Steps:** POST to `/api/projects/767/budget/modifications` with valid `budgetItemId`, `amount`, `title`

**Result:** 200 OK — created `BM-0001` "Smoke Test Modification" as draft

---

### Delete Budget Modification — ❌ FAIL

**Steps:** DELETE `/api/projects/767/budget/modifications?modificationId={id}` for the draft just created

**Result:** 404 — "Modification not found in this project"

**Root cause:** Type mismatch in ownership check (lines 426 and 569 of `modifications/route.ts`). `modification.project_id` returns an **integer** from the DB, but it's compared with `projectId` which is a **string** (`"767"`). The strict `!==` comparison always fails.

```ts
// Bug: integer 767 !== string "767"
if (modification.project_id !== projectId) { // should be projectIdNum
```

---

### Lock / Unlock Budget — ✅ PASS

- `POST /budget/lock` → 200, sets `budget_locked: true`
- `DELETE /budget/lock` → 200, sets `budget_locked: false`

---

### Validation (empty required fields) — ✅ PASS (partial)

Submitting with no budget code selected → form stays on page (client-side `alert()`). Server is not called. However, validation UX uses native browser `alert()` dialogs rather than inline field errors, which is poor UX but functionally correct.

---

## Bugs Found

### 🔴 BUG-1 (Critical): Create Budget Line Item broken — cost_type_id UUID mismatch

- **File:** `frontend/src/app/(main)/[projectId]/budget/line-item/new/page.tsx`
- **File:** `frontend/src/app/api/projects/[projectId]/budget/route.ts`
- **Issue:** The form sends `costType: "L"` (letter code from budget code suffix), the API normalizes it to `costTypeId: item.costType ?? null`, and tries to INSERT "L" into a UUID column (`cost_type_id`).
- **Fix:** Either (a) look up the `cost_types` table to resolve letter → UUID, or (b) change the DB schema to store the letter code directly.
- **Impact:** ALL budget line item creation is broken.

---

### 🔴 BUG-2 (Critical): GET /budget/lines/{lineId} returns 500

- **Error:** `column cost_code_types_1.name does not exist`
- **Impact:** Cannot fetch individual line item detail. Any feature that loads a single line item detail page is broken.

---

### 🔴 BUG-3 (Critical): Delete Budget Modification always returns 404

- **File:** `frontend/src/app/api/projects/[projectId]/budget/modifications/route.ts`, lines 426 and 569
- **Issue:** `modification.project_id` (integer) is compared with `projectId` (string) using strict `!==`. Always fails.
- **Fix:** Change to `modification.project_id !== projectIdNum` (using the already-parsed integer).

---

### 🟡 BUG-4 (Medium): 3 GET endpoints return 500

| Endpoint | Error |
|----------|-------|
| `/budget/direct-costs` | "Failed to fetch direct costs" |
| `/budget/snapshots` | "Failed to fetch snapshots" |
| `/budget/export` | "Failed to fetch budget data for export" |

These are likely missing or malformed DB queries. Direct costs and export are core features.

---

### 🟡 BUG-5 (Minor): Create form uses `alert()` for validation

- Inline validation errors should show beneath form fields
- Currently: native browser alert dialog, which some browsers/test runners auto-dismiss

---

## Screenshots

| File | Description |
|------|-------------|
| `budget-main.png` | Budget main page — passes |
| `budget-setup.png` | Setup page — passes |
| `budget-line-item-new.png` | Create form — passes |
| `budget-create-form.png` | Create form with dropdown open |
| `pre-submit.png` | Form before submit |
| `submit-result.png` | After submit — form unchanged (500 error) |
| `validation.png` | Empty form submit — stays on page (client validation) |
| `budget-modifications.png` | Modifications tab — empty state |
| `budget-details-tab.png` | Budget Details tab |
| `cost-codes-tab.png` | Cost Codes tab |
| `forecasting-tab.png` | Forecasting tab |
| `change-history-tab.png` | Change History tab |
| `snapshots-tab.png` | Snapshots tab — empty state |
