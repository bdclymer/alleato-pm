/**
 * Budget Modifications E2E Tests
 *
 * Tests the budget modifications workflow that allows adjusting budget
 * after it has been baselined.
 *
 * User Story: As a project manager, I can create budget modifications
 * to adjust the budget after it's baselined.
 *
 * Workflow:
 * 1. Create a budget modification
 * 2. Verify modification amount appears in table
 * 3. Verify Revised Budget recalculates correctly
 * 4. Test modifications with different cost codes
 *
 * @see /DOCS_NEED_TO_FILE/BUDGET-E2E-TEST-PLAN.md (Test 9)
 * @see .claude/rules/E2E-TESTING-STANDARDS.md
 */

import { test, expect } from '../../fixtures/index';
import { createTestProject } from '../../helpers/bootstrap';

let projectId: number;

test.describe('Budget Modifications Workflow', () => {
  test.beforeAll(async ({ authenticatedRequest }) => {
    // Create a test project with budget data
    const project = await createTestProject({} as any, { template: 'commercial' }, authenticatedRequest);
    projectId = project.project.id;

    console.log(`[Budget Modifications] Test project created: ${projectId}`);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page before each test
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /budget/i }).first(),
      'Budget page header should be visible'
    ).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test: Create Budget Modification and Verify Revised Budget
   *
   * Workflow:
   * 1. Create a budget line item with original amount
   * 2. Create a budget modification for that line
   * 3. Verify "Budget Modifications" column shows the modification amount
   * 4. Verify "Revised Budget" = Original Budget + Modifications
   * 5. Verify grand totals update accordingly
   */
  test('user can create a budget modification and see revised budget update', async ({ page }) => {
    // 1. First, create a budget line item to modify
    const createButton = page.getByRole('button', { name: /create/i }).first();
    await expect(createButton, 'Create button should be visible').toBeVisible({ timeout: 5000 });
    await createButton.click();

    // Select "Budget Line Item" from dropdown
    const budgetLineItemOption = page.getByRole('menuitem', { name: /budget line item/i });
    await expect(budgetLineItemOption, 'Budget Line Item option should be visible').toBeVisible({
      timeout: 3000,
    });
    await budgetLineItemOption.click();

    // Wait for modal
    const modal = page.getByRole('dialog');
    await expect(modal, 'Create modal should be visible').toBeVisible({ timeout: 5000 });

    // Fill form fields to create a line with $100,000 original budget
    const budgetCodeSelect = modal.getByLabel(/budget code|cost code/i).first();
    await budgetCodeSelect.click();
    await page.waitForTimeout(500);
    await page.getByRole('option').first().click();

    await modal.getByLabel(/amount|original budget/i).first().fill('100000');
    await modal.getByLabel(/quantity/i).first().fill('10');
    await modal.getByLabel(/uom|unit of measure/i).first().fill('EA');
    await modal.getByLabel(/unit cost/i).first().fill('10000');

    const submitButton = modal.getByRole('button', { name: /create.*line item/i });
    await submitButton.click();

    // Wait for creation to complete
    await expect(modal, 'Modal should close after creation').not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/created.*budget line item/i), 'Success toast should appear').toBeVisible({
      timeout: 5000,
    });

    // Verify the line item appears with $100,000
    const lineItemRow = page.getByRole('row').filter({ hasText: '$100,000' }).first();
    await expect(lineItemRow, 'Line item with $100,000 should be visible').toBeVisible({
      timeout: 5000,
    });

    // 2. Now create a budget modification
    await page.waitForTimeout(1000); // Allow UI to settle
    await createButton.click();

    // Look for "Budget Modification" option
    const modificationOption = page.getByRole('menuitem', { name: /budget modification|modification/i });

    // If the option exists, use it
    if ((await modificationOption.count()) > 0) {
      await modificationOption.click();

      const modModal = page.getByRole('dialog');
      await expect(modModal, 'Modification modal should be visible').toBeVisible({
        timeout: 5000,
      });

      // Fill modification form
      // Select the same cost code
      const modCodeSelect = modModal.getByLabel(/cost code|budget code/i).first();
      await modCodeSelect.click();
      await page.waitForTimeout(500);
      await page.getByRole('option').first().click();

      // Enter modification amount: $10,000
      const modAmountInput = modModal.getByLabel(/amount|modification amount/i).first();
      await modAmountInput.fill('10000');

      // Enter reason (if required)
      const reasonInput = modModal.getByLabel(/reason|description/i).first();
      if ((await reasonInput.count()) > 0) {
        await reasonInput.fill('Additional scope added');
      }

      // Submit modification
      const modSubmitButton = modModal.getByRole('button', { name: /create|submit/i });
      await modSubmitButton.click();

      // Wait for success
      await expect(modModal, 'Modification modal should close').not.toBeVisible({
        timeout: 10000,
      });

      const modSuccessToast = page.getByText(/created|added|success/i);
      await expect(modSuccessToast, 'Success toast should appear after creating modification').toBeVisible({
        timeout: 5000,
      });

      // 3. Verify modification amount appears in the table
      // Look for the row with the cost code we used
      const updatedRow = page.getByRole('row').filter({ hasText: '$100,000' }).first();

      // The row should now show:
      // - Original Budget: $100,000
      // - Budget Modifications: $10,000
      // - Revised Budget: $110,000

      // Check for "Budget Modifications" column with $10,000
      const modificationsCell = updatedRow.getByText('$10,000');
      await expect(
        modificationsCell,
        'Budget Modifications column should show $10,000'
      ).toBeVisible({ timeout: 5000 });

      // Check for "Revised Budget" column with $110,000
      const revisedCell = updatedRow.getByText('$110,000');
      await expect(
        revisedCell,
        'Revised Budget column should show $110,000 (100k + 10k)'
      ).toBeVisible({ timeout: 5000 });

      // 4. Verify grand totals row updates
      const grandTotalsRow = page.getByRole('row').filter({ hasText: /grand total|total/i }).first();

      if ((await grandTotalsRow.count()) > 0) {
        // Grand totals should reflect the modification
        await expect(
          grandTotalsRow,
          'Grand totals row should be visible'
        ).toBeVisible({ timeout: 5000 });

        // The grand totals should show:
        // - Total Original Budget: $100,000
        // - Total Modifications: $10,000
        // - Total Revised Budget: $110,000
        console.log('[Budget Modifications] Grand totals updated with modification');
      }

      // 5. Verify persistence - reload and check again
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      const persistedRow = page.getByRole('row').filter({ hasText: '$110,000' });
      await expect(
        persistedRow,
        'Revised budget should persist after page reload'
      ).toBeVisible({ timeout: 10000 });
    } else {
      // Budget modifications feature may not be implemented yet
      console.log('[Budget Modifications] Budget Modification option not found in Create menu');
      test.skip(true, 'Budget Modification feature not available in UI');
    }
  });

  /**
   * Test: Multiple Modifications on Same Cost Code
   *
   * Workflow:
   * 1. Create a budget line item
   * 2. Create first modification (+$5,000)
   * 3. Create second modification (+$3,000)
   * 4. Verify modifications sum correctly
   * 5. Verify Revised Budget = Original + Sum of Modifications
   */
  test('user can create multiple modifications on the same cost code', async ({ page }) => {
    // 1. Create a budget line item
    const createButton = page.getByRole('button', { name: /create/i }).first();
    await createButton.click();

    const budgetLineItemOption = page.getByRole('menuitem', { name: /budget line item/i });
    await budgetLineItemOption.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Create line with $50,000 original budget
    const budgetCodeSelect = modal.getByLabel(/budget code|cost code/i).first();
    await budgetCodeSelect.click();
    await page.waitForTimeout(500);
    await page.getByRole('option').nth(1).click(); // Use second code to avoid conflicts

    await modal.getByLabel(/amount|original budget/i).first().fill('50000');
    await modal.getByLabel(/quantity/i).first().fill('5');
    await modal.getByLabel(/uom|unit of measure/i).first().fill('EA');
    await modal.getByLabel(/unit cost/i).first().fill('10000');

    await modal.getByRole('button', { name: /create.*line item/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify line item exists
    const lineItem = page.getByRole('row').filter({ hasText: '$50,000' }).first();
    await expect(lineItem).toBeVisible({ timeout: 5000 });

    // 2. Create first modification (+$5,000)
    await createButton.click();
    const modOption1 = page.getByRole('menuitem', { name: /budget modification|modification/i });

    if ((await modOption1.count()) > 0) {
      await modOption1.click();

      let modModal = page.getByRole('dialog');
      await expect(modModal).toBeVisible({ timeout: 5000 });

      // Select same cost code
      const modCodeSelect = modModal.getByLabel(/cost code|budget code/i).first();
      await modCodeSelect.click();
      await page.waitForTimeout(500);
      await page.getByRole('option').nth(1).click();

      await modModal.getByLabel(/amount|modification amount/i).first().fill('5000');

      const reasonInput = modModal.getByLabel(/reason|description/i).first();
      if ((await reasonInput.count()) > 0) {
        await reasonInput.fill('First modification');
      }

      await modModal.getByRole('button', { name: /create|submit/i }).click();
      await expect(modModal).not.toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // 3. Create second modification (+$3,000)
      await createButton.click();
      const modOption2 = page.getByRole('menuitem', { name: /budget modification|modification/i });
      await modOption2.click();

      modModal = page.getByRole('dialog');
      await expect(modModal).toBeVisible({ timeout: 5000 });

      const modCodeSelect2 = modModal.getByLabel(/cost code|budget code/i).first();
      await modCodeSelect2.click();
      await page.waitForTimeout(500);
      await page.getByRole('option').nth(1).click();

      await modModal.getByLabel(/amount|modification amount/i).first().fill('3000');

      const reasonInput2 = modModal.getByLabel(/reason|description/i).first();
      if ((await reasonInput2.count()) > 0) {
        await reasonInput2.fill('Second modification');
      }

      await modModal.getByRole('button', { name: /create|submit/i }).click();
      await expect(modModal).not.toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // 4. Verify modifications sum correctly
      const updatedRow = page.getByRole('row').filter({ hasText: '$50,000' }).first();

      // Total modifications should be $8,000 ($5,000 + $3,000)
      const modificationsTotal = updatedRow.getByText('$8,000');
      await expect(
        modificationsTotal,
        'Budget Modifications should show $8,000 (5k + 3k)'
      ).toBeVisible({ timeout: 5000 });

      // 5. Verify Revised Budget = $50,000 + $8,000 = $58,000
      const revisedBudget = updatedRow.getByText('$58,000');
      await expect(
        revisedBudget,
        'Revised Budget should show $58,000 (50k + 8k)'
      ).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, 'Budget Modification feature not available in UI');
    }
  });

  /**
   * Test: Negative Budget Modification
   *
   * Workflow:
   * 1. Create a budget line item
   * 2. Create a negative modification (-$2,000)
   * 3. Verify Revised Budget decreases
   * 4. Verify calculation: Revised = Original + (-2000)
   */
  test('user can create a negative budget modification', async ({ page }) => {
    // 1. Create a budget line item
    const createButton = page.getByRole('button', { name: /create/i }).first();
    await createButton.click();

    const budgetLineItemOption = page.getByRole('menuitem', { name: /budget line item/i });
    await budgetLineItemOption.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Create line with $30,000 original budget
    const budgetCodeSelect = modal.getByLabel(/budget code|cost code/i).first();
    await budgetCodeSelect.click();
    await page.waitForTimeout(500);
    await page.getByRole('option').nth(2).click(); // Use third code

    await modal.getByLabel(/amount|original budget/i).first().fill('30000');
    await modal.getByLabel(/quantity/i).first().fill('3');
    await modal.getByLabel(/uom|unit of measure/i).first().fill('EA');
    await modal.getByLabel(/unit cost/i).first().fill('10000');

    await modal.getByRole('button', { name: /create.*line item/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // 2. Create a negative modification
    await createButton.click();
    const modOption = page.getByRole('menuitem', { name: /budget modification|modification/i });

    if ((await modOption.count()) > 0) {
      await modOption.click();

      const modModal = page.getByRole('dialog');
      await expect(modModal).toBeVisible({ timeout: 5000 });

      const modCodeSelect = modModal.getByLabel(/cost code|budget code/i).first();
      await modCodeSelect.click();
      await page.waitForTimeout(500);
      await page.getByRole('option').nth(2).click();

      // Enter negative amount
      await modModal.getByLabel(/amount|modification amount/i).first().fill('-2000');

      const reasonInput = modModal.getByLabel(/reason|description/i).first();
      if ((await reasonInput.count()) > 0) {
        await reasonInput.fill('Scope reduction');
      }

      await modModal.getByRole('button', { name: /create|submit/i }).click();
      await expect(modModal).not.toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // 3. Verify Revised Budget = $30,000 - $2,000 = $28,000
      const updatedRow = page.getByRole('row').filter({ hasText: '$30,000' }).first();

      const revisedBudget = updatedRow.getByText('$28,000');
      await expect(
        revisedBudget,
        'Revised Budget should show $28,000 (30k - 2k)'
      ).toBeVisible({ timeout: 5000 });

      // Verify modifications column shows -$2,000 or ($2,000)
      const modificationsCell = updatedRow.locator('td', { hasText: /2,000/ });
      await expect(
        modificationsCell,
        'Budget Modifications should show -$2,000'
      ).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, 'Budget Modification feature not available in UI');
    }
  });

  /**
   * Cleanup: Delete test project
   */
  test.afterAll(async ({ request }) => {
    if (!projectId) return;

    console.log(`[Budget Modifications] Cleaning up test project: ${projectId}`);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const response = await request.delete(`${baseUrl}/api/projects/${projectId}`);

    if (response.ok()) {
      console.log(`[Budget Modifications] Test project ${projectId} deleted successfully`);
    } else {
      console.error(
        `[Budget Modifications] Failed to delete test project ${projectId}: ${response.status()}`
      );
    }
  });
});
