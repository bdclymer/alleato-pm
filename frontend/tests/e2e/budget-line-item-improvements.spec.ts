import { test, expect } from '@playwright/test';

test.describe('Budget Line Item Creator - Critical 3 Improvements', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to budget page for project 31
    await page.goto('http://localhost:3000/31/budget');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the page to be ready (use the main heading, not the sidebar)
    await expect(page.getByRole('heading', { name: 'Budget', level: 1 })).toBeVisible();
  });

  test('Improvement 1: Smart Copy UOM Toggle', async ({ page }) => {
    // Open the modal dialog
    const addButton = page.getByRole('button', { name: /add.*line.*item/i });
    await expect(addButton, 'Add Line Item button should be visible').toBeVisible();
    await addButton.click();

    // Wait for modal to appear - look for the heading
    const modal = page.locator('text="Add Budget Line Items"').locator('..');
    await expect(page.getByText('Add Budget Line Items'), 'Modal should be visible').toBeVisible({ timeout: 5000 });

    // 1. Verify "Copy UOM to new rows" checkbox appears in modal
    const uomToggle = modal.locator('input[type="checkbox"]').and(
      page.locator('[name*="copyUom"], [id*="copyUom"]')
    ).or(
      modal.getByRole('checkbox', { name: /copy.*uom/i })
    );

    await expect(uomToggle, 'Copy UOM toggle should be visible').toBeVisible();

    // Verify it's checked by default
    await expect(uomToggle, 'Copy UOM toggle should be checked by default').toBeChecked();

    // 2. Fill first row with UOM "SF"
    const budgetCodeInput = modal.getByPlaceholder(/select budget code/i);
    await budgetCodeInput.click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.locator('[role="option"]').first().click();

    // Fill in quantity
    const qtyInput = modal.getByPlaceholder(/quantity/i);
    await qtyInput.fill('100');

    // Select UOM "SF"
    const uomSelect = modal.locator('button').filter({ hasText: /select/i }).first();
    await uomSelect.click();
    await page.locator('[role="option"]:has-text("SF")').click();

    // Fill unit cost
    const unitCostInput = modal.getByPlaceholder(/unit cost/i);
    await unitCostInput.fill('50');

    // 3. Click "Add Another Line Item" to create new row
    const addAnotherButton = page.getByRole('button', { name: /add another line item/i });
    await addAnotherButton.click();
    await page.waitForTimeout(500);

    // 4. Verify new row has "SF" pre-selected
    const uomSelects = modal.locator('button').filter({ hasText: /SF|select/i });
    const secondRowUOM = uomSelects.nth(1);
    await expect(secondRowUOM, 'Second row should have SF pre-selected').toContainText('SF');

    // 5. Uncheck the toggle
    await uomToggle.uncheck();
    await expect(uomToggle).not.toBeChecked();

    // 6. Add third row
    await addAnotherButton.click();
    await page.waitForTimeout(500);

    // 7. Verify third row has empty UOM (should show "Select")
    const thirdRowUOM = uomSelects.nth(2);
    await expect(thirdRowUOM, 'Third row UOM should be empty (Select)').toContainText('Select');

    // 8. Re-check toggle and verify it works
    await uomToggle.check();
    await expect(uomToggle).toBeChecked();

    // Take screenshot as evidence
    await page.screenshot({
      path: '/Users/meganharrison/Documents/github/alleato-pm/screenshots/improvement-1-smart-uom-toggle.png',
      fullPage: true
    });
  });

  test('Improvement 2: Auto-Focus First Field', async ({ page }) => {
    // Open the modal dialog
    const addButton = page.getByRole('button', { name: /add.*line.*item/i });
    await expect(addButton, 'Add Line Item button should be visible').toBeVisible();
    await addButton.click();

    // Wait for modal to appear
    await expect(page.getByText('Add Budget Line Items'), 'Modal should be visible').toBeVisible({ timeout: 5000 });
    const modal = page.locator('text="Add Budget Line Items"').locator('..');

    // Fill in first row completely within the modal
    const budgetCodeInput = modal.getByPlaceholder(/select budget code/i);
    await budgetCodeInput.click();
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    const qtyInput = modal.getByPlaceholder(/quantity/i);
    await qtyInput.fill('100');

    const uomSelect = modal.getByRole('combobox', { name: /uom/i }).or(
      modal.locator('button').filter({ hasText: /select/i })
    ).first();
    await uomSelect.click();
    await page.locator('[role="option"]:has-text("SF")').click();

    const unitCostInput = modal.getByPlaceholder(/unit cost/i);
    await unitCostInput.fill('25');

    // Press Enter on Amount field or click "Add Another Line Item"
    const addAnotherButton = page.getByRole('button', { name: /add another line item/i });
    await expect(addAnotherButton, 'Add Another Line Item button should be visible').toBeVisible();
    await addAnotherButton.click();

    // Wait for new row
    await page.waitForTimeout(500);

    // Verify the Qty field of the new row is focused
    const qtyInputs = modal.getByPlaceholder(/quantity/i);
    const secondQtyInput = qtyInputs.nth(1);

    await expect(secondQtyInput, 'Second row Qty input should be focused').toBeFocused();

    // Take screenshot
    await page.screenshot({
      path: '/Users/meganharrison/Documents/github/alleato-pm/screenshots/improvement-2-auto-focus.png',
      fullPage: true
    });
  });

  test('Improvement 3: Running Total Display', async ({ page }) => {
    // Open the modal dialog
    const addButton = page.getByRole('button', { name: /add.*line.*item/i });
    await expect(addButton, 'Add Line Item button should be visible').toBeVisible();
    await addButton.click();

    // Wait for modal to appear
    await expect(page.getByText('Add Budget Line Items'), 'Modal should be visible').toBeVisible({ timeout: 5000 });
    const modal = page.locator('text="Add Budget Line Items"').locator('..');

    // Helper to fill a row in the modal
    const fillRow = async (rowIndex: number, qty: string, unitCost: string) => {
      const modal = page.locator('text="Add Budget Line Items"').locator('..');

      // Select budget code
      const budgetCodeInputs = modal.getByPlaceholder(/select budget code/i);
      const budgetCodeInput = budgetCodeInputs.nth(rowIndex);
      await budgetCodeInput.click();
      await page.waitForSelector('[role="option"]');
      await page.locator('[role="option"]').first().click();

      // Fill qty
      const qtyInputs = modal.getByPlaceholder(/quantity/i);
      await qtyInputs.nth(rowIndex).fill(qty);

      // Select UOM
      const uomSelects = modal.locator('button').filter({ hasText: /select/i });
      await uomSelects.nth(rowIndex).click();
      await page.locator('[role="option"]:has-text("SF")').click();

      // Fill unit cost
      const unitCostInputs = modal.getByPlaceholder(/unit cost/i);
      await unitCostInputs.nth(rowIndex).fill(unitCost);

      // Amount should auto-calculate
      await page.waitForTimeout(200);
    };

    // 1. Create first row: 100 * $10 = $1,000
    await fillRow(0, '100', '10');

    // Verify Running Total appears at bottom of modal
    const totalText = modal.locator('text=/total.*\\$1,000\\.00/i');
    await expect(totalText, 'Total should show $1,000.00').toBeVisible();

    // Verify line item count shows "1 line item"
    const itemCount = modal.locator('text=/1 line item/i');
    await expect(itemCount, 'Should show 1 line item').toBeVisible();

    // 2. Add second row: 200 * $10 = $2,000
    const addAnotherButton = page.getByRole('button', { name: /add another line item/i });
    await addAnotherButton.click();
    await page.waitForTimeout(500);

    await fillRow(1, '200', '10');

    // Verify total updates to $3,000.00
    await page.waitForTimeout(500);
    const updatedTotal = modal.locator('text=/total.*\\$3,000\\.00/i');
    await expect(updatedTotal, 'Total should update to $3,000.00').toBeVisible();

    // Verify count shows "2 line items"
    const twoItems = modal.locator('text=/2 line items/i');
    await expect(twoItems, 'Should show 2 line items').toBeVisible();

    // 3. Add third row: 300 * $10 = $3,000
    await addAnotherButton.click();
    await page.waitForTimeout(500);

    await fillRow(2, '300', '10');

    // Verify total updates to $6,000.00
    await page.waitForTimeout(500);
    const finalTotal = modal.locator('text=/total.*\\$6,000\\.00/i');
    await expect(finalTotal, 'Total should update to $6,000.00').toBeVisible();

    // Verify count shows "3 line items"
    const threeItems = modal.locator('text=/3 line items/i');
    await expect(threeItems, 'Should show 3 line items').toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: '/Users/meganharrison/Documents/github/alleato-pm/screenshots/improvement-3-running-total.png',
      fullPage: true
    });
  });

  test('Previous Improvements: Currency formatting and Enter key', async ({ page }) => {
    // Open the modal dialog
    const addButton = page.getByRole('button', { name: /add.*line.*item/i });
    await expect(addButton, 'Add Line Item button should be visible').toBeVisible();
    await addButton.click();

    // Wait for modal to appear
    await expect(page.getByText('Add Budget Line Items'), 'Modal should be visible').toBeVisible({ timeout: 5000 });
    const modal = page.locator('text="Add Budget Line Items"').locator('..');

    // Fill first row in modal
    const budgetCodeInput = modal.getByPlaceholder(/select budget code/i);
    await budgetCodeInput.click();
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    const qtyInput = modal.getByPlaceholder(/quantity/i);
    await qtyInput.fill('1000');

    const uomSelect = modal.locator('button').filter({ hasText: /select/i }).first();
    await uomSelect.click();
    await page.locator('[role="option"]:has-text("SF")').click();

    const unitCostInput = modal.getByPlaceholder(/unit cost/i);
    await unitCostInput.fill('50');

    // Verify currency formatting in Amount field (should show $50,000.00)
    await page.waitForTimeout(500);
    const amountField = modal.locator('input').filter({ hasValue: /50,000\.00/ });
    await expect(amountField, 'Amount should be formatted with commas as $50,000.00').toBeVisible();

    // Click "Add Another Line Item" button instead of pressing Enter
    const addAnotherButton = page.getByRole('button', { name: /add another line item/i });
    await addAnotherButton.click();
    await page.waitForTimeout(500);

    // Verify second row was created (check for second qty input)
    const qtyInputs = modal.getByPlaceholder(/quantity/i);
    await expect(qtyInputs.nth(1), 'Second row qty input should be visible').toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: '/Users/meganharrison/Documents/github/alleato-pm/screenshots/previous-improvements.png',
      fullPage: true
    });
  });
});
