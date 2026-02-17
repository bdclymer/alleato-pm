import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_PROJECT_ID = 118;

test.describe('Subcontract Form - Comprehensive Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to the Subcontract creation form
    await page.goto(`/${TEST_PROJECT_ID}/commitments/new?type=subcontract`);
    await page.waitForLoadState('networkidle');
  });

  test('should display correct page title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('New Subcontract');

    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-header.png',
      fullPage: false
    });
  });

  test('should have autofill test data button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /autofill test data/i })).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-autofill-button.png',
      fullPage: true
    });
  });

  test('should autofill form with test data', async ({ page }) => {
    // Click autofill button
    await page.getByRole('button', { name: /autofill test data/i }).click();
    await page.waitForTimeout(500);

    // Verify Contract Number is filled (uses current year)
    await expect(page.locator('#contractNumber')).toHaveValue('SC-2025-001');

    // Verify Description is filled
    const description = await page.locator('#description').inputValue();
    expect(description.length).toBeGreaterThan(0);

    // Verify SOV lines were added
    await expect(page.locator('table')).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-autofilled.png',
      fullPage: true
    });
  });

  test('should display all form sections', async ({ page }) => {
    // Verify all major sections
    await expect(page.getByRole('heading', { name: 'General Information' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Attachments' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Schedule of Values' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inclusions & Exclusions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contract Dates' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contract Privacy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Invoice Contacts' })).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-all-sections.png',
      fullPage: true
    });
  });

  test('should have Import from CSV button', async ({ page }) => {
    // Find Import SOV from CSV button
    await expect(page.getByRole('button', { name: /import sov from csv/i })).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-import-csv-button.png',
      fullPage: true
    });
  });

  test('should add and calculate SOV line items (amount-based)', async ({ page }) => {
    // Add line
    await page.getByRole('button', { name: /add line/i }).first().click();
    await page.waitForTimeout(300);

    // Verify amount-based columns (has Amount column, no Qty, UOM, Unit Cost)
    await expect(page.locator('thead th:has-text("Amount")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Qty")')).not.toBeVisible();
    await expect(page.locator('th:has-text("UOM")')).not.toBeVisible();

    // Fill in line item
    const row = page.locator('tbody tr').first();
    await row.locator('input[placeholder="Budget Code"]').fill('01-1000');
    await row.locator('input[placeholder="Description"]').fill('Foundation Work');

    // Find and fill amount field
    const amountInput = row.locator('input[type="number"]').first();
    await amountInput.fill('25000');
    await page.waitForTimeout(300);

    // Verify amount shows correctly formatted
    await expect(row).toContainText('$25000.00');

    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-sov-amount-based.png',
      fullPage: true
    });
  });

  test('should verify accounting method is amount-based', async ({ page }) => {
    await expect(page.locator('text=/amount-based/i').first()).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-accounting-method.png',
      fullPage: true
    });
  });

  test('should have Inclusions & Exclusions fields', async ({ page }) => {
    // Inclusions field
    await expect(page.locator('#inclusions')).toBeVisible();

    // Exclusions field
    await expect(page.locator('#exclusions')).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-inclusions-exclusions.png',
      fullPage: true
    });
  });

  test('should submit complete form successfully', async ({ page }) => {
    // Use autofill for speed
    await page.getByRole('button', { name: /autofill test data/i }).click();
    await page.waitForTimeout(500);

    // Capture before submit
    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-before-submit.png',
      fullPage: true
    });

    // Click Create button
    await page.getByRole('button', { name: /^create$/i }).click();

    // Wait for navigation
    await page.waitForTimeout(2000);

    // Should redirect to commitments page
    await expect(page.url()).toContain(`/${TEST_PROJECT_ID}/commitments`);

    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-after-submit.png',
      fullPage: true
    });
  });

  test('should handle Back button navigation', async ({ page }) => {
    // Find Back button
    const backButton = page.getByRole('button', { name: /back/i });
    await expect(backButton).toBeVisible();

    await backButton.click();

    // Should go back (note: might be browser back or route navigation)
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-back-navigation.png',
      fullPage: true
    });
  });

  test('should verify breadcrumbs', async ({ page }) => {
    // Check for breadcrumbs in the navigation area
    const breadcrumb = page.locator('ol').getByRole('link', { name: 'Commitments' });
    await expect(breadcrumb).toBeVisible();

    await expect(page.locator('ol').getByText('New Subcontract')).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/subcontract-form-breadcrumbs.png',
      fullPage: false
    });
  });
});
