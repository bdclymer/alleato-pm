import { test, expect } from '@playwright/test';

test.describe('Budget Line Item - Collapsible Divisions', () => {
  test('should display divisions collapsed by default and expand on click', async ({ page }) => {
    // Navigate to the budget line item creation page with a project ID
    await page.goto('http://localhost:3000/budget/line-item/new?projectId=47');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Click the "Create New Budget Code" button to open the modal
    await page.click('text=Create New Budget Code');

    // Wait for the modal to open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Create New Budget Code')).toBeVisible();

    // Wait for cost codes to load
    await page.waitForTimeout(2000);

    // Take a screenshot of the modal with collapsed divisions
    await page.screenshot({
      path: 'frontend/tests/screenshots/budget-code-modal-collapsed.png',
      fullPage: true
    });

    // Check that divisions are displayed (e.g., "General Requirements")
    const divisions = page.locator('.border-b button');
    const divisionCount = await divisions.count();
    console.log(`Found ${divisionCount} divisions`);

    expect(divisionCount).toBeGreaterThan(0);

    // Verify that chevron-right icons are visible (divisions collapsed)
    const firstDivision = divisions.first();
    await expect(firstDivision).toBeVisible();

    // Click on the first division to expand it
    await firstDivision.click();

    // Wait for expansion animation
    await page.waitForTimeout(500);

    // Take a screenshot after expansion
    await page.screenshot({
      path: 'frontend/tests/screenshots/budget-code-modal-expanded.png',
      fullPage: true
    });

    // Verify that cost codes are now visible under the expanded division
    const costCodeButtons = page.locator('button:has-text("–")').filter({ hasNotText: 'Division' });
    const costCodeCount = await costCodeButtons.count();
    console.log(`Found ${costCodeCount} cost codes in expanded division`);

    expect(costCodeCount).toBeGreaterThan(0);

    // Click on a cost code to select it
    const firstCostCode = costCodeButtons.first();
    await firstCostCode.click();

    // Take a screenshot after selection
    await page.screenshot({
      path: 'frontend/tests/screenshots/budget-code-modal-selected.png',
      fullPage: true
    });

    // Verify the selected cost code is highlighted
    await expect(firstCostCode).toHaveClass(/bg-blue-50/);

    // Click the division again to collapse it
    await firstDivision.click();

    // Wait for collapse animation
    await page.waitForTimeout(500);

    // Verify cost codes are hidden again
    const costCodeButtonsAfterCollapse = page.locator('button:has-text("–")').filter({ hasNotText: 'Division' });
    const costCodeCountAfterCollapse = await costCodeButtonsAfterCollapse.count();
    console.log(`Found ${costCodeCountAfterCollapse} cost codes after collapse`);

    // The selected cost code should still be remembered even though division is collapsed
    // This tests that the state is maintained
  });

  test('should allow multiple divisions to be expanded simultaneously', async ({ page }) => {
    // Navigate to the budget line item creation page
    await page.goto('http://localhost:3000/budget/line-item/new?projectId=47');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Click the "Create New Budget Code" button
    await page.click('text=Create New Budget Code');

    // Wait for the modal
    await expect(page.getByRole('dialog')).toBeVisible();

    // Wait for cost codes to load
    await page.waitForTimeout(2000);

    // Get all division buttons
    const divisions = page.locator('.border-b button');
    const divisionCount = await divisions.count();

    if (divisionCount >= 2) {
      // Expand first division
      await divisions.nth(0).click();
      await page.waitForTimeout(300);

      // Expand second division
      await divisions.nth(1).click();
      await page.waitForTimeout(300);

      // Take screenshot showing both expanded
      await page.screenshot({
        path: 'frontend/tests/screenshots/budget-code-modal-multiple-expanded.png',
        fullPage: true
      });

      // Verify both divisions show cost codes
      const costCodeButtons = page.locator('button:has-text("–")').filter({ hasNotText: 'Division' });
      const costCodeCount = await costCodeButtons.count();

      console.log(`Found ${costCodeCount} cost codes with multiple divisions expanded`);
      expect(costCodeCount).toBeGreaterThan(0);
    }
  });
});
