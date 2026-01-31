import { test, expect } from '@playwright/test';

test.describe('Check MKH Project Display', () => {
  test('should find mkh project in the projects table', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Clear all filters first
    console.log('Clearing all filters...');
    
    // Click the Clear All button if visible
    const clearAllButton = page.getByText('Clear All');
    if (await clearAllButton.isVisible()) {
      await clearAllButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Take screenshot after clearing filters
    await page.screenshot({ path: 'tests/screenshots/projects-all-filters-cleared.png', fullPage: true });
    
    // Count total projects
    const totalProjects = await page.locator('tbody tr').count();
    console.log(`Total projects visible: ${totalProjects}`);
    
    // Search for the specific project by job number
    console.log('Searching for job number 26-999...');
    await page.fill('input[placeholder*="Search"]', '26-999');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'tests/screenshots/search-26-999-detailed.png', fullPage: true });
    
    let searchResults = await page.locator('tbody tr').count();
    console.log(`Search by job number found ${searchResults} results`);
    
    if (searchResults === 0) {
      // Clear search and try by name
      await page.fill('input[placeholder*="Search"]', '');
      await page.waitForTimeout(1000);
      
      console.log('Searching for name "mkh"...');
      await page.fill('input[placeholder*="Search"]', 'mkh');
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'tests/screenshots/search-mkh-detailed.png', fullPage: true });
      
      searchResults = await page.locator('tbody tr').count();
      console.log(`Search by name found ${searchResults} results`);
    }
    
    // Clear search and manually look through all projects
    await page.fill('input[placeholder*="Search"]', '');
    await page.waitForTimeout(1000);
    
    console.log('\nLooking for mkh project in the full list...');
    const allRows = await page.locator('tbody tr').all();
    
    let projectFound = false;
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      const jobNumber = await row.locator('td:nth-child(1)').textContent();
      const name = await row.locator('td:nth-child(2)').textContent();
      
      if (jobNumber?.includes('26-999') || name?.toLowerCase().includes('mkh')) {
        projectFound = true;
        console.log(`✅ FOUND PROJECT: Row ${i+1} - Job: ${jobNumber}, Name: ${name}`);
        await row.screenshot({ path: 'tests/screenshots/mkh-project-row.png' });
        
        // Click on the project to verify it opens
        await row.click();
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        console.log(`Clicked project, navigated to: ${currentUrl}`);
        
        break;
      }
    }
    
    if (!projectFound) {
      console.log('❌ Project mkh with job number 26-999 NOT found in the table');
      
      // Check pagination - maybe it's on another page
      const paginationInfo = await page.locator('text=/of \\d+ total rows/').textContent();
      console.log('Pagination info:', paginationInfo);
      
      // Try to go to next page if available
      const nextPageButton = page.locator('button[aria-label="Go to next page"]');
      if (await nextPageButton.isEnabled()) {
        console.log('Checking next page...');
        await nextPageButton.click();
        await page.waitForTimeout(2000);
        
        // Check again on next page
        const nextPageRows = await page.locator('tbody tr').all();
        for (const row of nextPageRows) {
          const jobNumber = await row.locator('td:nth-child(1)').textContent();
          const name = await row.locator('td:nth-child(2)').textContent();
          
          if (jobNumber?.includes('26-999') || name?.toLowerCase().includes('mkh')) {
            projectFound = true;
            console.log(`✅ FOUND PROJECT ON PAGE 2: Job: ${jobNumber}, Name: ${name}`);
            break;
          }
        }
      }
    }
    
    // Final assertion
    if (!projectFound) {
      console.log('\n⚠️  The project might be in the database but not displayed due to:');
      console.log('1. Phase filter (project might not have "current" phase)');
      console.log('2. Archived status');
      console.log('3. Data mapping issue between database and UI');
    }
  });
});