import { test, expect } from '@playwright/test';

test.describe('Design Review - Project Home Page', () => {
  test('Navigate to project home and take screenshots for design review', async ({ page }) => {
    // Navigate to the project home page on the correct port
    await page.goto('http://localhost:3007/89/home');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await page.screenshot({
      path: 'test-results/design-review-full-page.png',
      fullPage: true
    });

    // Test different viewport sizes for responsive design

    // Desktop (1440px)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: 'test-results/design-review-desktop-1440.png',
      fullPage: true
    });

    // Tablet (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: 'test-results/design-review-tablet-768.png',
      fullPage: true
    });

    // Mobile (375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: 'test-results/design-review-mobile-375.png',
      fullPage: true
    });

    // Test interactions - expand/collapse sections
    await page.setViewportSize({ width: 1440, height: 900 });

    // Try to click on section headers to test collapsing
    const teamSection = page.locator('text="Project Team"');
    if (await teamSection.isVisible()) {
      await teamSection.click();
      await page.screenshot({
        path: 'test-results/design-review-team-collapsed.png',
        fullPage: true
      });
    }

    // Test Tools dropdown
    const toolsButton = page.locator('button:has-text("Tools")');
    if (await toolsButton.isVisible()) {
      await toolsButton.click();
      await page.screenshot({
        path: 'test-results/design-review-tools-dropdown.png',
        fullPage: true
      });
    }

    // Check console for errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    // Log any console errors
    if (consoleMessages.length > 0) {
      console.log('Console Errors Found:', consoleMessages);
    }

    // Basic accessibility check - ensure page has proper heading structure
    const h1Elements = await page.locator('h1').count();
    const h2Elements = await page.locator('h2').count();

    console.log(`Heading structure: H1: ${h1Elements}, H2: ${h2Elements}`);

    // Verify key elements are present
    await expect(page.locator('text="Financial Overview"')).toBeVisible();
    await expect(page.locator('text="Quick Actions"')).toBeVisible();

    console.log('Design review screenshots captured successfully');
  });
});