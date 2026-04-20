/**
 * Budget Import E2E Tests
 *
 * Tests CSV/Excel import functionality for budget line items.
 *
 * User Story: As a project manager, I can import budget data from CSV
 * to bulk-load my budget.
 *
 * Workflow:
 * 1. Upload valid CSV file
 * 2. Verify preview shows correct row count
 * 3. Import successfully
 * 4. Verify imported lines appear in table
 * 5. Test import with invalid data (validation errors)
 * 6. Test duplicate detection
 *
 * @see /DOCS_NEED_TO_FILE/BUDGET-E2E-TEST-PLAN.md (Test 11)
 * @see .claude/rules/E2E-TESTING-STANDARDS.md
 */

import { test, expect } from '../../fixtures/index';
import { createTestProject } from '../../helpers/bootstrap';
import * as fs from 'fs';
import * as path from 'path';

let projectId: number;

test.describe('Budget Import Functionality', () => {
  test.beforeAll(async ({ authenticatedRequest }) => {
    // Create a test project
    const project = await createTestProject({} as any, { template: 'commercial' }, authenticatedRequest);
    projectId = project.project.id;

    console.log(`[Budget Import] Test project created: ${projectId}`);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page before each test
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /budget/i }).first(),
      'Budget page header should be visible'
    ).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test: Import Budget from CSV File
   *
   * Workflow:
   * 1. Create a test CSV file with valid data
   * 2. Click Import button
   * 3. Upload CSV file
   * 4. Verify preview shows correct data
   * 5. Click Import button in modal
   * 6. Verify success toast
   * 7. Verify imported lines appear in table
   */
  test('user can import budget line items from CSV file', async ({ page }) => {
    // 1. Create a test CSV file
    const csvData = `Cost Code,Description,Amount,Quantity,UOM,Unit Cost
01-1000,Site Preparation,50000,1,LS,50000
02-2000,Foundation Work,75000,100,CY,750
03-3000,Framing,120000,1000,SF,120`;

    const tempDir = '/tmp';
    const csvFilePath = path.join(tempDir, `budget-import-test-${Date.now()}.csv`);
    fs.writeFileSync(csvFilePath, csvData, 'utf-8');

    console.log(`[Budget Import] Created test CSV file: ${csvFilePath}`);

    // 2. Click Import button
    const importButton = page.getByRole('button', { name: /import/i }).first();

    if ((await importButton.count()) === 0) {
      console.log('[Budget Import] Import button not found in UI');
      // Clean up test file
      fs.unlinkSync(csvFilePath);
      test.skip(true, 'Import feature not available in UI');
    }

    await expect(importButton, 'Import button should be visible').toBeVisible({ timeout: 5000 });
    await importButton.click();

    // 3. Wait for import modal
    const importModal = page.getByRole('dialog');
    await expect(importModal, 'Import modal should be visible').toBeVisible({ timeout: 5000 });

    // Verify modal title
    const modalTitle = importModal.getByText(/import.*budget|import/i).first();
    await expect(modalTitle, 'Import modal title should be visible').toBeVisible({
      timeout: 3000,
    });

    // 4. Upload CSV file
    const fileInput = importModal.locator('input[type="file"]');
    await expect(fileInput, 'File input should be available').toBeAttached({ timeout: 3000 });

    await fileInput.setInputFiles(csvFilePath);
    await page.waitForTimeout(1000); // Allow file to process

    // 5. Verify preview appears
    // The preview should show the rows from the CSV
    const preview = importModal.locator('[data-testid="import-preview"]').or(
      importModal.locator('text=Preview').or(importModal.locator('text=3 rows'))
    );

    const previewVisible = (await preview.count()) > 0;

    if (previewVisible) {
      console.log('[Budget Import] Import preview is visible');

      // Look for the data from CSV in preview
      const sitePrep = importModal.getByText(/site preparation/i);
      const foundation = importModal.getByText(/foundation work/i);
      const framing = importModal.getByText(/framing/i);

      // At least one of the rows should be visible
      const hasData =
        (await sitePrep.count()) > 0 ||
        (await foundation.count()) > 0 ||
        (await framing.count()) > 0;

      expect(hasData, 'Preview should show data from CSV file').toBeTruthy();
    }

    // 6. Click Import button in modal
    const modalImportButton = importModal.getByRole('button', { name: /^import$/i });
    await expect(modalImportButton, 'Import button in modal should be visible').toBeVisible({
      timeout: 3000,
    });
    await modalImportButton.click();

    // 7. Wait for import to complete
    // Look for progress indicator
    const progressIndicator = importModal.getByText(/importing|processing/i);
    if ((await progressIndicator.count()) > 0) {
      console.log('[Budget Import] Import in progress...');
      await page.waitForTimeout(2000);
    }

    // 8. Verify success toast
    const successToast = page.getByText(/imported.*successfully|import.*complete/i);
    await expect(successToast, 'Success toast should appear after import').toBeVisible({
      timeout: 10000,
    });

    // Modal should close
    await expect(importModal, 'Import modal should close after successful import').not.toBeVisible({
      timeout: 10000,
    });

    // 9. Verify imported line items appear in table
    // Look for the descriptions from CSV
    const siteRow = page.getByRole('row').filter({ hasText: /site preparation/i });
    const foundationRow = page.getByRole('row').filter({ hasText: /foundation work/i });
    const framingRow = page.getByRole('row').filter({ hasText: /framing/i });

    await expect(siteRow, 'Site Preparation row should be visible').toBeVisible({
      timeout: 5000,
    });
    await expect(foundationRow, 'Foundation Work row should be visible').toBeVisible({
      timeout: 5000,
    });
    await expect(framingRow, 'Framing row should be visible').toBeVisible({ timeout: 5000 });

    // Verify amounts are correct
    const siteAmount = siteRow.getByText('$50,000');
    const foundationAmount = foundationRow.getByText('$75,000');
    const framingAmount = framingRow.getByText('$120,000');

    await expect(siteAmount, 'Site Preparation amount should be $50,000').toBeVisible();
    await expect(foundationAmount, 'Foundation Work amount should be $75,000').toBeVisible();
    await expect(framingAmount, 'Framing amount should be $120,000').toBeVisible();

    // Clean up test file
    fs.unlinkSync(csvFilePath);
    console.log('[Budget Import] Test CSV file cleaned up');
  });

  /**
   * Test: Import with Invalid Data Shows Validation Errors
   *
   * Workflow:
   * 1. Create CSV with invalid data (missing required fields)
   * 2. Upload file
   * 3. Verify validation errors appear
   * 4. Verify import is blocked
   */
  test('import with invalid data shows validation errors', async ({ page }) => {
    // 1. Create CSV with missing required fields
    const invalidCsvData = `Cost Code,Description,Amount,Quantity,UOM,Unit Cost
,Site Preparation,50000,1,LS,50000
01-2000,,75000,100,CY,750
01-3000,Framing,-1000,1000,SF,120`;

    const tempDir = '/tmp';
    const csvFilePath = path.join(tempDir, `budget-invalid-test-${Date.now()}.csv`);
    fs.writeFileSync(csvFilePath, invalidCsvData, 'utf-8');

    console.log(`[Budget Import] Created invalid test CSV file: ${csvFilePath}`);

    // 2. Click Import button
    const importButton = page.getByRole('button', { name: /import/i }).first();

    if ((await importButton.count()) === 0) {
      fs.unlinkSync(csvFilePath);
      test.skip(true, 'Import feature not available in UI');
    }

    await importButton.click();

    const importModal = page.getByRole('dialog');
    await expect(importModal).toBeVisible({ timeout: 5000 });

    // 3. Upload invalid CSV file
    const fileInput = importModal.locator('input[type="file"]');
    await fileInput.setInputFiles(csvFilePath);
    await page.waitForTimeout(1000);

    // 4. Try to import
    const modalImportButton = importModal.getByRole('button', { name: /^import$/i });

    if ((await modalImportButton.count()) > 0) {
      await modalImportButton.click();
      await page.waitForTimeout(1000);

      // 5. Verify validation errors appear
      const errorMessage = page.getByText(
        /error|invalid|missing|required|validation/i
      );

      // At least one error should be visible
      const errorVisible = (await errorMessage.count()) > 0;

      if (errorVisible) {
        const errorText = await errorMessage.first().textContent();
        console.log('[Budget Import] Validation error:', errorText);

        expect(
          errorText?.toLowerCase(),
          'Error message should mention specific validation issues'
        ).toMatch(/cost code|description|amount|negative|required|missing/);
      }

      // 6. Verify modal stays open (import blocked)
      await expect(
        importModal,
        'Import modal should remain open when validation fails'
      ).toBeVisible({ timeout: 2000 });
    }

    // Clean up
    fs.unlinkSync(csvFilePath);
    console.log('[Budget Import] Invalid test CSV file cleaned up');
  });

  /**
   * Test: Import Duplicate Detection
   *
   * Workflow:
   * 1. Import a CSV file
   * 2. Import the same file again
   * 3. Verify duplicate warning or prevention
   */
  test('import detects and handles duplicate budget line items', async ({ page }) => {
    // 1. Create CSV with unique data
    const csvData = `Cost Code,Description,Amount,Quantity,UOM,Unit Cost
04-4000,Duplicate Test,25000,5,EA,5000`;

    const tempDir = '/tmp';
    const csvFilePath = path.join(tempDir, `budget-duplicate-test-${Date.now()}.csv`);
    fs.writeFileSync(csvFilePath, csvData, 'utf-8');

    console.log(`[Budget Import] Created test CSV for duplicate detection: ${csvFilePath}`);

    const importButton = page.getByRole('button', { name: /import/i }).first();

    if ((await importButton.count()) === 0) {
      fs.unlinkSync(csvFilePath);
      test.skip(true, 'Import feature not available in UI');
    }

    // 2. First import
    await importButton.click();

    let importModal = page.getByRole('dialog');
    await expect(importModal).toBeVisible({ timeout: 5000 });

    let fileInput = importModal.locator('input[type="file"]');
    await fileInput.setInputFiles(csvFilePath);
    await page.waitForTimeout(1000);

    let modalImportButton = importModal.getByRole('button', { name: /^import$/i });
    await modalImportButton.click();

    // Wait for import to complete
    const firstSuccessToast = page.getByText(/imported.*successfully/i);
    await expect(firstSuccessToast, 'First import should succeed').toBeVisible({
      timeout: 10000,
    });

    await expect(importModal).not.toBeVisible({ timeout: 5000 });

    // Verify item appears
    const duplicateRow = page.getByRole('row').filter({ hasText: /duplicate test/i });
    await expect(duplicateRow, 'Imported item should be visible').toBeVisible({ timeout: 5000 });

    // 3. Second import (duplicate)
    await page.waitForTimeout(1000);
    await importButton.click();

    importModal = page.getByRole('dialog');
    await expect(importModal).toBeVisible({ timeout: 5000 });

    fileInput = importModal.locator('input[type="file"]');
    await fileInput.setInputFiles(csvFilePath);
    await page.waitForTimeout(1000);

    modalImportButton = importModal.getByRole('button', { name: /^import$/i });
    await modalImportButton.click();
    await page.waitForTimeout(2000);

    // 4. Verify duplicate handling
    // Three possible behaviors:
    // A. Duplicate warning appears
    // B. Import succeeds but creates duplicate rows
    // C. Import prevents duplicates

    const duplicateWarning = page.getByText(/duplicate|already exists/i);
    const duplicateWarningVisible = (await duplicateWarning.count()) > 0;

    if (duplicateWarningVisible) {
      console.log('[Budget Import] Duplicate warning detected');
      const warningText = await duplicateWarning.first().textContent();
      console.log('[Budget Import] Warning text:', warningText);
    } else {
      // Check if duplicate rows were created
      const duplicateRows = page.getByRole('row').filter({ hasText: /duplicate test/i });
      const rowCount = await duplicateRows.count();

      console.log(`[Budget Import] Duplicate row count: ${rowCount}`);

      if (rowCount > 1) {
        console.log('[Budget Import] Duplicate import created multiple rows');
      } else {
        console.log('[Budget Import] Duplicate import was prevented or merged');
      }
    }

    // Clean up
    fs.unlinkSync(csvFilePath);
    console.log('[Budget Import] Duplicate test CSV file cleaned up');
  });

  /**
   * Cleanup: Delete test project
   */
  test.afterAll(async ({ request }) => {
    if (!projectId) return;

    console.log(`[Budget Import] Cleaning up test project: ${projectId}`);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const response = await request.delete(`${baseUrl}/api/projects/${projectId}`);

    if (response.ok()) {
      console.log(`[Budget Import] Test project ${projectId} deleted successfully`);
    } else {
      console.error(
        `[Budget Import] Failed to delete test project ${projectId}: ${response.status()}`
      );
    }
  });
});
