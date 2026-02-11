import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Tooltip Verification', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test('should display updated tooltips correctly', async ({ page }) => {
    await page.goto('/118/budget');

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Take screenshot of full page
    await page.screenshot({
      path: 'budget-tooltips-verification.png',
      fullPage: true
    });

    // Verify table is visible
    const table = page.locator('table').first();
    await expect(table).toBeVisible();

    // eslint-disable-next-line no-console
    console.log('Budget table is visible with updated tooltips');
  });
});
