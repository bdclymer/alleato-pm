import { test, expect } from '@playwright/test';

test.describe('Check Project Display', () => {
  test('should check if projects are displayed in the table', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of the current state
    await page.screenshot({ path: 'tests/screenshots/projects-table-current.png', fullPage: true });
    
    // Wait for the table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Check if there are any rows in the table
    const rows = await page.locator('tbody tr').count();
    console.log(`Found ${rows} projects in the table`);
    
    // Get the text content of the first few rows
    if (rows > 0) {
      const projectData = [];
      for (let i = 0; i < Math.min(rows, 5); i++) {
        const row = page.locator(`tbody tr`).nth(i);
        const jobNumber = await row.locator('td:nth-child(1)').textContent();
        const projectName = await row.locator('td:nth-child(2)').textContent();
        const client = await row.locator('td:nth-child(3)').textContent();
        projectData.push({ jobNumber, projectName, client });
      }
      console.log('First few projects:', JSON.stringify(projectData, null, 2));
    }
    
    // Search for the specific project mentioned by the user
    console.log('\nSearching for project with job number 26-999...');
    await page.fill('input[placeholder*="Search"]', '26-999');
    await page.waitForTimeout(1500); // Wait for search to complete
    
    await page.screenshot({ path: 'tests/screenshots/search-26-999.png', fullPage: true });
    
    const searchResults = await page.locator('tbody tr').count();
    console.log(`Search results: ${searchResults} projects found`);
    
    if (searchResults === 0) {
      // Try searching by name
      console.log('\nTrying to search by name "mkh"...');
      await page.fill('input[placeholder*="Search"]', 'mkh');
      await page.waitForTimeout(1500);
      
      await page.screenshot({ path: 'tests/screenshots/search-mkh.png', fullPage: true });
      
      const nameSearchResults = await page.locator('tbody tr').count();
      console.log(`Name search results: ${nameSearchResults} projects found`);
    }
    
    // Clear search and check all projects again
    await page.fill('input[placeholder*="Search"]', '');
    await page.waitForTimeout(1500);
    
    // Look specifically for recently created projects
    console.log('\nChecking for recently created projects...');
    const allRows = await page.locator('tbody tr').all();
    
    for (const row of allRows.slice(0, 10)) {
      const jobNumber = await row.locator('td:nth-child(1)').textContent();
      const name = await row.locator('td:nth-child(2)').textContent();
      
      if (jobNumber?.includes('26-999') || name?.toLowerCase().includes('mkh')) {
        console.log(`✅ Found project: Job Number: ${jobNumber}, Name: ${name}`);
        await row.screenshot({ path: `tests/screenshots/found-project-${jobNumber?.replace('/', '-')}.png` });
      }
    }
    
    // Check if the table is showing the correct data
    const projectCountText = await page.locator('text=/\\d+ project/').textContent();
    console.log('\nProject count display:', projectCountText);
    
    // Verify that at least some projects are displayed
    expect(rows).toBeGreaterThan(0);
  });
});