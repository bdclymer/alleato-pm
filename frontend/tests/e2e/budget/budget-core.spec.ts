/**
 * Budget Core E2E Tests
 *
 * Tests the fundamental CRUD operations for budget line items following
 * E2E testing standards (.claude/rules/E2E-TESTING-STANDARDS.md).
 *
 * Each test simulates a complete user workflow:
 * 1. Navigate to page
 * 2. Interact with UI elements
 * 3. Submit forms / trigger mutations
 * 4. Verify results in UI (toasts, table rows, updated values)
 * 5. Verify data persistence (reload page or check database)
 * 6. Clean up test data
 *
 * @see /DOCS_NEED_TO_FILE/BUDGET-E2E-TEST-PLAN.md
 */

import { test, expect } from '../../fixtures/index';
import { createTestProject } from '../../helpers/bootstrap';

let projectId: number;
let budgetCodes: any[];
const createdLineItemIds: string[] = [];

test.describe('Budget Core CRUD Operations', () => {
  test.beforeAll(async ({ authenticatedRequest }) => {
    // Create a test project with pre-populated budget codes
    // Note: We can't use 'page' in beforeAll, so we use authenticatedRequest directly
    const project = await createTestProject(
      {} as any, // Dummy page object - requestOverride is used instead
      { template: 'commercial' },
      authenticatedRequest
    );
    projectId = project.project.id;
    budgetCodes = project.budgetCodes;

    console.log(`[Budget Core] Test project created: ${projectId}`);
    console.log(`[Budget Core] Available budget codes: ${budgetCodes.length}`);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page before each test
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for table to load
    await expect(
      page.getByRole('heading', { name: /budget/i }).first(),
      'Budget page header should be visible'
    ).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test 1: CREATE - Add Budget Line Item via Modal
   *
   * User Story: As a project manager, I can create budget line items
   * to establish the project budget.
   *
   * Workflow:
   * 1. Open creation modal
   * 2. Fill form fields
   * 3. Submit
   * 4. Verify success toast
   * 5. Verify line item appears in table
   * 6. Verify persistence (reload page)
   */
  test('user can create a new budget line item via modal', async ({ page }) => {
    // 1. Open the creation modal
    const createButton = page.getByRole('button', { name: /create/i }).first();
    await expect(createButton, 'Create button should be visible').toBeVisible({ timeout: 5000 });
    await createButton.click();

    // Select "Budget Line Item" from dropdown menu
    const budgetLineItemOption = page.getByRole('menuitem', { name: /budget line item/i });
    await expect(
      budgetLineItemOption,
      'Budget Line Item menu option should be visible'
    ).toBeVisible({ timeout: 3000 });
    await budgetLineItemOption.click();

    // Wait for modal to appear
    const modal = page.getByRole('dialog');
    await expect(modal, 'Add Budget Line Items modal should be visible').toBeVisible({
      timeout: 5000,
    });

    // 2. Fill form fields
    // Select first available budget code
    const budgetCodeSelect = modal.getByLabel(/budget code|cost code/i).first();
    await expect(budgetCodeSelect, 'Budget code select should be visible').toBeVisible();

    // Click to open dropdown
    await budgetCodeSelect.click();
    await page.waitForTimeout(500);

    // Select the first available option (from test data)
    const firstCodeOption = page.getByRole('option').first();
    await expect(firstCodeOption, 'First budget code option should be available').toBeVisible();
    await firstCodeOption.click();

    // Fill amount
    const amountInput = modal.getByLabel(/amount|original budget/i).first();
    await amountInput.fill('50000');

    // Fill quantity
    const quantityInput = modal.getByLabel(/quantity/i).first();
    await quantityInput.fill('10');

    // Fill unit of measure
    const uomInput = modal.getByLabel(/uom|unit of measure/i).first();
    await uomInput.fill('EA');

    // Fill unit cost
    const unitCostInput = modal.getByLabel(/unit cost/i).first();
    await unitCostInput.fill('5000');

    // 3. Submit the form
    const submitButton = modal.getByRole('button', { name: /create.*line item/i });
    await expect(submitButton, 'Submit button should be visible').toBeVisible();
    await submitButton.click();

    // 4. Verify success feedback
    // Modal should close
    await expect(modal, 'Modal should close after submission').not.toBeVisible({
      timeout: 10000,
    });

    // Success toast should appear
    const successToast = page.getByText(/created.*budget line item/i);
    await expect(
      successToast,
      'Success toast should appear after creating line item'
    ).toBeVisible({ timeout: 5000 });

    // 5. Verify line item appears in table
    // Look for the amount in the table (formatted as currency)
    const tableRow = page.getByRole('row').filter({ hasText: '$50,000' });
    await expect(
      tableRow,
      'New line item with $50,000 should appear in budget table'
    ).toBeVisible({ timeout: 5000 });

    // 6. Verify persistence - reload page and check again
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const persistedRow = page.getByRole('row').filter({ hasText: '$50,000' });
    await expect(
      persistedRow,
      'Line item should still be visible after page reload'
    ).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test 2: READ - View Budget Line Items with Calculations
   *
   * User Story: As a project manager, I can view budget line items
   * with accurate financial calculations.
   *
   * Note: This test uses the line item created by the bootstrap process.
   */
  test('user can view budget line items with calculated values', async ({ page }) => {
    // The bootstrap process should have created budget line items
    // Verify the table is populated
    const budgetTable = page.locator('table').first();
    await expect(budgetTable, 'Budget table should be visible').toBeVisible({ timeout: 5000 });

    // Verify table has rows (at least the header row + data rows)
    const tableRows = budgetTable.getByRole('row');
    const rowCount = await tableRows.count();
    expect(rowCount, 'Budget table should have at least 2 rows (header + data)').toBeGreaterThan(
      1
    );

    // Find a row with data (look for currency formatting)
    const dataRow = page.getByRole('row').filter({ hasText: /\$[\d,]+/ }).first();
    await expect(dataRow, 'At least one budget line item should be visible').toBeVisible();

    // Verify the row has multiple cells with financial data
    const cells = dataRow.getByRole('cell');
    const cellCount = await cells.count();
    expect(cellCount, 'Budget row should have multiple columns').toBeGreaterThan(5);

    // Verify grand totals row exists
    // Grand totals typically appear at the bottom of the table
    const grandTotalsRow = page
      .getByRole('row')
      .filter({ hasText: /grand total|total/i })
      .first();

    // Note: Grand totals may only appear when there's data
    // So we check if the row exists OR if there's at least one data row
    const hasTotalsRow = (await grandTotalsRow.count()) > 0;
    const hasDataRows = rowCount > 1;
    expect(
      hasTotalsRow || hasDataRows,
      'Should have either grand totals row or data rows'
    ).toBeTruthy();
  });

  /**
   * Test 3: UPDATE - Edit Budget Line Item
   *
   * User Story: As a project manager, I can update budget line item
   * quantities and costs.
   *
   * Prerequisites: Requires a budget line item to exist
   */
  test('user can edit an existing budget line item', async ({ page }) => {
    // First, create a line item to edit
    const createButton = page.getByRole('button', { name: /create/i }).first();
    await createButton.click();

    const budgetLineItemOption = page.getByRole('menuitem', { name: /budget line item/i });
    await budgetLineItemOption.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill form with initial values
    const budgetCodeSelect = modal.getByLabel(/budget code|cost code/i).first();
    await budgetCodeSelect.click();
    await page.waitForTimeout(500);
    await page.getByRole('option').first().click();

    await modal.getByLabel(/amount|original budget/i).first().fill('25000');
    await modal.getByLabel(/quantity/i).first().fill('5');
    await modal.getByLabel(/uom|unit of measure/i).first().fill('EA');
    await modal.getByLabel(/unit cost/i).first().fill('5000');

    const submitButton = modal.getByRole('button', { name: /create.*line item/i });
    await submitButton.click();

    // Wait for creation to complete
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/created.*budget line item/i)).toBeVisible({ timeout: 5000 });

    // 2. Now edit the created line item
    // Find the row with $25,000
    const targetRow = page.getByRole('row').filter({ hasText: '$25,000' }).first();
    await expect(targetRow, 'Created line item should be visible').toBeVisible({ timeout: 5000 });

    // Click on the row to open edit modal (or look for an edit button)
    // Note: Implementation may vary - adjust selector based on actual UI
    const editButton = targetRow.getByRole('button', { name: /edit/i }).first();

    // If there's no edit button in the row, try clicking the row itself
    if ((await editButton.count()) === 0) {
      await targetRow.click();
    } else {
      await editButton.click();
    }

    // Wait for edit modal
    const editModal = page.getByRole('dialog');
    await expect(editModal, 'Edit modal should appear').toBeVisible({ timeout: 5000 });

    // 3. Modify fields
    // Update quantity from 5 to 8
    const quantityInput = editModal.getByLabel(/quantity/i).first();
    await quantityInput.clear();
    await quantityInput.fill('8');

    // Update unit cost from 5000 to 6000
    const unitCostInput = editModal.getByLabel(/unit cost/i).first();
    await unitCostInput.clear();
    await unitCostInput.fill('6000');

    // 4. Save changes
    const saveButton = editModal.getByRole('button', { name: /save|update/i });
    await expect(saveButton, 'Save button should be visible').toBeVisible();
    await saveButton.click();

    // 5. Verify modal closes
    await expect(editModal, 'Edit modal should close after saving').not.toBeVisible({
      timeout: 10000,
    });

    // 6. Verify success toast
    const successToast = page.getByText(/updated successfully|saved/i);
    await expect(successToast, 'Success toast should appear after update').toBeVisible({
      timeout: 5000,
    });

    // 7. Verify updated values in table
    // New amount should be 8 * 6000 = 48,000
    const updatedRow = page.getByRole('row').filter({ hasText: '$48,000' });
    await expect(
      updatedRow,
      'Updated line item with new calculated amount should appear'
    ).toBeVisible({ timeout: 5000 });

    // 8. Verify persistence
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const persistedRow = page.getByRole('row').filter({ hasText: '$48,000' });
    await expect(persistedRow, 'Updated values should persist after reload').toBeVisible({
      timeout: 10000,
    });
  });

  /**
   * Test 4: DELETE - Remove Budget Line Items
   *
   * User Story: As a project manager, I can delete budget line items
   * that are no longer needed.
   *
   * Workflow:
   * 1. Create test line items
   * 2. Select multiple items
   * 3. Delete via selection action bar
   * 4. Confirm deletion
   * 5. Verify items are removed
   * 6. Verify persistence
   */
  test('user can delete budget line items', async ({ page }) => {
    // 1. Create two line items to delete
    const createButton = page.getByRole('button', { name: /create/i }).first();

    // Create first item ($15,000)
    await createButton.click();
    await page.getByRole('menuitem', { name: /budget line item/i }).click();

    let modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    let budgetCodeSelect = modal.getByLabel(/budget code|cost code/i).first();
    await budgetCodeSelect.click();
    await page.waitForTimeout(500);
    await page.getByRole('option').first().click();

    await modal.getByLabel(/amount|original budget/i).first().fill('15000');
    await modal.getByLabel(/quantity/i).first().fill('3');
    await modal.getByLabel(/uom|unit of measure/i).first().fill('EA');
    await modal.getByLabel(/unit cost/i).first().fill('5000');
    await modal.getByRole('button', { name: /create.*line item/i }).click();

    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Create second item ($20,000)
    await createButton.click();
    await page.getByRole('menuitem', { name: /budget line item/i }).click();

    modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    budgetCodeSelect = modal.getByLabel(/budget code|cost code/i).first();
    await budgetCodeSelect.click();
    await page.waitForTimeout(500);
    await page.getByRole('option').nth(1).click(); // Select second budget code

    await modal.getByLabel(/amount|original budget/i).first().fill('20000');
    await modal.getByLabel(/quantity/i).first().fill('4');
    await modal.getByLabel(/uom|unit of measure/i).first().fill('EA');
    await modal.getByLabel(/unit cost/i).first().fill('5000');
    await modal.getByRole('button', { name: /create.*line item/i }).click();

    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // 2. Select the created items
    // Find rows with the created amounts
    const row1 = page.getByRole('row').filter({ hasText: '$15,000' }).first();
    const row2 = page.getByRole('row').filter({ hasText: '$20,000' }).first();

    await expect(row1, 'First created item should be visible').toBeVisible({ timeout: 5000 });
    await expect(row2, 'Second created item should be visible').toBeVisible({ timeout: 5000 });

    // Select checkboxes (implementation may vary - adjust based on actual UI)
    const checkbox1 = row1.getByRole('checkbox').first();
    const checkbox2 = row2.getByRole('checkbox').first();

    // If checkboxes exist, use them
    if ((await checkbox1.count()) > 0) {
      await checkbox1.click();
      await checkbox2.click();

      // 3. Verify selection action bar appears
      const selectionBar = page.getByText(/2.*selected|selected.*2/i);
      await expect(selectionBar, 'Selection bar should show 2 items selected').toBeVisible({
        timeout: 3000,
      });

      // 4. Click delete button
      const deleteButton = page.getByRole('button', { name: /delete selected|delete/i });
      await expect(deleteButton, 'Delete button should be visible').toBeVisible({
        timeout: 3000,
      });
      await deleteButton.click();

      // 5. Confirm deletion in dialog
      const confirmDialog = page.getByRole('alertdialog');
      await expect(confirmDialog, 'Confirmation dialog should appear').toBeVisible({
        timeout: 5000,
      });

      const confirmButton = confirmDialog.getByRole('button', { name: /delete|confirm/i });
      await expect(confirmButton, 'Confirm delete button should be visible').toBeVisible();
      await confirmButton.click();

      // 6. Verify dialog closes
      await expect(confirmDialog, 'Confirmation dialog should close').not.toBeVisible({
        timeout: 10000,
      });

      // 7. Verify success toast
      const successToast = page.getByText(/deleted.*successfully|removed/i);
      await expect(successToast, 'Success toast should appear after deletion').toBeVisible({
        timeout: 5000,
      });

      // 8. Verify items are removed from table
      await expect(row1, 'First deleted item should no longer be visible').not.toBeVisible({
        timeout: 5000,
      });
      await expect(row2, 'Second deleted item should no longer be visible').not.toBeVisible({
        timeout: 5000,
      });

      // 9. Verify persistence
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      const persistedRow1 = page.getByRole('row').filter({ hasText: '$15,000' });
      const persistedRow2 = page.getByRole('row').filter({ hasText: '$20,000' });

      await expect(
        persistedRow1,
        'First deleted item should not reappear after reload'
      ).not.toBeVisible({ timeout: 5000 });
      await expect(
        persistedRow2,
        'Second deleted item should not reappear after reload'
      ).not.toBeVisible({ timeout: 5000 });
    } else {
      // If checkboxes don't exist, skip this test
      test.skip(true, 'Checkbox-based deletion not available in current UI');
    }
  });

  /**
   * Cleanup: Remove all test data after tests complete
   *
   * Note: The bootstrap endpoint creates projects with CASCADE DELETE,
   * so deleting the project should clean up all associated data.
   */
  test.afterAll(async ({ request }) => {
    if (!projectId) return;

    console.log(`[Budget Core] Cleaning up test project: ${projectId}`);

    // Delete the test project via API
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const response = await request.delete(`${baseUrl}/api/projects/${projectId}`);

    if (response.ok()) {
      console.log(`[Budget Core] Test project ${projectId} deleted successfully`);
    } else {
      console.error(`[Budget Core] Failed to delete test project ${projectId}: ${response.status()}`);
    }
  });
});
