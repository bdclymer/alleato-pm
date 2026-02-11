import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Setup - Autopopulation and Quantity Default', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to dev login first to authenticate
    await page.waitForLoadState('networkidle');
  });

  test('should autopopulate budget code and set qty to 1 when creating new budget code', async ({ page }) => {
    // Navigate to budget setup page for project 67
    await page.goto(`/${projectId}/budget/setup`);
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('h1:has-text("Add Budget Line Items")')).toBeVisible({ timeout: 10000 });

    // Take initial screenshot
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-initial.png',
      fullPage: true
    });

    // Verify first row exists and budget code is empty
    const budgetCodeSelector = page.locator('button[role="combobox"]:has-text("Select budget code...")').first();
    await expect(budgetCodeSelector).toBeVisible({ timeout: 5000 });

    // Verify quantity field is empty initially
    const qtyInput = page.locator('input[type="number"][placeholder="0"]').first();
    await expect(qtyInput).toBeVisible();
    const initialQty = await qtyInput.inputValue();
    expect(initialQty).toBe('');

    // Click on the budget code selector
    await budgetCodeSelector.click();
    await page.waitForTimeout(500);

    // Click "Create New Budget Code" option
    const createCodeOption = page.locator('text=Create New Budget Code');
    await expect(createCodeOption).toBeVisible({ timeout: 5000 });
    await createCodeOption.click();

    // Wait for "Create New Budget Code" dialog to open
    const dialogTitle = page.locator('h2:has-text("Create New Budget Code")');
    await expect(dialogTitle).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: 'tests/screenshots/budget-setup-create-dialog.png',
      fullPage: true
    });

    // Wait for cost codes to load
    await page.waitForTimeout(1000);

    // Expand first division to see cost codes
    const divisions = page.locator('button').filter({ hasText: /^[A-Z0-9]/ });
    const firstDivision = divisions.first();
    await expect(firstDivision).toBeVisible({ timeout: 5000 });
    await firstDivision.click();
    await page.waitForTimeout(500);

    // Select first cost code under the expanded division
    const costCodeButtons = page.locator('button').filter({ hasText: /-/ });
    const firstCostCode = costCodeButtons.first();
    await expect(firstCostCode).toBeVisible({ timeout: 5000 });

    // Get the cost code text for verification later
    const costCodeText = await firstCostCode.textContent();
    console.warn('Selected cost code:', costCodeText);

    await firstCostCode.click();
    await page.waitForTimeout(300);

    // Verify cost type defaults to "R - Contract Revenue"
    const costTypeButton = page.locator('button[role="combobox"]').filter({
      hasText: /Contract Revenue|Equipment|Expense|Labor|Material|Subcontract/
    });
    await expect(costTypeButton).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/budget-setup-code-selected.png',
      fullPage: true
    });

    // Click "Create Budget Code" button
    const createBudgetCodeButton = page.locator('button:has-text("Create Budget Code")');
    await expect(createBudgetCodeButton).toBeEnabled({ timeout: 3000 });
    await createBudgetCodeButton.click();

    // Wait for success toast
    await expect(page.locator('text=Budget code created successfully')).toBeVisible({ timeout: 10000 });
    console.warn('✅ Budget code created successfully');

    // Wait for dialog to close
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: 'tests/screenshots/budget-setup-after-creation.png',
      fullPage: true
    });

    // VERIFY 1: The newly created budget code should be autopopulated in the first row
    const budgetCodeSelectorAfter = page.locator('button[role="combobox"]').first();
    const selectedText = await budgetCodeSelectorAfter.textContent();

    console.warn('Budget code selector text after creation:', selectedText);

    // Should no longer say "Select budget code..."
    expect(selectedText).not.toContain('Select budget code...');

    // Should contain a cost code format (e.g., "01.010")
    expect(selectedText).toMatch(/\d+/);

    console.warn('✅ VERIFIED: Budget code was automatically populated in the first row');

    // VERIFY 2: Quantity should be automatically set to 1
    const qtyInputAfter = page.locator('input[type="number"][placeholder="0"]').first();
    const finalQty = await qtyInputAfter.inputValue();

    console.warn('Quantity value after budget code selection:', finalQty);
    expect(finalQty).toBe('1');
    console.warn('✅ VERIFIED: Quantity was automatically set to 1');

    // Take final screenshot
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-autopopulated-complete.png',
      fullPage: true
    });
  });

  test('should autopopulate budget code and set qty to 1 when selecting existing budget code', async ({ page }) => {
    // Navigate to budget setup page for project 67
    await page.goto(`/${projectId}/budget/setup`);
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('h1:has-text("Add Budget Line Items")')).toBeVisible({ timeout: 10000 });

    // Verify first row exists
    const budgetCodeSelector = page.locator('button[role="combobox"]:has-text("Select budget code...")').first();
    await expect(budgetCodeSelector).toBeVisible({ timeout: 5000 });

    // Verify quantity field is empty initially
    const qtyInput = page.locator('input[type="number"][placeholder="0"]').first();
    const initialQty = await qtyInput.inputValue();
    expect(initialQty).toBe('');

    // Click on the budget code selector
    await budgetCodeSelector.click();
    await page.waitForTimeout(500);

    // Select first existing budget code from the dropdown (not "Create New")
    const firstExistingCode = page.locator('[role="option"]').first();
    await expect(firstExistingCode).toBeVisible({ timeout: 5000 });
    await firstExistingCode.click();
    await page.waitForTimeout(500);

    // Take screenshot after selection
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-existing-selected.png',
      fullPage: true
    });

    // VERIFY 1: The selected budget code should be displayed
    const budgetCodeSelectorAfter = page.locator('button[role="combobox"]').first();
    const selectedText = await budgetCodeSelectorAfter.textContent();

    console.warn('Selected budget code text:', selectedText);
    expect(selectedText).not.toContain('Select budget code...');

    // VERIFY 2: Quantity should be automatically set to 1
    const qtyInputAfter = page.locator('input[type="number"][placeholder="0"]').first();
    const finalQty = await qtyInputAfter.inputValue();

    console.warn('Quantity value after selection:', finalQty);
    expect(finalQty).toBe('1');
    console.warn('✅ VERIFIED: Quantity was automatically set to 1 when selecting existing budget code');
  });

  test('should preserve manually entered qty when selecting budget code', async ({ page }) => {
    // Navigate to budget setup page for project 67
    await page.goto(`/${projectId}/budget/setup`);
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('h1:has-text("Add Budget Line Items")')).toBeVisible({ timeout: 10000 });

    // Manually enter quantity BEFORE selecting budget code
    const qtyInput = page.locator('input[type="number"][placeholder="0"]').first();
    await qtyInput.click();
    await qtyInput.fill('5');
    await page.waitForTimeout(300);

    const manualQty = await qtyInput.inputValue();
    console.warn('Manually entered quantity:', manualQty);
    expect(manualQty).toBe('5');

    // Now select a budget code
    const budgetCodeSelector = page.locator('button[role="combobox"]:has-text("Select budget code...")').first();
    await budgetCodeSelector.click();
    await page.waitForTimeout(500);

    const firstExistingCode = page.locator('[role="option"]').first();
    await firstExistingCode.click();
    await page.waitForTimeout(500);

    // VERIFY: Quantity should still be 5 (preserved, not overwritten)
    const qtyInputAfter = page.locator('input[type="number"][placeholder="0"]').first();
    const finalQty = await qtyInputAfter.inputValue();

    console.warn('Quantity value after budget code selection (should be preserved):', finalQty);
    expect(finalQty).toBe('5');
    console.warn('✅ VERIFIED: Manually entered quantity was preserved');

    await page.screenshot({
      path: 'tests/screenshots/budget-setup-qty-preserved.png',
      fullPage: true
    });
  });

  test('should calculate amount when qty and unit cost are entered', async ({ page }) => {
    // Navigate to budget setup page for project 67
    await page.goto(`/${projectId}/budget/setup`);
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('h1:has-text("Add Budget Line Items")')).toBeVisible({ timeout: 10000 });

    // Select a budget code (which will auto-set qty to 1)
    const budgetCodeSelector = page.locator('button[role="combobox"]:has-text("Select budget code...")').first();
    await budgetCodeSelector.click();
    await page.waitForTimeout(500);

    const firstExistingCode = page.locator('[role="option"]').first();
    await firstExistingCode.click();
    await page.waitForTimeout(500);

    // Verify qty is 1
    const qtyInput = page.locator('input[type="number"][placeholder="0"]').first();
    const qty = await qtyInput.inputValue();
    expect(qty).toBe('1');

    // Enter unit cost
    const unitCostInput = page.locator('input[type="number"][placeholder="0.00"]').first();
    await unitCostInput.click();
    await unitCostInput.fill('100.50');
    await page.waitForTimeout(500);

    // VERIFY: Amount should be auto-calculated (1 * 100.50 = 100.50)
    const amountInput = page.locator('input[type="number"][placeholder="0.00"]').nth(1);
    const amount = await amountInput.inputValue();

    console.warn('Calculated amount:', amount);
    expect(amount).toBe('100.50');
    console.warn('✅ VERIFIED: Amount was automatically calculated from qty and unit cost');

    // Change qty to test recalculation
    await qtyInput.click();
    await qtyInput.fill('5');
    await page.waitForTimeout(500);

    // VERIFY: Amount should update (5 * 100.50 = 502.50)
    const updatedAmount = await amountInput.inputValue();
    console.warn('Updated amount after qty change:', updatedAmount);
    expect(updatedAmount).toBe('502.50');
    console.warn('✅ VERIFIED: Amount recalculated when quantity changed');

    await page.screenshot({
      path: 'tests/screenshots/budget-setup-amount-calculated.png',
      fullPage: true
    });
  });

  test('should add and remove rows correctly', async ({ page }) => {
    // Navigate to budget setup page for project 67
    await page.goto(`/${projectId}/budget/setup`);
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('h1:has-text("Add Budget Line Items")')).toBeVisible({ timeout: 10000 });

    // Initially should have 1 row
    const initialRows = page.locator('tbody tr');
    const initialRowCount = await initialRows.count();
    console.warn('Initial row count:', initialRowCount);
    expect(initialRowCount).toBe(1);

    // Click "Add Row" button
    const addRowButton = page.locator('button:has-text("Add Row")');
    await addRowButton.click();
    await page.waitForTimeout(300);

    // Should now have 2 rows
    const rowsAfterAdd = await initialRows.count();
    console.warn('Row count after adding:', rowsAfterAdd);
    expect(rowsAfterAdd).toBe(2);

    await page.screenshot({
      path: 'tests/screenshots/budget-setup-row-added.png',
      fullPage: true
    });

    // Try to remove the first row - there's only one delete button visible since we need at least 1 row
    const deleteButtons = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') });
    const deleteCount = await deleteButtons.count();
    console.warn('Delete button count:', deleteCount);

    // Click the first delete button
    await deleteButtons.first().click();
    await page.waitForTimeout(300);

    // Should be back to 1 row
    const finalRowCount = await initialRows.count();
    console.warn('Final row count after deletion:', finalRowCount);
    expect(finalRowCount).toBe(1);

    console.warn('✅ VERIFIED: Rows can be added and removed correctly');
  });
});
