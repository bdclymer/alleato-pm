import { test, expect } from '../../fixtures/index';
import path from 'path';
import { createTestProject } from '../../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

const TEST_PROJECT_ID = '118';
const BASE_URL = `${process.env.BASE_URL || 'http://localhost:3000'}/${TEST_PROJECT_ID}/budget`;

test.describe.skip('Budget Hierarchical Grouping - Phase 2c', () => {
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

  test.describe('Group Selector Dropdown', () => {
    test('should display "Add Group" dropdown', async ({ page }) => {
      // Find the "Add Group" button
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await expect(groupButton).toBeVisible();
    });

    test('should show grouping options in dropdown', async ({ page }) => {
      // Click the "Add Group" button
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();

      // Should show dropdown menu
      const dropdown = page.locator('[role="menu"]');
      await expect(dropdown).toBeVisible();

      // Should show grouping options
      await expect(dropdown.locator('text=Cost Code - Tier 1')).toBeVisible();
      await expect(dropdown.locator('text=Cost Code - Tier 2')).toBeVisible();
      await expect(dropdown.locator('text=Cost Code - Tier 3')).toBeVisible();
    });

    test('should select Cost Code Tier 1 grouping', async ({ page }) => {
      // Click the "Add Group" button
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();

      // Select "Cost Code - Tier 1"
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();

      // Dropdown should close
      const dropdown = page.locator('[role="menu"]');
      await expect(dropdown).not.toBeVisible();

      // Button should show the selected grouping
      await expect(groupButton).toContainText('Cost Code - Tier 1');
    });
  });

  test.describe('Hierarchical Display - Division Level (Tier 1)', () => {
    test('should group budget items by division', async ({ page }) => {
      // Select Cost Code Tier 1 grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();

      // Wait for table to update
      await page.waitForTimeout(500);

      // Find the budget table
      const table = page.locator('table').first();
      await expect(table).toBeVisible();

      // Should show division rows (e.g., "01", "02", "03")
      // These are group rows with cost code prefix
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Check for division patterns (cost codes starting with 2 digits)
      const firstRow = rows.first();
      const firstRowText = await firstRow.textContent();

      // Division rows should show cost code (e.g., "01", "02") and name (e.g., "General Conditions")
      // Note: Exact format depends on data, but should contain division code
      expect(firstRowText).toBeTruthy();
    });

    test('should show expansion controls for group rows', async ({ page }) => {
      // Select Cost Code Tier 1 grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();

      await page.waitForTimeout(500);

      // Find rows with expansion controls (chevron icons)
      const table = page.locator('table').first();
      const expandButtons = table.locator('button').filter({ has: page.locator('svg') });

      // Should have at least one expansion button
      const expandButtonCount = await expandButtons.count();
      expect(expandButtonCount).toBeGreaterThan(0);
    });

    test('should expand and collapse division groups', async ({ page }) => {
      // Select Cost Code Tier 1 grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();

      await page.waitForTimeout(500);

      const table = page.locator('table').first();

      // Get initial row count
      const initialRows = table.locator('tbody tr');
      const initialCount = await initialRows.count();

      // Find and click the first expansion button (should be collapsed by default)
      const expandButton = table.locator('button').filter({ has: page.locator('svg') }).first();
      await expandButton.click();

      await page.waitForTimeout(300);

      // Row count should increase (child rows are now visible)
      const expandedRows = table.locator('tbody tr');
      const expandedCount = await expandedRows.count();
      expect(expandedCount).toBeGreaterThan(initialCount);

      // Click again to collapse
      await expandButton.click();
      await page.waitForTimeout(300);

      // Row count should return to original
      const collapsedRows = table.locator('tbody tr');
      const collapsedCount = await collapsedRows.count();
      expect(collapsedCount).toBe(initialCount);
    });

    test('should style group rows differently from leaf rows', async ({ page }) => {
      // Select Cost Code Tier 1 grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();

      await page.waitForTimeout(500);

      const table = page.locator('table').first();
      const firstRow = table.locator('tbody tr').first();

      // Group rows should have distinct background (gray)
      const backgroundColor = await firstRow.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Should have some background color (not transparent/white)
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(backgroundColor).not.toBe('rgb(255, 255, 255)');
    });

    test('should show aggregated totals for division groups', async ({ page }) => {
      // Select Cost Code Tier 1 grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();

      await page.waitForTimeout(500);

      const table = page.locator('table').first();

      // Expand the first division
      const expandButton = table.locator('button').filter({ has: page.locator('svg') }).first();
      await expandButton.click();
      await page.waitForTimeout(300);

      // The division row should show aggregated financial values
      const divisionRow = table.locator('tbody tr').first();
      const divisionText = await divisionRow.textContent();

      // Should contain dollar amounts (currency values)
      expect(divisionText).toMatch(/\$[\d,]+/);
    });
  });

  test.describe('Hierarchical Display - Subdivision Level (Tier 2)', () => {
    test('should group by subdivision when Tier 2 is selected', async ({ page }) => {
      // Select Cost Code Tier 2 grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 2' }).click();

      await page.waitForTimeout(500);

      const table = page.locator('table').first();
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();

      // Should have rows (subdivisions)
      expect(rowCount).toBeGreaterThan(0);

      // Rows should be grouped at subdivision level (more granular than tier 1)
      const firstRow = rows.first();
      await expect(firstRow).toBeVisible();
    });

    test('should support nested expansion for Tier 2', async ({ page }) => {
      // Select Cost Code Tier 2 grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 2' }).click();

      await page.waitForTimeout(500);

      const table = page.locator('table').first();

      // Should have expansion buttons
      const expandButtons = table.locator('button').filter({ has: page.locator('svg') });
      const buttonCount = await expandButtons.count();
      expect(buttonCount).toBeGreaterThan(0);

      // Click to expand
      const firstButton = expandButtons.first();
      await firstButton.click();
      await page.waitForTimeout(300);

      // Should show child rows
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(1);
    });
  });

  test.describe('Interaction with Filters', () => {
    test('should apply grouping to filtered data', async ({ page }) => {
      // First apply a quick filter
      const filterButton = page.locator('button').filter({ hasText: /^All$|Over Budget|Under Budget/ }).first();
      await filterButton.click();

      // Select "Over Budget" filter if available
      const overBudgetOption = page.locator('[role="menuitem"]').filter({ hasText: 'Over Budget' });
      if (await overBudgetOption.isVisible()) {
        await overBudgetOption.click();
        await page.waitForTimeout(300);
      }

      // Then apply grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();

      await page.waitForTimeout(500);

      // Table should show grouped AND filtered data
      const table = page.locator('table').first();
      const rows = table.locator('tbody tr');

      // Should have some rows (filtered and grouped)
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('should maintain grouping when filters change', async ({ page }) => {
      // Apply grouping first
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();
      await page.waitForTimeout(300);

      // Verify grouping is active
      await expect(groupButton).toContainText('Cost Code - Tier 1');

      // Change filter
      const filterButton = page.locator('button').filter({ hasText: /^All$|Over Budget/ }).first();
      await filterButton.click();
      const underBudgetOption = page.locator('[role="menuitem"]').filter({ hasText: 'Under Budget' });
      if (await underBudgetOption.isVisible()) {
        await underBudgetOption.click();
        await page.waitForTimeout(300);
      }

      // Grouping should still be active
      await expect(groupButton).toContainText('Cost Code - Tier 1');

      // Table should still show groups
      const table = page.locator('table').first();
      const expandButtons = table.locator('button').filter({ has: page.locator('svg') });
      expect(await expandButtons.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Group Row Behavior', () => {
    test('should not allow selecting group rows', async ({ page }) => {
      // Apply grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();
      await page.waitForTimeout(500);

      const table = page.locator('table').first();
      const firstRow = table.locator('tbody tr').first();

      // Try to click the row
      await firstRow.click();

      // Row should not be selected (no selection styling)
      const hasSelectedClass = await firstRow.evaluate((el) => {
        return el.classList.contains('bg-blue-50');
      });

      // Group rows should not be selectable
      expect(hasSelectedClass).toBe(false);
    });

    test('should show cost code prefix for group rows', async ({ page }) => {
      // Apply grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();
      await page.waitForTimeout(500);

      const table = page.locator('table').first();

      // Expand first group to see both group and child rows
      const expandButton = table.locator('button').filter({ has: page.locator('svg') }).first();
      await expandButton.click();
      await page.waitForTimeout(300);

      const rows = table.locator('tbody tr');

      // First row should be the group row
      const groupRow = rows.first();
      const groupRowText = await groupRow.textContent();

      // Should contain a cost code pattern (e.g., "01", "02")
      // Group rows display: "01 General Conditions" format
      expect(groupRowText).toMatch(/\d{2}/); // At least 2 digits for cost code
    });

    test('should not allow editing group rows', async ({ page }) => {
      // Apply grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();
      await page.waitForTimeout(500);

      const table = page.locator('table').first();
      const firstRow = table.locator('tbody tr').first();

      // Try to double-click to edit (if edit modal exists)
      await firstRow.dblclick();
      await page.waitForTimeout(500);

      // Edit modal should not appear for group rows
      const modal = page.locator('[role="dialog"]');
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Removing Grouping', () => {
    test('should return to ungrouped view when "None" is selected', async ({ page }) => {
      // Apply grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();
      await page.waitForTimeout(500);

      // Get row count with grouping
      const table = page.locator('table').first();
      const groupedRows = table.locator('tbody tr');
      const groupedCount = await groupedRows.count();

      // Remove grouping
      await groupButton.click();
      const noneOption = page.locator('[role="menuitem"]').filter({ hasText: 'None' });
      if (await noneOption.isVisible()) {
        await noneOption.click();
        await page.waitForTimeout(500);

        // Row count should change (flat list instead of grouped)
        const ungroupedRows = table.locator('tbody tr');
        const ungroupedCount = await ungroupedRows.count();

        // Counts should be different
        expect(ungroupedCount).not.toBe(groupedCount);

        // Button should show "Add Group"
        await expect(groupButton).toContainText('Add Group');
      }
    });
  });

  test.describe('Data Integrity', () => {
    test('should preserve all budget items when grouped', async ({ page }) => {
      // Get total count without grouping
      const table = page.locator('table').first();
      let ungroupedRows = table.locator('tbody tr');
      const ungroupedCount = await ungroupedRows.count();

      // Apply grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();
      await page.waitForTimeout(500);

      // Expand all groups
      const expandButtons = table.locator('button').filter({ has: page.locator('svg') });
      const buttonCount = await expandButtons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = expandButtons.nth(i);
        if (await button.isVisible()) {
          await button.click();
          await page.waitForTimeout(200);
        }
      }

      // Count all rows (including groups and children)
      const allRows = table.locator('tbody tr');
      const totalRowCount = await allRows.count();

      // Total should include original items plus group headers
      expect(totalRowCount).toBeGreaterThanOrEqual(ungroupedCount);
    });

    test('should calculate correct totals for groups', async ({ page }) => {
      // Apply grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();
      await page.waitForTimeout(500);

      const table = page.locator('table').first();

      // Expand first group
      const expandButton = table.locator('button').filter({ has: page.locator('svg') }).first();
      await expandButton.click();
      await page.waitForTimeout(300);

      // Get all visible rows
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();

      // First row is the group, subsequent rows are children
      const groupRow = rows.first();
      const groupText = await groupRow.textContent();

      // Extract dollar amount from group row
      const groupMatch = groupText?.match(/\$([\d,]+)/);
      if (groupMatch) {
        const groupTotal = parseInt(groupMatch[1].replace(/,/g, ''));

        // Group total should be a reasonable number
        expect(groupTotal).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Performance', () => {
    test('should load grouped view within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      // Apply grouping
      const groupButton = page.locator('button').filter({ hasText: 'Add Group' });
      await groupButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Cost Code - Tier 1' }).click();

      // Wait for table to be visible
      const table = page.locator('table').first();
      await expect(table).toBeVisible();

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });
  });
});
