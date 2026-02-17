import { test, expect } from '@playwright/test';

/**
 * Quick verification that Change Events pages load without webpack errors
 * after clearing .next cache
 */

test.describe('Change Events - Quick Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/');

    // Check if already logged in by looking for user menu
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);

    if (!isLoggedIn) {
      // Simple login flow
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('password123');
        await page.locator('button[type="submit"]').click();
        await page.waitForLoadState('domcontentloaded');
      }
    }
  });

  test('List page loads without webpack errors', async ({ page }) => {
    // Navigate to change events list page
    await page.goto('/60/change-events');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Check for webpack error overlay
    const errorOverlay = page.locator('[data-nextjs-dialog-overlay]');
    const hasError = await errorOverlay.isVisible().catch(() => false);

    expect(hasError, 'Should not show webpack error overlay').toBe(false);

    // Check that the page header loaded
    const pageHeader = page.getByRole('heading', { name: /Change Events/i });
    await expect(pageHeader).toBeVisible({ timeout: 5000 });

    // Check that "Create" button is visible
    const createButton = page.getByRole('button', { name: /New Change Event/i });
    await expect(createButton).toBeVisible();

    // Take screenshot for documentation
    await page.screenshot({
      path: 'tests/screenshots/change-events/quick-verify-list-page.png',
      fullPage: true
    });
  });

  test('Create form page loads without webpack errors', async ({ page }) => {
    // Navigate directly to create form
    await page.goto('/60/change-events/new');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Check for webpack error overlay
    const errorOverlay = page.locator('[data-nextjs-dialog-overlay]');
    const hasError = await errorOverlay.isVisible().catch(() => false);

    expect(hasError, 'Should not show webpack error overlay').toBe(false);

    // Check that form loaded (look for any input field)
    const titleInput = page.locator('input[name="title"]').or(
      page.locator('label:has-text("Title")').locator('~ input')
    );

    // If form loaded successfully, we should see the title input
    const formLoaded = await titleInput.isVisible({ timeout: 5000 }).catch(() => false);

    expect(formLoaded, 'Form should load with input fields').toBe(true);

    // Take screenshot for documentation
    await page.screenshot({
      path: 'tests/screenshots/change-events/quick-verify-create-form.png',
      fullPage: true
    });
  });

  test('API endpoint returns without errors', async ({ page }) => {
    // Make API request
    const response = await page.request.get('/api/projects/60/change-events');

    // Should return 200, not 500
    expect(response.status()).toBe(200);

    // Should return valid JSON
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });
});
