import { test, expect } from '@playwright/test';

const projectId = 24105;
const costCodeId = '03-3000';

test.describe('Budget end-to-end smoke', () => {
  test('creates a line item via API and validates UI', async ({ page }) => {
    // Ensure auth/session is established
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a budget line item through the authenticated API context
    const lineItemResult = await page.evaluate(
      async ({ projectId, costCodeId }) => {
        const response = await fetch(`/api/projects/${projectId}/budget`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineItems: [
              {
                costCodeId,
                costType: null,
                qty: '2',
                uom: 'LS',
                unitCost: '5000',
                amount: '10000',
              },
            ],
          }),
        });
        const json = await response.json();
        return { ok: response.ok, status: response.status, data: json };
      },
      { projectId, costCodeId }
    );

    if (!lineItemResult.ok) {
      console.error('Line item API failure:', lineItemResult);
    }
    expect(lineItemResult.ok).toBeTruthy();
    const budgetItemId = lineItemResult.data.data?.[0]?.id;
    expect(budgetItemId).toBeTruthy();

    // Add a modification to exercise that flow too
    const modificationResult = await page.evaluate(
      async ({ projectId, budgetItemId }) => {
        const response = await fetch(`/api/projects/${projectId}/budget/modifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            budgetItemId,
            amount: '2500',
            title: 'Automated Adjustment',
            reason: 'Playwright QA',
            approver: 'QA Bot',
            modificationType: 'change_order',
          }),
        });
        const json = await response.json();
        return { ok: response.ok, status: response.status, data: json };
      },
      { projectId, budgetItemId }
    );
    if (!modificationResult.ok) {
      console.error('Budget modification API failure:', modificationResult);
    }
    expect(modificationResult.ok).toBeTruthy();

    // Load the budget page and verify the table reflects the inserted line
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table').first();
    await expect(table).toContainText(costCodeId);

    await page.screenshot({
      path: 'frontend/tests/screenshots/budget-smoke.png',
      fullPage: true,
    });
  });
});
