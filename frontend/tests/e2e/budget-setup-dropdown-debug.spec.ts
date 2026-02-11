import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Setup Dropdown Investigation', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test('investigate cost code titles not showing in dropdown', async ({ page }) => {
    // Enable console logging to capture the warn messages
    const consoleLogs: Array<{ type: string; text: string; args: unknown[] }> = [];
    page.on('console', async (msg) => {
      const args = [];
      for (const arg of msg.args()) {
        try {
          args.push(await arg.jsonValue());
        } catch (e) {
          args.push(arg.toString());
        }
      }
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        args
      });
    });

    // Navigate to the budget setup page with a longer timeout
    await page.goto(`http://localhost:3003/${projectId}/budget/setup`, { timeout: 60000, waitUntil: 'domcontentloaded' });

    // Wait for the loading message to disappear
    await page.waitForSelector('text=Loading project cost codes...', { state: 'hidden', timeout: 15000 });

    // Wait a bit for any async operations
    await page.waitForTimeout(1000);

    // Take screenshot after page loads
    await page.screenshot({
      path: '/Users/meganharrison/Documents/github/alleato-procore/tests/screenshots/budget-setup-loaded.png',
      fullPage: true
    });

    // Click on the "Select budget code..." button to open the dropdown
    const selectButton = page.locator('button:has-text("Select budget code")').first();
    await expect(selectButton).toBeVisible();
    await selectButton.click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // Take screenshot of the dropdown
    await page.screenshot({
      path: '/Users/meganharrison/Documents/github/alleato-procore/tests/screenshots/budget-setup-dropdown-open.png',
      fullPage: true
    });

    // Get the dropdown content
    const dropdownItems = await page.locator('[role="option"]').all();
    const dropdownTexts = await Promise.all(
      dropdownItems.map(item => item.textContent())
    );

    // Log all findings
    console.warn('\n=== INVESTIGATION RESULTS ===\n');

    console.warn('1. CONSOLE LOGS FROM PAGE:');
    consoleLogs.forEach(log => {
      console.warn(`[${log.type}] ${log.text}`);
      if (log.args.length > 0) {
        console.warn('Args:', JSON.stringify(log.args, null, 2));
      }
    });

    console.warn('\n2. DROPDOWN ITEMS:');
    console.warn(`Number of items: ${dropdownItems.length}`);
    console.warn(`Item texts: ${JSON.stringify(dropdownTexts, null, 2)}`);

    // Check if data was loaded correctly
    expect(consoleLogs.length).toBeGreaterThan(0);

    // Check if dropdown has items
    expect(dropdownItems.length).toBeGreaterThan(0);
  });
});
