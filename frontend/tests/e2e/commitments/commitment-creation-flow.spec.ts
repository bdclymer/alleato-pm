import { test, expect } from '@playwright/test';

test.describe('Commitment Creation Flow', () => {
  test('should display subcontract form with all required fields', async ({ page }) => {
    await page.goto('/67/commitments/new?type=subcontract');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('h1')).toContainText('New Subcontract');

    // Verify form sections are present
    await expect(page.locator('h2:has-text("General Information")')).toBeVisible();
    await expect(page.locator('h2:has-text("Schedule of Values")')).toBeVisible();
    await expect(page.locator('h2:has-text("Attachments")')).toBeVisible();
    await expect(page.locator('h2:has-text("Contract Dates")').first()).toBeVisible();

    // Verify key form fields exist (using more flexible selectors)
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await expect(page.locator('textarea').first()).toBeVisible();

    // Verify action buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Create")')).toBeVisible();
  });

  test('should display purchase order form with all required fields', async ({ page }) => {
    await page.goto('/67/commitments/new?type=purchase_order');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('h1')).toContainText('New Purchase Order');

    // Verify form sections are present
    await expect(page.locator('text=General Information')).toBeVisible();

    // Verify action buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Create")')).toBeVisible();
  });

  test('should navigate back to commitments page on cancel', async ({ page }) => {
    await page.goto('/67/commitments/new?type=subcontract');
    await page.waitForLoadState('networkidle');

    // Click cancel button
    await page.click('button:has-text("Cancel")');

    // Should navigate to commitments page
    await page.waitForURL(/\/67\/commitments$/);
    expect(page.url()).toContain('/67/commitments');
  });
});
