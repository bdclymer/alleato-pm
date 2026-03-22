import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/user.json' });

test('bulk delete prime contracts', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('feedback-toolbar-settings', JSON.stringify({
      blockInteractions: false,
      reactEnabled: false,
      webhooksEnabled: false
    }));
  });

  await page.goto('http://localhost:3000/67/prime-contracts');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/gauntlet-bulk-delete-before.png' });

  // Find rows for both test contracts (Radix UI uses role="checkbox", not input[type="checkbox"])
  const rowA = page.locator('tr, [role="row"]').filter({ hasText: 'Gauntlet Bulk Test Contract A' });
  const rowB = page.locator('tr, [role="row"]').filter({ hasText: 'Gauntlet Bulk Test Contract B' });

  // Verify contracts exist
  await expect(rowA).toBeVisible({ timeout: 10000 });
  await expect(rowB).toBeVisible({ timeout: 10000 });

  // Click checkbox in row A (Radix UI checkbox has role="checkbox")
  const checkboxA = rowA.locator('[role="checkbox"]');
  await checkboxA.click();
  await page.waitForTimeout(500);

  // Click checkbox in row B
  const checkboxB = rowB.locator('[role="checkbox"]');
  await checkboxB.click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: '/tmp/gauntlet-bulk-delete-selected.png' });

  // The bulk delete button is a ghost icon button with a Trash2 SVG (class "lucide-trash-2")
  // It appears in the toolbar only when selectedIds.length > 0 (onBulkDelete becomes non-undefined)
  // Lucide renders SVGs with class "lucide lucide-trash-2"
  const trashButton = page.locator('button:not([disabled])').filter({
    has: page.locator('svg.lucide-trash-2, svg[class*="lucide-trash"]')
  });

  await expect(trashButton).toBeVisible({ timeout: 5000 });
  await trashButton.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: '/tmp/gauntlet-bulk-delete-dialog.png' });

  // Confirm in the AlertDialog that appears
  // The dialog has "Delete 2 Contracts" as the confirm button text
  const confirmDeleteBtn = page.locator('[role="alertdialog"]').getByRole('button').filter({ hasText: /Delete/ }).last();
  await expect(confirmDeleteBtn).toBeVisible({ timeout: 5000 });
  await confirmDeleteBtn.click();

  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/gauntlet-bulk-delete-after.png' });

  // Verify both are gone
  await expect(page.getByText('Gauntlet Bulk Test Contract A')).not.toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Gauntlet Bulk Test Contract B')).not.toBeVisible({ timeout: 5000 });
});
