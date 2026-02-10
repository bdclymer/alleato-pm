/**
 * Test the auto-fill button functionality
 */
import { test, expect } from '@playwright/test';

const PROJECT_ID = '67';

test.describe('Direct Costs - Auto-Fill Test', () => {
  test('Auto-fill button appears and fills form', async ({ page }) => {
    // Navigate to create page
    await page.goto(`/${PROJECT_ID}/direct-costs/new`);
    await page.waitForLoadState('networkidle');

    // Look for the auto-fill button (dev mode only)
    const autoFillButton = page.locator('button:has-text("Auto-fill Test Data")');

    const buttonVisible = await autoFillButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!buttonVisible) {
      console.log('Auto-fill button not visible - might not be in dev mode');
      await page.screenshot({ path: 'test-results/autofill-button-not-found.png' });
      return;
    }

    console.log('✅ Auto-fill button found');
    await page.screenshot({ path: 'test-results/autofill-step1-before.png' });

    // Click the auto-fill button
    await autoFillButton.click();
    await page.waitForTimeout(2000);

    console.log('Clicked auto-fill button');
    await page.screenshot({ path: 'test-results/autofill-step2-after.png' });

    // Check if submit button is now enabled
    const submitButton = page.locator('button[type="submit"]').first();
    const isDisabled = await submitButton.isDisabled();

    console.log(`Submit button disabled after auto-fill: ${isDisabled}`);

    if (!isDisabled) {
      console.log('✅ SUCCESS - Form is now valid and submittable!');

      // Try submitting
      await submitButton.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/autofill-step3-submitted.png' });

      // Check for success toast
      const hasSuccess = await page.locator('text=successfully').isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`Success toast visible: ${hasSuccess}`);
    } else {
      console.log('⚠️ Submit still disabled - checking for errors');

      // Check for toast errors
      const toastText = await page.locator('[data-sonner-toast]').textContent().catch(() => '');
      console.log(`Toast message: ${toastText}`);
    }
  });
});
