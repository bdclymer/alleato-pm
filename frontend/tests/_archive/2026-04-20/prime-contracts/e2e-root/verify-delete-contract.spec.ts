import { test, expect } from '@playwright/test';
test.use({ storageState: 'tests/.auth/user.json' });
test('verify contract deletion', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('feedback-toolbar-settings', JSON.stringify({ blockInteractions: false, reactEnabled: false, webhooksEnabled: false }));
  });
  await page.goto('http://localhost:3000/67/prime-contracts');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/verify-delete-contract.png' });
  await expect(page.getByText('PC-GAUNTLET-001')).not.toBeVisible();
  await expect(page.getByText('Gauntlet Test Contract EDITED')).not.toBeVisible();
});
