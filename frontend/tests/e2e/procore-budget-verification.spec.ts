import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;
test.beforeEach(async ({ page, authenticatedRequest }) => {
  const project = await createTestProject(page, {}, authenticatedRequest);
  projectId = project.project.id;
});



/**
 * PROCORE BUDGET VERIFICATION TEST
 *
 * This test verifies the actual Procore budget page structure, tooltips, and editability.
 * It runs against the live Procore instance and does NOT require our local auth setup.
 */

test.describe.serial('Procore Budget Page - Interactive Verification', () => {
  test.use({
    storageState: undefined, // Don't use local auth
    baseURL: 'https://us02.procore.com'
  });

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('🔐 Logging into Procore...');

    // Login to Procore - Step 1: Email
    await page.goto('https://login.procore.com/');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.fill('input[type="email"], input[name="email"]', 'dexter.watkins@gmail.com');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);

    // Step 2: Password
    await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 10000 });
    await page.fill('input[type="password"], input[name="password"]', 'AlleatoGroup2025!');
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('✅ Login successful');

    // Save the auth state for all tests
    await context.storageState({ path: '../../../tests/.auth/procore.json' });
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page
    await page.goto('https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949955214786/tools/budgets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('1. Verify column headers exist', async ({ page }) => {
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

    console.log('\n📊 COLUMN HEADER VERIFICATION:');
    for (const columnName of expectedColumns) {
      const header = page.locator(`[role="columnheader"]:has-text("${columnName}")`).first();
      const isVisible = await header.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  ${isVisible ? '✅' : '❌'} ${columnName}`);
      expect(isVisible).toBe(true);
    }
  });

  test('2. Capture column tooltips', async ({ page }) => {
    const columns = [
      'Original Budget',
      'Budget Mods',
      'Approved COs',
      'Revised Budget',
      'JTD Cost Detail',
      'Direct Costs',
      'Pending Changes',
      'Projected Cost'
    ];

    console.log('\n💡 TOOLTIP VERIFICATION:');

    for (const columnName of columns) {
      const header = page.locator(`[role="columnheader"]:has-text("${columnName}")`).first();

      // Hover over the header
      await header.hover();
      await page.waitForTimeout(1500);

      // Try multiple tooltip selectors
      const tooltipSelectors = [
        '.ag-tooltip',
        '[role="tooltip"]',
        '.tooltip',
        '[class*="tooltip"]',
        '[class*="Tooltip"]'
      ];

      let tooltipFound = false;
      for (const selector of tooltipSelectors) {
        const tooltip = page.locator(selector).first();
        if (await tooltip.isVisible().catch(() => false)) {
          const tooltipText = await tooltip.textContent();
          console.log(`\n  ${columnName}:`);
          console.log(`    Tooltip: "${tooltipText}"`);
          tooltipFound = true;
          break;
        }
      }

      if (!tooltipFound) {
        console.log(`\n  ${columnName}:`);
        console.log(`    ⚠️  NO TOOLTIP FOUND`);
      }

      // Move mouse away
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
    }
  });

  test('3. Test cell editability', async ({ page }) => {
    // Wait for grid to load
    await page.waitForSelector('[role="grid"]', { timeout: 10000 });

    // Get first data row (skip header row)
    const firstRow = page.locator('[role="row"]').filter({ has: page.locator('[role="gridcell"]') }).first();

    const columnsToTest = [
      { name: 'Original Budget', expected: 'EDITABLE' },
      { name: 'Budget Mods', expected: 'EDITABLE' },
      { name: 'Approved COs', expected: 'READ-ONLY' },
      { name: 'Revised Budget', expected: 'READ-ONLY (calculated)' },
      { name: 'JTD Cost Detail', expected: 'READ-ONLY' },
      { name: 'Direct Costs', expected: 'READ-ONLY' },
      { name: 'Pending Changes', expected: 'READ-ONLY' },
      { name: 'Projected Cost', expected: 'READ-ONLY (calculated)' }
    ];

    console.log('\n✏️  EDITABILITY VERIFICATION:');
    console.log('Testing first data row...\n');

    for (const column of columnsToTest) {
      // Find the cell in the first row for this column
      const cell = firstRow.locator(`[col-id*="${column.name.toLowerCase().replace(/\s+/g, '_')}"]`).first()
        .or(firstRow.locator(`[aria-label*="${column.name}"]`).first());

      // Try to click the cell
      await cell.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);

      // Check if an input field appeared (various possible selectors)
      const inputSelectors = [
        cell.locator('input'),
        cell.locator('[contenteditable="true"]'),
        cell.locator('textarea'),
        page.locator('.ag-cell-edit-input')
      ];

      let isEditable = false;
      for (const inputSelector of inputSelectors) {
        if (await inputSelector.isVisible().catch(() => false)) {
          isEditable = true;
          break;
        }
      }

      const status = isEditable ? '✏️  EDITABLE' : '🔒 READ-ONLY';
      const match = (isEditable && column.expected.includes('EDITABLE')) ||
                    (!isEditable && column.expected.includes('READ-ONLY'));

      console.log(`  ${match ? '✅' : '❌'} ${column.name}: ${status} (expected: ${column.expected})`);

      // Press Escape to cancel any edit mode
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  });

  test('4. Verify calculations on first row', async ({ page }) => {
    await page.waitForSelector('[role="grid"]', { timeout: 10000 });

    const firstRow = page.locator('[role="row"]').filter({ has: page.locator('[role="gridcell"]') }).first();

    // Helper function to extract numeric value from a cell
    const getCellValue = async (partialColId: string): Promise<number> => {
      const cell = firstRow.locator(`[col-id*="${partialColId}"]`).first();
      const text = await cell.textContent().catch(() => '0');
      const cleaned = text?.replace(/[$,\s]/g, '') || '0';
      return parseFloat(cleaned) || 0;
    };

    const originalBudget = await getCellValue('original');
    const budgetMods = await getCellValue('mod');
    const approvedCOs = await getCellValue('approved');
    const revisedBudget = await getCellValue('revised');
    const jtdCost = await getCellValue('jtd').catch(() => getCellValue('cost'));
    const pendingChanges = await getCellValue('pending');
    const projectedCost = await getCellValue('projected');

    console.log('\n🧮 CALCULATION VERIFICATION:');
    console.log('\nFirst Row Values:');
    console.log(`  Original Budget: $${originalBudget.toFixed(2)}`);
    console.log(`  Budget Mods: $${budgetMods.toFixed(2)}`);
    console.log(`  Approved COs: $${approvedCOs.toFixed(2)}`);
    console.log(`  Revised Budget: $${revisedBudget.toFixed(2)}`);
    console.log(`  JTD Cost: $${jtdCost.toFixed(2)}`);
    console.log(`  Pending Changes: $${pendingChanges.toFixed(2)}`);
    console.log(`  Projected Cost: $${projectedCost.toFixed(2)}`);

    // Verify Revised Budget = Original + Mods + COs
    const expectedRevised = originalBudget + budgetMods + approvedCOs;
    const revisedMatch = Math.abs(revisedBudget - expectedRevised) < 0.01;
    console.log(`\n  ${revisedMatch ? '✅' : '❌'} Revised Budget: ${revisedBudget.toFixed(2)} (expected: ${expectedRevised.toFixed(2)})`);

    // Verify Projected Cost = JTD + Pending
    const expectedProjected = jtdCost + pendingChanges;
    const projectedMatch = Math.abs(projectedCost - expectedProjected) < 0.01;
    console.log(`  ${projectedMatch ? '✅' : '❌'} Projected Cost: ${projectedCost.toFixed(2)} (expected: ${expectedProjected.toFixed(2)})`);
  });

  test('5. Check for hidden columns (scroll right)', async ({ page }) => {
    await page.waitForSelector('[role="grid"]', { timeout: 10000 });

    const hiddenColumns = [
      'Over/Under Budget',
      'Remaining Budget',
      'Variance'
    ];

    console.log('\n👀 HIDDEN COLUMNS CHECK:');
    console.log('Scrolling grid to the right...\n');

    // Scroll the grid horizontally
    const grid = page.locator('[role="grid"]').first();
    await grid.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await page.waitForTimeout(1000);

    for (const columnName of hiddenColumns) {
      const header = page.locator(`[role="columnheader"]:has-text("${columnName}")`).first();
      const isVisible = await header.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        console.log(`  ✅ ${columnName} - FOUND`);

        // Try to get tooltip
        await header.hover();
        await page.waitForTimeout(1000);

        const tooltip = page.locator('.ag-tooltip, [role="tooltip"]').first();
        if (await tooltip.isVisible().catch(() => false)) {
          const tooltipText = await tooltip.textContent();
          console.log(`      Tooltip: "${tooltipText}"`);
        }
      } else {
        console.log(`  ❌ ${columnName} - NOT FOUND`);
      }
    }
  });

  test('6. Verify Budget Details tab', async ({ page }) => {
    // Click on Budget Details tab
    const detailsTab = page.locator('a:has-text("Budget Details"), button:has-text("Budget Details")').first();
    await detailsTab.click();
    await page.waitForTimeout(2000);

    const expectedColumns = [
      'Description',
      'Calculation Method',
      'Unit Qty',
      'UOM',
      'Unit Cost',
      'Original Budget'
    ];

    console.log('\n📝 BUDGET DETAILS TAB VERIFICATION:');

    for (const columnName of expectedColumns) {
      const header = page.locator(`[role="columnheader"]:has-text("${columnName}")`).first();
      const isVisible = await header.isVisible({ timeout: 5000 }).catch(() => false);

      if (isVisible) {
        console.log(`  ✅ ${columnName}`);

        // Try to get tooltip
        await header.hover();
        await page.waitForTimeout(1000);

        const tooltip = page.locator('.ag-tooltip, [role="tooltip"]').first();
        if (await tooltip.isVisible().catch(() => false)) {
          const tooltipText = await tooltip.textContent();
          console.log(`      Tooltip: "${tooltipText}"`);
        }
      } else {
        console.log(`  ❌ ${columnName} - NOT FOUND`);
      }
    }
  });

  test('7. Verify Forecasting tab structure', async ({ page }) => {
    // Click on Forecasting tab
    const forecastTab = page.locator('a:has-text("Forecasting"), button:has-text("Forecasting")').first();
    await forecastTab.click();
    await page.waitForTimeout(2000);

    console.log('\n📈 FORECASTING TAB VERIFICATION:');

    // Check if Forecasting tab has content
    const hasGrid = await page.locator('[role="grid"]').isVisible({ timeout: 5000 }).catch(() => false);

    if (hasGrid) {
      console.log('  ✅ Forecasting grid found');

      // Try to capture some column headers
      const headers = await page.locator('[role="columnheader"]').allTextContents();
      console.log(`  Found ${headers.length} columns:`);
      headers.slice(0, 10).forEach(h => {
        console.log(`    - ${h}`);
      });
    } else {
      console.log('  ⚠️  No grid found - may require configuration');
    }
  });

  test('8. Capture full screenshots for documentation', async ({ page }) => {
    console.log('\n📸 CAPTURING SCREENSHOTS:');

    // Main Budget tab
    await page.goto('https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949955214786/tools/budgets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'tests/screenshots/procore-budget-main-tab.png',
      fullPage: true
    });
    console.log('  ✅ Budget main tab screenshot saved');

    // Budget Details tab
    const detailsTab = page.locator('a:has-text("Budget Details"), button:has-text("Budget Details")').first();
    await detailsTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'tests/screenshots/procore-budget-details-tab.png',
      fullPage: true
    });
    console.log('  ✅ Budget Details tab screenshot saved');

    // Forecasting tab
    const forecastTab = page.locator('a:has-text("Forecasting"), button:has-text("Forecasting")').first();
    await forecastTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'tests/screenshots/procore-budget-forecasting-tab.png',
      fullPage: true
    });
    console.log('  ✅ Forecasting tab screenshot saved');
  });
});
