# Change Orders E2E Test Documentation

**Generated:** 2026-02-21
**Status:** Test plan complete, runtime error prevents UI exploration

---

## Overview

This directory contains documentation and test plans for the Change Orders feature E2E testing. The comprehensive test plan is based on the existing test implementation in `frontend/tests/e2e/change-orders/change-orders-comprehensive.spec.ts`.

---

## Files in This Directory

### 1. `test-plan.md`
Comprehensive E2E test plan covering:
- Status workflow tests (5 tests)
- Line item management tests (4 tests)
- Filtering and search tests (4 tests)
- Navigation tests (3 tests)
- Complete selector reference
- Database helper documentation
- Success criteria and best practices

### 2. `exploration-report.json`
Automated exploration report (partial - blocked by runtime error)

### 3. Screenshots
- `change-orders-list-*.png` - Change Orders list page (shows Next.js error)

---

## Current Status

### ✅ Test Implementation: Complete
The Change Orders feature has comprehensive E2E tests already implemented:

**Test File:** `frontend/tests/e2e/change-orders/change-orders-comprehensive.spec.ts`

**Coverage:**
- 16 comprehensive E2E tests
- Full status workflow (draft → pending → approved → executed)
- Line item CRUD with calculation verification
- Filtering by status tabs
- Search by CO number and title
- Tab navigation on detail pages
- Database persistence verification

**Test Quality:**
- ✓ Real user actions (click, fill, submit)
- ✓ UI feedback verification (toasts, status updates)
- ✓ Data persistence checks (query database after mutations)
- ✓ Test isolation (each test creates/cleans own data)
- ✓ Auto-cleanup (beforeEach/afterAll hooks)

### ⚠️ UI Exploration: Blocked
Screenshot capture encountered a Next.js runtime error on the Change Orders page:

**Error:**
```
Cannot find module './vendor-chunks/fuse.js.js'
```

**Impact:**
- Cannot capture live screenshots of working UI
- Cannot document interactive elements via browser inspection
- Test plan is based on existing test code instead of live UI

**Workaround:**
- Test plan created from comprehensive test file
- Selectors documented from test implementation
- Workflows documented from existing test scenarios

---

## Test Plan Highlights

### Status Workflow Tests

1. **Submit Draft for Review** - Verify draft → pending transition
2. **Approve Pending CO** - Verify pending → approved transition with contract update
3. **Reject with Reason** - Verify pending → rejected with mandatory reason
4. **Execute Approved CO** - Verify approved → executed (irreversible)
5. **Read-Only Enforcement** - Verify executed COs cannot be edited

### Line Item Tests

1. **Add Multiple Items** - Verify total calculation (qty × cost)
2. **Edit Quantity** - Verify total recalculates
3. **Delete Item** - Verify total updates
4. **Read-Only When Approved** - Verify no edit controls on approved COs

### Filter/Search Tests

1. **Filter by Status** - Verify tab filtering (Draft, Pending, Approved)
2. **Search by CO Number** - Verify search filters correctly
3. **Search by Title** - Verify title search works
4. **Clear Filters** - Verify all COs reappear

### Navigation Tests

1. **Row Click to Detail** - Verify navigation to detail page
2. **Tab Navigation** - Verify General/Line Items/Attachments tabs work
3. **Back Button** - Verify return to list

---

## Running the Tests

### Quick Start
```bash
cd frontend

# Run all change order tests
npx playwright test tests/e2e/change-orders/

# Run comprehensive tests only
npx playwright test tests/e2e/change-orders/change-orders-comprehensive.spec.ts

# Run with UI mode (recommended for debugging)
npx playwright test --ui
```

### Run Specific Test Suite
```bash
# Status workflow
npx playwright test -g "Status Workflow"

# Line items
npx playwright test -g "Line Items"

# Filtering
npx playwright test -g "Filtering"

# Navigation
npx playwright test -g "Navigation"
```

### Run Single Test
```bash
npx playwright test -g "should submit draft CO for review"
```

---

## Test Data Conventions

- **Test Project ID:** 67 (Vermillion Rise Warehouse)
- **CO Number Prefix:** `CO-E2E-*` (with timestamp)
- **Authentication:** Automatic via `tests/.auth/user.json`
- **Cleanup:** Auto-cleanup in beforeEach/afterAll

---

## Database Helpers

Available in `frontend/tests/helpers/db.ts`:

### Change Order Operations
```typescript
// Create
createChangeOrder(input: ChangeOrderInput)

// Update status
updateChangeOrderStatus(id, status, fields?: {
  submitted_at?: string,
  approved_at?: string,
  approved_by?: string,
  rejection_reason?: string
})

// Read
getChangeOrder(id)

// Delete
deleteTestChangeOrders(projectId, prefix = "CO-E2E-")
```

### Line Item Operations
```typescript
// Create
createChangeOrderLineItem(input: LineItemInput)

// Update
updateChangeOrderLineItem(id, updates)

// Delete
deleteChangeOrderLineItem(id)
deleteChangeOrderLineItems(changeEventId)

// Read
fetchLineItems(changeEventId)
```

---

## Selector Patterns

### Role-Based Selectors (Preferred)
```typescript
// Buttons
page.getByRole('button', { name: /submit/i })
page.getByRole('button', { name: /approve/i })
page.getByRole('button', { name: /add line item/i })

// Inputs
page.getByRole('textbox', { name: /search/i })
page.getByRole('spinbutton', { name: /quantity/i })

// Tabs
page.getByRole('tab', { name: /line items/i })

// Rows
page.getByRole('row').filter({ hasText: 'CO-123' })
```

### ID/Name Selectors (Forms)
```typescript
page.locator('#co-number, input[name="co_number"]')
page.locator('#title, input[name="title"]')
page.locator('#description, textarea[name="description"]')
```

---

## Success Criteria

A test passes when ALL of these are verified:

1. ✓ Action completes (button click, form submit)
2. ✓ UI feedback appears (toast, status badge)
3. ✓ Visual update renders (table row, calculated total)
4. ✓ Data persists (database query confirms)
5. ✓ Cleanup succeeds (test data removed)

---

## Known Gaps

### Tests Not Yet Implemented

1. **Validation Tests**
   - Required field validation
   - Numeric constraints
   - Duplicate CO number prevention

2. **Permission Tests**
   - Role-based access control
   - Viewer/Editor/Approver permissions

3. **Attachment Tests**
   - Upload file
   - Download file
   - Delete file

4. **Audit Trail Tests**
   - Status change history
   - User tracking

5. **Bulk Operations**
   - Multi-select
   - Bulk approve/reject

---

## Next Steps

### Immediate Actions

1. **Fix Runtime Error** - Resolve Next.js module error to enable UI exploration
2. **Capture Live Screenshots** - Re-run screenshot script after error is fixed
3. **Document UI Elements** - Use Playwright MCP to inspect and document selectors

### Future Enhancements

1. **Add Validation Tests** - Cover all form field validations
2. **Add Permission Tests** - Verify RLS and role-based access
3. **Add Attachment Tests** - Test file upload/download/delete
4. **Add Mobile Tests** - Verify responsive behavior
5. **Add Accessibility Tests** - Keyboard navigation, screen readers

---

## Related Documentation

- **Test File:** `frontend/tests/e2e/change-orders/change-orders-comprehensive.spec.ts`
- **Test Helpers:** `frontend/tests/helpers/db.ts`
- **README:** `frontend/tests/e2e/change-orders/README.md`
- **E2E Standards:** `.claude/rules/E2E-TESTING-STANDARDS.md`
- **Playwright Config:** `frontend/config/playwright/playwright.config.ts`

---

## Contact

**Test Suite Location:** `frontend/tests/e2e/change-orders/`
**Playwright Documentation:** https://playwright.dev/
**Project Documentation:** `docs-ai/contents/docs/`

---

**Last Updated:** 2026-02-21
**Status:** Test plan complete, awaiting runtime error fix for UI exploration
