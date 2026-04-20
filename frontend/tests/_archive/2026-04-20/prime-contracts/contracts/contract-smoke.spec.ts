import { test, expect } from '@playwright/test';

const projectId = 24105;

test.describe('Contract creation smoke', () => {
  test('creates a prime contract via the UI', async ({ page }) => {
    const contractNumber = `PC-${Date.now()}`;
    const title = `Automated Prime Contract ${new Date().toISOString()}`;

    await page.goto(`/${projectId}/contracts/new`);
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('PC-001').fill(contractNumber);
    await page.getByPlaceholder('Main Building Construction').fill(title);

    const ownerCombobox = page.locator('label:has-text("Contract Owner") + div button[role="combobox"]').first();
    await ownerCombobox.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.getByPlaceholder('0.00').first().fill('2500000');

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/contracts') && res.request().method() === 'POST'),
      page.getByRole('button', { name: /create contract/i }).click(),
    ]);
    expect(response.ok()).toBeTruthy();

    await page.waitForTimeout(2000);
    await page.goto(`/${projectId}/contracts`);
    await expect(page.locator('table').first()).toContainText(contractNumber);

    await page.screenshot({
      path: 'frontend/tests/screenshots/contract-smoke.png',
      fullPage: true,
    });
  });
});
