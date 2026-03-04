import { test, expect } from '@playwright/test';

/**
 * Quick verification that Change Events pages load without webpack errors
 * after clearing .next cache
 *
 * Auth is provided globally via storageState in playwright.config.ts.
 */

test.describe('Change Events - Quick Verification', () => {
  test('List page loads without webpack errors', async ({ page }) => {
    // Navigate to change events list page (domcontentloaded avoids CDN font hang)
    await page.goto('/60/change-events', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500); // allow React hydration

    // Check for webpack error overlay
    const errorOverlay = page.locator('[data-nextjs-dialog-overlay]');
    const hasError = await errorOverlay.isVisible().catch(() => false);

    expect(hasError, 'Should not show webpack error overlay').toBe(false);

    // Check that the page header loaded (use .first() to avoid strict mode with empty-state heading)
    const pageHeader = page.getByRole('heading', { name: /Change Events/i }).first();
    await expect(pageHeader).toBeVisible({ timeout: 5000 });

    // Check that "Create" button is visible
    const createButton = page.getByRole('button', { name: /New Change Event/i });
    await expect(createButton).toBeVisible();

    // Take screenshot for documentation (no fullPage to avoid font-loading hang)
    await page.screenshot({
      path: 'tests/screenshots/change-events/quick-verify-list-page.png',
    }).catch(() => null);
  });

  test('Create form page loads without webpack errors', async ({ page }) => {
    // Navigate directly to create form (domcontentloaded avoids CDN font hang)
    await page.goto('/60/change-events/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // allow React hydration

    // Verify we stayed on the /new page (no redirect to error or login)
    expect(page.url()).toContain('/change-events/new');

    // Check for webpack error overlay
    const errorOverlay = page.locator('[data-nextjs-dialog-overlay]');
    const hasError = await errorOverlay.isVisible().catch(() => false);

    expect(hasError, 'Should not show webpack error overlay').toBe(false);

    // Check that form loaded (data-testid is most reliable)
    const titleInput = page.locator('[data-testid="change-event-title-input"]').or(
      page.locator('input[name="title"]')
    ).first();

    // 10s is sufficient; form renders synchronously after hydration
    const formLoaded = await titleInput.isVisible({ timeout: 10000 }).catch(() => false);

    expect(formLoaded, 'Form should load with input fields').toBe(true);

    // Take screenshot for documentation (no fullPage to avoid font-loading hang)
    await page.screenshot({
      path: 'tests/screenshots/change-events/quick-verify-create-form.png',
    }).catch(() => null);
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
