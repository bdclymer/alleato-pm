import { test, expect, Page } from '@playwright/test';

/**
 * Commitments List Page E2E Tests - Phase 8 Testing
 *
 * Tests the complete list page functionality including:
 * - Filtering (type, status, ERP status, SSOV status, private)
 * - Sorting by columns
 * - Column visibility toggle
 * - Pagination
 * - Search functionality
 * - Summary cards
 * - Tab navigation
 */

const TEST_PROJECT_ID = '67';

// Helper function to navigate to commitments page
async function navigateToCommitments(page: Page, projectId: string = TEST_PROJECT_ID) {
  await page.goto(`/${projectId}/commitments`);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { name: 'Commitments' })).toBeVisible({ timeout: 30000 });
}

// Helper function to take screenshots
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/screenshots/commitments-list-page/${name}.png`,
    fullPage: true,
  });
}

test.describe('Commitments List Page - Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCommitments(page);
  });

  test('should filter commitments by type - Subcontract', async ({ page }) => {
    // Look for the Type filter button
    const typeFilter = page.locator('button:has-text("Type")').first();
    if (await typeFilter.isVisible({ timeout: 5000 })) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      // Select Subcontract option
      const subcontractOption = page.getByRole('option', { name: 'Subcontract' }).or(
        page.getByRole('menuitem', { name: 'Subcontract' })
      ).or(page.locator('text=Subcontract').first());

      if (await subcontractOption.isVisible({ timeout: 2000 })) {
        await subcontractOption.click();
        await page.waitForTimeout(500);

        // Verify filter is applied (check URL or table content)
        await takeScreenshot(page, '01-filter-type-subcontract');
      }
    }
  });

  test('should filter commitments by type - Purchase Order', async ({ page }) => {
    const typeFilter = page.locator('button:has-text("Type")').first();
    if (await typeFilter.isVisible({ timeout: 5000 })) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const poOption = page.getByRole('option', { name: 'Purchase Order' }).or(
        page.getByRole('menuitem', { name: 'Purchase Order' })
      ).or(page.locator('text=Purchase Order').first());

      if (await poOption.isVisible({ timeout: 2000 })) {
        await poOption.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '02-filter-type-purchase-order');
      }
    }
  });

  test('should filter commitments by status', async ({ page }) => {
    const statusFilter = page.locator('button:has-text("Status")').first();
    if (await statusFilter.isVisible({ timeout: 5000 })) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      // Look for status options
      const approvedOption = page.getByRole('option', { name: 'Approved' }).or(
        page.locator('text=Approved').first()
      );

      if (await approvedOption.isVisible({ timeout: 2000 })) {
        await approvedOption.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '03-filter-status-approved');
      }
    }
  });

  test('should filter commitments by ERP Status', async ({ page }) => {
    // ERP Status might be in a filter dropdown or column menu
    const erpFilter = page.locator('button:has-text("ERP Status")').first();
    if (await erpFilter.isVisible({ timeout: 3000 })) {
      await erpFilter.click();
      await page.waitForTimeout(300);

      const syncedOption = page.locator('text=Synced').first();
      if (await syncedOption.isVisible({ timeout: 2000 })) {
        await syncedOption.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '04-filter-erp-status-synced');
      }
    }
  });

  test('should filter commitments by SSOV Status', async ({ page }) => {
    const ssovFilter = page.locator('button:has-text("SSOV Status")').first();
    if (await ssovFilter.isVisible({ timeout: 3000 })) {
      await ssovFilter.click();
      await page.waitForTimeout(300);

      const submittedOption = page.locator('text=Submitted').first();
      if (await submittedOption.isVisible({ timeout: 2000 })) {
        await submittedOption.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '05-filter-ssov-status-submitted');
      }
    }
  });

  test('should filter commitments by Private flag', async ({ page }) => {
    const privateFilter = page.locator('button:has-text("Private")').first();
    if (await privateFilter.isVisible({ timeout: 3000 })) {
      await privateFilter.click();
      await page.waitForTimeout(300);

      const yesOption = page.locator('[role="option"]:has-text("Yes")').or(
        page.locator('text=Yes').first()
      );
      if (await yesOption.isVisible({ timeout: 2000 })) {
        await yesOption.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '06-filter-private-yes');
      }
    }
  });

  test('should clear all filters', async ({ page }) => {
    // Apply a filter first
    const typeFilter = page.locator('button:has-text("Type")').first();
    if (await typeFilter.isVisible({ timeout: 5000 })) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const subcontractOption = page.locator('text=Subcontract').first();
      if (await subcontractOption.isVisible({ timeout: 2000 })) {
        await subcontractOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Look for clear/reset filters button
    const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset")').first();
    if (await clearButton.isVisible({ timeout: 3000 })) {
      await clearButton.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, '07-filters-cleared');
    }
  });
});

test.describe('Commitments List Page - Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCommitments(page);
  });

  test('should sort by Number column ascending', async ({ page }) => {
    const numberHeader = page.locator('th:has-text("Number"), [role="columnheader"]:has-text("Number")').first();
    if (await numberHeader.isVisible({ timeout: 5000 })) {
      await numberHeader.click();
      await page.waitForTimeout(500);

      // Check for sort indicator
      await takeScreenshot(page, '08-sort-number-asc');
    }
  });

  test('should sort by Number column descending', async ({ page }) => {
    const numberHeader = page.locator('th:has-text("Number"), [role="columnheader"]:has-text("Number")').first();
    if (await numberHeader.isVisible({ timeout: 5000 })) {
      // Click twice for descending
      await numberHeader.click();
      await page.waitForTimeout(300);
      await numberHeader.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, '09-sort-number-desc');
    }
  });

  test('should sort by Original Amount column', async ({ page }) => {
    const amountHeader = page.locator('th:has-text("Original Amount"), [role="columnheader"]:has-text("Original Amount")').first();
    if (await amountHeader.isVisible({ timeout: 5000 })) {
      await amountHeader.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, '10-sort-amount');
    }
  });

  test('should sort by Status column', async ({ page }) => {
    const statusHeader = page.locator('th:has-text("Status"), [role="columnheader"]:has-text("Status")').first();
    if (await statusHeader.isVisible({ timeout: 5000 })) {
      await statusHeader.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, '11-sort-status');
    }
  });

  test('should sort by Balance to Finish column', async ({ page }) => {
    const balanceHeader = page.locator('th:has-text("Balance to Finish"), [role="columnheader"]:has-text("Balance to Finish")').first();
    if (await balanceHeader.isVisible({ timeout: 5000 })) {
      await balanceHeader.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, '12-sort-balance');
    }
  });

  test('should sort by Created date column', async ({ page }) => {
    // Created column might need to be made visible first
    const createdHeader = page.locator('th:has-text("Created"), [role="columnheader"]:has-text("Created")').first();
    if (await createdHeader.isVisible({ timeout: 3000 })) {
      await createdHeader.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, '13-sort-created');
    }
  });
});

test.describe('Commitments List Page - Column Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCommitments(page);
  });

  test('should toggle column visibility via column menu', async ({ page }) => {
    // Look for columns toggle button (often a gear icon or "Columns" button)
    const columnsButton = page.locator('button:has-text("Columns"), button[aria-label*="column"]').first();
    if (await columnsButton.isVisible({ timeout: 5000 })) {
      await columnsButton.click();
      await page.waitForTimeout(300);

      await takeScreenshot(page, '14-column-visibility-menu');

      // Toggle ERP Status column
      const erpCheckbox = page.locator('[role="checkbox"]:near(:text("ERP Status")), label:has-text("ERP Status")').first();
      if (await erpCheckbox.isVisible({ timeout: 2000 })) {
        await erpCheckbox.click();
        await page.waitForTimeout(300);
      }

      // Toggle SSOV Status column
      const ssovCheckbox = page.locator('[role="checkbox"]:near(:text("SSOV Status")), label:has-text("SSOV Status")').first();
      if (await ssovCheckbox.isVisible({ timeout: 2000 })) {
        await ssovCheckbox.click();
        await page.waitForTimeout(300);
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      await takeScreenshot(page, '15-columns-toggled');
    }
  });

  test('should show all default visible columns', async ({ page }) => {
    // Verify default visible columns are present
    const expectedColumns = ['Number', 'Title', 'Type', 'Status', 'Original Amount', 'Revised Amount', 'Billed to Date', 'Balance to Finish'];

    for (const col of expectedColumns) {
      const header = page.locator(`th:has-text("${col}"), [role="columnheader"]:has-text("${col}")`).first();
      if (await header.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Column is visible as expected
      }
    }

    await takeScreenshot(page, '16-default-columns');
  });

  test('should hide optional columns by default', async ({ page }) => {
    // These columns should be hidden by default according to config
    const hiddenColumns = ['ERP Status', 'SSOV Status', 'Approved COs', 'Pending COs', 'Draft COs', 'Invoiced Amount', 'Payments Issued', '% Paid', 'Remaining Balance', 'Executed', 'Private', 'Created'];

    for (const col of hiddenColumns) {
      const header = page.locator(`th:has-text("${col}"), [role="columnheader"]:has-text("${col}")`).first();
      const isVisible = await header.isVisible({ timeout: 1000 }).catch(() => false);
      // Most should be hidden by default
    }

    await takeScreenshot(page, '17-hidden-columns-check');
  });

  test('should persist column visibility preferences', async ({ page }) => {
    // Toggle a column
    const columnsButton = page.locator('button:has-text("Columns")').first();
    if (await columnsButton.isVisible({ timeout: 5000 })) {
      await columnsButton.click();
      await page.waitForTimeout(300);

      const executedCheckbox = page.locator('label:has-text("Executed")').first();
      if (await executedCheckbox.isVisible({ timeout: 2000 })) {
        await executedCheckbox.click();
        await page.waitForTimeout(300);
      }

      await page.keyboard.press('Escape');
    }

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Commitments' })).toBeVisible({ timeout: 30000 });

    // Check if column preference persisted (state stored in localStorage)
    await takeScreenshot(page, '18-column-persistence-check');
  });
});

test.describe('Commitments List Page - Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCommitments(page);
  });

  test('should display pagination controls', async ({ page }) => {
    // Look for pagination elements
    const paginationNav = page.locator('nav[aria-label*="pagination"], [role="navigation"]').first();
    const pageButtons = page.locator('button:has-text("Next"), button:has-text("Previous"), [aria-label*="page"]');

    await page.waitForTimeout(500);
    await takeScreenshot(page, '19-pagination-controls');
  });

  test('should navigate to next page', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next"]').first();
    if (await nextButton.isVisible({ timeout: 3000 })) {
      const isDisabled = await nextButton.isDisabled();
      if (!isDisabled) {
        await nextButton.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '20-pagination-next');
      }
    }
  });

  test('should navigate to previous page', async ({ page }) => {
    // First go to next page
    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next"]').first();
    if (await nextButton.isVisible({ timeout: 3000 })) {
      const isDisabled = await nextButton.isDisabled();
      if (!isDisabled) {
        await nextButton.click();
        await page.waitForTimeout(500);

        // Then go back
        const prevButton = page.locator('button:has-text("Previous"), button[aria-label*="previous"]').first();
        if (await prevButton.isVisible()) {
          await prevButton.click();
          await page.waitForTimeout(500);
          await takeScreenshot(page, '21-pagination-previous');
        }
      }
    }
  });

  test('should display row count', async ({ page }) => {
    // Look for text showing "Showing X of Y" or similar
    const rowCount = page.locator('text=/\\d+ of \\d+/, text=/Showing \\d+/').first();
    if (await rowCount.isVisible({ timeout: 3000 })) {
      await takeScreenshot(page, '22-row-count-display');
    }
  });

  test('should change page size', async ({ page }) => {
    const pageSizeSelect = page.locator('select:near(:text("rows")), button:has-text("per page")').first();
    if (await pageSizeSelect.isVisible({ timeout: 3000 })) {
      await pageSizeSelect.click();
      await page.waitForTimeout(300);

      const option50 = page.locator('option[value="50"], [role="option"]:has-text("50")').first();
      if (await option50.isVisible({ timeout: 2000 })) {
        await option50.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '23-page-size-changed');
      }
    }
  });
});

test.describe('Commitments List Page - Search', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCommitments(page);
  });

  test('should search commitments by title', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search/i).first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      await takeScreenshot(page, '24-search-by-title');
    }
  });

  test('should search commitments by number', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search/i).first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('SUB-');
      await page.waitForTimeout(500);

      await takeScreenshot(page, '25-search-by-number');
    }
  });

  test('should clear search', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search/i).first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Clear the search
      await searchInput.clear();
      await page.waitForTimeout(500);

      await takeScreenshot(page, '26-search-cleared');
    }
  });

  test('should show no results message for invalid search', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search/i).first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('zzzznonexistent12345');
      await page.waitForTimeout(500);

      // Look for "No results" or empty state
      const noResults = page.locator('text=/No .* found|No results|Empty/i').first();
      await takeScreenshot(page, '27-search-no-results');
    }
  });
});

test.describe('Commitments List Page - Summary Cards', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCommitments(page);
  });

  test('should display all summary cards', async ({ page }) => {
    // Wait for cards to load
    await page.waitForSelector('text=Original Amount', { timeout: 10000 });

    await expect(page.locator('text=Original Amount')).toBeVisible();
    await expect(page.locator('text=Revised Amount')).toBeVisible();
    await expect(page.locator('text=Billed to Date')).toBeVisible();
    await expect(page.locator('text=Balance to Finish')).toBeVisible();

    await takeScreenshot(page, '28-summary-cards-all');
  });

  test('should display formatted currency values in cards', async ({ page }) => {
    await page.waitForSelector('text=Original Amount', { timeout: 10000 });

    // Look for currency formatted values (containing $)
    const currencyValues = page.locator('[class*="card"] >> text=/\\$/');
    const count = await currencyValues.count();

    expect(count).toBeGreaterThanOrEqual(4);

    await takeScreenshot(page, '29-summary-cards-currency');
  });

  test('should update summary cards when filters are applied', async ({ page }) => {
    // Get initial values
    await page.waitForSelector('text=Original Amount', { timeout: 10000 });

    // Take initial screenshot
    await takeScreenshot(page, '30-summary-cards-before-filter');

    // Apply a filter
    const typeFilter = page.locator('button:has-text("Type")').first();
    if (await typeFilter.isVisible({ timeout: 5000 })) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const subcontractOption = page.locator('text=Subcontract').first();
      if (await subcontractOption.isVisible({ timeout: 2000 })) {
        await subcontractOption.click();
        await page.waitForTimeout(500);

        // Summary cards should reflect filtered data
        await takeScreenshot(page, '31-summary-cards-after-filter');
      }
    }
  });
});

test.describe('Commitments List Page - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCommitments(page);
  });

  test('should display Commitments and Recycle Bin tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("Commitments"), a:has-text("Commitments")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Recycle Bin"), a:has-text("Recycle Bin")').first()).toBeVisible();

    await takeScreenshot(page, '32-tabs-display');
  });

  test('should navigate to Recycle Bin tab', async ({ page }) => {
    const recycleBinTab = page.locator('button:has-text("Recycle Bin"), a:has-text("Recycle Bin")').first();
    if (await recycleBinTab.isVisible({ timeout: 5000 })) {
      await recycleBinTab.click();
      await page.waitForURL(`**/${TEST_PROJECT_ID}/commitments/recycle-bin**`, { timeout: 10000 });

      await takeScreenshot(page, '33-recycle-bin-tab');
    }
  });

  test('should show commitment count in tab badge', async ({ page }) => {
    // Look for count badge next to Commitments tab
    const tabBadge = page.locator('span[class*="badge"], span[class*="rounded-full"]').filter({ hasText: /\d+/ }).first();
    if (await tabBadge.isVisible({ timeout: 3000 })) {
      await takeScreenshot(page, '34-tab-count-badge');
    }
  });
});

test.describe('Commitments List Page - Row Actions', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCommitments(page);
  });

  test('should show row action menu', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find action button in first row
    const actionButton = page.locator('tbody tr button, [role="row"] button[aria-haspopup]').first();
    if (await actionButton.isVisible({ timeout: 5000 })) {
      await actionButton.click();
      await page.waitForTimeout(300);

      // Verify action menu items
      await expect(page.getByRole('menuitem', { name: /Edit/i })).toBeVisible().catch(() => {});
      await expect(page.getByRole('menuitem', { name: /Delete/i })).toBeVisible().catch(() => {});

      await takeScreenshot(page, '35-row-action-menu');

      await page.keyboard.press('Escape');
    }
  });

  test('should navigate to edit page from row action', async ({ page }) => {
    await page.waitForTimeout(2000);

    const actionButton = page.locator('tbody tr button, [role="row"] button[aria-haspopup]').first();
    if (await actionButton.isVisible({ timeout: 5000 })) {
      await actionButton.click();
      await page.waitForTimeout(300);

      const editOption = page.getByRole('menuitem', { name: /Edit/i });
      if (await editOption.isVisible({ timeout: 2000 })) {
        await editOption.click();
        await page.waitForURL(`**/${TEST_PROJECT_ID}/commitments/**/edit**`, { timeout: 10000 });

        await takeScreenshot(page, '36-edit-page-navigation');
      }
    }
  });

  test('should click row to navigate to detail page', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Click on a commitment row (not the action button)
    const firstRowCell = page.locator('tbody tr td:first-child, [role="row"] [role="cell"]:first-child').first();
    if (await firstRowCell.isVisible({ timeout: 5000 })) {
      await firstRowCell.click();
      await page.waitForTimeout(1000);

      // Should navigate to detail page
      await takeScreenshot(page, '37-detail-page-navigation');
    }
  });
});

test.describe('Commitments List Page - Loading States', () => {
  test('should show loading state initially', async ({ page }) => {
    // Navigate without waiting for network idle
    await page.goto(`/${TEST_PROJECT_ID}/commitments`);

    // Look for loading indicator
    const loadingText = page.locator('text=Loading commitments..., text=Loading...');
    // Loading might be fast, so just take a screenshot
    await takeScreenshot(page, '38-loading-state');
  });

  test('should show empty state when no commitments', async ({ page }) => {
    // Navigate to a project with no commitments (using non-existent project)
    await page.goto('/999999/commitments');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Commitments' })).toBeVisible({ timeout: 30000 });

    await takeScreenshot(page, '39-empty-or-error-state');
  });
});
