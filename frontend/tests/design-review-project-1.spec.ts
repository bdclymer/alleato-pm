import { test, expect } from '@playwright/test';

test.describe('Design Review - Project Home (ID 1)', () => {
  test('Navigate to project 1 home page for design review', async ({ page }) => {
    // Try project ID 1 first
    await page.goto('http://localhost:3007/1/home');
    await page.waitForLoadState('networkidle');

    // Take screenshot regardless of content
    await page.screenshot({
      path: 'test-results/design-review-project-1-full.png',
      fullPage: true
    });

    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());

    // Check if we get access denied or actual content
    const accessDenied = await page.locator('text="Access Denied"').isVisible().catch(() => false);
    const projectContent = await page.locator('text="Financial Overview"').isVisible().catch(() => false);

    console.log('Access Denied:', accessDenied);
    console.log('Project Content Visible:', projectContent);

    if (!accessDenied && !projectContent) {
      // Maybe the page has different content, let's see what's there
      const bodyText = await page.locator('body').textContent();
      console.log('Page body preview:', bodyText?.substring(0, 200));
    }
  });
});