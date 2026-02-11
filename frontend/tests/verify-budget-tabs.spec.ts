import { test, expect } from './fixtures/index';
import { createTestProject } from './helpers/bootstrap';

let projectId: number;
test.beforeEach(async ({ page, authenticatedRequest }) => {
  const project = await createTestProject(page, {}, authenticatedRequest);
  projectId = project.project.id;
});



test('verify budget tabs work', async ({ page }) => {
  // Navigate to main budget tab
  await page.goto(`/${projectId}/budget`);
  await page.waitForTimeout(2000);

  // Take screenshot of main budget tab
  await page.screenshot({ path: 'budget-main-tab.png', fullPage: true });

  // Navigate to budget details tab
  await page.goto(`/${projectId}/budget?tab=budget-details`);
  await page.waitForTimeout(2000);

  // Take screenshot of budget details tab
  await page.screenshot({ path: 'budget-details-tab.png', fullPage: true });

  // Check if "Budget Details" tab is active
  const budgetDetailsTab = page.locator('text=Budget Details');
  await expect(budgetDetailsTab).toBeVisible();

  console.warn('Both budget tabs loaded successfully');
});
