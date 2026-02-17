import { test, expect } from '@playwright/test';

// Visual check for the contract form matching Procore's layout

const projectId = 68;

test.describe('Contract Form Visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(2000);
  });

  test('contract form loads with Procore-style single page layout', async ({ page }) => {
    // Navigate to the new contract page
    await page.goto(`/${projectId}/contracts/new`);
    await page.waitForLoadState('networkidle');

    // Take a screenshot to verify the page loaded
    await page.screenshot({
      path: 'tests/screenshots/contract-form-procore-style.png',
      fullPage: true,
    });

    // Verify the new single-page layout (no tabs)
    // Check for section headers that should be visible on one page
    await expect(page.getByText('General Information')).toBeVisible();
    await expect(page.getByText('Schedule of Values')).toBeVisible();

    // Check for key form field labels (using text since labels might not be associated)
    await expect(page.getByText('Contract #')).toBeVisible();
    await expect(page.getByText('Owner/Client')).toBeVisible();
    await expect(page.getByText('Title').first()).toBeVisible();

    // Check for SOV empty state
    await expect(page.getByText('You Have No Line Items Yet')).toBeVisible();

    console.log('Contract form loaded successfully with Procore-style layout');
  });

  test('contract form shows all sections', async ({ page }) => {
    await page.goto(`/${projectId}/contracts/new`);
    await page.waitForLoadState('networkidle');

    // Scroll down to see all sections
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check for all section cards
    await expect(page.getByText('General Information')).toBeVisible();
    await expect(page.getByText('Schedule of Values')).toBeVisible();
    await expect(page.getByText('Inclusions & Exclusions')).toBeVisible();
    await expect(page.getByText('Contract Dates')).toBeVisible();
    await expect(page.getByText('Contract Privacy')).toBeVisible();

    // Check for Create button
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
  });
});
