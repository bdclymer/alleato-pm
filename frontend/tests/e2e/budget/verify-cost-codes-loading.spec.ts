import { test, expect } from '@playwright/test';

test('Verify cost codes are loading in budget line item creation', async ({ page }) => {
  // Navigate to the budget line item new page
  await page.goto('/98/budget/line-item/new');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Click the budget code dropdown to trigger the popover
  const budgetCodeButton = page.getByRole('button', { name: /select budget code/i }).first();
  await budgetCodeButton.click();

  // Click on "Create New Budget Code" to open the modal
  await page.getByText('Create New Budget Code').click();

  // Wait for the modal to open
  await page.waitForSelector('text=Create New Budget Code', { state: 'visible' });

  // Wait for cost codes to load (give it a bit more time)
  await page.waitForTimeout(3000);

  // Check if any divisions are visible
  const divisions = await page.locator('button').filter({ hasText: 'Division' }).count();
  console.log('Number of divisions found:', divisions);

  // Expect at least some divisions to be visible
  expect(divisions).toBeGreaterThan(0);

  // Try to expand the first division if any exist
  if (divisions > 0) {
    const firstDivision = page.locator('button').filter({ hasText: 'Division' }).first();
    await firstDivision.click();

    // Wait for expansion animation
    await page.waitForTimeout(500);

    // Count cost codes that start with a number (cost code ID pattern)
    const costCodes = await page.locator('button[type="button"]').filter({ hasText: /^\d{2}-\d{4}/ }).count();
    console.log('Number of cost codes found after expanding:', costCodes);

    // Expect at least some cost codes to be visible
    expect(costCodes).toBeGreaterThan(0);
  }

  // Take a screenshot for visual verification
  await page.screenshot({ path: 'tests/screenshots/cost-codes-modal-fixed.png', fullPage: true });

  // Close the modal
  await page.getByRole('button', { name: 'Cancel' }).click();
});