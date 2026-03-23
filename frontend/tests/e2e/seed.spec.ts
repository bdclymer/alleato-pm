import { test, expect } from '@playwright/test';

test('seed', async ({ page }) => {
  await page.goto('http://localhost:3000/760/commitments/new?type=subcontract');
});
