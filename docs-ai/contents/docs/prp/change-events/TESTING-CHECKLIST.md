# Change Events Testing Checklist

**Phase:** 2 - Frontend Pages Fixed
**Date:** 2026-02-01

## Manual Browser Testing

### Prerequisites
1. Start dev server: `npm run dev` (from frontend directory)
2. Navigate to project 67: `http://localhost:3000/67/change-events`
3. Have browser DevTools Network tab open

---

## Test 1: View Existing Change Event Detail

**Steps:**
1. Click on any change event from the list
2. URL should be `/67/change-events/[uuid]` (not `/67/change-events/NaN`)
3. Check Network tab for API call

**Expected:**
- ✅ Page loads without error
- ✅ Network shows: `GET /api/projects/67/change-events/[uuid]`
- ✅ API returns 200 OK with change event data
- ✅ Details display correctly (title, status, description, etc.)

**Before Fix:**
- ❌ Network shows: `GET /api/projects/67/change-events/NaN`
- ❌ API returns 400 Bad Request
- ❌ Page shows error or loading spinner forever

---

## Test 2: Edit Existing Change Event

**Steps:**
1. From detail page, click "Edit" button
2. URL should be `/67/change-events/[uuid]/edit`
3. Modify the title or description
4. Click "Save"

**Expected:**
- ✅ Form loads with existing data
- ✅ Network shows: `GET /api/projects/67/change-events/[uuid]` (on load)
- ✅ Network shows: `PUT /api/projects/67/change-events/[uuid]` (on save)
- ✅ Success toast appears
- ✅ Redirects to detail page with updated data

**Before Fix:**
- ❌ Form loads with error (can't fetch data with NaN)
- ❌ Save fails with 400 Bad Request

---

## Test 3: Create New Change Event

**Steps:**
1. From list page, click "Create Change Event" or similar button
2. Fill in required fields:
   - Number: "CE-TEST-001"
   - Title: "Test Change Event"
   - Status: "Open"
   - Scope: "Testing"
3. Click "Create" or "Save"

**Expected:**
- ✅ Network shows: `POST /api/projects/67/change-events`
- ✅ Request body includes all form fields (check in DevTools)
- ✅ API returns 200 OK with new change event (with UUID id)
- ✅ Success toast appears
- ✅ Redirects to detail page: `/67/change-events/[new-uuid]`
- ✅ New change event appears in list

**Before Fix:**
- ❌ Direct Supabase insert (no API call visible in Network tab)
- ❌ RLS might block insert
- ❌ No validation or error handling

---

## Test 4: Hook Usage (if applicable)

**Steps:**
1. Find any other page/component using `useProjectChangeEvents` hook
2. Trigger `createChangeEvent()` from that component

**Expected:**
- ✅ Network shows: `POST /api/projects/67/change-events`
- ✅ Same behavior as Test 3

**Note:** The create page no longer uses the hook, but other components might.

---

## Network Tab Verification

### Correct API Calls

All change event API calls should use UUID strings:

```
✅ GET  /api/projects/67/change-events/550e8400-e29b-41d4-a716-446655440000
✅ PUT  /api/projects/67/change-events/550e8400-e29b-41d4-a716-446655440000
✅ POST /api/projects/67/change-events
✅ DELETE /api/projects/67/change-events/550e8400-e29b-41d4-a716-446655440000
```

### Incorrect API Calls (Should NOT See These)

```
❌ GET  /api/projects/67/change-events/NaN
❌ PUT  /api/projects/67/change-events/NaN
❌ Direct Supabase query (no API call visible)
```

---

## Console Verification

**No errors should appear in browser console:**

```
❌ Failed to fetch
❌ 400 Bad Request
❌ Invalid UUID format
❌ Type error: Cannot read property 'id' of null
```

**Success indicators:**

```
✅ Toast notifications appear
✅ Navigation works (redirects)
✅ Data loads and displays
```

---

## Edge Cases to Test

### 1. Non-existent UUID
- Navigate to `/67/change-events/00000000-0000-0000-0000-000000000000`
- **Expected:** API returns 404, page shows "Change event not found"

### 2. Invalid UUID format
- Navigate to `/67/change-events/not-a-uuid`
- **Expected:** API returns 400 Bad Request, page shows error

### 3. Concurrent edits
- Open same change event in two tabs
- Edit and save in both tabs
- **Expected:** Last save wins, no crash

---

## Playwright E2E Tests (Future)

After manual testing passes, update E2E tests:

```typescript
// Before (WRONG)
test('view change event detail', async ({ page }) => {
  const changeEventId = 12345; // ❌ Integer
  await page.goto(`/67/change-events/${changeEventId}`);
  // ...
});

// After (CORRECT)
test('view change event detail', async ({ page }) => {
  const changeEventId = "550e8400-e29b-41d4-a716-446655440000"; // ✅ UUID string
  await page.goto(`/67/change-events/${changeEventId}`);
  // ...
});
```

---

## Sign-Off

**Tester:** _______________________
**Date:** _______________________

**Test Results:**
- [ ] Test 1: View Detail - PASS
- [ ] Test 2: Edit - PASS
- [ ] Test 3: Create - PASS
- [ ] Test 4: Hook Usage - PASS (or N/A)

**Issues Found:** (list any problems)
___________________________________________________
___________________________________________________
___________________________________________________

**Ready for Production:** YES / NO
