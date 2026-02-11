import { test, expect } from './fixtures/index';
import { createTestProject } from './helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;
test.beforeEach(async ({ page, authenticatedRequest }) => {
  const project = await createTestProject(page, {}, authenticatedRequest);
  projectId = project.project.id;
});



test('debug budget details API', async ({ page }) => {
  // Listen for network responses
  const apiResponses: { url: string; status: number; body: unknown }[] = [];

  page.on('response', async (response) => {
    if (response.url().includes(`/api/projects/${projectId}/budget/details`)) {
      try {
        const body = await response.json();
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          body,
        });
        console.warn('Budget Details API Response:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.warn('Could not parse response body');
      }
    }
  });

  // Navigate to budget details tab
  await page.goto(`/${projectId}/budget?tab=budget-details`);

  // Wait for API call to complete
  await page.waitForTimeout(3000);

  // Log the API responses
  console.warn('API Responses:', JSON.stringify(apiResponses, null, 2));
});
