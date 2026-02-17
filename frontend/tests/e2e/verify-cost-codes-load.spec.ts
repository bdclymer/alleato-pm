import { test, expect } from '@playwright/test';

test.describe('Verify Cost Codes Load in Create Modal', () => {
  test('should load cost codes in the Create Budget Code modal', async ({ page }) => {
    // Navigate to budget setup page
    await page.goto('/67/budget/setup');
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForSelector('text=Loading project cost codes...', { state: 'hidden', timeout: 15000 });

    // Click on dropdown to open it
    const selectButton = page.locator('button:has-text("Select budget code")').first();
    await expect(selectButton).toBeVisible();
    await selectButton.click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // Click "Create New Budget Code" option
    const createCodeOption = page.locator('text=Create New Budget Code');
    await expect(createCodeOption).toBeVisible({ timeout: 5000 });
    await createCodeOption.click();

    // Wait for modal to open and load cost codes
    await page.waitForTimeout(2000);

    // Take screenshot of the modal
    await page.screenshot({
      path: 'tests/screenshots/verify-cost-codes-loaded.png',
      fullPage: true
    });

    // Check if any divisions are visible (should have cost codes grouped by division)
    const divisionButtons = page.locator('div.border.rounded-md button');
    const count = await divisionButtons.count();

    console.warn('Number of division/cost code buttons found:', count);

    // We should have at least some buttons (divisions + cost codes)
    expect(count).toBeGreaterThan(0);

    // Check if we can see division names (they should be visible)
    const firstDivision = divisionButtons.first();
    const divisionText = await firstDivision.textContent();
    console.warn('First division text:', divisionText);

    // Verify it's not showing "Loading cost codes..."
    const loadingText = page.locator('text=Loading cost codes...');
    await expect(loadingText).not.toBeVisible();

    // Click on first division to expand it
    await firstDivision.click();
    await page.waitForTimeout(500);

    // Take another screenshot after expanding
    await page.screenshot({
      path: 'tests/screenshots/verify-cost-codes-expanded.png',
      fullPage: true
    });

    // After expansion, we should see even more buttons (the cost codes under the division)
    const countAfterExpand = await divisionButtons.count();
    console.warn('Number of buttons after expanding division:', countAfterExpand);

    expect(countAfterExpand).toBeGreaterThan(count);
  });
});
