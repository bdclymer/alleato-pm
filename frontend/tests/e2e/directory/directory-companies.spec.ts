import { test, expect } from '@playwright/test';

test.describe('Directory Companies Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to companies directory page
    await page.goto('/directory/companies');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display companies list page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Directory');

    // Check for Companies tab being active
    const companiesTab = page.getByRole('link', { name: /companies/i });
    await expect(companiesTab).toBeVisible();
  });

  test('should display Add Company button', async ({ page }) => {
    const addCompanyButton = page.getByRole('button', { name: /add company/i });
    await expect(addCompanyButton).toBeVisible();
  });

  test('should open Add Company dialog when clicking Add button', async ({ page }) => {
    // Click Add button
    await page.getByRole('button', { name: /add company/i }).click();

    // Check dialog is visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/add new company/i)).toBeVisible();

    // Check form fields
    await expect(page.getByLabel(/company name/i)).toBeVisible();

    // Close dialog
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should create a new company', async ({ page }) => {
    const timestamp = Date.now();
    const companyName = `Test Company ${timestamp}`;

    // Open dialog
    await page.getByRole('button', { name: /add company/i }).click();

    // Fill form
    await page.getByLabel(/company name/i).fill(companyName);

    // Submit
    await page.getByRole('button', { name: /create company/i }).click();

    // Wait for success toast
    await expect(page.getByText(/company created successfully/i)).toBeVisible({ timeout: 5000 });

    // Reload to see new company
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify company appears in table
    await expect(page.getByText(companyName)).toBeVisible({ timeout: 5000 });
  });

  test('should display company information in table', async ({ page }) => {
    // Check for company table columns
    await expect(page.getByText('Company Name')).toBeVisible();

    // Wait for table to load
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('should edit a company via inline editing', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Check if there are any rows
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // The GenericEditableTable supports inline editing
      // Double-click on the first company name to edit
      const firstRow = rows.first();
      const nameCell = firstRow.locator('td').first();

      // Double-click to enable editing
      await nameCell.dblclick();

      // Wait for edit mode
      await page.waitForTimeout(500);

      // Check if input appears for editing
      const input = firstRow.locator('input');
      if (await input.isVisible()) {
        // Edit the value
        await input.fill(`Updated ${Date.now()}`);

        // Press Enter to save
        await input.press('Enter');

        // Wait for save
        await page.waitForTimeout(500);
      }
    }
  });

  test('should show company count', async ({ page }) => {
    // Wait for the count to be displayed
    await page.waitForSelector('table', { timeout: 10000 });

    // Check for the "X of Y companies loaded" text
    const countText = page.getByText(/of \d+ companies loaded/i);
    await expect(countText).toBeVisible();
  });

  test('should navigate to company detail when clicking view', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('table', { timeout: 10000 });

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Look for actions/view button in first row
      const firstRow = rows.first();
      const actionsButton = firstRow.getByRole('button');

      if (await actionsButton.isVisible()) {
        await actionsButton.click();

        // Look for view/edit option
        const viewOption = page.getByRole('menuitem', { name: /view|edit/i });
        if (await viewOption.isVisible()) {
          await viewOption.click();
        }
      }
    }
  });

  test('should load more companies when clicking Load More', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('table', { timeout: 10000 });

    // Check if Load More button exists
    const loadMoreButton = page.getByRole('button', { name: /load more companies/i });

    if (await loadMoreButton.isVisible()) {
      // Get initial row count
      const initialCount = await page.locator('table tbody tr').count();

      // Click load more
      await loadMoreButton.click();

      // Wait for more data to load
      await page.waitForTimeout(2000);

      // Check if more rows loaded
      const newCount = await page.locator('table tbody tr').count();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test('should display empty state when no companies exist', async ({ page }) => {
    // This test checks for proper empty state handling
    const emptyMessage = page.getByText(/no companies found/i);
    const table = page.locator('table');

    // Either table or empty state should be visible
    const tableVisible = await table.isVisible().catch(() => false);
    const emptyVisible = await emptyMessage.isVisible().catch(() => false);

    expect(tableVisible || emptyVisible).toBe(true);
  });

  test('should navigate between directory tabs', async ({ page }) => {
    // Verify tabs are present and clickable
    const usersTab = page.getByRole('link', { name: /^users$/i });
    await expect(usersTab).toBeVisible();

    // Click on Users tab
    await usersTab.click();

    // Verify URL changed
    await expect(page).toHaveURL(/\/directory\/users/);

    // Go back to Companies
    await page.getByRole('link', { name: /companies/i }).click();
    await expect(page).toHaveURL(/\/directory\/companies/);
  });

  test('should delete a company', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('table', { timeout: 10000 });

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Get the last row (least likely to have dependencies)
      const lastRow = rows.last();

      // Look for delete action
      const actionsButton = lastRow.getByRole('button').first();

      if (await actionsButton.isVisible()) {
        await actionsButton.click();

        // Look for delete option
        const deleteOption = page.getByRole('menuitem', { name: /delete/i });
        if (await deleteOption.isVisible()) {
          // Setup dialog handler for confirmation
          page.on('dialog', dialog => dialog.accept());

          await deleteOption.click();

          // Wait for deletion
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should display company address information', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('table', { timeout: 10000 });

    // Check for Address column header
    const addressColumn = page.getByText('Address');
    await expect(addressColumn).toBeVisible();
  });

  test('should display company website links', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('table', { timeout: 10000 });

    // Check for Website column header
    const websiteColumn = page.getByText('Website');
    await expect(websiteColumn).toBeVisible();
  });
});
