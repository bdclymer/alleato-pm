import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;
test.beforeEach(async ({ page, authenticatedRequest }) => {
  const project = await createTestProject(page, {}, authenticatedRequest);
  projectId = project.project.id;
});



test('Original Budget save with authentication', async ({ page }) => {
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

  // Take initial screenshot
  await page.screenshot({ path: 'tests/screenshots/budget-auth-initial.png', fullPage: true });

  // First, expand a parent row to see child rows
  // Look for expand button (ChevronRight icon)
  const expandButtons = page.locator('button[aria-label^="Expand"]');
  const expandCount = await expandButtons.count();
  console.log('Found expand buttons:', expandCount);

  if (expandCount > 0) {
    // Click the first expand button
    await expandButtons.first().click();
    console.log('Expanded first parent row');
    await page.waitForTimeout(500);

    // Take screenshot showing expanded row
    await page.screenshot({ path: 'tests/screenshots/budget-auth-expanded.png', fullPage: true });
  }

  // Now find clickable currency buttons that have blue underline style (child rows)
  // Child rows have blue underlined links, parent rows have orange text
  const childEditableCells = page.locator('button.text-blue-600.underline');
  const childCellCount = await childEditableCells.count();
  console.log('Found child editable cells count:', childCellCount);

  if (childCellCount > 0) {
    // Get the first child cell (this should be a real database row)
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
      await page.screenshot({ path: 'tests/screenshots/budget-auth-sidebar.png', fullPage: true });

      // Check if this is an aggregated row (should not have form fields)
      const aggregatedNotice = sidebar.locator('text=Aggregated Budget Line');
      const isAggregated = await aggregatedNotice.count() > 0;
      console.log('Is aggregated row:', isAggregated);

      if (isAggregated) {
        console.log('This is an aggregated row - skipping edit');
        await page.locator('button:has-text("Close")').click();
        await page.waitForTimeout(500);
      } else {
        // Find the Original Budget input - it should be the last text input
        const inputs = sidebar.locator('input[type="text"], input[type="number"]');
        const inputCount = await inputs.count();
        console.log('Text/number input count:', inputCount);

        // The Original Budget input should be one that shows a dollar amount
        // Let's find all inputs and their values
        for (let i = 0; i < inputCount; i++) {
          const inp = inputs.nth(i);
          const val = await inp.inputValue();
          const disabled = await inp.isDisabled();
          console.log(`Input ${i}: value="${val}", disabled=${disabled}`);
        }

        // For "manual" mode, the Original Budget input should be editable
        // Let's try to find it by looking for the one with $ in value
        const originalBudgetInput = inputs.filter({ hasText: /\$/ }).last();

        // Actually let's click on "Calculated" method first to enable inputs
        const calculatedRadio = sidebar.locator('input[value="calculated"]');
        if (await calculatedRadio.count() > 0) {
          await calculatedRadio.click();
          console.log('Clicked calculated radio');
          await page.waitForTimeout(500);

          // Now Unit Qty and Unit Cost should be editable
          // Find Unit Qty input (type="number")
          const qtyInput = sidebar.locator('input[type="number"]').first();
          if (await qtyInput.count() > 0) {
            await qtyInput.fill('5');
            console.log('Set quantity to 5');
          }

          // Find Unit Cost input - it's a text input with $ value
          const costInputs = sidebar.locator('input[type="text"]');
          const costCount = await costInputs.count();
          for (let i = 0; i < costCount; i++) {
            const val = await costInputs.nth(i).inputValue();
            if (val.includes('$')) {
              const disabled = await costInputs.nth(i).isDisabled();
              console.log(`Cost input ${i}: value="${val}", disabled=${disabled}`);
              if (!disabled) {
                // Clear and type new value
                await costInputs.nth(i).click();
                await costInputs.nth(i).fill('100');
                console.log('Set unit cost to 100');
                break;
              }
            }
          }
        }

        await page.waitForTimeout(500);
        await page.screenshot({ path: 'tests/screenshots/budget-auth-edited.png', fullPage: true });

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
          }
        }

        await page.waitForTimeout(2000);

        // Check for toast
        const toasts = page.locator('[data-sonner-toast]');
        const toastCount = await toasts.count();
        console.log('Toast count:', toastCount);
        for (let i = 0; i < toastCount; i++) {
          const text = await toasts.nth(i).textContent();
          console.log(`Toast ${i}:`, text);
        }

        await page.screenshot({ path: 'tests/screenshots/budget-auth-after-save.png', fullPage: true });
      }
    }
  } else {
    // Fallback - try original approach with any editable cell
    console.log('No child cells found, trying any editable cell');
    const editableCells = page.locator('button').filter({ hasText: /\$\d/ });
    const cellCount = await editableCells.count();
    console.log('Found editable cells count:', cellCount);
  }
});
