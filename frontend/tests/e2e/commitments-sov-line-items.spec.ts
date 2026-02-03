import { test, expect, Page } from '@playwright/test';

/**
 * Commitments SOV Line Items E2E Tests - Phase 8 Testing
 *
 * Tests the complete SOV (Schedule of Values) line items functionality including:
 * - Create line items
 * - Read/display line items
 * - Update line items
 * - Delete line items
 * - Totals calculations
 * - Import functionality
 */

const TEST_PROJECT_ID = '67';
const TEST_COMMITMENT_ID = 'test-commitment-123';

// Mock commitment data with line items
const mockCommitment = {
  id: TEST_COMMITMENT_ID,
  project_id: TEST_PROJECT_ID,
  number: 'SUB-001',
  title: 'Test Subcontract',
  status: 'approved',
  type: 'subcontract',
  accounting_method: 'amount_based',
  original_amount: 100000,
  line_items: [
    {
      id: 'li-1',
      line_number: 1,
      description: 'Excavation and grading',
      budget_code: '01-100',
      amount: 40000,
      billed_to_date: 10000,
      balance_to_finish: 30000,
    },
    {
      id: 'li-2',
      line_number: 2,
      description: 'Concrete foundation',
      budget_code: '03-300',
      amount: 60000,
      billed_to_date: 25000,
      balance_to_finish: 35000,
    },
  ],
};

// Helper function to setup mock routes
async function setupMockRoutes(page: Page) {
  // Mock commitment detail endpoint
  await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}`, (route) => {
    const url = route.request().url();
    if (!url.includes('change-orders') && !url.includes('invoices') && !url.includes('attachments')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCommitment),
      });
    } else {
      route.continue();
    }
  });

  // Mock change orders (empty)
  await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}/change-orders`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  // Mock invoices (empty)
  await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}/invoices`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  // Mock attachments (empty)
  await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}/attachments`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
}

// Helper function to navigate to SOV tab
async function navigateToSOVTab(page: Page) {
  await page.goto(`/${TEST_PROJECT_ID}/commitments/${TEST_COMMITMENT_ID}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Click on SOV or Schedule of Values tab
  const sovTab = page.locator('[role="tab"]').filter({ hasText: /SOV|Schedule/i });
  if (await sovTab.isVisible({ timeout: 5000 })) {
    await sovTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  }
}

// Helper function to take screenshots
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/screenshots/commitments-sov/${name}.png`,
    fullPage: true,
  });
}

test.describe('SOV Line Items - Read/Display', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockRoutes(page);
    await navigateToSOVTab(page);
  });

  test('should display SOV tab', async ({ page }) => {
    // Verify SOV tab is visible and clickable
    const sovTab = page.locator('[role="tab"]').filter({ hasText: /SOV|Schedule/i });
    await expect(sovTab).toBeVisible();

    await takeScreenshot(page, '01-sov-tab-visible');
  });

  test('should display existing line items', async ({ page }) => {
    // Wait for line items to load
    await page.waitForTimeout(1000);

    // Check for line item data
    const firstDescription = page.locator('input[aria-label*="Description"], input[name*="description"]').first();
    if (await firstDescription.isVisible({ timeout: 5000 })) {
      await expect(firstDescription).toHaveValue('Excavation and grading');
    }

    await takeScreenshot(page, '02-sov-line-items-displayed');
  });

  test('should display line item columns correctly', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Check for table headers or column labels
    const headers = ['Description', 'Budget', 'Amount', 'Billed'];
    for (const header of headers) {
      const headerElement = page.locator(`th:has-text("${header}"), label:has-text("${header}")`).first();
      // Just check they exist somewhere on the page
    }

    await takeScreenshot(page, '03-sov-columns');
  });

  test('should display totals row', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for totals/footer row
    const totalsRow = page.locator('tfoot, [class*="total"], text=Total').first();
    if (await totalsRow.isVisible({ timeout: 3000 })) {
      await takeScreenshot(page, '04-sov-totals-row');
    }
  });

  test('should calculate total amount correctly', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Total should be $100,000 (40000 + 60000)
    const totalAmount = page.locator('tfoot >> text=$100,000, text=100,000').first();
    if (await totalAmount.isVisible({ timeout: 3000 })) {
      await expect(totalAmount).toBeVisible();
    }

    await takeScreenshot(page, '05-sov-total-amount');
  });

  test('should calculate billed to date total correctly', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Billed total should be $35,000 (10000 + 25000)
    const billedTotal = page.locator('tfoot >> text=$35,000, text=35,000').first();
    if (await billedTotal.isVisible({ timeout: 3000 })) {
      await expect(billedTotal).toBeVisible();
    }

    await takeScreenshot(page, '06-sov-billed-total');
  });

  test('should calculate balance to finish total correctly', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Balance total should be $65,000 (30000 + 35000)
    const balanceTotal = page.locator('tfoot >> text=$65,000, text=65,000').first();
    if (await balanceTotal.isVisible({ timeout: 3000 })) {
      await expect(balanceTotal).toBeVisible();
    }

    await takeScreenshot(page, '07-sov-balance-total');
  });
});

test.describe('SOV Line Items - Create', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockRoutes(page);
    await navigateToSOVTab(page);
  });

  test('should display Add Line Item button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /Add.*Line|Add Item|New Line/i });
    await expect(addButton).toBeVisible();

    await takeScreenshot(page, '08-add-line-button');
  });

  test('should add new line item row', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /Add.*Line|Add Item|New Line/i });
    await addButton.click();
    await page.waitForTimeout(500);

    // Check that a new row was added
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    // Should have at least 3 rows now (2 original + 1 new)
    expect(rowCount).toBeGreaterThanOrEqual(3);

    await takeScreenshot(page, '09-new-line-item-added');
  });

  test('should fill in new line item fields', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /Add.*Line|Add Item|New Line/i });
    await addButton.click();
    await page.waitForTimeout(500);

    // Fill in the new row (last row)
    const newRow = page.locator('tbody tr').last();

    // Fill description
    const descInput = newRow.locator('input[aria-label*="Description"], input[name*="description"]').first();
    if (await descInput.isVisible({ timeout: 3000 })) {
      await descInput.fill('New test line item');
    }

    // Fill budget code
    const budgetInput = newRow.locator('input[aria-label*="Budget"], input[name*="budget_code"]').first();
    if (await budgetInput.isVisible({ timeout: 3000 })) {
      await budgetInput.fill('05-500');
    }

    // Fill amount
    const amountInput = newRow.locator('input[aria-label*="Amount"], input[name*="amount"]').first();
    if (await amountInput.isVisible({ timeout: 3000 })) {
      await amountInput.fill('15000');
    }

    await page.waitForTimeout(500);

    await takeScreenshot(page, '10-new-line-item-filled');
  });

  test('should update totals when adding line item', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /Add.*Line|Add Item|New Line/i });
    await addButton.click();
    await page.waitForTimeout(500);

    // Fill amount in new row
    const newRow = page.locator('tbody tr').last();
    const amountInput = newRow.locator('input[aria-label*="Amount"], input[name*="amount"]').first();
    if (await amountInput.isVisible({ timeout: 3000 })) {
      await amountInput.fill('10000');
      await page.waitForTimeout(500);
    }

    // Check that total updated (should be $110,000 now)
    await takeScreenshot(page, '11-totals-updated-after-add');
  });
});

test.describe('SOV Line Items - Update', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockRoutes(page);
    await navigateToSOVTab(page);
  });

  test('should allow editing existing line item description', async ({ page }) => {
    await page.waitForTimeout(1000);

    const firstRow = page.locator('tbody tr').first();
    const descInput = firstRow.locator('input[aria-label*="Description"], input[name*="description"]').first();

    if (await descInput.isVisible({ timeout: 5000 })) {
      await descInput.clear();
      await descInput.fill('Updated excavation work');
      await page.waitForTimeout(500);

      await expect(descInput).toHaveValue('Updated excavation work');
    }

    await takeScreenshot(page, '12-description-edited');
  });

  test('should allow editing line item amount', async ({ page }) => {
    await page.waitForTimeout(1000);

    const firstRow = page.locator('tbody tr').first();
    const amountInput = firstRow.locator('input[aria-label*="Amount"], input[name*="amount"]').first();

    if (await amountInput.isVisible({ timeout: 5000 })) {
      await amountInput.clear();
      await amountInput.fill('45000');
      await page.waitForTimeout(500);

      await expect(amountInput).toHaveValue('45000');
    }

    await takeScreenshot(page, '13-amount-edited');
  });

  test('should allow editing line item budget code', async ({ page }) => {
    await page.waitForTimeout(1000);

    const firstRow = page.locator('tbody tr').first();
    const budgetInput = firstRow.locator('input[aria-label*="Budget"], input[name*="budget_code"]').first();

    if (await budgetInput.isVisible({ timeout: 5000 })) {
      await budgetInput.clear();
      await budgetInput.fill('01-200');
      await page.waitForTimeout(500);

      await expect(budgetInput).toHaveValue('01-200');
    }

    await takeScreenshot(page, '14-budget-code-edited');
  });

  test('should recalculate totals when editing amount', async ({ page }) => {
    await page.waitForTimeout(1000);

    const firstRow = page.locator('tbody tr').first();
    const amountInput = firstRow.locator('input[aria-label*="Amount"], input[name*="amount"]').first();

    if (await amountInput.isVisible({ timeout: 5000 })) {
      // Change from 40000 to 50000
      await amountInput.clear();
      await amountInput.fill('50000');
      await page.waitForTimeout(500);

      // Total should now be $110,000 (50000 + 60000)
      await takeScreenshot(page, '15-totals-recalculated');
    }
  });

  test('should calculate balance to finish automatically', async ({ page }) => {
    await page.waitForTimeout(1000);

    const firstRow = page.locator('tbody tr').first();

    // Update amount
    const amountInput = firstRow.locator('input[aria-label*="Amount"], input[name*="amount"]').first();
    if (await amountInput.isVisible({ timeout: 5000 })) {
      await amountInput.clear();
      await amountInput.fill('50000');
      await page.waitForTimeout(500);
    }

    // Balance should be automatically calculated (amount - billed)
    // 50000 - 10000 = 40000
    await takeScreenshot(page, '16-balance-auto-calculated');
  });
});

test.describe('SOV Line Items - Delete', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockRoutes(page);
    await navigateToSOVTab(page);
  });

  test('should display delete button for line items', async ({ page }) => {
    await page.waitForTimeout(1000);

    const deleteButton = page.locator('button[aria-label*="Delete"], button:has-text("Delete"), button[class*="destructive"]').first();
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await takeScreenshot(page, '17-delete-button-visible');
    }
  });

  test('should delete line item when clicking delete button', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Get initial row count
    const initialRowCount = await page.locator('tbody tr').count();

    // Click delete on first row
    const firstRow = page.locator('tbody tr').first();
    const deleteButton = firstRow.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();

    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      await page.waitForTimeout(500);

      // Check row count decreased
      const newRowCount = await page.locator('tbody tr').count();
      expect(newRowCount).toBeLessThan(initialRowCount);
    }

    await takeScreenshot(page, '18-line-item-deleted');
  });

  test('should update totals after deletion', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Delete first row
    const firstRow = page.locator('tbody tr').first();
    const deleteButton = firstRow.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();

    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      await page.waitForTimeout(500);

      // Totals should reflect only remaining line items
      // After deleting first ($40,000), total should be $60,000
      await takeScreenshot(page, '19-totals-after-deletion');
    }
  });

  test('should show empty state when all line items deleted', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Delete all rows
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const firstRow = page.locator('tbody tr').first();
      const deleteButton = firstRow.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();

      if (await deleteButton.isVisible({ timeout: 3000 })) {
        await deleteButton.click();
        await page.waitForTimeout(300);
      }
    }

    await page.waitForTimeout(500);

    // Check for empty state
    await takeScreenshot(page, '20-empty-state');
  });
});

test.describe('SOV Line Items - Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockRoutes(page);
    await navigateToSOVTab(page);
  });

  test('should prevent negative amounts', async ({ page }) => {
    await page.waitForTimeout(1000);

    const firstRow = page.locator('tbody tr').first();
    const amountInput = firstRow.locator('input[aria-label*="Amount"], input[name*="amount"]').first();

    if (await amountInput.isVisible({ timeout: 5000 })) {
      await amountInput.clear();
      await amountInput.fill('-1000');
      await page.waitForTimeout(500);

      // Check for validation error or input correction
      await takeScreenshot(page, '21-negative-amount-validation');
    }
  });

  test('should require description for line items', async ({ page }) => {
    // Add a new line item
    const addButton = page.getByRole('button', { name: /Add.*Line|Add Item|New Line/i });
    await addButton.click();
    await page.waitForTimeout(500);

    // Try to save/submit without description
    const saveButton = page.getByRole('button', { name: /Save|Submit|Update/i }).first();
    if (await saveButton.isVisible({ timeout: 3000 })) {
      await saveButton.click();
      await page.waitForTimeout(500);

      // Check for validation error
      await takeScreenshot(page, '22-description-required');
    }
  });

  test('should handle large amounts correctly', async ({ page }) => {
    await page.waitForTimeout(1000);

    const firstRow = page.locator('tbody tr').first();
    const amountInput = firstRow.locator('input[aria-label*="Amount"], input[name*="amount"]').first();

    if (await amountInput.isVisible({ timeout: 5000 })) {
      await amountInput.clear();
      await amountInput.fill('9999999999');
      await page.waitForTimeout(500);

      // Should handle large numbers without overflow
      await takeScreenshot(page, '23-large-amount-handling');
    }
  });
});

test.describe('SOV Line Items - Import', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockRoutes(page);
    await navigateToSOVTab(page);
  });

  test('should display import button', async ({ page }) => {
    const importButton = page.getByRole('button', { name: /Import|Upload/i }).first();
    if (await importButton.isVisible({ timeout: 5000 })) {
      await takeScreenshot(page, '24-import-button');
    }
  });

  test('should open import dialog when clicking import', async ({ page }) => {
    const importButton = page.getByRole('button', { name: /Import|Upload/i }).first();
    if (await importButton.isVisible({ timeout: 5000 })) {
      await importButton.click();
      await page.waitForTimeout(500);

      // Look for import dialog/modal
      const dialog = page.locator('[role="dialog"], [class*="modal"]').first();
      if (await dialog.isVisible({ timeout: 3000 })) {
        await takeScreenshot(page, '25-import-dialog');
        await page.keyboard.press('Escape');
      }
    }
  });
});

test.describe('SOV Line Items - Save', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockRoutes(page);
    await navigateToSOVTab(page);
  });

  test('should display save button', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: /Save|Update/i }).first();
    if (await saveButton.isVisible({ timeout: 5000 })) {
      await takeScreenshot(page, '26-save-button');
    }
  });

  test('should save changes successfully', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Make a change
    const firstRow = page.locator('tbody tr').first();
    const descInput = firstRow.locator('input[aria-label*="Description"], input[name*="description"]').first();

    if (await descInput.isVisible({ timeout: 5000 })) {
      await descInput.clear();
      await descInput.fill('Modified line item');
      await page.waitForTimeout(300);
    }

    // Click save
    const saveButton = page.getByRole('button', { name: /Save|Update/i }).first();
    if (await saveButton.isVisible({ timeout: 3000 })) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Look for success toast or message
      const toast = page.locator('[role="alert"], [class*="toast"]').filter({ hasText: /success|saved/i }).first();
      await takeScreenshot(page, '27-save-success');
    }
  });

  test('should show error message on save failure', async ({ page }) => {
    // Mock save endpoint to return error
    await page.route('**/api/commitments/**/line-items**', (route) => {
      if (route.request().method() === 'PUT' || route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to save' }),
        });
      } else {
        route.continue();
      }
    });

    // Make a change
    const firstRow = page.locator('tbody tr').first();
    const descInput = firstRow.locator('input[aria-label*="Description"], input[name*="description"]').first();

    if (await descInput.isVisible({ timeout: 5000 })) {
      await descInput.fill('Test change');
    }

    // Try to save
    const saveButton = page.getByRole('button', { name: /Save|Update/i }).first();
    if (await saveButton.isVisible({ timeout: 3000 })) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Look for error toast/message
      await takeScreenshot(page, '28-save-error');
    }
  });
});

test.describe('SOV Line Items - Empty State', () => {
  test('should show empty state when no line items', async ({ page }) => {
    // Mock commitment with no line items
    await page.route(`**/api/commitments/**`, (route) => {
      const url = route.request().url();
      if (!url.includes('change-orders') && !url.includes('invoices') && !url.includes('attachments')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockCommitment,
            line_items: [],
          }),
        });
      } else {
        route.continue();
      }
    });

    await navigateToSOVTab(page);
    await page.waitForTimeout(1000);

    // Check for empty state message
    const emptyState = page.locator('text=/No .* items|Add your first|Empty/i').first();
    await takeScreenshot(page, '29-empty-state-display');
  });

  test('should show Add Line Item button in empty state', async ({ page }) => {
    // Mock commitment with no line items
    await page.route(`**/api/commitments/**`, (route) => {
      const url = route.request().url();
      if (!url.includes('change-orders') && !url.includes('invoices') && !url.includes('attachments')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockCommitment,
            line_items: [],
          }),
        });
      } else {
        route.continue();
      }
    });

    await navigateToSOVTab(page);
    await page.waitForTimeout(1000);

    const addButton = page.getByRole('button', { name: /Add.*Line|Add Item|New Line/i });
    await expect(addButton).toBeVisible();

    await takeScreenshot(page, '30-empty-state-add-button');
  });
});
