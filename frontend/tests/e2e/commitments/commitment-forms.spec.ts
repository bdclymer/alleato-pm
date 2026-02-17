import { test, expect } from '@playwright/test';

// Use project 67 which is known to exist
const PROJECT_ID = 67;

test.describe('Commitment Forms', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the commitments page first
    await page.goto(`/${PROJECT_ID}/commitments`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Subcontract Form', () => {
    test('should load the new subcontract form', async ({ page }) => {
      // Navigate to new commitment page for subcontracts
      await page.goto(`/${PROJECT_ID}/commitments/new?type=subcontract`);
      await page.waitForLoadState('networkidle');

      // Verify the form loaded
      await expect(page.getByRole('heading', { name: /new subcontract/i })).toBeVisible();

      // Check key form fields exist
      await expect(page.getByLabel(/contract/i)).toBeVisible();
      await expect(page.getByLabel(/title/i)).toBeVisible();
      await expect(page.getByLabel(/status/i)).toBeVisible();

      // Take screenshot for verification
      await page.screenshot({ path: 'tests/screenshots/subcontract-form-loaded.png' });
    });

    test('should create a new subcontract', async ({ page }) => {
      await page.goto(`/${PROJECT_ID}/commitments/new?type=subcontract`);
      await page.waitForLoadState('networkidle');

      // Fill out the form
      const contractNumber = `SC-TEST-${Date.now()}`;
      await page.getByLabel(/contract/i).first().fill(contractNumber);
      await page.getByLabel(/title/i).fill('Test Subcontract from E2E');

      // Select a company if available
      const companySelect = page.locator('text=Contract Company').locator('..').locator('button[role="combobox"]');
      if (await companySelect.isVisible()) {
        await companySelect.click();
        // Wait for dropdown to load
        await page.waitForTimeout(500);
        // Select first available company
        const firstOption = page.locator('[role="option"]').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
        }
      }

      // Fill description
      const descriptionField = page.getByLabel(/description/i).first();
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Test subcontract description from E2E tests');
      }

      // Take screenshot before submit
      await page.screenshot({ path: 'tests/screenshots/subcontract-form-filled.png' });

      // Submit the form
      const submitButton = page.getByRole('button', { name: /create subcontract/i });
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // Wait for navigation or response
      await page.waitForLoadState('networkidle');

      // Should redirect to commitments page on success
      // or stay on form if there's an error
      const currentUrl = page.url();

      // Take screenshot of result
      await page.screenshot({ path: 'tests/screenshots/subcontract-form-result.png' });

      // Log the result for debugging
      console.log('Current URL after submit:', currentUrl);
    });
  });

  test.describe('Purchase Order Form', () => {
    test('should load the new purchase order form', async ({ page }) => {
      // Navigate to new commitment page for purchase orders
      await page.goto(`/${PROJECT_ID}/commitments/new?type=purchase_order`);
      await page.waitForLoadState('networkidle');

      // Verify the form loaded
      await expect(page.getByRole('heading', { name: /new purchase order/i })).toBeVisible();

      // Check key form fields exist
      await expect(page.getByLabel(/contract/i)).toBeVisible();
      await expect(page.getByLabel(/title/i)).toBeVisible();
      await expect(page.getByLabel(/status/i)).toBeVisible();

      // Check PO-specific fields
      await expect(page.getByLabel(/bill to/i)).toBeVisible();
      await expect(page.getByLabel(/ship to/i)).toBeVisible();

      // Take screenshot for verification
      await page.screenshot({ path: 'tests/screenshots/purchase-order-form-loaded.png' });
    });

    test('should create a new purchase order', async ({ page }) => {
      await page.goto(`/${PROJECT_ID}/commitments/new?type=purchase_order`);
      await page.waitForLoadState('networkidle');

      // Fill out the form
      const contractNumber = `PO-TEST-${Date.now()}`;
      await page.getByLabel(/contract/i).first().fill(contractNumber);
      await page.getByLabel(/title/i).fill('Test Purchase Order from E2E');

      // Select a company if available
      const companySelect = page.locator('text=Contract Company').locator('..').locator('button[role="combobox"]');
      if (await companySelect.isVisible()) {
        await companySelect.click();
        // Wait for dropdown to load
        await page.waitForTimeout(500);
        // Select first available company
        const firstOption = page.locator('[role="option"]').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
        }
      }

      // Fill billing info
      await page.getByLabel(/bill to/i).fill('123 Billing Street\nTest City, TS 12345');
      await page.getByLabel(/ship to/i).fill('456 Shipping Ave\nTest City, TS 12345');
      await page.getByLabel(/payment terms/i).fill('Net 30');

      // Fill description
      const descriptionField = page.getByLabel(/description/i).first();
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Test purchase order description from E2E tests');
      }

      // Take screenshot before submit
      await page.screenshot({ path: 'tests/screenshots/purchase-order-form-filled.png' });

      // Submit the form
      const submitButton = page.getByRole('button', { name: /create purchase order/i });
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // Wait for navigation or response
      await page.waitForLoadState('networkidle');

      // Take screenshot of result
      await page.screenshot({ path: 'tests/screenshots/purchase-order-form-result.png' });

      // Log the result for debugging
      const currentUrl = page.url();
      console.log('Current URL after submit:', currentUrl);
    });
  });
});
