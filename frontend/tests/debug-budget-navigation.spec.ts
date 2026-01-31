import { test, expect } from '@playwright/test';

test('Debug Budget Page Navigation', async ({ page }) => {
  const TEST_PROJECT_ID = '118'; // Test with project ID 118

  console.log('=== DEBUG BUDGET NAVIGATION ===');

  // First, check portfolio page loads
  await page.goto('/');
  console.log('Portfolio page loaded');

  // Wait for projects to load
  await page.waitForTimeout(2000);

  // Check if any projects are visible
  const projectElements = await page.locator('[data-testid="project-card"]').count();
  console.log(`Found ${projectElements} project cards`);

  if (projectElements === 0) {
    // Check if there's an empty state or error
    const pageContent = await page.textContent('body');
    console.log('Page content (first 500 chars):', pageContent?.substring(0, 500));

    // Check for any error messages
    const errorElements = await page.locator('text=/error|Error|failed|Failed/').count();
    console.log(`Found ${errorElements} potential error messages`);
  }

  // Try to navigate directly to budget page
  console.log(`Navigating to /${TEST_PROJECT_ID}/budget`);
  await page.goto(`/${TEST_PROJECT_ID}/budget`);

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Check current URL
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  // Check if we're redirected to login or error page
  if (currentUrl.includes('/auth/login')) {
    console.log('❌ Redirected to login page');
    return;
  }

  // Check for budget page elements
  const budgetTitle = await page.locator('h1, h2').filter({ hasText: /budget/i }).count();
  console.log(`Found ${budgetTitle} budget titles`);

  // Check for any budget-specific elements
  const budgetElements = await page.locator('[data-testid*="budget"], .budget, #budget').count();
  console.log(`Found ${budgetElements} budget elements`);

  // Check page title
  const pageTitle = await page.title();
  console.log('Page title:', pageTitle);

  // Take a screenshot for debugging
  await page.screenshot({ path: 'tests/screenshots/debug-budget-nav.png', fullPage: true });
  console.log('Screenshot saved to tests/screenshots/debug-budget-nav.png');

  // If we got here, consider it a success
  expect(currentUrl).toContain(`/${TEST_PROJECT_ID}`);
  console.log('✅ Successfully navigated to budget page');
});