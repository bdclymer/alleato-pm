import { test } from '@playwright/test';
import path from 'path';

test.describe('Schedule Page Screenshots', () => {
  test.use({
    viewport: { width: 1440, height: 900 },
  });

  test('capture schedule page views', async ({ page }) => {
    const dir = '/Users/meganharrison/Documents/github/alleato-procore/frontend/tests/screenshots/schedule-design-review';

    // Navigate and wait for full load
    await page.goto('http://localhost:3000/67/schedule', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: `${dir}/00-initial-load.png`, fullPage: true });

    // Try clicking Grid tab
    const gridTab = page.locator('button:has-text("Grid")');
    if (await gridTab.isVisible()) {
      await gridTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${dir}/grid-full.png`, fullPage: true });
    }

    // Try clicking Board tab
    const boardTab = page.locator('button:has-text("Board")');
    if (await boardTab.isVisible()) {
      await boardTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${dir}/board-full.png`, fullPage: true });
    }

    // Try clicking Schedule tab
    const scheduleTab = page.locator('button:has-text("Schedule")');
    if (await scheduleTab.isVisible()) {
      await scheduleTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${dir}/schedule-full.png`, fullPage: true });
    }

    // Try clicking Timeline tab
    const timelineTab = page.locator('button:has-text("Timeline")');
    if (await timelineTab.isVisible()) {
      await timelineTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${dir}/timeline-full.png`, fullPage: true });
    }

    // Try clicking Calendar tab
    const calendarTab = page.locator('button:has-text("Calendar")');
    if (await calendarTab.isVisible()) {
      await calendarTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${dir}/calendar-full.png`, fullPage: true });
    }
  });
});
