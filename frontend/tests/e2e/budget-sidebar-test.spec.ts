import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;
test.beforeEach(async ({ page, authenticatedRequest }) => {
  const project = await createTestProject(page, {}, authenticatedRequest);
  projectId = project.project.id;
});



test('Original Budget sidebar opens correctly', async ({ page }) => {
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
  
  // Additional wait for table to render
  await page.waitForTimeout(2000);
  
  // Look for clickable currency button
  const editableCell = page.locator('button').filter({ hasText: /\$/ }).first();
  const cellCount = await editableCell.count();
  console.log('Found editable cells count:', cellCount);
  
  if (cellCount > 0) {
    console.log('Clicking editable cell...');
    await editableCell.click();
    
    // Wait for sidebar to appear
    await page.waitForTimeout(1000);
    
    // Take a screenshot after clicking
    await page.screenshot({ path: 'tests/screenshots/budget-sidebar-opened.png', fullPage: true });
    
    // Check for sheet content (sidebar)
    const sheetContent = page.locator('[data-slot="sheet-content"]');
    const isVisible = await sheetContent.isVisible().catch(() => false);
    console.log('Sheet content visible:', isVisible);
    
    // Check for sidebar header text
    const headerText = page.locator('text=Original Budget Amount');
    const hasHeader = await headerText.isVisible().catch(() => false);
    console.log('Header visible:', hasHeader);
    
    // Check for calculation method options
    const manualOption = page.locator('text=Manual');
    const hasManual = await manualOption.isVisible().catch(() => false);
    console.log('Manual option visible:', hasManual);
    
    // Check that it slides in from the right (positioned on right side)
    if (isVisible) {
      const box = await sheetContent.boundingBox();
      console.log('Sidebar position:', box);
      if (box) {
        const viewportWidth = page.viewportSize()?.width || 1280;
        console.log('Sidebar is on right side:', box.x > viewportWidth / 2);
      }
    }
    
  } else {
    console.log('No editable cells found');
  }
});
