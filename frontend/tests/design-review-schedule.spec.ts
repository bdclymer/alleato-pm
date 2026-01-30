import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Design Review - Schedule Page
 * Captures screenshots of all 5 tabs for comprehensive design review
 */

test.describe('Schedule Page Design Review', () => {
  test.use({
    viewport: { width: 1440, height: 900 },
  });

  test('capture all schedule views', async ({ page }) => {
    const screenshotsDir = path.join(__dirname, 'screenshots', 'schedule-design-review');

    // Navigate to schedule page
    await page.goto('http://localhost:3000/67/schedule');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if we need to login
    const loginForm = page.locator('form').filter({ hasText: 'Email' });
    if (await loginForm.isVisible()) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'test123456');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/67/schedule');
      await page.waitForLoadState('networkidle');
    }

    // Wait for initial render
    await page.waitForTimeout(1000);

    // Capture 1: Initial Grid View
    await page.screenshot({
      path: `${screenshotsDir}/01-grid-view.png`,
      fullPage: true
    });

    // Capture 2: Board View
    await page.click('button:has-text("Board")');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${screenshotsDir}/02-board-view.png`,
      fullPage: true
    });

    // Capture 3: Schedule View (split with Gantt)
    await page.click('button:has-text("Schedule")');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${screenshotsDir}/03-schedule-view.png`,
      fullPage: true
    });

    // Capture 4: Timeline View
    await page.click('button:has-text("Timeline")');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${screenshotsDir}/04-timeline-view.png`,
      fullPage: true
    });

    // Capture 5: Calendar View
    await page.click('button:has-text("Calendar")');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${screenshotsDir}/05-calendar-view.png`,
      fullPage: true
    });

    // Capture 6: Hover state on Grid view
    await page.click('button:has-text("Grid")');
    await page.waitForTimeout(500);

    // Hover over a task row if exists
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.hover();
      await page.screenshot({
        path: `${screenshotsDir}/06-grid-hover-state.png`,
        fullPage: false
      });
    }

    // Capture 7: Header and summary cards detail
    await page.screenshot({
      path: `${screenshotsDir}/07-header-summary.png`,
      clip: { x: 0, y: 0, width: 1440, height: 400 }
    });

    console.log('Screenshots saved to:', screenshotsDir);
  });
});
