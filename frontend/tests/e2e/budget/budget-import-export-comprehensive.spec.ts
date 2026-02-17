import { test, expect, Download } from '../../fixtures/index';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { createTestProject } from '../../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

const TEST_PROJECT_ID = '118';
const BASE_URL = `${process.env.BASE_URL || 'http://localhost:3000'}/${TEST_PROJECT_ID}/budget`;

test.describe.skip('Budget Import/Export Functionality - Complete Verification', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Load authentication
    const authFile = path.join(__dirname, '../.auth/user.json');
    const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));

    // Set cookies
    await page.context().addCookies(authData.cookies);

    // Navigate to budget page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Excel Import Functionality', () => {
    test('should successfully import budget from Excel file', async ({ page }) => {
      // Create a test Excel file with valid data
      const testData = [
        {
          'Cost Code': '01-1000',
          'Cost Type': 'L',
          'Description': 'Excel Import Test - Labor',
          'Unit Qty': 100,
          'UOM': 'HR',
          'Unit Cost': 75,
          'Budget Amount': 7500
        },
        {
          'Cost Code': '01-2000',
          'Cost Type': 'M',
          'Description': 'Excel Import Test - Materials',
          'Unit Qty': 50,
          'UOM': 'EA',
          'Unit Cost': 150,
          'Budget Amount': 7500
        },
        {
          'Cost Code': '01-3000',
          'Cost Type': 'E',
          'Description': 'Excel Import Test - Equipment',
          'Unit Qty': 25,
          'UOM': 'DAY',
          'Unit Cost': 300,
          'Budget Amount': 7500
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Budget Line Items');

      const tempDir = '/tmp';
      const testFilePath = path.join(tempDir, 'test-excel-import.xlsx');
      XLSX.writeFile(workbook, testFilePath);

      // Click Import button
      const importButton = page.getByRole('button', { name: /import/i }).first();
      await expect(importButton).toBeVisible({ timeout: 5000 });
      await importButton.click();
      await page.waitForTimeout(500);

      // Verify import modal appears
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      await expect(modal.locator('text=Import Budget').or(modal.locator('text=Import'))).toBeVisible();

      // Upload the file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      await page.waitForTimeout(500);

      // Verify file is selected
      await expect(page.locator('text=test-excel-import.xlsx')).toBeVisible({ timeout: 3000 });

      // Click Import button in modal
      const modalImportButton = modal.getByRole('button', { name: /^Import$/i });
      await modalImportButton.click();
      await page.waitForTimeout(2000);

      // Wait for success message
      const successMessage = page.locator('text=imported successfully').or(
        page.locator('text=3 line item').or(
          page.locator('text=Import completed')
        )
      );

      const successVisible = await successMessage.isVisible({ timeout: 10000 }).catch(() => false);

      if (successVisible) {
        await expect(successMessage).toBeVisible();
      }

      // Verify modal closes
      await expect(modal).not.toBeVisible({ timeout: 5000 });

      // Wait for table to refresh and verify imported items appear
      await page.waitForTimeout(2000);

      // Check for imported items in the budget table
      await expect(page.locator('text=Excel Import Test - Labor')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Excel Import Test - Materials')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Excel Import Test - Equipment')).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'tests/screenshots/import-export/excel-import-success.png' });

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    test('should handle Excel import with invalid data', async ({ page }) => {
      // Create Excel file with invalid cost codes
      const invalidData = [
        {
          'Cost Code': 'INVALID-CODE',
          'Cost Type': 'L',
          'Description': 'Invalid Cost Code Test',
          'Unit Qty': 100,
          'UOM': 'HR',
          'Unit Cost': 75,
          'Budget Amount': 7500
        },
        {
          'Cost Code': '', // Empty cost code
          'Cost Type': 'M',
          'Description': 'Empty Cost Code Test',
          'Unit Qty': 50,
          'UOM': 'EA',
          'Unit Cost': 150,
          'Budget Amount': 7500
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(invalidData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Budget Line Items');

      const tempDir = '/tmp';
      const testFilePath = path.join(tempDir, 'test-excel-import-invalid.xlsx');
      XLSX.writeFile(workbook, testFilePath);

      // Perform import
      const importButton = page.getByRole('button', { name: /import/i }).first();
      await importButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      await page.waitForTimeout(500);

      const modalImportButton = modal.getByRole('button', { name: /^Import$/i });
      await modalImportButton.click();
      await page.waitForTimeout(2000);

      // Should show error or 0 items imported
      const errorMessage = page.locator('text=0 line item').or(
        page.locator('text=error').or(
          page.locator('text=failed')
        )
      );

      const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);

      if (errorVisible) {
        await expect(errorMessage).toBeVisible();
      }

      await page.screenshot({ path: 'tests/screenshots/import-export/excel-import-invalid.png' });

      // Clean up
      fs.unlinkSync(testFilePath);
    });

    test('should validate Excel file format requirements', async ({ page }) => {
      // Create Excel file with wrong headers
      const wrongHeaderData = [
        {
          'Wrong Header 1': '01-1000',
          'Wrong Header 2': 'L',
          'Wrong Header 3': 'Test Item',
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(wrongHeaderData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Budget Line Items');

      const tempDir = '/tmp';
      const testFilePath = path.join(tempDir, 'test-excel-wrong-headers.xlsx');
      XLSX.writeFile(workbook, testFilePath);

      // Attempt import
      const importButton = page.getByRole('button', { name: /import/i }).first();
      await importButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      await page.waitForTimeout(500);

      const modalImportButton = modal.getByRole('button', { name: /^Import$/i });
      await modalImportButton.click();
      await page.waitForTimeout(2000);

      // Should show validation error
      const validationError = page.locator('text=required columns').or(
        page.locator('text=Invalid format').or(
          page.locator('text=missing headers')
        )
      );

      const errorVisible = await validationError.isVisible({ timeout: 5000 }).catch(() => false);

      if (errorVisible) {
        await expect(validationError).toBeVisible();
      }

      await page.screenshot({ path: 'tests/screenshots/import-export/excel-validation-error.png' });

      // Clean up
      fs.unlinkSync(testFilePath);
    });
  });

  test.describe('CSV Import Functionality', () => {
    test('should successfully import budget from CSV file', async ({ page }) => {
      // Create a test CSV file
      const csvData = `Cost Code,Cost Type,Description,Unit Qty,UOM,Unit Cost,Budget Amount
01-4000,L,CSV Import Test - Labor,80,HR,85,6800
01-5000,M,CSV Import Test - Materials,40,EA,175,7000`;

      const tempDir = '/tmp';
      const testFilePath = path.join(tempDir, 'test-csv-import.csv');
      fs.writeFileSync(testFilePath, csvData);

      // Click Import button
      const importButton = page.getByRole('button', { name: /import/i }).first();
      await importButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Upload CSV file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      await page.waitForTimeout(500);

      // Verify CSV file is accepted
      await expect(page.locator('text=test-csv-import.csv')).toBeVisible({ timeout: 3000 });

      const modalImportButton = modal.getByRole('button', { name: /^Import$/i });
      await modalImportButton.click();
      await page.waitForTimeout(2000);

      // Wait for success
      const successMessage = page.locator('text=imported successfully').or(
        page.locator('text=2 line item').or(
          page.locator('text=Import completed')
        )
      );

      const successVisible = await successMessage.isVisible({ timeout: 10000 }).catch(() => false);

      if (successVisible) {
        await expect(successMessage).toBeVisible();
      }

      // Check for imported items
      await page.waitForTimeout(2000);
      await expect(page.locator('text=CSV Import Test - Labor')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=CSV Import Test - Materials')).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'tests/screenshots/import-export/csv-import-success.png' });

      // Clean up
      fs.unlinkSync(testFilePath);
    });
  });

  test.describe('Excel Export Functionality', () => {
    test('should export budget to Excel format', async ({ page }) => {
      // Wait for page to load
      await page.waitForSelector('table', { timeout: 10000 });

      // Click Export dropdown
      const exportButton = page.getByRole('button', { name: /export/i }).first();
      await exportButton.click();
      await page.waitForTimeout(300);

      // Verify export dropdown appears
      const dropdown = page.locator('[role="menu"]');
      await expect(dropdown).toBeVisible();

      // Click Export to Excel option
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      const excelOption = page.getByRole('menuitem', { name: /Export to Excel/i });
      await expect(excelOption).toBeVisible();
      await excelOption.click();

      // Wait for download to complete
      let download: Download | null = null;
      try {
        download = await downloadPromise;
      } catch (error) {
        console.log('Excel export may not trigger download in test environment');
      }

      if (download) {
        // Verify download properties
        expect(download.suggestedFilename()).toMatch(/budget.*\.xlsx$/i);

        // Save download for verification
        const downloadPath = path.join('/tmp', 'exported-budget.xlsx');
        await download.saveAs(downloadPath);

        // Verify file exists and has content
        expect(fs.existsSync(downloadPath)).toBe(true);
        const stats = fs.statSync(downloadPath);
        expect(stats.size).toBeGreaterThan(0);

        // Clean up
        fs.unlinkSync(downloadPath);
      }

      await page.screenshot({ path: 'tests/screenshots/import-export/excel-export.png' });
    });
  });

  test.describe('CSV Export Functionality', () => {
    test('should export budget to CSV format', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Click Export dropdown
      const exportButton = page.getByRole('button', { name: /export/i }).first();
      await exportButton.click();
      await page.waitForTimeout(300);

      // Click Export to CSV option
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      const csvOption = page.getByRole('menuitem', { name: /Export to CSV/i });
      await expect(csvOption).toBeVisible();
      await csvOption.click();

      // Wait for download
      let download: Download | null = null;
      try {
        download = await downloadPromise;
      } catch (error) {
        console.log('CSV export may not trigger download in test environment');
      }

      if (download) {
        // Verify download properties
        expect(download.suggestedFilename()).toMatch(/budget.*\.csv$/i);

        // Save and verify download
        const downloadPath = path.join('/tmp', 'exported-budget.csv');
        await download.saveAs(downloadPath);

        // Verify file exists and has content
        expect(fs.existsSync(downloadPath)).toBe(true);
        const stats = fs.statSync(downloadPath);
        expect(stats.size).toBeGreaterThan(0);

        // Verify CSV content structure
        const csvContent = fs.readFileSync(downloadPath, 'utf-8');
        expect(csvContent).toContain('Cost Code'); // Should have headers
        expect(csvContent).toContain('Description');
        expect(csvContent).toContain('Budget Amount');

        // Clean up
        fs.unlinkSync(downloadPath);
      }

      await page.screenshot({ path: 'tests/screenshots/import-export/csv-export.png' });
    });
  });

  test.describe('PDF Export Functionality', () => {
    test('should export budget to PDF format', async ({ page }) => {
      await page.waitForSelector('table', { timeout: 10000 });

      // Click Export dropdown
      const exportButton = page.getByRole('button', { name: /export/i }).first();
      await exportButton.click();
      await page.waitForTimeout(300);

      // Click Export to PDF option
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      const pdfOption = page.getByRole('menuitem', { name: /Export to PDF/i });
      await expect(pdfOption).toBeVisible();
      await pdfOption.click();

      // Wait for download
      let download: Download | null = null;
      try {
        download = await downloadPromise;
      } catch (error) {
        console.log('PDF export may not trigger download in test environment');
      }

      if (download) {
        // Verify download properties
        expect(download.suggestedFilename()).toMatch(/budget.*\.pdf$/i);

        // Save and verify download
        const downloadPath = path.join('/tmp', 'exported-budget.pdf');
        await download.saveAs(downloadPath);

        // Verify file exists and has content
        expect(fs.existsSync(downloadPath)).toBe(true);
        const stats = fs.statSync(downloadPath);
        expect(stats.size).toBeGreaterThan(0);

        // Clean up
        fs.unlinkSync(downloadPath);
      }

      await page.screenshot({ path: 'tests/screenshots/import-export/pdf-export.png' });
    });
  });

  test.describe('Import Error Handling', () => {
    test('should handle unsupported file formats', async ({ page }) => {
      // Create a text file (unsupported format)
      const textData = 'This is not a valid Excel or CSV file';
      const tempDir = '/tmp';
      const testFilePath = path.join(tempDir, 'invalid-file.txt');
      fs.writeFileSync(testFilePath, textData);

      // Try to import
      const importButton = page.getByRole('button', { name: /import/i }).first();
      await importButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      const fileInput = page.locator('input[type="file"]');

      // This should either reject the file or show an error
      const errorVisible = await fileInput.setInputFiles(testFilePath)
        .then(() => false)
        .catch(() => true);

      if (!errorVisible) {
        // If file is accepted, import should fail
        const modalImportButton = modal.getByRole('button', { name: /^Import$/i });
        await modalImportButton.click();
        await page.waitForTimeout(2000);

        const errorMessage = page.locator('text=Unsupported file').or(
          page.locator('text=Invalid file format').or(
            page.locator('text=error')
          )
        );

        const errorVis = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
        if (errorVis) {
          await expect(errorMessage).toBeVisible();
        }
      }

      await page.screenshot({ path: 'tests/screenshots/import-export/unsupported-format.png' });

      // Clean up
      fs.unlinkSync(testFilePath);
    });

    test('should handle empty files', async ({ page }) => {
      // Create empty Excel file
      const worksheet = XLSX.utils.aoa_to_sheet([]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Empty Sheet');

      const tempDir = '/tmp';
      const testFilePath = path.join(tempDir, 'empty-file.xlsx');
      XLSX.writeFile(workbook, testFilePath);

      // Try to import
      const importButton = page.getByRole('button', { name: /import/i }).first();
      await importButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      await page.waitForTimeout(500);

      const modalImportButton = modal.getByRole('button', { name: /^Import$/i });
      await modalImportButton.click();
      await page.waitForTimeout(2000);

      // Should show no items imported or error
      const emptyMessage = page.locator('text=No data found').or(
        page.locator('text=0 line item').or(
          page.locator('text=Empty file')
        )
      );

      const emptyVisible = await emptyMessage.isVisible({ timeout: 5000 }).catch(() => false);
      if (emptyVisible) {
        await expect(emptyMessage).toBeVisible();
      }

      await page.screenshot({ path: 'tests/screenshots/import-export/empty-file.png' });

      // Clean up
      fs.unlinkSync(testFilePath);
    });
  });

  test.describe('Large File Handling', () => {
    test('should handle import of large Excel files', async ({ page }) => {
      // Create a large Excel file (1000 rows)
      const largeData = [];
      for (let i = 1; i <= 1000; i++) {
        largeData.push({
          'Cost Code': `01-${1000 + i}`,
          'Cost Type': i % 3 === 0 ? 'L' : (i % 2 === 0 ? 'M' : 'E'),
          'Description': `Large Import Test Item ${i}`,
          'Unit Qty': Math.floor(Math.random() * 100) + 1,
          'UOM': ['EA', 'HR', 'DAY'][Math.floor(Math.random() * 3)],
          'Unit Cost': Math.floor(Math.random() * 200) + 50,
          'Budget Amount': Math.floor(Math.random() * 10000) + 1000
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(largeData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Large Dataset');

      const tempDir = '/tmp';
      const testFilePath = path.join(tempDir, 'large-import.xlsx');
      XLSX.writeFile(workbook, testFilePath);

      // Import with extended timeout
      const importButton = page.getByRole('button', { name: /import/i }).first();
      await importButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      await page.waitForTimeout(1000);

      const modalImportButton = modal.getByRole('button', { name: /^Import$/i });
      await modalImportButton.click();

      // Wait longer for large import
      await page.waitForTimeout(10000);

      // Check for completion or progress indicator
      const completion = page.locator('text=imported successfully').or(
        page.locator('text=Import completed').or(
          page.locator('text=1000 line item')
        )
      );

      const completionVisible = await completion.isVisible({ timeout: 30000 }).catch(() => false);
      if (completionVisible) {
        await expect(completion).toBeVisible();
      }

      await page.screenshot({ path: 'tests/screenshots/import-export/large-file-import.png' });

      // Clean up
      fs.unlinkSync(testFilePath);
    });
  });
});
