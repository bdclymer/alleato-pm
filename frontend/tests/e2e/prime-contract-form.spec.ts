import { test, expect } from '@playwright/test';

test.describe('Prime Contract Form', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the contract edit page
    await page.goto('http://localhost:3001/293/prime-contracts/55843c1d-4d60-4cb0-abdb-7d67e87ee840/edit');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should save owner/client, contractor, and architect when editing contract', async ({ page }) => {
    // Wait for the form to load
    await expect(page.locator('[data-testid="prime-contract-form"]')).toBeVisible({ timeout: 10000 });

    // Select Owner/Client
    const ownerSelect = page.locator('[data-testid="owner-client-select"]');
    await ownerSelect.click();
    await page.waitForTimeout(500);

    // Select first option
    const firstOwnerOption = page.locator('[data-testid="owner-client-option-0"]').first();
    await firstOwnerOption.click();

    // Take screenshot after selecting owner
    await page.screenshot({ path: 'screenshots/prime-contract-owner-selected.png', fullPage: true });

    // Select Contractor
    const contractorSelect = page.locator('label:has-text("Contractor")').locator('..').locator('button[role="combobox"]');
    await contractorSelect.click();
    await page.waitForTimeout(500);

    // Click first contractor option
    await page.locator('[cmdk-item]').first().click();

    // Take screenshot after selecting contractor
    await page.screenshot({ path: 'screenshots/prime-contract-contractor-selected.png', fullPage: true });

    // Select Architect/Engineer
    const architectSelect = page.locator('label:has-text("Architect/Engineer")').locator('..').locator('button[role="combobox"]');
    await architectSelect.click();
    await page.waitForTimeout(500);

    // Click first architect option
    await page.locator('[cmdk-item]').first().click();

    // Take screenshot before submit
    await page.screenshot({ path: 'screenshots/prime-contract-before-submit.png', fullPage: true });

    // Click Update button
    await page.locator('button[type="submit"]:has-text("Update")').click();

    // Wait for navigation to contract detail page
    await page.waitForURL('**/prime-contracts/*', { timeout: 10000 });

    // Take screenshot of result page
    await page.screenshot({ path: 'screenshots/prime-contract-after-submit.png', fullPage: true });

    // Verify we're on the detail page
    await expect(page.locator('text=General Info')).toBeVisible({ timeout: 5000 });

    // Check that Owner/Client is displayed
    const ownerClientLabel = page.locator('text=Owner/Client').locator('..').locator('p.font-medium');
    await expect(ownerClientLabel).not.toHaveText('--');

    // Check that Contractor is displayed
    const contractorLabel = page.locator('text=Contractor').locator('..').locator('p.font-medium');
    await expect(contractorLabel).not.toHaveText('--');

    // Check that Architect/Engineer is displayed
    const architectLabel = page.locator('text=Architect/Engineer').locator('..').locator('p.font-medium');
    await expect(architectLabel).not.toHaveText('--');
  });

  test('should display SOV line items when clicking edit', async ({ page }) => {
    // First, let's add some SOV line items
    await expect(page.locator('[data-testid="prime-contract-form"]')).toBeVisible({ timeout: 10000 });

    // Scroll to SOV section
    await page.locator('text=Schedule of Values').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Check if there are already line items
    const sovTable = page.locator('[data-testid="sov-table"]');
    const existingLines = await page.locator('[data-testid^="sov-line-"]').count();

    if (existingLines === 0) {
      // Add a line item
      await page.locator('[data-testid="sov-add-line-empty"]').click();
      await page.waitForTimeout(500);
    }

    // Fill in the first line item
    const firstLine = page.locator('[data-testid="sov-line-0"]');
    await firstLine.locator('[data-testid="sov-line-description"]').fill('Test Line Item');
    await firstLine.locator('[data-testid="sov-line-amount"]').fill('10000');

    // Take screenshot before submit
    await page.screenshot({ path: 'screenshots/prime-contract-sov-before-submit.png', fullPage: true });

    // Submit the form
    await page.locator('button[type="submit"]:has-text("Update")').click();

    // Wait for navigation
    await page.waitForURL('**/prime-contracts/*', { timeout: 10000 });

    // Take screenshot after submit
    await page.screenshot({ path: 'screenshots/prime-contract-sov-after-submit.png', fullPage: true });

    // Go back to edit mode
    await page.locator('button:has-text("Edit Contract")').click();
    await page.waitForLoadState('domcontentloaded');

    // Wait for form to load
    await expect(page.locator('[data-testid="prime-contract-form"]')).toBeVisible({ timeout: 10000 });

    // Scroll to SOV section
    await page.locator('text=Schedule of Values').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Take screenshot of SOV section
    await page.screenshot({ path: 'screenshots/prime-contract-sov-edit-mode.png', fullPage: true });

    // Verify line items are displayed
    const sovLinesAfterEdit = await page.locator('[data-testid^="sov-line-"]').count();
    expect(sovLinesAfterEdit).toBeGreaterThan(0);

    // Verify the line item we added is there
    await expect(firstLine.locator('[data-testid="sov-line-description"]')).toHaveValue('Test Line Item');
    await expect(firstLine.locator('[data-testid="sov-line-amount"]')).toHaveValue('10000');
  });
});
