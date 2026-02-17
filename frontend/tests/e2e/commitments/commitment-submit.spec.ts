import { test, expect } from '@playwright/test';

const PROJECT_ID = 67;

test.describe('Submit Commitment Forms', () => {
  test('submit purchase order and capture response', async ({ page }) => {
    // Navigate to the purchase order form
    await page.goto(`/${PROJECT_ID}/commitments/new?type=purchase_order`);
    await page.waitForLoadState('networkidle');

    // Log all network requests
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        console.log(`[API] ${response.request().method()} ${response.url()} -> ${response.status()}`);
        if (response.status() >= 400) {
          try {
            const body = await response.json();
            console.log('[API Error Body]:', JSON.stringify(body, null, 2));
          } catch {
            console.log('[API Error Body]: Could not parse');
          }
        }
      }
    });

    // Fill minimal required fields
    const contractField = page.getByRole('textbox', { name: 'Contract #' });
    await contractField.clear();
    await contractField.fill(`PO-TEST-${Date.now()}`);

    await page.getByRole('textbox', { name: 'Title' }).fill('Test PO');

    // Screenshot before submit
    await page.screenshot({ path: 'tests/screenshots/po-submit-before.png' });

    // Click submit and wait for response
    const submitButton = page.getByRole('button', { name: /create purchase order/i });

    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/projects/') &&
                    response.url().includes('/purchase-orders') &&
                    response.request().method() === 'POST',
      { timeout: 15000 }
    );

    await submitButton.click();

    try {
      const response = await responsePromise;
      console.log('=== API Response ===');
      console.log('Status:', response.status());
      console.log('URL:', response.url());

      const body = await response.json();
      console.log('Body:', JSON.stringify(body, null, 2));

      // Screenshot after
      await page.screenshot({ path: 'tests/screenshots/po-submit-after.png' });

      // Assert based on response
      if (response.status() === 200 || response.status() === 201) {
        expect(body.data).toBeTruthy();
        console.log('✅ Purchase order created successfully!');
      } else {
        console.log('❌ Failed to create purchase order');
        console.log('Error:', body.error);
        console.log('Details:', body.details);
      }
    } catch (error) {
      console.log('Response not received within timeout');
      await page.screenshot({ path: 'tests/screenshots/po-submit-timeout.png' });

      // Check current URL
      console.log('Current URL:', page.url());
    }
  });
});
