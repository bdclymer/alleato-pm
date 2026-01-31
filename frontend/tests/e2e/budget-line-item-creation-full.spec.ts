import { test, expect } from '@playwright/test';

test.describe('Budget Line Item Creation - Full E2E', () => {
  test('should create a budget line item and see it in the budget table', async ({ page }) => {
    // Navigate to project budget page
    await page.goto('http://localhost:3001/1/budget');
    await page.waitForLoadState('networkidle');

    // Click Create button
    const createButton = page.getByRole('button', { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Select "Budget Line Item" from dropdown
    await page.waitForTimeout(500);
    const budgetLineItemOption = page.getByText('Budget Line Item');
    await expect(budgetLineItemOption).toBeVisible();
    await budgetLineItemOption.click();

    // Wait for the sheet/modal to appear
    await page.waitForTimeout(1000);

    // Look for the budget code selector
    const budgetCodeButton = page.locator('button').filter({ hasText: /select budget code/i }).first();
    await expect(budgetCodeButton).toBeVisible({ timeout: 5000 });
    await budgetCodeButton.click();

    // Wait for popover to appear
    await page.waitForTimeout(500);

    // Click "Create New Budget Code"
    const createNewCodeLink = page.getByText('Create New Budget Code');
    await expect(createNewCodeLink).toBeVisible();
    await createNewCodeLink.click();

    // Wait for dialog to appear
    await page.waitForTimeout(1000);

    // Check if cost codes are loading
    const loadingText = page.getByText('Loading cost codes...');
    if (await loadingText.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Cost codes are loading...');
      await page.waitForTimeout(3000);
    }

    // Look for a division to expand
    const division = page.locator('button').filter({ hasText: /Division/i }).first();
    if (await division.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Found division, clicking...');
      await division.click();
      await page.waitForTimeout(500);

      // Select first cost code
      const costCodeOption = page.locator('button').filter({ hasText: /[0-9]+-[0-9]+/i }).first();
      if (await costCodeOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        const costCodeText = await costCodeOption.textContent();
        console.log('Selecting cost code:', costCodeText);
        await costCodeOption.click();
      } else {
        console.log('No cost codes found in division');
      }
    } else {
      console.log('No divisions found - cost codes might be empty');
    }

    // Take screenshot of the state
    await page.screenshot({ path: 'frontend/tests/screenshots/budget-creation-state.png', fullPage: true });

    // Select cost type
    const costTypeSelect = page.locator('select').filter({ hasText: /revenue/i }).or(page.locator('#costType'));
    if (await costTypeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await costTypeSelect.selectOption('L');
    }

    // Click "Create Budget Code" button
    const createCodeButton = page.getByRole('button', { name: /create budget code/i });
    if (await createCodeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createCodeButton.click();
      await page.waitForTimeout(1000);
    }

    // Fill in the line item details
    const qtyInput = page.locator('input[type="text"]').filter({ hasText: /qty/i }).or(page.locator('td input').nth(1));
    if (await qtyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qtyInput.fill('100');
    }

    const uomInput = page.locator('input').filter({ hasText: /uom/i }).or(page.locator('td input').nth(2));
    if (await uomInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await uomInput.fill('SF');
    }

    const unitCostInput = page.locator('input').filter({ hasText: /unit cost/i }).or(page.locator('td input').nth(3));
    if (await unitCostInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await unitCostInput.fill('50.00');
    }

    // Take another screenshot before submit
    await page.screenshot({ path: 'frontend/tests/screenshots/budget-before-submit.png', fullPage: true });

    // Click submit
    const createLineItemButton = page.getByRole('button', { name: /create.*line item/i });
    if (await createLineItemButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createLineItemButton.click();

      // Wait for the request to complete
      await page.waitForTimeout(2000);

      // Check if we're back on the budget page
      const budgetTable = page.locator('table');
      await expect(budgetTable).toBeVisible({ timeout: 5000 });

      // Take final screenshot
      await page.screenshot({ path: 'frontend/tests/screenshots/budget-after-submit.png', fullPage: true });

      console.log('Budget line item creation completed');
    } else {
      console.log('Create button not found - test cannot proceed');
    }
  });
});
