import { test, expect } from '@playwright/test';

test.describe('Budget Code Modal - Debug Cost Codes Loading', () => {
  test('should open modal and verify cost codes load from Supabase', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for network requests to Supabase
    const supabaseRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('supabase')) {
        supabaseRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
        });
      }
    });

    // Listen for network responses from Supabase
    const supabaseResponses: any[] = [];
    page.on('response', async response => {
      if (response.url().includes('supabase')) {
        try {
          const body = await response.json();
          supabaseResponses.push({
            url: response.url(),
            status: response.status(),
            body: body,
          });
        } catch (e) {
          supabaseResponses.push({
            url: response.url(),
            status: response.status(),
            body: 'Could not parse response',
          });
        }
      }
    });

    // Navigate to a project's budget page
    await page.goto('http://localhost:3001/1/budget');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Find and click the "Create" button in the page header to open the dropdown
    const createButton = page.getByRole('button', { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Wait for dropdown to appear and click "Budget Line Item"
    await page.waitForTimeout(500);
    const budgetLineItemOption = page.getByText('Budget Line Item');
    await expect(budgetLineItemOption).toBeVisible({ timeout: 5000 });
    await budgetLineItemOption.click();

    // Wait for the line item modal to appear
    await page.waitForTimeout(1000);

    // Click on the "Select budget code..." input to open the dropdown
    const budgetCodeInput = page.getByPlaceholder('Select budget code...');
    await expect(budgetCodeInput).toBeVisible({ timeout: 5000 });
    await budgetCodeInput.click();

    // Wait for the dropdown to appear
    await page.waitForTimeout(500);

    // Find and click the "Create New Budget Code" link/button inside the dropdown
    const createCodeButton = page.getByText('Create New Budget Code');
    await expect(createCodeButton).toBeVisible({ timeout: 5000 });
    await createCodeButton.click();

    // Wait for the budget code creation modal/dialog to appear
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait a bit for the cost codes to load
    await page.waitForTimeout(2000);

    // Log all console errors
    console.log('\n=== CONSOLE ERRORS ===');
    consoleErrors.forEach(error => {
      console.log(error);
    });

    // Log all Supabase requests
    console.log('\n=== SUPABASE REQUESTS ===');
    supabaseRequests.forEach(req => {
      console.log(`${req.method} ${req.url}`);
    });

    // Log all Supabase responses
    console.log('\n=== SUPABASE RESPONSES ===');
    supabaseResponses.forEach(res => {
      console.log(`URL: ${res.url}`);
      console.log(`Status: ${res.status}`);
      console.log(`Body: ${JSON.stringify(res.body, null, 2)}`);
    });

    // Try to find the division dropdown
    const divisionDropdown = page.getByRole('combobox').filter({ hasText: /select division/i });

    if (await divisionDropdown.isVisible({ timeout: 2000 })) {
      console.log('\n=== DIVISION DROPDOWN IS VISIBLE ===');

      // Click to open the dropdown
      await divisionDropdown.click();

      // Wait for options to appear
      await page.waitForTimeout(1000);

      // Get all options
      const options = page.getByRole('option');
      const optionCount = await options.count();

      console.log(`\n=== DIVISION OPTIONS COUNT: ${optionCount} ===`);

      if (optionCount > 0) {
        console.log('\n=== DIVISION OPTIONS ===');
        for (let i = 0; i < optionCount; i++) {
          const optionText = await options.nth(i).textContent();
          console.log(`Option ${i}: ${optionText}`);
        }
      } else {
        console.log('\n=== NO DIVISION OPTIONS FOUND ===');
      }
    } else {
      console.log('\n=== DIVISION DROPDOWN NOT VISIBLE ===');
    }

    // Check if there's an error message in the modal
    const errorText = await modal.textContent();
    if (errorText?.includes('error') || errorText?.includes('Error')) {
      console.log('\n=== ERROR TEXT IN MODAL ===');
      console.log(errorText);
    }

    // Take a screenshot for visual debugging
    await page.screenshot({ path: 'frontend/tests/screenshots/budget-code-modal-debug.png', fullPage: true });

    // Assertions
    expect(consoleErrors.length).toBe(0); // Should have no console errors
    expect(supabaseResponses.length).toBeGreaterThan(0); // Should have at least one Supabase response

    // Check if any Supabase response had an error
    const hasSupabaseError = supabaseResponses.some(res =>
      res.body && (res.body.error || res.status >= 400)
    );

    if (hasSupabaseError) {
      console.log('\n=== SUPABASE ERROR DETECTED ===');
      const errorResponse = supabaseResponses.find(res =>
        res.body && (res.body.error || res.status >= 400)
      );
      console.log(JSON.stringify(errorResponse, null, 2));
    }

    expect(hasSupabaseError).toBe(false); // Should not have Supabase errors
  });

  test('should verify cost_codes table exists and has data', async ({ page }) => {
    // This test will try to query the cost_codes table directly
    await page.goto('http://localhost:3001/1/budget');
    await page.waitForLoadState('networkidle');

    // Execute a script to check if we can query cost_codes
    const result = await page.evaluate(async () => {
      try {
        // Import the Supabase client
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Try to query cost_codes
        const { data, error } = await supabase
          .from('cost_codes')
          .select('*')
          .limit(5);

        return {
          success: !error,
          error: error,
          dataCount: data?.length || 0,
          sampleData: data?.slice(0, 2) || [],
        };
      } catch (e: any) {
        return {
          success: false,
          error: e.message,
          dataCount: 0,
          sampleData: [],
        };
      }
    });

    console.log('\n=== COST_CODES TABLE CHECK ===');
    console.log(JSON.stringify(result, null, 2));

    expect(result.success).toBe(true);
    expect(result.dataCount).toBeGreaterThan(0);
  });

  test('should verify cost_code_divisions relation works', async ({ page }) => {
    await page.goto('http://localhost:3001/1/budget');
    await page.waitForLoadState('networkidle');

    // Execute a script to check the relation
    const result = await page.evaluate(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Try to query with the relation
        const { data, error } = await supabase
          .from('cost_codes')
          .select(`
            id,
            description,
            division,
            cost_code_divisions (
              code,
              title,
              sort_order
            )
          `)
          .limit(5);

        return {
          success: !error,
          error: error,
          dataCount: data?.length || 0,
          sampleData: data?.slice(0, 2) || [],
        };
      } catch (e: any) {
        return {
          success: false,
          error: e.message,
          dataCount: 0,
          sampleData: [],
        };
      }
    });

    console.log('\n=== COST_CODE_DIVISIONS RELATION CHECK ===');
    console.log(JSON.stringify(result, null, 2));

    expect(result.success).toBe(true);
    expect(result.dataCount).toBeGreaterThan(0);
  });
});
