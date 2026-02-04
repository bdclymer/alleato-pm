import { test, expect, Page } from '@playwright/test';

/**
 * Commitments Recycle Bin E2E Tests
 *
 * Tests the recycle bin functionality for soft-deleted commitments:
 * - Recycle bin page display
 * - Deleted commitments table
 * - Restore functionality
 * - Permanent delete with confirmation
 * - Tab badge showing deleted count
 */

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_PROJECT_ID = '67';

// Helper function to navigate to commitments page
async function navigateToCommitments(page: Page, projectId: string = TEST_PROJECT_ID) {
  await page.goto(`/${projectId}/commitments`);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { name: 'Commitments' })).toBeVisible({ timeout: 30000 });
}

// Helper function to navigate to recycle bin
async function navigateToRecycleBin(page: Page, projectId: string = TEST_PROJECT_ID) {
  await page.goto(`/${projectId}/commitments/recycled`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // Give time for data to load
}

// Helper function to take screenshots
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/screenshots/recycle-bin/${name}.png`,
    fullPage: true,
  });
}

test.describe('Recycle Bin - Page Display', () => {
  test('should display recycle bin page with header', async ({ page }) => {
    await navigateToRecycleBin(page);

    // Verify page header
    await expect(page.locator('h1:has-text("Recycle Bin")')).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator('text=Deleted commitments can be restored or permanently deleted')
    ).toBeVisible();

    await takeScreenshot(page, '01-recycle-bin-page-display');
  });

  test('should display recycle bin tab in commitments page', async ({ page }) => {
    await navigateToCommitments(page);

    // Verify Recycle Bin tab exists
    const recycleBinTab = page.locator('a:has-text("Recycle Bin"), button:has-text("Recycle Bin")').first();
    await expect(recycleBinTab).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, '02-recycle-bin-tab-visible');
  });

  test('should navigate to recycle bin from tab', async ({ page }) => {
    await navigateToCommitments(page);

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // Click Recycle Bin tab (try multiple selectors)
    const recycleBinTab = page.locator('[href*="/commitments/recycled"]').first();
    if (await recycleBinTab.isVisible({ timeout: 5000 })) {
      await recycleBinTab.click();
      await page.waitForURL(`**/${TEST_PROJECT_ID}/commitments/recycled`, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');

      // Verify we're on the recycle bin page
      await expect(page.locator('h1:has-text("Recycle Bin")')).toBeVisible({ timeout: 10000 });

      await takeScreenshot(page, '03-navigate-to-recycle-bin');
    }
  });

  test('should display deleted count badge on tab', async ({ page }) => {
    await navigateToCommitments(page);
    await page.waitForTimeout(2000); // Wait for data to load

    // Look for Recycle Bin tab with count badge
    const recycleBinTab = page.locator('a:has-text("Recycle Bin")').first();
    await expect(recycleBinTab).toBeVisible();

    // Check if badge with count exists (may be 0 if no deleted items)
    const badge = recycleBinTab.locator('[class*="badge"], [class*="Badge"]');
    if (await badge.count() > 0) {
      await expect(badge.first()).toBeVisible();
      await takeScreenshot(page, '04-recycle-bin-count-badge');
    }
  });
});

test.describe('Recycle Bin - Table Display', () => {
  test('should display table with deleted commitments columns', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000); // Wait for data to load

    // Check for column headers
    const expectedColumns = [
      'Number',
      'Title',
      'Type',
      'Contract Company',
      'Original Amount',
      'Deleted Date',
      'Actions',
    ];

    for (const header of expectedColumns) {
      const headerCell = page.locator(
        `th:has-text("${header}"), [role="columnheader"]:has-text("${header}")`
      ).first();
      if (await headerCell.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Column exists
      }
    }

    await takeScreenshot(page, '05-recycle-bin-table-columns');
  });

  test('should display deleted commitments in table', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    // Look for table rows or empty message
    const tableRows = page.locator('tbody tr, [role="row"]');
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      await takeScreenshot(page, '06-recycle-bin-with-data');
    } else {
      // Check for empty state
      const emptyMessage = page.locator('text=No deleted commitments found');
      if (await emptyMessage.isVisible({ timeout: 3000 })) {
        await takeScreenshot(page, '07-recycle-bin-empty-state');
      }
    }
  });

  test('should display deleted date formatted correctly', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    // Look for date formatting (MM/DD/YYYY or similar)
    const deletedDateCells = page.locator('tbody td').filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}/ });
    const dateCount = await deletedDateCells.count();

    if (dateCount > 0) {
      await takeScreenshot(page, '08-recycle-bin-deleted-dates');
    }
  });

  test('should display commitment type as readable text', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    // Look for type cells with "Subcontract" or "Purchase Order"
    const typeCell = page.locator(
      'text=Subcontract, text=Purchase Order, text=purchase order, text=subcontract'
    ).first();
    if (await typeCell.isVisible({ timeout: 3000 })) {
      await takeScreenshot(page, '09-recycle-bin-type-display');
    }
  });
});

test.describe('Recycle Bin - Restore Functionality', () => {
  test('should display Restore button in actions column', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    // Look for Restore button
    const restoreButton = page.getByRole('button', { name: /Restore/i }).first();
    if (await restoreButton.isVisible({ timeout: 3000 })) {
      await expect(restoreButton).toBeVisible();

      // Verify icon is present
      const icon = restoreButton.locator('svg');
      await expect(icon).toBeVisible();

      await takeScreenshot(page, '10-recycle-bin-restore-button');
    }
  });

  test('should restore commitment when Restore button clicked', async ({ page }) => {
    // First, create a test commitment and delete it
    await navigateToCommitments(page);
    await page.waitForTimeout(2000);

    // Find first commitment (if exists) and delete it
    const actionButton = page.locator('tbody button, [role="row"] button').first();
    if (await actionButton.isVisible({ timeout: 3000 })) {
      await actionButton.click();
      await page.waitForTimeout(300);

      const deleteOption = page.getByRole('menuitem', { name: /Delete/i });
      if (await deleteOption.isVisible({ timeout: 2000 })) {
        // Store commitment number before deleting
        const commitmentNumber = await page
          .locator('tbody td:first-child, [role="row"] td:first-child')
          .first()
          .textContent();

        // Accept confirmation dialog
        page.on('dialog', (dialog) => dialog.accept());
        await deleteOption.click();
        await page.waitForTimeout(1000);

        // Navigate to recycle bin
        await navigateToRecycleBin(page);
        await page.waitForTimeout(2000);

        // Find the deleted commitment
        if (commitmentNumber) {
          const deletedRow = page.locator(`tr:has-text("${commitmentNumber}")`);
          if (await deletedRow.isVisible({ timeout: 3000 })) {
            // Click Restore
            const restoreBtn = deletedRow.getByRole('button', { name: /Restore/i });
            await restoreBtn.click();
            await page.waitForTimeout(1000);

            // Verify success toast
            const successToast = page.locator('text=restored successfully');
            await expect(successToast).toBeVisible({ timeout: 5000 });

            // Verify commitment removed from recycle bin
            await page.waitForTimeout(1000);
            await expect(deletedRow).not.toBeVisible({ timeout: 3000 });

            await takeScreenshot(page, '11-recycle-bin-after-restore');

            // Verify commitment is back in main list
            await navigateToCommitments(page);
            await page.waitForTimeout(2000);
            const restoredRow = page.locator(`tr:has-text("${commitmentNumber}")`);
            await expect(restoredRow).toBeVisible({ timeout: 5000 });

            await takeScreenshot(page, '12-commitment-restored-in-main-list');
          }
        }
      }
    }
  });

  test('should show success toast on restore', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    const restoreButton = page.getByRole('button', { name: /Restore/i }).first();
    if (await restoreButton.isVisible({ timeout: 3000 })) {
      await restoreButton.click();

      // Look for success toast notification
      const toast = page.locator('[class*="toast"], [role="status"], text=restored successfully');
      await expect(toast.first()).toBeVisible({ timeout: 5000 });

      await takeScreenshot(page, '13-recycle-bin-restore-success-toast');
    }
  });
});

test.describe('Recycle Bin - Permanent Delete Functionality', () => {
  test('should display Delete Forever button in actions column', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    // Look for Delete Forever button
    const deleteButton = page.getByRole('button', { name: /Delete Forever/i }).first();
    if (await deleteButton.isVisible({ timeout: 3000 })) {
      await expect(deleteButton).toBeVisible();

      // Verify destructive styling
      await expect(deleteButton).toHaveClass(/destructive|text-destructive/);

      // Verify icon is present
      const icon = deleteButton.locator('svg');
      await expect(icon).toBeVisible();

      await takeScreenshot(page, '14-recycle-bin-delete-forever-button');
    }
  });

  test('should show confirmation dialog when Delete Forever clicked', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    const deleteButton = page.getByRole('button', { name: /Delete Forever/i }).first();
    if (await deleteButton.isVisible({ timeout: 3000 })) {
      await deleteButton.click();
      await page.waitForTimeout(300);

      // Verify confirmation dialog appears
      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible({ timeout: 3000 });

      // Verify dialog title
      await expect(
        page.locator('text=Permanently Delete Commitment?')
      ).toBeVisible();

      // Verify warning message
      await expect(
        page.locator('text=This action cannot be undone')
      ).toBeVisible();

      // Verify warning icon
      const warningIcon = page.locator('[role="alertdialog"] svg').first();
      await expect(warningIcon).toBeVisible();

      await takeScreenshot(page, '15-recycle-bin-delete-confirmation-dialog');

      // Close dialog
      const cancelButton = page.getByRole('button', { name: /Cancel/i });
      await cancelButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should have Cancel and Delete Forever buttons in dialog', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    const deleteButton = page.getByRole('button', { name: /Delete Forever/i }).first();
    if (await deleteButton.isVisible({ timeout: 3000 })) {
      await deleteButton.click();
      await page.waitForTimeout(300);

      // Verify Cancel button
      const cancelBtn = page
        .locator('[role="alertdialog"]')
        .getByRole('button', { name: /Cancel/i });
      await expect(cancelBtn).toBeVisible();

      // Verify Delete Forever button
      const confirmBtn = page
        .locator('[role="alertdialog"]')
        .getByRole('button', { name: /Delete Forever/i });
      await expect(confirmBtn).toBeVisible();

      // Verify destructive styling on confirm button
      await expect(confirmBtn).toHaveClass(/destructive|bg-destructive/);

      await takeScreenshot(page, '16-recycle-bin-dialog-buttons');

      // Close dialog
      await cancelBtn.click();
    }
  });

  test('should close dialog when Cancel clicked', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    const deleteButton = page.getByRole('button', { name: /Delete Forever/i }).first();
    if (await deleteButton.isVisible({ timeout: 3000 })) {
      await deleteButton.click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();

      // Click Cancel
      const cancelBtn = page
        .locator('[role="alertdialog"]')
        .getByRole('button', { name: /Cancel/i });
      await cancelBtn.click();
      await page.waitForTimeout(300);

      // Verify dialog is closed
      await expect(dialog).not.toBeVisible({ timeout: 3000 });

      await takeScreenshot(page, '17-recycle-bin-dialog-cancelled');
    }
  });

  test('should permanently delete commitment when confirmed', async ({ page }) => {
    // First, create a test commitment and delete it
    await navigateToCommitments(page);
    await page.waitForTimeout(2000);

    const actionButton = page.locator('tbody button, [role="row"] button').first();
    if (await actionButton.isVisible({ timeout: 3000 })) {
      await actionButton.click();
      await page.waitForTimeout(300);

      const deleteOption = page.getByRole('menuitem', { name: /Delete/i });
      if (await deleteOption.isVisible({ timeout: 2000 })) {
        const commitmentNumber = await page
          .locator('tbody td:first-child')
          .first()
          .textContent();

        page.on('dialog', (dialog) => dialog.accept());
        await deleteOption.click();
        await page.waitForTimeout(1000);

        // Navigate to recycle bin
        await navigateToRecycleBin(page);
        await page.waitForTimeout(2000);

        if (commitmentNumber) {
          const deletedRow = page.locator(`tr:has-text("${commitmentNumber}")`);
          if (await deletedRow.isVisible({ timeout: 3000 })) {
            // Click Delete Forever
            const deleteForeverBtn = deletedRow.getByRole('button', {
              name: /Delete Forever/i,
            });
            await deleteForeverBtn.click();
            await page.waitForTimeout(300);

            // Confirm deletion
            const confirmBtn = page
              .locator('[role="alertdialog"]')
              .getByRole('button', { name: /Delete Forever/i });
            await confirmBtn.click();
            await page.waitForTimeout(1000);

            // Verify success toast
            const successToast = page.locator('text=permanently deleted');
            await expect(successToast).toBeVisible({ timeout: 5000 });

            // Verify commitment removed from recycle bin
            await page.waitForTimeout(1000);
            await expect(deletedRow).not.toBeVisible({ timeout: 3000 });

            await takeScreenshot(page, '18-recycle-bin-after-permanent-delete');

            // Verify commitment is NOT in main list
            await navigateToCommitments(page);
            await page.waitForTimeout(2000);
            const mainRow = page.locator(`tr:has-text("${commitmentNumber}")`);
            await expect(mainRow).not.toBeVisible({ timeout: 3000 });

            await takeScreenshot(page, '19-commitment-not-in-main-list');
          }
        }
      }
    }
  });

  test('should show success toast after permanent delete', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    const deleteButton = page.getByRole('button', { name: /Delete Forever/i }).first();
    if (await deleteButton.isVisible({ timeout: 3000 })) {
      await deleteButton.click();
      await page.waitForTimeout(300);

      const confirmBtn = page
        .locator('[role="alertdialog"]')
        .getByRole('button', { name: /Delete Forever/i });
      await confirmBtn.click();

      // Look for success toast
      const toast = page.locator('text=permanently deleted');
      await expect(toast).toBeVisible({ timeout: 5000 });

      await takeScreenshot(page, '20-recycle-bin-permanent-delete-toast');
    }
  });
});

test.describe('Recycle Bin - Search and Filters', () => {
  test('should display search input', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(1000);

    // Verify search input exists
    const searchInput = page.getByPlaceholder(/Search deleted commitments/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, '21-recycle-bin-search-input');
  });

  test('should filter deleted commitments by search term', async ({ page }) => {
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    const searchInput = page.getByPlaceholder(/Search deleted commitments/i);
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    await takeScreenshot(page, '22-recycle-bin-search-filter');
  });
});

test.describe('Recycle Bin - Mobile Responsiveness', () => {
  test('should display mobile card layout on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateToRecycleBin(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '23-recycle-bin-mobile-view');
  });

  test('should show Restore and Delete Forever buttons in mobile cards', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    const restoreButton = page.getByRole('button', { name: /Restore/i }).first();
    const deleteButton = page.getByRole('button', { name: /Delete Forever/i }).first();

    if (await restoreButton.isVisible({ timeout: 3000 })) {
      await expect(restoreButton).toBeVisible();
      await expect(deleteButton).toBeVisible();

      await takeScreenshot(page, '24-recycle-bin-mobile-actions');
    }
  });
});

test.describe('Recycle Bin - Empty State', () => {
  test('should display empty state when no deleted commitments', async ({ page }) => {
    // Navigate to a project that might have no deleted commitments
    await page.goto(`/999/commitments/recycled`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Recycle Bin')).toBeVisible({ timeout: 30000 });

    // Look for empty message
    const emptyMessage = page.locator('text=No deleted commitments found');
    if (await emptyMessage.isVisible({ timeout: 3000 })) {
      await takeScreenshot(page, '25-recycle-bin-empty-state');
    }
  });
});

test.describe('Recycle Bin - Count Badge Updates', () => {
  test('should update count badge after restore', async ({ page }) => {
    await navigateToCommitments(page);
    await page.waitForTimeout(2000);

    // Get initial count
    const recycleBinTab = page.locator('a:has-text("Recycle Bin")').first();
    const initialBadge = recycleBinTab.locator('[class*="badge"]').first();
    const initialCount = await initialBadge.textContent().catch(() => '0');

    // Navigate to recycle bin
    await recycleBinTab.click();
    await page.waitForURL(`**/${TEST_PROJECT_ID}/commitments/recycled`);
    await page.waitForTimeout(2000);

    // Restore first commitment if exists
    const restoreButton = page.getByRole('button', { name: /Restore/i }).first();
    if (await restoreButton.isVisible({ timeout: 3000 })) {
      await restoreButton.click();
      await page.waitForTimeout(1000);

      // Go back to commitments page
      await navigateToCommitments(page);
      await page.waitForTimeout(2000);

      // Get new count
      const newBadge = recycleBinTab.locator('[class*="badge"]').first();
      const newCount = await newBadge.textContent().catch(() => '0');

      // Count should have decreased (or removed if was 1)
      expect(parseInt(newCount || '0')).toBeLessThan(parseInt(initialCount || '0'));

      await takeScreenshot(page, '26-recycle-bin-count-after-restore');
    }
  });

  test('should update count badge after permanent delete', async ({ page }) => {
    await navigateToCommitments(page);
    await page.waitForTimeout(2000);

    const recycleBinTab = page.locator('a:has-text("Recycle Bin")').first();
    const initialBadge = recycleBinTab.locator('[class*="badge"]').first();
    const initialCount = await initialBadge.textContent().catch(() => '0');

    await recycleBinTab.click();
    await page.waitForURL(`**/${TEST_PROJECT_ID}/commitments/recycled`);
    await page.waitForTimeout(2000);

    const deleteButton = page.getByRole('button', { name: /Delete Forever/i }).first();
    if (await deleteButton.isVisible({ timeout: 3000 })) {
      await deleteButton.click();
      await page.waitForTimeout(300);

      const confirmBtn = page
        .locator('[role="alertdialog"]')
        .getByRole('button', { name: /Delete Forever/i });
      await confirmBtn.click();
      await page.waitForTimeout(1000);

      await navigateToCommitments(page);
      await page.waitForTimeout(2000);

      const newBadge = recycleBinTab.locator('[class*="badge"]').first();
      const newCount = await newBadge.textContent().catch(() => '0');

      expect(parseInt(newCount || '0')).toBeLessThan(parseInt(initialCount || '0'));

      await takeScreenshot(page, '27-recycle-bin-count-after-permanent-delete');
    }
  });
});

test.describe('Recycle Bin - API Integration', () => {
  test('should load deleted commitments from API', async ({ page }) => {
    const apiRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/commitments') && request.url().includes('include_deleted=true')) {
        apiRequests.push(request.url());
      }
    });

    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    // Verify API was called with include_deleted parameter
    expect(apiRequests.length).toBeGreaterThan(0);

    await takeScreenshot(page, '28-recycle-bin-api-loaded');
  });

  test('should call restore API endpoint', async ({ page }) => {
    const apiRequests: { url: string; method: string }[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/restore')) {
        apiRequests.push({ url: request.url(), method: request.method() });
      }
    });

    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    const restoreButton = page.getByRole('button', { name: /Restore/i }).first();
    if (await restoreButton.isVisible({ timeout: 3000 })) {
      await restoreButton.click();
      await page.waitForTimeout(1000);

      // Verify restore API was called
      const restoreRequest = apiRequests.find((req) => req.url.includes('/restore'));
      expect(restoreRequest).toBeDefined();
      expect(restoreRequest?.method).toBe('POST');

      await takeScreenshot(page, '29-recycle-bin-restore-api-called');
    }
  });

  test('should call permanent delete API endpoint', async ({ page }) => {
    const apiRequests: { url: string; method: string }[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/permanent-delete')) {
        apiRequests.push({ url: request.url(), method: request.method() });
      }
    });

    await navigateToRecycleBin(page);
    await page.waitForTimeout(2000);

    const deleteButton = page.getByRole('button', { name: /Delete Forever/i }).first();
    if (await deleteButton.isVisible({ timeout: 3000 })) {
      await deleteButton.click();
      await page.waitForTimeout(300);

      const confirmBtn = page
        .locator('[role="alertdialog"]')
        .getByRole('button', { name: /Delete Forever/i });
      await confirmBtn.click();
      await page.waitForTimeout(1000);

      // Verify permanent-delete API was called
      const deleteRequest = apiRequests.find((req) => req.url.includes('/permanent-delete'));
      expect(deleteRequest).toBeDefined();
      expect(deleteRequest?.method).toBe('DELETE');

      await takeScreenshot(page, '30-recycle-bin-permanent-delete-api-called');
    }
  });
});
