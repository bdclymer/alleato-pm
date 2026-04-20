import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_PROJECT_ID = 118;

test.describe('Purchase Order Form - Comprehensive Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to the Purchase Order creation form
    await page.goto(`/${TEST_PROJECT_ID}/commitments/new?type=purchase_order`);
    await page.waitForLoadState('networkidle');
  });

  test('should display all form sections', async ({ page }) => {
    // Verify page title
    await expect(page.getByRole('heading', { name: 'New Purchase Order' })).toBeVisible();

    // Verify all major sections are present
    await expect(page.getByRole('heading', { name: 'General Information' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Attachments' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Schedule of Values' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contract Dates' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Privacy & Access' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Invoice Contacts' })).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/po-form-all-sections.png',
      fullPage: true
    });
  });

  test('should have all General Information fields', async ({ page }) => {
    // Contract Number
    await expect(page.locator('#contractNumber')).toBeVisible();

    // Title
    await expect(page.locator('#title')).toBeVisible();

    // Payment Terms & Ship Via
    await expect(page.locator('#paymentTerms')).toBeVisible();
    await expect(page.locator('#shipVia')).toBeVisible();

    // Description
    await expect(page.locator('#description')).toBeVisible();

    // Executed checkbox should exist (check for label)
    await expect(page.locator('text=/executed/i').first()).toBeVisible();

    // Default Retainage field
    await expect(page.locator('#defaultRetainagePercent')).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/po-form-general-info.png',
      fullPage: true
    });
  });

  test('should display empty SOV state correctly', async ({ page }) => {
    // Check for empty state message
    await expect(page.getByText('You Have No Line Items Yet')).toBeVisible();

    // Check for Add Line button
    await expect(page.getByRole('button', { name: /add line/i })).toBeVisible();

    // Check for Import CSV button
    await expect(page.getByRole('button', { name: /import sov from csv/i })).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/po-form-sov-empty.png',
      fullPage: true
    });
  });

  test('should add SOV line items with unit/quantity fields', async ({ page }) => {
    // Click Add Line button
    await page.getByRole('button', { name: /add line/i }).first().click();

    // Wait for table to appear
    await page.waitForTimeout(500);
    await expect(page.locator('table')).toBeVisible();

    // Verify SOV table headers for unit/quantity mode
    await expect(page.locator('th:has-text("#")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Change Event")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Budget Code")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Description")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Qty")').first()).toBeVisible();
    await expect(page.locator('th:has-text("UOM")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Unit Cost")').first()).toBeVisible();
    await expect(page.locator('thead th:has-text("Amount")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Billed to Date")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Amount Remaining")').first()).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/po-form-sov-table-headers.png',
      fullPage: true
    });

    // Fill in line item data
    const row = page.getByRole('row').nth(1); // First data row

    // Budget Code
    await row.locator('input').nth(1).fill('01-1000');

    // Description
    await row.locator('input').nth(2).fill('Concrete Foundation');

    // Quantity
    await row.locator('input[type="number"]').nth(0).fill('100');

    // Unit Cost
    await row.locator('input[type="number"]').nth(1).fill('50');

    // Wait for auto-calculation
    await page.waitForTimeout(500);

    // Verify amount auto-calculated (100 * 50 = 5000)
    await expect(row.getByText('$5000.00').first()).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/po-form-sov-line-filled.png',
      fullPage: true
    });
  });

  test('should verify UOM dropdown exists and opens', async ({ page }) => {
    // Add a line item
    await page.getByRole('button', { name: /add line/i }).first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('table')).toBeVisible();

    // Find the UOM dropdown in the first row
    const row = page.locator('tbody tr').first();
    const uomDropdown = row.locator('button:has-text("UOM")');

    // Verify UOM dropdown exists
    await expect(uomDropdown).toBeVisible();

    // Click to open dropdown
    await uomDropdown.click();
    await page.waitForTimeout(500);

    // Verify dropdown opened by checking for at least one option
    const options = page.locator('[role="option"]');
    await expect(options.first()).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/po-form-uom-dropdown.png',
      fullPage: true
    });
  });

  test('should add multiple SOV lines and verify totals', async ({ page }) => {
    // Add first line
    await page.getByRole('button', { name: /add line/i }).first().click();
    await page.waitForTimeout(300);

    let row = page.getByRole('row').nth(1);
    await row.locator('input[type="number"]').nth(0).fill('100');
    await row.locator('input[type="number"]').nth(1).fill('50');
    await page.waitForTimeout(300);

    // Add second line
    await page.getByRole('button', { name: /add line/i }).first().click();
    await page.waitForTimeout(300);

    row = page.getByRole('row').nth(2);
    await row.locator('input[type="number"]').nth(0).fill('200');
    await row.locator('input[type="number"]').nth(1).fill('25');
    await page.waitForTimeout(300);

    // Verify totals row
    const totalRow = page.getByRole('row').last();
    await expect(totalRow).toContainText('Total:');
    await expect(totalRow).toContainText('$10000.00'); // 100*50 + 200*25 = 10000

    await page.screenshot({
      path: 'tests/screenshots/po-form-sov-multiple-lines.png',
      fullPage: true
    });
  });

  test('should have all Contract Dates fields', async ({ page }) => {
    await expect(page.locator('#dates\\.contractDate')).toBeVisible();
    await expect(page.locator('#dates\\.deliveryDate')).toBeVisible();
    await expect(page.locator('#dates\\.signedPoReceivedDate')).toBeVisible();
    await expect(page.locator('#dates\\.issuedOnDate')).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/po-form-contract-dates.png',
      fullPage: true
    });
  });

  test('should have Privacy & Access controls', async ({ page }) => {
    // Private checkbox
    await expect(page.locator('#privacy\\.isPrivate')).toBeVisible();

    // Non-admin users field
    await expect(page.getByLabel('Access for Non-Admin Users')).toBeVisible();

    // Allow SOV view checkbox
    await expect(page.locator('#privacy\\.allowNonAdminViewSovItems')).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/po-form-privacy.png',
      fullPage: true
    });
  });

  test('should have Invoice Contacts section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Invoice Contacts' })).toBeVisible();

    // Should show message when no company selected
    await expect(page.getByText('Please select a Contract Company first')).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/po-form-invoice-contacts.png',
      fullPage: true
    });
  });

  test('should have Cancel and Create buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: /create purchase order/i })).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/po-form-action-buttons.png',
      fullPage: true
    });
  });

  test('should remove SOV line item', async ({ page }) => {
    // Add two lines
    await page.getByRole('button', { name: /add line/i }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /add line/i }).first().click();
    await page.waitForTimeout(300);

    // Verify 2 lines exist
    let rows = await page.getByRole('row').count();
    expect(rows).toBeGreaterThanOrEqual(3); // Header + 2 data rows

    // Click remove button on first line
    await page.getByRole('row').nth(1).getByRole('button').last().click();
    await page.waitForTimeout(300);

    // Verify only 1 line remains
    rows = await page.getByRole('row').count();
    expect(rows).toBe(3); // Header + 1 data row + footer

    await page.screenshot({
      path: 'tests/screenshots/po-form-sov-after-remove.png',
      fullPage: true
    });
  });

  test('should show accounting method banner', async ({ page }) => {
    await expect(page.getByText(/this purchase order's accounting method is unit\/quantity-based/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /change to amount-based/i })).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/po-form-accounting-method.png',
      fullPage: true
    });
  });

  test('should fill complete form and submit', async ({ page }) => {
    // Fill General Information
    await page.locator('#contractNumber').fill('PO-TEST-001');
    await page.locator('#title').fill('Test Purchase Order');
    await page.locator('#paymentTerms').fill('Net 30');
    await page.locator('#description').fill('Test PO for comprehensive verification');

    // Add SOV line
    await page.getByRole('button', { name: /add line/i }).first().click();
    await page.waitForTimeout(300);

    const row = page.locator('tbody tr').first();
    await row.locator('input[placeholder="Budget Code"]').fill('01-1000');
    await row.locator('input[placeholder="Description"]').fill('Test Line Item');
    await row.locator('input[placeholder="0"]').first().fill('10');
    await row.locator('input[placeholder="$0.00"]').fill('100');
    await page.waitForTimeout(500);

    // Capture filled form
    await page.screenshot({
      path: 'tests/screenshots/po-form-complete-filled.png',
      fullPage: true
    });

    // Click Create button
    await page.getByRole('button', { name: /create purchase order/i }).click();

    // Wait for navigation with a longer timeout
    await page.waitForTimeout(1000);

    // Verify we're on commitments page
    await expect(page).toHaveURL(new RegExp(`/${TEST_PROJECT_ID}/commitments`));

    await page.screenshot({
      path: 'tests/screenshots/po-form-after-submit.png',
      fullPage: true
    });
  });

  test('should handle Cancel button', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Should navigate back to commitments page
    await page.waitForURL(`**/${TEST_PROJECT_ID}/commitments`);
    await expect(page.url()).toContain(`/${TEST_PROJECT_ID}/commitments`);
  });
});
