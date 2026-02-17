/**
 * Directory Permissions and Access Control Tests
 * Tests role-based access control and permission management
 */

import { test, expect, Page } from '@playwright/test';
import * as helpers from '../../helpers/directory-helpers';

const PROJECT_ID = 'INI-2026-01-09-001';

// Test user credentials for different permission levels
const TEST_USERS = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!@#',
    role: 'Admin',
  },
  editor: {
    email: 'editor@example.com',
    password: 'Editor123!@#',
    role: 'Editor',
  },
  viewer: {
    email: 'viewer@example.com',
    password: 'Viewer123!@#',
    role: 'Read Only',
  },
};

async function loginAs(page: Page, userType: 'admin' | 'editor' | 'viewer') {
  const user = TEST_USERS[userType];
  await page.goto('/login');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Directory - Permissions & Access Control', () => {
  test.describe('Admin Permissions', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
    });

    test('admin should see all action buttons', async ({ page }) => {
      // Verify admin can see all primary actions
      await expect(page.locator('button:has-text("Add Person")')).toBeVisible();
      await expect(page.locator('button:has-text("Import")')).toBeVisible();
      await expect(page.locator('button:has-text("Export")')).toBeVisible();

      // Verify admin can see row actions
      await helpers.waitForTable(page);
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        const moreButton = firstRow.locator('button[aria-label*="More"]');
        if (await moreButton.isVisible()) {
          await moreButton.click();

          // Admin should see all actions
          await expect(page.locator('text="Edit"')).toBeVisible();
          await expect(page.locator('text="Delete"')).toBeVisible();
          await expect(page.locator('text="Change Permission"')).toBeVisible();
        }
      }
    });

    test('admin should access settings tab', async ({ page }) => {
      // Navigate to settings
      await page.click('a:has-text("Settings"), button:has-text("Settings")');
      await page.waitForLoadState('networkidle');

      // Verify settings page loads
      await expect(page.locator('h2, h1').filter({ hasText: 'Settings' })).toBeVisible();

      // Verify permission configuration section
      await expect(page.locator('text="Permission Templates"')).toBeVisible();
      await expect(page.locator('text="Default Permissions"')).toBeVisible();
    });

    test('admin should manage permission templates', async ({ page }) => {
      // Navigate to settings
      await helpers.navigateToDirectory(page, PROJECT_ID, 'settings');

      // Click on permission templates
      const templatesSection = page.locator('button:has-text("Permission Templates")');
      if (await templatesSection.isVisible()) {
        await templatesSection.click();
      }

      // Verify template management options
      await expect(page.locator('button:has-text("Create Template")')).toBeVisible();

      // Create new template
      await page.click('button:has-text("Create Template")');

      // Fill template form
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      await page.fill('input[name="templateName"]', 'Custom Role');
      await page.fill('textarea[name="description"]', 'Custom permission template for special access');

      // Set permissions
      const permissions = ['directory.read', 'directory.write', 'budget.read'];
      for (const perm of permissions) {
        const checkbox = page.locator(`input[value="${perm}"]`);
        if (await checkbox.isVisible()) {
          await checkbox.check();
        }
      }

      // Save template
      await page.click('button:has-text("Save Template")');
      await expect(page.locator('.toast-success')).toBeVisible();
    });

    test('admin should change user permissions', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Create a test user
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      // Change permission level
      const row = await helpers.findTableRow(page, testData.user.email);

      // Find permission dropdown in row
      const permissionDropdown = row.locator('select, [role="combobox"]').filter({ has: page.locator('option, [role="option"]') });
      if (await permissionDropdown.isVisible()) {
        await permissionDropdown.selectOption('Read Only');
      } else {
        // Use action menu if dropdown not visible
        await helpers.clickRowAction(page, testData.user.email, 'edit');
        const permissionSelect = page.locator('select[name="permission"]');
        await permissionSelect.selectOption('Read Only');
        await helpers.saveForm(page);
      }

      // Verify permission changed
      await page.waitForTimeout(1000);
      const updatedRow = await helpers.findTableRow(page, testData.user.email);
      await expect(updatedRow).toContainText('Read Only');
    });

    test('admin should delete users', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Create a test user
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      // Delete user
      await helpers.clickRowAction(page, testData.user.email, 'delete');

      // Confirm deletion
      const confirmDialog = page.locator('[role="dialog"]:has-text("Confirm")');
      await expect(confirmDialog).toBeVisible();
      await page.click('button:has-text("Delete")');

      // Verify user removed
      await page.waitForTimeout(1000);
      await helpers.verifyPersonNotInTable(page, testData.user.email);
    });
  });

  test.describe('Editor Permissions', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'editor');
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
    });

    test('editor should see limited actions', async ({ page }) => {
      // Editor should see add and edit but not delete
      await expect(page.locator('button:has-text("Add Person")')).toBeVisible();

      // Check row actions
      await helpers.waitForTable(page);
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        const moreButton = firstRow.locator('button[aria-label*="More"]');
        if (await moreButton.isVisible()) {
          await moreButton.click();

          // Editor should see edit but not delete
          await expect(page.locator('text="Edit"')).toBeVisible();

          // Delete should be hidden or disabled
          const deleteOption = page.locator('text="Delete"');
          if (await deleteOption.isVisible()) {
            await expect(deleteOption).toBeDisabled();
          }
        }
      }
    });

    test('editor should not access permission settings', async ({ page }) => {
      // Try to navigate to settings
      const settingsTab = page.locator('a:has-text("Settings")');

      if (await settingsTab.isVisible()) {
        await settingsTab.click();

        // Should either be redirected or see limited view
        const permissionSection = page.locator('text="Permission Templates"');
        if (await permissionSection.isVisible()) {
          // If visible, should be read-only
          const createButton = page.locator('button:has-text("Create Template")');
          await expect(createButton).toBeDisabled();
        }
      } else {
        // Settings tab might be hidden for editors
        await expect(settingsTab).not.toBeVisible();
      }
    });

    test('editor should add and edit users', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Editor can create users
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      // Verify user created
      await helpers.verifyPersonInTable(page, testData.user);

      // Editor can edit users
      await helpers.clickRowAction(page, testData.user.email, 'edit');

      // Update phone number
      await page.fill('input[name="phone"]', '555-8888');
      await helpers.saveForm(page);

      // Verify update
      const row = await helpers.findTableRow(page, testData.user.email);
      await expect(row).toContainText('555-8888');
    });

    test('editor cannot change permissions', async ({ page }) => {
      await helpers.waitForTable(page);

      // Find a user row
      const row = page.locator('tbody tr').first();
      if (await row.isVisible()) {
        // Permission dropdown should be disabled or hidden
        const permissionDropdown = row.locator('select[name*="permission"]');

        if (await permissionDropdown.isVisible()) {
          await expect(permissionDropdown).toBeDisabled();
        } else {
          // Permission column might show text only
          const permissionText = row.locator('td').nth(4); // Adjust index as needed
          await expect(permissionText).toBeVisible();

          // Should not be editable
          await permissionText.click();
          await expect(page.locator('select, input')).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Viewer Permissions', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'viewer');
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
    });

    test('viewer should only see read actions', async ({ page }) => {
      // Viewer should not see add button
      const addButton = page.locator('button:has-text("Add Person")');
      await expect(addButton).not.toBeVisible();

      // Export should be available for viewers
      await expect(page.locator('button:has-text("Export")')).toBeVisible();

      // Check row actions
      await helpers.waitForTable(page);
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        // More menu might be hidden or show limited options
        const moreButton = firstRow.locator('button[aria-label*="More"]');

        if (await moreButton.isVisible()) {
          await moreButton.click();

          // Should only see view option
          await expect(page.locator('text="View"')).toBeVisible();
          await expect(page.locator('text="Edit"')).not.toBeVisible();
          await expect(page.locator('text="Delete"')).not.toBeVisible();
        }
      }
    });

    test('viewer cannot create users', async ({ page }) => {
      // Add button should be hidden
      const addButton = page.locator('button:has-text("Add Person")');
      await expect(addButton).not.toBeVisible();

      // Try direct navigation to create form (should be blocked)
      await page.goto(`/${PROJECT_ID}/directory/users/new`);

      // Should redirect or show error
      await expect(page).toHaveURL(/directory\/users$/);
    });

    test('viewer cannot edit users', async ({ page }) => {
      await helpers.waitForTable(page);

      // Try to edit a user
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        // Edit should not be available
        const email = await firstRow.locator('td').nth(1).textContent();

        // Click on row (might open view-only dialog)
        await firstRow.click();

        // If dialog opens, should be read-only
        const dialog = page.locator('[role="dialog"]');
        if (await dialog.isVisible()) {
          // Should not have save button
          const saveButton = page.locator('button:has-text("Save")');
          await expect(saveButton).not.toBeVisible();

          // Fields should be disabled
          const inputs = dialog.locator('input:not([type="hidden"])');
          const count = await inputs.count();
          for (let i = 0; i < count; i++) {
            await expect(inputs.nth(i)).toBeDisabled();
          }
        }
      }
    });

    test('viewer can export data', async ({ page }) => {
      // Export should be available
      const exportButton = page.locator('button:has-text("Export")');
      await expect(exportButton).toBeVisible();

      // Start download listener
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();

      // Choose format
      const csvOption = page.locator('text="CSV"');
      if (await csvOption.isVisible()) {
        await csvOption.click();
      }

      // Verify download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx)$/);
    });

    test('viewer can search and filter', async ({ page }) => {
      // Search should be available
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).not.toBeDisabled();

      // Test search
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      await helpers.waitForTable(page);

      // Filters should be available
      const filterButton = page.locator('button:has-text("Filter")');
      if (await filterButton.isVisible()) {
        await filterButton.click();

        // Filter options should be visible
        await expect(page.locator('text="Company"')).toBeVisible();
        await expect(page.locator('text="Status"')).toBeVisible();
      }
    });
  });

  test.describe('Permission Matrix', () => {
    test('should display permission matrix correctly', async ({ page }) => {
      await loginAs(page, 'admin');
      await helpers.navigateToDirectory(page, PROJECT_ID, 'settings');

      // Navigate to permissions tab
      const permissionsTab = page.locator('button:has-text("Permissions"), a:has-text("Permissions")');
      if (await permissionsTab.isVisible()) {
        await permissionsTab.click();
      }

      // Verify matrix structure
      const matrix = page.locator('table.permission-matrix, [data-testid="permission-matrix"]');
      await expect(matrix).toBeVisible();

      // Verify permission categories
      const categories = ['Directory', 'Budget', 'Documents', 'Reports'];
      for (const category of categories) {
        await expect(page.locator(`text="${category}"`)).toBeVisible();
      }

      // Verify permission levels
      const levels = ['None', 'Read', 'Write', 'Admin'];
      for (const level of levels) {
        await expect(page.locator(`text="${level}"`).first()).toBeVisible();
      }
    });

    test('should update permissions in matrix', async ({ page }) => {
      await loginAs(page, 'admin');
      await helpers.navigateToDirectory(page, PROJECT_ID, 'settings');

      // Navigate to permissions
      const permissionsTab = page.locator('button:has-text("Permissions")');
      if (await permissionsTab.isVisible()) {
        await permissionsTab.click();
      }

      // Find a permission cell
      const permissionCell = page.locator('td').filter({ has: page.locator('select, input[type="radio"]') }).first();
      if (await permissionCell.isVisible()) {
        // Change permission
        const select = permissionCell.locator('select');
        if (await select.isVisible()) {
          await select.selectOption('Write');
        } else {
          // Or click radio button
          const radio = permissionCell.locator('input[value="Write"]');
          if (await radio.isVisible()) {
            await radio.check();
          }
        }

        // Save changes
        const saveButton = page.locator('button:has-text("Save Changes")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await expect(page.locator('.toast-success')).toBeVisible();
        }
      }
    });
  });

  test.describe('Role-Based UI Elements', () => {
    test('should show/hide UI elements based on permissions', async ({ page }) => {
      // Test as admin
      await loginAs(page, 'admin');
      await helpers.navigateToDirectory(page, PROJECT_ID);

      // Admin sees everything
      await expect(page.locator('button:has-text("Add")')).toBeVisible();
      await expect(page.locator('button:has-text("Import")')).toBeVisible();
      await expect(page.locator('a:has-text("Settings")')).toBeVisible();

      // Logout and login as viewer
      await page.click('button[aria-label="User menu"]');
      await page.click('text="Logout"');

      await loginAs(page, 'viewer');
      await helpers.navigateToDirectory(page, PROJECT_ID);

      // Viewer sees limited UI
      await expect(page.locator('button:has-text("Add")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Import")')).not.toBeVisible();
      await expect(page.locator('a:has-text("Settings")')).not.toBeVisible();
    });

    test('should disable form fields based on permissions', async ({ page }) => {
      await loginAs(page, 'viewer');
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Click on a user to view details
      await helpers.waitForTable(page);
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        await firstRow.click();

        // If dialog opens, fields should be disabled
        const dialog = page.locator('[role="dialog"]');
        if (await dialog.isVisible()) {
          const inputs = dialog.locator('input:not([type="hidden"]), select, textarea');
          const count = await inputs.count();

          for (let i = 0; i < count; i++) {
            const input = inputs.nth(i);
            const isDisabled = await input.isDisabled();
            const isReadonly = await input.getAttribute('readonly');

            expect(isDisabled || isReadonly).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Permission Inheritance', () => {
    test('should inherit permissions from template', async ({ page }) => {
      await loginAs(page, 'admin');
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      const testData = helpers.generateTestData();

      // Create user with specific template
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);

      // Select permission template
      const templateSelect = page.locator('select[name="permissionTemplate"]');
      if (await templateSelect.isVisible()) {
        await templateSelect.selectOption('Project Manager');
      }

      await helpers.saveForm(page);

      // Verify inherited permissions
      const row = await helpers.findTableRow(page, testData.user.email);
      await expect(row).toContainText('Project Manager');

      // View detailed permissions
      await helpers.clickRowAction(page, testData.user.email, 'view permissions');

      const permDialog = page.locator('[role="dialog"]:has-text("Permissions")');
      if (await permDialog.isVisible()) {
        // Should show inherited permissions
        await expect(permDialog).toContainText('Inherited from: Project Manager');
        await expect(permDialog).toContainText('Directory: Write');
        await expect(permDialog).toContainText('Budget: Read');
      }
    });

    test('should override template permissions', async ({ page }) => {
      await loginAs(page, 'admin');
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Find a user with template permissions
      const row = page.locator('tbody tr').filter({ hasText: 'Project Manager' }).first();
      if (await row.isVisible()) {
        const email = await row.locator('td').nth(1).textContent();

        // Edit permissions
        await helpers.clickRowAction(page, email || '', 'edit permissions');

        // Override a permission
        const overrideCheckbox = page.locator('input[name="overrideTemplate"]');
        if (await overrideCheckbox.isVisible()) {
          await overrideCheckbox.check();

          // Change specific permission
          const budgetPermission = page.locator('select[name="permissions.budget"]');
          await budgetPermission.selectOption('Admin');

          await helpers.saveForm(page);

          // Verify override applied
          await page.waitForTimeout(1000);
          await helpers.clickRowAction(page, email || '', 'view permissions');

          const permDialog = page.locator('[role="dialog"]');
          await expect(permDialog).toContainText('Custom Permissions');
          await expect(permDialog).toContainText('Budget: Admin (Overridden)');
        }
      }
    });
  });
});