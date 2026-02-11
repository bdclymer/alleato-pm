import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

/**
 * E2E Tests for Budget Details Tab
 *
 * Tests the Budget Detail tab functionality following Procore Standard Budget View
 */

test.describe.skip('Budget Details Tab', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  // Use a known project ID (we'll use project 118 from the database)
  const projectId = '118';

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page
    await page.goto(`/${projectId}/budget`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display Budget Details tab button', async ({ page }) => {
    // Check that the Budget Details tab exists
    const budgetDetailsTab = page.getByRole('button', {
      name: /budget details/i,
    });

    await expect(budgetDetailsTab).toBeVisible();
  });

  test('should navigate to Budget Details tab when clicked', async ({ page }) => {
    // Click on Budget Details tab
    await page.getByRole('button', { name: /budget details/i }).click();

    // Wait for the details table to load
    await page.waitForTimeout(1000);

    // Check that we're on the budget details view
    // by looking for the Procore Standard Budget View columns
    const tableHeaders = page.locator('table thead th');

    // Verify key column headers exist
    await expect(tableHeaders.filter({ hasText: 'Budget Code' })).toBeVisible();
    await expect(tableHeaders.filter({ hasText: 'Vendor' })).toBeVisible();
    await expect(tableHeaders.filter({ hasText: 'Detail Type' })).toBeVisible();
    await expect(
      tableHeaders.filter({ hasText: 'Original Budget Amount' })
    ).toBeVisible();
  });

  test('should display all Procore Standard Budget columns', async ({ page }) => {
    // Navigate to Budget Details tab
    await page.getByRole('button', { name: /budget details/i }).click();
    await page.waitForTimeout(1000);

    const tableHeaders = page.locator('table thead th');

    // Verify all standard columns are present
    const expectedColumns = [
      'Budget Code',
      'Vendor',
      'Item',
      'Detail Type',
      'Original Budget Amount',
      'Budget Changes',
      'Pending Budget Changes',
      'Approved COs',
      'Committed Costs',
      'Pending Cost Changes',
      'Direct Costs',
      'Forecast to Complete',
    ];

    for (const column of expectedColumns) {
      await expect(tableHeaders.filter({ hasText: column })).toBeVisible();
    }
  });

  test('should fetch and display budget detail data', async ({ page }) => {
    // Navigate to Budget Details tab
    await page.getByRole('button', { name: /budget details/i }).click();

    // Wait for API call to complete
    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/projects/') &&
        response.url().includes('/budget/details') &&
        response.status() === 200
    );

    // Check that table has data or shows "no data" message
    const tableBody = page.locator('table tbody');
    const noDataMessage = page.getByText(/no budget details found/i);

    // Either we have data rows or a no data message
    const hasData = (await tableBody.locator('tr').count()) > 0;
    const hasNoDataMessage = await noDataMessage.isVisible();

    expect(hasData || hasNoDataMessage).toBeTruthy();
  });

  test('should display different detail types correctly', async ({ page }) => {
    // Navigate to Budget Details tab
    await page.getByRole('button', { name: /budget details/i }).click();
    await page.waitForTimeout(1500);

    // Check for Detail Type column content
    const detailTypeCells = page.locator('table tbody td').nth(3); // Detail Type is 4th column

    // Should contain at least one of the expected detail types
    const expectedDetailTypes = [
      'Original Budget',
      'Budget Changes',
      'Prime Contract Change Orders',
      'Commitments',
      'Commitment Change Orders',
      'Change Events',
      'Direct Costs',
      'Forecast to Complete',
    ];

    // Get all detail type cells
    const cells = await page.locator('table tbody tr').all();

    if (cells.length > 0) {
      // At least one row should have a valid detail type
      let foundValidType = false;

      for (const row of cells.slice(0, 5)) {
        // Check first 5 rows
        const detailType = await row.locator('td').nth(3).textContent();

        if (detailType && expectedDetailTypes.some((type) => detailType.includes(type))) {
          foundValidType = true;
          break;
        }
      }

      expect(foundValidType).toBeTruthy();
    }
  });

  test('should format currency values correctly', async ({ page }) => {
    // Navigate to Budget Details tab
    await page.getByRole('button', { name: /budget details/i }).click();
    await page.waitForTimeout(1500);

    // Get the first row's currency cell (Original Budget Amount)
    const firstRow = page.locator('table tbody tr').first();
    const originalBudgetCell = firstRow.locator('td').nth(4); // 5th column

    const cellText = await originalBudgetCell.textContent();

    // Should either be a currency value ($X,XXX.XX) or a dash (-)
    if (cellText && cellText !== '-') {
      expect(cellText).toMatch(/^\$[\d,]+\.\d{2}$/);
    }
  });

  test('should have filters available on Budget Details tab', async ({ page }) => {
    // Navigate to Budget Details tab
    await page.getByRole('button', { name: /budget details/i }).click();
    await page.waitForTimeout(500);

    // Check for View dropdown
    const viewDropdown = page.getByLabel(/view/i).first();
    await expect(viewDropdown).toBeVisible();
  });

  test('should allow navigation back to Budget tab', async ({ page }) => {
    // Navigate to Budget Details tab
    await page.getByRole('button', { name: /budget details/i }).click();
    await page.waitForTimeout(500);

    // Click back to Budget tab
    await page.getByRole('button', { name: /^budget$/i }).click();
    await page.waitForTimeout(500);

    // Should see the regular budget table
    const budgetTable = page.locator('table');
    await expect(budgetTable).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept the API call and return an error
    await page.route('**/api/projects/*/budget/details', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Navigate to Budget Details tab
    await page.getByRole('button', { name: /budget details/i }).click();
    await page.waitForTimeout(1000);

    // Should show an error toast or message
    // Note: This assumes toast notifications are implemented
    const errorMessage = page.getByText(/failed to load budget details/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should show loading state while fetching data', async ({ page }) => {
    // Slow down the API response to see loading state
    await page.route('**/api/projects/*/budget/details', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    // Navigate to Budget Details tab
    await page.getByRole('button', { name: /budget details/i }).click();

    // Should show loading indicator
    const loadingIndicator = page.getByText(/loading budget details/i);
    await expect(loadingIndicator).toBeVisible({ timeout: 1000 });
  });
});

test.describe('Budget Details API', () => {
  const projectId = '118';

  test('GET /api/projects/[id]/budget/details should return budget detail data', async ({
    request,
  }) => {
    const response = await request.get(`/api/projects/${projectId}/budget/details`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Should have details array and count
    expect(data).toHaveProperty('details');
    expect(data).toHaveProperty('count');
    expect(Array.isArray(data.details)).toBeTruthy();
  });

  test('API should return properly structured budget detail items', async ({
    request,
  }) => {
    const response = await request.get(`/api/projects/${projectId}/budget/details`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    if (data.details.length > 0) {
      const firstDetail = data.details[0];

      // Should have required fields
      expect(firstDetail).toHaveProperty('id');
      expect(firstDetail).toHaveProperty('budgetCode');
      expect(firstDetail).toHaveProperty('detailType');

      // Detail type should be one of the expected values
      const validDetailTypes = [
        'original_budget',
        'budget_changes',
        'forecast_to_complete',
        'prime_contract_change_orders',
        'commitments',
        'commitment_change_orders',
        'change_events',
        'direct_costs',
      ];

      expect(validDetailTypes).toContain(firstDetail.detailType);
    }
  });
});
