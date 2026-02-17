import { test, expect } from '@playwright/test';

test.describe('Project Tools Dropdown', () => {
  test('should display three-column layout with correct categories', async ({ page }) => {
    // Navigate to a page that has the header
    await page.goto('http://localhost:3000');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Find and click the Project Tools dropdown trigger
    const projectToolsButton = page.locator('button:has-text("Project Tools")');
    await expect(projectToolsButton).toBeVisible();
    await projectToolsButton.click();

    // Wait for dropdown to appear
    await page.waitForTimeout(500);

    // Check for the three category headers
    await expect(page.locator('h3:has-text("Core Tools")')).toBeVisible();
    await expect(page.locator('h3:has-text("Project Management")')).toBeVisible();
    await expect(page.locator('h3:has-text("Financial Management")')).toBeVisible();

    // Verify Core Tools items
    await expect(page.locator('button:has-text("Home")')).toBeVisible();
    await expect(page.locator('button:has-text("360 Reporting")')).toBeVisible();
    await expect(page.locator('button:has-text("Documents")')).toBeVisible();
    await expect(page.locator('button:has-text("Directory")')).toBeVisible();
    await expect(page.locator('button:has-text("Tasks")')).toBeVisible();
    await expect(page.locator('button:has-text("Admin")')).toBeVisible();
    await expect(page.locator('button:has-text("Connection Manager")')).toBeVisible();

    // Verify "New" badge on Connection Manager
    await expect(page.locator('text=New')).toBeVisible();

    // Verify Project Management items
    await expect(page.locator('button:has-text("Emails")')).toBeVisible();
    await expect(page.locator('button:has-text("RFIs")')).toBeVisible();
    await expect(page.locator('button:has-text("Submittals")')).toBeVisible();
    await expect(page.locator('button:has-text("Transmittals")')).toBeVisible();
    await expect(page.locator('button:has-text("Punch List")')).toBeVisible();
    await expect(page.locator('button:has-text("Meetings")')).toBeVisible();
    await expect(page.locator('button:has-text("Schedule")')).toBeVisible();
    await expect(page.locator('button:has-text("Daily Log")')).toBeVisible();
    await expect(page.locator('button:has-text("Photos")')).toBeVisible();
    await expect(page.locator('button:has-text("Drawings")')).toBeVisible();
    await expect(page.locator('button:has-text("Specifications")')).toBeVisible();

    // Verify Financial Management items
    await expect(page.locator('button:has-text("Prime Contracts")')).toBeVisible();
    await expect(page.locator('button:has-text("Budget")')).toBeVisible();
    await expect(page.locator('button:has-text("Commitments")')).toBeVisible();
    await expect(page.locator('button:has-text("Change Orders")')).toBeVisible();
    await expect(page.locator('button:has-text("Change Events")')).toBeVisible();
    await expect(page.locator('button:has-text("Direct Costs")')).toBeVisible();
    await expect(page.locator('button:has-text("Invoicing")')).toBeVisible();

    // Take a screenshot for visual verification
    await page.screenshot({
      path: 'frontend/tests/screenshots/project-tools-dropdown.png',
      fullPage: false
    });
  });

  test('should navigate when clicking a tool link', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Click the Project Tools dropdown
    const projectToolsButton = page.locator('button:has-text("Project Tools")');
    await projectToolsButton.click();
    await page.waitForTimeout(500);

    // Click on "Documents" tool link
    await page.locator('a:has-text("Documents")').first().click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Verify we navigated to the documents page
    await expect(page).toHaveURL(/\/documents/);
  });
});
