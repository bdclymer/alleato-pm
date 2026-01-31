import { test, expect } from '@playwright/test';

test.describe('RFIs Page Visual Test', () => {
  test('check RFIs page on port 3000', async ({ page }) => {
    console.log('🔍 Testing http://localhost:3000/rfis');
    await page.goto('/rfis');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Let everything render

    // Take full page screenshot
    await page.screenshot({ 
      path: '/Users/meganharrison/Documents/github/alleato-procore/tests/screenshots/rfis-port-3000.png', 
      fullPage: true 
    });

    // Check for page title in the GenericDataTable
    const pageTitle = await page.locator('h1, h2, h3').first().textContent();
    console.log('📝 First heading text:', pageTitle);

    // Check if table exists
    const hasTable = await page.locator('table').count() > 0;
    console.log('📊 Has table:', hasTable);

    // Check for "RFIs" text anywhere on page
    const rfisText = await page.locator('text=/RFIs/i').count();
    console.log('🔤 "RFIs" appears', rfisText, 'times');

    // Check for the Create RFI button
    const createButton = await page.locator('button:has-text("Create RFI")').count();
    console.log('➕ Create RFI button count:', createButton);

    // Get all visible headings
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('📋 All headings on page:', headings);
  });

  test('check RFIs page on port 3000', async ({ page }) => {
    console.log('🔍 Testing http://localhost:3000/rfis');
    await page.goto('/rfis');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({ 
      path: '/Users/meganharrison/Documents/github/alleato-procore/tests/screenshots/rfis-port-3000.png', 
      fullPage: true 
    });

    // Check for page title
    const pageTitle = await page.locator('h1, h2, h3').first().textContent();
    console.log('📝 First heading text:', pageTitle);

    // Check if it's a 404
    const is404 = await page.locator('text=/404/i').count() > 0;
    console.log('❌ Is 404 page:', is404);

    // Check for the Create RFI button
    const createButton = await page.locator('button:has-text("Create RFI")').count();
    console.log('➕ Create RFI button count:', createButton);

    // Get all visible headings
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('📋 All headings on page:', headings);
  });
});
