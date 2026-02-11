import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Setup - Debug Cost Code Creation', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to dev login first to authenticate
    await page.waitForURL(/\/\d+\/home/, { timeout: 10000 });
  });

  test('should show cost codes in Create Budget Code modal', async ({ page }) => {
    // Navigate to the budget setup page
    await page.goto(`http://localhost:3000/${projectId}/budget/setup`, { timeout: 60000 });

    // Wait for loading to complete
    await page.waitForSelector('text=Loading project cost codes...', { state: 'hidden', timeout: 15000 });

    // Click on the "Select budget code..." button to open the dropdown
    const selectButton = page.locator('button:has-text("Select budget code")').first();
    await selectButton.click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // Click "Create New Budget Code" option
    const createCodeOption = page.locator('text=Create New Budget Code');
    await expect(createCodeOption).toBeVisible({ timeout: 5000 });
    await createCodeOption.click();

    // Wait for modal to open
    await page.waitForTimeout(1000);

    // Take screenshot of the modal
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-create-modal.png',
      fullPage: true
    });

    // Check if "Loading cost codes..." appears
    const loadingText = page.locator('text=Loading cost codes...');
    const isLoading = await loadingText.isVisible().catch(() => false);
    console.warn('Is loading cost codes visible?', isLoading);

    // Wait for loading to finish
    await page.waitForTimeout(3000);

    // Take another screenshot after loading
    await page.screenshot({
      path: 'tests/screenshots/budget-setup-create-modal-after-load.png',
      fullPage: true
    });

    // Check for divisions (buttons with division names)
    const divisions = page.locator('button').filter({ hasText: /Division/ });
    const divisionCount = await divisions.count();
    console.warn('Number of divisions found:', divisionCount);

    // Check for any buttons in the cost code area
    const allButtons = page.locator('div.border.rounded-md button');
    const buttonCount = await allButtons.count();
    console.warn('Total buttons in cost code area:', buttonCount);

    // Get text content of the modal
    const modalContent = await page.locator('[role="dialog"]').textContent();
    console.warn('Modal content:', modalContent);

    // Log network requests to see if cost codes API is being called
    page.on('response', async (response) => {
      if (response.url().includes('cost_codes')) {
        console.warn('Cost codes API response:', {
          url: response.url(),
          status: response.status(),
          data: await response.json().catch(() => 'Could not parse JSON')
        });
      }
    });
  });
});
