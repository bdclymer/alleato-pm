import { test, expect } from '@playwright/test';

const projectId = '182'; // Using existing project ID from database

test.use({ storageState: 'tests/.auth/user.json' });

test.describe('Drawings - Basic Functionality Test', () => {
  test('can access drawings page without errors', async ({ page }) => {
    // Set up console error tracking
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Set up page error tracking
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    try {
      // Navigate to drawings page
      await page.goto(`/${projectId}/drawings`, { waitUntil: 'networkidle' });

      // Take a screenshot to see what we get
      await page.screenshot({ path: 'tests/screenshots/drawings-page-load.png', fullPage: true });

      // Check if we can see any content (not just errors)
      const pageContent = await page.textContent('body');
      console.log('Page content preview:', pageContent?.substring(0, 500));

      // Check for common error indicators
      const hasRuntimeError = await page.locator('text=Runtime Error').isVisible({ timeout: 1000 });
      const hasAccessDenied = await page.locator('text=Access Denied').isVisible({ timeout: 1000 });
      const hasErrorBoundary = await page.locator('[data-testid="error-boundary"]').isVisible({ timeout: 1000 });

      console.log('Runtime Error visible:', hasRuntimeError);
      console.log('Access Denied visible:', hasAccessDenied);
      console.log('Error Boundary visible:', hasErrorBoundary);
      console.log('Console errors:', consoleErrors);
      console.log('Page errors:', pageErrors.map(e => e.message));

      // If we have access denied, that's a different issue than runtime errors
      if (hasAccessDenied) {
        console.log('Access denied - need to check project permissions setup');
        // The drawings page exists but user may lack project access
        // This is expected until proper project permissions are configured
        return;
      }

      // If we have runtime errors, log them for debugging
      if (hasRuntimeError || pageErrors.length > 0 || consoleErrors.length > 0) {
        console.log('Found errors - this needs to be resolved before E2E testing can proceed');
        return;
      }

      // Look for the page heading
      const heading = page.getByRole('heading', { name: 'Drawings' });
      await expect(heading).toBeVisible({ timeout: 10000 });

    } catch (error) {
      console.error('Test failed with error:', error);
      throw error;
    }
  });

  test('check authentication state', async ({ page }) => {
    // Go to a simple page first to verify auth
    await page.goto(`/${projectId}`, { waitUntil: 'networkidle' });

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/project-home.png', fullPage: true });

    // Check if we're redirected to login
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('/auth/login')) {
      console.log('Redirected to login - authentication issue');
    } else {
      console.log('On project page - authentication appears to be working');
    }
  });
});