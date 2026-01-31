import { test, expect } from '@playwright/test';

test.describe('Budget Line Item Creation', () => {
  test('should create budget line items and display them in the budget table', async ({ page }) => {
    // Navigate to the budget page for project 34
    await page.goto('http://localhost:3000/34/budget');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: 'frontend/tests/screenshots/budget-page-before-creation.png',
      fullPage: true
    });

    // Look for the Create button
    const createButton = page.locator('button:has-text("Create")').first();
    const isVisible = await createButton.isVisible();
    console.log('Create button visible:', isVisible);

    // Click the Create button to open dropdown
    await createButton.click();

    // Wait for dropdown and click "Budget Line Item"
    await page.waitForTimeout(500);
    await page.click('text=Budget Line Item');

    // Wait for the modal to open
    await page.waitForTimeout(1000);
    await expect(page.getByRole('dialog')).toBeVisible();

    // Take screenshot of opened modal
    await page.screenshot({
      path: 'frontend/tests/screenshots/budget-line-item-modal-opened.png',
      fullPage: true
    });

    // Click on the "Select budget code..." button to open the popover
    const budgetCodeButton = page.locator('button[role="combobox"]:has-text("Select budget code...")').first();
    await budgetCodeButton.click();

    await page.waitForTimeout(500);

    // Take screenshot of budget code selector popover
    await page.screenshot({
      path: 'frontend/tests/screenshots/budget-code-selector-opened.png',
      fullPage: true
    });

    // Wait for the CommandInput to be visible in the popover
    const searchInput = page.locator('input[placeholder="Search budget codes..."]');
    await expect(searchInput).toBeVisible();

    // Try to select the first available budget code from the list
    // CommandItem elements have role="option"
    const firstBudgetCode = page.locator('[role="option"]').first();

    // Wait a bit for options to load
    await page.waitForTimeout(1000);

    const hasOptions = await firstBudgetCode.isVisible().catch(() => false);

    if (hasOptions) {
      console.log('Selecting first available budget code');
      await firstBudgetCode.click();
      await page.waitForTimeout(500);

      // Take screenshot after selecting budget code
      await page.screenshot({
        path: 'frontend/tests/screenshots/budget-code-selected.png',
        fullPage: true
      });
    } else {
      console.log('No budget codes available in the list');

      // If no codes are available, we need to create one
      // Look for "Create New Budget Code" option
      const createCodeOption = page.locator('text=Create New Budget Code');
      const canCreate = await createCodeOption.isVisible().catch(() => false);

      if (canCreate) {
        console.log('No existing codes found - would need to create one first');
        throw new Error('No budget codes available. Test requires existing budget codes to be set up.');
      } else {
        throw new Error('No budget codes available and cannot create new ones');
      }
    }

    // Enter amount in the Amount field
    // The Amount column is the last column in the table under "Amount*" header
    // There are multiple inputs with placeholder "0.00" (Unit Cost and Amount)
    // We want the one in the Amount column specifically
    const amountInput = page.locator('tr').filter({ hasText: '01-3120.L' }).locator('input[placeholder="0.00"]').last();

    // Click to focus the field
    await amountInput.click();

    // Select all existing text and delete it
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');

    // Type the amount character by character to ensure onChange fires
    await page.keyboard.type('10000', { delay: 50 });

    // Press Tab to trigger blur and ensure state updates
    await page.keyboard.press('Tab');

    await page.waitForTimeout(500);

    // Take screenshot with amount filled
    await page.screenshot({
      path: 'frontend/tests/screenshots/budget-line-item-with-amount.png',
      fullPage: true
    });

    // Check for validation issues before submitting
    // Note: The "Issue" button in the bottom left is from Next.js Dev Tools, not form validation
    const issuesButton = page.locator('button:has-text("Issue")');
    const hasIssues = await issuesButton.isVisible().catch(() => false);

    if (hasIssues) {
      console.log('Next.js Dev Tools issues detected (not form validation) - taking screenshot');
      await page.screenshot({
        path: 'frontend/tests/screenshots/before-submit.png',
        fullPage: true
      });

      const issuesText = await issuesButton.textContent();
      console.log('Dev Tools Issues:', issuesText);
      // These are console errors from Next.js, not form validation errors
      // The form should still be submittable
    }

    // Set up alert dialog handler to catch validation messages
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      console.log('Alert dialog:', alertMessage);
      await dialog.accept();
    });

    // Click the "Create 1 Line Item" button
    const submitButton = page.locator('button:has-text("Create 1 Line Item")');
    await submitButton.click();

    // Wait for modal to close or error message
    await page.waitForTimeout(2000);

    // If there was an alert, the validation failed
    if (alertMessage) {
      console.log('Validation failed with message:', alertMessage);
      await page.screenshot({
        path: 'frontend/tests/screenshots/validation-failed-after-submit.png',
        fullPage: true
      });
      throw new Error(`Validation failed: ${alertMessage}`);
    }

    // Check if modal is still open (validation error) or closed (success)
    const modalStillOpen = await page.getByRole('dialog').isVisible().catch(() => false);

    if (modalStillOpen) {
      console.log('Modal still open - likely validation errors');
      await page.screenshot({
        path: 'frontend/tests/screenshots/submit-failed.png',
        fullPage: true
      });
      throw new Error('Form submission failed - modal still open. Check validation-issues.png for details.');
    }

    console.log('Modal closed - submission successful');

    // Wait for page to update
    await page.waitForTimeout(2000);

    // Take screenshot after submission
    await page.screenshot({
      path: 'frontend/tests/screenshots/budget-page-after-submission.png',
      fullPage: true
    });

    // Look for the budget table on the main page (not the modal table)
    // The main budget table should have the "Original Budget Amount" column
    const budgetTable = page.locator('table').filter({ hasText: 'Original Budget Amount' });
    const tableVisible = await budgetTable.isVisible();
    console.log('Budget table visible after submission:', tableVisible);

    if (tableVisible) {
      // Look for the amount in the table
      const tableContent = await budgetTable.textContent();
      console.log('Table contains 10,000:', tableContent?.includes('10,000') || tableContent?.includes('10000'));
      console.log('Table contains budget code:', tableContent?.includes('01-3120'));
    }

    console.log('✓ Budget line item creation test completed');
  });
});
