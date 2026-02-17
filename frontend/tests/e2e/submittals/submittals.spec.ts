import { test, expect } from '@playwright/test';

test.describe('Submittals Page', () => {
  test('should load submittals from Supabase', async ({ page }) => {
    // Navigate to submittals page
    await page.goto('/submittals');
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Submittals")');
    
    // Check that the page title is visible
    await expect(page.locator('h1')).toContainText('Submittals');
    
    // Check that the table is visible
    await expect(page.locator('table')).toBeVisible();
    
    // Check that we have submittal data from the database
    // We inserted 5 submittals, so at least one should be visible
    await expect(page.locator('text=SUB-001')).toBeVisible();
    await expect(page.locator('text=Structural Steel Shop Drawings')).toBeVisible();
    
    // Check that status badges are displayed
    await expect(page.locator('text=submitted').first()).toBeVisible();
    
    // Check that the summary cards show correct counts
    const draftCount = await page.locator('text=Draft').locator('..').locator('.text-2xl').textContent();
    const submittedCount = await page.locator('text=Submitted').locator('..').locator('.text-2xl').textContent();
    
    // We know we have at least 1 draft and 1 submitted from our test data
    expect(parseInt(draftCount || '0')).toBeGreaterThanOrEqual(1);
    expect(parseInt(submittedCount || '0')).toBeGreaterThanOrEqual(1);
    
    // Check that the project name is displayed
    await expect(page.locator('text=The Roebling Homes')).toBeVisible();
  });

  test('should display all submittal statuses', async ({ page }) => {
    await page.goto('/submittals');
    await page.waitForSelector('h1:has-text("Submittals")');
    
    // Check for different status badges
    const statuses = ['draft', 'submitted', 'approved', 'under review', 'rejected'];
    for (const status of statuses) {
      const element = page.locator(`text=${status}`).first();
      await expect(element).toBeVisible();
    }
  });

  test('should have working action menu', async ({ page }) => {
    await page.goto('/submittals');
    await page.waitForSelector('h1:has-text("Submittals")');
    
    // Click on the first action menu
    await page.locator('button:has(svg.tabler-icon-dots)').first().click();
    
    // Check that menu items are visible
    await expect(page.locator('text=View')).toBeVisible();
    await expect(page.locator('text=Download')).toBeVisible();
    await expect(page.locator('text=Edit')).toBeVisible();
    await expect(page.locator('text=Delete')).toBeVisible();
  });
});