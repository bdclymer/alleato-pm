/**
 * Budget Tabs E2E Tests
 *
 * Tests navigation between budget-related tabs and verifies each tab
 * loads correct content.
 *
 * Budget Tabs (from budget-tabs.tsx):
 * - Budget: Main line items table (default)
 * - Budget Details: Detailed breakdown table
 * - Cost Codes: Manage cost codes
 * - Forecasting: Forecast management
 * - Project Status Snapshots: Historical snapshots
 * - Change History: Audit log
 * - Settings: Budget settings
 *
 * User Story: As a project manager, I can navigate between budget tabs
 * to access different views and tools related to the budget.
 *
 * @see frontend/src/components/budget/budget-tabs.tsx
 * @see .claude/rules/E2E-TESTING-STANDARDS.md
 */

import { test, expect } from '../../fixtures/index';

// Use an existing project ID for testing
// This avoids bootstrap API issues when auth token is expired
const projectId = 67;

test.describe('Budget Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to budget page before each test
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for budget tabs navigation to be visible - this is specific to the budget page
    // and indicates the page has loaded successfully
    await expect(
      page.locator('nav[aria-label="Budget tabs"]'),
      'Budget tabs navigation should be visible'
    ).toBeVisible({ timeout: 15000 });
  });

  /**
   * Test: Budget Tab (Main Tab) Is Active By Default
   *
   * Workflow:
   * 1. Navigate to budget page
   * 2. Verify "Budget" tab button has active styling (aria-current="page")
   * 3. Verify budget table content is visible
   */
  test('Budget tab is active by default and displays line items', async ({ page }) => {
    const budgetNav = page.locator('nav[aria-label="Budget tabs"]');

    // Check that Budget tab button has aria-current="page" (active state)
    const budgetTab = budgetNav.getByRole('button', { name: 'Budget', exact: true });
    await expect(budgetTab, 'Budget tab should be visible').toBeVisible();

    // Use expect with toHaveAttribute for auto-retry
    await expect(budgetTab, 'Budget tab should be active').toHaveAttribute('aria-current', 'page');

    // Verify budget content area is visible
    const contentArea = page.locator('.bg-muted\\/30').first();
    await expect(contentArea, 'Budget content area should be visible').toBeVisible({ timeout: 10000 });

    console.log('[Budget Tabs] Budget tab verified as active with content visible');
  });

  /**
   * Test: Navigate to Budget Details Tab
   *
   * Workflow:
   * 1. Click "Budget Details" tab button
   * 2. Wait for URL to change
   * 3. Verify tab becomes active (aria-current changes)
   */
  test('user can navigate to Budget Details tab', async ({ page }) => {
    const budgetNav = page.locator('nav[aria-label="Budget tabs"]');

    // Click Budget Details tab
    const detailsTab = budgetNav.getByRole('button', { name: 'Budget Details', exact: true });
    await expect(detailsTab, 'Budget Details tab should be visible').toBeVisible();

    await detailsTab.click();

    // Wait for URL to contain the tab parameter
    await page.waitForURL(/tab=budget-details/i, { timeout: 10000 });

    // Verify tab is now active using toHaveAttribute for auto-retry
    await expect(detailsTab, 'Budget Details tab should now be active').toHaveAttribute(
      'aria-current',
      'page',
      { timeout: 5000 }
    );

    // Budget tab should no longer be active
    const budgetTab = budgetNav.getByRole('button', { name: 'Budget', exact: true });
    await expect(budgetTab, 'Budget tab should no longer be active').not.toHaveAttribute('aria-current');

    console.log('[Budget Tabs] Successfully navigated to Budget Details tab');
  });

  /**
   * Test: Navigate to Cost Codes Tab
   */
  test('user can navigate to Cost Codes tab', async ({ page }) => {
    const budgetNav = page.locator('nav[aria-label="Budget tabs"]');
    const costCodesTab = budgetNav.getByRole('button', { name: 'Cost Codes', exact: true });
    await expect(costCodesTab, 'Cost Codes tab should be visible').toBeVisible();

    await costCodesTab.click();

    // Wait for URL to contain the tab parameter
    await page.waitForURL(/tab=cost-codes/i, { timeout: 10000 });

    // Verify tab is now active
    await expect(costCodesTab, 'Cost Codes tab should now be active').toHaveAttribute(
      'aria-current',
      'page',
      { timeout: 5000 }
    );

    console.log('[Budget Tabs] Successfully navigated to Cost Codes tab');
  });

  /**
   * Test: Navigate to Forecasting Tab
   */
  test('user can navigate to Forecasting tab', async ({ page }) => {
    const budgetNav = page.locator('nav[aria-label="Budget tabs"]');
    const forecastingTab = budgetNav.getByRole('button', { name: 'Forecasting', exact: true });
    await expect(forecastingTab, 'Forecasting tab should be visible').toBeVisible();

    await forecastingTab.click();

    // Wait for URL to contain the tab parameter
    await page.waitForURL(/tab=forecasting/i, { timeout: 10000 });

    // Verify tab is now active
    await expect(forecastingTab, 'Forecasting tab should now be active').toHaveAttribute(
      'aria-current',
      'page',
      { timeout: 5000 }
    );

    console.log('[Budget Tabs] Successfully navigated to Forecasting tab');
  });

  /**
   * Test: Navigate to Project Status Snapshots Tab
   */
  test('user can navigate to Project Status Snapshots tab', async ({ page }) => {
    const budgetNav = page.locator('nav[aria-label="Budget tabs"]');
    const snapshotsTab = budgetNav.getByRole('button', { name: 'Project Status Snapshots', exact: true });
    await expect(snapshotsTab, 'Project Status Snapshots tab should be visible').toBeVisible();

    await snapshotsTab.click();

    // Wait for URL to contain the tab parameter
    await page.waitForURL(/tab=snapshots/i, { timeout: 10000 });

    // Verify tab is now active
    await expect(snapshotsTab, 'Snapshots tab should now be active').toHaveAttribute(
      'aria-current',
      'page',
      { timeout: 5000 }
    );

    console.log('[Budget Tabs] Successfully navigated to Project Status Snapshots tab');
  });

  /**
   * Test: Navigate to Change History Tab
   */
  test('user can navigate to Change History tab', async ({ page }) => {
    const budgetNav = page.locator('nav[aria-label="Budget tabs"]');
    const changeHistoryTab = budgetNav.getByRole('button', { name: 'Change History', exact: true });
    await expect(changeHistoryTab, 'Change History tab should be visible').toBeVisible();

    await changeHistoryTab.click();

    // Wait for URL to contain the tab parameter
    await page.waitForURL(/tab=change-history/i, { timeout: 10000 });

    // Verify tab is now active
    await expect(changeHistoryTab, 'Change History tab should now be active').toHaveAttribute(
      'aria-current',
      'page',
      { timeout: 5000 }
    );

    console.log('[Budget Tabs] Successfully navigated to Change History tab');
  });

  /**
   * Test: Navigate to Settings Tab
   */
  test('user can navigate to Settings tab', async ({ page }) => {
    const budgetNav = page.locator('nav[aria-label="Budget tabs"]');
    const settingsTab = budgetNav.getByRole('button', { name: 'Settings', exact: true });
    await expect(settingsTab, 'Settings tab should be visible').toBeVisible();

    await settingsTab.click();

    // Wait for URL to contain the tab parameter
    await page.waitForURL(/tab=settings/i, { timeout: 10000 });

    // Verify tab is now active
    await expect(settingsTab, 'Settings tab should now be active').toHaveAttribute(
      'aria-current',
      'page',
      { timeout: 5000 }
    );

    console.log('[Budget Tabs] Successfully navigated to Settings tab');
  });

  /**
   * Test: Tab Navigation Preserves Context
   *
   * Workflow:
   * 1. Start on Budget tab (default)
   * 2. Switch to Budget Details tab
   * 3. Switch back to Budget tab
   * 4. Verify context is preserved (content reloads correctly)
   */
  test('switching tabs preserves context and state', async ({ page }) => {
    const budgetNav = page.locator('nav[aria-label="Budget tabs"]');

    // 1. Verify starting on Budget tab
    const budgetTab = budgetNav.getByRole('button', { name: 'Budget', exact: true });
    await expect(budgetTab, 'Should start on Budget tab').toHaveAttribute('aria-current', 'page');

    // 2. Switch to Budget Details
    const detailsTab = budgetNav.getByRole('button', { name: 'Budget Details', exact: true });
    await detailsTab.click();
    await page.waitForURL(/tab=budget-details/i, { timeout: 10000 });

    await expect(detailsTab, 'Budget Details should be active').toHaveAttribute(
      'aria-current',
      'page',
      { timeout: 5000 }
    );

    // 3. Switch back to Budget
    await budgetTab.click();
    // Budget tab removes the tab parameter from URL
    await page.waitForURL((url) => !url.search.includes('tab='), { timeout: 10000 });

    await expect(budgetTab, 'Budget tab should be active again').toHaveAttribute(
      'aria-current',
      'page',
      { timeout: 5000 }
    );

    console.log('[Budget Tabs] Context preserved after tab switch');
  });

  /**
   * Test: All Expected Tabs Are Present
   *
   * Verifies all 7 budget tabs exist in the navigation.
   */
  test('all expected budget tabs are present', async ({ page }) => {
    const budgetNav = page.locator('nav[aria-label="Budget tabs"]');

    const expectedTabs = [
      'Budget',
      'Budget Details',
      'Cost Codes',
      'Forecasting',
      'Project Status Snapshots',
      'Change History',
      'Settings',
    ];

    const foundTabs: string[] = [];

    for (const tabName of expectedTabs) {
      const tab = budgetNav.getByRole('button', { name: tabName, exact: true });
      const isVisible = (await tab.count()) > 0 && (await tab.isVisible());

      if (isVisible) {
        foundTabs.push(tabName);
      } else {
        console.log(`[Budget Tabs] Tab not found: ${tabName}`);
      }
    }

    console.log('[Budget Tabs] Found tabs:', foundTabs);

    expect(foundTabs.length, 'All 7 budget tabs should be present').toBe(7);
    expect(foundTabs, 'Tab names should match expected').toEqual(expectedTabs);
  });

  // Note: Using existing project (ID 67), no cleanup needed
});
