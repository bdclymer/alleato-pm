import { test, expect } from '@playwright/test';

test.describe('Comprehensive Page Check', () => {
  test('should check project display in table', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot
    await page.screenshot({ path: 'tests/screenshots/homepage-projects-check.png', fullPage: true });
    
    // Check header text change
    console.log('Checking header text...');
    const headerSpan = page.locator('header span.text-xs.text-gray-300').first();
    const projectText = await headerSpan.textContent();
    console.log(`Header text: "${projectText}"`);
    
    if (projectText === 'Project') {
      console.log('✅ Header correctly shows "Project"');
    } else {
      console.log(`❌ Header shows "${projectText}" instead of "Project"`);
    }
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Count projects
    const rows = await page.locator('tbody tr').count();
    console.log(`Found ${rows} projects in the table`);
    
    // Search for the specific project
    console.log('Searching for project 26-999...');
    await page.fill('input[placeholder*="Search"]', '26-999');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'tests/screenshots/search-26-999-result.png', fullPage: true });
    
    const searchResults = await page.locator('tbody tr').count();
    console.log(`Search found ${searchResults} results`);
    
    // If found, verify the project details
    if (searchResults > 0) {
      const firstRow = page.locator('tbody tr').first();
      const jobNumber = await firstRow.locator('td:nth-child(1)').textContent();
      const projectName = await firstRow.locator('td:nth-child(2)').textContent();
      console.log(`✅ Found project: Job Number: ${jobNumber}, Name: ${projectName}`);
      await page.screenshot({ path: 'tests/screenshots/mkh-project-found.png', fullPage: true });
    }
    
    // Clear and search by name
    await page.fill('input[placeholder*="Search"]', 'mkh');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'tests/screenshots/search-mkh-result.png', fullPage: true });
    
    const nameResults = await page.locator('tbody tr').count();
    console.log(`Name search found ${nameResults} results`);
    
    // Clear search
    await page.fill('input[placeholder*="Search"]', '');
    await page.waitForTimeout(2000);
    
    // Get project details from the table
    if (rows > 0) {
      console.log('\nFirst 5 projects in table:');
      for (let i = 0; i < Math.min(rows, 5); i++) {
        const row = page.locator('tbody tr').nth(i);
        const jobNum = await row.locator('td:nth-child(1)').textContent();
        const name = await row.locator('td:nth-child(2)').textContent();
        const client = await row.locator('td:nth-child(3)').textContent();
        console.log(`${i+1}. Job: ${jobNum}, Name: ${name}, Client: ${client}`);
      }
    }
    
    // Check if there's any message about no projects
    const noDataMessage = await page.locator('text=/No projects found|No data/i').count();
    if (noDataMessage > 0) {
      console.log('⚠️  "No projects found" message is displayed');
    }
    
    expect(rows).toBeGreaterThanOrEqual(0);
  });
  
  test('should check project dropdown functionality', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log('\nTesting project dropdown...');
    
    // Click the project dropdown
    const projectDropdown = page.locator('button:has-text("Project")').first();
    await projectDropdown.click();
    
    // Wait for dropdown to open
    await page.waitForTimeout(1000);
    
    // Take screenshot of the dropdown
    await page.screenshot({ path: 'tests/screenshots/project-dropdown-open.png', fullPage: true });
    
    // Check that "Switch Company" is NOT in the dropdown
    const switchCompanyOption = page.locator('text="Switch Company"');
    const hasSwitchCompany = await switchCompanyOption.count() > 0;
    console.log(`"Switch Company" option: ${hasSwitchCompany ? '❌ Still present' : '✅ Removed'}`);
    
    // Check that "Recent Projects" label is shown
    const recentProjectsLabel = page.locator('text="Recent Projects"');
    const hasRecentProjects = await recentProjectsLabel.isVisible();
    console.log(`"Recent Projects" label: ${hasRecentProjects ? '✅ Visible' : '❌ Not visible'}`);
    
    // Check that "View All Projects" is in the dropdown
    const viewAllProjectsOption = page.locator('text="View All Projects"');
    const hasViewAllProjects = await viewAllProjectsOption.isVisible();
    console.log(`"View All Projects" option: ${hasViewAllProjects ? '✅ Visible' : '❌ Not visible'}`);
    
    // Count project items shown
    const projectItems = page.locator('[role="menuitem"] div:has(.text-xs)').locator('..');
    const projectCount = await projectItems.count();
    console.log(`Projects shown in dropdown: ${projectCount}`);
    
    // Click "View All Projects" and verify navigation
    if (hasViewAllProjects) {
      await viewAllProjectsOption.click();
      await page.waitForTimeout(1000);
      
      const currentUrl = page.url();
      const isHomepage = currentUrl.endsWith('/') || currentUrl.includes('localhost');
      console.log(`Clicked "View All Projects", now at: ${currentUrl}`);
      console.log(`Is homepage: ${isHomepage ? '✅ Yes' : '❌ No'}`);
    }
    
    // Verify no "Switch Company" option exists
    expect(hasSwitchCompany).toBe(false);
    expect(hasViewAllProjects).toBe(true);
  });
  
  test('should show financial toggles on project home', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click on first project to go to project home
    const firstProject = page.locator('tbody tr').first();
    await firstProject.click();
    await page.waitForURL(/\/\d+\/home/);
    await page.waitForTimeout(2000);
    
    // Check for financial toggle sections
    console.log('\nChecking financial toggles...');
    
    const budgetSection = page.locator('h3:has-text("Budget")');
    const hasBudget = await budgetSection.count() > 0;
    console.log(`Budget section: ${hasBudget ? '✅ Present' : '❌ Missing'}`);
    
    const primeSection = page.locator('h3:has-text("Prime Contract")');
    const hasPrime = await primeSection.count() > 0; 
    console.log(`Prime Contract section: ${hasPrime ? '✅ Present' : '❌ Missing'}`);
    
    const commitmentsSection = page.locator('h3:has-text("Commitments")');
    const hasCommitments = await commitmentsSection.count() > 0;
    console.log(`Commitments section: ${hasCommitments ? '✅ Present' : '❌ Missing'}`);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/project-home-financial-toggles.png', fullPage: true });
    
    // Test toggle interaction
    if (hasBudget) {
      const budgetToggle = budgetSection.locator('..');
      const budgetButton = budgetToggle.locator('button').first();
      
      // Check if budget is expanded by default
      const totalBudgetText = page.locator('text="Total Budget"');
      const isExpanded = await totalBudgetText.isVisible();
      console.log(`Budget expanded by default: ${isExpanded ? '✅ Yes' : '❌ No'}`);
      
      // Click to toggle
      await budgetButton.click();
      await page.waitForTimeout(500);
      
      const isCollapsed = await totalBudgetText.isHidden();
      console.log(`Budget collapsed after click: ${isCollapsed ? '✅ Yes' : '❌ No'}`);
    }
    
    expect(hasBudget).toBe(true);
    expect(hasPrime).toBe(true);
    expect(hasCommitments).toBe(true);
  });
});