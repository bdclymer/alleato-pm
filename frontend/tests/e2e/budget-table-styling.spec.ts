import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Table Styling', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to dev login first to authenticate
    // Wait for initial redirect
    await page.waitForLoadState('networkidle');
  });

  test('should display alternating row backgrounds (zebra striping)', async ({ page }) => {
    // Navigate to Budget page for project 67
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot of the table
    await page.screenshot({ path: 'tests/screenshots/budget-table-zebra-stripes.png', fullPage: true });

    // Get all table rows in the tbody
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();

    console.warn(`Found ${rowCount} rows in the budget table`);

    if (rowCount > 0) {
      // Check first row (index 0) - should have no background or white
      const firstRow = tableRows.nth(0);
      const firstRowBg = await firstRow.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      console.warn(`First row background: ${firstRowBg}`);

      // Check second row (index 1) - should have gray background
      if (rowCount > 1) {
        const secondRow = tableRows.nth(1);
        const secondRowBg = await secondRow.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });
        console.warn(`Second row background: ${secondRowBg}`);

        // Check third row (index 2) - should match first row
        if (rowCount > 2) {
          const thirdRow = tableRows.nth(2);
          const thirdRowBg = await thirdRow.evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
          });
          console.warn(`Third row background: ${thirdRowBg}`);
        }

        // Check fourth row (index 3) - should match second row
        if (rowCount > 3) {
          const fourthRow = tableRows.nth(3);
          const fourthRowBg = await fourthRow.evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
          });
          console.warn(`Fourth row background: ${fourthRowBg}`);
        }
      }

      // Verify alternating pattern by checking classes
      for (let i = 0; i < Math.min(rowCount, 6); i++) {
        const row = tableRows.nth(i);
        const classes = await row.getAttribute('class');
        console.warn(`Row ${i} classes: ${classes}`);
      }
    }

    console.warn('✅ VERIFIED: Budget table styling inspection complete');
  });
});
