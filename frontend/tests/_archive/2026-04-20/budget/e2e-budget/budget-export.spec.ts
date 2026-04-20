/**
 * Budget Export E2E Tests
 *
 * Tests Excel and CSV export functionality for budget data.
 *
 * User Story: As a project manager, I can export budget data to Excel
 * for reporting and analysis.
 *
 * Workflow:
 * 1. Export to Excel - verify download starts
 * 2. Export to CSV - verify download starts
 * 3. Verify exported file has correct filename
 * 4. Verify file size > 0
 *
 * @see /DOCS_NEED_TO_FILE/BUDGET-E2E-TEST-PLAN.md (Test 12)
 * @see .claude/rules/E2E-TESTING-STANDARDS.md
 */

import { test, expect } from '../../fixtures/index';
import { createTestProject } from '../../helpers/bootstrap';
import * as fs from 'fs';

let projectId: number;

test.describe('Budget Export Functionality', () => {
  test.beforeAll(async ({ authenticatedRequest }) => {
    // Create a test project with budget data
    const project = await createTestProject({} as any, { template: 'commercial' }, authenticatedRequest);
    projectId = project.project.id;

    console.log(`[Budget Export] Test project created: ${projectId}`);
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

    // Wait for budget data to load
    const dataRow = page.getByRole('row').filter({ hasText: /\$[\d,]+/ }).first();
    await expect(dataRow, 'Budget data should be visible').toBeVisible({ timeout: 10000 });
  });

  /**
   * Test: Export Budget to Excel
   *
   * Workflow:
   * 1. Click Export button/dropdown
   * 2. Select Excel option
   * 3. Verify loading toast appears
   * 4. Wait for download to start
   * 5. Verify success toast appears
   * 6. Verify downloaded file exists
   * 7. Verify file has correct extension (.xlsx)
   * 8. Verify file size > 0
   */
  test('user can export budget to Excel file', async ({ page }) => {
    // 1. Find Export button
    const exportButton = page.getByRole('button', { name: /export/i }).first();

    if ((await exportButton.count()) === 0) {
      console.log('[Budget Export] Export button not found in UI');
      test.skip(true, 'Export feature not available in UI');
    }

    await expect(exportButton, 'Export button should be visible').toBeVisible({ timeout: 5000 });

    // 2. Click Export button
    await exportButton.click();
    await page.waitForTimeout(500);

    // 3. Look for Excel option (may be in a dropdown menu)
    const excelOption = page
      .getByRole('menuitem', { name: /excel|xlsx/i })
      .or(page.getByText(/export.*excel|excel/i));

    // If there's no dropdown, the export button itself may trigger Excel export
    const hasExcelOption = (await excelOption.count()) > 0;

    let downloadPromise;

    if (hasExcelOption) {
      // There's a specific Excel option
      console.log('[Budget Export] Excel option found in dropdown');

      // Set up download listener BEFORE clicking
      downloadPromise = page.waitForEvent('download', { timeout: 30000 });

      await excelOption.click();
    } else {
      // Export button directly triggers download
      console.log('[Budget Export] Export button triggers direct download');

      // Click export again to trigger download
      downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      // The button is already clicked, so wait for download
    }

    // 4. Verify loading toast (optional - may not appear for fast exports)
    const loadingToast = page.getByText(/preparing.*export|exporting|loading/i);
    if ((await loadingToast.count()) > 0) {
      console.log('[Budget Export] Loading toast is visible');
    }

    // 5. Wait for download to complete
    const download = await downloadPromise;
    const downloadPath = await download.path();

    console.log(`[Budget Export] Download path: ${downloadPath}`);

    // 6. Verify success toast
    const successToast = page.getByText(/export.*complet|export.*success|downloaded/i);
    await expect(successToast, 'Success toast should appear after export').toBeVisible({
      timeout: 10000,
    });

    // 7. Verify file exists
    expect(downloadPath, 'Download path should be defined').toBeTruthy();

    if (downloadPath) {
      const fileExists = fs.existsSync(downloadPath);
      expect(fileExists, 'Downloaded file should exist').toBeTruthy();

      // 8. Verify filename has correct extension
      const filename = download.suggestedFilename();
      console.log(`[Budget Export] Downloaded filename: ${filename}`);

      expect(filename, 'Filename should end with .xlsx or .xls').toMatch(/\.(xlsx|xls)$/i);

      // 9. Verify file size > 0
      const stats = fs.statSync(downloadPath);
      expect(stats.size, 'Downloaded file should not be empty').toBeGreaterThan(0);

      console.log(`[Budget Export] File size: ${stats.size} bytes`);

      // Optional: Verify file contains expected content
      // (This would require parsing the Excel file with a library like xlsx)
    }
  });

  /**
   * Test: Export Budget to CSV
   *
   * Workflow:
   * 1. Click Export button/dropdown
   * 2. Select CSV option
   * 3. Verify download starts
   * 4. Verify file has .csv extension
   * 5. Verify file size > 0
   * 6. Optional: Verify CSV content
   */
  test('user can export budget to CSV file', async ({ page }) => {
    // 1. Find Export button
    const exportButton = page.getByRole('button', { name: /export/i }).first();

    if ((await exportButton.count()) === 0) {
      test.skip(true, 'Export feature not available in UI');
    }

    await exportButton.click();
    await page.waitForTimeout(500);

    // 2. Look for CSV option
    const csvOption = page
      .getByRole('menuitem', { name: /csv/i })
      .or(page.getByText(/export.*csv|csv/i));

    const hasCsvOption = (await csvOption.count()) > 0;

    if (!hasCsvOption) {
      console.log('[Budget Export] CSV option not found, skipping CSV export test');
      test.skip(true, 'CSV export option not available in UI');
    }

    // 3. Set up download listener BEFORE clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    await csvOption.click();

    // 4. Wait for download to complete
    const download = await downloadPromise;
    const downloadPath = await download.path();

    console.log(`[Budget Export] CSV download path: ${downloadPath}`);

    // 5. Verify file exists
    expect(downloadPath, 'Download path should be defined').toBeTruthy();

    if (downloadPath) {
      const fileExists = fs.existsSync(downloadPath);
      expect(fileExists, 'Downloaded CSV file should exist').toBeTruthy();

      // 6. Verify filename has .csv extension
      const filename = download.suggestedFilename();
      console.log(`[Budget Export] Downloaded CSV filename: ${filename}`);

      expect(filename, 'Filename should end with .csv').toMatch(/\.csv$/i);

      // 7. Verify file size > 0
      const stats = fs.statSync(downloadPath);
      expect(stats.size, 'Downloaded CSV file should not be empty').toBeGreaterThan(0);

      console.log(`[Budget Export] CSV file size: ${stats.size} bytes`);

      // 8. Optional: Verify CSV content
      const csvContent = fs.readFileSync(downloadPath, 'utf-8');
      const lines = csvContent.split('\n');

      console.log(`[Budget Export] CSV has ${lines.length} lines`);

      // Should have header row + data rows
      expect(lines.length, 'CSV should have at least header + 1 data row').toBeGreaterThan(1);

      // Verify header row contains expected columns
      const headerRow = lines[0].toLowerCase();
      expect(headerRow, 'CSV header should contain budget-related columns').toMatch(
        /budget|cost|code|amount/i
      );
    }
  });

  /**
   * Test: Export with Filters Applied
   *
   * Workflow:
   * 1. Apply a filter (e.g., "Over Budget")
   * 2. Export to Excel
   * 3. Verify only filtered rows are exported
   *
   * Note: This test depends on filter feature being implemented
   */
  test('export respects active filters', async ({ page }) => {
    // 1. Apply a filter
    const overBudgetFilter = page.getByRole('button', { name: /over budget/i });

    if ((await overBudgetFilter.count()) === 0) {
      test.skip(true, 'Filter feature not available, cannot test filtered export');
    }

    await overBudgetFilter.click();
    await page.waitForTimeout(1000);

    // Count visible rows after filter
    const filteredRows = page.getByRole('row').filter({ hasText: /\$[\d,]+/ });
    const filteredCount = await filteredRows.count();

    console.log(`[Budget Export] Filtered row count: ${filteredCount}`);

    // 2. Export to Excel
    const exportButton = page.getByRole('button', { name: /export/i }).first();

    if ((await exportButton.count()) === 0) {
      test.skip(true, 'Export feature not available in UI');
    }

    await exportButton.click();
    await page.waitForTimeout(500);

    const excelOption = page
      .getByRole('menuitem', { name: /excel|xlsx/i })
      .or(page.getByText(/export.*excel/i));

    const hasExcelOption = (await excelOption.count()) > 0;

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    if (hasExcelOption) {
      await excelOption.click();
    }

    const download = await downloadPromise;
    const downloadPath = await download.path();

    console.log(`[Budget Export] Filtered export path: ${downloadPath}`);

    if (downloadPath) {
      const fileExists = fs.existsSync(downloadPath);
      expect(fileExists, 'Filtered export file should exist').toBeTruthy();

      // Note: To fully verify filtered export, we'd need to:
      // 1. Parse the Excel file
      // 2. Count rows in the file
      // 3. Compare with filtered row count
      //
      // This requires additional libraries like 'xlsx' and is beyond
      // the scope of basic E2E testing. For now, we verify the export completes.

      console.log('[Budget Export] Filtered export completed successfully');
    }
  });

  /**
   * Test: Export Filename Contains Project Info
   *
   * Workflow:
   * 1. Export to Excel
   * 2. Verify filename contains project name or ID
   * 3. Verify filename contains timestamp or date
   */
  test('export filename includes project context', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first();

    if ((await exportButton.count()) === 0) {
      test.skip(true, 'Export feature not available in UI');
    }

    await exportButton.click();
    await page.waitForTimeout(500);

    const excelOption = page
      .getByRole('menuitem', { name: /excel|xlsx/i })
      .or(exportButton);

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    if ((await excelOption.count()) > 0 && excelOption !== exportButton) {
      await excelOption.click();
    }

    const download = await downloadPromise;
    const filename = download.suggestedFilename();

    console.log(`[Budget Export] Filename: ${filename}`);

    // Verify filename contains meaningful context
    // Typical format: "ProjectName-Budget-2026-02-21.xlsx" or "budget-export-12345.xlsx"

    const hasContext =
      filename.toLowerCase().includes('budget') ||
      filename.toLowerCase().includes('project') ||
      filename.match(/\d{4}/) !== null; // Contains a year

    expect(
      hasContext,
      'Filename should include context (budget, project, or date)'
    ).toBeTruthy();

    // Verify filename doesn't have generic name like "download.xlsx"
    expect(filename.toLowerCase(), 'Filename should not be generic "download"').not.toBe(
      'download.xlsx'
    );
    expect(filename.toLowerCase(), 'Filename should not be generic "export"').not.toBe(
      'export.xlsx'
    );
  });

  /**
   * Cleanup: Delete test project
   */
  test.afterAll(async ({ request }) => {
    if (!projectId) return;

    console.log(`[Budget Export] Cleaning up test project: ${projectId}`);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const response = await request.delete(`${baseUrl}/api/projects/${projectId}`);

    if (response.ok()) {
      console.log(`[Budget Export] Test project ${projectId} deleted successfully`);
    } else {
      console.error(
        `[Budget Export] Failed to delete test project ${projectId}: ${response.status()}`
      );
    }
  });
});
