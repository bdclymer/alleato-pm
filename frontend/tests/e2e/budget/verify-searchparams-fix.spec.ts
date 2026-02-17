import { test, expect } from '@playwright/test';

test('verify searchParams error is fixed', async ({ page }) => {
  const consoleErrors: string[] = [];

  // Capture all console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to budget page with tab parameter
  await page.goto('/67/budget?tab=budget-details');

  // Wait for page to fully load
  await page.waitForTimeout(3000);

  // Filter for the specific searchParams error
  const searchParamsError = consoleErrors.find(err =>
    err.includes('searchParams') &&
    err.includes('React.use()')
  );

  // Log all errors for debugging
  console.warn('All console errors:', consoleErrors);
  console.warn('\nSearchParams error found:', searchParamsError || 'NONE');

  // Verify the searchParams error is NOT present
  expect(searchParamsError).toBeUndefined();

  // Verify the page loaded successfully - use more specific selector
  const budgetDetailsTab = page.getByRole('button', { name: 'Budget Details' });
  await expect(budgetDetailsTab).toBeVisible();

  console.warn('\n✅ SUCCESS: searchParams error is fixed!');
});
