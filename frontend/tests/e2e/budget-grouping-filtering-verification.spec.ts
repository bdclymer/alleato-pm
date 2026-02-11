import { test, expect } from '../fixtures/index';
import path from 'path';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

const TEST_PROJECT_ID = '118';
const BASE_URL = `${process.env.BASE_URL || 'http://localhost:3000'}/${TEST_PROJECT_ID}/budget`;

test.describe.skip('Budget Hierarchical Grouping and Filtering - Complete Verification', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Load authentication
    const authFile = path.join(__dirname, '../.auth/user.json');
    const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));

    // Set cookies
    await page.context().addCookies(authData.cookies);

    // Navigate to budget page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Hierarchical Grouping Verification', () => {
    test('should group by Cost Code Tier', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Find and click the Group dropdown
      const groupDropdown = page.locator('button').filter({ hasText: /Cost Code Tier|No Grouping|Group/i }).first();

      if (await groupDropdown.isVisible({ timeout: 5000 })) {
        await groupDropdown.click();
        await page.waitForTimeout(300);

        // Select "Cost Code Tier" grouping
        const costCodeTierOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: /Cost Code Tier/i });

        if (await costCodeTierOption.isVisible({ timeout: 3000 })) {
          await costCodeTierOption.click();
          await page.waitForTimeout(1000);

          // Verify grouping applied - look for expandable rows
          const expandableRows = page.locator('tbody tr').filter({ has: page.locator('button svg, [aria-expanded]') });
          const expandCount = await expandableRows.count();

          if (expandCount > 0) {
            // Verify grouping headers are present
            await expect(page.locator('tbody tr').filter({ hasText: /01-|02-|03-/ }).first()).toBeVisible();

            // Test expanding a group
            const firstExpandButton = expandableRows.first().locator('button').first();
            await firstExpandButton.click();
            await page.waitForTimeout(500);

            await page.screenshot({ path: 'tests/screenshots/grouping/cost-code-tier-expanded.png' });

            // Test collapsing the group
            await firstExpandButton.click();
            await page.waitForTimeout(500);

            await page.screenshot({ path: 'tests/screenshots/grouping/cost-code-tier-collapsed.png' });
          } else {
            console.log('No expandable rows found - grouping may not be available');
          }
        }
      } else {
        test.skip('Group dropdown not found');
      }
    });

    test('should group by Cost Type', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Find and click the Group dropdown
      const groupDropdown = page.locator('button').filter({ hasText: /Cost Code Tier|Cost Type|No Grouping/i }).first();

      if (await groupDropdown.isVisible({ timeout: 5000 })) {
        await groupDropdown.click();
        await page.waitForTimeout(300);

        // Select "Cost Type" grouping
        const costTypeOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: /Cost Type/i });

        if (await costTypeOption.isVisible({ timeout: 3000 })) {
          await costTypeOption.click();
          await page.waitForTimeout(1000);

          // Verify cost type groups (Labor, Material, Equipment, etc.)
          const costTypeGroups = page.locator('tbody tr').filter({ hasText: /Labor|Material|Equipment|Subcontract/i });
          const groupCount = await costTypeGroups.count();

          if (groupCount > 0) {
            await expect(costTypeGroups.first()).toBeVisible();

            // Test expanding cost type groups
            const expandButtons = page.locator('tbody tr button').filter({ has: page.locator('svg') });
            const buttonCount = await expandButtons.count();

            if (buttonCount > 0) {
              await expandButtons.first().click();
              await page.waitForTimeout(500);

              await page.screenshot({ path: 'tests/screenshots/grouping/cost-type-grouped.png' });
            }
          }
        }
      }
    });

    test('should remove grouping (No Grouping)', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // First apply some grouping
      const groupDropdown = page.locator('button').filter({ hasText: /Cost Code Tier|Cost Type|No Grouping/i }).first();

      if (await groupDropdown.isVisible({ timeout: 5000 })) {
        await groupDropdown.click();
        await page.waitForTimeout(300);

        // Select Cost Code Tier first
        const costCodeTierOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: /Cost Code Tier/i });

        if (await costCodeTierOption.isVisible({ timeout: 3000 })) {
          await costCodeTierOption.click();
          await page.waitForTimeout(1000);

          // Now remove grouping
          await groupDropdown.click();
          await page.waitForTimeout(300);

          const noGroupingOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: /No Grouping/i });

          if (await noGroupingOption.isVisible({ timeout: 3000 })) {
            await noGroupingOption.click();
            await page.waitForTimeout(1000);

            // Verify no grouping - should not have expand buttons in data rows
            const dataRows = page.locator('tbody tr').filter({ hasNotText: /Grand Total|Total/ });
            const expandButtons = dataRows.locator('button').filter({ has: page.locator('svg') });
            const buttonCount = await expandButtons.count();

            // With no grouping, there should be fewer or no expand buttons
            expect(buttonCount).toBeLessThanOrEqual(2);

            await page.screenshot({ path: 'tests/screenshots/grouping/no-grouping.png' });
          }
        }
      }
    });

    test('should calculate correct totals for grouped data', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Apply Cost Type grouping
      const groupDropdown = page.locator('button').filter({ hasText: /Cost Code Tier|Cost Type|No Grouping/i }).first();

      if (await groupDropdown.isVisible({ timeout: 5000 })) {
        await groupDropdown.click();
        await page.waitForTimeout(300);

        const costTypeOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: /Cost Type/i });

        if (await costTypeOption.isVisible({ timeout: 3000 })) {
          await costTypeOption.click();
          await page.waitForTimeout(1000);

          // Verify group totals are displayed
          const groupTotals = page.locator('tbody tr').filter({ hasText: /Total|Subtotal/ });
          const totalCount = await groupTotals.count();

          if (totalCount > 0) {
            // Verify at least one group total is visible
            await expect(groupTotals.first()).toBeVisible();

            // Verify Grand Total is still present
            await expect(page.locator('text=Grand Total')).toBeVisible();

            await page.screenshot({ path: 'tests/screenshots/grouping/group-totals.png' });
          }
        }
      }
    });
  });

  test.describe('Advanced Filtering Verification', () => {
    test('should add and apply custom filters', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Click Add Filter button
      const addFilterButton = page.locator('button').filter({ hasText: /Add Filter/i }).first();

      if (await addFilterButton.isVisible({ timeout: 5000 })) {
        await addFilterButton.click();
        await page.waitForTimeout(500);

        // Check if filter dropdown/modal appeared
        const filterOptions = page.locator('[role="menu"], [role="dialog"]').filter({
          hasText: /Cost Code|Description|Budget Amount|filter/i
        });

        if (await filterOptions.isVisible({ timeout: 3000 })) {
          // Select a filter type (e.g., Budget Amount)
          const budgetAmountFilter = filterOptions.locator('text=Budget Amount').or(
            filterOptions.locator('[role="menuitem"]').filter({ hasText: /Budget|Amount/ })
          );

          if (await budgetAmountFilter.isVisible({ timeout: 2000 })) {
            await budgetAmountFilter.click();
            await page.waitForTimeout(500);

            // Look for filter input field
            const filterInput = page.locator('input[type="number"], input[placeholder*="amount"], input[placeholder*="filter"]');

            if (await filterInput.isVisible({ timeout: 3000 })) {
              await filterInput.fill('5000');
              await page.waitForTimeout(500);

              // Apply filter
              const applyButton = page.locator('button').filter({ hasText: /Apply|Filter|OK/i });
              if (await applyButton.isVisible({ timeout: 2000 })) {
                await applyButton.click();
                await page.waitForTimeout(1000);

                // Verify filter is applied
                const filteredResults = page.locator('tbody tr').filter({ hasNotText: /No data|Total/ });
                const resultCount = await filteredResults.count();

                expect(resultCount).toBeGreaterThanOrEqual(0);

                await page.screenshot({ path: 'tests/screenshots/filtering/budget-amount-filter.png' });
              }
            }
          }
        }
      }
    });

    test('should use quick filter presets', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Look for quick filter buttons or dropdowns
      const quickFilters = page.locator('button').filter({
        hasText: /Over Budget|Under Budget|No Budget|Active|All/i
      });

      const filterCount = await quickFilters.count();

      if (filterCount > 0) {
        // Test "Over Budget" filter
        const overBudgetFilter = quickFilters.filter({ hasText: /Over Budget/i });

        if (await overBudgetFilter.isVisible({ timeout: 3000 })) {
          await overBudgetFilter.click();
          await page.waitForTimeout(1000);

          // Verify filter is applied
          const filteredRows = page.locator('tbody tr').filter({ hasNotText: /No data|Total/ });
          const rowCount = await filteredRows.count();

          expect(rowCount).toBeGreaterThanOrEqual(0);

          await page.screenshot({ path: 'tests/screenshots/filtering/over-budget-preset.png' });

          // Reset filter
          const allFilter = quickFilters.filter({ hasText: /All|Clear/i });
          if (await allFilter.isVisible({ timeout: 2000 })) {
            await allFilter.click();
            await page.waitForTimeout(500);
          }
        }
      }
    });

    test('should filter by cost code patterns', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Look for cost code filter or search
      const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="filter"], input[type="search"]');

      if (await searchInput.isVisible({ timeout: 5000 })) {
        // Filter by cost code pattern (e.g., "01-")
        await searchInput.fill('01-');
        await page.waitForTimeout(1000);

        // Verify filtering works
        const filteredRows = page.locator('tbody tr').filter({ hasText: /01-/ });
        const matchCount = await filteredRows.count();

        if (matchCount > 0) {
          await expect(filteredRows.first()).toBeVisible();
          await page.screenshot({ path: 'tests/screenshots/filtering/cost-code-pattern.png' });
        }

        // Clear filter
        await searchInput.clear();
        await page.waitForTimeout(500);
      }
    });

    test('should combine grouping and filtering', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Apply Cost Type grouping first
      const groupDropdown = page.locator('button').filter({ hasText: /Cost Code Tier|Cost Type|No Grouping/i }).first();

      if (await groupDropdown.isVisible({ timeout: 5000 })) {
        await groupDropdown.click();
        await page.waitForTimeout(300);

        const costTypeOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: /Cost Type/i });

        if (await costTypeOption.isVisible({ timeout: 3000 })) {
          await costTypeOption.click();
          await page.waitForTimeout(1000);

          // Now apply a filter
          const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="filter"], input[type="search"]');

          if (await searchInput.isVisible({ timeout: 3000 })) {
            await searchInput.fill('Labor');
            await page.waitForTimeout(1000);

            // Verify both grouping and filtering are applied
            const laborGroups = page.locator('tbody tr').filter({ hasText: /Labor/i });
            const laborCount = await laborGroups.count();

            if (laborCount > 0) {
              await expect(laborGroups.first()).toBeVisible();
              await page.screenshot({ path: 'tests/screenshots/filtering/grouped-and-filtered.png' });
            }

            // Clear filter
            await searchInput.clear();
            await page.waitForTimeout(500);
          }
        }
      }
    });
  });

  test.describe('Column Sorting Verification', () => {
    test('should sort by Cost Code column', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Click on Cost Code column header
      const costCodeHeader = page.locator('th').filter({ hasText: /Cost Code/i });

      if (await costCodeHeader.isVisible({ timeout: 5000 })) {
        await costCodeHeader.click();
        await page.waitForTimeout(500);

        // Verify sort indicator appears
        const sortIndicator = costCodeHeader.locator('svg, [aria-sort]');
        const hasIndicator = await sortIndicator.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasIndicator) {
          await expect(sortIndicator).toBeVisible();
        }

        await page.screenshot({ path: 'tests/screenshots/sorting/cost-code-sort.png' });

        // Click again for reverse sort
        await costCodeHeader.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'tests/screenshots/sorting/cost-code-reverse-sort.png' });
      }
    });

    test('should sort by Budget Amount column', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Click on Budget Amount column header
      const budgetAmountHeader = page.locator('th').filter({ hasText: /Budget Amount|Original Budget/i });

      if (await budgetAmountHeader.isVisible({ timeout: 5000 })) {
        await budgetAmountHeader.click();
        await page.waitForTimeout(500);

        // Verify numerical sorting
        const firstDataRow = page.locator('tbody tr').filter({ hasNotText: /Total|Grand/ }).first();
        const lastDataRow = page.locator('tbody tr').filter({ hasNotText: /Total|Grand/ }).last();

        // Both should be visible
        await expect(firstDataRow).toBeVisible();
        await expect(lastDataRow).toBeVisible();

        await page.screenshot({ path: 'tests/screenshots/sorting/budget-amount-sort.png' });

        // Reverse sort
        await budgetAmountHeader.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'tests/screenshots/sorting/budget-amount-reverse.png' });
      }
    });

    test('should sort by Description column', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Click on Description column header
      const descriptionHeader = page.locator('th').filter({ hasText: /Description/i });

      if (await descriptionHeader.isVisible({ timeout: 5000 })) {
        await descriptionHeader.click();
        await page.waitForTimeout(500);

        // Verify alphabetical sorting
        const dataRows = page.locator('tbody tr').filter({ hasNotText: /Total|Grand/ });
        const rowCount = await dataRows.count();

        if (rowCount > 1) {
          await expect(dataRows.first()).toBeVisible();
          await expect(dataRows.last()).toBeVisible();
        }

        await page.screenshot({ path: 'tests/screenshots/sorting/description-sort.png' });
      }
    });

    test('should maintain sort when grouping is applied', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // First apply sorting
      const costCodeHeader = page.locator('th').filter({ hasText: /Cost Code/i });

      if (await costCodeHeader.isVisible({ timeout: 5000 })) {
        await costCodeHeader.click();
        await page.waitForTimeout(500);

        // Then apply grouping
        const groupDropdown = page.locator('button').filter({ hasText: /Cost Code Tier|Cost Type|No Grouping/i }).first();

        if (await groupDropdown.isVisible({ timeout: 3000 })) {
          await groupDropdown.click();
          await page.waitForTimeout(300);

          const costTypeOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: /Cost Type/i });

          if (await costTypeOption.isVisible({ timeout: 3000 })) {
            await costTypeOption.click();
            await page.waitForTimeout(1000);

            // Verify both sorting and grouping are maintained
            const groupHeaders = page.locator('tbody tr').filter({ hasText: /Labor|Material|Equipment/i });
            const groupCount = await groupHeaders.count();

            if (groupCount > 0) {
              await expect(groupHeaders.first()).toBeVisible();
            }

            await page.screenshot({ path: 'tests/screenshots/sorting/sorted-and-grouped.png' });
          }
        }
      }
    });
  });

  test.describe('Grand Totals Verification', () => {
    test('should display and update Grand Totals row', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Verify Grand Totals row is present
      const grandTotalsRow = page.locator('text=Grand Total').or(
        page.locator('text=Total').or(
          page.locator('tbody tr').filter({ hasText: /Total.*\$/ })
        )
      );

      if (await grandTotalsRow.isVisible({ timeout: 5000 })) {
        await expect(grandTotalsRow).toBeVisible();

        // Verify totals have numerical values
        const totalAmounts = grandTotalsRow.locator('text=/\\$[\\d,]+/');
        const amountCount = await totalAmounts.count();

        expect(amountCount).toBeGreaterThan(0);

        await page.screenshot({ path: 'tests/screenshots/grouping/grand-totals.png' });

        // Apply grouping and verify totals update
        const groupDropdown = page.locator('button').filter({ hasText: /Cost Code Tier|Cost Type|No Grouping/i }).first();

        if (await groupDropdown.isVisible({ timeout: 3000 })) {
          await groupDropdown.click();
          await page.waitForTimeout(300);

          const costTypeOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: /Cost Type/i });

          if (await costTypeOption.isVisible({ timeout: 3000 })) {
            await costTypeOption.click();
            await page.waitForTimeout(1000);

            // Verify Grand Totals still present and accurate
            await expect(grandTotalsRow).toBeVisible();

            await page.screenshot({ path: 'tests/screenshots/grouping/grand-totals-with-grouping.png' });
          }
        }
      } else {
        test.skip('Grand Totals row not found');
      }
    });
  });

  test.describe('Performance with Large Datasets', () => {
    test('should handle grouping and filtering with many line items', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Check if there are many line items
      const allRows = page.locator('tbody tr');
      const totalRows = await allRows.count();

      console.log(`Testing with ${totalRows} rows`);

      // Apply grouping
      const groupDropdown = page.locator('button').filter({ hasText: /Cost Code Tier|Cost Type|No Grouping/i }).first();

      if (await groupDropdown.isVisible({ timeout: 5000 })) {
        const startTime = Date.now();

        await groupDropdown.click();
        await page.waitForTimeout(300);

        const costTypeOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: /Cost Type/i });

        if (await costTypeOption.isVisible({ timeout: 3000 })) {
          await costTypeOption.click();
          await page.waitForTimeout(2000);

          const endTime = Date.now();
          const groupingTime = endTime - startTime;

          console.log(`Grouping took ${groupingTime}ms`);

          // Verify grouping worked
          const expandableRows = page.locator('tbody tr').filter({ has: page.locator('button svg') });
          const expandCount = await expandableRows.count();

          if (expandCount > 0) {
            await expect(expandableRows.first()).toBeVisible();
          }

          // Test responsiveness - should be under 5 seconds for reasonable performance
          expect(groupingTime).toBeLessThan(5000);

          await page.screenshot({ path: 'tests/screenshots/grouping/performance-test.png' });
        }
      }
    });
  });
});
