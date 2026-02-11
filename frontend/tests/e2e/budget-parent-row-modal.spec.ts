import { expect, test } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Parent Row Modal', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.use({ storageState: undefined });

  test('should open modal when clicking parent row Original Budget cell', async ({ page }) => {
    // Navigate to budget page
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('networkidle');

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Take screenshot before clicking
    await page.screenshot({
      path: 'tests/screenshots/budget-parent-row-before-click.png',
      fullPage: true
    });

    // Find the first parent row Original Budget cell (should be orange/clickable now)
    // Parent rows have orange text, child rows have blue underlined text
    const parentCell = page.locator('button[aria-label*="Edit $"]').first();

    // Verify the cell exists
    await expect(parentCell).toBeVisible({ timeout: 10000 });

    // Click the parent row cell
    await parentCell.click();

    // Wait for modal to appear
    await page.waitForTimeout(1000);

    // Verify modal title is visible (this confirms modal opened)
    const modalTitle = page.getByRole('heading', { name: /Original Budget Amount for/i });
    await expect(modalTitle).toBeVisible({ timeout: 10000 });

    // Verify modal content is visible
    const modalContent = page.locator('[role="dialog"]');
    await expect(modalContent).toBeVisible();

    // Verify the "Aggregated Budget Line" notice is displayed
    const aggregatedNotice = page.getByText('Aggregated Budget Line');
    await expect(aggregatedNotice).toBeVisible();

    // Verify the notice explains it's a parent row
    const noticeText = page.getByText(/This is a parent row containing/i);
    await expect(noticeText).toBeVisible();

    // Verify the Original Budget tab is visible
    const originalBudgetTab = page.getByRole('button', { name: 'Original Budget' });
    await expect(originalBudgetTab).toBeVisible();

    // Take screenshot with modal open
    await page.screenshot({
      path: 'tests/screenshots/budget-parent-row-modal-open.png',
      fullPage: true
    });

    // Verify the modal can be closed
    const closeButton = page.getByRole('button', { name: /close/i }).first();
    await closeButton.click();

    // Wait for modal to close
    await page.waitForTimeout(500);

    // Verify modal is closed (title should not be visible)
    await expect(modalTitle).not.toBeVisible();
  });

  test('should style parent row cells differently from child cells', async ({ page }) => {
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    // Find all clickable cells
    const clickableCells = await page.locator('button[aria-label*="Edit $"]').all();

    if (clickableCells.length > 0) {
      const firstCell = clickableCells[0];

      // Check if it has orange styling (parent row indicator)
      const className = await firstCell.getAttribute('class');
      const isParentRow = className?.includes('text-orange');

      console.log('First clickable cell classes:', className);
      console.log('Is parent row (orange):', isParentRow);

      // Take a screenshot showing the styled cells
      await page.screenshot({
        path: 'tests/screenshots/budget-cell-styling.png',
        fullPage: true
      });
    }
  });
});
