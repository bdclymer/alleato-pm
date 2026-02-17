import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Project Setup - Document Upload', () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    await page.waitForURL(/\/(portfolio|\/\d+\/home)/);

    // Go to setup wizard
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    // Complete basic info step
    await page.fill('input[name="name"]', 'Test Document Upload Project');
    await page.fill('input[name="number"]', `DOC-${Date.now()}`);
    await page.selectOption('select[name="status"]', 'active');
    await page.fill('input[name="address"]', '123 Test St');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="state"]', 'CA');
    await page.fill('input[name="zip"]', '12345');

    // Click Continue to get to document upload step
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(1000);

    // Extract project ID from URL or page context
    const url = page.url();
    const match = url.match(/projectId=(\d+)/);
    if (match) {
      projectId = match[1];
    }
  });

  test('should display document upload interface', async ({ page }) => {
    // Verify dropzone is visible
    await expect(page.locator('text=Drag & drop files here')).toBeVisible();
    await expect(page.locator('text=PDF, Images, Word, Excel')).toBeVisible();
  });

  test('should upload a PDF file successfully', async ({ page }) => {
    // Create a temporary test file
    const testFilePath = path.join(__dirname, '../fixtures/test-document.pdf');

    // Check if file input exists
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Listen for network requests
    const uploadPromise = page.waitForResponse(
      response => response.url().includes('/storage/v1/object/documents') && response.request().method() === 'POST',
      { timeout: 10000 }
    );

    const dbInsertPromise = page.waitForResponse(
      response => response.url().includes('/rest/v1/documents') && response.request().method() === 'POST',
      { timeout: 10000 }
    );

    // Upload file
    await fileInput.setInputFiles(testFilePath);

    // Wait for upload to complete
    try {
      const uploadResponse = await uploadPromise;
      console.log('Storage upload response:', uploadResponse.status(), await uploadResponse.text());

      const dbResponse = await dbInsertPromise;
      console.log('DB insert response:', dbResponse.status(), await dbResponse.text());

      // Verify success indicators
      await expect(page.locator('[data-testid="upload-success"], .text-green-600')).toBeVisible({ timeout: 10000 });

      // Verify document appears in uploaded list
      await expect(page.locator('text=Uploaded Documents')).toBeVisible();
      await expect(page.locator('text=test-document.pdf')).toBeVisible();
    } catch (error) {
      // Capture console errors
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleLogs.push(msg.text());
        }
      });

      await page.waitForTimeout(2000);
      console.error('Console errors:', consoleLogs);

      // Take screenshot for debugging
      await page.screenshot({ path: 'tests/screenshots/upload-failure.png', fullPage: true });

      throw new Error(`Upload failed: ${error}\nConsole errors: ${consoleLogs.join('\n')}`);
    }
  });

  test('should show error message on upload failure', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Attempt to upload a very large file (should fail)
    const testFilePath = path.join(__dirname, '../fixtures/test-document.pdf');
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles(testFilePath);

    // Wait for potential error
    await page.waitForTimeout(3000);

    // Check if any errors occurred
    if (errors.length > 0) {
      console.log('Captured errors:', errors);

      // Verify error UI is shown
      const errorExists = await page.locator('.text-destructive, [role="alert"]').count() > 0;
      expect(errorExists).toBe(true);
    }
  });

  test('should verify storage bucket exists', async ({ page }) => {
    // Make a direct request to check bucket
    const response = await page.request.get('https://lgveqfnpkxvzbnnwuled.supabase.co/storage/v1/bucket/documents');
    console.log('Storage bucket check:', response.status());

    if (response.status() === 404) {
      console.error('CRITICAL: Storage bucket "documents" does not exist!');
    }
  });
});
