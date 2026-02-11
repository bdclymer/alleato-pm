import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Line Item Creation', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test('should create a budget line item using existing budget code', async ({ page }) => {
    // Navigate to budget setup page
    await page.goto(`/${projectId}/budget/setup`);
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForSelector('text=Loading project cost codes...', { state: 'hidden', timeout: 15000 });

    // Take screenshot of initial state
    await page.screenshot({
      path: 'tests/screenshots/line-item-initial.png',
      fullPage: true
    });

    // Click "Select budget code..." dropdown to open it
    const selectButton = page.locator('button:has-text("Select budget code")').first();
    await expect(selectButton).toBeVisible({ timeout: 10000 });
    await selectButton.click();
    await page.waitForTimeout(500);

    // Take screenshot of dropdown opened
    await page.screenshot({
      path: 'tests/screenshots/line-item-dropdown-opened.png',
      fullPage: true
    });

    // Select the first budget code (not "Create New Budget Code")
    const budgetCodeOption = page.locator('[role="option"]').first();
    const budgetCodeText = await budgetCodeOption.textContent();
    console.warn('Selecting budget code:', budgetCodeText);
    await budgetCodeOption.click();
    await page.waitForTimeout(500);

    // Take screenshot after selecting budget code
    await page.screenshot({
      path: 'tests/screenshots/line-item-budget-code-selected.png',
      fullPage: true
    });

    // Fill in the quantity
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill('100');
    await page.waitForTimeout(300);

    // Fill in the unit cost
    const unitCostInput = page.locator('input[type="number"]').nth(1);
    await unitCostInput.fill('50.00');
    await page.waitForTimeout(300);

    // Take screenshot before submitting
    await page.screenshot({
      path: 'tests/screenshots/line-item-before-submit.png',
      fullPage: true
    });

    // Click "Create 1 Line Item" button
    const createButton = page.locator('button:has-text("Create 1 Line Item")');
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();

    // Wait for success message or redirect
    await page.waitForTimeout(3000);

    // Take screenshot after submission
    await page.screenshot({
      path: 'tests/screenshots/line-item-after-submit.png',
      fullPage: true
    });

    // Verify we're still on the page or redirected to budget page
    const currentUrl = page.url();
    console.warn('Current URL after submission:', currentUrl);

    // Check if success toast appeared (if we're using toast notifications)
    const successToast = page.locator('text=success');
    if (await successToast.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.warn('Success toast appeared');
    }
  });
});
