import { test, expect } from '../../fixtures/index';
import { createTestProject } from '../../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Forecasting Tab', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page for project 118
    await page.goto('/118/budget');
    await page.waitForLoadState('networkidle');

    // Wait for budget tabs navigation to be visible
    await page.waitForSelector('nav[aria-label="Budget tabs"]', { timeout: 10000 });
  });

  test('should display forecasting tab in tab navigation', async ({ page }) => {
    // Check that the forecasting tab exists in the navigation
    const forecastingTab = page.locator('nav[aria-label="Budget tabs"] button:has-text("Forecasting")');
    await expect(forecastingTab).toBeVisible();
  });

  test('should navigate to forecasting tab when clicked', async ({ page }) => {
    // Click the forecasting tab
    const forecastingTab = page.locator('button:has-text("Forecasting")');
    await forecastingTab.click();

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Verify URL or content changed (forecasting tab should be active)
    const activeTab = page.locator('button:has-text("Forecasting")[data-state="active"]');
    await expect(activeTab).toBeVisible();
  });

  test('should render forecasting tab content', async ({ page }) => {
    // Click the forecasting tab
    await page.locator('button:has-text("Forecasting")').click();
    await page.waitForTimeout(1000);

    // Check for forecasting-specific content
    // The ForecastingTab component should render
    const forecastingContent = page.locator('div.rounded-lg.border.bg-white.shadow-sm');
    await expect(forecastingContent).toBeVisible();
  });

  test('should display summary cards in forecasting tab', async ({ page }) => {
    // Click the forecasting tab
    await page.locator('button:has-text("Forecasting")').click();
    await page.waitForTimeout(1000);

    // Check for summary cards (from ForecastingTab component)
    const summaryCards = page.locator('div.grid.grid-cols-1.md\\:grid-cols-3');
    await expect(summaryCards).toBeVisible();

    // Check for specific metric cards
    const projectedBudgetCard = page.locator('text=Projected Budget');
    const projectedCostsCard = page.locator('text=Projected Costs');
    const projectedVarianceCard = page.locator('text=Projected Variance');

    await expect(projectedBudgetCard).toBeVisible();
    await expect(projectedCostsCard).toBeVisible();
    await expect(projectedVarianceCard).toBeVisible();
  });

  test('should display recalculate forecast button', async ({ page }) => {
    // Click the forecasting tab
    await page.locator('button:has-text("Forecasting")').click();
    await page.waitForTimeout(1000);

    // Check for recalculate button
    const recalculateButton = page.locator('button:has-text("Recalculate Forecast")');
    await expect(recalculateButton).toBeVisible();
    await expect(recalculateButton).toBeEnabled();
  });

  test('should display export forecast button', async ({ page }) => {
    // Click the forecasting tab
    await page.locator('button:has-text("Forecasting")').click();
    await page.waitForTimeout(1000);

    // Check for export button
    const exportButton = page.locator('button:has-text("Export Forecast")');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
  });

  test('should show toast when recalculate forecast is clicked', async ({ page }) => {
    // Click the forecasting tab
    await page.locator('button:has-text("Forecasting")').click();
    await page.waitForTimeout(1000);

    // Click recalculate button
    const recalculateButton = page.locator('button:has-text("Recalculate Forecast")');
    await recalculateButton.click();

    // Wait for toast to appear
    await page.waitForTimeout(500);

    // Check for toast message
    const toast = page.locator('text=Forecast recalculated successfully');
    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test('should show toast when export forecast is clicked', async ({ page }) => {
    // Click the forecasting tab
    await page.locator('button:has-text("Forecasting")').click();
    await page.waitForTimeout(1000);

    // Click export button
    const exportButton = page.locator('button:has-text("Export Forecast")');
    await exportButton.click();

    // Wait for toast to appear
    await page.waitForTimeout(500);

    // Check for toast message
    const toast = page.locator('text=Forecast exported successfully');
    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test('should display cost code breakdown section', async ({ page }) => {
    // Click the forecasting tab
    await page.locator('button:has-text("Forecasting")').click();
    await page.waitForTimeout(1000);

    // Check for cost code breakdown section
    const breakdownSection = page.locator('h3:has-text("Cost Code Breakdown")');
    await expect(breakdownSection).toBeVisible();
  });

  test('should display cost code table with columns', async ({ page }) => {
    // Click the forecasting tab
    await page.locator('button:has-text("Forecasting")').click();
    await page.waitForTimeout(1000);

    // Check for table headers
    const costCodeHeader = page.locator('th:has-text("Cost Code")');
    const projectedBudgetHeader = page.locator('th:has-text("Projected Budget")');
    const projectedCostsHeader = page.locator('th:has-text("Projected Costs")');
    const varianceHeader = page.locator('th:has-text("Variance")');

    await expect(costCodeHeader).toBeVisible();
    await expect(projectedBudgetHeader).toBeVisible();
    await expect(projectedCostsHeader).toBeVisible();
    await expect(varianceHeader).toBeVisible();
  });
});

test.describe('Budget Snapshots Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/118/budget');
    await page.waitForLoadState('networkidle');
  });

  test('should display snapshots tab in tab navigation', async ({ page }) => {
    const snapshotsTab = page.locator('button:has-text("Project Status Snapshots")');
    await expect(snapshotsTab).toBeVisible();
  });

  test('should navigate to snapshots tab when clicked', async ({ page }) => {
    const snapshotsTab = page.locator('button:has-text("Project Status Snapshots")');
    await snapshotsTab.click();
    await page.waitForTimeout(1000);

    const activeTab = page.locator('button:has-text("Project Status Snapshots")[data-state="active"]');
    await expect(activeTab).toBeVisible();
  });

  test('should render snapshots tab content', async ({ page }) => {
    await page.locator('button:has-text("Project Status Snapshots")').click();
    await page.waitForTimeout(1000);

    const snapshotsContent = page.locator('div.rounded-lg.border.bg-white.shadow-sm');
    await expect(snapshotsContent).toBeVisible();
  });
});

test.describe('Budget Change History Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/118/budget');
    await page.waitForLoadState('networkidle');
  });

  test('should display change history tab in tab navigation', async ({ page }) => {
    const changeHistoryTab = page.locator('button:has-text("Change History")');
    await expect(changeHistoryTab).toBeVisible();
  });

  test('should navigate to change history tab when clicked', async ({ page }) => {
    const changeHistoryTab = page.locator('button:has-text("Change History")');
    await changeHistoryTab.click();
    await page.waitForTimeout(1000);

    const activeTab = page.locator('button:has-text("Change History")[data-state="active"]');
    await expect(activeTab).toBeVisible();
  });

  test('should render change history tab content', async ({ page }) => {
    await page.locator('button:has-text("Change History")').click();
    await page.waitForTimeout(1000);

    const changeHistoryContent = page.locator('div.rounded-lg.border.bg-white.shadow-sm');
    await expect(changeHistoryContent).toBeVisible();
  });
});
