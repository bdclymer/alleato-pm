import { expect, test } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Table Debug', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.use({ storageState: undefined });

  test('should check what is actually rendered in the budget table', async ({ page }) => {
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('networkidle');

    // Wait for table
    await page.waitForSelector('table', { timeout: 10000 });

    // Count table rows
    const rows = await page.locator('table tbody tr').all();
    console.log('Total table rows:', rows.length);

    // Check first few rows
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      const text = await row.innerText();
      console.log(`Row ${i}:`, text.substring(0, 100));

      // Check for chevron in this row
      const chevrons = await row.locator('svg').all();
      console.log(`  Chevrons in row ${i}:`, chevrons.length);
    }

    // Check what grouping is selected
    const groupSelector = page.locator('text=Group').locator('..').locator('button').first();
    const groupText = await groupSelector.innerText().catch(() => 'Not found');
    console.log('Current grouping:', groupText);

    // Try to find the table cells in the Original Budget column
    const cells = await page.locator('table tbody tr td').all();
    console.log('Total cells:', cells.length);

    // Take a screenshot
    await page.screenshot({ path: 'tests/screenshots/budget-table-debug.png', fullPage: true });
  });
});
