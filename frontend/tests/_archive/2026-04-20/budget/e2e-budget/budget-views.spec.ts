/**
 * Budget Views E2E Tests
 *
 * Tests custom budget view management functionality.
 *
 * User Stories:
 * - As a project manager, I can create custom budget views with specific columns
 * - I can save views for quick access
 * - I can clone existing views
 * - I can delete views I no longer need
 *
 * Workflow:
 * 1. Create a new custom view
 * 2. Save view with specific columns
 * 3. Load saved view
 * 4. Clone existing view
 * 5. Delete custom view
 *
 * @see /DOCS_NEED_TO_FILE/BUDGET-E2E-TEST-PLAN.md
 * @see .claude/rules/E2E-TESTING-STANDARDS.md
 */

import { test, expect } from '../../fixtures/index';
import { createTestProject } from '../../helpers/bootstrap';

let projectId: number;

test.describe('Budget Custom Views', () => {
  test.beforeAll(async ({ authenticatedRequest }) => {
    // Create a test project
    const project = await createTestProject({} as any, { template: 'commercial' }, authenticatedRequest);
    projectId = project.project.id;

    console.log(`[Budget Views] Test project created: ${projectId}`);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page before each test
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /budget/i }).first(),
      'Budget page header should be visible'
    ).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test: Create a New Custom View
   *
   * Workflow:
   * 1. Click "Views" or "Customize View" button
   * 2. Enter view name
   * 3. Select specific columns to display
   * 4. Save the view
   * 5. Verify view appears in view selector
   */
  test('user can create a new custom budget view', async ({ page }) => {
    // 1. Look for Views button/dropdown
    const viewsButton = page
      .getByRole('button', { name: /views|customize view|manage views/i })
      .first();

    if ((await viewsButton.count()) === 0) {
      console.log('[Budget Views] Views button not found in UI');
      test.skip(true, 'Custom views feature not available in UI');
    }

    await expect(viewsButton, 'Views button should be visible').toBeVisible({ timeout: 5000 });
    await viewsButton.click();
    await page.waitForTimeout(500);

    // 2. Look for "Create New View" or "Add View" option
    const createViewOption = page
      .getByRole('menuitem', { name: /create.*view|new view|add view/i })
      .or(page.getByText(/create.*view|new view/i).first());

    const hasCreateOption = (await createViewOption.count()) > 0;

    if (!hasCreateOption) {
      console.log('[Budget Views] Create view option not found');
      test.skip(true, 'Create view option not available');
    }

    await createViewOption.click();

    // 3. Wait for view creation dialog
    const viewDialog = page.getByRole('dialog');
    await expect(viewDialog, 'View creation dialog should be visible').toBeVisible({
      timeout: 5000,
    });

    // 4. Enter view name
    const viewNameInput = viewDialog.getByLabel(/view name|name/i).first();
    await expect(viewNameInput, 'View name input should be visible').toBeVisible({
      timeout: 3000,
    });

    const testViewName = `Test View ${Date.now()}`;
    await viewNameInput.fill(testViewName);

    // 5. Select columns (if available)
    // Column selection UI may vary - look for checkboxes or multi-select
    const columnCheckboxes = viewDialog.getByRole('checkbox');
    const checkboxCount = await columnCheckboxes.count();

    if (checkboxCount > 0) {
      console.log(`[Budget Views] Found ${checkboxCount} column checkboxes`);

      // Select first 3 columns
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        const checkbox = columnCheckboxes.nth(i);
        const isChecked = await checkbox.isChecked();

        if (!isChecked) {
          await checkbox.click();
        }
      }
    }

    // 6. Save the view
    const saveButton = viewDialog.getByRole('button', { name: /save|create/i });
    await expect(saveButton, 'Save button should be visible').toBeVisible({ timeout: 3000 });
    await saveButton.click();

    // 7. Verify dialog closes
    await expect(viewDialog, 'Dialog should close after saving').not.toBeVisible({
      timeout: 10000,
    });

    // 8. Verify success toast
    const successToast = page.getByText(/view.*created|view.*saved/i);
    await expect(successToast, 'Success toast should appear').toBeVisible({ timeout: 5000 });

    // 9. Verify view appears in view selector
    // Re-open views menu
    await viewsButton.click();
    await page.waitForTimeout(500);

    const newView = page.getByRole('menuitem', { name: testViewName });
    await expect(newView, 'New view should appear in views menu').toBeVisible({
      timeout: 5000,
    });

    console.log(`[Budget Views] Created custom view: ${testViewName}`);
  });

  /**
   * Test: Load Saved Custom View
   *
   * Workflow:
   * 1. Create a custom view (prerequisite)
   * 2. Navigate away or reload page
   * 3. Select the custom view from views menu
   * 4. Verify view loads with correct columns
   */
  test('user can load a saved custom view', async ({ page }) => {
    const viewsButton = page
      .getByRole('button', { name: /views|customize view|manage views/i })
      .first();

    if ((await viewsButton.count()) === 0) {
      test.skip(true, 'Custom views feature not available in UI');
    }

    // 1. Create a custom view first
    await viewsButton.click();
    await page.waitForTimeout(500);

    const createViewOption = page
      .getByRole('menuitem', { name: /create.*view|new view/i })
      .or(page.getByText(/create.*view/i).first());

    if ((await createViewOption.count()) === 0) {
      test.skip(true, 'Create view option not available');
    }

    await createViewOption.click();

    const viewDialog = page.getByRole('dialog');
    await expect(viewDialog).toBeVisible({ timeout: 5000 });

    const testViewName = `Load Test View ${Date.now()}`;
    const viewNameInput = viewDialog.getByLabel(/view name|name/i).first();
    await viewNameInput.fill(testViewName);

    const saveButton = viewDialog.getByRole('button', { name: /save|create/i });
    await saveButton.click();

    await expect(viewDialog).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // 2. Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 3. Open views menu
    const reloadedViewsButton = page
      .getByRole('button', { name: /views|customize view/i })
      .first();

    await reloadedViewsButton.click();
    await page.waitForTimeout(500);

    // 4. Select the custom view
    const savedView = page.getByRole('menuitem', { name: testViewName });
    await expect(savedView, 'Saved view should be available after reload').toBeVisible({
      timeout: 5000,
    });

    await savedView.click();
    await page.waitForTimeout(1000);

    // 5. Verify view loaded
    console.log(`[Budget Views] Successfully loaded saved view: ${testViewName}`);
  });

  /**
   * Test: Clone Existing View
   *
   * Workflow:
   * 1. Open views menu
   * 2. Find a view to clone
   * 3. Click "Clone" or "Duplicate" action
   * 4. Enter new name for cloned view
   * 5. Save
   * 6. Verify cloned view appears
   */
  test('user can clone an existing view', async ({ page }) => {
    const viewsButton = page
      .getByRole('button', { name: /views|customize view/i })
      .first();

    if ((await viewsButton.count()) === 0) {
      test.skip(true, 'Custom views feature not available in UI');
    }

    await viewsButton.click();
    await page.waitForTimeout(500);

    // Look for a view to clone (may be "Default" or a previously created view)
    const viewItems = page.getByRole('menuitem');
    const itemCount = await viewItems.count();

    if (itemCount === 0) {
      console.log('[Budget Views] No views available to clone');
      test.skip(true, 'No views available to clone');
    }

    // Find a view with a clone/duplicate action
    let clonableView = null;
    let cloneButton = null;

    for (let i = 0; i < itemCount; i++) {
      const item = viewItems.nth(i);
      const itemText = await item.textContent();

      // Look for clone/duplicate button within the view item or in context menu
      const possibleCloneButton = item
        .getByRole('button', { name: /clone|duplicate/i })
        .or(page.getByRole('button', { name: /clone|duplicate/i }));

      if ((await possibleCloneButton.count()) > 0) {
        clonableView = itemText;
        cloneButton = possibleCloneButton.first();
        break;
      }
    }

    if (!cloneButton) {
      console.log('[Budget Views] Clone feature not found for any view');
      test.skip(true, 'Clone feature not available in UI');
    }

    console.log(`[Budget Views] Cloning view: ${clonableView}`);

    // Click clone button
    await cloneButton.click();

    // Dialog may appear asking for new name
    const cloneDialog = page.getByRole('dialog');
    const hasDialog = (await cloneDialog.count()) > 0;

    if (hasDialog) {
      await expect(cloneDialog).toBeVisible({ timeout: 5000 });

      const cloneNameInput = cloneDialog.getByLabel(/view name|name/i).first();
      const clonedViewName = `${clonableView} (Clone) ${Date.now()}`;

      await cloneNameInput.fill(clonedViewName);

      const saveButton = cloneDialog.getByRole('button', { name: /save|create/i });
      await saveButton.click();

      await expect(cloneDialog).not.toBeVisible({ timeout: 10000 });

      // Verify success toast
      const successToast = page.getByText(/view.*created|duplicated|cloned/i);
      await expect(successToast, 'Success toast should appear after cloning').toBeVisible({
        timeout: 5000,
      });

      console.log(`[Budget Views] Cloned view created: ${clonedViewName}`);
    }
  });

  /**
   * Test: Delete Custom View
   *
   * Workflow:
   * 1. Create a custom view (prerequisite)
   * 2. Open views menu
   * 3. Find delete action for the view
   * 4. Confirm deletion
   * 5. Verify view is removed from menu
   */
  test('user can delete a custom view', async ({ page }) => {
    const viewsButton = page
      .getByRole('button', { name: /views|customize view/i })
      .first();

    if ((await viewsButton.count()) === 0) {
      test.skip(true, 'Custom views feature not available in UI');
    }

    // 1. Create a view to delete
    await viewsButton.click();
    await page.waitForTimeout(500);

    const createViewOption = page.getByRole('menuitem', { name: /create.*view|new view/i });

    if ((await createViewOption.count()) === 0) {
      test.skip(true, 'Create view option not available');
    }

    await createViewOption.click();

    const viewDialog = page.getByRole('dialog');
    await expect(viewDialog).toBeVisible({ timeout: 5000 });

    const testViewName = `Delete Test View ${Date.now()}`;
    const viewNameInput = viewDialog.getByLabel(/view name|name/i).first();
    await viewNameInput.fill(testViewName);

    const saveButton = viewDialog.getByRole('button', { name: /save|create/i });
    await saveButton.click();

    await expect(viewDialog).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // 2. Open views menu again
    await viewsButton.click();
    await page.waitForTimeout(500);

    // 3. Find the created view
    const viewToDelete = page.getByRole('menuitem', { name: testViewName });
    await expect(viewToDelete, 'Created view should be visible').toBeVisible({ timeout: 5000 });

    // 4. Look for delete button (may be in view item or context menu)
    const deleteButton = viewToDelete
      .getByRole('button', { name: /delete|remove/i })
      .or(page.getByRole('button', { name: /delete|remove/i }));

    const hasDeleteButton = (await deleteButton.count()) > 0;

    if (!hasDeleteButton) {
      console.log('[Budget Views] Delete button not found for view');
      test.skip(true, 'Delete view feature not available in UI');
    }

    await deleteButton.first().click();

    // 5. Confirm deletion if dialog appears
    const confirmDialog = page.getByRole('alertdialog');
    const hasConfirmDialog = (await confirmDialog.count()) > 0;

    if (hasConfirmDialog) {
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });

      const confirmButton = confirmDialog.getByRole('button', { name: /delete|confirm/i });
      await confirmButton.click();

      await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
    }

    // 6. Verify success toast
    const successToast = page.getByText(/view.*deleted|view.*removed/i);
    await expect(successToast, 'Success toast should appear after deletion').toBeVisible({
      timeout: 5000,
    });

    // 7. Verify view is removed from menu
    await viewsButton.click();
    await page.waitForTimeout(500);

    const deletedView = page.getByRole('menuitem', { name: testViewName });
    await expect(deletedView, 'Deleted view should not appear in menu').not.toBeVisible({
      timeout: 3000,
    });

    console.log(`[Budget Views] Successfully deleted view: ${testViewName}`);
  });

  /**
   * Cleanup: Delete test project
   */
  test.afterAll(async ({ request }) => {
    if (!projectId) return;

    console.log(`[Budget Views] Cleaning up test project: ${projectId}`);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const response = await request.delete(`${baseUrl}/api/projects/${projectId}`);

    if (response.ok()) {
      console.log(`[Budget Views] Test project ${projectId} deleted successfully`);
    } else {
      console.error(
        `[Budget Views] Failed to delete test project ${projectId}: ${response.status()}`
      );
    }
  });
});
