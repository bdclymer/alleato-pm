import { test, expect } from '@playwright/test';

const PROJECT_ID = 67;

test('check purchase order form validation errors', async ({ page }) => {
  // Navigate to the purchase order form
  await page.goto(`/${PROJECT_ID}/commitments/new?type=purchase_order`);
  await page.waitForLoadState('networkidle');

  // Wait for form
  await expect(page.getByRole('heading', { name: /new purchase order/i })).toBeVisible();

  // Log all console messages to catch React Hook Form errors
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('error') || text.includes('Error') || text.includes('validation') || text.includes('invalid')) {
      console.log(`[Console ${msg.type()}]:`, text);
    }
  });

  // Fill Contract #
  const contractField = page.getByRole('textbox', { name: 'Contract #' });
  await contractField.clear();
  await contractField.fill(`PO-VAL-${Date.now()}`);

  // Click submit with special handling
  const submitButton = page.getByRole('button', { name: /create purchase order/i });

  // Add a handler to capture React Hook Form errors
  await page.evaluate(() => {
    // Intercept console.error
    const originalError = console.error;
    console.error = (...args) => {
      console.log('[Intercepted Error]:', ...args);
      originalError.apply(console, args);
    };
  });

  console.log('Clicking submit...');
  await submitButton.click();
  await page.waitForTimeout(2000);

  // Check for any error elements
  const allErrors = await page.locator('[class*="error"], [class*="red"], .text-destructive').allTextContents();
  console.log('Error elements found:', allErrors.filter(e => e.trim()));

  // Check for aria-invalid inputs
  const invalidInputs = await page.locator('[aria-invalid="true"]').count();
  console.log('Invalid inputs count:', invalidInputs);

  // Try to extract React Hook Form errors from the DOM
  const formErrorsInDom = await page.evaluate(() => {
    const errorElements = document.querySelectorAll('[id*="error"], [class*="error"]');
    return Array.from(errorElements).map(el => ({
      id: el.id,
      text: el.textContent,
      className: el.className,
    }));
  });
  console.log('Form errors in DOM:', formErrorsInDom);

  // Screenshot
  await page.screenshot({ path: 'tests/screenshots/po-validation-errors.png', fullPage: true });
});

test('manually fill all required schema fields', async ({ page }) => {
  // Navigate to the purchase order form
  await page.goto(`/${PROJECT_ID}/commitments/new?type=purchase_order`);
  await page.waitForLoadState('networkidle');

  // Wait for form
  await expect(page.getByRole('heading', { name: /new purchase order/i })).toBeVisible();
  await page.waitForTimeout(1000);

  // Log everything
  page.on('console', msg => {
    console.log(`[Console]:`, msg.text());
  });

  page.on('request', req => {
    if (req.method() === 'POST') {
      console.log(`[POST Request]:`, req.url());
      console.log(`[POST Data]:`, req.postData());
    }
  });

  page.on('response', async res => {
    if (res.request().method() === 'POST' && res.url().includes('/api/')) {
      console.log(`[Response]:`, res.status(), res.url());
      const body = await res.json().catch(() => ({}));
      console.log(`[Response Body]:`, JSON.stringify(body));
    }
  });

  // Fill ALL fields that the schema requires:
  // 1. contractNumber - required
  const contractField = page.getByRole('textbox', { name: 'Contract #' });
  await contractField.clear();
  await contractField.fill(`PO-ALL-${Date.now()}`);

  // 2. status - required enum (should have default)
  // The select should already have "Draft" - let's verify
  const statusTrigger = page.locator('button[role="combobox"]').filter({ hasText: /draft/i });
  const hasStatus = await statusTrigger.count();
  console.log('Status trigger count:', hasStatus);

  // 3. executed - required boolean (should be false by default)
  // Already set by defaultValues

  // 4. sov - required array (default is [])
  // Already set by defaultValues

  // 5. accountingMethod - required enum (default is 'unit-quantity')
  // Already set by defaultValues

  // Now submit
  const submitButton = page.getByRole('button', { name: /create purchase order/i });

  console.log('\n=== Submitting form ===');
  await submitButton.click();

  // Wait for potential navigation or response
  await page.waitForTimeout(5000);

  console.log('\nFinal URL:', page.url());

  // Check if we navigated
  if (!page.url().includes('/commitments/new')) {
    console.log('✅ Success! Form submitted and navigated');
  } else {
    console.log('❌ Still on form');
    // Look for any visible errors
    const visibleText = await page.locator('body').innerText();
    if (visibleText.includes('required') || visibleText.includes('error')) {
      console.log('Found error-related text in page');
    }
  }

  await page.screenshot({ path: 'tests/screenshots/po-all-fields.png', fullPage: true });
});
