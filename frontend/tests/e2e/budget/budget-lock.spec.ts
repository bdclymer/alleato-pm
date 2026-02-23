/**
 * Budget Lock/Unlock E2E Tests
 *
 * Tests the budget locking workflow that prevents unauthorized changes.
 *
 * User Stories:
 * - As a project accountant, I can lock the budget to prevent unauthorized changes
 * - As a project manager, I can unlock the budget to make necessary changes
 *
 * Workflow:
 * 1. Lock the budget
 * 2. Verify all edit operations are blocked
 * 3. Verify lock status is displayed
 * 4. Unlock the budget
 * 5. Verify edit operations work again
 *
 * @see /DOCS_NEED_TO_FILE/BUDGET-E2E-TEST-PLAN.md (Tests 7-8)
 * @see .claude/rules/E2E-TESTING-STANDARDS.md
 */

import { test, expect } from '../../fixtures/index';
import { createTestProject } from '../../helpers/bootstrap';

let projectId: number;

test.describe('Budget Lock/Unlock Workflow', () => {
  test.beforeAll(async ({ page, authenticatedRequest }) => {
    // Create a test project with budget data
    const project = await createTestProject(page, { template: 'commercial' }, authenticatedRequest);
    projectId = project.project.id;

    console.log(`[Budget Lock] Test project created: ${projectId}`);
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

    // Ensure budget is unlocked at start of each test
    const unlockButton = page.getByRole('button', { name: /unlock budget/i });
    if ((await unlockButton.count()) > 0) {
      await unlockButton.click();
      await page.waitForTimeout(1000);
    }
  });

  /**
   * Test 7: Lock Budget - Prevent Edits
   *
   * User Story: As a project accountant, I can lock the budget to
   * prevent unauthorized changes.
   *
   * Workflow:
   * 1. Lock the budget
   * 2. Verify lock banner appears
   * 3. Attempt to create new line item - should be blocked
   * 4. Attempt to edit existing line item - should be blocked
   * 5. Attempt to delete line item - should be blocked
   */
  test('locking budget prevents all edit operations', async ({ page }) => {
    // 1. Verify "Lock Budget" button exists and click it
    const lockButton = page.getByRole('button', { name: /lock budget/i });
    await expect(lockButton, 'Lock Budget button should be visible').toBeVisible({
      timeout: 5000,
    });
    await lockButton.click();

    // 2. Verify success toast
    const successToast = page.getByText(/budget locked successfully/i);
    await expect(successToast, 'Success toast should appear after locking').toBeVisible({
      timeout: 5000,
    });

    // 3. Verify lock banner appears
    const lockBanner = page.getByText(/budget is locked|locked budget/i).first();
    await expect(lockBanner, 'Lock banner should be visible').toBeVisible({ timeout: 5000 });

    // The banner should show who locked it and when
    const bannerText = await lockBanner.textContent();
    console.log('[Budget Lock] Lock banner text:', bannerText);

    // 4. Attempt to CREATE - should be blocked
    const createButton = page.getByRole('button', { name: /create/i }).first();

    // The create button may be disabled or clicking it may show an error
    const isDisabled = await createButton.isDisabled();

    if (!isDisabled) {
      // If button is not disabled, clicking should show error
      await createButton.click();

      // Look for error toast or message
      const errorMessage = page.getByText(/budget is locked|unlock to add|cannot add/i);
      await expect(
        errorMessage,
        'Error message should appear when trying to create while locked'
      ).toBeVisible({ timeout: 3000 });
    } else {
      console.log('[Budget Lock] Create button is disabled while budget is locked');
    }

    // 5. Attempt to EDIT - should be blocked
    // Find a budget line item row
    const dataRow = page.getByRole('row').filter({ hasText: /\$[\d,]+/ }).first();
    const rowCount = await dataRow.count();

    if (rowCount > 0) {
      // Try to click the row or edit button
      const editButton = dataRow.getByRole('button', { name: /edit/i }).first();

      if ((await editButton.count()) > 0) {
        await editButton.click();

        // Error message should appear
        const editError = page.getByText(/budget is locked|unlock to edit|cannot edit/i);
        await expect(
          editError,
          'Error message should appear when trying to edit while locked'
        ).toBeVisible({ timeout: 3000 });
      } else {
        // Try clicking the row itself
        await dataRow.click();

        // Either modal doesn't open OR error appears
        const editModal = page.getByRole('dialog');
        const editModalVisible = (await editModal.count()) > 0;

        if (editModalVisible) {
          // Modal opened - check for disabled state or error
          const saveButton = editModal.getByRole('button', { name: /save/i });
          const isSaveDisabled = await saveButton.isDisabled();

          expect(
            isSaveDisabled,
            'Save button should be disabled in edit modal when budget is locked'
          ).toBeTruthy();
        }
      }
    }

    // 6. Attempt to DELETE - should be blocked
    // Try to select a row for deletion
    const firstRow = page.getByRole('row').filter({ hasText: /\$[\d,]+/ }).first();
    const checkbox = firstRow.getByRole('checkbox').first();

    if ((await checkbox.count()) > 0) {
      const isCheckboxDisabled = await checkbox.isDisabled();

      if (!isCheckboxDisabled) {
        await checkbox.click();

        // Try to find delete button
        const deleteButton = page.getByRole('button', { name: /delete selected|delete/i });
        const deleteButtonVisible = (await deleteButton.count()) > 0;

        if (deleteButtonVisible) {
          const isDeleteDisabled = await deleteButton.isDisabled();

          if (!isDeleteDisabled) {
            await deleteButton.click();

            // Error should appear
            const deleteError = page.getByText(/budget is locked|unlock to delete|cannot delete/i);
            await expect(
              deleteError,
              'Error message should appear when trying to delete while locked'
            ).toBeVisible({ timeout: 3000 });
          } else {
            console.log('[Budget Lock] Delete button is disabled while budget is locked');
          }
        }
      }
    }

    // 7. Verify lock persists after page reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const persistedBanner = page.getByText(/budget is locked|locked budget/i).first();
    await expect(persistedBanner, 'Lock banner should still be visible after reload').toBeVisible({
      timeout: 10000,
    });
  });

  /**
   * Test 8: Unlock Budget - Restore Edit Capabilities
   *
   * User Story: As a project manager, I can unlock the budget to
   * make necessary changes.
   *
   * Prerequisites: Budget must be locked (from previous test or setup)
   *
   * Workflow:
   * 1. Unlock the budget
   * 2. Verify lock banner disappears
   * 3. Verify create operation works
   * 4. Verify edit operation works
   * 5. Verify delete operation works
   */
  test('unlocking budget restores all edit operations', async ({ page }) => {
    // 1. First lock the budget (setup for unlock test)
    const lockButton = page.getByRole('button', { name: /lock budget/i });
    if ((await lockButton.count()) > 0) {
      await lockButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify locked state
    const lockBanner = page.getByText(/budget is locked/i).first();
    await expect(lockBanner, 'Budget should be locked initially').toBeVisible({ timeout: 5000 });

    // 2. Click "Unlock Budget" button
    const unlockButton = page.getByRole('button', { name: /unlock budget/i });
    await expect(unlockButton, 'Unlock Budget button should be visible').toBeVisible({
      timeout: 5000,
    });
    await unlockButton.click();

    // 3. Verify success toast
    const successToast = page.getByText(/budget unlocked successfully/i);
    await expect(successToast, 'Success toast should appear after unlocking').toBeVisible({
      timeout: 5000,
    });

    // 4. Verify lock banner disappears
    await expect(lockBanner, 'Lock banner should disappear after unlocking').not.toBeVisible({
      timeout: 5000,
    });

    // 5. Verify CREATE operation works
    const createButton = page.getByRole('button', { name: /create/i }).first();
    await expect(createButton, 'Create button should be enabled').toBeEnabled({ timeout: 3000 });
    await createButton.click();

    // Menu should open
    const budgetLineItemOption = page.getByRole('menuitem', { name: /budget line item/i });
    await expect(
      budgetLineItemOption,
      'Budget Line Item option should be visible'
    ).toBeVisible({ timeout: 3000 });
    await budgetLineItemOption.click();

    // Modal should open
    const createModal = page.getByRole('dialog');
    await expect(createModal, 'Create modal should open after unlocking').toBeVisible({
      timeout: 5000,
    });

    // Close modal
    const closeButton = createModal.getByRole('button', { name: /cancel|close/i });
    if ((await closeButton.count()) > 0) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await expect(createModal, 'Modal should close').not.toBeVisible({ timeout: 3000 });

    // 6. Verify EDIT operation works
    const dataRow = page.getByRole('row').filter({ hasText: /\$[\d,]+/ }).first();

    if ((await dataRow.count()) > 0) {
      const editButton = dataRow.getByRole('button', { name: /edit/i }).first();

      if ((await editButton.count()) > 0) {
        await editButton.click();
      } else {
        await dataRow.click();
      }

      // Edit modal should open
      const editModal = page.getByRole('dialog');
      const editModalVisible = (await editModal.count()) > 0;

      if (editModalVisible) {
        await expect(editModal, 'Edit modal should open after unlocking').toBeVisible({
          timeout: 5000,
        });

        // Verify form fields are editable
        const quantityInput = editModal.getByLabel(/quantity/i).first();
        if ((await quantityInput.count()) > 0) {
          const isReadOnly = await quantityInput.getAttribute('readonly');
          expect(isReadOnly, 'Quantity field should not be readonly after unlocking').toBeFalsy();
        }

        // Close modal
        const editCloseButton = editModal.getByRole('button', { name: /cancel|close/i });
        if ((await editCloseButton.count()) > 0) {
          await editCloseButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }

    // 7. Verify DELETE operation works
    const deleteRow = page.getByRole('row').filter({ hasText: /\$[\d,]+/ }).first();
    const deleteCheckbox = deleteRow.getByRole('checkbox').first();

    if ((await deleteCheckbox.count()) > 0) {
      await expect(deleteCheckbox, 'Checkbox should be enabled after unlocking').toBeEnabled({
        timeout: 3000,
      });

      // No need to actually delete, just verify checkbox is clickable
      console.log('[Budget Lock] Delete checkbox is enabled after unlocking');
    }

    // 8. Verify unlock persists after reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Lock banner should NOT be visible
    const reloadedBanner = page.getByText(/budget is locked/i).first();
    await expect(
      reloadedBanner,
      'Lock banner should not reappear after unlocking and reloading'
    ).not.toBeVisible({ timeout: 3000 });

    // Lock button should be visible (not unlock button)
    const reloadedLockButton = page.getByRole('button', { name: /^lock budget$/i });
    await expect(
      reloadedLockButton,
      'Lock Budget button should be visible after unlocking'
    ).toBeVisible({ timeout: 5000 });
  });

  /**
   * Cleanup: Delete test project
   */
  test.afterAll(async ({ page }) => {
    if (!projectId) return;

    console.log(`[Budget Lock] Cleaning up test project: ${projectId}`);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const response = await page.request.delete(`${baseUrl}/api/projects/${projectId}`);

    if (response.ok()) {
      console.log(`[Budget Lock] Test project ${projectId} deleted successfully`);
    } else {
      console.error(`[Budget Lock] Failed to delete test project ${projectId}: ${response.status()}`);
    }
  });
});
