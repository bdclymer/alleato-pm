import { test, expect } from '@playwright/test';

const projectId = '182';

test.use({ storageState: 'tests/.auth/user.json' });

test.describe('Drawings - Navigation Test', () => {
  test('can navigate to drawings from project home', async ({ page }) => {
    // Navigate to project home first
    await page.goto(`/${projectId}`, { waitUntil: 'networkidle' });

    // Take screenshot of project home
    await page.screenshot({ path: 'tests/screenshots/project-home-navigation.png', fullPage: true });

    // Check if there's a drawings link in navigation
    const drawingsLink = page.locator('a[href*="drawings"], a:has-text("Drawings")');

    if (await drawingsLink.count() > 0) {
      console.log('Found drawings link, clicking it...');
      await drawingsLink.first().click();

      // Wait for navigation
      await page.waitForLoadState('networkidle');

      // Take screenshot of result
      await page.screenshot({ path: 'tests/screenshots/drawings-after-navigation.png', fullPage: true });

      console.log('Current URL after navigation:', page.url());
    } else {
      console.log('No drawings link found in navigation. Trying direct URL...');

      // Try direct URL
      const response = await page.goto(`/${projectId}/drawings`, { waitUntil: 'networkidle' });
      console.log('Direct URL response status:', response?.status());

      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/drawings-direct-url.png', fullPage: true });
    }

    // Check current page content
    const pageText = await page.textContent('body');
    console.log('Page content sample:', pageText?.substring(0, 300));
  });

  test('check available routes in sidebar', async ({ page }) => {
    await page.goto(`/${projectId}`, { waitUntil: 'networkidle' });

    // Look for sidebar navigation
    const sidebar = page.locator('[data-testid="sidebar"], nav, .sidebar, [role="navigation"]');

    if (await sidebar.count() > 0) {
      const links = sidebar.locator('a');
      const linkCount = await links.count();
      console.log(`Found ${linkCount} navigation links`);

      for (let i = 0; i < Math.min(linkCount, 20); i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        console.log(`Link ${i}: "${text}" -> "${href}"`);
      }
    } else {
      console.log('No sidebar found');
    }
  });
});