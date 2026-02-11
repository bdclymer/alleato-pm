import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Setup - Create Line Item (Authenticated)', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to dev login first to authenticate
    // Wait for redirect to complete (goes to "/" by default)
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
  });

  test('should successfully create a budget line item', async ({ page }) => {
    // Navigate to budget setup page (now authenticated)
    await page.goto(`/${projectId}/budget/setup`);

    // Wait for loading to complete
    await page.waitForSelector('text=Loading project cost codes...', { state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Take screenshot of loaded page
    await page.screenshot({ path: 'tests/screenshots/budget-setup-loaded-auth.png', fullPage: true });

    // Click on the budget code dropdown
    const selectButton = page.locator('button:has-text("Select budget code")').first();
    await expect(selectButton).toBeVisible({ timeout: 10000 });
    await selectButton.click();

    // Wait for dropdown and select first option
    await page.waitForTimeout(500);
    const firstOption = page.locator('[role="option"]').first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });

    // Get the text of the selected option
    const optionText = await firstOption.textContent();
    console.warn('Selecting option:', optionText);

    await firstOption.click();

    // Wait for dropdown to close
    await page.waitForTimeout(1000);

    // Fill in quantity
    const qtyInput = page.locator('input[placeholder="0"]').first();
    await qtyInput.fill('10');

    // Fill in UOM
    const uomInput = page.locator('input[placeholder="EA"]').first();
    await uomInput.fill('EA');

    // Fill in unit cost
    const unitCostInputs = page.locator('input[placeholder="0.00"]');
    await unitCostInputs.first().fill('100');

    // Wait for auto-calculation
    await page.waitForTimeout(500);

    // Take screenshot before submitting
    await page.screenshot({ path: 'tests/screenshots/budget-setup-filled.png', fullPage: true });

    // Click create button
    const createButton = page.locator('button:has-text("Create 1 Line Item")');
    await createButton.click();

    // Wait for response - either success or error
    await page.waitForTimeout(3000);

    // Take screenshot of result
    await page.screenshot({ path: 'tests/screenshots/budget-setup-result.png', fullPage: true });

    // Check for success toast or error
    const successToast = page.locator('text=Successfully created');
    const errorToast = page.locator('text=Failed');

    const hasSuccess = await successToast.isVisible().catch(() => false);
    const hasError = await errorToast.isVisible().catch(() => false);

    if (hasSuccess) {
      console.warn('✅ SUCCESS: Budget line created');
      await expect(page).toHaveURL(/\/67\/budget$/, { timeout: 5000 });
    } else if (hasError) {
      const errorText = await errorToast.textContent();
      console.error('❌ ERROR:', errorText);
      throw new Error(`Budget creation failed: ${errorText}`);
    } else {
      console.error('❌ NO TOAST: Neither success nor error toast appeared');
      throw new Error('No response from server');
    }
  });
});
