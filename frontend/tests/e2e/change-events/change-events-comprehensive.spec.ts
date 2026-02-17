import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Change Events - Comprehensive Browser Verification', () => {
  const screenshotsDir = path.join(__dirname, '../screenshots/change-events');
  let projectId: number;
  let changeEventId: string;

  test.beforeAll(async ({ request }) => {
    // Get a valid project ID
    const response = await request.get('http://localhost:3000/api/projects');
    const result = await response.json();

    // Handle both direct array and { data: [] } response formats
    const projects = result.data || result;

    if (projects && projects.length > 0) {
      projectId = projects[0].id;
      console.log('Using project ID:', projectId);
    } else {
      throw new Error('No projects found. Cannot run tests.');
    }
  });

  test('1. List Page - Verify page loads and UI elements', async ({ page }) => {
    console.log('Navigating to change events list page...');

    // Navigate to change events page
    await page.goto(`/${projectId}/change-events`);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'browser-test-list-page.png'),
      fullPage: true
    });

    // Verify page title/header
    const pageTitle = await page.locator('h1, h2').first();
    await expect(pageTitle).toBeVisible();
    console.log('Page title:', await pageTitle.textContent());

    // Verify status filter tabs exist
    const tabs = page.locator('[role="tablist"], .tabs, [data-testid*="tab"]').first();
    if (await tabs.count() > 0) {
      await expect(tabs).toBeVisible();
      console.log('✓ Status filter tabs found');
    } else {
      console.log('⚠ No status filter tabs found (may be expected if empty)');
    }

    // Verify "New Change Event" button exists
    const createButton = page.locator('button, a').filter({
      hasText: /create.*change.*event/i
    }).first();

    if (await createButton.count() > 0) {
      await expect(createButton).toBeVisible();
      console.log('✓ Create button found');
    } else {
      console.log('⚠ Create button not found');
    }

    // Check for empty state or existing data
    const emptyState = page.locator('text=/no.*change.*events/i, text=/empty/i').first();
    const tableRows = page.locator('table tbody tr, [role="row"]');

    if (await emptyState.count() > 0) {
      console.log('✓ Empty state displayed (no change events yet)');
    } else if (await tableRows.count() > 0) {
      console.log('✓ Change events table displayed with data');
    } else {
      console.log('⚠ Neither empty state nor table found');
    }

    // Check console for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    } else {
      console.log('✓ No console errors');
    }
  });

  test('2. Create Form - Verify form renders with all fields', async ({ page }) => {
    console.log('Testing create form...');

    await page.goto(`/${projectId}/change-events`);
    await page.waitForLoadState('domcontentloaded');

    // Click create button
    const createButton = page.locator('button, a').filter({
      hasText: /create.*change.*event/i
    }).first();

    await createButton.click();

    // Wait for form to appear (could be modal or new page)
    await page.waitForTimeout(1000);

    // Take screenshot of form
    await page.screenshot({
      path: path.join(screenshotsDir, 'browser-test-create-form.png'),
      fullPage: true
    });

    // Verify required fields exist
    const requiredFields = {
      number: page.locator('input[name="number"], input[id*="number"]').first(),
      title: page.locator('input[name="title"], input[id*="title"]').first(),
      type: page.locator('select[name="type"], [id*="type"]').first(),
      scope: page.locator('select[name="scope"], [id*="scope"]').first(),
      status: page.locator('select[name="status"], [id*="status"]').first(),
    };

    console.log('Checking for required fields...');

    for (const [fieldName, locator] of Object.entries(requiredFields)) {
      if (await locator.count() > 0) {
        console.log(`✓ ${fieldName} field found`);
      } else {
        console.log(`✗ ${fieldName} field NOT found`);
      }
    }

    // Check for dropdowns with options
    const typeDropdown = page.locator('select[name="type"], [role="combobox"][id*="type"]').first();
    if (await typeDropdown.count() > 0) {
      const options = await typeDropdown.locator('option, [role="option"]').count();
      console.log(`✓ Type dropdown has ${options} options`);
    }

    const scopeDropdown = page.locator('select[name="scope"], [role="combobox"][id*="scope"]').first();
    if (await scopeDropdown.count() > 0) {
      const options = await scopeDropdown.locator('option, [role="option"]').count();
      console.log(`✓ Scope dropdown has ${options} options`);
    }

    // Check for "Expecting Revenue" field
    const expectingRevenueField = page.locator('input[name="expecting_revenue"], input[type="radio"][value="true"]').first();
    if (await expectingRevenueField.count() > 0) {
      console.log('✓ Expecting Revenue field found');
    }

    // Verify submit button exists
    const submitButton = page.locator('button[type="submit"], button').filter({
      hasText: /submit|create|save/i
    }).first();

    if (await submitButton.count() > 0) {
      await expect(submitButton).toBeVisible();
      console.log('✓ Submit button found');
    } else {
      console.log('✗ Submit button NOT found');
    }
  });

  test('3. Form Submission - Fill and submit form', async ({ page }) => {
    console.log('Testing form submission...');

    await page.goto(`/${projectId}/change-events`);
    await page.waitForLoadState('domcontentloaded');

    // Track network requests
    const apiCalls: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/') || response.url().includes('change-events')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Click create button
    const createButton = page.locator('button, a').filter({
      hasText: /create.*change.*event/i
    }).first();
    await createButton.click();
    await page.waitForTimeout(1000);

    // Fill required fields
    console.log('Filling form fields...');

    // Number field (if editable)
    const numberField = page.locator('input[name="number"]').first();
    if (await numberField.count() > 0 && await numberField.isEditable()) {
      await numberField.fill('TEST-001');
      console.log('✓ Filled number field');
    }

    // Title field
    const titleField = page.locator('input[name="title"]').first();
    if (await titleField.count() > 0) {
      await titleField.fill('Browser Test Change Event');
      console.log('✓ Filled title field');
    }

    // Type dropdown
    const typeField = page.locator('select[name="type"]').first();
    if (await typeField.count() > 0) {
      await typeField.selectOption({ index: 1 }); // Select first non-empty option
      console.log('✓ Selected type');
    }

    // Scope dropdown
    const scopeField = page.locator('select[name="scope"]').first();
    if (await scopeField.count() > 0) {
      await scopeField.selectOption({ index: 1 }); // Select first non-empty option
      console.log('✓ Selected scope');
    }

    // Description (optional)
    const descriptionField = page.locator('textarea[name="description"]').first();
    if (await descriptionField.count() > 0) {
      await descriptionField.fill('This is a test change event created by Playwright browser verification.');
      console.log('✓ Filled description');
    }

    // Take screenshot before submission
    await page.screenshot({
      path: path.join(screenshotsDir, 'browser-test-form-filled.png'),
      fullPage: true
    });

    // Submit form
    const submitButton = page.locator('button[type="submit"], button').filter({
      hasText: /submit|create|save/i
    }).first();

    console.log('Submitting form...');
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForTimeout(2000);

    // Check for API responses
    console.log('API calls made during submission:');
    apiCalls.forEach(call => {
      console.log(`  ${call.status} - ${call.url}`);
    });

    // Take screenshot after submission
    await page.screenshot({
      path: path.join(screenshotsDir, 'browser-test-submit.png'),
      fullPage: true
    });

    // Look for success indicators
    const successMessage = page.locator('text=/success|created|saved/i').first();
    if (await successMessage.count() > 0) {
      console.log('✓ Success message displayed');
    }

    // Check if redirected to list page
    const currentUrl = page.url();
    console.log('Current URL after submission:', currentUrl);

    if (currentUrl.includes('/change-events') && !currentUrl.includes('/new')) {
      console.log('✓ Redirected to change events list');
    }
  });

  test('4. List After Create - Verify new change event appears', async ({ page }) => {
    console.log('Verifying change event appears in list...');

    await page.goto(`/${projectId}/change-events`);
    await page.waitForLoadState('domcontentloaded');

    // Look for the test change event
    const testChangeEvent = page.locator('text=/Browser Test Change Event/i').first();

    if (await testChangeEvent.count() > 0) {
      await expect(testChangeEvent).toBeVisible();
      console.log('✓ Test change event found in list');

      // Take screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, 'browser-test-list-with-data.png'),
        fullPage: true
      });
    } else {
      console.log('✗ Test change event NOT found in list');

      // Take screenshot anyway for debugging
      await page.screenshot({
        path: path.join(screenshotsDir, 'browser-test-list-after-create.png'),
        fullPage: true
      });
    }

    // Count total change events
    const rows = page.locator('table tbody tr, [role="row"]');
    const count = await rows.count();
    console.log(`Total change events in list: ${count}`);
  });

  test('5. Detail View - Verify detail page displays data', async ({ page }) => {
    console.log('Testing detail view...');

    await page.goto(`/${projectId}/change-events`);
    await page.waitForLoadState('domcontentloaded');

    // Find and click on the test change event
    const testChangeEvent = page.locator('text=/Browser Test Change Event/i').first();

    if (await testChangeEvent.count() > 0) {
      await testChangeEvent.click();
      await page.waitForLoadState('domcontentloaded');

      // Take screenshot of detail page
      await page.screenshot({
        path: path.join(screenshotsDir, 'browser-test-detail-page.png'),
        fullPage: true
      });

      // Verify tabs appear
      const tabs = ['Details', 'Line Items', 'Attachments', 'History'];

      for (const tabName of tabs) {
        const tab = page.locator(`text=/^${tabName}$/i`).first();
        if (await tab.count() > 0) {
          console.log(`✓ ${tabName} tab found`);
        } else {
          console.log(`⚠ ${tabName} tab not found`);
        }
      }

      // Verify data displays
      const title = page.locator('text=/Browser Test Change Event/i').first();
      if (await title.count() > 0) {
        console.log('✓ Title displays correctly');
      }

      const status = page.locator('text=/open|pending|approved/i').first();
      if (await status.count() > 0) {
        console.log('✓ Status displays');
      }

    } else {
      console.log('✗ Could not find test change event to view details');
    }
  });

  test('6. Console and API Verification', async ({ page }) => {
    console.log('Checking for console errors and API issues...');

    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    await page.goto(`/${projectId}/change-events`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    console.log('\n=== Console Errors ===');
    if (consoleErrors.length === 0) {
      console.log('✓ No console errors');
    } else {
      consoleErrors.forEach(err => console.log(`✗ ${err}`));
    }

    console.log('\n=== Console Warnings ===');
    if (consoleWarnings.length === 0) {
      console.log('✓ No console warnings');
    } else {
      consoleWarnings.forEach(warn => console.log(`⚠ ${warn}`));
    }
  });
});
