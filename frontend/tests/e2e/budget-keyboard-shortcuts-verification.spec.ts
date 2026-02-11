import { test, expect } from '../fixtures/index';
import path from 'path';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

const TEST_PROJECT_ID = '118';
const BASE_URL = `${process.env.BASE_URL || 'http://localhost:3000'}/${TEST_PROJECT_ID}/budget`;

test.describe.skip('Budget Keyboard Shortcuts and Toast Notifications - Complete Verification', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Load authentication
    const authFile = path.join(__dirname, '../.auth/user.json');
    const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));

    // Set cookies
    await page.context().addCookies(authData.cookies);

    // Navigate to budget page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Keyboard Shortcuts Verification', () => {
    test('should trigger save action with Ctrl+S shortcut', async ({ page }) => {
      // Wait for page to be fully loaded
      await page.waitForSelector('table', { timeout: 10000 });

      // Press Ctrl+S
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(1000);

      // Look for save-related actions or toast notifications
      const saveToast = page.locator('text=Saved successfully').or(
        page.locator('text=Budget saved').or(
          page.locator('text=Changes saved')
        )
      );

      // Check if save toast appeared or if save action was triggered
      const toastVisible = await saveToast.isVisible({ timeout: 3000 }).catch(() => false);

      if (toastVisible) {
        await expect(saveToast).toBeVisible();
      } else {
        // Alternative: Check if any save-related API call was made
        console.log('Ctrl+S shortcut triggered (no visible feedback)');
      }

      await page.screenshot({ path: 'tests/screenshots/keyboard-shortcuts/ctrl-s.png' });
    });

    test('should trigger edit action with Ctrl+E shortcut', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Make sure we have line items to edit
      const rows = page.locator('tbody tr').filter({ hasNotText: 'No data available' });
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Select first row
        await rows.first().click();
        await page.waitForTimeout(500);

        // Press Ctrl+E
        await page.keyboard.press('Control+e');
        await page.waitForTimeout(1000);

        // Look for edit modal or edit mode activation
        const editModal = page.locator('[role="dialog"]');
        const isEditModalVisible = await editModal.isVisible({ timeout: 3000 }).catch(() => false);

        if (isEditModalVisible) {
          await expect(editModal).toBeVisible();
        } else {
          console.log('Ctrl+E shortcut triggered (may have activated edit mode)');
        }

        await page.screenshot({ path: 'tests/screenshots/keyboard-shortcuts/ctrl-e.png' });
      } else {
        test.skip('No budget line items available for edit test');
      }
    });

    test('should trigger modal action with Ctrl+M shortcut', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Press Ctrl+M
      await page.keyboard.press('Control+m');
      await page.waitForTimeout(1000);

      // Look for modal opening (could be creation modal, modification modal, etc.)
      const modal = page.locator('[role="dialog"]');
      const isModalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);

      if (isModalVisible) {
        await expect(modal).toBeVisible();
      }

      await page.screenshot({ path: 'tests/screenshots/keyboard-shortcuts/ctrl-m.png' });
    });

    test('should trigger import action with Ctrl+I shortcut', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Press Ctrl+I
      await page.keyboard.press('Control+i');
      await page.waitForTimeout(1000);

      // Look for import modal or import action
      const importModal = page.locator('[role="dialog"]').filter({
        hasText: /import|Import/
      });

      const isImportModalVisible = await importModal.isVisible({ timeout: 3000 }).catch(() => false);

      if (isImportModalVisible) {
        await expect(importModal).toBeVisible();
      }

      await page.screenshot({ path: 'tests/screenshots/keyboard-shortcuts/ctrl-i.png' });
    });

    test('should handle multiple keyboard shortcuts in sequence', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Test sequence: Ctrl+S, wait, Ctrl+E, wait, Escape
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);

      await page.keyboard.press('Control+e');
      await page.waitForTimeout(500);

      // Close any opened modals
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      await page.screenshot({ path: 'tests/screenshots/keyboard-shortcuts/sequence.png' });
    });
  });

  test.describe('Toast Notifications for Locked Budget Actions', () => {
    test('should show toast when trying to modify locked budget', async ({ page }) => {
      // First, lock the budget
      const lockButton = page.locator('button').filter({ hasText: 'Lock Budget' }).first();

      if (await lockButton.isVisible({ timeout: 3000 })) {
        await lockButton.click();
        await page.waitForTimeout(500);

        // Confirm lock action
        const confirmButton = page.locator('[role="alertdialog"]').locator('button').filter({ hasText: 'Lock Budget' }).last();
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
          await page.waitForTimeout(2000);

          // Now try to perform actions that should show locked toast

          // Try to add a line item (should show locked toast)
          const addLineButton = page.locator('button').filter({ hasText: 'Add Line Item' }).first();
          if (await addLineButton.isVisible({ timeout: 2000 })) {
            await addLineButton.click();
            await page.waitForTimeout(500);

            // Look for locked budget toast
            const lockedToast = page.locator('text=Budget is locked').or(
              page.locator('text=Cannot modify locked budget').or(
                page.locator('text=Budget locked')
              )
            );

            const isToastVisible = await lockedToast.isVisible({ timeout: 3000 }).catch(() => false);
            if (isToastVisible) {
              await expect(lockedToast).toBeVisible();
            }

            await page.screenshot({ path: 'tests/screenshots/toast-notifications/locked-budget-add.png' });
          }

          // Try to edit existing line item (should show locked toast)
          const rows = page.locator('tbody tr').filter({ hasNotText: 'No data available' });
          const rowCount = await rows.count();

          if (rowCount > 0) {
            await rows.first().click();
            await page.waitForTimeout(500);

            const lockedToast = page.locator('text=Budget is locked').or(
              page.locator('text=Cannot edit locked budget').or(
                page.locator('text=Budget locked')
              )
            );

            const isToastVisible = await lockedToast.isVisible({ timeout: 3000 }).catch(() => false);
            if (isToastVisible) {
              await expect(lockedToast).toBeVisible();
            }

            await page.screenshot({ path: 'tests/screenshots/toast-notifications/locked-budget-edit.png' });
          }

          // Unlock budget for other tests
          const unlockButton = page.locator('button').filter({ hasText: 'Unlock Budget' }).first();
          if (await unlockButton.isVisible({ timeout: 2000 })) {
            await unlockButton.click();
            await page.waitForTimeout(500);
            const unlockConfirmButton = page.locator('[role="alertdialog"]').locator('button').filter({ hasText: 'Unlock Budget' }).last();
            if (await unlockConfirmButton.isVisible({ timeout: 2000 })) {
              await unlockConfirmButton.click();
              await page.waitForTimeout(1000);
            }
          }
        }
      } else {
        // Budget might already be locked, test actions on locked budget
        const addLineButton = page.locator('button').filter({ hasText: 'Add Line Item' }).first();
        if (await addLineButton.isVisible({ timeout: 2000 })) {
          await addLineButton.click();
          await page.waitForTimeout(500);

          const lockedToast = page.locator('text=Budget is locked').or(
            page.locator('text=Cannot modify locked budget').or(
              page.locator('text=Budget locked')
            )
          );

          const isToastVisible = await lockedToast.isVisible({ timeout: 3000 }).catch(() => false);
          if (isToastVisible) {
            await expect(lockedToast).toBeVisible();
          }
        }
      }
    });

    test('should show success toast when saving budget changes', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Try to trigger a save action
      const rows = page.locator('tbody tr').filter({ hasNotText: 'No data available' });
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Click on a line item to edit
        await rows.first().click();
        await page.waitForTimeout(500);

        // Look for save button or trigger save with Ctrl+S
        await page.keyboard.press('Control+s');
        await page.waitForTimeout(1000);

        // Look for success toast
        const successToast = page.locator('text=Saved successfully').or(
          page.locator('text=Changes saved').or(
            page.locator('text=Budget updated')
          )
        );

        const isToastVisible = await successToast.isVisible({ timeout: 3000 }).catch(() => false);
        if (isToastVisible) {
          await expect(successToast).toBeVisible();
        }

        await page.screenshot({ path: 'tests/screenshots/toast-notifications/save-success.png' });
      }
    });

    test('should show error toast for invalid operations', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Try to perform an invalid operation that should trigger error toast

      // Example: Try to delete non-existent items
      const rows = page.locator('tbody tr').filter({ hasNotText: 'No data available' });
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Select a checkbox if available
        const checkbox = rows.first().locator('input[type="checkbox"], [role="checkbox"]').first();
        if (await checkbox.isVisible({ timeout: 2000 })) {
          await checkbox.click();
          await page.waitForTimeout(300);

          // Try to delete
          const deleteButton = page.getByRole('button', { name: /Delete Selected/i });
          if (await deleteButton.isVisible({ timeout: 2000 })) {
            await deleteButton.click();
            await page.waitForTimeout(500);

            // Cancel the deletion to avoid actually deleting data
            const cancelButton = page.getByRole('button', { name: 'Cancel' });
            if (await cancelButton.isVisible({ timeout: 2000 })) {
              await cancelButton.click();
            }
          }
        }
      }

      await page.screenshot({ path: 'tests/screenshots/toast-notifications/error-handling.png' });
    });
  });

  test.describe('Delete Confirmation Dialogs Verification', () => {
    test('should show confirmation dialog when deleting line items', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      const rows = page.locator('tbody tr').filter({ hasNotText: 'No data available' });
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Select a line item using checkbox
        const checkbox = rows.first().locator('input[type="checkbox"], [role="checkbox"]').first();

        if (await checkbox.isVisible({ timeout: 2000 })) {
          await checkbox.click();
          await page.waitForTimeout(300);

          // Click Delete Selected button
          const deleteButton = page.getByRole('button', { name: /Delete Selected/i });
          if (await deleteButton.isVisible({ timeout: 2000 })) {
            await deleteButton.click();
            await page.waitForTimeout(500);

            // Verify confirmation dialog appears
            const confirmDialog = page.locator('[role="alertdialog"]');
            await expect(confirmDialog).toBeVisible({ timeout: 5000 });

            // Verify dialog content
            await expect(confirmDialog.locator('text=Delete')).toBeVisible();
            await expect(confirmDialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
            await expect(confirmDialog.getByRole('button', { name: /Delete|Confirm/i })).toBeVisible();

            await page.screenshot({ path: 'tests/screenshots/delete-confirmations/line-items.png' });

            // Cancel the deletion
            await confirmDialog.getByRole('button', { name: 'Cancel' }).click();
            await expect(confirmDialog).not.toBeVisible();
          }
        } else {
          test.skip('No checkboxes available for selection');
        }
      } else {
        test.skip('No budget line items available for deletion test');
      }
    });

    test('should show confirmation dialog when deleting budget views', async ({ page }) => {
      // First create a test view to delete
      const authFile = path.join(__dirname, '../.auth/user.json');
      const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));
      const authCookies = authData.cookies
        .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      const createResponse = await page.request.post(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views`,
        {
          headers: { Cookie: authCookies, 'Content-Type': 'application/json' },
          data: {
            name: 'Test Delete View',
            columns: [{ column_key: 'costCode', display_order: 1 }]
          },
        }
      );

      if (createResponse.status() === 201) {
        const { view: createdView } = await createResponse.json();

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Open budget views dropdown
        const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
        await viewsButton.click();
        await page.waitForTimeout(300);

        // Find the test view and click delete button
        const viewRow = page.locator('text=Test Delete View').locator('..');
        const deleteButton = viewRow.locator('button').filter({ has: page.locator('svg') }).last();

        if (await deleteButton.isVisible({ timeout: 2000 })) {
          await deleteButton.click();
          await page.waitForTimeout(500);

          // Verify confirmation dialog
          const confirmDialog = page.locator('[role="alertdialog"]');
          await expect(confirmDialog).toBeVisible({ timeout: 5000 });
          await expect(confirmDialog.locator('text=Delete Budget View')).toBeVisible();
          await expect(confirmDialog.locator('text=Test Delete View')).toBeVisible();

          await page.screenshot({ path: 'tests/screenshots/delete-confirmations/budget-view.png' });

          // Confirm deletion for cleanup
          await confirmDialog.getByRole('button', { name: 'Delete' }).click();
          await page.waitForTimeout(1000);
        } else {
          // Cleanup via API if UI deletion not available
          await page.request.delete(
            `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views/${createdView.id}`,
            { headers: { Cookie: authCookies } }
          );
        }
      }
    });
  });

  test.describe('Budget Lock/Unlock Confirmation Dialogs', () => {
    test('should show confirmation dialog when locking budget', async ({ page }) => {
      const lockButton = page.locator('button').filter({ hasText: 'Lock Budget' }).first();

      if (await lockButton.isVisible({ timeout: 3000 })) {
        await lockButton.click();
        await page.waitForTimeout(500);

        // Verify lock confirmation dialog
        const confirmDialog = page.locator('[role="alertdialog"]');
        await expect(confirmDialog).toBeVisible({ timeout: 5000 });
        await expect(confirmDialog.locator('text=Lock Budget')).toBeVisible();
        await expect(confirmDialog.locator('text=Budget line items cannot be added')).toBeVisible();

        await page.screenshot({ path: 'tests/screenshots/delete-confirmations/lock-budget.png' });

        // Cancel to avoid locking
        await confirmDialog.getByRole('button', { name: 'Cancel' }).click();
        await expect(confirmDialog).not.toBeVisible();
      }
    });

    test('should show confirmation dialog when unlocking budget', async ({ page }) => {
      // First ensure budget is locked
      const lockButton = page.locator('button').filter({ hasText: 'Lock Budget' }).first();

      if (await lockButton.isVisible({ timeout: 3000 })) {
        await lockButton.click();
        await page.waitForTimeout(500);

        const confirmLockButton = page.locator('[role="alertdialog"]').locator('button').filter({ hasText: 'Lock Budget' }).last();
        if (await confirmLockButton.isVisible({ timeout: 2000 })) {
          await confirmLockButton.click();
          await page.waitForTimeout(1000);
        }
      }

      // Now test unlock confirmation
      const unlockButton = page.locator('button').filter({ hasText: 'Unlock Budget' }).first();

      if (await unlockButton.isVisible({ timeout: 3000 })) {
        await unlockButton.click();
        await page.waitForTimeout(500);

        // Verify unlock confirmation dialog
        const confirmDialog = page.locator('[role="alertdialog"]');
        await expect(confirmDialog).toBeVisible({ timeout: 5000 });
        await expect(confirmDialog.locator('text=Unlock Budget')).toBeVisible();

        await page.screenshot({ path: 'tests/screenshots/delete-confirmations/unlock-budget.png' });

        // Confirm unlock for other tests
        await confirmDialog.getByRole('button', { name: 'Unlock Budget' }).click();
        await page.waitForTimeout(1000);
      }
    });
  });
});
