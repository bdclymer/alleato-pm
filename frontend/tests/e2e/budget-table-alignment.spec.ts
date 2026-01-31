import { test, expect } from '@playwright/test';

test.describe('Budget Table Alignment Verification', () => {
  test('grand totals row aligns with column headers', async ({ page }) => {
    // Navigate to budget page
    await page.goto('http://localhost:3000/67/budget');
    await page.waitForLoadState('networkidle');

    // Take screenshot of budget table
    await page.screenshot({
      path: 'tests/screenshots/budget-table-alignment.png',
      fullPage: true
    });

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Get the header cells
    const headers = await page.$$('thead th');

    // Get the grand totals row cells
    const grandTotalCells = await page.$$('tbody tr:last-child td');

    console.log(`Found ${headers.length} headers and ${grandTotalCells.length} grand total cells`);

    // Verify we have cells in both rows
    expect(headers.length).toBeGreaterThan(0);
    expect(grandTotalCells.length).toBeGreaterThan(0);

    // Check Original Budget column alignment (column index 2)
    if (headers.length > 2 && grandTotalCells.length > 2) {
      const headerBox = await headers[2].boundingBox();
      const cellBox = await grandTotalCells[2].boundingBox();

      if (headerBox && cellBox) {
        console.log('Original Budget Header:', headerBox);
        console.log('Original Budget Grand Total:', cellBox);

        // Verify X positions are aligned (within 5px tolerance)
        expect(Math.abs(headerBox.x - cellBox.x)).toBeLessThan(5);

        // Verify widths match (within 5px tolerance)
        expect(Math.abs(headerBox.width - cellBox.width)).toBeLessThan(5);
      }
    }
  });
});
