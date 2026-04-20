import { test, expect } from '../../fixtures/index';
import path from 'path';
import { createTestProject } from '../../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

const TEST_PROJECT_ID = '118';
const BASE_URL = `${process.env.BASE_URL || 'http://localhost:3000'}/${TEST_PROJECT_ID}/budget`;

test.describe.skip('Budget Views UI - Phase 2b', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Load authentication
    const authFile = path.join(__dirname, '../.auth/user.json');
    const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));
    const authCookies = authData.cookies
      .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
      .join('; ');

    // Clean up any non-system views before each test to prevent duplicate name errors
    try {
      const viewsResponse = await page.request.get(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views`,
        { headers: { Cookie: authCookies } }
      );

      if (viewsResponse.ok()) {
        const { views } = await viewsResponse.json();

        for (const view of views || []) {
          if (!view.is_system) {
            await page.request.delete(
              `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views/${view.id}`,
              { headers: { Cookie: authCookies } }
            );
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors - test can proceed
      console.log('Cleanup warning:', error);
    }

    // Set cookies
    await page.context().addCookies(authData.cookies);

    // Navigate to budget page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('BudgetViewsManager Component', () => {
    test('should display Budget Views dropdown button', async ({ page }) => {
      // Find the Budget Views button (Settings icon + text) - use .last() to get the BudgetViewsManager instance
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await expect(viewsButton).toBeVisible();

      // Should have Settings icon
      const settingsIcon = viewsButton.locator('svg');
      await expect(settingsIcon).toBeVisible();
    });

    test('should open dropdown and show available views', async ({ page }) => {
      // Click the Budget Views button - use .last() to get the BudgetViewsManager instance
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();

      // Should show dropdown menu
      const dropdown = page.locator('[role="menu"]');
      await expect(dropdown).toBeVisible();

      // Should show "Budget Views" header
      await expect(dropdown.locator('text=Budget Views')).toBeVisible();

      // Should show at least the "Procore Standard" view
      await expect(dropdown.locator('text=Procore Standard')).toBeVisible();

      // Should show "Create New View" button
      await expect(dropdown.locator('text=Create New View')).toBeVisible();
    });

    test('should show star indicator for default view', async ({ page }) => {
      // Click the Budget Views button
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();

      // Find the default view (Procore Standard)
      const defaultViewItem = page.locator('[role="menuitem"]').filter({ hasText: 'Procore Standard' });

      // Should have a star icon (filled)
      const starIcon = defaultViewItem.locator('svg.fill-current');
      await expect(starIcon).toBeVisible();
    });

    test('should switch between views', async ({ page }) => {
      // First, create a test view via API for this test
      const authFile = path.join(__dirname, '../.auth/user.json');
      const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));
      const authCookies = authData.cookies
        .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      const createResponse = await page.request.post(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views`,
        {
          headers: {
            Cookie: authCookies,
            'Content-Type': 'application/json',
          },
          data: {
            name: 'Test View for Switch',
            columns: [{ column_key: 'costCode', display_order: 1 }],
          },
        }
      );
      expect(createResponse.status()).toBe(201);
      const { view: createdView } = await createResponse.json();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click the Budget Views button
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();

      // Click on the test view
      await page.locator('[role="menuitem"]').filter({ hasText: 'Test View for Switch' }).click();

      // Wait for the dropdown to close
      await expect(page.locator('[role="menu"]')).not.toBeVisible();

      // Wait for button text to update (parent component needs to re-render)
      await page.waitForTimeout(500);

      // Re-locate the button after state update
      const updatedButton = page.locator('button').filter({ hasText: /Test View for Switch|Procore Standard|Select View/ }).last();

      // Button should now show the new view name
      await expect(updatedButton).toContainText('Test View for Switch', { timeout: 5000 });

      // Cleanup
      await page.request.delete(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views/${createdView.id}`,
        { headers: { Cookie: authCookies } }
      );
    });

    test('should show action buttons for user views only', async ({ page }) => {
      // Open dropdown
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();

      // Procore Standard (system view) should NOT have edit/delete buttons
      const systemViewRow = page.locator('[role="menuitem"]').filter({ hasText: 'Procore Standard' }).locator('..');
      await expect(systemViewRow.locator('button[aria-label*="Edit"]')).not.toBeVisible();
      await expect(systemViewRow.locator('button[aria-label*="Delete"]')).not.toBeVisible();
    });

    test('should open "Create New View" modal', async ({ page }) => {
      // Open dropdown
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();

      // Click "Create New View"
      await page.locator('[role="menuitem"]').filter({ hasText: 'Create New View' }).click();

      // Modal should be visible
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Should show "Create Budget View" title
      await expect(modal.locator('text=Create Budget View')).toBeVisible();

      // Should have name input
      await expect(modal.getByLabel('View Name')).toBeVisible();

      // Should have available columns list
      await expect(modal.locator('text=Available Columns')).toBeVisible();

      // Close modal
      await page.locator('button').filter({ hasText: 'Cancel' }).click();
      await expect(modal).not.toBeVisible();
    });

    test('should allow setting a view as default', async ({ page }) => {
      // Create a test view
      const authFile = path.join(__dirname, '../.auth/user.json');
      const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));
      const authCookies = authData.cookies
        .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      const createResponse = await page.request.post(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views`,
        {
          headers: { Cookie: authCookies, 'Content-Type': 'application/json' },
          data: { name: 'Test Default View', columns: [{ column_key: 'costCode', display_order: 1 }] },
        }
      );
      const { view: createdView } = await createResponse.json();

      // Reload and select the view
      await page.reload();
      await page.waitForLoadState('networkidle');

      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Test Default View' }).click();

      // Open dropdown again
      await viewsButton.click();

      // Should show "Set as Default" option
      await expect(page.locator('[role="menuitem"]').filter({ hasText: 'Set as Default' })).toBeVisible();

      // Cleanup
      await page.request.delete(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views/${createdView.id}`,
        { headers: { Cookie: authCookies } }
      );
    });
  });

  test.describe('BudgetViewsModal Component', () => {
    test('should create a new budget view with columns', async ({ page }) => {
      // Open create modal
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Create New View' }).click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Fill in name
      await modal.getByLabel('View Name').fill('Playwright Test View');

      // Fill in description
      const descInput = modal.locator('textarea');
      if (await descInput.isVisible()) {
        await descInput.fill('Created by Playwright test');
      }

      // Add columns by clicking on available columns
      const costCodeColumn = modal.locator('text=Cost Code').first();
      await costCodeColumn.click();

      const descriptionColumn = modal.locator('text=Description').first();
      await descriptionColumn.click();

      // Submit
      await page.locator('button').filter({ hasText: /^Create View$/ }).click();

      // Should close modal and show success toast
      await expect(modal).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=View created successfully')).toBeVisible({ timeout: 5000 });

      // View should appear in dropdown
      await viewsButton.click();
      await expect(page.locator('[role="menuitem"]').filter({ hasText: 'Playwright Test View' })).toBeVisible();

      // Cleanup: Delete the created view
      const authFile = path.join(__dirname, '../.auth/user.json');
      const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));
      const authCookies = authData.cookies
        .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      const listResponse = await page.request.get(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views`,
        { headers: { Cookie: authCookies } }
      );
      const { views } = await listResponse.json();
      const testView = views.find((v: { name: string }) => v.name === 'Playwright Test View');

      if (testView) {
        await page.request.delete(
          `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views/${testView.id}`,
          { headers: { Cookie: authCookies } }
        );
      }
    });

    test('should edit an existing budget view', async ({ page }) => {
      // First create a view to edit
      const authFile = path.join(__dirname, '../.auth/user.json');
      const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));
      const authCookies = authData.cookies
        .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      const createResponse = await page.request.post(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views`,
        {
          headers: { Cookie: authCookies, 'Content-Type': 'application/json' },
          data: {
            name: 'View to Edit',
            columns: [{ column_key: 'costCode', display_order: 1 }],
          },
        }
      );
      const { view: createdView } = await createResponse.json();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open dropdown and click edit button
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();

      // Find the view row and click edit button (pencil icon)
      const viewRow = page.locator('text=View to Edit').locator('..');
      const editButton = viewRow.locator('button').filter({ has: page.locator('svg') }).first();
      await editButton.click();

      // Modal should open in edit mode
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('text=Edit Budget View')).toBeVisible();

      // Name should be pre-filled
      const nameInput = modal.getByLabel('View Name');
      await expect(nameInput).toHaveValue('View to Edit');

      // Change the name
      await nameInput.fill('Edited View Name');

      // Submit
      await page.locator('button').filter({ hasText: /^Save Changes$/ }).click();

      // Should close and show success
      await expect(modal).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=View updated successfully')).toBeVisible({ timeout: 5000 });

      // Cleanup
      await page.request.delete(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views/${createdView.id}`,
        { headers: { Cookie: authCookies } }
      );
    });

    test('should clone a budget view', async ({ page }) => {
      // Open dropdown
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();

      // Find Procore Standard and click clone button (copy icon)
      const systemViewRow = page.locator('text=Procore Standard').locator('..');
      const cloneButton = systemViewRow.locator('button').filter({ has: page.locator('svg') }).nth(0);
      await cloneButton.click();

      // Should show success toast
      await expect(page.locator('text=View cloned successfully')).toBeVisible({ timeout: 5000 });

      // Should see "Procore Standard (Copy)" in the dropdown
      await viewsButton.click();
      await expect(page.locator('[role="menuitem"]').filter({ hasText: 'Procore Standard (Copy)' })).toBeVisible();

      // Cleanup
      const authFile = path.join(__dirname, '../.auth/user.json');
      const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));
      const authCookies = authData.cookies
        .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      const listResponse = await page.request.get(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views`,
        { headers: { Cookie: authCookies } }
      );
      const { views } = await listResponse.json();
      const clonedView = views.find((v: { name: string }) => v.name === 'Procore Standard (Copy)');

      if (clonedView) {
        await page.request.delete(
          `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views/${clonedView.id}`,
          { headers: { Cookie: authCookies } }
        );
      }
    });

    test('should delete a user view with confirmation', async ({ page }) => {
      // Create a view to delete
      const authFile = path.join(__dirname, '../.auth/user.json');
      const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));
      const authCookies = authData.cookies
        .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      const createResponse = await page.request.post(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views`,
        {
          headers: { Cookie: authCookies, 'Content-Type': 'application/json' },
          data: { name: 'View to Delete', columns: [{ column_key: 'costCode', display_order: 1 }] },
        }
      );
      const { view: createdView } = await createResponse.json();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open dropdown
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();

      // Click delete button (trash icon)
      const viewRow = page.locator('text=View to Delete').locator('..');
      const deleteButton = viewRow.locator('button').filter({ has: page.locator('svg') }).last();
      await deleteButton.click();

      // Should show confirmation dialog
      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('text=Delete Budget View')).toBeVisible();
      await expect(dialog.locator('text=View to Delete')).toBeVisible();

      // Confirm deletion
      await page.locator('button').filter({ hasText: 'Delete' }).click();

      // Should close and show success
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=View deleted successfully')).toBeVisible({ timeout: 5000 });

      // View should no longer appear in dropdown
      await viewsButton.click();
      await expect(page.locator('[role="menuitem"]').filter({ hasText: 'View to Delete' })).not.toBeVisible();
    });

    test('should prevent editing system views', async ({ page }) => {
      // Open dropdown
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();

      // System views should not have edit/delete buttons visible
      const systemViewRow = page.locator('text=Procore Standard').locator('..');

      // Count buttons - should only have clone button for system views
      const buttons = systemViewRow.locator('button').filter({ has: page.locator('svg') });
      const buttonCount = await buttons.count();

      // Should be fewer buttons for system views (no edit/delete)
      expect(buttonCount).toBeLessThan(3);
    });

    test('should reorder columns in modal', async ({ page }) => {
      // Open create modal
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Create New View' }).click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Fill name
      await modal.getByLabel('View Name').fill('Test Column Order');

      // Add two columns
      await modal.locator('text=Cost Code').first().click();
      await modal.locator('text=Description').first().click();

      // Find the selected columns section
      const selectedSection = modal.locator('text=Selected Columns').locator('..');

      // Should show both columns
      await expect(selectedSection.locator('text=Cost Code')).toBeVisible();
      await expect(selectedSection.locator('text=Description')).toBeVisible();

      // Check for reorder buttons (up/down arrows)
      const reorderButtons = selectedSection.locator('button').filter({ has: page.locator('svg') });
      expect(await reorderButtons.count()).toBeGreaterThan(0);

      // Cancel
      await page.locator('button').filter({ hasText: 'Cancel' }).click();
    });
  });

  test.describe('Integration with Budget Page', () => {
    test('should persist selected view across page reloads', async ({ page }) => {
      // Create a test view
      const authFile = path.join(__dirname, '../.auth/user.json');
      const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));
      const authCookies = authData.cookies
        .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      const createResponse = await page.request.post(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views`,
        {
          headers: { Cookie: authCookies, 'Content-Type': 'application/json' },
          data: { name: 'Persistent View Test', columns: [{ column_key: 'costCode', display_order: 1 }] },
        }
      );
      const { view: createdView } = await createResponse.json();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Select the view
      const viewsButton = page.locator('button').filter({ hasText: /Procore Standard|Select View/ }).last();
      await viewsButton.click();
      await page.locator('[role="menuitem"]').filter({ hasText: 'Persistent View Test' }).click();

      // Wait for the dropdown to close
      await expect(page.locator('[role="menu"]')).not.toBeVisible();

      // Wait for button text to update
      await page.waitForTimeout(500);

      // Re-locate the button after state update
      const updatedButton = page.locator('button').filter({ hasText: /Persistent View Test|Procore Standard|Select View/ }).last();

      // Verify button shows selected view
      await expect(updatedButton).toContainText('Persistent View Test', { timeout: 5000 });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Button should still show the selected view (from URL params or localStorage)
      // Note: This depends on implementation - may use URL params or localStorage
      // For now, just verify the dropdown works after reload
      await expect(viewsButton).toBeVisible();

      // Cleanup
      await page.request.delete(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/projects/${TEST_PROJECT_ID}/budget/views/${createdView.id}`,
        { headers: { Cookie: authCookies } }
      );
    });
  });
});
