import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/user.json' });

test('delete SOV line item', async ({ page }) => {
  // Disable agentation overlay
  await page.addInitScript(() => {
    localStorage.setItem('feedback-toolbar-settings', JSON.stringify({
      blockInteractions: false,
      reactEnabled: false,
      webhooksEnabled: false
    }));
  });

  await page.goto('http://localhost:3000/67/prime-contracts/20c40a53-f2d7-4b22-a257-cc1b3a80efaa');
  await page.waitForLoadState('networkidle');

  // Screenshot before entering edit mode
  await page.screenshot({ path: '/tmp/gauntlet-delete-sov-before.png', fullPage: true });

  // In view mode, find the row containing "Gauntlet SOV Line Test 2" as text
  const sovRow = page.locator('tr, [role="row"]').filter({ hasText: 'Gauntlet SOV Line Test 2' });
  await expect(sovRow).toBeVisible({ timeout: 10000 });

  // The last button in view mode is MoreVertical (⋮) which calls onStartSovEdit
  const moreVerticalBtn = sovRow.locator('button').last();
  await moreVerticalBtn.click();

  // Wait for edit mode - Cancel/Save buttons appear in SOV header
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: '/tmp/gauntlet-delete-sov-edit-mode.png' });

  // STEP 1: Add a placeholder line item first.
  // The save guard requires at least 1 SOV item — so we need another item before deleting.
  // Find "Add Line Item" button (in edit mode) and click it.
  const addLineItemBtn = page.getByRole('button', { name: /Add Line Item/i }).first();
  await expect(addLineItemBtn).toBeVisible({ timeout: 5000 });
  await addLineItemBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/gauntlet-delete-sov-added-placeholder.png' });

  // STEP 2: Now delete the target row "Gauntlet SOV Line Test 2"
  // In edit mode the description is in an input field
  const targetRowInput = page.locator('input[value="Gauntlet SOV Line Test 2"]');
  await expect(targetRowInput).toBeVisible({ timeout: 5000 });

  // The row containing this input has the Remove button
  const targetRow = page.locator('tr, [role="row"]').filter({
    has: page.locator('input[value="Gauntlet SOV Line Test 2"]')
  });
  const removeBtn = targetRow.locator('button[aria-label*="Remove line item"]');
  await expect(removeBtn).toBeVisible({ timeout: 5000 });
  await removeBtn.click();

  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/gauntlet-delete-sov-row-removed.png' });

  // The input should be gone now
  await expect(page.locator('input[value="Gauntlet SOV Line Test 2"]')).not.toBeVisible({ timeout: 3000 });

  // STEP 3: Save to persist the deletion
  const saveBtn = page.getByRole('button', { name: 'Save' });
  await expect(saveBtn).toBeVisible({ timeout: 3000 });
  await saveBtn.click();

  // Wait for save to complete (Cancel/Save disappear)
  await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/gauntlet-delete-sov-after-save.png' });

  // Final verification: "Gauntlet SOV Line Test 2" should not appear in view mode
  await expect(page.getByText('Gauntlet SOV Line Test 2')).not.toBeVisible({ timeout: 5000 });
});
