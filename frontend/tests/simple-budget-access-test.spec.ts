import { test, expect } from './fixtures/index';
import { createTestProject } from './helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

// Simple test to verify budget page navigation works after fixing user access
test.describe.skip('Simple Budget Access Test', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test('should navigate to budget page for accessible project', async ({ page }) => {
    // Start with a minimal test using an accessible project
    const TEST_PROJECT_ID = '67'; // This project was confirmed as accessible

    // Navigate to the budget page directly
    await page.goto(`http://localhost:3000/${TEST_PROJECT_ID}/budget`);

    // Wait for page load (be generous with timeout due to potential performance issues)
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Check that we're not redirected to login
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/auth/login');
    expect(currentUrl).toContain(`/${TEST_PROJECT_ID}`);

    // Look for any element that indicates we're on a budget page
    // This could be a title, heading, or any budget-specific element
    const hasPageElements = await page.locator('body').textContent();

    // Check for common budget page indicators
    const budgetIndicators = [
      'budget', 'Budget', 'BUDGET',
      'line item', 'Line Item',
      'cost code', 'Cost Code',
      'actual', 'Actual',
      'committed', 'Committed'
    ];

    const foundBudgetContent = budgetIndicators.some(indicator =>
      hasPageElements?.includes(indicator)
    );

    expect(foundBudgetContent).toBe(true);

    console.log('✅ Successfully accessed budget page for project', TEST_PROJECT_ID);
    console.log('Current URL:', currentUrl);
    console.log('Page contains budget content:', foundBudgetContent);
  });
});
