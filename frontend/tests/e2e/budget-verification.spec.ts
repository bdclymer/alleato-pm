import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Procore Budget Page Verification', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Login to Procore
    await page.goto('https://login.procore.com/');
    await page.fill('input[name="email"]', 'dexter.watkins@gmail.com');
    await page.fill('input[name="password"]', 'AlleatoGroup2025!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Navigate to budget page
    await page.goto('https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949955214786/tools/budgets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('should verify all column headers and tooltips exist', async ({ page }) => {
    // Expected columns on main Budget tab
    const expectedColumns = [
      'Description',
      'Original Budget',
      'Budget Mods',
      'Approved COs',
      'Revised Budget',
      'JTD Cost Detail',
      'Direct Costs',
      'Pending Changes',
      'Projected Cost'
    ];

    for (const columnName of expectedColumns) {
      const header = page.locator(`[role="columnheader"]:has-text("${columnName}")`).first();
      await expect(header).toBeVisible({ timeout: 5000 });

      // Check for tooltip icon or hover functionality
      await header.hover();
      await page.waitForTimeout(500);

      // Take screenshot of tooltip if visible
      const tooltip = page.locator('.ag-tooltip, [role="tooltip"]').first();
      if (await tooltip.isVisible()) {
        const tooltipText = await tooltip.textContent();
        console.log(`${columnName} tooltip: ${tooltipText}`);
      }
    }
  });

  test('should verify calculated columns have correct tooltips', async ({ page }) => {
    const calculatedColumns = [
      { name: 'Revised Budget', formula: 'Original Budget + Budget Mods + Approved COs' },
      { name: 'Projected Cost', formula: 'JTD Cost Detail + Pending Changes' },
    ];

    for (const col of calculatedColumns) {
      const header = page.locator(`[role="columnheader"]:has-text("${col.name}")`).first();
      await header.hover();
      await page.waitForTimeout(1000);

      const tooltip = page.locator('.ag-tooltip, [role="tooltip"]').first();
      if (await tooltip.isVisible()) {
        const tooltipText = await tooltip.textContent();
        console.log(`\n${col.name}:`);
        console.log(`  Expected formula: ${col.formula}`);
        console.log(`  Actual tooltip: ${tooltipText}`);

        // You can add assertions here based on what the tooltip should contain
        expect(tooltipText).toBeTruthy();
      }
    }
  });

  test('should verify calculations are correct for first row', async ({ page }) => {
    // Get first row data
    const firstRow = page.locator('[role="row"][row-index="0"]').first();

    // Extract values from cells
    const getCellValue = async (columnName: string) => {
      const cell = firstRow.locator(`[col-id="${columnName}"]`).first();
      const text = await cell.textContent();
      return parseFloat(text?.replace(/[$,]/g, '') || '0');
    };

    const originalBudget = await getCellValue('original_budget');
    const budgetMods = await getCellValue('budget_modifications');
    const approvedCOs = await getCellValue('approved_change_orders');
    const revisedBudget = await getCellValue('revised_budget');

    // Verify Revised Budget calculation
    const expectedRevisedBudget = originalBudget + budgetMods + approvedCOs;
    console.log(`\nRevised Budget Calculation:`);
    console.log(`  Original Budget: $${originalBudget.toFixed(2)}`);
    console.log(`  Budget Mods: $${budgetMods.toFixed(2)}`);
    console.log(`  Approved COs: $${approvedCOs.toFixed(2)}`);
    console.log(`  Expected: $${expectedRevisedBudget.toFixed(2)}`);
    console.log(`  Actual: $${revisedBudget.toFixed(2)}`);

    expect(revisedBudget).toBeCloseTo(expectedRevisedBudget, 2);
  });

  test('should check which cells are editable', async ({ page }) => {
    const firstRow = page.locator('[role="row"][row-index="0"]').first();

    const columnsToCheck = [
      'original_budget',
      'budget_modifications',
      'approved_change_orders',
      'revised_budget',
      'direct_costs',
      'pending_changes',
      'projected_cost'
    ];

    console.log('\nEditability Check:');
    for (const colId of columnsToCheck) {
      const cell = firstRow.locator(`[col-id="${colId}"]`).first();

      // Try to click the cell to see if it becomes editable
      await cell.click();
      await page.waitForTimeout(300);

      // Check if an input field appeared
      const input = cell.locator('input, [contenteditable="true"]').first();
      const isEditable = await input.isVisible().catch(() => false);

      console.log(`  ${colId}: ${isEditable ? 'EDITABLE' : 'READ-ONLY'}`);

      // Click away to close any editor
      await page.locator('body').click({ position: { x: 0, y: 0 } });
    }
  });

  test('should verify Budget Details tab columns and tooltips', async ({ page }) => {
    // Navigate to Budget Details tab
    await page.click('a:has-text("Budget Details")');
    await page.waitForTimeout(2000);

    // Expected columns on Budget Details tab
    const expectedDetailsColumns = [
      'Description',
      'Calculation Method',
      'Unit Qty',
      'UOM',
      'Unit Cost',
      'Original Budget'
    ];

    for (const columnName of expectedDetailsColumns) {
      const header = page.locator(`[role="columnheader"]:has-text("${columnName}")`).first();
      await expect(header).toBeVisible({ timeout: 5000 });

      await header.hover();
      await page.waitForTimeout(500);

      const tooltip = page.locator('.ag-tooltip, [role="tooltip"]').first();
      if (await tooltip.isVisible()) {
        const tooltipText = await tooltip.textContent();
        console.log(`${columnName} tooltip: ${tooltipText}`);
      }
    }
  });

  test('should verify all tooltips show calculation formulas', async ({ page }) => {
    const columnsWithFormulas = [
      'Revised Budget',
      'Projected Cost',
      'Over/Under Budget',
      'Remaining Budget',
      'Variance'
    ];

    console.log('\nTooltip Formula Verification:');

    for (const columnName of columnsWithFormulas) {
      const header = page.locator(`[role="columnheader"]:has-text("${columnName}")`).first();

      if (await header.isVisible().catch(() => false)) {
        await header.hover();
        await page.waitForTimeout(1000);

        const tooltip = page.locator('.ag-tooltip, [role="tooltip"]').first();

        if (await tooltip.isVisible().catch(() => false)) {
          const tooltipText = await tooltip.textContent();
          console.log(`\n${columnName}:`);
          console.log(`  Tooltip: ${tooltipText}`);

          // Verify tooltip contains formula-related text
          expect(tooltipText).toBeTruthy();
          expect(tooltipText!.length).toBeGreaterThan(10);
        } else {
          console.log(`\n${columnName}: NO TOOLTIP FOUND`);
        }
      } else {
        console.log(`\n${columnName}: COLUMN NOT VISIBLE`);
      }
    }
  });

  test('should capture full page screenshots for documentation', async ({ page }) => {
    // Main tab screenshot
    await page.screenshot({
      path: 'test-results/budget-main-tab-full.png',
      fullPage: true
    });

    // Budget Details tab
    await page.click('a:has-text("Budget Details")');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'test-results/budget-details-tab-full.png',
      fullPage: true
    });

    // Forecasting tab
    await page.click('a:has-text("Forecasting")');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'test-results/budget-forecasting-tab-full.png',
      fullPage: true
    });
  });
});
