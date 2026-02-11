import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Setup - Create Line Item', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to dev login first to authenticate
    await page.waitForURL(/\/\d+\/home/, { timeout: 10000 });
  });

  test('should create a budget line item successfully', async ({ page }) => {
    // Navigate to the budget setup page (now authenticated)
    await page.goto(`http://localhost:3000/${projectId}/budget/setup`, { timeout: 60000 });

    // Wait for the loading to complete
    await page.waitForSelector('text=Loading project cost codes...', { state: 'hidden', timeout: 15000 });

    // Click on the "Select budget code..." button to open the dropdown
    const selectButton = page.locator('button:has-text("Select budget code")').first();
    await expect(selectButton).toBeVisible();
    await selectButton.click();

    // Wait for dropdown to open and select the first cost code
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();

    // Verify that a cost code was selected (button should now show the selected code)
    await expect(selectButton).not.toHaveText('Select budget code...');

    // Fill in the quantity
    const qtyInput = page.locator('input[placeholder="0"]').first();
    await qtyInput.fill('100');

    // Fill in the UOM
    const uomInput = page.locator('input[placeholder="EA"]').first();
    await uomInput.fill('SF');

    // Fill in the unit cost
    const unitCostInput = page.locator('input[placeholder="0.00"]').first();
    await unitCostInput.fill('25.50');

    // Verify the amount was auto-calculated
    const amountInput = page.locator('input[type="number"][placeholder="0.00"]').nth(1);
    await expect(amountInput).toHaveValue('2550.00');

    // Click the Create button
    const createButton = page.locator('button:has-text("Create 1 Line Item")');
    await createButton.click();

    // Wait for success toast
    await page.waitForSelector('text=Successfully created 1 budget line(s)', { timeout: 10000 });

    // Verify we're redirected to the budget page
    await expect(page).toHaveURL(/\/67\/budget$/);
  });

  test('should show error if no budget code selected', async ({ page }) => {
    // Navigate to budget setup page (already authenticated via beforeEach)
    await page.goto(`http://localhost:3000/${projectId}/budget/setup`, { timeout: 60000 });
    await page.waitForSelector('text=Loading project cost codes...', { state: 'hidden', timeout: 15000 });

    // Fill in amount without selecting budget code
    const amountInput = page.locator('input[type="number"][placeholder="0.00"]').nth(1);
    await amountInput.fill('1000');

    // Try to create
    const createButton = page.locator('button:has-text("Create 1 Line Item")');
    await createButton.click();

    // Should show error toast
    await page.waitForSelector('text=Please select a budget code for all line items', { timeout: 5000 });
  });
});
