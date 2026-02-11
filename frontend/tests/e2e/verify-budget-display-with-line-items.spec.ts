import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Display and Multiple Line Items', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test('should display budget correctly and create multiple line items', async ({ page }) => {
    // First, navigate to budget page to see current state
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('networkidle');

    // Wait for budget to load
    await page.waitForTimeout(3000);

    // Take screenshot of initial budget state
    await page.screenshot({
      path: 'tests/screenshots/budget-initial-state.png',
      fullPage: true
    });

    console.warn('Initial budget page loaded');

    // Navigate to budget setup to add line items
    await page.goto(`/${projectId}/budget/setup`);
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForSelector('text=Loading project cost codes...', { state: 'hidden', timeout: 15000 });

    // Add Line Item 1: 01-3120 – Vice President, Qty: 200, Unit Cost: $75.00
    console.warn('Creating first line item...');

    const selectButton1 = page.locator('button:has-text("Select budget code")').first();
    await expect(selectButton1).toBeVisible({ timeout: 10000 });
    await selectButton1.click();
    await page.waitForTimeout(500);

    const budgetCode1 = page.locator('[role="option"]').first();
    const budgetCode1Text = await budgetCode1.textContent();
    console.warn('Selecting budget code 1:', budgetCode1Text);
    await budgetCode1.click();
    await page.waitForTimeout(500);

    const qty1Input = page.locator('input[type="number"]').first();
    await qty1Input.fill('200');
    await page.waitForTimeout(300);

    const unitCost1Input = page.locator('input[type="number"]').nth(1);
    await unitCost1Input.fill('75.00');
    await page.waitForTimeout(500);

    // Take screenshot before adding second row
    await page.screenshot({
      path: 'tests/screenshots/line-item-1-filled.png',
      fullPage: true
    });

    // Click "Add Row" to add a second line item
    console.warn('Adding second row...');
    const addRowButton = page.locator('button:has-text("Add Row")');
    await expect(addRowButton).toBeVisible({ timeout: 5000 });
    await addRowButton.click();
    await page.waitForTimeout(1000);

    // Add Line Item 2: Select second budget code or create new one
    console.warn('Creating second line item...');

    // Find all "Select budget code" buttons and click the last one (newly added row)
    const allSelectButtons = page.locator('button:has-text("Select budget code")');
    const count = await allSelectButtons.count();
    console.warn('Number of "Select budget code" buttons:', count);

    const selectButton2 = allSelectButtons.last();
    await expect(selectButton2).toBeVisible({ timeout: 10000 });
    await selectButton2.click();
    await page.waitForTimeout(500);

    // Check if there's a second budget code, if not create one
    const budgetCodeOptions = page.locator('[role="option"]');
    const optionsCount = await budgetCodeOptions.count();
    console.warn('Available budget code options:', optionsCount);

    if (optionsCount > 1) {
      // Select the first actual budget code (skip "Create New Budget Code" if it's there)
      const budgetCode2 = page.locator('[role="option"]').first();
      const budgetCode2Text = await budgetCode2.textContent();
      console.warn('Selecting budget code 2:', budgetCode2Text);
      await budgetCode2.click();
    } else {
      // Create a new budget code
      console.warn('Creating new budget code for second line item...');
      const createCodeOption = page.locator('text=Create New Budget Code');
      await createCodeOption.click();
      await page.waitForTimeout(1000);

      // Wait for cost codes to load
      await page.waitForSelector('text=Loading cost codes...', { state: 'hidden', timeout: 15000 });

      // Expand first division
      const divisionButton = page.locator('div.border.rounded-md button').first();
      await divisionButton.click();
      await page.waitForTimeout(500);

      // Select a different cost code (second one)
      const costCode = page.locator('div.border.rounded-md button').nth(2);
      await costCode.click();
      await page.waitForTimeout(500);

      // Click "Create Budget Code"
      const createButton = page.locator('button:has-text("Create Budget Code")');
      await createButton.click();
      await page.waitForTimeout(2000);

      // Now select it from dropdown
      const selectButton2Again = allSelectButtons.last();
      await selectButton2Again.click();
      await page.waitForTimeout(500);

      const newBudgetCode = page.locator('[role="option"]').nth(1);
      await newBudgetCode.click();
    }

    await page.waitForTimeout(500);

    // Get all number inputs and fill the last two (qty and unit cost for second row)
    const allQtyInputs = page.locator('input[type="number"]');
    const totalInputs = await allQtyInputs.count();
    console.warn('Total number inputs:', totalInputs);

    // For the second row, we need inputs at index (totalInputs - 2) for qty and (totalInputs - 1) for unit cost
    const qty2Input = allQtyInputs.nth(totalInputs - 2);
    await qty2Input.fill('150');
    await page.waitForTimeout(300);

    const unitCost2Input = allQtyInputs.nth(totalInputs - 1);
    await unitCost2Input.fill('100.00');
    await page.waitForTimeout(500);

    // Take screenshot with both line items filled
    await page.screenshot({
      path: 'tests/screenshots/two-line-items-filled.png',
      fullPage: true
    });

    // Check the total before submitting
    const totalText = await page.locator('text=/Total:.*\\$/').textContent();
    console.warn('Total before submit:', totalText);

    // Click "Create 2 Line Items" button
    console.warn('Submitting both line items...');
    const createButton = page.locator('button:has-text("Create")').last();
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();

    // Wait for redirect and success message
    await page.waitForTimeout(3000);

    // Take screenshot after submission
    await page.screenshot({
      path: 'tests/screenshots/after-creating-two-line-items.png',
      fullPage: true
    });

    // Verify we're on the budget page
    const currentUrl = page.url();
    console.warn('Current URL after submission:', currentUrl);
    expect(currentUrl).toContain('/budget');

    // Wait for budget to fully load
    await page.waitForTimeout(3000);

    // Take screenshot of final budget state
    await page.screenshot({
      path: 'tests/screenshots/budget-with-new-line-items.png',
      fullPage: true
    });

    // Verify success message
    const successMessage = page.locator('text=/Successfully created.*budget line/i');
    if (await successMessage.isVisible().catch(() => false)) {
      const successText = await successMessage.textContent();
      console.warn('Success message:', successText);
    }

    // Try to verify the budget display shows the line items
    // Wait for the budget table/grid to load
    await page.waitForTimeout(2000);

    // Check if there's any budget data visible
    const budgetTable = page.locator('[role="table"], .budget-grid, table').first();
    if (await budgetTable.isVisible().catch(() => false)) {
      console.warn('Budget table is visible');

      // Take final screenshot
      await page.screenshot({
        path: 'tests/screenshots/budget-final-display.png',
        fullPage: true
      });
    } else {
      console.warn('Budget table not visible yet, page may still be loading');
    }
  });
});
