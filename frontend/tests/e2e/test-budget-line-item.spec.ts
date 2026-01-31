import { test, expect } from '@playwright/test';

test.describe('Budget Line Item Creation Debug', () => {
  test('debug budget line item creation error', async ({ page }) => {
    // Set up request interception to log API calls
    page.on('request', request => {
      if (request.url().includes('/api/projects') && request.url().includes('/budget')) {
        console.log('Request URL:', request.url());
        console.log('Request Method:', request.method());
        console.log('Request Headers:', request.headers());
        if (request.method() === 'POST') {
          request.postData() && console.log('Request Body:', request.postData());
        }
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/projects') && response.url().includes('/budget')) {
        console.log('Response Status:', response.status());
        console.log('Response Headers:', response.headers());
        try {
          const body = await response.json();
          console.log('Response Body:', JSON.stringify(body, null, 2));
        } catch (e) {
          const text = await response.text();
          console.log('Response Text:', text);
        }
      }
    });

    // Navigate to login page
    await page.goto('/auth/login');
    
    // Login (update with your test credentials)
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {
      console.log('Login might have failed or redirected elsewhere');
    });
    
    // Navigate to a project - try to find a project link
    const projectLink = page.locator('a[href*="/home"]').first();
    if (await projectLink.count() > 0) {
      await projectLink.click();
    } else {
      console.log('No project found, trying to navigate directly');
      // Try navigating to project ID 1 directly
      await page.goto('/1/budget');
    }
    
    // Wait for budget page
    await page.waitForLoadState('networkidle');
    
    // Look for create budget button
    const createButton = page.locator('button:has-text("Create Budget")').or(
      page.locator('button:has-text("Add Budget Line Item")')
    ).or(
      page.locator('button:has-text("Create Budget Line Item")')
    );
    
    if (await createButton.count() > 0) {
      await createButton.first().click();
      
      // Wait for modal
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Debug: Log all visible form fields
      const formFields = await page.locator('input, select, button').all();
      console.log('Form fields found:', formFields.length);
      
      // Try to fill the form with minimal data
      // Look for any input fields
      const inputs = await page.locator('input[type="number"], input[type="text"]').all();
      console.log('Number of input fields:', inputs.length);
      
      // Fill amount field if it exists
      const amountField = page.locator('input[placeholder*="0.00"]').last();
      if (await amountField.count() > 0) {
        await amountField.fill('1000');
        console.log('Filled amount field with 1000');
      }
      
      // Try to submit
      const submitButton = page.locator('button:has-text("Create")').last();
      if (await submitButton.count() > 0) {
        console.log('Clicking submit button...');
        await submitButton.click();
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check for any error messages
        const errorMessages = await page.locator('[role="alert"], .toast-error, div:has-text("error")').all();
        for (const error of errorMessages) {
          const text = await error.textContent();
          console.log('Error found:', text);
        }
      }
    } else {
      console.log('No create button found on page');
    }
  });
});