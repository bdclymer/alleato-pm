import { test } from '@playwright/test';

test('Capture current project home page state', async ({ page }) => {
  test.setTimeout(120000); // Increase timeout to 2 minutes

  // Authenticate first
  await page.goto('http://localhost:3003/dev-login?email=test@example.com&password=testpassword123', {
    waitUntil: 'commit',
    timeout: 60000
  });

  // Wait for redirect to complete
  await page.waitForURL(/localhost:3003/, { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Navigate to project home
  await page.goto('http://localhost:3003/67/home', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Take full page screenshot
  await page.screenshot({
    path: 'tests/screenshots/project-home-current-full.png',
    fullPage: true
  });

  // Take viewport screenshot
  await page.screenshot({
    path: 'tests/screenshots/project-home-current-viewport.png',
    fullPage: false
  });

  console.log('Screenshots captured successfully');
});
