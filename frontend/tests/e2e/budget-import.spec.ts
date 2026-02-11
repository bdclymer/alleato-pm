import { test, expect } from '../fixtures/index';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Import', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  const projectId = '67';

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState('networkidle');
  });

  test('should successfully import budget line items from Excel', async ({ page }) => {
    // Create a test Excel file
    const testData = [
      {
        'Cost Code': '01-3120',
        'Cost Type': 'R',
        'Description': 'Test Revenue Item',
        'Unit Qty': 100,
        'UOM': 'EA',
        'Unit Cost': 50,
        'Budget Amount': 5000
      },
      {
        'Cost Code': '01-3127',
        'Cost Type': 'L',
        'Description': 'Test Labor Item',
        'Unit Qty': 200,
        'UOM': 'HR',
        'Unit Cost': 75,
        'Budget Amount': 15000
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(testData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Budget Line Items');

    const tempDir = '/tmp';
    const testFilePath = path.join(tempDir, 'test-budget-import.xlsx');
    XLSX.writeFile(workbook, testFilePath);

    // Click Import button in the header
    await page.getByRole('button', { name: /import/i }).click();

    // Wait for the import modal to appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Import Budget from Excel')).toBeVisible();

    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Verify file is selected
    await expect(page.getByText('test-budget-import.xlsx')).toBeVisible();

    // Click Import button in modal
    await page.getByRole('button', { name: /^Import$/i }).click();

    // Wait for success message
    await expect(page.getByText(/budget imported successfully/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/2 line item\(s\) added/i)).toBeVisible();

    // Verify modal closes
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Wait for budget table to refresh and verify the imported items appear
    await page.waitForTimeout(2000);

    // Check that the test items appear in the table
    await expect(page.getByText('Test Revenue Item')).toBeVisible();
    await expect(page.getByText('Test Labor Item')).toBeVisible();

    // Clean up test file
    fs.unlinkSync(testFilePath);
  });

  test('should show error for invalid cost code', async ({ page }) => {
    // Create a test Excel file with invalid cost code
    const testData = [
      {
        'Cost Code': 'INVALID-CODE',
        'Cost Type': 'R',
        'Description': 'Invalid Item',
        'Unit Qty': 100,
        'UOM': 'EA',
        'Unit Cost': 50,
        'Budget Amount': 5000
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(testData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Budget Line Items');

    const tempDir = '/tmp';
    const testFilePath = path.join(tempDir, 'test-budget-import-invalid.xlsx');
    XLSX.writeFile(workbook, testFilePath);

    // Click Import button in the header
    await page.getByRole('button', { name: /import/i }).click();

    // Wait for the import modal to appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Click Import button in modal
    await page.getByRole('button', { name: /^Import$/i }).click();

    // Should show 0 imported
    await expect(page.getByText(/0 line item\(s\) added/i)).toBeVisible({ timeout: 10000 });

    // Clean up test file
    fs.unlinkSync(testFilePath);
  });
});
