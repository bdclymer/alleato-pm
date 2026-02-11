import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Display Check', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test('should display budget page and capture console errors', async ({ page }) => {
    // Listen for console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        // eslint-disable-next-line no-console
        console.error('Browser console error:', text);
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      // eslint-disable-next-line no-console
      console.error('Page error:', error.message);
      consoleMessages.push(`[pageerror] ${error.message}`);
    });

    // Navigate to budget page
    await page.goto('/118/budget');

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: 'budget-display-debug.png',
      fullPage: true
    });

    // Check if budget table is visible
    const budgetTable = page.locator('table').first();
    const isVisible = await budgetTable.isVisible().catch(() => false);

    // eslint-disable-next-line no-console
    console.log('Budget table visible:', isVisible);
    // eslint-disable-next-line no-console
    console.log('Console messages:', consoleMessages);

    // Log page content
    const bodyText = await page.locator('body').textContent();
    // eslint-disable-next-line no-console
    console.log('Page contains "Budget":', bodyText?.includes('Budget'));
  });
});
