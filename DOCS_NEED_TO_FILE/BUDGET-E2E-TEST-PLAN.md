# Budget Tool - Comprehensive E2E Test Plan

**Date:** 2026-02-21
**Project:** Alleato-PM
**Feature:** Budget Management Tool
**Test Framework:** Playwright

---

## Executive Summary

This document outlines a comprehensive E2E testing strategy for the Budget tool. The plan follows the E2E Testing Standards (`.claude/rules/E2E-TESTING-STANDARDS.md`) which mandate that tests must simulate real user workflows, not just smoke tests.

**Current State:**
- 23 existing budget test files in `frontend/tests/e2e/budget/`
- Many focus on specific features (modals, imports, grouping, views)
- Coverage exists but needs consolidation into core E2E workflows
- `budget-line-item-validation.spec.ts` is SKIPPED (marked as legacy)

**Gaps Identified:**
- No comprehensive CRUD workflow test (create → read → edit → delete in one flow)
- Missing inline budget line item creation tests
- Budget lock/unlock workflow tests incomplete
- Grand totals calculation verification missing
- Budget modifications workflow needs E2E coverage

---

## 1. Feature Analysis

### Core Budget Features

Based on code exploration (`frontend/src/app/(main)/[projectId]/budget/page.tsx`):

#### 1.1 Budget Line Items (Primary CRUD)
- **Create:**
  - Inline creation via table (new feature)
  - Bulk creation via modal (`BudgetLineItemCreatorModal`)
  - Import from CSV/Excel
- **Read:**
  - Main budget table with 14 calculated columns
  - Budget details table (separate tab)
  - Grouping by cost code tier, division, sub-job
  - Quick filters (all, over-budget, under-budget, at-risk, complete)
- **Update:**
  - Edit original budget amount
  - Edit quantity, UOM, unit cost
  - Create budget modifications (separate from line items)
- **Delete:**
  - Bulk delete selected line items
  - Confirmation dialog required

#### 1.2 Budget Calculations (Complex Business Logic)
Per `frontend/src/app/api/projects/[projectId]/budget/route.ts`:

**Core Budget Values:**
- Original Budget Amount
- Budget Modifications
- Approved Change Orders
- Revised Budget = Original + Modifications + Approved COs

**Cost Tracking:**
- Job to Date Cost Detail (ALL approved direct costs including Subcontractor Invoice)
- Direct Costs (approved types EXCLUDING Subcontractor Invoice)
- Pending Changes (pending budget change orders)
- Committed Costs (executed/approved commitments)
- Pending Cost Changes (pending commitments)

**Projections:**
- Projected Budget = Revised Budget + Pending Changes
- Projected Costs = Direct Costs + Committed Costs + Pending Cost Changes
- Forecast to Complete = max(0, Projected Budget - Projected Costs)
- Estimated Cost at Completion = Projected Costs + Forecast to Complete
- Projected Over/Under = Projected Budget - Estimated Cost at Completion

**Grand Totals:** Sum of all line items for each column

#### 1.3 Budget Lock/Unlock
- Lock state prevents all modifications
- Stores locked_by user and locked_at timestamp
- Unlocking restores full edit capabilities
- Lock status displayed in page header banner

#### 1.4 Views & Filters
- Custom budget views (create, clone, delete)
- Quick filters (all, over-budget, under-budget, at-risk, complete)
- Grouping (cost code tier 1, tier 2, division, sub-job)
- Snapshots (current, historical)

#### 1.5 Import/Export
- Import: CSV, Excel
- Export: CSV, Excel, PDF (coming soon)
- Validation during import
- Error reporting for failed imports

#### 1.6 Tabs
- **Budget Tab:** Main line items table
- **Budget Details Tab:** Detailed breakdown table
- **Cost Codes Tab:** Manage cost codes
- **Forecasting Tab:** Forecast management
- **Snapshots Tab:** Historical snapshots
- **Change History Tab:** Audit log

---

## 2. Test Scenarios (E2E Focus)

### 2.1 REQUIRED: Core CRUD Tests

#### Test 1: CREATE - Add Budget Line Item via Modal
**User Story:** As a project manager, I can create budget line items to establish the project budget.

**Prerequisites:**
- Test project created
- At least one cost code exists in the database
- Budget is unlocked

**Steps:**
1. Navigate to `/[projectId]/budget`
2. Click "Create" button (opens dropdown)
3. Select "Budget Line Item" from dropdown menu
4. Wait for "Add Budget Line Items" modal to appear
5. Fill form fields:
   - Budget Code: Select first available code (dropdown)
   - Amount: "50000"
   - Quantity: "10"
   - UOM: "EA"
   - Unit Cost: "5000"
6. Click "Create 1 Line Item" button
7. Modal should close
8. Success toast should appear: "Created 1 budget line item"
9. Verify new line item appears in budget table with correct values
10. Reload page - verify line item persists

**Assertions:**
```typescript
// Modal closes after submission
await expect(modal).not.toBeVisible({ timeout: 10000 });

// Success toast appears
await expect(page.getByText(/created.*budget line item/i)).toBeVisible();

// Line item appears in table
const tableRow = page.getByRole('row').filter({ hasText: budgetCode });
await expect(tableRow).toBeVisible();
await expect(tableRow.getByText('$50,000.00')).toBeVisible();

// Database persistence check
await pollFor(
  () => supabase.from('budget_lines').select('*').eq('project_id', projectId),
  (rows) => expect(rows.length).toBeGreaterThan(0)
);
```

**Cleanup:**
```typescript
test.afterAll(async () => {
  await supabase.from('budget_lines').delete().eq('project_id', projectId);
});
```

---

#### Test 2: READ - View Budget Line Items with Calculations
**User Story:** As a project manager, I can view budget line items with accurate financial calculations.

**Prerequisites:**
- Test project with seeded budget data:
  - 1 budget line: Original Amount = $100,000
  - 1 direct cost (approved): $25,000
  - 1 commitment (executed): $50,000
  - Expected calculations:
    - Revised Budget: $100,000
    - Job to Date: $25,000
    - Committed Costs: $50,000
    - Projected Costs: $75,000
    - Forecast to Complete: $25,000

**Steps:**
1. Navigate to `/[projectId]/budget`
2. Wait for table to load
3. Locate the seeded budget line item row
4. Verify all column values match expected calculations
5. Scroll to view grand totals row
6. Verify grand totals match sum of all line items

**Assertions:**
```typescript
const row = page.getByRole('row').filter({ hasText: testCostCode });

// Core values
await expect(row.getByRole('cell', { name: '$100,000.00' })).toBeVisible(); // Original Budget
await expect(row.getByRole('cell', { name: '$100,000.00' })).toBeVisible(); // Revised Budget

// Cost tracking
await expect(row.getByRole('cell', { name: '$25,000.00' })).toBeVisible(); // JTD
await expect(row.getByRole('cell', { name: '$50,000.00' })).toBeVisible(); // Committed

// Projections
await expect(row.getByRole('cell', { name: '$75,000.00' })).toBeVisible(); // Projected Costs
await expect(row.getByRole('cell', { name: '$25,000.00' })).toBeVisible(); // Forecast to Complete

// Grand totals
const totalsRow = page.locator('[data-testid="grand-totals-row"]');
await expect(totalsRow.getByText('$100,000.00')).toBeVisible(); // Total Original Budget
```

**Data Seed:**
```typescript
test.beforeEach(async () => {
  // Create budget line
  const { data: budgetLine } = await supabase.from('budget_lines').insert({
    project_id: projectId,
    cost_code_id: testCostCodeId,
    original_amount: 100000,
  }).select().single();

  // Create approved direct cost
  const { data: directCost } = await supabase.from('direct_costs').insert({
    project_id: projectId,
    cost_type: 'Invoice',
    status: 'Approved',
  }).select().single();

  await supabase.from('direct_cost_line_items').insert({
    direct_cost_id: directCost.id,
    budget_code_id: testCostCodeId,
    line_total: 25000,
  });

  // Create executed commitment
  const { data: commitment } = await supabase.from('commitments').insert({
    project_id: projectId,
    commitment_type: 'subcontract',
    status: 'executed',
  }).select().single();

  await supabase.from('subcontract_sov_items').insert({
    subcontract_id: commitment.id,
    budget_code: testCostCodeId,
    amount: 50000,
  });
});
```

---

#### Test 3: UPDATE - Edit Budget Line Item
**User Story:** As a project manager, I can update budget line item quantities and costs.

**Prerequisites:**
- Test project with 1 budget line item
- Budget is unlocked

**Steps:**
1. Navigate to `/[projectId]/budget`
2. Click on the budget line item row to open edit modal
3. Modify fields:
   - Quantity: Change from "10" to "15"
   - Unit Cost: Change from "5000" to "6000"
   - (Original Budget should auto-update to $90,000)
4. Click "Save" button
5. Modal closes
6. Verify updated values appear in table
7. Reload page - verify changes persist

**Assertions:**
```typescript
// Click row to open edit modal
await page.getByRole('row').filter({ hasText: testCostCode }).click();
const editModal = page.getByRole('dialog', { name: /edit.*budget/i });
await expect(editModal).toBeVisible();

// Update fields
await page.getByLabel('Quantity').fill('15');
await page.getByLabel('Unit Cost').fill('6000');

// Auto-calculated field updates
await expect(page.getByLabel('Original Budget')).toHaveValue('90000.00');

// Save
await page.getByRole('button', { name: 'Save' }).click();
await expect(editModal).not.toBeVisible({ timeout: 10000 });

// Success toast
await expect(page.getByText(/updated successfully/i)).toBeVisible();

// Verify in table
const row = page.getByRole('row').filter({ hasText: testCostCode });
await expect(row.getByText('15')).toBeVisible(); // Quantity
await expect(row.getByText('$6,000.00')).toBeVisible(); // Unit Cost
await expect(row.getByText('$90,000.00')).toBeVisible(); // Original Budget
```

---

#### Test 4: DELETE - Remove Budget Line Items
**User Story:** As a project manager, I can delete budget line items that are no longer needed.

**Prerequisites:**
- Test project with 3 budget line items
- Budget is unlocked

**Steps:**
1. Navigate to `/[projectId]/budget`
2. Select checkbox for 2 line items
3. Verify selection action bar appears: "2 item(s) selected"
4. Click "Delete Selected" button
5. Confirmation dialog appears
6. Click "Delete" button in dialog
7. Dialog closes
8. Success toast: "2 line item(s) deleted successfully"
9. Verify selected items are removed from table
10. Verify remaining item still exists
11. Reload page - verify deletion persisted

**Assertions:**
```typescript
// Select items
await page.getByRole('checkbox', { name: `Select ${testCostCode1}` }).click();
await page.getByRole('checkbox', { name: `Select ${testCostCode2}` }).click();

// Selection bar appears
await expect(page.getByText('2 item(s) selected')).toBeVisible();

// Delete button
await page.getByRole('button', { name: /delete selected/i }).click();

// Confirmation dialog
const dialog = page.getByRole('alertdialog');
await expect(dialog).toBeVisible();
await expect(dialog.getByText(/delete 2.*line item/i)).toBeVisible();

// Confirm
await dialog.getByRole('button', { name: 'Delete' }).click();
await expect(dialog).not.toBeVisible({ timeout: 10000 });

// Success feedback
await expect(page.getByText('2 line item(s) deleted')).toBeVisible();

// Verify removed from table
await expect(page.getByRole('row').filter({ hasText: testCostCode1 })).not.toBeVisible();
await expect(page.getByRole('row').filter({ hasText: testCostCode2 })).not.toBeVisible();

// Verify remaining item exists
await expect(page.getByRole('row').filter({ hasText: testCostCode3 })).toBeVisible();
```

---

### 2.2 REQUIRED: Form Validation Tests

#### Test 5: Validation - Empty Required Fields
**User Story:** As a project manager, I receive clear error messages when I forget required fields.

**Prerequisites:**
- Test project
- Budget unlocked

**Steps:**
1. Navigate to `/[projectId]/budget`
2. Click "Create" → "Budget Line Item"
3. Modal opens
4. Leave all fields empty
5. Click "Create 1 Line Item" button
6. Modal should NOT close
7. Specific validation errors appear (NOT generic "failed to create")

**Assertions:**
```typescript
// Modal stays open
await submitButton.click();
await expect(modal).toBeVisible();

// Specific validation errors (NOT generic)
const errorText = await page.locator('[role="alert"], [data-sonner-toast]').first().textContent();

// Should NOT say generic errors
expect(errorText?.toLowerCase()).not.toContain('failed to create');
expect(errorText?.toLowerCase()).not.toContain('unexpected error');

// SHOULD say specific field names
expect(errorText?.toLowerCase()).toMatch(/budget code|amount|required/);
```

---

#### Test 6: Validation - Invalid Amount Values
**User Story:** As a project manager, I am prevented from entering invalid financial amounts.

**Steps:**
1. Open budget line item creation modal
2. Select budget code
3. Enter invalid amounts:
   - Negative: "-5000"
   - Non-numeric: "abc123"
   - Excessive decimals: "5000.12345"
4. Attempt to submit
5. Verify specific validation errors for each case

**Assertions:**
```typescript
// Negative amount
await amountInput.fill('-5000');
await submitButton.click();
await expect(page.getByText(/amount.*positive|invalid amount/i)).toBeVisible();

// Non-numeric
await amountInput.fill('abc123');
await submitButton.click();
await expect(page.getByText(/amount.*number|invalid amount/i)).toBeVisible();

// Excessive decimals
await amountInput.fill('5000.12345');
await submitButton.click();
// Should auto-format to 2 decimals or show validation
```

---

### 2.3 Budget Lock/Unlock Workflow

#### Test 7: Lock Budget - Prevent Edits
**User Story:** As a project accountant, I can lock the budget to prevent unauthorized changes.

**Steps:**
1. Navigate to `/[projectId]/budget`
2. Verify "Lock Budget" button exists in header
3. Click "Lock Budget"
4. Success toast: "Budget locked successfully"
5. Lock banner appears: "Budget is locked. Last locked by [user] on [date]"
6. Attempt to click "Create" button
7. Error toast: "Budget is locked. Unlock to add new line items."
8. Attempt to edit existing line item
9. Error toast: "Budget is locked. Unlock to edit line items."
10. Attempt to delete line item
11. Error toast: "Budget is locked. Unlock to delete line items."

**Assertions:**
```typescript
// Lock budget
await page.getByRole('button', { name: 'Lock Budget' }).click();
await expect(page.getByText('Budget locked successfully')).toBeVisible();

// Lock banner visible
const banner = page.locator('[data-testid="budget-lock-banner"]');
await expect(banner).toBeVisible();
await expect(banner.getByText(/budget is locked/i)).toBeVisible();

// Create blocked
await page.getByRole('button', { name: 'Create' }).click();
await expect(page.getByText(/budget is locked.*unlock to add/i)).toBeVisible();

// Edit blocked
await page.getByRole('row').filter({ hasText: testCostCode }).click();
await expect(page.getByText(/budget is locked.*unlock to edit/i)).toBeVisible();

// Database check
const { data } = await supabase.from('projects').select('budget_locked_at, budget_locked_by').eq('id', projectId).single();
expect(data.budget_locked_at).toBeTruthy();
expect(data.budget_locked_by).toBe(currentUserId);
```

---

#### Test 8: Unlock Budget - Restore Edit Capabilities
**User Story:** As a project manager, I can unlock the budget to make necessary changes.

**Prerequisites:**
- Budget is locked (from Test 7)

**Steps:**
1. On budget page with locked state
2. Click "Unlock Budget" button
3. Success toast: "Budget unlocked successfully"
4. Lock banner disappears
5. Create budget line item successfully
6. Edit existing line item successfully
7. Delete line item successfully

**Assertions:**
```typescript
// Unlock
await page.getByRole('button', { name: 'Unlock Budget' }).click();
await expect(page.getByText('Budget unlocked successfully')).toBeVisible();

// Banner gone
await expect(page.locator('[data-testid="budget-lock-banner"]')).not.toBeVisible();

// Create works
await page.getByRole('button', { name: 'Create' }).click();
await expect(page.getByRole('dialog')).toBeVisible(); // Modal opens

// Edit works
await page.getByRole('row').filter({ hasText: testCostCode }).click();
await expect(page.getByRole('dialog', { name: /edit/i })).toBeVisible();

// Database check
const { data } = await supabase.from('projects').select('budget_locked_at').eq('id', projectId).single();
expect(data.budget_locked_at).toBeNull();
```

---

### 2.4 Advanced Features

#### Test 9: Budget Modifications - Create and Apply
**User Story:** As a project manager, I can create budget modifications to adjust the budget after it's baselined.

**Prerequisites:**
- Test project with 1 budget line item (Original: $100,000)

**Steps:**
1. Navigate to `/[projectId]/budget`
2. Click "Create" → "Budget Modification"
3. Fill modification form:
   - Cost Code: Select existing code
   - Amount: "$10,000"
   - Reason: "Additional scope added"
4. Click "Create Modification"
5. Modal closes
6. Verify budget line item now shows:
   - Original Budget: $100,000
   - Budget Modifications: $10,000
   - Revised Budget: $110,000
7. Grand totals updated accordingly

**Assertions:**
```typescript
// Create modification
await page.getByRole('button', { name: /create.*modification/i }).click();
const modal = page.getByRole('dialog', { name: /budget modification/i });
await expect(modal).toBeVisible();

await modal.getByLabel('Cost Code').selectOption(testCostCodeId);
await modal.getByLabel('Amount').fill('10000');
await modal.getByLabel('Reason').fill('Additional scope added');
await modal.getByRole('button', { name: 'Create' }).click();

// Modal closes
await expect(modal).not.toBeVisible();

// Verify in table
const row = page.getByRole('row').filter({ hasText: testCostCode });
await expect(row.getByRole('cell', { name: '$100,000.00' })).toBeVisible(); // Original
await expect(row.getByRole('cell', { name: '$10,000.00' })).toBeVisible(); // Modifications
await expect(row.getByRole('cell', { name: '$110,000.00' })).toBeVisible(); // Revised

// Grand totals
const totalsRow = page.locator('[data-testid="grand-totals-row"]');
await expect(totalsRow.getByText('$110,000.00')).toBeVisible(); // Total Revised
```

---

#### Test 10: Quick Filters - Filter Budget Lines
**User Story:** As a project manager, I can filter budget lines to focus on specific categories.

**Prerequisites:**
- Test project with budget lines:
  - Line 1: Revised $100k, Projected Costs $120k (Over Budget)
  - Line 2: Revised $50k, Projected Costs $30k (Under Budget)
  - Line 3: Revised $75k, Projected Costs $75k (On Budget)

**Steps:**
1. Navigate to `/[projectId]/budget`
2. Default filter: "All" - all 3 lines visible
3. Click "Over Budget" quick filter
4. Only Line 1 visible
5. Click "Under Budget" quick filter
6. Only Line 2 visible
7. Click "At Risk" quick filter
8. Only Line 1 visible (over budget is at risk)
9. Click "All" to reset
10. All 3 lines visible again

**Assertions:**
```typescript
// All items visible
await expect(page.getByRole('row').filter({ hasText: costCode1 })).toBeVisible();
await expect(page.getByRole('row').filter({ hasText: costCode2 })).toBeVisible();
await expect(page.getByRole('row').filter({ hasText: costCode3 })).toBeVisible();

// Over Budget filter
await page.getByRole('button', { name: 'Over Budget' }).click();
await expect(page.getByRole('row').filter({ hasText: costCode1 })).toBeVisible();
await expect(page.getByRole('row').filter({ hasText: costCode2 })).not.toBeVisible();
await expect(page.getByRole('row').filter({ hasText: costCode3 })).not.toBeVisible();

// Under Budget filter
await page.getByRole('button', { name: 'Under Budget' }).click();
await expect(page.getByRole('row').filter({ hasText: costCode2 })).toBeVisible();
await expect(page.getByRole('row').filter({ hasText: costCode1 })).not.toBeVisible();

// Reset
await page.getByRole('button', { name: 'All' }).click();
await expect(page.getByRole('row').filter({ hasText: costCode1 })).toBeVisible();
await expect(page.getByRole('row').filter({ hasText: costCode2 })).toBeVisible();
await expect(page.getByRole('row').filter({ hasText: costCode3 })).toBeVisible();
```

---

#### Test 11: Import Budget - CSV Upload
**User Story:** As a project manager, I can import budget data from CSV to bulk-load my budget.

**Prerequisites:**
- CSV file prepared with valid budget data:
  ```csv
  Cost Code,Description,Amount,Quantity,UOM,Unit Cost
  01-100,Site Preparation,50000,1,LS,50000
  02-200,Foundation Work,75000,100,CY,750
  03-300,Framing,120000,1000,SF,120
  ```

**Steps:**
1. Navigate to `/[projectId]/budget`
2. Click "Import" button
3. Import modal opens
4. Click "Choose File" button
5. Select CSV file
6. Preview shows 3 rows with data
7. Click "Import" button
8. Progress indicator shows importing
9. Success toast: "Imported 3 budget line items"
10. Modal closes
11. Verify 3 new line items in table with correct values

**Assertions:**
```typescript
// Open import modal
await page.getByRole('button', { name: 'Import' }).click();
const modal = page.getByRole('dialog', { name: /import/i });
await expect(modal).toBeVisible();

// Upload file
const fileInput = modal.locator('input[type="file"]');
await fileInput.setInputFiles('/path/to/test-budget.csv');

// Preview appears
await expect(modal.getByText('3 rows')).toBeVisible();
await expect(modal.getByText('01-100')).toBeVisible();
await expect(modal.getByText('02-200')).toBeVisible();
await expect(modal.getByText('03-300')).toBeVisible();

// Import
await modal.getByRole('button', { name: 'Import' }).click();

// Progress
await expect(modal.getByText(/importing/i)).toBeVisible();

// Success
await expect(page.getByText('Imported 3 budget line items')).toBeVisible();
await expect(modal).not.toBeVisible();

// Verify in table
await expect(page.getByRole('row').filter({ hasText: '01-100' })).toBeVisible();
await expect(page.getByRole('row').filter({ hasText: '02-200' })).toBeVisible();
await expect(page.getByRole('row').filter({ hasText: '03-300' })).toBeVisible();
```

---

#### Test 12: Export Budget - Excel Download
**User Story:** As a project manager, I can export budget data to Excel for reporting.

**Prerequisites:**
- Test project with 5 budget line items

**Steps:**
1. Navigate to `/[projectId]/budget`
2. Click "Export" dropdown button
3. Select "Excel" option
4. Loading toast appears: "Preparing EXCEL export..."
5. Download starts automatically
6. Success toast: "Export completed successfully!"
7. Downloaded file exists
8. Open Excel file and verify:
   - Contains 5 budget line items
   - All columns present (Original Budget, Revised Budget, etc.)
   - Grand totals row at bottom

**Assertions:**
```typescript
// Click export
await page.getByRole('button', { name: 'Export' }).click();
await page.getByRole('menuitem', { name: 'Excel' }).click();

// Loading toast
await expect(page.getByText(/preparing.*excel.*export/i)).toBeVisible();

// Wait for download
const download = await page.waitForEvent('download', { timeout: 30000 });
const path = await download.path();
expect(path).toBeTruthy();

// Success toast
await expect(page.getByText(/export completed successfully/i)).toBeVisible();

// Verify filename
const filename = download.suggestedFilename();
expect(filename).toMatch(/budget.*\.xlsx$/);

// Verify file size > 0
const fs = require('fs');
const stats = fs.statSync(path);
expect(stats.size).toBeGreaterThan(0);
```

---

## 3. Selectors & UI Elements

### Key UI Components

| Element | Role | Selector | Notes |
|---------|------|----------|-------|
| **Create Button** | `button` | `page.getByRole('button', { name: /create/i })` | Opens dropdown menu |
| **Budget Line Item Option** | `menuitem` | `page.getByRole('menuitem', { name: 'Budget Line Item' })` | In Create dropdown |
| **Budget Modification Option** | `menuitem` | `page.getByRole('menuitem', { name: 'Budget Modification' })` | In Create dropdown |
| **Add Line Items Modal** | `dialog` | `page.getByRole('dialog', { name: /add budget line items/i })` | Creation modal |
| **Edit Modal** | `dialog` | `page.getByRole('dialog', { name: /edit.*budget/i })` | Edit modal |
| **Budget Table** | `table` | `page.locator('table')` | Main data table |
| **Budget Table Row** | `row` | `page.getByRole('row').filter({ hasText: costCode })` | Specific row |
| **Grand Totals Row** | Custom | `page.locator('[data-testid="grand-totals-row"]')` | Totals footer |
| **Selection Bar** | Custom | `page.getByText(/item\(s\) selected/)` | Appears when items selected |
| **Delete Button** | `button` | `page.getByRole('button', { name: /delete selected/i })` | In selection bar |
| **Delete Dialog** | `alertdialog` | `page.getByRole('alertdialog')` | Confirmation dialog |
| **Lock Budget Button** | `button` | `page.getByRole('button', { name: 'Lock Budget' })` | In header |
| **Unlock Budget Button** | `button` | `page.getByRole('button', { name: 'Unlock Budget' })` | In header when locked |
| **Lock Banner** | Custom | `page.locator('[data-testid="budget-lock-banner"]')` | Lock status banner |
| **Quick Filter Buttons** | `button` | `page.getByRole('button', { name: 'Over Budget' })` | Filter bar |
| **Import Button** | `button` | `page.getByRole('button', { name: 'Import' })` | Header actions |
| **Export Button** | `button` | `page.getByRole('button', { name: 'Export' })` | Header dropdown |
| **Success Toast** | Custom | `page.getByText(/success|created|updated/i)` | Sonner toast |
| **Error Toast** | Custom | `page.getByText(/error|failed/i)` | Sonner toast |

### Form Field Selectors

| Field | Label | Selector |
|-------|-------|----------|
| **Budget Code** | "Budget Code" | `page.getByLabel('Budget Code')` |
| **Amount** | "Amount" | `page.getByLabel('Amount')` or `page.locator('input[value="0.00"]')` |
| **Quantity** | "Quantity" | `page.getByLabel('Quantity')` or `page.getByPlaceholder('Quantity')` |
| **UOM** | "UOM" or "Unit of Measure" | `page.getByLabel('UOM')` |
| **Unit Cost** | "Unit Cost" | `page.getByLabel('Unit Cost')` or `page.getByPlaceholder('Unit cost')` |
| **Description** | "Description" | `page.getByLabel('Description')` |
| **Reason** | "Reason" | `page.getByLabel('Reason')` (for modifications) |

---

## 4. Test Data Requirements

### Seed Data Structure

For each test suite, create isolated test data:

#### Minimal Seed (CRUD Tests)
```typescript
const testData = {
  project: {
    id: 12345,
    name: "E2E Budget Test Project",
    original_budget: 0,
    current_budget: 0,
  },
  costCodes: [
    { id: "01-100", title: "Site Preparation", division_id: "01" },
    { id: "02-200", title: "Foundation Work", division_id: "02" },
    { id: "03-300", title: "Framing", division_id: "03" },
  ],
  costTypes: [
    { id: "L", code: "L", description: "Labor" },
    { id: "M", code: "M", description: "Material" },
    { id: "E", code: "E", description: "Equipment" },
  ],
};
```

#### Comprehensive Seed (Calculation Tests)
```typescript
const complexTestData = {
  project: { /* same as above */ },
  costCodes: [ /* same as above */ ],
  budgetLines: [
    {
      id: "bl-1",
      project_id: 12345,
      cost_code_id: "01-100",
      original_amount: 100000,
      quantity: 10,
      unit_of_measure: "EA",
      unit_cost: 10000,
    },
  ],
  directCosts: [
    {
      id: "dc-1",
      project_id: 12345,
      cost_type: "Invoice",
      status: "Approved",
    },
  ],
  directCostLineItems: [
    {
      direct_cost_id: "dc-1",
      budget_code_id: "01-100",
      line_total: 25000,
    },
  ],
  commitments: [
    {
      id: "cm-1",
      project_id: 12345,
      commitment_type: "subcontract",
      status: "executed",
    },
  ],
  subcontractSovItems: [
    {
      subcontract_id: "cm-1",
      budget_code: "01-100",
      amount: 50000,
    },
  ],
};
```

### Cleanup Strategy

**Use `test.afterAll` to clean up test data in reverse dependency order:**

```typescript
test.afterAll(async () => {
  if (!projectId) return;

  // Delete in reverse dependency order
  await supabase.from('direct_cost_line_items')
    .delete()
    .in('direct_cost_id', directCostIds);

  await supabase.from('direct_costs')
    .delete()
    .eq('project_id', projectId);

  await supabase.from('subcontract_sov_items')
    .delete()
    .in('subcontract_id', commitmentIds);

  await supabase.from('commitments')
    .delete()
    .eq('project_id', projectId);

  await supabase.from('budget_modifications')
    .delete()
    .eq('project_id', projectId);

  await supabase.from('budget_lines')
    .delete()
    .eq('project_id', projectId);

  await supabase.from('project_cost_codes')
    .delete()
    .eq('project_id', projectId);

  await supabase.from('projects')
    .delete()
    .eq('id', projectId);
});
```

---

## 5. Implementation Guidelines

### File Organization

```
frontend/tests/e2e/budget/
├── budget-core.spec.ts              # NEW: Core CRUD workflows (Tests 1-4)
├── budget-validation.spec.ts        # NEW: Form validation (Tests 5-6)
├── budget-lock-unlock.spec.ts       # NEW: Lock/unlock workflows (Tests 7-8)
├── budget-modifications.spec.ts     # NEW: Budget modifications (Test 9)
├── budget-filters.spec.ts           # NEW: Quick filters (Test 10)
├── budget-import-export.spec.ts     # Refactor existing into (Tests 11-12)
├── budget-calculations.spec.ts      # NEW: Grand totals and calculations (Test 2)
└── helpers/
    ├── budget-seeds.ts              # Reusable seed data functions
    ├── budget-assertions.ts         # Reusable assertion helpers
    └── budget-cleanup.ts            # Cleanup utilities
```

### Recommended Test Execution Order

1. **Start with `budget-core.spec.ts`** - Validates basic CRUD works
2. **Then `budget-validation.spec.ts`** - Ensures error handling works
3. **Then `budget-calculations.spec.ts`** - Verifies business logic
4. **Finally advanced features** - Filters, imports, locks

### Authentication

**Tests use pre-configured auth (saved in `frontend/tests/.auth/user.json`):**

```typescript
import { test } from '../../fixtures/index';

test.describe('Budget Core CRUD', () => {
  // Auth is automatic - no login code needed
  test('creates budget line item', async ({ page }) => {
    await page.goto(`/${projectId}/budget`);
    // Test continues...
  });
});
```

**DO NOT add login code to individual tests!** See `.claude/rules/AUTHENTICATION-NEVER-ASK-AGAIN.md`.

---

## 6. Success Criteria

### Test Coverage Targets

- **Core CRUD:** 100% coverage (Create, Read, Update, Delete)
- **Form Validation:** All required fields tested
- **Business Logic:** Grand totals calculations verified
- **Lock/Unlock:** Complete workflow tested
- **Quick Filters:** All filter types tested
- **Import/Export:** CSV and Excel tested

### Quality Standards (from E2E-TESTING-STANDARDS.md)

**Every test MUST:**
- [ ] Simulate real user actions (click buttons, fill forms, submit)
- [ ] Verify result appears in UI (toast, table row, updated field)
- [ ] Verify data persisted (reload page or check database)
- [ ] Clean up test data in `afterAll`
- [ ] Use role-based selectors (prefer `getByRole` over CSS selectors)
- [ ] Include descriptive assertion messages

**Tests MUST NOT:**
- [ ] Only check "page loads without errors" (smoke tests)
- [ ] Query database without UI interaction
- [ ] Skip form submission
- [ ] Assume data without verifying

---

## 7. Existing Tests Audit

### Current Coverage

| Test File | Focus | E2E Compliant? | Notes |
|-----------|-------|----------------|-------|
| `budget-comprehensive.spec.ts` | Page load | ❌ Smoke test | Only checks table loads |
| `budget-line-item-validation.spec.ts` | Validation | ⚠️ Partial | **SKIPPED** - marked as legacy |
| `budget-line-items-api.spec.ts` | API CRUD | ❌ Not E2E | Tests API directly, not UI |
| `budget-import-export-comprehensive.spec.ts` | Import/Export | ✅ Good | Tests full workflow |
| `budget-modals.spec.ts` | Modal opens | ❌ Smoke test | Only checks modals open |
| `budget-views-ui.spec.ts` | Custom views | ✅ Good | Creates/deletes views |
| `budget-grouping.spec.ts` | Grouping | ✅ Good | Tests grouping behavior |
| `budget-details.spec.ts` | Details tab | ⚠️ Partial | Checks tab switch |

### Gaps to Fill

1. **No comprehensive CRUD test** - Tests exist but scattered
2. **Validation tests skipped** - Need to unskip and modernize
3. **No lock/unlock E2E test** - Feature exists but not tested
4. **No grand totals verification** - Calculations not validated
5. **No inline creation test** - New feature not tested

---

## 8. Next Steps

### Phase 1: Core CRUD (Week 1)
- [ ] Implement `budget-core.spec.ts` with Tests 1-4
- [ ] Create `helpers/budget-seeds.ts` for reusable test data
- [ ] Create `helpers/budget-cleanup.ts` for cleanup utilities
- [ ] Run tests and verify 100% pass rate

### Phase 2: Validation & Lock (Week 2)
- [ ] Implement `budget-validation.spec.ts` with Tests 5-6
- [ ] Implement `budget-lock-unlock.spec.ts` with Tests 7-8
- [ ] Update `.github/workflows/playwright.yml` to run budget tests
- [ ] Run full budget suite and verify no flaky tests

### Phase 3: Advanced Features (Week 3)
- [ ] Implement `budget-modifications.spec.ts` with Test 9
- [ ] Implement `budget-filters.spec.ts` with Test 10
- [ ] Refactor existing import/export tests (Tests 11-12)
- [ ] Document any remaining gaps

### Phase 4: Calculations (Week 4)
- [ ] Implement `budget-calculations.spec.ts` with Test 2
- [ ] Add complex seed data for multi-line calculations
- [ ] Verify grand totals match expected values
- [ ] Stress test with 100+ budget lines

---

## Appendix A: Database Schema Reference

**Key Tables:**

- `budget_lines` - Main budget line items table
  - Columns: `id`, `project_id`, `cost_code_id`, `cost_type_id`, `original_amount`, `quantity`, `unit_of_measure`, `unit_cost`, `description`
  - View: `v_budget_lines` (includes pre-calculated values)

- `budget_modifications` - Budget change records
  - Columns: `id`, `project_id`, `cost_code_id`, `amount`, `reason`, `status`

- `cost_codes` - Standard cost codes
  - Columns: `id`, `code`, `title`, `division_id`, `status`

- `cost_code_types` - Cost type definitions
  - Columns: `id`, `code`, `description`

- `direct_costs` - Direct cost header records
  - Columns: `id`, `project_id`, `cost_type`, `status`

- `direct_cost_line_items` - Direct cost line items
  - Columns: `id`, `direct_cost_id`, `budget_code_id`, `line_total`

- `commitments` - Subcontracts and Purchase Orders
  - Columns: `id`, `project_id`, `commitment_type`, `status`

- `subcontract_sov_items` - Subcontract SOV line items
  - Columns: `id`, `subcontract_id`, `budget_code`, `amount`

**Foreign Key Reference (.claude/FK-TYPES-REFERENCE.md):**

- `budget_lines.project_id` → `projects.id` (INTEGER)
- `budget_lines.cost_code_id` → `cost_codes.id` (TEXT)
- `budget_lines.cost_type_id` → `cost_code_types.id` (TEXT)

---

## Appendix B: API Routes Reference

**Budget API Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/projects/[projectId]/budget` | Fetch all budget lines with calculations |
| POST | `/api/projects/[projectId]/budget` | Create budget line items (bulk) |
| PATCH | `/api/projects/[projectId]/budget/lines/[lineId]` | Update budget line item |
| DELETE | `/api/projects/[projectId]/budget/lines/[lineId]` | Delete budget line item |
| GET | `/api/projects/[projectId]/budget/details` | Fetch budget details table data |
| POST | `/api/projects/[projectId]/budget/lock` | Lock budget |
| DELETE | `/api/projects/[projectId]/budget/lock` | Unlock budget |
| POST | `/api/projects/[projectId]/budget/import` | Import budget from CSV/Excel |
| GET | `/api/projects/[projectId]/budget/export?format=excel` | Export budget to Excel |
| GET | `/api/projects/[projectId]/budget/export?format=csv` | Export budget to CSV |
| GET | `/api/projects/[projectId]/budget/modifications` | Fetch budget modifications |
| POST | `/api/projects/[projectId]/budget/modifications` | Create budget modification |

---

**End of Test Plan**
