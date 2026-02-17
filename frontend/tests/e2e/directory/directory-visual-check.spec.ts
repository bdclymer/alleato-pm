import { test, expect } from '@playwright/test';

test.describe('Directory Pages Visual Check', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the directory
    await page.goto('/directory');
    await page.waitForLoadState('networkidle');
  });

  test('should check directory companies page layout', async ({ page }) => {
    // Should redirect to /directory/companies
    await expect(page).toHaveURL(/\/directory\/companies/);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/directory-companies-full.png',
      fullPage: true
    });

    // Check for key components
    const pageHeader = page.locator('[data-slot="page-header"]').first();
    const pageTabs = page.locator('[data-slot="page-tabs"]').first();
    const pageContainer = page.locator('[data-slot="page-container"]').first();

    console.log('=== DIRECTORY COMPANIES PAGE STRUCTURE ===');
    console.log('PageHeader exists:', await pageHeader.count() > 0);
    console.log('PageTabs exists:', await pageTabs.count() > 0);
    console.log('PageContainer exists:', await pageContainer.count() > 0);

    // Log the actual HTML structure
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('\n=== BODY HTML (first 2000 chars) ===');
    console.log(bodyHTML.substring(0, 2000));
  });

  test('should check directory users page layout', async ({ page }) => {
    await page.goto('/directory/users');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/directory-users-full.png',
      fullPage: true
    });

    const pageHeader = page.locator('[data-slot="page-header"]').first();
    const pageTabs = page.locator('[data-slot="page-tabs"]').first();
    const pageContainer = page.locator('[data-slot="page-container"]').first();

    console.log('=== DIRECTORY USERS PAGE STRUCTURE ===');
    console.log('PageHeader exists:', await pageHeader.count() > 0);
    console.log('PageTabs exists:', await pageTabs.count() > 0);
    console.log('PageContainer exists:', await pageContainer.count() > 0);

    // Check for StatCards
    const statCards = page.locator('[data-slot="stat-card"]');
    console.log('StatCard count:', await statCards.count());
  });

  test('should compare directory with commitments page structure', async ({ page }) => {
    // First check commitments page
    await page.goto('/67/commitments');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'tests/screenshots/commitments-reference.png',
      fullPage: true
    });

    const commitmentsHTML = await page.locator('body').innerHTML();
    console.log('\n=== COMMITMENTS PAGE STRUCTURE (first 2000 chars) ===');
    console.log(commitmentsHTML.substring(0, 2000));

    // Now check directory page
    await page.goto('/directory/companies');
    await page.waitForLoadState('networkidle');

    const directoryHTML = await page.locator('body').innerHTML();
    console.log('\n=== DIRECTORY PAGE STRUCTURE (first 2000 chars) ===');
    console.log(directoryHTML.substring(0, 2000));
  });
});
