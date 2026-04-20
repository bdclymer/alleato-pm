import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for test setup
const supabaseUrl = 'https://lgveqfnpkxvzbnnwuled.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndmVxZm5wa3h2emJubnd1bGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTI1NDE2NiwiZXhwIjoyMDcwODMwMTY2fQ.kIFo_ZSwO1uwpttYXxjSnYbBpUhwZhkW-ZGaiQLhKmA';
const supabase = createClient(supabaseUrl, supabaseKey);

test.describe('Directory User Workflow', () => {
  let testProjectId: number;
  let testCompanyId: string;
  
  test.beforeAll(async () => {
    // Create a test company
    const { data: company } = await supabase
      .from('companies')
      .insert({ 
        name: 'Playwright Test Company',
        type: 'General Contractor'
      })
      .select()
      .single();
    
    testCompanyId = company.id;
    
    // Create a test project  
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: 'Playwright Test Project',
        client: testCompanyId,
        type: 'construction'
      })
      .select()
      .single();
      
    testProjectId = project.id;
    console.log('Created test project:', testProjectId);
  });
  
  test.afterAll(async () => {
    // Cleanup test data
    if (testProjectId) {
      await supabase
        .from('project_directory_memberships')
        .delete()
        .eq('project_id', testProjectId);
        
      await supabase
        .from('projects')
        .delete()
        .eq('id', testProjectId);
    }
    
    if (testCompanyId) {
      await supabase
        .from('people')
        .delete()
        .eq('company_id', testCompanyId);
        
      await supabase
        .from('companies')
        .delete()
        .eq('id', testCompanyId);
    }
  });

  test('should display empty directory and add a new user', async ({ page }) => {
    // Navigate to the test project directory
    await page.goto(`/${testProjectId}/directory/users`);
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the directory page
    await expect(page.locator('h1:has-text("Directory")')).toBeVisible();
    
    // Should show empty state
    await expect(page.locator('text=/no users yet/i')).toBeVisible();
    
    // Click Add User button
    const addUserButton = page.locator('button:has-text("Add User")').first();
    await addUserButton.click();
    
    // Wait for dialog to appear
    const dialog = page.locator('[role="dialog"], [data-testid="user-form-dialog"]');
    await expect(dialog).toBeVisible();
    
    // Fill out the form
    await page.fill('input[name="first_name"]', 'John');
    await page.fill('input[name="last_name"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@playwright.test');
    await page.fill('input[name="job_title"]', 'Project Manager');
    
    // Select company if dropdown exists
    const companySelect = page.locator('select[name="company_id"], [data-testid="company-select"]');
    if (await companySelect.count() > 0) {
      await companySelect.selectOption({ label: 'Playwright Test Company' });
    }
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Add")').last();
    await submitButton.click();
    
    // Wait for dialog to close and table to update
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
    
    // Verify user appears in the table
    await expect(page.locator('text=John Doe')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=john.doe@playwright.test')).toBeVisible();
    await expect(page.locator('text=Project Manager')).toBeVisible();
    
    console.log('Successfully added user to directory');
  });
  
  test('should search and filter users', async ({ page }) => {
    // First add a few test users directly to database
    const users = [
      { first_name: 'Alice', last_name: 'Smith', email: 'alice@test.com', job_title: 'Engineer' },
      { first_name: 'Bob', last_name: 'Johnson', email: 'bob@test.com', job_title: 'Architect' },
      { first_name: 'Charlie', last_name: 'Brown', email: 'charlie@test.com', job_title: 'Superintendent' }
    ];
    
    for (const user of users) {
      const { data: person } = await supabase
        .from('people')
        .insert({
          ...user,
          company_id: testCompanyId,
          person_type: 'user'
        })
        .select()
        .single();
        
      await supabase
        .from('project_directory_memberships')
        .insert({
          project_id: testProjectId,
          person_id: person.id,
          status: 'active'
        });
    }
    
    // Navigate to directory
    await page.goto(`/${testProjectId}/directory/users`);
    await page.waitForLoadState('networkidle');
    
    // All users should be visible
    await expect(page.locator('text=Alice Smith')).toBeVisible();
    await expect(page.locator('text=Bob Johnson')).toBeVisible();
    await expect(page.locator('text=Charlie Brown')).toBeVisible();
    
    // Search for Alice
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    await searchInput.fill('Alice');
    await page.waitForTimeout(500); // Debounce delay
    
    // Only Alice should be visible
    await expect(page.locator('text=Alice Smith')).toBeVisible();
    await expect(page.locator('text=Bob Johnson')).not.toBeVisible();
    await expect(page.locator('text=Charlie Brown')).not.toBeVisible();
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    // All should be visible again
    await expect(page.locator('text=Alice Smith')).toBeVisible();
    await expect(page.locator('text=Bob Johnson')).toBeVisible();
    await expect(page.locator('text=Charlie Brown')).toBeVisible();
    
    console.log('Search functionality working correctly');
  });
  
  test('should navigate between directory tabs', async ({ page }) => {
    await page.goto(`/${testProjectId}/directory/users`);
    await page.waitForLoadState('networkidle');
    
    // Verify Users tab is active
    const usersTab = page.locator('a:has-text("Users"), button:has-text("Users")').first();
    await expect(usersTab).toHaveClass(/active|selected|bg-/);
    
    // Click Contacts tab
    await page.click('text=Contacts');
    await page.waitForURL(`**/${testProjectId}/directory/contacts`);
    
    // Click Companies tab  
    await page.click('text=Companies');
    await page.waitForURL(`**/${testProjectId}/directory/companies`);
    
    // Click Distribution Groups tab
    await page.click('text=Distribution Groups');
    await page.waitForURL(`**/${testProjectId}/directory/groups`);
    
    // Go back to Users
    await page.click('text=Users');
    await page.waitForURL(`**/${testProjectId}/directory/users`);
    
    console.log('Tab navigation working correctly');
  });
});