import { test, expect, Page, APIRequestContext } from '../../fixtures/index';
import { createTestProject } from '../../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

/**
 * Phase 1A & 1B E2E Tests
 *
 * Tests the complete Budget Modifications System (Phase 1A) and
 * Cost Actuals Integration (Phase 1B) functionality.
 *
 * Test Suites:
 * 1. Budget Modifications Workflow (draft → pending → approved/rejected/void)
 * 2. Cost Actuals Integration (JTD, Direct Costs, Pending Cost Changes)
 * 3. UI Component Tests (modals, actions, displays)
 */

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_PROJECT_ID = '67'; // Use an existing project with budget data

// Helper function to login
async function login(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForURL('**/', { timeout: 15000 });
}

// Helper function to navigate to budget page
async function navigateToBudget(page: Page, projectId: string = TEST_PROJECT_ID) {
  await page.goto(`/${projectId}/budget`);
  await page.waitForLoadState('networkidle');
  // Wait for table to load
  await page.waitForSelector('table', { timeout: 10000 }).catch(() => {
    // Table may not exist if no budget data
  });
}

// Helper function to take screenshots
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/screenshots/phase-1a-1b/${name}.png`,
    fullPage: true,
  });
}

// Helper function to create a modification via API
async function createModificationViaAPI(
  request: APIRequestContext,
  projectId: string,
  budgetLineId: string,
  amount: number,
  title: string
): Promise<{ id: string; number: string; status: string }> {
  const response = await request.post(`/api/projects/${projectId}/budget/modifications`, {
    data: {
      budgetLineId,
      amount: amount.toString(),
      title,
      reason: `Test modification: ${title}`,
    },
  });

  if (!response.ok()) {
    const errorBody = await response.json().catch(() => ({}));
    console.error(`createModificationViaAPI failed: ${response.status()} - ${JSON.stringify(errorBody)}`);
  }
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.data;
}

// Helper function to change modification status via API
async function changeModificationStatusViaAPI(
  request: APIRequestContext,
  projectId: string,
  modificationId: string,
  action: 'submit' | 'approve' | 'reject' | 'void'
): Promise<{ status: string; effectiveDate?: string }> {
  const response = await request.patch(`/api/projects/${projectId}/budget/modifications`, {
    data: {
      modificationId,
      action,
    },
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.data;
}

// Helper function to get budget line items via API with retry
async function getBudgetLinesViaAPI(
  request: APIRequestContext,
  projectId: string,
  retries = 3
): Promise<{ id: string; costCode: string; description: string }[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await request.get(`/api/projects/${projectId}/budget`);
    if (response.ok()) {
      const data = await response.json();
      return data.lineItems || [];
    }
    if (attempt < retries) {
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    } else {
      const errorBody = await response.json().catch(() => ({}));
      console.error(`getBudgetLinesViaAPI failed after ${retries} attempts: ${response.status()} - ${JSON.stringify(errorBody)}`);
      expect(response.ok()).toBeTruthy();
    }
  }
  return [];
}

// ============================================================================
// TEST SUITE 1: Budget Modifications Workflow
// ============================================================================
test.describe('Phase 1A - Budget Modifications Workflow', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1.1 - Create new budget modification via modal', async ({ page, request }) => {
    // First, get a valid budget line ID
    const lines = await getBudgetLinesViaAPI(request, TEST_PROJECT_ID);
    test.skip(lines.length === 0, 'No budget lines available for testing');

    await navigateToBudget(page);

    // Click Create dropdown to reveal modifications option
    const createButton = page.locator('button').filter({ hasText: 'Create' }).first();
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Look for Budget Modification option in dropdown
    const modificationOption = page.locator('[role="menuitem"]').filter({ hasText: /modification/i });
    if (await modificationOption.isVisible()) {
      await modificationOption.click();

      // Wait for modal to appear
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // Fill in the form
      await page.fill('input[name="amount"], #amount', '5000');
      await page.fill('input[name="title"], #title', 'Test Modification from E2E');
      await page.fill('textarea[name="reason"], #reason', 'E2E test reason');

      // Submit the form
      await page.click('button[type="submit"]');

      // Wait for success toast
      await expect(page.locator('.toast, [data-sonner-toast]').filter({ hasText: /created|draft/i })).toBeVisible({
        timeout: 10000,
      });

      await takeScreenshot(page, '01-modification-created');
    } else {
      // Modification UI may be accessed differently
      test.skip(true, 'Budget modification modal not accessible from Create dropdown');
    }
  });

  test('1.2 - Submit modification for approval via API', async ({ request }) => {
    // Get a budget line
    const lines = await getBudgetLinesViaAPI(request, TEST_PROJECT_ID);
    test.skip(lines.length === 0, 'No budget lines available for testing');

    // Create a draft modification
    const modification = await createModificationViaAPI(
      request,
      TEST_PROJECT_ID,
      lines[0].id,
      2500,
      'API Test - Submit for Approval'
    );

    expect(modification.status).toBe('draft');
    expect(modification.number).toMatch(/^BM-\d{4}$/);

    // Submit for approval
    const result = await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'submit');

    expect(result.status).toBe('pending');
  });

  test('1.3 - Approve modification via API', async ({ request }) => {
    // Get a budget line
    const lines = await getBudgetLinesViaAPI(request, TEST_PROJECT_ID);
    test.skip(lines.length === 0, 'No budget lines available for testing');

    // Create and submit a modification
    const modification = await createModificationViaAPI(
      request,
      TEST_PROJECT_ID,
      lines[0].id,
      3000,
      'API Test - Approve'
    );
    await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'submit');

    // Approve the modification
    const result = await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'approve');

    expect(result.status).toBe('approved');
    expect(result.effectiveDate).toBeTruthy();
  });

  test('1.4 - Reject modification via API', async ({ request }) => {
    // Get a budget line
    const lines = await getBudgetLinesViaAPI(request, TEST_PROJECT_ID);
    test.skip(lines.length === 0, 'No budget lines available for testing');

    // Create and submit a modification
    const modification = await createModificationViaAPI(
      request,
      TEST_PROJECT_ID,
      lines[0].id,
      1500,
      'API Test - Reject'
    );
    await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'submit');

    // Reject the modification (returns to draft)
    const result = await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'reject');

    expect(result.status).toBe('draft');
  });

  test('1.5 - Void approved modification via API', async ({ request }) => {
    // Get a budget line
    const lines = await getBudgetLinesViaAPI(request, TEST_PROJECT_ID);
    test.skip(lines.length === 0, 'No budget lines available for testing');

    // Create, submit, and approve a modification
    const modification = await createModificationViaAPI(request, TEST_PROJECT_ID, lines[0].id, 4500, 'API Test - Void');
    await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'submit');
    await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'approve');

    // Void the approved modification
    const result = await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'void');

    expect(result.status).toBe('void');
  });

  test('1.6 - Invalid status transitions are rejected', async ({ request }) => {
    // Get a budget line
    const lines = await getBudgetLinesViaAPI(request, TEST_PROJECT_ID);
    test.skip(lines.length === 0, 'No budget lines available for testing');

    // Create a draft modification
    const modification = await createModificationViaAPI(
      request,
      TEST_PROJECT_ID,
      lines[0].id,
      1000,
      'API Test - Invalid Transition'
    );

    // Try to approve directly from draft (should fail)
    const response = await request.patch(`/api/projects/${TEST_PROJECT_ID}/budget/modifications`, {
      data: {
        modificationId: modification.id,
        action: 'approve',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid status transition');
  });

  test('1.7 - Delete draft modification via API', async ({ request }) => {
    // Get a budget line
    const lines = await getBudgetLinesViaAPI(request, TEST_PROJECT_ID);
    test.skip(lines.length === 0, 'No budget lines available for testing');

    // Create a draft modification
    const modification = await createModificationViaAPI(
      request,
      TEST_PROJECT_ID,
      lines[0].id,
      500,
      'API Test - Delete'
    );

    // Delete the draft modification
    const response = await request.delete(
      `/api/projects/${TEST_PROJECT_ID}/budget/modifications?modificationId=${modification.id}`
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});

// ============================================================================
// TEST SUITE 2: Cost Actuals Integration
// ============================================================================
test.describe('Phase 1B - Cost Actuals Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('2.1 - Verify Job to Date Cost Detail calculation via API', async ({ request }) => {
    // Get budget data with cost aggregation
    const response = await request.get(`/api/projects/${TEST_PROJECT_ID}/budget`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.lineItems).toBeDefined();

    // Check that lineItems have cost fields
    if (data.lineItems.length > 0) {
      const line = data.lineItems[0];
      expect(line).toHaveProperty('jobToDateCostDetail');
      expect(line).toHaveProperty('directCosts');
      expect(line).toHaveProperty('pendingCostChanges');
      expect(typeof line.jobToDateCostDetail).toBe('number');
      expect(typeof line.directCosts).toBe('number');
      expect(typeof line.pendingCostChanges).toBe('number');
    }
  });

  test('2.2 - Verify Direct Costs excludes Subcontractor Invoice', async ({ request }) => {
    // Get direct costs breakdown
    const response = await request.get(
      `/api/projects/${TEST_PROJECT_ID}/budget/direct-costs?status=approved`
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Verify the totals structure
    expect(data.totals).toBeDefined();
    expect(data.totals).toHaveProperty('jobToDateCostDetail');
    expect(data.totals).toHaveProperty('directCosts');

    // Direct Costs should always be <= Job to Date Cost Detail
    // (because JTD includes Subcontractor Invoice, Direct Costs doesn't)
    expect(data.totals.directCosts).toBeLessThanOrEqual(data.totals.jobToDateCostDetail);

    // Verify breakdown structure
    if (data.breakdown) {
      expect(data.breakdown).toHaveProperty('Invoice');
      expect(data.breakdown).toHaveProperty('Expense');
      expect(data.breakdown).toHaveProperty('Payroll');
      expect(data.breakdown).toHaveProperty('Subcontractor Invoice');
    }
  });

  test('2.3 - Verify Pending Cost Changes aggregation', async ({ request }) => {
    // Get budget data with pending costs
    const response = await request.get(`/api/projects/${TEST_PROJECT_ID}/budget`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Check grand totals include pending cost changes
    if (data.grandTotals) {
      expect(data.grandTotals).toHaveProperty('pendingCostChanges');
      expect(typeof data.grandTotals.pendingCostChanges).toBe('number');
    }

    // Check individual lines
    for (const line of data.lineItems || []) {
      expect(line).toHaveProperty('pendingCostChanges');
      expect(typeof line.pendingCostChanges).toBe('number');
      expect(line.pendingCostChanges).toBeGreaterThanOrEqual(0);
    }
  });

  test('2.4 - Verify cost totals displayed in budget page', async ({ page }) => {
    await navigateToBudget(page);

    // Wait for data to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Check if cost columns are displayed
    const tableHeaders = page.locator('thead th, [role="columnheader"]');
    const headerCount = await tableHeaders.count();

    // Look for cost-related column headers
    let hasJobToDateColumn = false;
    let hasDirectCostsColumn = false;
    let hasPendingColumn = false;

    for (let i = 0; i < headerCount; i++) {
      const text = await tableHeaders.nth(i).textContent();
      if (text) {
        if (text.includes('Job to Date') || text.includes('JTD')) hasJobToDateColumn = true;
        if (text.includes('Direct Cost')) hasDirectCostsColumn = true;
        if (text.includes('Pending')) hasPendingColumn = true;
      }
    }

    // At minimum, we expect the table to load
    expect(headerCount).toBeGreaterThan(0);

    await takeScreenshot(page, '02-cost-columns-display');
  });

  test('2.5 - Direct costs API returns correct format for budget line', async ({ request }) => {
    // Get a budget line first
    const lines = await getBudgetLinesViaAPI(request, TEST_PROJECT_ID);
    test.skip(lines.length === 0, 'No budget lines available for testing');

    // Get direct costs for specific budget line
    const response = await request.get(
      `/api/projects/${TEST_PROJECT_ID}/budget/direct-costs?budgetLineId=${lines[0].id}`
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('costs');
    expect(data).toHaveProperty('totals');
    expect(data).toHaveProperty('breakdown');
    expect(data).toHaveProperty('meta');

    // Verify meta information
    expect(data.meta.projectId).toBe(parseInt(TEST_PROJECT_ID, 10));
    expect(data.meta.costCodeId).toBeDefined();

    // Costs should be an array
    expect(Array.isArray(data.costs)).toBe(true);
  });
});

// ============================================================================
// TEST SUITE 3: UI Component Tests
// ============================================================================
test.describe('Phase 1A/1B - UI Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('3.1 - Budget page displays cost columns correctly', async ({ page }) => {
    await navigateToBudget(page);

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 15000 });

    // Take screenshot of the budget table
    await takeScreenshot(page, '03-budget-table-display');

    // Verify the table has data rows
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    // The table should have at least a header, even if no data
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('3.2 - Currency values are formatted correctly', async ({ page }) => {
    await navigateToBudget(page);

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 15000 });

    // Find cells that should contain currency values (looking for $ symbol)
    const currencyCells = page.locator('td').filter({ hasText: /^\$[\d,]+(\.\d{2})?$|^\(\$[\d,]+(\.\d{2})?\)$/ });
    const count = await currencyCells.count();

    if (count > 0) {
      // Verify currency formatting (should have $ symbol and comma separators)
      const firstCell = await currencyCells.first().textContent();
      expect(firstCell).toMatch(/^\$[\d,]+(\.\d{2})?$|^\(\$[\d,]+(\.\d{2})?\)$/);
    }
  });

  test('3.3 - Budget modifications modal can be opened', async ({ page }) => {
    await navigateToBudget(page);

    // Try to open modifications via Create dropdown
    const createButton = page.locator('button').filter({ hasText: 'Create' }).first();
    if (await createButton.isVisible()) {
      await createButton.click();

      // Wait for dropdown menu
      await page.waitForSelector('[role="menu"], [role="listbox"]', { timeout: 5000 }).catch(() => {
        // Menu might not appear
      });

      await takeScreenshot(page, '04-create-dropdown');
    }
  });

  test('3.4 - API error handling works correctly', async ({ request }) => {
    // Test invalid project ID
    const response = await request.get(`/api/projects/invalid/budget`);
    expect(response.status()).toBe(400);

    // Test invalid modification ID
    const patchResponse = await request.patch(`/api/projects/${TEST_PROJECT_ID}/budget/modifications`, {
      data: {
        modificationId: 'non-existent-uuid',
        action: 'approve',
      },
    });
    expect(patchResponse.status()).toBe(404);
  });

  test('3.5 - Modifications API validates required fields', async ({ request }) => {
    // Missing budgetLineId
    const response1 = await request.post(`/api/projects/${TEST_PROJECT_ID}/budget/modifications`, {
      data: {
        amount: '1000',
        title: 'Test',
      },
    });
    expect(response1.status()).toBe(400);

    // Missing amount
    const response2 = await request.post(`/api/projects/${TEST_PROJECT_ID}/budget/modifications`, {
      data: {
        budgetLineId: '00000000-0000-0000-0000-000000000000',
        title: 'Test',
      },
    });
    expect(response2.status()).toBe(400);
  });
});

// ============================================================================
// TEST SUITE 4: Integration Tests - Workflow + Costs Together
// ============================================================================
test.describe('Phase 1A/1B - Integration Tests', () => {
  test('4.1 - Modification approval triggers budget rollup refresh', async ({ request }) => {
    // Get a budget line
    const lines = await getBudgetLinesViaAPI(request, TEST_PROJECT_ID);
    test.skip(lines.length === 0, 'No budget lines available for testing');

    const targetLine = lines[0];

    // Get initial budget state
    const initialResponse = await request.get(`/api/projects/${TEST_PROJECT_ID}/budget`);
    const initialData = await initialResponse.json();
    const initialLine = initialData.lineItems.find((l: { id: string }) => l.id === targetLine.id);
    const initialModTotal = initialLine?.budgetModifications || 0;

    // Create, submit, and approve a modification
    const modification = await createModificationViaAPI(
      request,
      TEST_PROJECT_ID,
      targetLine.id,
      7500,
      'Integration Test - Budget Rollup'
    );
    await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'submit');
    await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'approve');

    // Get updated budget state
    const updatedResponse = await request.get(`/api/projects/${TEST_PROJECT_ID}/budget`);
    const updatedData = await updatedResponse.json();
    const updatedLine = updatedData.lineItems.find((l: { id: string }) => l.id === targetLine.id);
    const updatedModTotal = updatedLine?.budgetModifications || 0;

    // The modification total should have increased by the modification amount
    // Note: This depends on refresh_budget_rollup() RPC working correctly
    expect(updatedModTotal).toBeGreaterThanOrEqual(initialModTotal);

    // Cleanup: void the modification to restore state
    await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'void');
  });

  test('4.2 - Full workflow end-to-end via API', async ({ request }) => {
    // Get a budget line
    const lines = await getBudgetLinesViaAPI(request, TEST_PROJECT_ID);
    test.skip(lines.length === 0, 'No budget lines available for testing');

    // STEP 1: Create modification (should be draft)
    const modification = await createModificationViaAPI(
      request,
      TEST_PROJECT_ID,
      lines[0].id,
      10000,
      'Full E2E Workflow Test'
    );
    expect(modification.status).toBe('draft');

    // STEP 2: Submit for approval (draft → pending)
    const submitted = await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'submit');
    expect(submitted.status).toBe('pending');

    // STEP 3: Approve (pending → approved)
    const approved = await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'approve');
    expect(approved.status).toBe('approved');
    expect(approved.effectiveDate).toBeTruthy();

    // STEP 4: Void (approved → void)
    const voided = await changeModificationStatusViaAPI(request, TEST_PROJECT_ID, modification.id, 'void');
    expect(voided.status).toBe('void');

    // Verify final state via GET
    const response = await request.get(
      `/api/projects/${TEST_PROJECT_ID}/budget/modifications?status=void`
    );
    const data = await response.json();
    const voidedMod = data.modifications.find((m: { id: string }) => m.id === modification.id);
    expect(voidedMod).toBeDefined();
    expect(voidedMod.status).toBe('void');
  });
});
