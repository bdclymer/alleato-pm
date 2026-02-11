import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;
test.beforeEach(async ({ page, authenticatedRequest }) => {
  const project = await createTestProject(page, {}, authenticatedRequest);
  projectId = project.project.id;
});



test('check budget page scrollbar visibility', async ({ page }) => {
  // Navigate to the budget page
  await page.goto(`/${projectId}/budget`);

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Take a screenshot for inspection
  await page.screenshot({ path: 'tests/screenshots/budget-scrollbar.png', fullPage: true });

  // Find the scrollable container
  const scrollContainer = page.locator('.overflow-auto.scrollbar-hide').first();

  // Check if scrollbar-hide class is applied
  const hasScrollbarHide = await scrollContainer.evaluate((el) => {
    return el.classList.contains('scrollbar-hide');
  });

  console.log('Has scrollbar-hide class:', hasScrollbarHide);

  // Get computed styles
  const styles = await scrollContainer.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      overflowX: computed.overflowX,
      overflowY: computed.overflowY,
      scrollbarWidth: computed.scrollbarWidth,
      msOverflowStyle: (el as any).style.msOverflowStyle,
    };
  });

  console.log('Computed styles:', JSON.stringify(styles, null, 2));

  // Check the actual HTML classes
  const className = await scrollContainer.getAttribute('class');
  console.log('Container classes:', className);
});
