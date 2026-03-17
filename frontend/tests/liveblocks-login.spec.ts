import { test, expect } from '@playwright/test';

test('seed', async ({ page }) => {
  await page.goto('https://liveblocks.io/dashboard');
  await page.waitForTimeout(3000);
});
