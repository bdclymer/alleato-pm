import { test, expect } from '../../fixtures/index';
import { createTestProject } from '../../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

const TEST_PROJECT_ID = '118'; // Using the actual project ID from the budget tests

test.describe.skip('Budget Quick Wins - Phase 1', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page (auth state is already loaded by Playwright config)
    await page.goto(`/${TEST_PROJECT_ID}/budget`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Quick Filter Presets', () => {
    test('should display quick filter dropdown with all filter options', async ({ page }) => {
      // Find the Quick Filter button (look for button containing "All Items" initially)
      const quickFilterButton = page.getByRole('button', { name: /All Items/i });
      await expect(quickFilterButton).toBeVisible();

      // Click to open dropdown
      await quickFilterButton.click();

      // Verify all filter options are present
      await expect(page.getByRole('menuitem', { name: 'All Items' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /Over Budget/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /Under Budget/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /No Activity/i })).toBeVisible();

      // Verify color indicators
      const overBudgetItem = page.getByRole('menuitem', { name: /Over Budget/i });
      await expect(overBudgetItem.locator('span').first()).toHaveClass(/text-red-600/);

      const underBudgetItem = page.getByRole('menuitem', { name: /Under Budget/i });
      await expect(underBudgetItem.locator('span').first()).toHaveClass(/text-green-600/);

      const noActivityItem = page.getByRole('menuitem', { name: /No Activity/i });
      await expect(noActivityItem.locator('span').first()).toHaveClass(/text-gray-400/);
    });

    test('should apply "Over Budget" filter and show filtered results', async ({ page }) => {
      // Find Quick Filter button by text content (starts with "All Items")
      let quickFilterButton = page.getByRole('button', { name: /All Items/i });
      await quickFilterButton.click();

      // Select "Over Budget" filter
      await page.getByRole('menuitem', { name: /Over Budget/i }).click();
      await page.waitForTimeout(500); // Wait for filter to apply

      // Re-locate the button after text change
      quickFilterButton = page.getByRole('button', { name: /Over Budget/i });
      await expect(quickFilterButton).toBeVisible();

      // Verify localStorage persistence
      const filterValue = await page.evaluate((projectId) =>
        localStorage.getItem(`budget-quick-filter-${projectId}`), TEST_PROJECT_ID
      );
      expect(filterValue).toBe('over-budget');
    });

    test('should apply "Under Budget" filter', async ({ page }) => {
      let quickFilterButton = page.getByRole('button', { name: /All Items/i });
      await quickFilterButton.click();

      await page.getByRole('menuitem', { name: /Under Budget/i }).click();
      await page.waitForTimeout(500);

      quickFilterButton = page.getByRole('button', { name: /Under Budget/i });
      await expect(quickFilterButton).toBeVisible();

      const filterValue = await page.evaluate((projectId) =>
        localStorage.getItem(`budget-quick-filter-${projectId}`), TEST_PROJECT_ID
      );
      expect(filterValue).toBe('under-budget');
    });

    test('should apply "No Activity" filter', async ({ page }) => {
      let quickFilterButton = page.getByRole('button', { name: /All Items/i });
      await quickFilterButton.click();

      await page.getByRole('menuitem', { name: /No Activity/i }).click();
      await page.waitForTimeout(500);

      quickFilterButton = page.getByRole('button', { name: /No Activity/i });
      await expect(quickFilterButton).toBeVisible();

      const filterValue = await page.evaluate((projectId) =>
        localStorage.getItem(`budget-quick-filter-${projectId}`), TEST_PROJECT_ID
      );
      expect(filterValue).toBe('no-activity');
    });

    test('should persist filter selection across page reloads', async ({ page }) => {
      // Set filter
      let quickFilterButton = page.getByRole('button', { name: /All Items/i });
      await quickFilterButton.click();
      await page.getByRole('menuitem', { name: /Over Budget/i }).click();
      await page.waitForTimeout(500);

      quickFilterButton = page.getByRole('button', { name: /Over Budget/i });
      await expect(quickFilterButton).toBeVisible();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify filter is still applied
      const reloadedButton = page.getByRole('button', { name: /Over Budget/i });
      await expect(reloadedButton).toBeVisible();
    });

    test('should reset filter to "All Items"', async ({ page }) => {
      // Apply a filter first
      let quickFilterButton = page.getByRole('button', { name: /All Items/i });
      await quickFilterButton.click();
      await page.getByRole('menuitem', { name: /Over Budget/i }).click();
      await page.waitForTimeout(500);

      // Reset to "All Items"
      quickFilterButton = page.getByRole('button', { name: /Over Budget/i });
      await quickFilterButton.click();
      await page.getByRole('menuitem', { name: 'All Items' }).click();
      await page.waitForTimeout(500);

      quickFilterButton = page.getByRole('button', { name: /All Items/i });
      await expect(quickFilterButton).toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should refresh data with Ctrl+S (or Cmd+S)', async ({ page }) => {
      // Wait for initial load
      await page.waitForLoadState('networkidle');

      // Press Ctrl+S (or Cmd+S on Mac)
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+s' : 'Control+s');

      // Verify toast notification
      await expect(page.getByText(/Budget data refreshed/i)).toBeVisible({ timeout: 3000 });
    });

    test('should navigate to budget setup with Ctrl+E (or Cmd+E)', async ({ page }) => {
      // Press Ctrl+E (or Cmd+E on Mac)
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+e' : 'Control+e');

      // Verify navigation
      await expect(page).toHaveURL(new RegExp(`/${TEST_PROJECT_ID}/budget/setup`));
    });

    test('should close modals with Escape key', async ({ page }) => {
      // Open a modal (e.g., edit modal if available, or skip if no modals are open)
      // This test would need to be expanded based on which modals are available

      // For now, just verify the escape handler exists
      await page.keyboard.press('Escape');

      // If there are no modals open, this should just not cause errors
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    });

    test('should not navigate when budget is locked and Ctrl+E is pressed', async ({ page }) => {
      // First, lock the budget
      const lockButton = page.getByRole('button', { name: /Lock Budget/i });

      // Check if lock button exists (budget might already be locked)
      const lockButtonCount = await lockButton.count();
      if (lockButtonCount > 0) {
        await lockButton.click();

        // Confirm lock in dialog if needed
        const confirmButton = page.getByRole('button', { name: /Confirm|Lock/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await page.waitForTimeout(1000); // Wait for lock to apply
      }

      // Try to navigate with Ctrl+E
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+e' : 'Control+e');

      // Should show error toast instead of navigating
      await expect(page.getByText(/Budget is locked/i)).toBeVisible({ timeout: 3000 });

      // Should still be on budget page
      await expect(page).toHaveURL(new RegExp(`/${TEST_PROJECT_ID}/budget`));
    });
  });

  test.describe('Delete Confirmation Dialog', () => {
    test('should show delete confirmation when deleting selected items', async ({ page }) => {
      // Select at least one line item (if available)
      const checkboxes = page.getByRole('checkbox');
      const checkboxCount = await checkboxes.count();

      if (checkboxCount > 1) { // More than just the "select all" checkbox
        // Click the first item checkbox (skip the header checkbox)
        await checkboxes.nth(1).click();

        // Click delete button
        const deleteButton = page.getByRole('button', { name: /Delete Selected/i });
        await expect(deleteButton).toBeVisible();
        await deleteButton.click();

        // Verify confirmation dialog appears
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText(/Delete Line Items/i)).toBeVisible();
        await expect(dialog.getByText(/This action cannot be undone/i)).toBeVisible();

        // Verify dialog has cancel and delete buttons
        await expect(dialog.getByRole('button', { name: /Cancel/i })).toBeVisible();
        await expect(dialog.getByRole('button', { name: /Delete/i })).toBeVisible();

        // Close dialog without deleting
        await dialog.getByRole('button', { name: /Cancel/i }).click();
        await expect(dialog).not.toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should not show delete button when budget is locked', async ({ page }) => {
      // Lock the budget first
      const lockButton = page.getByRole('button', { name: /Lock Budget/i });
      const lockButtonCount = await lockButton.count();

      if (lockButtonCount > 0) {
        await lockButton.click();

        // Confirm lock if needed
        const confirmButton = page.getByRole('button', { name: /Confirm|Lock/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await page.waitForTimeout(1000);
      }

      // Try to select an item
      const checkboxes = page.getByRole('checkbox');
      if (await checkboxes.count() > 1) {
        await checkboxes.nth(1).click();

        // Delete button should be disabled
        const deleteButton = page.getByRole('button', { name: /Delete Selected/i });
        if (await deleteButton.isVisible()) {
          await expect(deleteButton).toBeDisabled();
        }
      }
    });
  });

  test.describe('Integration Tests', () => {
    test('should apply filter and use keyboard shortcuts together', async ({ page }) => {
      // Apply Over Budget filter
      let quickFilterButton = page.getByRole('button', { name: /All Items/i });
      await quickFilterButton.click();
      await page.getByRole('menuitem', { name: /Over Budget/i }).click();
      await page.waitForTimeout(500);

      // Refresh with Ctrl+S
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+s' : 'Control+s');

      // Verify filter persists after refresh
      await expect(page.getByRole('button', { name: /Over Budget/i })).toBeVisible();
      await expect(page.getByText(/Budget data refreshed/i)).toBeVisible();
    });
  });
});
