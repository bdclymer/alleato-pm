import { test, expect } from '@playwright/test';

test.describe('Budget Line Item Page - Debug Issues', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/dev-login?email=test@example.com&password=testpassword123');
    await page.waitForTimeout(2000);
  });

  test('should display budget line item creation page and verify dropdown options', async ({ page }) => {
    // Navigate to budget line item creation page for project 67
    await page.goto('http://localhost:3000/67/budget/line-item/new');
    await page.waitForLoadState('networkidle');

    // Take initial screenshot
    await page.screenshot({ path: 'tests/screenshots/budget-line-item-initial.png', fullPage: true });

    // Click on the budget code dropdown for the first row
    const budgetCodeButton = page.locator('button[role="combobox"]').first();
    await expect(budgetCodeButton).toBeVisible();
    await budgetCodeButton.click();

    // Wait for dropdown to open
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/budget-line-item-dropdown-open.png', fullPage: true });

    // Get all dropdown options
    const options = page.locator('[role="option"]');
    const optionCount = await options.count();
    console.log(`Found ${optionCount} budget code options`);

    // Log all option texts
    for (let i = 0; i < optionCount; i++) {
      const optionText = await options.nth(i).textContent();
      console.log(`Option ${i + 1}: ${optionText}`);
    }

    // Check if "Create New Budget Code" option exists
    const createNewOption = page.locator('text=Create New Budget Code');
    await expect(createNewOption).toBeVisible();

    // Click on "Create New Budget Code"
    await createNewOption.click();
    await page.waitForTimeout(1000);

    // Verify modal opens
    const modal = page.locator('role=dialog');
    await expect(modal).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/budget-line-item-modal-open.png', fullPage: true });

    // Check the cost code selector in the modal
    const costCodeSection = page.locator('text=Cost Code*').locator('..');
    await expect(costCodeSection).toBeVisible();

    // Look for division headers (should be collapsible)
    const divisions = page.locator('[role="dialog"] button').filter({ hasText: /^(General Requirements|Site Construction|Concrete|Masonry)/ });
    const divisionCount = await divisions.count();
    console.log(`Found ${divisionCount} divisions in modal`);

    if (divisionCount > 0) {
      // Click first division to expand
      await divisions.first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'tests/screenshots/budget-line-item-division-expanded.png', fullPage: true });

      // Check for cost codes under the division
      const costCodes = page.locator('[role="dialog"] button').filter({ hasText: /^\d{2}-\d{4}/ });
      const costCodeCount = await costCodes.count();
      console.log(`Found ${costCodeCount} cost codes under first division`);

      if (costCodeCount > 0) {
        // Select the first cost code
        await costCodes.first().click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'tests/screenshots/budget-line-item-cost-code-selected.png', fullPage: true });

        // Verify preview shows selected code
        const preview = page.locator('text=Preview:').locator('..');
        const previewText = await preview.textContent();
        console.log(`Preview text: ${previewText}`);

        // Try to submit the new budget code
        const createButton = page.locator('role=dialog').locator('button', { hasText: 'Create Budget Code' });
        await expect(createButton).toBeEnabled();
        await createButton.click();
        await page.waitForTimeout(2000);

        // Check if modal closed
        const modalVisible = await modal.isVisible();
        console.log(`Modal still visible after submit: ${modalVisible}`);

        await page.screenshot({ path: 'tests/screenshots/budget-line-item-after-submit.png', fullPage: true });

        // Check if new code appears in dropdown
        await budgetCodeButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'tests/screenshots/budget-line-item-dropdown-after-create.png', fullPage: true });
      }
    }
  });

  test('should verify API response for budget codes', async ({ page }) => {
    // Intercept the API call
    const apiResponse = await page.request.get('http://localhost:3000/api/projects/67/budget-codes');
    const responseBody = await apiResponse.json();

    console.log('API Response:', JSON.stringify(responseBody, null, 2));
    expect(apiResponse.ok()).toBeTruthy();

    // Log budget codes
    if (responseBody.budgetCodes) {
      console.log(`Total budget codes: ${responseBody.budgetCodes.length}`);
      responseBody.budgetCodes.forEach((code: { fullLabel: string; id: string }, index: number) => {
        console.log(`Code ${index + 1}: ${code.fullLabel} (ID: ${code.id})`);
      });
    }
  });
});
