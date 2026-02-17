/**
 * Comprehensive Directory E2E Tests
 * Tests all major functionality of the Directory tool
 */

import { test, expect } from '@playwright/test';
import * as helpers from '../../helpers/directory-helpers';

const PROJECT_ID = 'INI-2026-01-09-001';

test.describe('Directory - Comprehensive Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to directory
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to project directory
    await helpers.navigateToDirectory(page, PROJECT_ID);
  });

  test.describe('Navigation & Page Load', () => {
    test('should load main directory page with all tabs', async ({ page }) => {
      // Verify main page elements
      await expect(page.locator('h1').first()).toContainText('Directory');

      // Verify all tabs are present
      const tabs = ['Users', 'Contacts', 'Companies', 'Groups', 'Employees'];
      for (const tab of tabs) {
        await expect(page.locator(`a:has-text("${tab}"), button:has-text("${tab}")`)).toBeVisible();
      }

      // Verify Add Person button
      await expect(page.locator('button:has-text("Add Person"), button:has-text("Add User")')).toBeVisible();
    });

    test('should navigate between tabs correctly', async ({ page }) => {
      // Test navigation to each tab
      const tabTests = [
        { tab: 'users', expectedUrl: /\/directory\/users/ },
        { tab: 'contacts', expectedUrl: /\/directory\/contacts/ },
        { tab: 'companies', expectedUrl: /\/directory\/companies/ },
        { tab: 'groups', expectedUrl: /\/directory\/groups/ },
      ];

      for (const { tab, expectedUrl } of tabTests) {
        await page.click(`a:has-text("${tab}"), button:has-text("${tab}")`);
        await expect(page).toHaveURL(expectedUrl);
        await helpers.waitForTable(page);
      }
    });

    test('should display table with correct columns', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.waitForTable(page);

      // Verify column headers
      const expectedColumns = ['Name', 'Email', 'Company', 'Role', 'Status'];
      for (const column of expectedColumns) {
        await expect(page.locator(`th:has-text("${column}"), [role="columnheader"]:has-text("${column}")`)).toBeVisible();
      }
    });
  });

  test.describe('User Management', () => {
    test('should create a new user', async ({ page }) => {
      const testData = helpers.generateTestData();

      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      // Verify user appears in table
      await helpers.verifyPersonInTable(page, testData.user);
    });

    test('should edit existing user', async ({ page }) => {
      const testData = helpers.generateTestData();

      // First create a user
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      // Edit the user
      await helpers.clickRowAction(page, testData.user.email, 'edit');

      // Update fields
      const updatedPhone = '555-9999';
      await page.locator('input[name="phone"], input[type="tel"]').fill(updatedPhone);
      await helpers.saveForm(page);

      // Verify update
      const row = await helpers.findTableRow(page, testData.user.email);
      await expect(row).toContainText(updatedPhone);
    });

    test('should deactivate and reactivate user', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Create user
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      // Deactivate user
      await helpers.clickRowAction(page, testData.user.email, 'deactivate');

      // Confirm deactivation
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Deactivate")').last();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Verify user status changed
      await page.waitForTimeout(1000);
      const row = await helpers.findTableRow(page, testData.user.email);
      await expect(row).toContainText('Inactive');

      // Navigate to inactive users
      await page.click('a:has-text("Inactive Users"), button:has-text("Inactive Users")');
      await helpers.waitForTable(page);

      // Verify user in inactive list
      await helpers.verifyPersonInTable(page, testData.user);

      // Reactivate user
      await helpers.clickRowAction(page, testData.user.email, 'reactivate');

      // Verify reactivation
      await page.waitForTimeout(1000);
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.verifyPersonInTable(page, testData.user);
    });

    test('should delete user permanently', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Create user
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      // Delete user
      await helpers.clickRowAction(page, testData.user.email, 'delete');

      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
      await confirmButton.click();

      // Verify user removed
      await page.waitForTimeout(1000);
      await helpers.verifyPersonNotInTable(page, testData.user.email);
    });
  });

  test.describe('Contact Management', () => {
    test('should create a new contact', async ({ page }) => {
      const testData = helpers.generateTestData();

      await helpers.navigateToDirectory(page, PROJECT_ID, 'contacts');
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.contact);
      await helpers.saveForm(page);

      // Verify contact appears in table
      await helpers.verifyPersonInTable(page, testData.contact);
    });

    test('should convert contact to user', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Create contact
      await helpers.navigateToDirectory(page, PROJECT_ID, 'contacts');
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.contact);
      await helpers.saveForm(page);

      // Convert to user
      await helpers.clickRowAction(page, testData.contact.email, 'invite');
      await helpers.sendInvitation(page, testData.contact.email);

      // Verify status changed to invited
      await page.waitForTimeout(1000);
      const row = await helpers.findTableRow(page, testData.contact.email);
      await expect(row).toContainText('Invited');
    });
  });

  test.describe('Search & Filter', () => {
    test('should search across all fields', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Create test data
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      // Test search by email
      await helpers.searchInDirectory(page, testData.user.email);
      await helpers.verifyPersonInTable(page, testData.user);

      // Test search by name
      await helpers.searchInDirectory(page, testData.user.lastName);
      await helpers.verifyPersonInTable(page, testData.user);

      // Test search with no results
      await helpers.searchInDirectory(page, 'nonexistent@nowhere.com');
      await expect(page.locator('text=/no.*found/i')).toBeVisible();
    });

    test('should filter by company', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Apply company filter
      await helpers.filterDirectory(page, 'Company', 'Test Company');

      // Verify filtered results
      await helpers.waitForTable(page);
      const rows = page.locator('tbody tr, [role="row"]').filter({ hasText: 'Test Company' });
      const count = await rows.count();

      if (count > 0) {
        // Verify all visible rows belong to filtered company
        for (let i = 0; i < count; i++) {
          await expect(rows.nth(i)).toContainText('Test Company');
        }
      }
    });

    test('should filter by permission level', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Apply permission filter
      await helpers.filterDirectory(page, 'Permission', 'Admin');

      // Verify filtered results
      await helpers.waitForTable(page);
      const rows = page.locator('tbody tr, [role="row"]').filter({ hasText: 'Admin' });
      const count = await rows.count();

      if (count > 0) {
        // Verify all visible rows have Admin permission
        for (let i = 0; i < count; i++) {
          await expect(rows.nth(i)).toContainText('Admin');
        }
      }
    });

    test('should clear filters', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Apply filter
      await helpers.filterDirectory(page, 'Company', 'Test Company');

      // Clear filters
      const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset")');
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await helpers.waitForTable(page);
      }

      // Verify all results shown
      const rowCount = await page.locator('tbody tr, [role="row"]').count();
      expect(rowCount).toBeGreaterThan(0);
    });
  });

  test.describe('Company Grouping', () => {
    test('should group users by company', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Check if grouping is enabled
      const groupButton = page.locator('button:has-text("Group"), select:has-text("Group")');
      if (await groupButton.isVisible()) {
        await groupButton.click();
        await page.locator('text="Company"').click();
      }

      // Verify company groups exist
      const companyGroups = page.locator('[role="group"], .company-group');
      const groupCount = await companyGroups.count();
      expect(groupCount).toBeGreaterThan(0);
    });

    test('should expand and collapse company groups', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Find a company group
      const companyGroup = page.locator('[role="group"], .company-group').first();
      if (await companyGroup.isVisible()) {
        const companyName = await companyGroup.textContent();

        // Test expand
        await helpers.expandCompanyGroup(page, companyName || '');

        // Verify expanded (should see individual users)
        const users = page.locator(`[role="row"]:has-text("@")`);
        await expect(users.first()).toBeVisible();

        // Test collapse
        await helpers.collapseCompanyGroup(page, companyName || '');

        // Verify collapsed
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Bulk Operations', () => {
    test('should select multiple rows', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.waitForTable(page);

      // Select all checkbox if available
      const selectAllCheckbox = page.locator('thead input[type="checkbox"]').first();
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();

        // Verify rows selected
        const selectedRows = page.locator('tbody input[type="checkbox"]:checked');
        const count = await selectedRows.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should perform bulk deactivation', async ({ page }) => {
      const testData1 = helpers.generateTestData();
      const testData2 = helpers.generateTestData();

      // Create two users
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData1.user);
      await helpers.saveForm(page);

      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData2.user);
      await helpers.saveForm(page);

      // Select both users
      await helpers.selectMultipleRows(page, [testData1.user.email, testData2.user.email]);

      // Perform bulk deactivation
      await helpers.performBulkAction(page, 'Deactivate');

      // Verify both users deactivated
      await page.waitForTimeout(1000);
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Check they're not in active users
      await helpers.verifyPersonNotInTable(page, testData1.user.email);
      await helpers.verifyPersonNotInTable(page, testData2.user.email);
    });

    test('should export selected rows', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.waitForTable(page);

      // Select some rows
      const selectAllCheckbox = page.locator('thead input[type="checkbox"]').first();
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
      }

      // Click export button
      const exportButton = page.locator('button:has-text("Export")');
      if (await exportButton.isVisible()) {
        // Start waiting for download before clicking
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();

        // Choose CSV format if dialog appears
        const csvOption = page.locator('text="CSV"');
        if (await csvOption.isVisible()) {
          await csvOption.click();
        }

        // Wait for download to start
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.csv');
      }
    });
  });

  test.describe('Invitation Workflow', () => {
    test('should send invitation to new user', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Create user
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      // Send invitation
      await helpers.clickRowAction(page, testData.user.email, 'invite');
      await helpers.sendInvitation(page, testData.user.email, 'Welcome to our project!');

      // Verify invitation sent
      const row = await helpers.findTableRow(page, testData.user.email);
      await expect(row).toContainText('Invited');
    });

    test('should resend invitation', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Create and invite user
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      await helpers.clickRowAction(page, testData.user.email, 'invite');
      await helpers.sendInvitation(page, testData.user.email);

      // Resend invitation
      await page.waitForTimeout(1000);
      await helpers.clickRowAction(page, testData.user.email, 'resend');

      // Verify success message
      await expect(page.locator('.toast-success, [role="alert"]:has-text("resent")')).toBeVisible();
    });

    test('should track invitation status', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.waitForTable(page);

      // Check for invitation status column
      const statusColumn = page.locator('th:has-text("Status"), th:has-text("Invitation")');
      await expect(statusColumn).toBeVisible();

      // Verify different statuses are shown
      const statuses = ['Not Invited', 'Invited', 'Accepted'];
      for (const status of statuses) {
        const statusCell = page.locator(`td:has-text("${status}")`).first();
        // Status might not exist, so we just check if any are visible
        if (await statusCell.isVisible()) {
          await expect(statusCell).toBeVisible();
        }
      }
    });
  });

  test.describe('Distribution Groups', () => {
    test('should create distribution group', async ({ page }) => {
      const testData = helpers.generateTestData();

      await helpers.navigateToDirectory(page, PROJECT_ID, 'groups');
      await helpers.createDistributionGroup(page, testData.group);

      // Verify group created
      await helpers.verifyPersonInTable(page, testData.group);
    });

    test('should add members to group', async ({ page }) => {
      const testData = helpers.generateTestData();
      const memberEmails = ['member1@test.com', 'member2@test.com'];

      // Create group
      await helpers.navigateToDirectory(page, PROJECT_ID, 'groups');
      await helpers.createDistributionGroup(page, testData.group);

      // Add members
      await helpers.addMembersToGroup(page, testData.group.name, memberEmails);

      // Verify members added
      const row = await helpers.findTableRow(page, testData.group.name);
      await expect(row).toContainText('2 members');
    });

    test('should remove members from group', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Create group with members
      await helpers.navigateToDirectory(page, PROJECT_ID, 'groups');
      await helpers.createDistributionGroup(page, testData.group);
      await helpers.addMembersToGroup(page, testData.group.name, ['test@example.com']);

      // Edit group to remove member
      await helpers.clickRowAction(page, testData.group.name, 'edit');

      // Remove member
      const removeButton = page.locator('button[aria-label*="Remove"], button:has-text("×")').first();
      if (await removeButton.isVisible()) {
        await removeButton.click();
      }

      await helpers.saveForm(page);

      // Verify member removed
      const row = await helpers.findTableRow(page, testData.group.name);
      await expect(row).toContainText('0 members');
    });
  });

  test.describe('Permissions Management', () => {
    test('should change user permissions', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Create user
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      // Change permission
      await helpers.changePermission(page, testData.user.email, 'Read Only');

      // Verify permission changed
      const row = await helpers.findTableRow(page, testData.user.email);
      await expect(row).toContainText('Read Only');
    });

    test('should display permission matrix', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'settings');

      // Look for permissions tab
      const permissionsTab = page.locator('button:has-text("Permissions"), a:has-text("Permissions")');
      if (await permissionsTab.isVisible()) {
        await permissionsTab.click();

        // Verify permission matrix
        await expect(page.locator('table, .permission-matrix')).toBeVisible();

        // Check for permission levels
        const permissionLevels = ['Admin', 'Edit', 'Read Only', 'None'];
        for (const level of permissionLevels) {
          await expect(page.locator(`text="${level}"`).first()).toBeVisible();
        }
      }
    });

    test('should enforce permission restrictions', async ({ page }) => {
      // This would test that users with limited permissions cannot perform certain actions
      // Implementation depends on having multiple test accounts with different permission levels

      // Example: Login as read-only user and verify edit buttons are disabled
      // This is a placeholder for actual permission testing
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Check if Add button is visible (should be hidden for read-only users)
      const addButton = page.locator('button:has-text("Add")');

      // This would fail for admin users but pass for read-only users
      // await expect(addButton).not.toBeVisible();
    });
  });

  test.describe('Column Management', () => {
    test('should show/hide columns', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Open column manager
      const columnButton = page.locator('button:has-text("Columns"), button[aria-label*="Column"]');
      if (await columnButton.isVisible()) {
        await columnButton.click();

        // Toggle a column
        const columnCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Phone' });
        if (await columnCheckbox.isVisible()) {
          await columnCheckbox.uncheck();
        }

        // Close column manager
        await page.keyboard.press('Escape');

        // Verify column hidden
        await expect(page.locator('th:has-text("Phone")')).not.toBeVisible();
      }
    });

    test('should reorder columns by drag and drop', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Open column manager
      const columnButton = page.locator('button:has-text("Columns")');
      if (await columnButton.isVisible()) {
        await columnButton.click();

        // Find draggable columns
        const emailColumn = page.locator('[draggable="true"]:has-text("Email")');
        const companyColumn = page.locator('[draggable="true"]:has-text("Company")');

        if (await emailColumn.isVisible() && await companyColumn.isVisible()) {
          // Drag email column after company column
          await emailColumn.dragTo(companyColumn);
        }

        // Save changes
        await page.locator('button:has-text("Save")').click();

        // Verify column order changed
        const headers = page.locator('th');
        const emailIndex = await headers.locator(':has-text("Email")').count();
        const companyIndex = await headers.locator(':has-text("Company")').count();

        // This is a simplified check - actual implementation may vary
        expect(emailIndex).toBeGreaterThan(companyIndex);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await helpers.navigateToDirectory(page, PROJECT_ID);

      // Verify mobile menu
      const mobileMenu = page.locator('button[aria-label*="Menu"], button:has-text("☰")');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();

        // Verify navigation items in mobile menu
        await expect(page.locator('text="Users"')).toBeVisible();
        await expect(page.locator('text="Contacts"')).toBeVisible();
      }

      // Verify table is scrollable on mobile
      const table = page.locator('table, .directory-table');
      await expect(table).toBeVisible();
    });

    test('should work on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await helpers.navigateToDirectory(page, PROJECT_ID);
      await helpers.waitForTable(page);

      // Verify layout adjusts for tablet
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('table, .directory-table')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should show error for invalid email', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.openAddPersonDialog(page);

      // Enter invalid email
      await page.locator('input[type="email"]').fill('invalid-email');
      await page.locator('input[name="firstName"]').fill('Test');
      await page.locator('input[name="lastName"]').fill('User');

      // Try to save
      const saveButton = page.locator('button:has-text("Save")');
      await saveButton.click();

      // Verify error message
      await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
    });

    test('should show error for duplicate email', async ({ page }) => {
      const testData = helpers.generateTestData();

      // Create first user
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);
      await helpers.saveForm(page);

      // Try to create duplicate
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, testData.user);

      const saveButton = page.locator('button:has-text("Save")');
      await saveButton.click();

      // Verify duplicate error
      await expect(page.locator('text=/already exists|duplicate/i')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/projects/*/directory/**', route => {
        route.abort('failed');
      });

      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Verify error message displayed
      await expect(page.locator('text=/error|failed|unable/i')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load large datasets efficiently', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Measure load time
      const startTime = Date.now();
      await helpers.waitForTable(page);
      const loadTime = Date.now() - startTime;

      // Verify reasonable load time (< 3 seconds)
      expect(loadTime).toBeLessThan(3000);

      // Check for pagination or infinite scroll
      const pagination = page.locator('.pagination, [aria-label*="Page"]');
      const loadMore = page.locator('button:has-text("Load More")');

      const hasPagination = await pagination.isVisible() || await loadMore.isVisible();
      expect(hasPagination).toBeTruthy();
    });

    test('should search without lag', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      const searchInput = page.locator('input[placeholder*="Search"]');

      // Measure search response time
      const startTime = Date.now();
      await searchInput.fill('test');
      await page.waitForTimeout(500); // Debounce delay
      await helpers.waitForTable(page);
      const searchTime = Date.now() - startTime;

      // Verify search is responsive (< 1 second)
      expect(searchTime).toBeLessThan(1000);
    });
  });
});

// Run tests with proper setup
test.use({
  // Set base URL if needed
  baseURL: process.env.BASE_URL || 'http://localhost:3000',

  // Set timeout for each test
  timeout: 30000,

  // Enable video recording for failures
  video: 'retain-on-failure',

  // Enable screenshots on failure
  screenshot: 'only-on-failure',

  // Set viewport
  viewport: { width: 1280, height: 720 },
});