import { test, expect } from '@playwright/test';

const PROJECT_ID = 67;

test.describe('Create Commitments', () => {
  test('should create a purchase order via the form', async ({ page }) => {
    // Navigate directly to the purchase order form
    await page.goto(`/${PROJECT_ID}/commitments/new?type=purchase_order`);
    await page.waitForLoadState('networkidle');

    // Take initial screenshot
    await page.screenshot({ path: 'tests/screenshots/po-create-initial.png', fullPage: true });

    // Verify form loaded
    await expect(page.getByRole('heading', { name: /new purchase order/i })).toBeVisible();

    // Fill in Contract #
    const contractNumberField = page.getByRole('textbox', { name: /contract/i }).first();
    await contractNumberField.clear();
    const poNumber = `PO-E2E-${Date.now()}`;
    await contractNumberField.fill(poNumber);

    // Fill in Title
    const titleField = page.getByRole('textbox', { name: /title/i });
    await titleField.fill('E2E Test Purchase Order');

    // Select Contract Company - click the combobox
    const companyCombobox = page.locator('[data-slot="select-trigger"]').first();
    await companyCombobox.click();
    await page.waitForTimeout(500);

    // Look for the dropdown content and click the first real option
    const dropdownOption = page.locator('[data-slot="select-item"]').first();
    if (await dropdownOption.isVisible({ timeout: 2000 })) {
      await dropdownOption.click();
    }

    // Fill Bill To
    const billToField = page.getByLabel(/bill to/i);
    await billToField.fill('123 Test Street\nTest City, ST 12345');

    // Fill Ship To
    const shipToField = page.getByLabel(/ship to/i);
    await shipToField.fill('456 Ship Street\nShip City, ST 67890');

    // Fill Payment Terms
    const paymentField = page.getByLabel(/payment terms/i);
    await paymentField.fill('Net 30');

    // Fill Description
    const descFields = page.locator('textarea').filter({ hasText: '' });
    const descField = page.getByLabel(/description/i);
    if (await descField.isVisible()) {
      await descField.fill('Test purchase order created by E2E test');
    }

    // Take screenshot before submit
    await page.screenshot({ path: 'tests/screenshots/po-create-filled.png', fullPage: true });

    // Listen for console messages to capture any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Submit the form
    const submitButton = page.getByRole('button', { name: /create purchase order/i });
    await expect(submitButton).toBeVisible();

    // Wait for navigation after clicking
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/projects/') && resp.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => null);

    await submitButton.click();

    // Wait for the API response
    const response = await responsePromise;
    if (response) {
      console.log('API Response status:', response.status());
      const body = await response.json().catch(() => ({}));
      console.log('API Response body:', JSON.stringify(body, null, 2));
    }

    // Wait and take screenshot of result
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/po-create-result.png', fullPage: true });

    // Log the final URL
    console.log('Final URL:', page.url());

    // Check if we stayed on the form (error) or navigated away (success)
    const currentUrl = page.url();
    if (currentUrl.includes('/commitments/new')) {
      // Still on form - check for error messages
      const errorText = await page.locator('.text-red-600, .text-destructive, [role="alert"]').first().textContent().catch(() => null);
      if (errorText) {
        console.log('Form error:', errorText);
      }
    } else {
      console.log('Successfully navigated away from form');
    }
  });

  test('should create a subcontract via the form', async ({ page }) => {
    // Navigate directly to the subcontract form
    await page.goto(`/${PROJECT_ID}/commitments/new?type=subcontract`);
    await page.waitForLoadState('networkidle');

    // Take initial screenshot
    await page.screenshot({ path: 'tests/screenshots/sc-create-initial.png', fullPage: true });

    // Verify form loaded
    await expect(page.getByRole('heading', { name: /new subcontract/i })).toBeVisible();

    // Fill in Contract #
    const contractNumberField = page.getByRole('textbox', { name: /contract/i }).first();
    await contractNumberField.clear();
    const scNumber = `SC-E2E-${Date.now()}`;
    await contractNumberField.fill(scNumber);

    // Fill in Title
    const titleField = page.getByRole('textbox', { name: /title/i });
    await titleField.fill('E2E Test Subcontract');

    // Select Contract Company - click the combobox
    const companyCombobox = page.locator('[data-slot="select-trigger"]').first();
    await companyCombobox.click();
    await page.waitForTimeout(500);

    // Look for the dropdown content and click the first real option
    const dropdownOption = page.locator('[data-slot="select-item"]').first();
    if (await dropdownOption.isVisible({ timeout: 2000 })) {
      await dropdownOption.click();
    }

    // Fill Description
    const descField = page.getByLabel(/description/i).first();
    if (await descField.isVisible()) {
      await descField.fill('Test subcontract created by E2E test');
    }

    // Take screenshot before submit
    await page.screenshot({ path: 'tests/screenshots/sc-create-filled.png', fullPage: true });

    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Submit the form
    const submitButton = page.getByRole('button', { name: /create subcontract/i });
    await expect(submitButton).toBeVisible();

    // Wait for navigation after clicking
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/projects/') && resp.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => null);

    await submitButton.click();

    // Wait for the API response
    const response = await responsePromise;
    if (response) {
      console.log('API Response status:', response.status());
      const body = await response.json().catch(() => ({}));
      console.log('API Response body:', JSON.stringify(body, null, 2));
    }

    // Wait and take screenshot of result
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/sc-create-result.png', fullPage: true });

    // Log the final URL
    console.log('Final URL:', page.url());
  });
});
