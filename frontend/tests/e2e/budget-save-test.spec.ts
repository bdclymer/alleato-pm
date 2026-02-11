import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;
test.beforeEach(async ({ page, authenticatedRequest }) => {
  const project = await createTestProject(page, {}, authenticatedRequest);
  projectId = project.project.id;
});



test('Original Budget save functionality', async ({ page }) => {
  // Navigate to the budget page
  await page.goto(`/${projectId}/budget`);
  
  // Wait for the page to load completely
  await page.waitForLoadState('networkidle');
  
  // Wait for budget data to finish loading
  await page.waitForFunction(() => {
    return !document.body.textContent?.includes('Loading budget data');
  }, { timeout: 15000 }).catch(() => {
    console.log('Loading timeout - page may still be loading');
  });
  
  await page.waitForTimeout(2000);
  
  // Look for clickable currency button
  const editableCell = page.locator('button').filter({ hasText: /\$/ }).first();
  const cellCount = await editableCell.count();
  console.log('Found editable cells count:', cellCount);
  
  if (cellCount > 0) {
    // Get initial value
    const initialValue = await editableCell.textContent();
    console.log('Initial value:', initialValue);
    
    // Click to open sidebar
    await editableCell.click();
    await page.waitForTimeout(1000);
    
    // Check if sidebar opened
    const sidebar = page.locator('[data-slot="sheet-content"]');
    const sidebarVisible = await sidebar.isVisible();
    console.log('Sidebar visible:', sidebarVisible);
    
    if (sidebarVisible) {
      // Take screenshot of sidebar
      await page.screenshot({ path: 'tests/screenshots/budget-sidebar-before-edit.png', fullPage: true });
      
      // Find the Original Budget input field
      const originalBudgetInput = sidebar.locator('input').filter({ hasText: /\$/ }).last();
      const inputs = sidebar.locator('input');
      const inputCount = await inputs.count();
      console.log('Input count in sidebar:', inputCount);
      
      // Log all input values
      for (let i = 0; i < inputCount; i++) {
        const val = await inputs.nth(i).inputValue();
        console.log(`Input ${i} value:`, val);
      }
      
      // Try to change the Original Budget field (last input usually)
      // First, let's see the labels
      const labels = sidebar.locator('label');
      const labelCount = await labels.count();
      for (let i = 0; i < labelCount; i++) {
        const text = await labels.nth(i).textContent();
        console.log(`Label ${i}:`, text);
      }
      
      // Click save button
      const saveButton = sidebar.locator('button:has-text("Save Changes")');
      const saveVisible = await saveButton.isVisible();
      console.log('Save button visible:', saveVisible);
      
      if (saveVisible) {
        // Listen for network requests
        const requestPromise = page.waitForRequest(req => 
          req.url().includes('/api/projects/') && req.method() === 'PATCH',
          { timeout: 5000 }
        ).catch(() => null);
        
        // Click save
        await saveButton.click();
        console.log('Clicked save button');
        
        // Wait for request
        const request = await requestPromise;
        if (request) {
          console.log('PATCH request URL:', request.url());
          console.log('PATCH request body:', request.postData());
        } else {
          console.log('No PATCH request captured');
        }
        
        await page.waitForTimeout(2000);
        
        // Check for toast messages
        const toast = page.locator('[data-sonner-toast]');
        const toastVisible = await toast.isVisible().catch(() => false);
        if (toastVisible) {
          const toastText = await toast.textContent();
          console.log('Toast message:', toastText);
        }
        
        // Take screenshot after save
        await page.screenshot({ path: 'tests/screenshots/budget-sidebar-after-save.png', fullPage: true });
      }
    }
  }
});
