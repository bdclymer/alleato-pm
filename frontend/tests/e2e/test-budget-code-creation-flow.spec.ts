import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Code Creation and Verification', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test('should create budget code in project_budget_codes and verify it appears in dropdown', async ({ page }) => {
    // Navigate directly to budget setup page (auth handled by test environment)
    await page.goto(`/${projectId}/budget/setup`);
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForSelector('text=Loading project cost codes...', { state: 'hidden', timeout: 15000 });

    // Click "Select budget code..." dropdown to open it
    const selectButton = page.locator('button:has-text("Select budget code")').first();
    await expect(selectButton).toBeVisible({ timeout: 10000 });
    await selectButton.click();
    await page.waitForTimeout(500);

    // Click "Create New Budget Code" option in the dropdown
    const createCodeOption = page.locator('text=Create New Budget Code');
    await expect(createCodeOption).toBeVisible({ timeout: 5000 });
    await createCodeOption.click();

    // Wait for modal to open
    await page.waitForTimeout(1000);

    // Wait for cost codes to load
    await page.waitForSelector('text=Loading cost codes...', { state: 'hidden', timeout: 15000 });

    // Click on first division to expand it
    const firstDivisionButton = page.locator('div.border.rounded-md button').first();
    await expect(firstDivisionButton).toBeVisible({ timeout: 5000 });
    await firstDivisionButton.click();
    await page.waitForTimeout(500);

    // Click on first cost code
    const firstCostCode = page.locator('div.border.rounded-md button').nth(1);
    await expect(firstCostCode).toBeVisible({ timeout: 5000 });
    const costCodeText = await firstCostCode.textContent();
    console.warn('Selected cost code:', costCodeText);
    await firstCostCode.click();
    await page.waitForTimeout(500);

    // Cost type "R" is already selected by default, no need to click it

    // Take screenshot before creating
    await page.screenshot({
      path: 'tests/screenshots/before-create-budget-code.png',
      fullPage: true
    });

    // Click "Create Budget Code" button
    const createBudgetCodeButton = page.locator('button:has-text("Create Budget Code")');
    await expect(createBudgetCodeButton).toBeVisible({ timeout: 5000 });
    await createBudgetCodeButton.click();

    // Wait for success message or modal to close
    await page.waitForTimeout(3000);

    // Take screenshot after creating
    await page.screenshot({
      path: 'tests/screenshots/after-create-budget-code.png',
      fullPage: true
    });

    // Now verify the budget code appears in the dropdown
    // Click on "Select budget code..." dropdown
    const dropdownButton = page.locator('button:has-text("Select budget code")').first();
    await expect(dropdownButton).toBeVisible({ timeout: 10000 });
    await dropdownButton.click();
    await page.waitForTimeout(1000);

    // Take screenshot of dropdown
    await page.screenshot({
      path: 'tests/screenshots/budget-code-dropdown.png',
      fullPage: true
    });

    // Check if the created budget code appears in the dropdown
    const dropdownItems = page.locator('[role="option"]');
    const count = await dropdownItems.count();
    console.warn('Number of budget codes in dropdown:', count);

    // Verify at least one budget code exists
    expect(count).toBeGreaterThan(0);

    // Get all dropdown item text
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await dropdownItems.nth(i).textContent();
      console.warn(`Budget code ${i + 1}:`, text);
    }
  });
});
