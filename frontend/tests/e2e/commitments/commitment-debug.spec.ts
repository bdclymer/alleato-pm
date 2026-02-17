import { test, expect } from '@playwright/test';

const PROJECT_ID = 67;

test('debug purchase order form submission', async ({ page }) => {
  // Navigate to the purchase order form
  await page.goto(`/${PROJECT_ID}/commitments/new?type=purchase_order`);
  await page.waitForLoadState('networkidle');

  // Set up extensive logging
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', error => {
    console.log('[Page Error]:', error.message);
  });

  page.on('request', request => {
    if (request.method() === 'POST') {
      console.log(`[Request POST] ${request.url()}`);
    }
  });

  page.on('requestfailed', request => {
    console.log(`[Request Failed] ${request.url()} - ${request.failure()?.errorText}`);
  });

  // Wait for form
  await expect(page.getByRole('heading', { name: /new purchase order/i })).toBeVisible();

  // Fill only Contract # which is required
  const contractField = page.getByRole('textbox', { name: 'Contract #' });
  await contractField.clear();
  await contractField.fill(`PO-DEBUG-${Date.now()}`);

  // Check React Hook Form state by inspecting the form
  const formState = await page.evaluate(() => {
    // Look for any global form state
    const forms = document.querySelectorAll('form');
    return {
      formCount: forms.length,
      formAction: forms[0]?.action,
      formMethod: forms[0]?.method,
    };
  });
  console.log('Form state:', formState);

  // Screenshot before
  await page.screenshot({ path: 'tests/screenshots/po-debug-before.png' });

  // Find and click submit button
  const submitButton = page.getByRole('button', { name: /create purchase order/i });
  await expect(submitButton).toBeVisible();
  await expect(submitButton).toBeEnabled();

  // Add an event listener to intercept form submission
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        console.log('[Form Submit Event] Form is being submitted');
        console.log('[Form Submit Event] Default prevented:', e.defaultPrevented);
      });
    }
  });

  console.log('About to click submit button...');

  // Try clicking with force
  await submitButton.click({ force: true });
  console.log('Clicked submit button');

  // Wait and check what happens
  await page.waitForTimeout(5000);

  // Check current state
  const afterState = await page.evaluate(() => {
    return {
      url: window.location.href,
      hasLoadingState: document.body.innerHTML.includes('Creating...'),
    };
  });
  console.log('After state:', afterState);

  // Screenshot after
  await page.screenshot({ path: 'tests/screenshots/po-debug-after.png' });

  console.log('Final URL:', page.url());
});
