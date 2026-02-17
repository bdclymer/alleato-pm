import { test, expect } from '@playwright/test';

const PROJECT_ID = 67;

test.describe('Full Commitment Form Submit', () => {
  test('submit purchase order with all fields', async ({ page }) => {
    // Navigate to the purchase order form
    await page.goto(`/${PROJECT_ID}/commitments/new?type=purchase_order`);
    await page.waitForLoadState('networkidle');

    // Log console errors
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[Console ${msg.type()}]:`, msg.text());
      }
    });

    // Log all network requests
    page.on('response', async (response) => {
      if (response.url().includes('/api/') && response.request().method() === 'POST') {
        console.log(`[API POST] ${response.url()} -> ${response.status()}`);
        try {
          const body = await response.json();
          console.log('[API Response]:', JSON.stringify(body, null, 2));
        } catch {
          // ignore
        }
      }
    });

    // Wait for form to load completely
    await expect(page.getByRole('heading', { name: /new purchase order/i })).toBeVisible();
    await page.waitForTimeout(1000);

    // Fill Contract # (required)
    const contractField = page.getByRole('textbox', { name: 'Contract #' });
    await contractField.clear();
    await contractField.fill(`PO-FULL-${Date.now()}`);

    // Fill Title
    await page.getByRole('textbox', { name: 'Title' }).fill('Full Test Purchase Order');

    // Status should already be "Draft" by default
    // Executed checkbox should already be unchecked

    // Fill Description
    const descField = page.locator('textarea[id="description"]');
    if (await descField.isVisible()) {
      await descField.fill('Full test description');
    }

    // Take screenshot of filled form
    await page.screenshot({ path: 'tests/screenshots/po-full-before-submit.png', fullPage: true });

    // Check for any validation errors already visible
    const errorMessages = await page.locator('.text-red-600, .text-destructive').allTextContents();
    if (errorMessages.length > 0) {
      console.log('Validation errors before submit:', errorMessages);
    }

    // Click submit
    const submitButton = page.getByRole('button', { name: /create purchase order/i });
    await expect(submitButton).toBeEnabled();

    console.log('Clicking submit button...');
    await submitButton.click();

    // Wait a moment to see if form submission occurs
    await page.waitForTimeout(3000);

    // Take screenshot after click
    await page.screenshot({ path: 'tests/screenshots/po-full-after-submit.png', fullPage: true });

    // Check for validation errors after submit
    const errorsAfter = await page.locator('.text-red-600, .text-destructive, [role="alert"]').allTextContents();
    if (errorsAfter.length > 0) {
      console.log('Validation errors after submit:', errorsAfter);
    }

    // Check final URL
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);

    if (finalUrl.includes('/commitments/new')) {
      console.log('Still on form - submission did not complete');

      // Debug: check form state
      const formElement = page.locator('form');
      const isValid = await formElement.evaluate((form: HTMLFormElement) => form.checkValidity());
      console.log('Form HTML validity:', isValid);
    } else {
      console.log('Navigated away - submission successful!');
    }
  });

  test('check form defaults', async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/commitments/new?type=purchase_order`);
    await page.waitForLoadState('networkidle');

    // Wait for form
    await expect(page.getByRole('heading', { name: /new purchase order/i })).toBeVisible();

    // Check default values
    const statusSelect = page.locator('button[role="combobox"]').filter({ hasText: 'Draft' });
    const statusVisible = await statusSelect.isVisible();
    console.log('Status select shows "Draft":', statusVisible);

    const executedCheckbox = page.locator('input[type="checkbox"][id="executed"]').or(
      page.locator('[role="checkbox"][id="executed"]')
    );
    const isChecked = await executedCheckbox.isChecked().catch(() => false);
    console.log('Executed checkbox is checked:', isChecked);

    // Check accounting method banner
    const accountingBanner = page.locator('text=accounting method is unit/quantity-based');
    const hasAccountingMethod = await accountingBanner.isVisible().catch(() => false);
    console.log('Accounting method banner visible:', hasAccountingMethod);

    await page.screenshot({ path: 'tests/screenshots/po-defaults-check.png', fullPage: true });
  });
});
