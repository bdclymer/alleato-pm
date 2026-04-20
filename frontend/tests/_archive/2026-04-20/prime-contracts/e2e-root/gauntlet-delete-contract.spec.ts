import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/user.json' });

test('delete single prime contract', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('feedback-toolbar-settings', JSON.stringify({
      blockInteractions: false,
      reactEnabled: false,
      webhooksEnabled: false
    }));
  });

  await page.goto('http://localhost:3000/67/prime-contracts');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/gauntlet-delete-contract-before.png' });

  // Find the row for "Gauntlet Test Contract EDITED" or "PC-GAUNTLET-001"
  const contractRow = page.locator('tr, [role="row"]').filter({ hasText: 'PC-GAUNTLET-001' }).or(
    page.locator('tr, [role="row"]').filter({ hasText: 'Gauntlet Test Contract EDITED' })
  ).first();
  await expect(contractRow).toBeVisible({ timeout: 10000 });

  // Find and click the row actions button (MoreVertical / three dots)
  // It might only appear on hover
  await contractRow.hover();
  await page.waitForTimeout(300);

  const moreBtn = contractRow.locator('button[aria-haspopup="menu"], button[aria-label*="action"], button[aria-label*="more"]').first();

  // If no explicit aria attr, look for the last button in the row (usually the action button)
  if (!await moreBtn.isVisible()) {
    const buttons = contractRow.locator('button');
    const count = await buttons.count();
    if (count > 0) {
      await buttons.last().click();
    }
  } else {
    await moreBtn.click();
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/gauntlet-delete-contract-menu.png' });

  // Click Delete in the dropdown menu
  await page.getByRole('menuitem', { name: /delete/i }).click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: '/tmp/gauntlet-delete-contract-dialog.png' });

  // Confirm in AlertDialog
  const confirmBtn = page.getByRole('button', { name: /delete|confirm|yes/i }).last();
  await confirmBtn.click();

  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/gauntlet-delete-contract-after.png' });

  // Verify contract is gone from the list
  await expect(page.getByText('PC-GAUNTLET-001')).not.toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Gauntlet Test Contract EDITED')).not.toBeVisible({ timeout: 5000 });

  // Check for success toast
  // (Toast may be transient; we verify the contract is gone as primary evidence)
});
