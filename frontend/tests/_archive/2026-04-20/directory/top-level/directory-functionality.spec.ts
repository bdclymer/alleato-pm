import { test, expect } from '@playwright/test';
import { clearTestData, createTestUser, createTestProject, createTestCompany, setupTestScenario } from '../helpers/directory-test-helpers';

/**
 * Critical Directory Functionality Tests
 * These tests verify core Procore-style directory features are working
 */

test.describe('Directory Core Functionality', () => {
  let testProjectId: string;
  let testUserId: string;
  let testCompanyId: string;

  test.beforeEach(async ({ page }) => {
    // Clean slate for each test
    await clearTestData();
    
    // Create test data
    testCompanyId = await createTestCompany('Test Construction Co');
    testProjectId = await createTestProject('Test Directory Project', testCompanyId);
    testUserId = await createTestUser('john.doe@test.com', 'John', 'Doe', testCompanyId);
    
    // Login and navigate to directory
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@test.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    
    await page.goto(`/${testProjectId}/directory/users`);
    await page.waitForLoadState('networkidle');
  });

  test('should display users table with correct data', async ({ page }) => {
    // Verify table is loaded
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    
    // Verify table headers match Procore structure
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Company")')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    
    // Verify test user is displayed
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=john.doe@test.com')).toBeVisible();
    await expect(page.locator('text=Test Construction Co')).toBeVisible();
    
    // Verify status badge
    await expect(page.locator('[data-testid="status-badge"]:has-text("Active")')).toBeVisible();
  });

  test('should search users functionality work correctly', async ({ page }) => {
    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'John');
    await page.waitForTimeout(500); // Debounce delay
    
    // Should still show John Doe
    await expect(page.locator('text=John Doe')).toBeVisible();
    
    // Search for non-existent user
    await page.fill('[data-testid="search-input"]', 'NonExistent');
    await page.waitForTimeout(500);
    
    // Should show no results
    await expect(page.locator('text=John Doe')).not.toBeVisible();
    await expect(page.locator('text=No users found')).toBeVisible();
    
    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    await page.waitForTimeout(500);
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should filter users by company', async ({ page }) => {
    // Open filters
    await page.click('[data-testid="filters-button"]');
    await expect(page.locator('[data-testid="filters-panel"]')).toBeVisible();
    
    // Apply company filter
    await page.selectOption('[data-testid="company-filter"]', testCompanyId);
    await page.click('[data-testid="apply-filters"]');
    
    // Should show filtered results
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Test Construction Co')).toBeVisible();
    
    // Clear filter
    await page.click('[data-testid="clear-filters"]');
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should sort users by name', async ({ page }) => {
    // Add another test user for sorting
    await createTestUser('alice.smith@test.com', 'Alice', 'Smith', testCompanyId);
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Click name header to sort
    await page.click('th:has-text("Name")');
    
    // Verify sorting (Alice should come before John alphabetically)
    const names = await page.locator('[data-testid="user-name"]').allTextContents();
    expect(names[0]).toContain('Alice Smith');
    expect(names[1]).toContain('John Doe');
    
    // Click again to reverse sort
    await page.click('th:has-text("Name")');
    const reversedNames = await page.locator('[data-testid="user-name"]').allTextContents();
    expect(reversedNames[0]).toContain('John Doe');
    expect(reversedNames[1]).toContain('Alice Smith');
  });

  test('should group users by company', async ({ page }) => {
    // Create users from different companies
    const company2Id = await createTestCompany('Another Construction Co');
    await createTestUser('bob.wilson@test.com', 'Bob', 'Wilson', company2Id);
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Enable company grouping
    await page.click('[data-testid="group-by-company"]');
    
    // Verify groups are displayed
    await expect(page.locator('[data-testid="company-group"]:has-text("Test Construction Co")')).toBeVisible();
    await expect(page.locator('[data-testid="company-group"]:has-text("Another Construction Co")')).toBeVisible();
    
    // Verify users are under correct groups
    const testGroup = page.locator('[data-testid="company-group"]:has-text("Test Construction Co")');
    await expect(testGroup.locator('text=John Doe')).toBeVisible();
    
    const anotherGroup = page.locator('[data-testid="company-group"]:has-text("Another Construction Co")');
    await expect(anotherGroup.locator('text=Bob Wilson')).toBeVisible();
  });

  test('should add new user successfully', async ({ page }) => {
    // Click Add User button
    await page.click('[data-testid="add-user-button"]');
    await expect(page.locator('[data-testid="user-form-dialog"]')).toBeVisible();
    
    // Fill user form
    await page.fill('[data-testid="first-name"]', 'Jane');
    await page.fill('[data-testid="last-name"]', 'Johnson');
    await page.fill('[data-testid="email"]', 'jane.johnson@test.com');
    await page.fill('[data-testid="job-title"]', 'Project Manager');
    
    // Select company
    await page.selectOption('[data-testid="company-select"]', testCompanyId);
    
    // Select permission template
    await page.selectOption('[data-testid="permission-template"]', 'Project Manager');
    
    // Submit form
    await page.click('[data-testid="submit-user"]');
    
    // Verify success message
    await expect(page.locator('text=User added successfully')).toBeVisible();
    
    // Verify new user appears in table
    await expect(page.locator('text=Jane Johnson')).toBeVisible();
    await expect(page.locator('text=jane.johnson@test.com')).toBeVisible();
    await expect(page.locator('text=Project Manager')).toBeVisible();
  });

  test('should edit user information', async ({ page }) => {
    // Click edit button for John Doe
    await page.click('[data-testid="user-row"] [data-testid="edit-user"]');
    await expect(page.locator('[data-testid="user-form-dialog"]')).toBeVisible();
    
    // Update job title
    await page.fill('[data-testid="job-title"]', 'Senior Foreman');
    
    // Submit form
    await page.click('[data-testid="submit-user"]');
    
    // Verify success message
    await expect(page.locator('text=User updated successfully')).toBeVisible();
    
    // Verify updated information in table
    await expect(page.locator('text=Senior Foreman')).toBeVisible();
  });

  test('should invite user and show invitation status', async ({ page }) => {
    // Click invite button for John Doe
    await page.click('[data-testid="user-row"] [data-testid="invite-user"]');
    
    // Verify invitation sent message
    await expect(page.locator('text=Invitation sent')).toBeVisible();
    
    // Verify invitation status in table
    await expect(page.locator('[data-testid="invite-status"]:has-text("Invited")')).toBeVisible();
    
    // Verify invite date is shown
    const today = new Date().toLocaleDateString();
    await expect(page.locator(`text=${today}`)).toBeVisible();
  });

  test('should deactivate and reactivate user', async ({ page }) => {
    // Click actions menu for John Doe
    await page.click('[data-testid="user-row"] [data-testid="user-actions"]');
    
    // Click deactivate
    await page.click('[data-testid="deactivate-user"]');
    
    // Confirm deactivation
    await page.click('[data-testid="confirm-deactivate"]');
    
    // Verify success message
    await expect(page.locator('text=User deactivated')).toBeVisible();
    
    // Verify status changed to inactive
    await expect(page.locator('[data-testid="status-badge"]:has-text("Inactive")')).toBeVisible();
    
    // Reactivate user
    await page.click('[data-testid="user-row"] [data-testid="user-actions"]');
    await page.click('[data-testid="reactivate-user"]');
    
    // Verify status back to active
    await expect(page.locator('[data-testid="status-badge"]:has-text("Active")')).toBeVisible();
  });

  test('should navigate between directory tabs', async ({ page }) => {
    // Start on users tab
    await expect(page.locator('[data-testid="tab-users"][data-active="true"]')).toBeVisible();
    
    // Navigate to companies tab
    await page.click('[data-testid="tab-companies"]');
    await expect(page).toHaveURL(`/${testProjectId}/directory/companies`);
    await expect(page.locator('[data-testid="companies-table"]')).toBeVisible();
    
    // Navigate to contacts tab
    await page.click('[data-testid="tab-contacts"]');
    await expect(page).toHaveURL(`/${testProjectId}/directory/contacts`);
    
    // Navigate to groups tab
    await page.click('[data-testid="tab-groups"]');
    await expect(page).toHaveURL(`/${testProjectId}/directory/groups`);
    
    // Navigate back to users
    await page.click('[data-testid="tab-users"]');
    await expect(page).toHaveURL(`/${testProjectId}/directory/users`);
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
  });

  test('should export users data', async ({ page }) => {
    // Click export button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-users"]')
    ]);
    
    // Verify download
    expect(download.suggestedFilename()).toContain('project-users');
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    
    // Verify export includes current data
    const downloadPath = await download.path();
    const fs = require('fs');
    const csvContent = fs.readFileSync(downloadPath, 'utf8');
    expect(csvContent).toContain('John Doe');
    expect(csvContent).toContain('john.doe@test.com');
  });

  test('should handle bulk operations', async ({ page }) => {
    // Add multiple test users
    await createTestUser('user1@test.com', 'User', 'One', testCompanyId);
    await createTestUser('user2@test.com', 'User', 'Two', testCompanyId);
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Select multiple users
    await page.check('[data-testid="user-row"]:nth-child(1) [data-testid="select-user"]');
    await page.check('[data-testid="user-row"]:nth-child(2) [data-testid="select-user"]');
    
    // Verify bulk actions appear
    await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
    await expect(page.locator('text=2 users selected')).toBeVisible();
    
    // Test bulk invite
    await page.click('[data-testid="bulk-invite"]');
    await expect(page.locator('text=2 invitations sent')).toBeVisible();
    
    // Test bulk deactivate
    await page.check('[data-testid="user-row"]:nth-child(1) [data-testid="select-user"]');
    await page.check('[data-testid="user-row"]:nth-child(2) [data-testid="select-user"]');
    await page.click('[data-testid="bulk-deactivate"]');
    await page.click('[data-testid="confirm-bulk-deactivate"]');
    
    await expect(page.locator('text=2 users deactivated')).toBeVisible();
  });
});

test.describe('Directory Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('should display mobile-optimized directory', async ({ page }) => {
    await page.goto('/test-project/directory/users');
    await page.waitForLoadState('networkidle');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-user-cards"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-table"]')).not.toBeVisible();
    
    // Verify user cards show key information
    await expect(page.locator('[data-testid="user-card"]:has-text("John Doe")')).toBeVisible();
    
    // Test mobile search
    await page.fill('[data-testid="mobile-search"]', 'John');
    await expect(page.locator('[data-testid="user-card"]:has-text("John Doe")')).toBeVisible();
    
    // Test mobile filters
    await page.click('[data-testid="mobile-filters"]');
    await expect(page.locator('[data-testid="mobile-filter-modal"]')).toBeVisible();
  });
});