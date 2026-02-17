import { test, expect } from '@playwright/test';

test.describe('Contacts Page', () => {
  test('should load the contacts page', async ({ page }) => {
    await page.goto('http://localhost:3000/directory/contacts');

    // Check that the page loads without errors
    await expect(page).toHaveURL(/.*contacts/);

    // Look for the contacts table
    await expect(page.getByRole('heading', { name: /contacts/i })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });
});
