import { test, expect } from '@playwright/test';

test.describe('Sidebar Visual Test', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  test('capture sidebar expanded and collapsed states', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot of EXPANDED state
    await page.screenshot({
      path: 'tests/screenshots/sidebar-expanded.png',
      fullPage: true
    });

    console.log('✅ Screenshot 1: tests/screenshots/sidebar-expanded.png captured');

    // Find and click the toggle button - try multiple selectors
    const toggleSelectors = [
      '[data-testid="sidebar-toggle"]',
      'button[aria-label*="toggle" i]',
      'button[aria-label*="collapse" i]',
      '.sidebar-trigger',
      '[class*="SidebarTrigger"]',
      'button:has-text("Toggle")',
    ];

    let toggleButton = null;
    for (const selector of toggleSelectors) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        toggleButton = locator;
        console.log(`✅ Found toggle button with selector: ${selector}`);
        break;
      }
    }

    if (toggleButton) {
      await toggleButton.click();
      await page.waitForTimeout(1000);

      // Take screenshot of COLLAPSED state
      await page.screenshot({
        path: 'tests/screenshots/sidebar-collapsed.png',
        fullPage: true
      });

      console.log('✅ Screenshot 2: tests/screenshots/sidebar-collapsed.png captured');
    } else {
      console.log('⚠️  Could not find toggle button');

      // Take a screenshot anyway to show current state
      await page.screenshot({
        path: 'tests/screenshots/sidebar-current-state.png',
        fullPage: true
      });
    }
  });
});
