import { test, expect } from '@playwright/test';

// Skip auth for these tests
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Project Creation and Display', () => {
  test('should display newly created project in the projects table', async ({ page }) => {
    // Go to the home page (projects list)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'tests/screenshots/projects-table-initial.png', fullPage: true });
    
    // Count initial projects
    const initialProjectCount = await page.locator('tbody tr').count();
    console.log(`Initial project count: ${initialProjectCount}`);
    
    // Navigate to create project form
    await page.getByRole('button', { name: /create project/i }).click();
    await page.waitForURL('/project-form');
    
    // Fill in the form with test data
    const testProjectName = `Test Project ${Date.now()}`;
    const testProjectNumber = `TEST-${Date.now()}`;
    
    await page.fill('input[name="name"]', testProjectName);
    await page.fill('input[name="project_number"]', testProjectNumber);
    await page.fill('input[name="street_address"]', '123 Test Street');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="start_date"]', '2025-01-01');
    await page.fill('input[name="completion_date"]', '2025-12-31');
    await page.fill('input[name="total_value"]', '1000000');
    
    // Select country (United States is default)
    // Select timezone (America/New_York is default)
    
    // Submit the form
    await page.getByRole('button', { name: /create project/i }).last().click();
    
    // Wait for navigation - it should redirect to the setup wizard
    await page.waitForNavigation({ timeout: 10000 });
    
    // Check if we're on the setup wizard page
    const currentUrl = page.url();
    console.log(`After creation, redirected to: ${currentUrl}`);
    
    // Navigate back to the projects list
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for the table to refresh
    await page.waitForTimeout(2000);
    
    // Take screenshot after project creation
    await page.screenshot({ path: 'tests/screenshots/projects-table-after-creation.png', fullPage: true });
    
    // Search for the newly created project
    await page.fill('input[placeholder*="Search"]', testProjectName);
    await page.waitForTimeout(1000); // Wait for search to filter
    
    // Check if the project appears in the table
    const projectRow = page.locator('tbody tr').filter({ hasText: testProjectName });
    const projectExists = await projectRow.count() > 0;
    
    if (projectExists) {
      console.log(`✅ Project "${testProjectName}" found in the table`);
      await projectRow.screenshot({ path: 'tests/screenshots/new-project-row.png' });
    } else {
      console.log(`❌ Project "${testProjectName}" NOT found in the table`);
      
      // Try to find any project rows
      const allRows = await page.locator('tbody tr').count();
      console.log(`Total rows in table: ${allRows}`);
      
      // Log the first few project names visible
      const visibleProjects = await page.locator('tbody tr td:nth-child(2)').allTextContents();
      console.log('Visible projects:', visibleProjects.slice(0, 5));
    }
    
    // Also check without search filter
    await page.fill('input[placeholder*="Search"]', '');
    await page.waitForTimeout(1000);
    
    const finalProjectCount = await page.locator('tbody tr').count();
    console.log(`Final project count: ${finalProjectCount}`);
    
    // Assert that the project exists
    expect(projectExists).toBe(true);
  });
  
  test('should check if project with job number 26-999 is displayed', async ({ page }) => {
    // This test checks for the specific project mentioned by the user
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Search for the project by job number
    await page.fill('input[placeholder*="Search"]', '26-999');
    await page.waitForTimeout(1000);
    
    // Take screenshot of search results
    await page.screenshot({ path: 'tests/screenshots/search-job-26-999.png', fullPage: true });
    
    // Check if the project appears
    const projectWithJobNumber = page.locator('tbody tr').filter({ hasText: '26-999' });
    const exists = await projectWithJobNumber.count() > 0;
    
    if (exists) {
      console.log('✅ Project with job number 26-999 found');
      const projectName = await projectWithJobNumber.locator('td:nth-child(2)').textContent();
      console.log(`Project name: ${projectName}`);
    } else {
      console.log('❌ Project with job number 26-999 NOT found');
      
      // Try searching by project name
      await page.fill('input[placeholder*="Search"]', 'mkh');
      await page.waitForTimeout(1000);
      
      const projectByName = page.locator('tbody tr').filter({ hasText: 'mkh' });
      const nameExists = await projectByName.count() > 0;
      
      if (nameExists) {
        console.log('✅ Project "mkh" found by name search');
        await page.screenshot({ path: 'tests/screenshots/search-mkh.png', fullPage: true });
      }
    }
  });
});