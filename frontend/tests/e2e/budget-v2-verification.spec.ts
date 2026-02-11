import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget V2 Page', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to dev login first to authenticate
    // Wait for initial redirect
    await page.waitForLoadState('networkidle');
  });

  test('should display Budget V2 page with auto-populated budget line items', async ({ page }) => {
    // Navigate to Budget V2 page for project 118
    await page.goto('/118/budget-v2');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: 'tests/screenshots/budget-v2-initial.png', fullPage: true });

    // VERIFY: Page title is present
    await expect(page.locator('h1:has-text("Budget V2")')).toBeVisible({ timeout: 10000 });

    // VERIFY: Description is present
    await expect(page.locator('text=Budget line items from copied cost codes')).toBeVisible();

    // VERIFY: "Add Budget Code" button is present
    const addButton = page.locator('button:has-text("Add Budget Code")');
    await expect(addButton).toBeVisible();

    // VERIFY: Table headers are present
    await expect(page.locator('th:has-text("Budget Code")')).toBeVisible();
    await expect(page.locator('th:has-text("Qty")')).toBeVisible();
    await expect(page.locator('th:has-text("UOM")')).toBeVisible();
    await expect(page.locator('th:has-text("Unit Cost")')).toBeVisible();
    await expect(page.locator('th:has-text("Amount")')).toBeVisible();

    console.warn('✅ VERIFIED: Budget V2 page loaded with correct headers');
  });

  test('should show auto-populated line items from project cost codes', async ({ page }) => {
    // Navigate to Budget V2 page for project 118
    await page.goto('/118/budget-v2');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // VERIFY: Line items are auto-populated
    const budgetCodeButtons = page.locator('button[role="combobox"]').filter({ hasText: /.+–.+/ });
    const count = await budgetCodeButtons.count();

    // Should have at least one auto-populated line item
    expect(count).toBeGreaterThan(0);

    // Take screenshot showing auto-populated items
    await page.screenshot({ path: 'tests/screenshots/budget-v2-autopopulated.png', fullPage: true });

    console.warn(`✅ VERIFIED: Found ${count} auto-populated budget line items`);
  });

  test('should allow editing quantity and auto-calculate amount', async ({ page }) => {
    // Navigate to Budget V2 page for project 118
    await page.goto('/118/budget-v2');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find the first Qty input
    const qtyInput = page.locator('input[type="number"][placeholder="0"]').first();
    await expect(qtyInput).toBeVisible({ timeout: 5000 });

    // Enter a quantity
    await qtyInput.fill('100');
    await page.waitForTimeout(300);

    // Find the first Unit Cost input
    const unitCostInput = page.locator('input[type="number"][placeholder="0.00"]').first();
    await unitCostInput.fill('25.50');
    await page.waitForTimeout(500);

    // Take screenshot showing calculated amount
    await page.screenshot({ path: 'tests/screenshots/budget-v2-calculation.png', fullPage: true });

    // VERIFY: Amount should be auto-calculated (100 * 25.50 = 2550.00)
    const amountInput = page.locator('input[type="number"][placeholder="0.00"]').nth(1);
    const amountValue = await amountInput.inputValue();
    expect(parseFloat(amountValue)).toBe(2550.00);

    // VERIFY: Total amount is updated in summary bar
    const totalText = await page.locator('text=/Total: \\$[\\d,]+\\.\\d{2}/').textContent();
    expect(totalText).toContain('2,550.00');

    console.warn('✅ VERIFIED: Auto-calculation works correctly');
  });

  test('should allow entering UOM for line items', async ({ page }) => {
    // Navigate to Budget V2 page for project 118
    await page.goto('/118/budget-v2');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find the first UOM input
    const uomInput = page.locator('input[placeholder="EA"]').first();
    await expect(uomInput).toBeVisible({ timeout: 5000 });

    // Enter a UOM
    await uomInput.fill('SF');
    await page.waitForTimeout(300);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/budget-v2-uom.png', fullPage: true });

    // VERIFY: UOM value is entered
    const uomValue = await uomInput.inputValue();
    expect(uomValue).toBe('SF');

    console.warn('✅ VERIFIED: UOM input works correctly');
  });

  test('should open "Add Budget Code" modal', async ({ page }) => {
    // Navigate to Budget V2 page for project 118
    await page.goto('/118/budget-v2');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click "Add Budget Code" button
    const addButton = page.locator('button:has-text("Add Budget Code")');
    await addButton.click();
    await page.waitForTimeout(500);

    // VERIFY: Modal opens
    await expect(page.locator('text=Create New Budget Code').nth(0)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Add a new budget code that can be used for line items in this project.')).toBeVisible();

    // Take screenshot of modal
    await page.screenshot({ path: 'tests/screenshots/budget-v2-add-modal.png', fullPage: true });

    console.warn('✅ VERIFIED: Add Budget Code modal opens correctly');
  });

  test('should be accessible from site header Project Tools dropdown', async ({ page }) => {
    // Navigate to a project page
    await page.goto('/118/home');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click on "Project Tools" dropdown
    const projectToolsButton = page.locator('button:has-text("Project Tools")');
    await expect(projectToolsButton).toBeVisible({ timeout: 10000 });
    await projectToolsButton.click();
    await page.waitForTimeout(500);

    // Take screenshot of dropdown
    await page.screenshot({ path: 'tests/screenshots/budget-v2-in-dropdown.png', fullPage: true });

    // VERIFY: Budget V2 link is present in Financial Management section
    const budgetV2Link = page.locator('a:has-text("Budget V2")');
    await expect(budgetV2Link).toBeVisible({ timeout: 5000 });

    // Click Budget V2 link
    await budgetV2Link.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // VERIFY: Navigated to Budget V2 page
    await expect(page.locator('h1:has-text("Budget V2")')).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/118/budget-v2');

    console.warn('✅ VERIFIED: Budget V2 is accessible from Project Tools dropdown');
  });

  test('should display summary bar with line item count and total', async ({ page }) => {
    // Navigate to Budget V2 page for project 118
    await page.goto('/118/budget-v2');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // VERIFY: Summary bar shows line item count
    const lineItemCount = page.locator('text=/\\d+ Line Items?/');
    await expect(lineItemCount).toBeVisible({ timeout: 5000 });

    // VERIFY: Summary bar shows total amount
    const totalAmount = page.locator('text=/Total: \\$[\\d,]+\\.\\d{2}/');
    await expect(totalAmount).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/budget-v2-summary.png', fullPage: true });

    console.warn('✅ VERIFIED: Summary bar displays correctly');
  });
});
