import { test, expect } from '../../fixtures/index';
import { createTestProject } from '../../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

/**
 * Budget Setup Page E2E Tests
 *
 * Tests the refactored budget setup page with extracted components:
 * - BudgetCodeSelector
 * - CreateBudgetCodeModal
 * - DivisionTree
 * - UomSelect
 *
 * Video recording is enabled via PW_VIDEO=on environment variable
 */

// Force video recording for these tests
test.use({
  video: 'on',
  screenshot: 'on',
});

const PROJECT_ID = '67';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe.skip('Budget Setup Page', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the budget setup page
    await page.goto(`/${PROJECT_ID}/budget/setup`);
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Add Budget Line Items")', { timeout: 15000 });
  });

  test('should display the page header and initial state', async ({ page }) => {
    // Verify page title
    await expect(page.locator('h1:has-text("Add Budget Line Items")')).toBeVisible();

    // Verify description
    await expect(page.locator('text=Add new line items to your project budget')).toBeVisible();

    // Verify Back to Budget button
    await expect(page.locator('button:has-text("Back to Budget")')).toBeVisible();

    // Verify Add Row button exists (hidden on mobile)
    const addRowButton = page.locator('button:has-text("Add Row")');
    await expect(addRowButton.or(page.locator('button:has-text("Add Line Item")'))).toBeVisible();

    // Verify Create button (should show "Create 1 Line Item")
    await expect(page.locator('button:has-text("Create 1 Line Item")')).toBeVisible();

    // Verify summary bar shows 1 line item (use exact match to avoid multiple elements)
    await expect(page.getByText('1 Line Item', { exact: true })).toBeVisible();

    // Verify total shows $0.00
    await expect(page.locator('text=Total: $0.00')).toBeVisible();

    // Take screenshot of initial state
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-initial.png',
      fullPage: true,
    });
  });

  test('should add and remove line items', async ({ page }) => {
    // Set desktop viewport to ensure table is visible
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    await page.waitForSelector('h1:has-text("Add Budget Line Items")', { timeout: 15000 });

    // Initially should have 1 line item
    await expect(page.getByText('1 Line Item', { exact: true })).toBeVisible();

    // Click Add Row button
    await page.locator('button:has-text("Add Row")').click();

    // Should now show 2 line items
    await expect(page.getByText('2 Line Items', { exact: true })).toBeVisible();

    // Click Add Row again
    await page.locator('button:has-text("Add Row")').click();

    // Should now show 3 line items
    await expect(page.getByText('3 Line Items', { exact: true })).toBeVisible();

    // Take screenshot with multiple rows
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-multiple-rows.png',
      fullPage: true,
    });

    // Delete one row by clicking the trash icon (find enabled ones)
    const deleteButtons = page.locator('button:has(svg.lucide-trash-2):not([disabled])');
    await deleteButtons.first().click();

    // Should now show 2 line items
    await expect(page.getByText('2 Line Items', { exact: true })).toBeVisible();
  });

  test('should open budget code selector popover', async ({ page }) => {
    // Ensure desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    await page.waitForSelector('h1:has-text("Add Budget Line Items")', { timeout: 15000 });

    // Wait a moment for hydration
    await page.waitForTimeout(1000);

    // Find the budget code selector button by its role and click it
    const selectButton = page.locator('[role="combobox"]').first();
    await expect(selectButton).toBeVisible();

    // Log for debugging
    const buttonText = await selectButton.textContent();
    console.warn('Button text:', buttonText);

    // Try clicking with force
    await selectButton.click({ force: true });

    // Wait a bit and take screenshot to see state
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-after-click.png',
      fullPage: true,
    });

    // Wait for popover content to appear (check for search input which is inside the popover)
    await expect(page.locator('input[placeholder="Search budget codes..."]')).toBeVisible({
      timeout: 5000,
    });

    // Verify "Create New Budget Code" option is visible
    await expect(page.locator('text=Create New Budget Code')).toBeVisible();

    // Take screenshot of open popover
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-popover-open.png',
      fullPage: true,
    });

    // Close popover by pressing Escape
    await page.keyboard.press('Escape');
  });

  test('should open create budget code modal', async ({ page }) => {
    // Ensure desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    await page.waitForSelector('h1:has-text("Add Budget Line Items")', { timeout: 15000 });

    // Click on the budget code selector
    await page.click('button:has-text("Select")');

    // Wait for popover to open
    await expect(page.locator('input[placeholder="Search budget codes..."]')).toBeVisible({
      timeout: 5000,
    });

    // Click "Create New Budget Code" - try multiple selector approaches
    const createNewButton = page.locator('text=Create New Budget Code').last();
    await createNewButton.click();

    // Wait for modal to appear
    await expect(page.locator('[role="dialog"] h2, [role="dialog"] [data-slot="title"]')).toContainText('Create New Budget Code', {
      timeout: 5000,
    });

    // Verify Cancel and Create buttons in the dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(dialog.locator('button:has-text("Create Budget Code")')).toBeVisible();

    // Take screenshot of modal
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-create-modal.png',
      fullPage: true,
    });

    // Close modal
    await dialog.locator('button:has-text("Cancel")').click();
  });

  test('should calculate amount from qty and unit cost', async ({ page }) => {
    // Ensure desktop viewport with table visible
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    await page.waitForSelector('table', { timeout: 15000 });

    // Find quantity input in the table row
    const qtyInput = page.locator('table tbody tr').first().locator('input[type="number"]').first();
    await qtyInput.fill('10');

    // Find unit cost input - it should be the input after UOM select
    const allInputs = page.locator('table tbody tr').first().locator('input[type="number"]');
    const unitCostInput = allInputs.nth(1); // Second number input is unit cost
    await unitCostInput.fill('25.50');

    // Wait for calculation
    await page.waitForTimeout(500);

    // Check that amount is calculated (10 * 25.50 = 255.00)
    const amountInput = allInputs.nth(2); // Third number input is amount
    await expect(amountInput).toHaveValue('255.00');

    // Verify total is updated
    await expect(page.locator('text=Total: $255.00')).toBeVisible();

    // Take screenshot showing calculation
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-calculation.png',
      fullPage: true,
    });
  });

  test('should select UOM from dropdown', async ({ page }) => {
    // Ensure desktop viewport with table visible
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    await page.waitForSelector('table', { timeout: 15000 });

    // Click UOM select trigger in the table
    const row = page.locator('table tbody tr').first();
    await row.locator('button:has-text("Select UOM")').click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // Verify some UOM options are visible
    await expect(page.locator('[role="option"]:has-text("EA - Each")')).toBeVisible();

    // Select "SF - Square Foot"
    await page.locator('[role="option"]:has-text("SF - Square Foot")').click();

    // Wait for selection
    await page.waitForTimeout(300);

    // Verify selection is displayed
    await expect(row.locator('button:has-text("SF")')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-uom-selected.png',
      fullPage: true,
    });
  });

  test('should show validation error when submitting without budget code', async ({ page }) => {
    // Try to submit without selecting a budget code
    await page.click('button:has-text("Create 1 Line Item")');

    // Wait for toast notification
    await page.waitForTimeout(500);

    // Should show error toast
    await expect(page.locator('text=Please select a budget code for all line items')).toBeVisible({
      timeout: 5000,
    });

    // Take screenshot of error
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-validation-error.png',
      fullPage: true,
    });
  });

  test('should navigate back to budget page', async ({ page }) => {
    // Click back button
    await page.click('button:has-text("Back to Budget")');

    // Should navigate to budget page
    await page.waitForURL(`**/${PROJECT_ID}/budget`, { timeout: 10000 });

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/budget-page-after-back.png',
      fullPage: true,
    });
  });
});

test.describe('Budget Setup Page - Mobile View', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test('should display mobile card layout', async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/budget/setup`);
    await page.waitForSelector('h1:has-text("Add Budget Line Items")', { timeout: 15000 });

    // On mobile, should see card layout with "Line 1" header
    await expect(page.locator('text=Line 1')).toBeVisible();

    // Verify mobile-specific elements
    await expect(page.locator('.sm\\:hidden')).toBeVisible();

    // Take screenshot of mobile view
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-mobile.png',
      fullPage: true,
    });
  });

  test('should add line item on mobile', async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/budget/setup`);
    await page.waitForSelector('h1:has-text("Add Budget Line Items")', { timeout: 15000 });

    // Click "Add Line Item" button (mobile version)
    await page.click('button:has-text("Add Line Item")');

    // Should now show 2 line items with "Line 2" visible
    await expect(page.locator('text=Line 2')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-mobile-2-items.png',
      fullPage: true,
    });
  });
});

test.describe('Budget Setup Page - Responsive', () => {
  const viewports = {
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1440, height: 900 },
    wide: { width: 1920, height: 1080 },
  };

  for (const [name, viewport] of Object.entries(viewports)) {
    test(`should display correctly on ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/${PROJECT_ID}/budget/setup`);
      await page.waitForSelector('h1:has-text("Add Budget Line Items")', { timeout: 15000 });

      // On tablet and larger, should see table layout
      await expect(page.locator('table')).toBeVisible();

      // Verify table headers
      await expect(page.locator('th:has-text("Budget Code")')).toBeVisible();
      await expect(page.locator('th:has-text("Qty")')).toBeVisible();
      await expect(page.locator('th:has-text("UOM")')).toBeVisible();
      await expect(page.locator('th:has-text("Unit Cost")')).toBeVisible();
      await expect(page.locator('th:has-text("Amount")')).toBeVisible();
      await expect(page.locator('th:has-text("Actions")')).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: `tests/screenshots/budget-setup-${name}.png`,
        fullPage: true,
      });
    });
  }
});
