import { test, expect } from '@playwright/test';

test.describe('Budget Page - Basic Load and API Verification', () => {
  test('budget page loads successfully and API returns data', async ({ page }) => {
    // Set up response listener before navigation - must match exactly
    const responsePromise = page.waitForResponse(
      response => {
        const url = response.url();
        return url.match(/\/api\/projects\/24104\/budget$/) && response.request().method() === 'GET';
      },
      { timeout: 30000 }
    );

    // Navigate to budget page for project 24104
    await page.goto('http://localhost:3003/24104/budget');

    // Wait for API response
    const apiResponse = await responsePromise;
    expect(apiResponse.status()).toBe(200);

    // Verify response has expected structure
    const responseData = await apiResponse.json();
    expect(responseData).toHaveProperty('lineItems');
    expect(responseData).toHaveProperty('grandTotals');
    expect(Array.isArray(responseData.lineItems)).toBe(true);
    expect(typeof responseData.grandTotals).toBe('object');

    // Verify page loaded (check for budget page header)
    await expect(page.locator('h1, h2').filter({ hasText: /budget/i }).first()).toBeVisible({ timeout: 10000 });

    // Check that grand totals structure exists (even if values are 0)
    expect(responseData.grandTotals).toHaveProperty('originalBudgetAmount');
    expect(responseData.grandTotals).toHaveProperty('revisedBudget');
    expect(responseData.grandTotals).toHaveProperty('projectedOverUnder');

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'tests/screenshots/budget-page-load-verification.png',
      fullPage: true
    });

    console.log('✅ Budget page loaded successfully');
    console.log('✅ API returned valid response structure');
    console.log(`📊 Line items count: ${responseData.lineItems.length}`);
    console.log(`💰 Grand totals revised budget: $${responseData.grandTotals.revisedBudget || 0}`);
  });

  test('budget API queries new SQL views correctly', async ({ page }) => {
    // Set up response listener before navigation - exact match
    const responsePromise = page.waitForResponse(
      response => {
        const url = response.url();
        return url.match(/\/api\/projects\/24104\/budget$/) && response.request().method() === 'GET';
      },
      { timeout: 30000 }
    );

    // Navigate
    await page.goto('http://localhost:3003/24104/budget');

    // Wait for API response
    const apiResponse = await responsePromise;
    const data = await apiResponse.json();

    // Verify SQL view columns are present in response
    if (data.lineItems && data.lineItems.length > 0) {
      const firstItem = data.lineItems[0];

      // These columns should come from v_budget_rollup view
      expect(firstItem).toHaveProperty('originalBudgetAmount');
      expect(firstItem).toHaveProperty('budgetModifications');
      expect(firstItem).toHaveProperty('approvedCOs');
      expect(firstItem).toHaveProperty('revisedBudget');
      expect(firstItem).toHaveProperty('jobToDateCostDetail');
      expect(firstItem).toHaveProperty('projectedOverUnder');

      console.log('✅ API response contains SQL view columns');
      console.log('Sample line item:', JSON.stringify(firstItem, null, 2));
    } else {
      console.log('ℹ️  No line items in response (empty budget) - this is OK for testing');
    }

    // Verify grand totals from v_budget_grand_totals view exist
    expect(data.grandTotals).toBeDefined();
    expect(data.grandTotals).toHaveProperty('originalBudgetAmount');
    expect(data.grandTotals).toHaveProperty('revisedBudget');
    expect(data.grandTotals).toHaveProperty('projectedBudget');
    expect(data.grandTotals).toHaveProperty('estimatedCostAtCompletion');
    expect(data.grandTotals).toHaveProperty('projectedOverUnder');

    console.log('✅ Grand totals structure verified from SQL views');
    console.log('Grand totals:', JSON.stringify(data.grandTotals, null, 2));
  });
});
