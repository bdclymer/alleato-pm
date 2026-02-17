import { test, expect } from '@playwright/test';

// Use project ID 118 which exists in the database
const PROJECT_ID = 118;

test.describe('Project Team Feature', () => {
  test('should display Project Team section and show inline form when Add button is clicked', async ({ page }) => {
    // Navigate to project home page
    await page.goto(`/${PROJECT_ID}/home`);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Wait for any initial loading to complete
    await page.waitForTimeout(1000);

    // Take a screenshot before interaction
    await page.screenshot({
      path: 'tests/screenshots/project-team-before-add.png',
      fullPage: true
    });

    // Verify Project Team section heading exists
    const projectTeamHeading = page.getByText('PROJECT TEAM').first();
    await expect(projectTeamHeading).toBeVisible({ timeout: 15000 });

    console.log('✓ Project Team section displayed');

    // Find the Add button - it's a button with text "Add" near the Project Team heading
    // Look for the button within a reasonable scope
    const addButton = page.locator('button:has-text("Add")').first();
    await expect(addButton).toBeVisible({ timeout: 5000 });

    console.log('✓ Add button found');

    // Click the Add button
    await addButton.click();

    // Wait for the form to appear
    await page.waitForTimeout(1000);

    // Take a screenshot after clicking Add
    await page.screenshot({
      path: 'tests/screenshots/project-team-add-form.png',
      fullPage: true
    });

    // Look for form elements that should appear
    // The InlineTeamMemberForm should have input fields or a select for choosing team members
    const formElements = page.locator('input, select, button').filter({ hasText: /save|cancel|name|role/i });
    const formElementsCount = await formElements.count();

    console.log(`✓ Found ${formElementsCount} form elements after clicking Add`);

    // Verify at least some form elements appeared
    expect(formElementsCount).toBeGreaterThan(0);

    console.log('✓ Team member form appeared successfully');
  });

  test('should show "View All" link in Project Team section', async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/home`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Find the View All link by text
    const viewAllLink = page.getByRole('link', { name: /view all/i }).first();
    await expect(viewAllLink).toBeVisible({ timeout: 15000 });

    // Verify it has the correct href pattern
    const href = await viewAllLink.getAttribute('href');
    expect(href).toContain('/directory/users');

    console.log(`✓ View All link displayed with href: ${href}`);
  });
});
