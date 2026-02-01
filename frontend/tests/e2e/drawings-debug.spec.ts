import { test, expect } from '@playwright/test';

const projectId = '182'; // Using Test Project from API

test.use({ storageState: 'tests/.auth/user.json' });

test.describe('Drawings - Debug Test', () => {
  test('debug drawings page loading', async ({ page }) => {
    // Add network request logging
    const requests: any[] = [];
    const responses: any[] = [];

    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    });

    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers()
      });
    });

    console.log('Navigating to project home...');
    await page.goto(`/${projectId}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/screenshots/debug-project-home.png', fullPage: true });

    console.log('Current URL after project home load:', page.url());
    const homeContent = await page.textContent('body');
    console.log('Home page content preview:', homeContent?.substring(0, 200));

    console.log('\nNavigating to drawings page...');
    await page.goto(`/${projectId}/drawings`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/screenshots/debug-drawings-page.png', fullPage: true });

    console.log('Current URL after drawings load:', page.url());
    const drawingsContent = await page.textContent('body');
    console.log('Drawings page content preview:', drawingsContent?.substring(0, 200));

    // Check for specific elements that should be present
    const hasDrawingsHeading = await page.locator('h1:has-text("Drawings")').isVisible({ timeout: 1000 });
    const has404 = await page.locator('text=404').isVisible({ timeout: 1000 });
    const hasNotFound = await page.locator('text=This page could not be found').isVisible({ timeout: 1000 });

    console.log('Has Drawings heading:', hasDrawingsHeading);
    console.log('Has 404 error:', has404);
    console.log('Has "not found" message:', hasNotFound);

    // Check if we can find the expected page structure
    const pageStructure = {
      hasToolPage: await page.locator('[data-testid="project-tool-page"]').isVisible({ timeout: 1000 }),
      hasDrawingsTable: await page.locator('[data-testid="drawing-table"]').isVisible({ timeout: 1000 }),
      hasUploadButton: await page.locator('text=Upload Drawings').isVisible({ timeout: 1000 }),
      hasAreasSidebar: await page.locator('[data-testid="areas-sidebar"]').isVisible({ timeout: 1000 })
    };

    console.log('Page structure elements:', pageStructure);

    // Log failed requests (4xx/5xx status codes)
    const failedRequests = responses.filter(r => r.status >= 400);
    console.log('Failed requests:', failedRequests);

    // Log all API requests to understand what's happening
    const apiRequests = responses.filter(r => r.url.includes('/api/'));
    console.log('API requests:', apiRequests.map(r => ({ url: r.url, status: r.status })));
  });
});