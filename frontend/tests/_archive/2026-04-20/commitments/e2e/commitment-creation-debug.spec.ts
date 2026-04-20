import { test, expect } from '@playwright/test';

test.describe('Commitment Creation Page Debug', () => {
  test('should load new commitment page for subcontract', async ({ page }) => {
    // Navigate to the new commitment page
    await page.goto('/67/commitments/new?type=subcontract');

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');

    // Take a screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/commitment-new-subcontract.png', fullPage: true });

    // Check if there are any console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Check page title
    const title = await page.title();
    console.log('Page title:', title);

    // Check if the page header is visible
    const header = page.locator('h1:has-text("New Subcontract")');
    await expect(header).toBeVisible({ timeout: 10000 });

    // Check if the form is visible
    const form = page.locator('form');
    await expect(form).toBeVisible({ timeout: 5000 });

    // Log any errors
    if (errors.length > 0) {
      console.error('Console errors:', errors);
    }

    // Get the page content
    const content = await page.content();
    console.log('Page loaded successfully');
    console.log('Form fields present:', await form.count());
  });

  test('should load new commitment page for purchase order', async ({ page }) => {
    // Navigate to the new commitment page
    await page.goto('/67/commitments/new?type=purchase_order');

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');

    // Take a screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/commitment-new-po.png', fullPage: true });

    // Check if the page header is visible
    const header = page.locator('h1:has-text("New Purchase Order")');
    await expect(header).toBeVisible({ timeout: 10000 });

    // Check if the form is visible
    const form = page.locator('form');
    await expect(form).toBeVisible({ timeout: 5000 });

    console.log('Purchase order page loaded successfully');
  });
});
