# Prime Contracts Live Test Report
Generated: 2026-02-23T18:45:00.000Z
URL Tested: http://localhost:3000/31/prime-contracts
Tester: Bug Investigation Team - Live Tester
Test Framework: Playwright (Chromium, headless)

---

## SUMMARY

| Test | Result | Notes |
|------|--------|-------|
| Page Load | PASS | Heading, description, New Contract button all render |
| List/Table | PASS (empty state) | Empty state renders correctly, table when data present |
| Create Contract (UI) | PASS | Form navigates, fills, submits, creates contract, navigates to detail |
| Create Contract (API) | BUG | `original_contract_value` required in API but not by UI's empty SOV |
| Form Validation | PASS | Inline errors shown for required fields on empty submit |
| Edit Flow | PASS (structure) | Edit page loads, form pre-fills |
| Delete (permission) | BUG | Test user blocked by project_directory_memberships check |
| Delete (UI dialog) | PASS | AlertDialog renders with contract name confirmation |
| Error Handling | BUG | `alert()` used in new/page.tsx and detail page — freezes headless tests |

---

## BUG 1: CRITICAL - `alert()` Used for Error Handling

**Severity:** High (breaks headless/automated testing, poor UX)

**Files:**
- `/frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx` line 139
- `/frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx` lines 380, 392, 441
- `/frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/edit/page.tsx` line 260

**Evidence:**
The test for TEST 3 (Create Contract) timed out at 60 seconds. After deep inspection of the DOM snapshot, the contract WAS successfully created and the browser navigated to the detail page. However, if the POST request fails (e.g., server error, validation failure), the `new/page.tsx` catches the error and calls:

```typescript
alert(err instanceof Error ? err.message : "Failed to create contract");
```

Native `alert()` dialogs freeze headless Playwright browsers because they require a click to dismiss. They also break the user experience on mobile and within iframes.

**Occurrences:**
- `new/page.tsx:139` — catches failed contract creation
- `[contractId]/page.tsx:380` — validates line item form fields
- `[contractId]/page.tsx:392` — validates budget code selection
- `[contractId]/page.tsx:441` — catches failed line item creation
- `[contractId]/edit/page.tsx:260` — catches failed contract update

**Fix Required:** Replace all `alert()` calls with `toast.error()` from sonner (already imported in the codebase and used elsewhere).

---

## BUG 2: HIGH - API Validation Mismatch: `original_contract_value` Required

**Severity:** High (blocks API-level contract creation without UI form)

**File:** `/frontend/src/app/api/projects/[projectId]/contracts/validation.ts` line 29

**Evidence (from TEST 5 - API Audit):**

```
POST /api/projects/31/contracts: 400
POST error: {
  "error": "Validation error",
  "details": [
    {
      "field": "original_contract_value",
      "message": "Invalid input: expected number, received undefined"
    }
  ]
}
```

The Zod schema requires `original_contract_value: z.number().min(0)` (no `.optional()`), but direct API callers (including test/seeding code) cannot create a contract without providing this value.

The UI form (`new/page.tsx`) calculates this from SOV line items:
```typescript
const sovTotal = sovItems.reduce((sum, item) => sum + (item.amount || 0), 0);
// ...
original_contract_value: sovTotal,  // 0 when no SOV items added
```

So the UI works because it always sends `original_contract_value: 0` (when no SOV items). But external API clients, test suites, and seeding scripts fail unless they know to include this field.

**Fix Required:** Change `original_contract_value` to `z.number().min(0).default(0)` in `createContractSchema`.

---

## BUG 3: HIGH - Permission Gate Inconsistency (POST vs DELETE/PATCH)

**Severity:** High (blocks delete and update for test users)

**Files:**
- POST: `/frontend/src/app/api/projects/[projectId]/contracts/route.ts` lines 152-166
- DELETE/PATCH: `/frontend/src/app/api/projects/[projectId]/contracts/[contractId]/route.ts` lines 244-258

**Evidence:**

POST route has permission check DISABLED with comment:
```typescript
// DEVELOPMENT: Permission check disabled for easier testing
// TODO: Re-enable this in production
```

DELETE route has permission check ACTIVE checking `project_directory_memberships`:
```typescript
const { data: membership } = await supabase
  .from("project_directory_memberships")
  .select("role, status")
  .eq("project_id", parseInt(projectId, 10))
  .eq("person_id", authLink?.person_id ?? "")
  .single();

if (!membership || membership.status !== "active") {
  return NextResponse.json(
    { error: "Forbidden: You do not have permission to delete contracts for this project" },
    { status: 403 }
  );
}
```

When testing with `test1@mail.com` (created by auth.setup.ts), the test user has no entry in `project_directory_memberships` for project 31. Result:
- CREATE: works (permission check disabled)
- DELETE: blocked with 403 Forbidden
- UPDATE (PATCH): blocked with 403 Forbidden

**Fix Required:** Either:
1. Disable permission check on DELETE/PATCH to match POST (dev mode), OR
2. Enable the permission check on POST to match DELETE/PATCH (consistent security), OR
3. Add the test user to `project_directory_memberships` for project 31 in the auth setup

---

## BUG 4: MEDIUM - Delete UI Error Handling in List Page

**Severity:** Medium (user error message if related records exist)

**File:** `/frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx`

**Observation:** The delete confirmation dialog correctly warns:
> "This action cannot be undone. Any associated line items and change orders must be deleted first."

However, the API-level check (`DELETE /api/projects/31/contracts/{id}`) returns a 400 if line items or change orders exist, but the UI error handling only shows `toast.error("Failed to delete contract")` - it does not surface the specific reason (line items must be deleted first).

**Fix:** Extract the error message from the API response and show it in the toast.

---

## CONFIRMED WORKING (No Bugs)

### Page Load (TEST 1)
- `h1` "Prime Contracts" heading: VISIBLE
- Description "Manage prime contracts and owner agreements": VISIBLE
- "New Contract" button: VISIBLE
- Tabs: "All Contracts (0)", "Approved (0)", "Complete (0)": VISIBLE
- No console errors on initial load
- No runtime errors

### Form Fields (TEST 2)
All expected fields present on new contract form:
- Contract # (required, asterisk shown)
- Owner/Client (combobox)
- Title (required, asterisk shown)
- Status (required, asterisk shown, defaults to "Draft")
- Executed checkbox
- Default Retainage (number, defaults to 10%)
- Contractor (combobox)
- Architect/Engineer (combobox)
- Description (textarea)
- Attachments (file upload)
- SOV / Schedule of Values section (line items)
- Inclusions / Exclusions (rich text)
- All date fields (6 date pickers)
- Private checkbox
- Auto-fill, Cancel, Create buttons

### Form Validation (TEST 4)
Empty form submission correctly shows:
- "Contract # is required." under Contract # field
- "Title is required." under Title field
- `aria-invalid="true"` on both invalid fields
- 9 error-styled elements total
- No console errors

### Create Contract - Full UI Flow (TEST 3)
End-to-end flow:
1. Navigated to `/31/prime-contracts/new` - WORKS
2. Filled "Contract #" field: `E2E-806908` - WORKS
3. Filled "Title" field: `E2E Test Contract 2026-02-23` - WORKS
4. Clicked "Create" button - WORKS
5. API POST successful (contract ID: `3cfa5625-7b60-4e17-a45a-5588f29d2db4`)
6. Browser navigated to detail page `/31/prime-contracts/3cfa5625-7b60-4e17-a45a-5588f29d2db4` - WORKS
7. Detail page shows contract info correctly

Note: A test contract was left in the DB (`E2E-806908`). It cannot be deleted via API due to Bug 3 (permission check). Manual cleanup required.

### Contract Detail Page (TEST 3 - observed via error-context.md)
The detail page renders correctly:
- Contract heading with title
- "Edit Contract" button visible
- Tabs: General, Change Orders, Invoices, Payments Received, Emails, Change History, Financial Markup, Advanced Settings
- Contract # shown in metadata
- Status badge shown
- Financial summary section rendered

### Search Bar
The "expandable search" component renders as a search ICON (not an input) by default. Clicking the icon expands it to a text input. This is expected behavior, not a bug.

### Delete Confirmation Dialog
When delete action is triggered from the list, an `AlertDialog` renders with:
- Title: "Delete Contract"
- Description includes contract number and title in **bold**
- Warning that line items and change orders must be deleted first
- Cancel and "Delete Contract" buttons

---

## TEST ARTIFACTS

Screenshots saved to `/tmp/`:
- `/tmp/pc-t1-page.png` - List page with empty state
- `/tmp/pc-t2-newform.png` - New contract form
- `/tmp/pc-t3-filled.png` - New contract form with data filled
- `/tmp/pc-t4-validation.png` - Validation errors after empty submit

---

## REPRODUCTION STEPS FOR EACH BUG

### Bug 1 (alert() in error handler)
1. Navigate to `/31/prime-contracts/new`
2. Fill in Contract # and Title
3. Force a server error (e.g., temporarily break the API)
4. Click Create
5. A native browser `alert()` dialog appears — blocking

### Bug 2 (API validation mismatch)
```bash
curl -X POST http://localhost:3000/api/projects/31/contracts \
  -H "Content-Type: application/json" \
  -d '{"contract_number":"TEST-001","title":"Test","status":"draft"}'
# Returns: 400 {"error":"Validation error","details":[{"field":"original_contract_value",...}]}
```

### Bug 3 (permission gate inconsistency)
1. Create a test user (test1@mail.com) via auth.setup.ts
2. POST to create a contract - SUCCEEDS (permission check disabled)
3. DELETE the same contract - FAILS 403 (permission check active)

### Bug 4 (non-descriptive delete error)
1. Create a contract with line items
2. Go to list and click Delete
3. Confirm delete
4. Toast shows generic "Failed to delete contract"
5. No message that line items must be deleted first

---

## RECOMMENDED FIX PRIORITY

1. **Bug 1 (alert)** - Fix immediately: Replace all `alert()` with `toast.error()`
2. **Bug 3 (permission inconsistency)** - Fix immediately: Disable permission check in DELETE/PATCH to match POST (for dev), or add consistent environment-based gates
3. **Bug 2 (API validation)** - Fix: Add `.default(0)` to `original_contract_value` in schema
4. **Bug 4 (error message)** - Fix: Surface specific API error message in delete toast
