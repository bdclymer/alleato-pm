import { test, expect } from '@playwright/test';

/**
 * Simple Directory Functionality Test
 * Tests basic directory page loading without authentication requirements
 */

test.describe('Directory Basic Functionality', () => {
  test('should load project directory users page', async ({ page }) => {
    // Navigate directly to a project directory page
    await page.goto('/135/directory/users');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're redirected to login or the page loads
    const url = page.url();
    console.log('Current URL:', url);
    
    // If redirected to login, try to log in
    if (url.includes('/login') || url.includes('/sign-in') || url.includes('/auth')) {
      console.log('Need to authenticate first');
      
      // Look for common login form elements
      const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]');
      const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]');
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
      
      if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        console.log('Found login form, attempting to log in');
        
        // Try common test credentials
        await emailInput.fill('test@example.com');
        await passwordInput.fill('password');
        await submitButton.click();
        
        // Wait for navigation
        await page.waitForLoadState('networkidle');
      }
    }
    
    // Check if we made it to the directory page
    const currentUrl = page.url();
    console.log('After auth attempt URL:', currentUrl);
    
    // Look for directory page elements
    const pageTitle = page.locator('h1, [data-testid="page-title"]');
    const hasDirectory = await page.locator('text=/directory/i').count() > 0;
    
    if (hasDirectory) {
      console.log('Successfully reached directory page');
      
      // Take a screenshot for verification
      await page.screenshot({ path: 'directory-page.png' });
      
      // Check for table or user list
      const table = page.locator('table, [role="table"], [data-testid="users-table"]');
      const tableExists = await table.count() > 0;
      
      if (tableExists) {
        console.log('Found users table');
        expect(tableExists).toBe(true);
      } else {
        // Check for empty state
        const emptyState = page.locator('text=/no users/i, text=/add user/i, text=/empty/i');
        const hasEmptyState = await emptyState.count() > 0;
        console.log('Found empty state:', hasEmptyState);
        
        // Either table or empty state should exist
        expect(tableExists || hasEmptyState).toBe(true);
      }
    } else {
      console.log('Could not reach directory page, current URL:', currentUrl);
      
      // Take a screenshot to see what happened
      await page.screenshot({ path: 'failed-navigation.png' });
      
      // This test should fail if we can't reach the directory
      expect(hasDirectory).toBe(true);
    }
  });
  
  test('should check global directory page', async ({ page }) => {
    // Try the global directory page
    await page.goto('/directory/users');
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    console.log('Global directory URL:', url);
    
    // Take screenshot
    await page.screenshot({ path: 'global-directory.png' });
    
    // Check if page loaded
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
  });
});