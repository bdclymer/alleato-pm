import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;
test.beforeEach(async ({ page, authenticatedRequest }) => {
  const project = await createTestProject(page, {}, authenticatedRequest);
  projectId = project.project.id;
});



test('Original Budget manual mode save', async ({ page }) => {
  // First authenticate

  // Wait for redirect after login
  await page.waitForTimeout(3000);

  // Navigate to the budget page
  await page.goto(`/${projectId}/budget`);

  // Wait for the page to load completely
  await page.waitForLoadState('networkidle');

  // Wait for budget data to finish loading
  await page.waitForFunction(() => {
    return !document.body.textContent?.includes('Loading budget data');
  }, { timeout: 15000 }).catch(() => {
    console.log('Loading timeout');
  });

  await page.waitForTimeout(2000);

  // First, expand a parent row to see child rows
  const expandButtons = page.locator('button[aria-label^="Expand"]');
  const expandCount = await expandButtons.count();
  console.log('Found expand buttons:', expandCount);

  if (expandCount > 0) {
    await expandButtons.first().click();
    console.log('Expanded first parent row');
    await page.waitForTimeout(500);
  }

  // Find clickable currency buttons (child rows with blue underline)
  const childEditableCells = page.locator('button.text-blue-600.underline');
  const childCellCount = await childEditableCells.count();
  console.log('Found child editable cells count:', childCellCount);

  if (childCellCount > 0) {
    // Get a child cell
    const editableCell = childEditableCells.first();
    const initialValue = await editableCell.textContent();
    console.log('Initial value:', initialValue);

    // Click to open sidebar
    await editableCell.click();
    await page.waitForTimeout(1000);

    // Check if sidebar opened
    const sidebar = page.locator('[data-slot="sheet-content"]');
    const sidebarVisible = await sidebar.isVisible();
    console.log('Sidebar visible:', sidebarVisible);

    if (sidebarVisible) {
      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/budget-manual-sidebar.png', fullPage: true });

      // Check if this is an aggregated row
      const aggregatedNotice = sidebar.locator('text=Aggregated Budget Line');
      const isAggregated = await aggregatedNotice.count() > 0;
      console.log('Is aggregated row:', isAggregated);

      if (!isAggregated) {
        // We're in manual mode by default - the Original Budget input should be enabled
        // Find the Original Budget input - it's the last input, and in manual mode it's NOT disabled
        const inputs = sidebar.locator('input[type="text"], input[type="number"]');
        const inputCount = await inputs.count();
        console.log('Input count:', inputCount);

        // Log all inputs
        for (let i = 0; i < inputCount; i++) {
          const inp = inputs.nth(i);
          const val = await inp.inputValue();
          const disabled = await inp.isDisabled();
          console.log(`Input ${i}: value="${val}", disabled=${disabled}`);
        }

        // The last input should be Original Budget and it should be enabled in manual mode
        // (Unit Qty, UOM dropdown, Unit Cost are all disabled in manual mode)
        const originalBudgetInput = inputs.last();
        const isDisabled = await originalBudgetInput.isDisabled();
        console.log('Original Budget input disabled:', isDisabled);

        // In manual mode, Original Budget should be enabled
        expect(isDisabled).toBe(false);

        // Clear and set a new value
        await originalBudgetInput.click();
        await page.waitForTimeout(100);

        // The input should now show raw value
        await originalBudgetInput.fill('12345.67');
        console.log('Set Original Budget to 12345.67');

        await page.waitForTimeout(500);
        await page.screenshot({ path: 'tests/screenshots/budget-manual-edited.png', fullPage: true });

        // Click save button
        const saveButton = sidebar.locator('button:has-text("Save Changes")');
        const saveButtonVisible = await saveButton.isVisible();
        console.log('Save button visible:', saveButtonVisible);

        if (saveButtonVisible) {
          // Listen for network request
          const responsePromise = page.waitForResponse(resp =>
            resp.url().includes('/api/projects/') && resp.request().method() === 'PATCH',
            { timeout: 10000 }
          ).catch(e => {
            console.log('No response captured:', e.message);
            return null;
          });

          await saveButton.click();
          console.log('Clicked save');

          const response = await responsePromise;
          if (response) {
            console.log('Response status:', response.status());
            const body = await response.json().catch(() => null);
            console.log('Response body:', JSON.stringify(body));

            // Verify the response contains the expected amount
            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
            expect(body.lineItem.amount).toBe(12345.67);
          }
        }

        await page.waitForTimeout(2000);

        // Check for success toast
        const toasts = page.locator('[data-sonner-toast]');
        const toastCount = await toasts.count();
        console.log('Toast count:', toastCount);
        for (let i = 0; i < toastCount; i++) {
          const text = await toasts.nth(i).textContent();
          console.log(`Toast ${i}:`, text);
        }

        await page.screenshot({ path: 'tests/screenshots/budget-manual-after-save.png', fullPage: true });
      }
    }
  }
});
