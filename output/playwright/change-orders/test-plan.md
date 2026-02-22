# Change Orders E2E Test Plan

**Generated:** 2026-02-21T19:52:00Z
**Project:** Alleato PM - Change Orders Feature
**Test Framework:** Playwright
**Authentication:** Automatic (saved auth state)
**Test Project:** Project ID 31 & 67 (Vermillion Rise Warehouse)

---

## Executive Summary

This comprehensive E2E test plan covers all aspects of the Change Orders feature, including CRUD operations, status workflows, line item management, filtering/search, and navigation. The tests verify both UI interactions and data persistence.

**Total Test Coverage:**
- 16+ comprehensive E2E tests across 4 test suites
- Status workflow (5 tests)
- Line item management (4 tests)
- Filtering and search (4 tests)
- Navigation flows (3 tests)

---

## Test Environment Setup

### Prerequisites
\`\`\`bash
# Ensure dev server is running
cd frontend
npm run dev  # Port 3000

# Verify auth state exists
ls tests/.auth/user.json  # Should exist

# Run tests
npx playwright test tests/e2e/change-orders/
\`\`\`

### Test Data Conventions
- **Test Project ID:** 67 (Vermillion Rise Warehouse)
- **CO Number Prefix:** \`CO-E2E-*\` (with timestamp for uniqueness)
- **Cleanup Strategy:** Auto-cleanup in beforeEach/afterAll hooks
- **Test Isolation:** Each test creates and removes its own data

---

## Test Architecture

All tests follow E2E best practices documented in \`.claude/rules/E2E-TESTING-STANDARDS.md\`:

1. **Real User Actions** - Click buttons, fill forms, submit data (not just page load checks)
2. **UI Verification** - Check toasts, updated values, disabled states
3. **Persistence Verification** - Query database to confirm changes saved
4. **Test Isolation** - Each test is independent with own data
5. **Cleanup** - All test data removed in beforeEach/afterAll hooks

**What qualifies as an E2E test:**
- ✅ Opens a form and fills in fields
- ✅ Clicks submit and verifies success toast
- ✅ Checks database to confirm data persisted
- ✅ Tests complete user workflows (create → submit → approve → execute)

**What does NOT qualify:**
- ❌ Only checking page loads without errors
- ❌ Only verifying database has seeded data
- ❌ Never clicking buttons or filling forms

---

## Test Suite 1: Status Workflow

**File:** \`change-orders-comprehensive.spec.ts\`
**Test Suite:** "Change Orders - Status Workflow"

### Test 1.1: Submit Draft CO for Review

**Objective:** Verify draft change order can be submitted for approval

**Steps:**
1. Create a draft CO via database helper
2. Navigate to Change Orders list page
3. Click on the CO row to view detail
4. Verify detail page loads with correct title
5. Click "Submit" button
6. Verify success toast appears
7. Query database to confirm status changed to "pending"
8. Verify submitted_at timestamp is set

**Expected Results:**
- ✓ Submit button is visible on draft COs
- ✓ Success toast shows "submitted" message
- ✓ Status updates from "draft" to "pending"
- ✓ submitted_at field is populated with current timestamp

**Selectors:**
\`\`\`typescript
const coRow = page.getByRole('row').filter({ hasText: co.co_number });
const submitButton = page.getByRole('button', { name: /submit/i });
const successToast = page.getByText(/submitted/i);
\`\`\`

---

### Test 1.2: Approve Pending CO

**Objective:** Verify pending change order can be approved and updates contract value

**Steps:**
1. Create a pending CO with amount ($15,000) via database
2. Navigate to CO detail page
3. Click "Approve" button
4. Verify approval toast appears
5. Query database to confirm:
   - Status changed to "approved"
   - approved_at timestamp is set
   - Contract value updated (if applicable)

**Expected Results:**
- ✓ Approve button visible on pending COs
- ✓ Success toast shows "approved" message
- ✓ Status updates to "approved"
- ✓ approved_at timestamp populated
- ✓ Contract value reflects CO amount

**Selectors:**
\`\`\`typescript
const approveButton = page.getByRole('button', { name: /approve/i });
const approvalToast = page.getByText(/approved/i);
\`\`\`

---

### Test 1.3: Reject CO with Required Reason

**Objective:** Verify pending CO can be rejected with mandatory rejection reason

**Steps:**
1. Create a pending CO via database
2. Navigate to CO detail page
3. Click "Reject" button
4. Verify rejection reason dialog appears
5. Fill in rejection reason ("Cost exceeds budget constraints")
6. Click "Confirm" button in dialog
7. Verify rejection toast appears
8. Query database to confirm:
   - Status changed to "rejected"
   - rejection_reason field contains entered reason

**Expected Results:**
- ✓ Reject button visible on pending COs
- ✓ Dialog prompts for rejection reason
- ✓ Reason field is required
- ✓ Status updates to "rejected"
- ✓ Rejection reason saved in database

**Selectors:**
\`\`\`typescript
const rejectButton = page.getByRole('button', { name: /reject/i });
const dialog = page.getByRole('dialog');
const reasonField = dialog.getByRole('textbox', { name: /reason/i });
const confirmButton = dialog.getByRole('button', { name: /confirm/i });
\`\`\`

---

### Test 1.4: Execute Approved CO (Irreversible)

**Objective:** Verify approved CO can be executed with confirmation dialog

**Steps:**
1. Create an approved CO ($20,000) via database
2. Navigate to CO detail page
3. Click "Execute" button
4. Verify confirmation dialog appears
5. Verify dialog warns action is "irreversible"
6. Click "Confirm" button
7. Verify execution toast appears
8. Query database to confirm status is "executed"

**Expected Results:**
- ✓ Execute button visible on approved COs
- ✓ Confirmation dialog warns of irreversible action
- ✓ Status updates to "executed"
- ✓ Execution is permanent (cannot be undone)

**Selectors:**
\`\`\`typescript
const executeButton = page.getByRole('button', { name: /execute/i });
const confirmDialog = page.getByRole('dialog');
const irreversibleWarning = confirmDialog.getByText(/irreversible/i);
\`\`\`

---

### Test 1.5: Prevent Editing Executed CO

**Objective:** Verify executed COs are read-only and cannot be modified

**Steps:**
1. Create an executed CO via database
2. Navigate to CO detail page
3. Verify "Edit" button is NOT visible
4. Verify status badge shows "executed"
5. Attempt to access Line Items tab
6. Verify no add/edit/delete buttons are present

**Expected Results:**
- ✓ Edit button not visible on executed COs
- ✓ Status badge displays "executed"
- ✓ Line items are read-only
- ✓ No modification controls available

**Selectors:**
\`\`\`typescript
const editButton = page.getByRole('button', { name: /edit/i });
await expect(editButton).not.toBeVisible();
\`\`\`

---

## Test Suite 2: Line Item Management

**File:** \`change-orders-comprehensive.spec.ts\`
**Test Suite:** "Change Orders - Line Items"

### Test 2.1: Add Multiple Line Items and Calculate Total

**Objective:** Verify multiple line items can be added and total is calculated correctly

**Steps:**
1. Create a draft CO via database
2. Navigate to CO detail page
3. Click "Line Items" tab
4. Click "Add Line Item" button
5. Fill first item: "Concrete Work", qty=100, unit_cost=$50
6. Click "Save"
7. Verify first item appears in table
8. Dismiss success toast
9. Click "Add Line Item" button again
10. Fill second item: "Steel Framing", qty=200, unit_cost=$75
11. Click "Save"
12. Verify both items appear in table
13. Verify total displays $20,000 (100×$50 + 200×$75)

**Expected Results:**
- ✓ Dialog opens when "Add Line Item" clicked
- ✓ All fields (description, quantity, unit_cost) are editable
- ✓ Line items appear in table after saving
- ✓ Total calculation is accurate: $5,000 + $15,000 = $20,000

**Selectors:**
\`\`\`typescript
const lineItemsTab = page.getByRole('tab', { name: /line items/i });
const addButton = page.getByRole('button', { name: /add line item/i });
const dialog = page.getByRole('dialog');
const descriptionField = dialog.getByRole('textbox', { name: /description/i });
const quantityField = dialog.getByRole('spinbutton', { name: /quantity/i });
const unitCostField = dialog.getByRole('spinbutton', { name: /unit cost/i });
const totalDisplay = page.getByText(/\$20,000/);
\`\`\`

---

### Test 2.2: Edit Line Item Quantity and Recalculate Total

**Objective:** Verify line item quantity can be edited and total recalculates

**Steps:**
1. Create a CO with one line item via database (qty=50, cost=$100, total=$5,000)
2. Navigate to CO Line Items tab
3. Find the line item row
4. Click "Edit" button
5. Change quantity from 50 to 75
6. Click "Save"
7. Verify total updates to $7,500 (75 × $100)

**Expected Results:**
- ✓ Edit dialog opens with existing values pre-filled
- ✓ Quantity field can be modified
- ✓ Total recalculates on save: 75 × $100 = $7,500
- ✓ Line item displays new quantity

**Selectors:**
\`\`\`typescript
const itemRow = page.getByRole('row').filter({ hasText: 'Material Cost' });
const editButton = itemRow.getByRole('button', { name: /edit/i });
const quantityField = dialog.getByRole('spinbutton', { name: /quantity/i });
\`\`\`

---

### Test 2.3: Delete Line Item and Update Total

**Objective:** Verify line item can be deleted and total adjusts accordingly

**Steps:**
1. Create CO with two line items via database:
   - Item 1: qty=10, cost=$200, total=$2,000
   - Item 2: qty=5, cost=$300, total=$1,500
2. Navigate to CO Line Items tab
3. Find "Item to Delete" row
4. Click "Delete" button
5. Confirm deletion in dialog
6. Verify "Item to Delete" no longer visible
7. Verify total shows $1,500 (only remaining item)

**Expected Results:**
- ✓ Delete button visible on each line item
- ✓ Confirmation dialog appears before deletion
- ✓ Deleted item removed from table
- ✓ Total updates to reflect only remaining items

**Selectors:**
\`\`\`typescript
const itemRow = page.getByRole('row').filter({ hasText: 'Item to Delete' });
const deleteButton = itemRow.getByRole('button', { name: /delete/i });
const confirmDialog = page.getByRole('dialog');
const confirmButton = confirmDialog.getByRole('button', { name: /confirm/i });
\`\`\`

---

### Test 2.4: Read-Only Line Items When CO is Approved

**Objective:** Verify line items cannot be modified when CO is approved/executed

**Steps:**
1. Create an approved CO with one line item via database
2. Navigate to CO Line Items tab
3. Verify "Add Line Item" button is NOT visible
4. Verify "Edit" buttons are NOT visible
5. Verify "Delete" buttons are NOT visible
6. Verify line item data is displayed (read-only)

**Expected Results:**
- ✓ No add/edit/delete controls on approved COs
- ✓ Line items are displayed in read-only mode
- ✓ Data is accurate and visible

**Selectors:**
\`\`\`typescript
const addButton = page.getByRole('button', { name: /add line item/i });
const editButton = page.getByRole('button', { name: /edit/i });
const deleteButton = page.getByRole('button', { name: /delete/i });

await expect(addButton).not.toBeVisible();
await expect(editButton).not.toBeVisible();
await expect(deleteButton).not.toBeVisible();
\`\`\`

---

## Test Suite 3: Filtering and Search

**File:** \`change-orders-comprehensive.spec.ts\`
**Test Suite:** "Change Orders - Filtering and Search"

### Test 3.1: Filter by Status Tabs

**Objective:** Verify status tabs filter change orders correctly

**Setup:** Create 3 COs in different statuses:
- CO-E2E-DRAFT-001 (draft)
- CO-E2E-PENDING-001 (pending, submitted_at set)
- CO-E2E-APPROVED-001 (approved, submitted_at and approved_at set)

**Steps:**
1. Navigate to Change Orders list
2. Click "Draft" tab
3. Verify only CO-E2E-DRAFT-001 is visible
4. Verify other COs are NOT visible
5. Click "Pending" tab
6. Verify only CO-E2E-PENDING-001 is visible
7. Click "Approved" tab
8. Verify only CO-E2E-APPROVED-001 is visible

**Expected Results:**
- ✓ Each status tab filters correctly
- ✓ Only COs with matching status are displayed
- ✓ Tab switching updates the list immediately

**Selectors:**
\`\`\`typescript
const draftTab = page.getByRole('tab', { name: /draft/i });
const pendingTab = page.getByRole('tab', { name: /pending/i });
const approvedTab = page.getByRole('tab', { name: /approved/i });
\`\`\`

---

### Test 3.2: Search by CO Number

**Objective:** Verify search input filters by CO number

**Steps:**
1. Navigate to Change Orders list (with 3 COs from Test 3.1)
2. Find search input field
3. Enter "DRAFT-001"
4. Verify only CO-E2E-DRAFT-001 is visible
5. Verify other COs are hidden

**Expected Results:**
- ✓ Search filters by CO number
- ✓ Partial matches work
- ✓ Case-insensitive search
- ✓ Results update as user types

**Selectors:**
\`\`\`typescript
const searchInput = page.getByRole('textbox', { name: /search/i });
\`\`\`

---

### Test 3.3: Search by Title

**Objective:** Verify search input filters by CO title

**Steps:**
1. Navigate to Change Orders list
2. Enter "Approved" in search input
3. Verify only "Approved CO for Filtering" is visible
4. Verify other titles are hidden

**Expected Results:**
- ✓ Search filters by title text
- ✓ Partial matches work
- ✓ Results are case-insensitive

---

### Test 3.4: Clear Filters and Show All COs

**Objective:** Verify clearing filters restores full list

**Steps:**
1. Navigate to Change Orders list
2. Apply search filter ("DRAFT")
3. Verify filtered results
4. Clear the search input
5. Verify all 3 COs are visible again

**Expected Results:**
- ✓ Clearing search shows all COs
- ✓ All status tabs are accessible
- ✓ No filters remain applied

---

## Test Suite 4: Navigation

**File:** \`change-orders-comprehensive.spec.ts\`
**Test Suite:** "Change Orders - Navigation"

### Test 4.1: Navigate to Detail by Clicking Table Row

**Objective:** Verify clicking a CO row navigates to detail page

**Steps:**
1. Navigate to Change Orders list
2. Find CO row with "CO-E2E-NAV-001"
3. Click on the row
4. Verify URL changes to \`/31/change-orders/{id}\`
5. Verify page title shows CO title "Navigation Test CO"

**Expected Results:**
- ✓ Row click triggers navigation
- ✓ URL updates with CO ID
- ✓ Detail page loads with correct data

**Selectors:**
\`\`\`typescript
const coRow = page.getByRole('row').filter({ hasText: 'CO-E2E-NAV-001' });
await page.waitForURL(\`**/${testCO.id}\`);
\`\`\`

---

### Test 4.2: Navigate Between Tabs on Detail Page

**Objective:** Verify tab navigation works on detail page

**Steps:**
1. Navigate to CO detail page
2. Click "Line Items" tab
3. Verify "no line items" message appears (empty state)
4. Click "Attachments" tab
5. Verify "no attachments" message appears
6. Click "General" tab
7. Verify description field is visible

**Expected Results:**
- ✓ All tabs are clickable
- ✓ Tab content changes when clicked
- ✓ Empty states display correctly
- ✓ General tab shows CO details

**Selectors:**
\`\`\`typescript
const lineItemsTab = page.getByRole('tab', { name: /line items/i });
const attachmentsTab = page.getByRole('tab', { name: /attachments/i });
const generalTab = page.getByRole('tab', { name: /general/i });
\`\`\`

---

### Test 4.3: Return to List via Back Button

**Objective:** Verify back button returns to Change Orders list

**Steps:**
1. Navigate to Change Orders list
2. Click on a CO row to view detail
3. Verify detail page loads
4. Click "Back" button
5. Verify URL changes to \`/31/change-orders\`
6. Verify page title shows "Change Orders"
7. Verify CO is still visible in list

**Expected Results:**
- ✓ Back button is visible on detail page
- ✓ Clicking back navigates to list
- ✓ List page loads with all COs
- ✓ Previous scroll position maintained (optional)

**Selectors:**
\`\`\`typescript
const backButton = page.getByRole('button', { name: /back/i });
await page.waitForURL(\`**${BASE_URL}\`);
\`\`\`

---

## Additional Test Scenarios (Recommended)

### Validation Tests

**Not yet implemented but recommended:**

#### Test: Required Field Validation
- Leave title empty → verify error message
- Leave CO number empty → verify error message
- Submit form → verify validation prevents submission

#### Test: Numeric Field Validation
- Enter negative amount → verify error
- Enter non-numeric value → verify error
- Enter $0 amount → verify allowed or blocked based on business rules

#### Test: Duplicate CO Number Prevention
- Create CO with number "CO-001"
- Try to create another with "CO-001" → verify error

---

### Permissions Tests

**Not yet implemented but recommended:**

#### Test: Role-Based Access Control
- Viewer role: Can view, cannot edit/approve
- Editor role: Can edit, cannot approve
- Approver role: Can approve/reject
- Admin role: Full access

---

### Attachments Tests

**Not yet implemented but recommended:**

#### Test: Upload Attachment
- Navigate to Attachments tab
- Click "Upload" button
- Select file
- Verify file appears in list

#### Test: Download Attachment
- Click on attachment
- Verify file downloads

#### Test: Delete Attachment
- Click delete button
- Confirm deletion
- Verify attachment removed

---

## Test Data Management

### Database Helpers Used

\`\`\`typescript
// From tests/helpers/db.ts

// Create change order
createChangeOrder(input: ChangeOrderInput)

// Update status with workflow fields
updateChangeOrderStatus(id, status, fields?: {
  submitted_at?: string,
  approved_at?: string,
  approved_by?: string,
  rejection_reason?: string
})

// Line item operations
createChangeOrderLineItem(input: LineItemInput)
updateChangeOrderLineItem(id, updates)
deleteChangeOrderLineItem(id)
deleteChangeOrderLineItems(changeEventId)

// Cleanup
deleteTestChangeOrders(projectId, prefix = "CO-E2E-")
\`\`\`

### Cleanup Strategy

\`\`\`typescript
test.beforeEach(async ({ page }) => {
  // Clean up before each test
  await deleteTestChangeOrders(TEST_PROJECT_ID);
});

test.afterAll(async () => {
  // Final cleanup after all tests
  await deleteTestChangeOrders(TEST_PROJECT_ID);
});
\`\`\`

---

## Running the Tests

### Run All Change Order Tests
\`\`\`bash
cd frontend
npx playwright test tests/e2e/change-orders/
\`\`\`

### Run Comprehensive Tests Only
\`\`\`bash
npx playwright test tests/e2e/change-orders/change-orders-comprehensive.spec.ts
\`\`\`

### Run with UI Mode (Recommended for Debugging)
\`\`\`bash
npx playwright test --ui
\`\`\`

### Run Specific Test Suite
\`\`\`bash
# Status workflow tests
npx playwright test -g "Status Workflow"

# Line items tests
npx playwright test -g "Line Items"

# Filtering tests
npx playwright test -g "Filtering"

# Navigation tests
npx playwright test -g "Navigation"
\`\`\`

### Run Single Test
\`\`\`bash
npx playwright test -g "should submit draft CO for review"
\`\`\`

---

## Playwright Configuration

**Config Location:** \`frontend/config/playwright/playwright.config.ts\`

**Key Settings:**
- **Base URL:** http://localhost:3000
- **Test Port:** 3002 (avoids conflict with dev server)
- **Auth State:** \`tests/.auth/user.json\` (pre-configured)
- **Video:** On first retry (for debugging failures)
- **Screenshots:** On failure
- **Retries:** 2 (for flaky tests)
- **Workers:** 1 (serial execution, avoids race conditions)

---

## Success Criteria

A test is considered successful when ALL of these are verified:

1. ✓ **Action completes** - Button click, form submission, etc.
2. ✓ **UI feedback** - Success toast, error message, or status update
3. ✓ **Visual update** - Table row added/updated, status badge changed
4. ✓ **Data persistence** - Database query confirms change saved
5. ✓ **Calculated fields** - Totals, timestamps, derived values are accurate
6. ✓ **Cleanup** - Test data removed after execution

---

## Appendix: Complete Selector Reference

### List Page Selectors
\`\`\`typescript
// Page elements
const pageTitle = page.getByRole('heading', { name: 'Change Orders', level: 1 });
const newButton = page.getByRole('button', { name: /new change order/i });
const searchInput = page.getByRole('textbox', { name: /search/i });

// Status filter tabs
const allTab = page.getByRole('tab', { name: /all/i });
const draftTab = page.getByRole('tab', { name: /draft/i });
const pendingTab = page.getByRole('tab', { name: /pending/i });
const approvedTab = page.getByRole('tab', { name: /approved/i });
const rejectedTab = page.getByRole('tab', { name: /rejected/i });
const executedTab = page.getByRole('tab', { name: /executed/i });

// Table rows
const changeOrderRow = page.getByRole('row').filter({ hasText: 'CO-123' });
\`\`\`

### New/Edit Form Selectors
\`\`\`typescript
const dialog = page.getByRole('dialog');
const coNumberInput = page.locator('#co-number, input[name="co_number"]');
const titleInput = page.locator('#title, input[name="title"]');
const descriptionInput = page.locator('#description, textarea[name="description"]');
const amountInput = page.locator('#amount, input[name="amount"]');
const statusSelect = page.locator('#status, select[name="status"]');
const contractSelect = page.locator('#contract, select[name="contract_id"]');
const submitButton = page.getByRole('button', { name: /save|create/i });
const cancelButton = page.getByRole('button', { name: /cancel/i });
\`\`\`

### Detail Page Selectors
\`\`\`typescript
// Page elements
const detailTitle = page.locator('h1');
const statusBadge = page.getByText(/draft|pending|approved|rejected|executed/i);

// Action buttons
const editButton = page.getByRole('button', { name: /edit/i });
const submitForReviewButton = page.getByRole('button', { name: /submit/i });
const approveButton = page.getByRole('button', { name: /approve/i });
const rejectButton = page.getByRole('button', { name: /reject/i });
const executeButton = page.getByRole('button', { name: /execute/i });
const backButton = page.getByRole('button', { name: /back/i });

// Tabs
const generalTab = page.getByRole('tab', { name: /general/i });
const lineItemsTab = page.getByRole('tab', { name: /line items/i });
const attachmentsTab = page.getByRole('tab', { name: /attachments/i });
\`\`\`

### Line Items Selectors
\`\`\`typescript
// Line items table
const lineItemsTable = page.locator('table, [role="table"]');
const addLineItemButton = page.getByRole('button', { name: /add line item/i });
const lineItemRow = page.getByRole('row').filter({ hasText: 'Concrete Work' });

// Line item form
const descriptionField = dialog.getByRole('textbox', { name: /description/i });
const quantityField = dialog.getByRole('spinbutton', { name: /quantity/i });
const unitCostField = dialog.getByRole('spinbutton', { name: /unit cost/i });
const totalDisplay = page.getByText(/\$20,000/);

// Line item actions
const editLineItemButton = lineItemRow.getByRole('button', { name: /edit/i });
const deleteLineItemButton = lineItemRow.getByRole('button', { name: /delete/i });
\`\`\`

### Toast/Feedback Selectors
\`\`\`typescript
const successToast = page.getByText(/has been created|submitted|approved|rejected|executed/i);
const errorToast = page.getByText(/error|failed/i);
const closeToastButton = page.getByRole('button', { name: 'Close toast' });
\`\`\`

---

**End of Test Plan**
