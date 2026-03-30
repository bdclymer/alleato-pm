import { test, expect } from '@playwright/test';

test('seed', async ({ page }) => {
  await page.goto('http://localhost:3001/761/change-events');
});
