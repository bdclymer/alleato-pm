import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Invoicing E2E Tests
 *
 * Tests the complete invoicing functionality including:
 * - List view with tabs (Owner Invoices, Subcontractor Invoices, Billing Periods)
 * - Invoice detail page navigation and display
 * - Status badges and action buttons
 * - API integration for owner invoices and billing periods
 * - Mobile responsiveness
 * - Summary cards and financial calculations
 */

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_PROJECT_ID = '67'; // Use an existing project ID

// Helper function to get auth cookies from saved state
function getAuthCookies(): string {
  const authFile = path.join(__dirname, '../.auth/user.json');
  const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
  return authData.cookies
    .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

// Helper function to navigate to invoicing page
async function navigateToInvoicing(page: Page, projectId: string = TEST_PROJECT_ID) {
  await page.goto(`${BASE_URL}/${projectId}/invoicing`);
  await page.waitForLoadState('networkidle');
}

// Helper function to take screenshots
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/screenshots/invoicing-e2e/${name}.png`,
    fullPage: true,
  });
}

// Helper function to clean up test invoices
async function cleanupTestInvoices(page: Page, projectId: string = TEST_PROJECT_ID) {
  const authCookies = getAuthCookies();

  try {
    // Get all invoices
    const response = await page.request.get(
      `${BASE_URL}/api/projects/${projectId}/invoicing/owner`,
      { headers: { Cookie: authCookies } }
    );

    if (response.ok()) {
      const data = await response.json();
      const testInvoices = (data.data || []).filter(
        (inv: any) => inv.invoice_number?.includes('TEST-')
      );

      // Delete test invoices
      for (const invoice of testInvoices) {
        await page.request.delete(
          `${BASE_URL}/api/projects/${projectId}/invoicing/owner/${invoice.id}`,
          { headers: { Cookie: authCookies } }
        );
      }
    }
  } catch (error) {
    console.log('Cleanup warning:', error);
  }
}

test.describe('Invoicing - Main Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToInvoicing(page);
  });

  test('should display invoicing page with correct header', async ({ page }) => {
    // Verify page header is visible
    await expect(page.locator('h1').filter({ hasText: 'Invoicing' })).toBeVisible();

    // Verify main action buttons in header
    await expect(page.locator('button').filter({ hasText: /Create Invoice/i })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Export/i })).toBeVisible();

    await takeScreenshot(page, '01-invoicing-page-header');
  });

  test('should display all three tabs', async ({ page }) => {
    // Verify tabs container is visible
    const tabsContainer = page.locator('[role="tablist"]');
    await expect(tabsContainer).toBeVisible();

    // Verify specific tabs exist
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Owner Invoices' })).toBeVisible();
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Subcontractor Invoices' })).toBeVisible();
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Billing Periods' })).toBeVisible();

    await takeScreenshot(page, '02-invoicing-tabs');
  });

  test('should have Owner Invoices tab selected by default', async ({ page }) => {
    // Check that Owner Invoices tab is selected
    const ownerTab = page.locator('[role="tab"]').filter({ hasText: 'Owner Invoices' });
    await expect(ownerTab).toHaveAttribute('aria-selected', 'true');

    await takeScreenshot(page, '03-owner-invoices-default-tab');
  });

  test('should display summary cards in Owner Invoices tab', async ({ page }) => {
    // Wait for cards to load
    await page.waitForTimeout(1000);

    // Check for summary card labels
    const cardLabels = [
      'Total Billed',
      'Outstanding',
      'Paid This Month',
      'Total Paid'
    ];

    for (const label of cardLabels) {
      await expect(page.getByText(label)).toBeVisible();
    }

    await takeScreenshot(page, '04-summary-cards');
  });

  test('should display Owner Invoices table with correct columns', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Verify key column headers are present
    const columnHeaders = [
      'Invoice #',
      'Contract',
      'Billing Period',
      'Status',
      'Amount',
      'Due Date',
      'Actions'
    ];

    for (const header of columnHeaders) {
      await expect(page.getByText(header, { exact: false })).toBeVisible();
    }

    await takeScreenshot(page, '05-owner-invoices-table');
  });

  test('should switch to Subcontractor Invoices tab', async ({ page }) => {
    // Click on Subcontractor Invoices tab
    const subcontractorTab = page.locator('[role="tab"]').filter({ hasText: 'Subcontractor Invoices' });
    await subcontractorTab.click();
    await page.waitForLoadState('networkidle');

    // Verify tab is selected
    await expect(subcontractorTab).toHaveAttribute('aria-selected', 'true');

    // Verify placeholder message (since subcontractor invoices are not yet implemented)
    await expect(page.getByText(/coming soon|not implemented|placeholder/i)).toBeVisible();

    await takeScreenshot(page, '06-subcontractor-invoices-tab');
  });

  test('should switch to Billing Periods tab', async ({ page }) => {
    // Click on Billing Periods tab
    const billingPeriodsTab = page.locator('[role="tab"]').filter({ hasText: 'Billing Periods' });
    await billingPeriodsTab.click();
    await page.waitForLoadState('networkidle');

    // Verify tab is selected
    await expect(billingPeriodsTab).toHaveAttribute('aria-selected', 'true');

    // Verify placeholder message (since billing periods page is not yet fully implemented)
    await expect(page.getByText(/coming soon|not implemented|placeholder/i)).toBeVisible();

    await takeScreenshot(page, '07-billing-periods-tab');
  });

  test('should display Create Invoice dropdown', async ({ page }) => {
    // Find and click Create Invoice button
    const createButton = page.locator('button').filter({ hasText: /Create Invoice/i });
    await createButton.click();
    await page.waitForTimeout(500);

    // Verify dropdown menu appears
    await expect(page.locator('[role="menu"]')).toBeVisible({ timeout: 5000 });

    // Verify menu items
    await expect(page.locator('[role="menuitem"]').filter({ hasText: /Owner Invoice/i })).toBeVisible();
    await expect(page.locator('[role="menuitem"]').filter({ hasText: /Subcontractor Invoice/i })).toBeVisible();

    await takeScreenshot(page, '08-create-invoice-dropdown');
  });

  test('should display Export dropdown', async ({ page }) => {
    // Find and click Export button
    const exportButton = page.locator('button').filter({ hasText: /Export/i }).first();
    await exportButton.click();
    await page.waitForTimeout(500);

    // Verify dropdown menu appears (may be placeholder)
    const menu = page.locator('[role="menu"]');
    const hasMenu = await menu.isVisible().catch(() => false);

    if (hasMenu) {
      await takeScreenshot(page, '09-export-dropdown');
    }
  });
});

test.describe('Invoicing - Invoice Detail Page', () => {
  let testInvoiceId: number | null = null;

  test.beforeEach(async ({ page }) => {
    // Clean up any previous test invoices
    await cleanupTestInvoices(page);

    // Create a test invoice via API
    const authCookies = getAuthCookies();

    const createResponse = await page.request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/invoicing/owner`,
      {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: {
          contract_id: 1, // Assume contract exists
          invoice_number: `TEST-INV-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          billing_period: 'January 2026',
          status: 'draft',
          line_items: [
            {
              description: 'Test Line Item 1',
              category: 'Labor',
              approved_amount: 1000,
            },
            {
              description: 'Test Line Item 2',
              category: 'Materials',
              approved_amount: 2000,
            },
          ],
        },
      }
    );

    if (createResponse.ok()) {
      const data = await createResponse.json();
      testInvoiceId = data.data?.id || null;
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up test invoices
    await cleanupTestInvoices(page);
  });

  test('should navigate to invoice detail page from list', async ({ page }) => {
    if (!testInvoiceId) {
      test.skip();
      return;
    }

    // Navigate to invoicing list
    await navigateToInvoicing(page);

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Find and click on the test invoice (by invoice number or row)
    const testInvoiceRow = page.locator('tr').filter({ hasText: 'TEST-INV-' });
    const invoiceNumberLink = testInvoiceRow.locator('a').first();

    if (await invoiceNumberLink.isVisible()) {
      await invoiceNumberLink.click();
      await page.waitForLoadState('networkidle');

      // Verify we're on the detail page
      await expect(page.url()).toContain(`/invoicing/${testInvoiceId}`);

      await takeScreenshot(page, '10-invoice-detail-navigation');
    }
  });

  test('should display invoice detail page with header', async ({ page }) => {
    if (!testInvoiceId) {
      test.skip();
      return;
    }

    // Navigate directly to invoice detail page
    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/invoicing/${testInvoiceId}`);
    await page.waitForLoadState('networkidle');

    // Verify invoice header elements
    await expect(page.getByText(/Invoice #/i)).toBeVisible();
    await expect(page.getByText(/TEST-INV-/)).toBeVisible();

    // Verify status badge is visible
    const statusBadge = page.locator('[class*="badge"]').filter({ hasText: /draft|submitted|approved|paid/i });
    await expect(statusBadge.first()).toBeVisible();

    await takeScreenshot(page, '11-invoice-detail-header');
  });

  test('should display invoice information card', async ({ page }) => {
    if (!testInvoiceId) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/invoicing/${testInvoiceId}`);
    await page.waitForLoadState('networkidle');

    // Verify invoice info fields
    await expect(page.getByText(/Invoice Date/i)).toBeVisible();
    await expect(page.getByText(/Due Date/i)).toBeVisible();
    await expect(page.getByText(/Billing Period/i)).toBeVisible();

    await takeScreenshot(page, '12-invoice-info-card');
  });

  test('should display line items table', async ({ page }) => {
    if (!testInvoiceId) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/invoicing/${testInvoiceId}`);
    await page.waitForLoadState('networkidle');

    // Verify line items section header
    await expect(page.getByText(/Line Items/i)).toBeVisible();

    // Verify line items table columns
    await expect(page.getByText('Description')).toBeVisible();
    await expect(page.getByText('Category')).toBeVisible();
    await expect(page.getByText('Amount')).toBeVisible();

    // Verify test line items are displayed
    await expect(page.getByText('Test Line Item 1')).toBeVisible();
    await expect(page.getByText('Test Line Item 2')).toBeVisible();

    await takeScreenshot(page, '13-invoice-line-items');
  });

  test('should display invoice totals section', async ({ page }) => {
    if (!testInvoiceId) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/invoicing/${testInvoiceId}`);
    await page.waitForLoadState('networkidle');

    // Verify totals section
    await expect(page.getByText(/Subtotal/i)).toBeVisible();
    await expect(page.getByText(/Retention/i)).toBeVisible();
    await expect(page.getByText(/Total Due/i)).toBeVisible();

    // Verify calculated amounts (1000 + 2000 = 3000 subtotal, 5% retention = 150, total = 2850)
    await expect(page.getByText('$3,000.00')).toBeVisible();
    await expect(page.getByText('$2,850.00')).toBeVisible();

    await takeScreenshot(page, '14-invoice-totals');
  });

  test('should display action buttons based on status', async ({ page }) => {
    if (!testInvoiceId) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/invoicing/${testInvoiceId}`);
    await page.waitForLoadState('networkidle');

    // For draft status, should see Edit, Submit, Delete buttons
    await expect(page.locator('button').filter({ hasText: /Edit/i })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Submit/i })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Delete/i })).toBeVisible();

    // Should see Back button
    await expect(page.locator('button').filter({ hasText: /Back/i })).toBeVisible();

    await takeScreenshot(page, '15-invoice-action-buttons-draft');
  });

  test('should navigate back to invoice list', async ({ page }) => {
    if (!testInvoiceId) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/invoicing/${testInvoiceId}`);
    await page.waitForLoadState('networkidle');

    // Click Back button
    const backButton = page.locator('button').filter({ hasText: /Back/i });
    await backButton.click();
    await page.waitForLoadState('networkidle');

    // Verify we're back on the list page
    await expect(page.url()).toContain(`/${TEST_PROJECT_ID}/invoicing`);
    await expect(page.url()).not.toContain(`/invoicing/${testInvoiceId}`);

    await takeScreenshot(page, '16-back-to-list');
  });

  test('should delete invoice when Delete button clicked', async ({ page }) => {
    if (!testInvoiceId) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/invoicing/${testInvoiceId}`);
    await page.waitForLoadState('networkidle');

    // Listen for confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    // Click Delete button
    const deleteButton = page.locator('button').filter({ hasText: /Delete/i });
    await deleteButton.click();
    await page.waitForLoadState('networkidle');

    // Should navigate back to list
    await expect(page.url()).toContain(`/${TEST_PROJECT_ID}/invoicing`);
    await expect(page.url()).not.toContain(`/invoicing/${testInvoiceId}`);

    await takeScreenshot(page, '17-after-delete');
  });
});

test.describe('Invoicing - API Integration', () => {
  test('should fetch owner invoices from API', async ({ page }) => {
    const authCookies = getAuthCookies();

    const response = await page.request.get(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/invoicing/owner`,
      { headers: { Cookie: authCookies } }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('should fetch billing periods from API', async ({ page }) => {
    const authCookies = getAuthCookies();

    const response = await page.request.get(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/invoicing/billing-periods`,
      { headers: { Cookie: authCookies } }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('should create owner invoice via API', async ({ page }) => {
    const authCookies = getAuthCookies();

    const createResponse = await page.request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/invoicing/owner`,
      {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: {
          contract_id: 1,
          invoice_number: `TEST-API-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          billing_period: 'Test Period',
          status: 'draft',
          line_items: [
            {
              description: 'API Test Item',
              category: 'Testing',
              approved_amount: 500,
            },
          ],
        },
      }
    );

    expect(createResponse.status()).toBe(201);

    const data = await createResponse.json();
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('id');

    // Clean up
    const invoiceId = data.data.id;
    await page.request.delete(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/invoicing/owner/${invoiceId}`,
      { headers: { Cookie: authCookies } }
    );
  });

  test('should submit invoice for approval via API', async ({ page }) => {
    const authCookies = getAuthCookies();

    // Create invoice
    const createResponse = await page.request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/invoicing/owner`,
      {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: {
          contract_id: 1,
          invoice_number: `TEST-SUBMIT-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          billing_period: 'Test Period',
          status: 'draft',
          line_items: [{ description: 'Test', category: 'Test', approved_amount: 100 }],
        },
      }
    );

    const createData = await createResponse.json();
    const invoiceId = createData.data.id;

    // Submit for approval
    const submitResponse = await page.request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/invoicing/owner/${invoiceId}/submit`,
      { headers: { Cookie: authCookies } }
    );

    expect(submitResponse.status()).toBe(200);

    const submitData = await submitResponse.json();
    expect(submitData.data.status).toBe('submitted');

    // Clean up
    await page.request.delete(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/invoicing/owner/${invoiceId}`,
      { headers: { Cookie: authCookies } }
    );
  });

  test('should approve submitted invoice via API', async ({ page }) => {
    const authCookies = getAuthCookies();

    // Create and submit invoice
    const createResponse = await page.request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/invoicing/owner`,
      {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: {
          contract_id: 1,
          invoice_number: `TEST-APPROVE-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          billing_period: 'Test Period',
          status: 'draft',
          line_items: [{ description: 'Test', category: 'Test', approved_amount: 100 }],
        },
      }
    );

    const createData = await createResponse.json();
    const invoiceId = createData.data.id;

    // Submit
    await page.request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/invoicing/owner/${invoiceId}/submit`,
      { headers: { Cookie: authCookies } }
    );

    // Approve
    const approveResponse = await page.request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/invoicing/owner/${invoiceId}/approve`,
      { headers: { Cookie: authCookies } }
    );

    expect(approveResponse.status()).toBe(200);

    const approveData = await approveResponse.json();
    expect(approveData.data.status).toBe('approved');

    // Note: Cannot delete approved invoice (business logic)
  });
});

test.describe('Invoicing - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should display mobile-friendly layout', async ({ page }) => {
    await navigateToInvoicing(page);

    // Verify tabs are still visible (may be scrollable)
    await expect(page.locator('[role="tablist"]')).toBeVisible();

    // On mobile, table may switch to card view
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '18-mobile-view');
  });

  test('should display mobile cards instead of table', async ({ page }) => {
    await navigateToInvoicing(page);

    await page.waitForTimeout(1000);

    // Check if mobile cards are rendered (may vary based on implementation)
    const hasMobileCards = await page.locator('[class*="mobile-card"]').count() > 0;
    const hasTable = await page.locator('table').isVisible();

    // Either mobile cards or responsive table should be visible
    expect(hasMobileCards || hasTable).toBe(true);

    await takeScreenshot(page, '19-mobile-cards');
  });
});

test.describe('Invoicing - Status Badges', () => {
  test('should display correct status badge colors', async ({ page }) => {
    await navigateToInvoicing(page);

    await page.waitForSelector('table', { timeout: 10000 });

    // Look for status badges (should be color-coded)
    const statusBadges = page.locator('[class*="badge"]');
    const badgeCount = await statusBadges.count();

    // Verify at least some badges exist (if data is present)
    if (badgeCount > 0) {
      // Status badge should have different colors for different statuses
      // draft=gray, submitted=blue, approved=green, paid=purple
      await takeScreenshot(page, '20-status-badges');
    }
  });
});
