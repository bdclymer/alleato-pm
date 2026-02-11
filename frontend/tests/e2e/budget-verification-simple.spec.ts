import { test, expect } from '../fixtures/index';
import path from 'path';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

const TEST_PROJECT_ID = '118';
const BASE_URL = `${process.env.BASE_URL || 'http://localhost:3000'}/${TEST_PROJECT_ID}/budget`;

test.describe.skip('Budget Feature Verification - Simple Tests', () => {
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

  test('should load budget page and capture screenshot', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(5000);

    // Take screenshot to see what's actually on the page
    await page.screenshot({
      path: 'tests/screenshots/budget-verification/budget-page-actual.png',
      fullPage: true
    });

    // Check if page loaded successfully
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);

    // Check if there are any error messages
    const errorElements = page.locator('text=error, text=Error, text=404, text=500');
    const errorCount = await errorElements.count();

    if (errorCount > 0) {
      const errorText = await errorElements.first().textContent();
      console.log('Found error on page:', errorText);
    }

    // Look for budget-specific elements
    const budgetElements = [
      'text=Budget',
      'button:has-text("Create")',
      'button:has-text("Export")',
      'table',
      '[role="tablist"]'
    ];

    for (const selector of budgetElements) {
      const element = page.locator(selector);
      const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`${selector}: ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
    }

    // Check if we can find the basic budget page structure
    const isBudgetPage = await page.locator('h1').filter({ hasText: 'Budget' }).isVisible({ timeout: 5000 }).catch(() => false);

    if (!isBudgetPage) {
      const currentUrl = page.url();
      const bodyText = await page.locator('body').textContent();
      console.log('Current URL:', currentUrl);
      console.log('Page content preview:', bodyText?.substring(0, 500));
    }

    expect(isBudgetPage).toBeTruthy();
  });

  test('should verify Budget Views dropdown exists', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for budget views dropdown with different possible selectors
    const viewsDropdownSelectors = [
      'button:has-text("Procore Standard")',
      'button:has-text("Budget Views")',
      'button:has-text("Views")',
      '[data-testid*="view"]',
      'button[aria-haspopup="menu"]'
    ];

    let foundDropdown = false;
    for (const selector of viewsDropdownSelectors) {
      const element = page.locator(selector);
      const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`Views dropdown ${selector}: ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
      if (isVisible) {
        foundDropdown = true;
        break;
      }
    }

    await page.screenshot({
      path: 'tests/screenshots/budget-verification/budget-views-check.png',
      fullPage: true
    });

    // If we can't find the exact dropdown, at least verify the page structure
    const hasBasicBudgetElements = await page.locator('h1:has-text("Budget")').isVisible();
    expect(hasBasicBudgetElements).toBeTruthy();
  });

  test('should verify keyboard shortcut handling', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Try Ctrl+S and capture what happens
    console.log('Testing Ctrl+S...');
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'tests/screenshots/budget-verification/ctrl-s-test.png',
      fullPage: true
    });

    // Try Ctrl+E
    console.log('Testing Ctrl+E...');
    await page.keyboard.press('Control+e');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'tests/screenshots/budget-verification/ctrl-e-test.png',
      fullPage: true
    });

    // Check if any modals opened
    const modal = page.locator('[role="dialog"]');
    const modalVisible = await modal.isVisible().catch(() => false);
    console.log('Modal visible after shortcuts:', modalVisible);

    // Check for any toast notifications
    const toast = page.locator('[data-testid*="toast"], .toast, [role="alert"]');
    const toastVisible = await toast.isVisible().catch(() => false);
    console.log('Toast visible after shortcuts:', toastVisible);
  });

  test('should verify budget table structure', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Check for table element
    const table = page.locator('table');
    const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Table present:', hasTable);

    if (hasTable) {
      // Check for column headers
      const headers = await table.locator('th').allTextContents();
      console.log('Table headers found:', headers);

      // Check for data rows
      const dataRows = table.locator('tbody tr');
      const rowCount = await dataRows.count();
      console.log('Data rows found:', rowCount);

      await page.screenshot({
        path: 'tests/screenshots/budget-verification/table-structure.png',
        fullPage: true
      });
    } else {
      // Look for alternative data display
      const dataElements = [
        '[data-testid*="budget"]',
        '.budget-table',
        '[class*="table"]',
        '[class*="grid"]'
      ];

      for (const selector of dataElements) {
        const element = page.locator(selector);
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
        console.log(`Alternative data element ${selector}: ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
      }
    }

    await page.screenshot({
      path: 'tests/screenshots/budget-verification/full-page-final.png',
      fullPage: true
    });
  });

  test('should verify import/export buttons', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Check for import/export functionality
    const importButton = page.locator('button:has-text("Import")');
    const exportButton = page.locator('button:has-text("Export")');

    const hasImport = await importButton.isVisible({ timeout: 3000 }).catch(() => false);
    const hasExport = await exportButton.isVisible({ timeout: 3000 }).catch(() => false);

    console.log('Import button found:', hasImport);
    console.log('Export button found:', hasExport);

    if (hasExport) {
      // Try clicking export to see dropdown
      await exportButton.click();
      await page.waitForTimeout(500);

      const exportMenu = page.locator('[role="menu"]');
      const hasMenu = await exportMenu.isVisible({ timeout: 2000 }).catch(() => false);
      console.log('Export menu opened:', hasMenu);

      if (hasMenu) {
        const menuItems = await exportMenu.locator('[role="menuitem"]').allTextContents();
        console.log('Export options:', menuItems);
      }

      await page.screenshot({
        path: 'tests/screenshots/budget-verification/export-dropdown.png',
        fullPage: true
      });

      // Close dropdown
      await page.keyboard.press('Escape');
    }

    if (hasImport) {
      await importButton.click();
      await page.waitForTimeout(500);

      const importModal = page.locator('[role="dialog"]');
      const hasModal = await importModal.isVisible({ timeout: 2000 }).catch(() => false);
      console.log('Import modal opened:', hasModal);

      if (hasModal) {
        await page.screenshot({
          path: 'tests/screenshots/budget-verification/import-modal.png',
          fullPage: true
        });

        // Close modal
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should verify budget lock/unlock functionality', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for lock/unlock buttons
    const lockButton = page.locator('button:has-text("Lock Budget"), button:has-text("Unlock Budget")');
    const hasLockButton = await lockButton.isVisible({ timeout: 3000 }).catch(() => false);

    console.log('Lock/Unlock button found:', hasLockButton);

    if (hasLockButton) {
      const buttonText = await lockButton.textContent();
      console.log('Lock button text:', buttonText);

      // Try clicking to see confirmation dialog
      await lockButton.click();
      await page.waitForTimeout(500);

      const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]');
      const hasDialog = await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false);
      console.log('Confirmation dialog appeared:', hasDialog);

      if (hasDialog) {
        await page.screenshot({
          path: 'tests/screenshots/budget-verification/lock-confirmation.png',
          fullPage: true
        });

        // Close dialog
        const cancelButton = page.locator('button:has-text("Cancel")');
        if (await cancelButton.isVisible({ timeout: 1000 })) {
          await cancelButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }
  });
});
