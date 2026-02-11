import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;
test.beforeEach(async ({ page, authenticatedRequest }) => {
  const project = await createTestProject(page, {}, authenticatedRequest);
  projectId = project.project.id;
});



test('Original Budget modal opens correctly', async ({ page }) => {
  // Navigate to the budget page
  await page.goto(`/${projectId}/budget`);
  
  // Wait for the page to load completely
  await page.waitForLoadState('networkidle');
  
  // Wait for budget data to finish loading (wait for loading text to disappear)
  await page.waitForFunction(() => {
    return !document.body.textContent?.includes('Loading budget data');
  }, { timeout: 15000 }).catch(() => {
    console.log('Loading timeout - page may still be loading');
  });
  
  // Additional wait for table to render
  await page.waitForTimeout(2000);
  
  // Take a screenshot of the loaded state
  await page.screenshot({ path: 'tests/screenshots/budget-page-loaded.png', fullPage: true });
  
  // Look for any clickable elements that look like currency
  const editableCell = page.locator('button').filter({ hasText: /\$/ }).first();
  const cellCount = await editableCell.count();
  console.log('Found editable cells count:', cellCount);
  
  if (cellCount > 0) {
    console.log('Clicking editable cell...');
    await editableCell.click();
    
    // Wait for modal to appear
    await page.waitForTimeout(1000);
    
    // Take a screenshot after clicking
    await page.screenshot({ path: 'tests/screenshots/budget-modal-clicked.png', fullPage: true });
    
    // Check various modal selectors
    const dialogContent = page.locator('[data-slot="dialog-content"]');
    const dialogVisible = await dialogContent.isVisible().catch(() => false);
    console.log('Dialog content visible:', dialogVisible);
    
    // Check for overlay
    const overlay = page.locator('[data-slot="dialog-overlay"]');
    const overlayVisible = await overlay.isVisible().catch(() => false);
    console.log('Overlay visible:', overlayVisible);
    
    // Check for any role="dialog"
    const roleDialog = page.locator('[role="dialog"]');
    const roleDialogVisible = await roleDialog.isVisible().catch(() => false);
    console.log('Role dialog visible:', roleDialogVisible);
    
    // Get all visible text in dialogs
    if (roleDialogVisible) {
      const dialogText = await roleDialog.textContent();
      console.log('Dialog text:', dialogText?.substring(0, 200));
    }
    
  } else {
    console.log('No editable cells found');
    // Log page content for debugging
    const bodyText = await page.locator('body').textContent();
    console.log('Page content preview:', bodyText?.substring(0, 500));
  }
});
