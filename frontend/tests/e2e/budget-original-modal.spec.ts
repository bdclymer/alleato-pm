import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Original Budget Modal', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  // Use without auth for debugging
  test.use({ storageState: undefined });

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page
    await page.goto(`/${projectId}/budget`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display original budget modal when clicking on original budget cell', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({ path: 'tests/screenshots/budget-before-modal.png', fullPage: true });

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // First, expand a parent row to see child line items
    const expandButton = page.locator('button[aria-label*="Expand"]').first();
    const expandExists = await expandButton.count();

    if (expandExists > 0) {
      console.log('Expanding first row...');
      await expandButton.click();
      await page.waitForTimeout(500);
    }

    // Find and click on an original budget amount cell
    // Looking for editable currency buttons (blue underlined links in Original Budget column)
    const budgetCell = page.locator('button[aria-label*="Edit $"]').first();

    // Wait for the cell to be visible
    await expect(budgetCell).toBeVisible({ timeout: 10000 });

    console.log('Budget cell found, clicking...');
    await budgetCell.click();

    // Wait a moment for modal to appear
    await page.waitForTimeout(1000);

    // Take screenshot after click
    await page.screenshot({ path: 'tests/screenshots/budget-after-modal-click.png', fullPage: true });

    // Check if overlay is present
    const overlay = page.locator('[data-radix-dialog-overlay]');
    const overlayVisible = await overlay.isVisible();
    console.log('Overlay visible:', overlayVisible);

    // Check if modal content is present
    const modalContent = page.locator('[data-radix-dialog-content]');
    const modalVisible = await modalContent.isVisible();
    console.log('Modal content visible:', modalVisible);

    // Check if modal title is present
    const modalTitle = page.getByRole('heading', { name: /Original Budget Amount for/i });
    const titleVisible = await modalTitle.isVisible().catch(() => false);
    console.log('Modal title visible:', titleVisible);

    // Log all dialog elements
    const allDialogs = await page.locator('[role="dialog"]').count();
    console.log('Number of dialog elements:', allDialogs);

    // Check if BaseModal structure is present
    const baseModalHeader = page.locator('.bg-slate-900\\/95');
    const headerVisible = await baseModalHeader.isVisible().catch(() => false);
    console.log('BaseModal header visible:', headerVisible);

    // Verify modal is fully visible (both overlay and content)
    await expect(overlay).toBeVisible();
    await expect(modalContent).toBeVisible();
    await expect(modalTitle).toBeVisible();

    // Verify we can see the modal tabs
    const originalBudgetTab = page.getByRole('button', { name: 'Original Budget' });
    await expect(originalBudgetTab).toBeVisible();

    // Take final screenshot with modal open
    await page.screenshot({ path: 'tests/screenshots/budget-modal-open.png', fullPage: true });
  });

  test('should debug modal rendering', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('table', { timeout: 10000 });

    // Check for expand buttons (they contain ChevronRight icons)
    const expandButtons = await page.locator('button:has(svg)').filter({ hasText: '' }).all();
    const chevronButtons = [];

    for (const button of expandButtons) {
      const parent = await button.locator('..').first();
      const isInTable = await parent.locator('table').count() === 0; // Not inside a dropdown
      if (isInTable) {
        chevronButtons.push(button);
      }
    }

    console.log('Potential expand buttons found:', chevronButtons.length);

    // Expand first few rows to expose child line items
    if (chevronButtons.length > 0) {
      console.log('Expanding rows...');
      for (const button of chevronButtons.slice(0, 3)) { // Expand first 3 rows
        try {
          await button.click({ timeout: 1000 });
          await page.waitForTimeout(200);
        } catch (e) {
          console.log('Failed to click button:', e);
        }
      }
      await page.waitForTimeout(500);
    }

    // Now check for clickable cells after expansion
    const clickableCells = await page.locator('.text-blue-600.underline').all();
    console.log('Clickable cells found after expansion:', clickableCells.length);

    if (clickableCells.length === 0) {
      console.log('NO CLICKABLE CELLS FOUND - Original Budget cells may not be editable even after expansion');

      // Check if budget is locked
      const lockButton = page.getByRole('button', { name: /Lock Budget|Unlock Budget/i });
      const lockButtonExists = await lockButton.count();
      console.log('Lock button exists:', lockButtonExists);
      if (lockButtonExists > 0) {
        const lockText = await lockButton.innerText();
        console.log('Lock button text:', lockText);
      }
      return;
    }

    // Click on first clickable budget cell
    const budgetCell = clickableCells[0];
    await budgetCell.click();

    // Wait for any rendering
    await page.waitForTimeout(2000);

    // Get computed styles of modal content
    const modalContent = page.locator('[data-radix-dialog-content]');
    const styles = await modalContent.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        visibility: computed.visibility,
        opacity: computed.opacity,
        zIndex: computed.zIndex,
        transform: computed.transform,
        position: computed.position,
        width: computed.width,
        height: computed.height,
      };
    }).catch(() => null);

    console.log('Modal content computed styles:', styles);

    // Check if modal is in the DOM but hidden
    const modalHTML = await modalContent.innerHTML().catch(() => 'NOT FOUND');
    console.log('Modal HTML length:', modalHTML.length);

    // Get the bounding box
    const boundingBox = await modalContent.boundingBox().catch(() => null);
    console.log('Modal bounding box:', boundingBox);
  });
});
