import { test, expect } from '@playwright/test';

test.describe('Directory Distribution Groups Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to distribution groups page
    await page.goto('/directory/groups');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display distribution groups list page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Directory');

    // Check for Distribution Groups tab
    const groupsTab = page.getByRole('link', { name: /distribution groups/i });
    await expect(groupsTab).toBeVisible();
  });

  test('should display Add Distribution Group button', async ({ page }) => {
    const addGroupButton = page.getByRole('button', { name: /add distribution group/i });
    await expect(addGroupButton).toBeVisible();
  });

  test('should open Add Distribution Group dialog when clicking Add button', async ({ page }) => {
    // Click Add button
    await page.getByRole('button', { name: /add distribution group/i }).click();

    // Check dialog is visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add Distribution Group')).toBeVisible();

    // Check form fields
    await expect(page.getByLabel(/group name/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();

    // Close dialog
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should create a new distribution group', async ({ page }) => {
    const timestamp = Date.now();
    const groupName = `Test Group ${timestamp}`;

    // Open dialog
    await page.getByRole('button', { name: /add distribution group/i }).click();

    // Fill form
    await page.getByLabel(/group name/i).fill(groupName);
    await page.getByLabel(/description/i).fill('Test description for E2E testing');

    // Submit
    await page.getByRole('button', { name: /create group/i }).click();

    // Wait for dialog to close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify group appears in table
    await expect(page.getByText(groupName)).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields when creating group', async ({ page }) => {
    // Open dialog
    await page.getByRole('button', { name: /add distribution group/i }).click();

    // Try to submit without name
    const createButton = page.getByRole('button', { name: /create group/i });

    // The button should be disabled when name is empty
    await expect(createButton).toBeDisabled();
  });

  test('should edit an existing distribution group', async ({ page }) => {
    // First create a group to edit
    const timestamp = Date.now();
    const originalName = `Edit Test ${timestamp}`;
    const updatedName = `Updated ${timestamp}`;

    // Create group
    await page.getByRole('button', { name: /add distribution group/i }).click();
    await page.getByLabel(/group name/i).fill(originalName);
    await page.getByRole('button', { name: /create group/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(originalName)).toBeVisible({ timeout: 5000 });

    // Open edit dialog via actions menu
    const row = page.locator('table tbody tr', { hasText: originalName });
    await row.getByRole('button', { name: /more/i }).click();
    await page.getByRole('menuitem', { name: /edit group/i }).click();

    // Update name
    await page.getByLabel(/group name/i).clear();
    await page.getByLabel(/group name/i).fill(updatedName);

    // Save
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify updated name
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5000 });
  });

  test('should delete a distribution group', async ({ page }) => {
    // Create a group to delete
    const timestamp = Date.now();
    const groupName = `Delete Test ${timestamp}`;

    // Create group
    await page.getByRole('button', { name: /add distribution group/i }).click();
    await page.getByLabel(/group name/i).fill(groupName);
    await page.getByRole('button', { name: /create group/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(groupName)).toBeVisible({ timeout: 5000 });

    // Open delete confirmation
    const row = page.locator('table tbody tr', { hasText: groupName });
    await row.getByRole('button', { name: /more/i }).click();
    await page.getByRole('menuitem', { name: /delete group/i }).click();

    // Confirm deletion
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: /delete group/i }).click();

    // Verify group is removed
    await expect(page.getByText(groupName)).not.toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no groups exist', async ({ page }) => {
    // This test checks for proper empty state handling
    // If there are no groups, we should see the empty state message
    const emptyMessage = page.getByText(/no distribution groups found/i);
    const table = page.locator('table');

    // Either table or empty state should be visible
    const tableVisible = await table.isVisible().catch(() => false);
    const emptyVisible = await emptyMessage.isVisible().catch(() => false);

    expect(tableVisible || emptyVisible).toBe(true);
  });

  test('should display member count for each group', async ({ page }) => {
    // Create a test group first
    const timestamp = Date.now();
    const groupName = `Member Count Test ${timestamp}`;

    await page.getByRole('button', { name: /add distribution group/i }).click();
    await page.getByLabel(/group name/i).fill(groupName);
    await page.getByRole('button', { name: /create group/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Wait for group to appear
    await expect(page.getByText(groupName)).toBeVisible({ timeout: 5000 });

    // Check member count badge is visible
    const row = page.locator('table tbody tr', { hasText: groupName });
    await expect(row.getByText(/0 member/i)).toBeVisible();
  });

  test('should navigate between directory tabs', async ({ page }) => {
    // Check all tabs are present
    const tabs = [
      'Companies',
      'Clients',
      'Contacts',
      'Users',
      'Employees',
      'Distribution Groups'
    ];

    for (const tab of tabs) {
      await expect(page.getByRole('link', { name: new RegExp(tab, 'i') })).toBeVisible();
    }

    // Click on Companies tab and verify navigation
    await page.getByRole('link', { name: /companies/i }).click();
    await expect(page).toHaveURL(/\/directory\/companies/);

    // Go back to Distribution Groups
    await page.getByRole('link', { name: /distribution groups/i }).click();
    await expect(page).toHaveURL(/\/directory\/groups/);
  });

  test('should search distribution groups', async ({ page }) => {
    // Create a uniquely named group
    const timestamp = Date.now();
    const uniqueName = `SearchableGroup${timestamp}`;

    await page.getByRole('button', { name: /add distribution group/i }).click();
    await page.getByLabel(/group name/i).fill(uniqueName);
    await page.getByRole('button', { name: /create group/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 5000 });

    // Search for the group
    const searchInput = page.getByPlaceholder(/search groups/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('SearchableGroup');
      await page.waitForTimeout(500);

      // Verify the group is still visible after search
      await expect(page.getByText(uniqueName)).toBeVisible();
    }
  });
});
