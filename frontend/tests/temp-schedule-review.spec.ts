import { test } from '@playwright/test';

const PROJECT_ID = "67";
const baseUrl = "http://localhost:3000";

test('Capture schedule page - all tabs', async ({ page }) => {
  // Load auth state
  await page.goto(`${baseUrl}/${PROJECT_ID}/schedule`, {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Wait for page to be ready
  await page.waitForTimeout(2000);

  // Take screenshot of Grid view (default)
  await page.screenshot({
    path: '/Users/meganharrison/Documents/github/alleato-procore/frontend/tests/screenshots/schedule-grid-view.png',
    fullPage: true
  });

  // Click Board tab
  await page.click('text=Board');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: '/Users/meganharrison/Documents/github/alleato-procore/frontend/tests/screenshots/schedule-board-view.png',
    fullPage: true
  });

  // Click Schedule tab
  await page.click('text=Schedule');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: '/Users/meganharrison/Documents/github/alleato-procore/frontend/tests/screenshots/schedule-schedule-view.png',
    fullPage: true
  });

  // Click Timeline tab
  await page.click('text=Timeline');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: '/Users/meganharrison/Documents/github/alleato-procore/frontend/tests/screenshots/schedule-timeline-view.png',
    fullPage: true
  });

  // Click Calendar tab
  await page.click('text=Calendar');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: '/Users/meganharrison/Documents/github/alleato-procore/frontend/tests/screenshots/schedule-calendar-view.png',
    fullPage: true
  });
});
