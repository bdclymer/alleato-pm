import { test, expect } from '@playwright/test';

const TEST_PROJECT_ID = 67;
const TEST_COMMITMENT_ID = 'test-commitment-123';

// Mock commitment data
const mockCommitment = {
  id: TEST_COMMITMENT_ID,
  project_id: TEST_PROJECT_ID,
  number: 'SUB-001',
  title: 'Test Subcontract',
  status: 'approved',
  type: 'subcontract',
  contract_company: {
    id: '1',
    name: 'Test Contractor Inc',
  },
  accounting_method: 'amount_based',
  description: 'Test subcontract for E2E testing',
  original_amount: 100000,
  approved_change_orders: 15000,
  revised_contract_amount: 115000,
  billed_to_date: 50000,
  retention_percentage: 10,
  balance_to_finish: 65000,
  private: false,
  vendor_invoice_number: 'VIN-001',
  start_date: '2024-01-01T00:00:00Z',
  substantial_completion_date: '2024-06-30T00:00:00Z',
  executed_date: '2024-01-01T00:00:00Z',
  signed_received_date: '2024-01-05T00:00:00Z',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-10T14:30:00Z',
  line_items: [
    {
      id: 'li-1',
      line_number: 1,
      description: 'Excavation and grading',
      budget_code: '01-100',
      amount: 40000,
      billed_to_date: 10000,
    },
    {
      id: 'li-2',
      line_number: 2,
      description: 'Concrete foundation',
      budget_code: '03-300',
      amount: 60000,
      billed_to_date: 25000,
    },
  ],
};

// Mock change orders
const mockChangeOrders = [
  {
    id: 'co-1',
    number: 'CO-001',
    title: 'Additional electrical work',
    status: 'approved',
    amount: 15000,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'co-2',
    number: 'CO-002',
    title: 'Foundation repairs',
    status: 'pending',
    amount: 8500,
    created_at: '2024-01-20T14:30:00Z',
  },
];

// Mock invoices - matches new SOV-based billing API response format
const mockInvoicesResponse = {
  summary: {
    total_contract_amount: 100000,
    total_invoiced: 35000,
    remaining_to_invoice: 65000,
    percent_invoiced: 35,
    total_paid: 30000,
    remaining_balance: 70000,
  },
  line_items: [
    {
      id: 'li-1',
      line_number: 1,
      budget_code: '01-100',
      description: 'Excavation and grading',
      scheduled_value: 40000,
      billed_to_date: 10000,
      remaining_amount: 30000,
      percent_complete: 25,
    },
    {
      id: 'li-2',
      line_number: 2,
      budget_code: '03-300',
      description: 'Concrete foundation',
      scheduled_value: 60000,
      billed_to_date: 25000,
      remaining_amount: 35000,
      percent_complete: 41.67,
    },
  ],
};

// Mock attachments
const mockAttachments = [
  {
    id: 'att-1',
    file_name: 'contract.pdf',
    url: 'https://example.com/files/contract.pdf',
    uploaded_at: '2024-01-10T14:00:00Z',
    uploaded_by: 'John Doe',
    file_size: 1024000,
  },
  {
    id: 'att-2',
    file_name: 'specifications.docx',
    url: 'https://example.com/files/specifications.docx',
    uploaded_at: '2024-01-15T10:30:00Z',
    uploaded_by: 'Jane Smith',
    file_size: 512000,
  },
];

test.describe('Commitment Detail Page - New Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Register sub-path routes FIRST (Playwright evaluates in reverse registration order)
    // Mock change orders endpoint
    await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}/change-orders**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockChangeOrders }),
      });
    });

    // Mock invoices endpoint
    await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}/invoices**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockInvoicesResponse),
      });
    });

    // Mock attachments GET/POST endpoint
    await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}/attachments**`, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockAttachments }),
        });
      } else if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        route.continue();
      }
    });

    // Mock advanced-settings endpoint
    await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}/advanced-settings**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });

    // Mock the base commitment detail endpoint LAST
    // (evaluated first by Playwright since routes are checked in reverse order)
    await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}`, (route) => {
      const url = route.request().url();
      // Only fulfill for the exact endpoint (not sub-paths)
      if (url.endsWith(TEST_COMMITMENT_ID) || url.endsWith(`${TEST_COMMITMENT_ID}/`)) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockCommitment),
        });
      } else {
        route.continue();
      }
    });

    // Navigate to commitment detail page
    await page.goto(`/${TEST_PROJECT_ID}/commitments/${TEST_COMMITMENT_ID}`);

    // Wait for the page to render the commitment title instead of networkidle
    // (React Query background refetches can prevent networkidle from being reached)
    await expect(page.getByText('SUB-001')).toBeVisible({ timeout: 15000 });
  });

  test('should display all tabs including new tabs', async ({ page }) => {
    // Check that all tabs are present
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Overview' })).toBeVisible();
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Financial' })).toBeVisible();
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Schedule' })).toBeVisible();
    await expect(page.locator('[role="tab"]').filter({ hasText: 'SOV' })).toBeVisible();
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Change Orders' })).toBeVisible();
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Invoices' })).toBeVisible();
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Attachments' })).toBeVisible();
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Advanced Settings' })).toBeVisible();
  });

  test('should switch tabs correctly', async ({ page }) => {
    // Click Change Orders tab
    await page.locator('[role="tab"]').filter({ hasText: 'Change Orders' }).click();
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Change Orders');

    // Click Invoices tab
    await page.locator('[role="tab"]').filter({ hasText: 'Invoices' }).click();
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Invoices');

    // Click Attachments tab
    await page.locator('[role="tab"]').filter({ hasText: 'Attachments' }).click();
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Attachments');
  });

  test.describe('Change Orders Tab', () => {
    test('should render Change Orders tab with data', async ({ page }) => {
      await page.locator('[role="tab"]').filter({ hasText: 'Change Orders' }).click();
      await page.waitForTimeout(500);

      // Check that change order content is visible
      await expect(page.getByText('CO-001')).toBeVisible({ timeout: 5000 });
    });

    test('should display change order data in table', async ({ page }) => {
      await page.locator('[role="tab"]').filter({ hasText: 'Change Orders' }).click();
      await page.waitForTimeout(500);

      // Check that change order data is displayed
      await expect(page.getByText('CO-001')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Additional electrical work')).toBeVisible();
      await expect(page.getByText('CO-002')).toBeVisible();
      await expect(page.getByText('Foundation repairs')).toBeVisible();
    });

    test('should make change order numbers clickable', async ({ page }) => {
      await page.locator('[role="tab"]').filter({ hasText: 'Change Orders' }).click();
      await page.waitForTimeout(500);

      // Check that CO numbers are links
      const coLink = page.locator('a').filter({ hasText: 'CO-001' });
      await expect(coLink).toBeVisible({ timeout: 5000 });
    });

    test('should show empty state when no change orders', async ({ page }) => {
      // Override mock to return empty array
      await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}/change-orders**`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      });

      await page.reload();
      await expect(page.getByText('SUB-001')).toBeVisible({ timeout: 15000 });

      await page.locator('[role="tab"]').filter({ hasText: 'Change Orders' }).click();
      await page.waitForTimeout(500);

      // Check for empty state message
      await expect(page.getByText(/no change orders/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Schedule of Values Tab', () => {
    test('should display SOV line items', async ({ page }) => {
      await page.locator('[role="tab"]').filter({ hasText: 'SOV' }).click();
      await page.waitForTimeout(500);

      // SOV line items are in input fields, use locator with value attribute
      await expect(page.locator('input[value="Excavation and grading"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('input[value="Concrete foundation"]')).toBeVisible();

      // Verify totals row
      await expect(page.getByText('$100,000.00').first()).toBeVisible();
    });
  });

  test.describe('Invoices Tab', () => {
    test('should render Invoices tab with billing summary', async ({ page }) => {
      await page.locator('[role="tab"]').filter({ hasText: 'Invoices' }).click();
      await page.waitForTimeout(500);

      // Check for invoice summary card
      await expect(page.getByText('Invoice Summary')).toBeVisible({ timeout: 5000 });
    });

    test('should display billing line items', async ({ page }) => {
      await page.locator('[role="tab"]').filter({ hasText: 'Invoices' }).click();
      await page.waitForTimeout(500);

      // Check for SOV-based billing line items
      await expect(page.getByText('Excavation and grading')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Concrete foundation')).toBeVisible();
    });

    test('should show empty state when no billing data', async ({ page }) => {
      // Override mock to return empty billing data
      await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}/invoices**`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ summary: null, line_items: [] }),
        });
      });

      await page.reload();
      await expect(page.getByText('SUB-001')).toBeVisible({ timeout: 15000 });

      await page.locator('[role="tab"]').filter({ hasText: 'Invoices' }).click();
      await page.waitForTimeout(500);

      // Check for empty state message
      await expect(page.getByText(/no billing data/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Attachments Tab', () => {
    test('should render Attachments tab with data', async ({ page }) => {
      await page.locator('[role="tab"]').filter({ hasText: 'Attachments' }).click();
      await page.waitForTimeout(500);

      // Check that Upload File button is present
      await expect(page.getByRole('button', { name: /Upload File/i })).toBeVisible({ timeout: 5000 });
    });

    test('should display attachment files', async ({ page }) => {
      await page.locator('[role="tab"]').filter({ hasText: 'Attachments' }).click();
      await page.waitForTimeout(500);

      // Check that file names are displayed
      await expect(page.getByText('contract.pdf')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('specifications.docx')).toBeVisible();
    });

    test('should show empty state when no attachments', async ({ page }) => {
      // Override mock to return empty array
      await page.route(`**/api/commitments/${TEST_COMMITMENT_ID}/attachments**`, (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] }),
          });
        } else {
          route.continue();
        }
      });

      await page.reload();
      await expect(page.getByText('SUB-001')).toBeVisible({ timeout: 15000 });

      await page.locator('[role="tab"]').filter({ hasText: 'Attachments' }).click();
      await page.waitForTimeout(500);

      // Check for empty state
      await expect(page.getByText(/no attachments/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test('should maintain tab state when switching tabs', async ({ page }) => {
    // Navigate to Change Orders tab
    await page.locator('[role="tab"]').filter({ hasText: 'Change Orders' }).click();
    await expect(page.getByText('CO-001')).toBeVisible({ timeout: 5000 });

    // Switch to Invoices tab
    await page.locator('[role="tab"]').filter({ hasText: 'Invoices' }).click();
    await expect(page.getByText('Invoice Summary')).toBeVisible({ timeout: 5000 });

    // Switch to Attachments tab
    await page.locator('[role="tab"]').filter({ hasText: 'Attachments' }).click();
    await expect(page.getByText('contract.pdf')).toBeVisible({ timeout: 5000 });

    // Go back to Change Orders - data should still be there
    await page.locator('[role="tab"]').filter({ hasText: 'Change Orders' }).click();
    await expect(page.getByText('CO-001')).toBeVisible({ timeout: 5000 });
  });
});
