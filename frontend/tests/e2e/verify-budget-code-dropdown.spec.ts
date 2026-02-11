import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Code Dropdown Verification', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test('should show created budget codes in dropdown', async ({ page }) => {
    // Navigate to budget setup page
    await page.goto(`/${projectId}/budget/setup`);
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForSelector('text=Loading project cost codes...', { state: 'hidden', timeout: 15000 });

    // Take screenshot before opening dropdown
    await page.screenshot({
      path: 'tests/screenshots/before-dropdown-open.png',
      fullPage: true
    });

    // Click "Select budget code..." dropdown to open it
    const selectButton = page.locator('button:has-text("Select budget code")').first();
    await expect(selectButton).toBeVisible({ timeout: 10000 });
    await selectButton.click();
    await page.waitForTimeout(1000);

    // Take screenshot of opened dropdown
    await page.screenshot({
      path: 'tests/screenshots/dropdown-opened-with-codes.png',
      fullPage: true
    });

    // Check if budget codes appear in the dropdown
    const dropdownItems = page.locator('[role="option"]');
    const count = await dropdownItems.count();
    console.warn('Number of budget codes in dropdown:', count);

    // Get all dropdown item text
    for (let i = 0; i < Math.min(count, 10); i++) {
      const text = await dropdownItems.nth(i).textContent();
      console.warn('Budget code ' + (i + 1) + ':', text);
    }

    // Verify at least one budget code exists (excluding "Create New Budget Code" option)
    // The dropdown should have budget codes, not just the "Create New Budget Code" option
    const budgetCodeItems = page.locator('[role="option"]:not(:has-text("Create New Budget Code"))');
    const budgetCodeCount = await budgetCodeItems.count();
    console.warn('Number of actual budget codes (excluding Create option):', budgetCodeCount);

    expect(budgetCodeCount).toBeGreaterThan(0);
  });
});
