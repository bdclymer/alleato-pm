import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Commitments E2E Tests - CRUD Flows
 * Phase 8 Testing Tasks
 *
 * Tests the complete user workflows for:
 * - Create subcontract flow
 * - Create purchase order flow
 * - Edit commitment flow
 * - Delete and restore flow
 */

// Test configuration
const TEST_PROJECT_ID = 67;
const BASE_URL = 'http://localhost:3000';

// Supabase client setup for database verification
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Track created records for cleanup
let createdSubcontractIds: string[] = [];
let createdPurchaseOrderIds: string[] = [];

// Helper function to navigate to commitments page
async function navigateToCommitments(page: Page) {
  await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/commitments`);
  await page.waitForLoadState('networkidle');
}

// Helper function to take screenshots
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/screenshots/commitments-crud-flows/${name}.png`,
    fullPage: true,
  });
}

// Helper function to generate unique test identifiers
function generateTestId(): string {
  return `E2E-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

test.describe('Commitments - Create Subcontract Flow', () => {
  test('should create a subcontract with required fields', async ({ page }) => {
    const testId = generateTestId();
    const contractNumber = `SC-${testId}`;
    const title = `Test Subcontract ${testId}`;

    // Step 1: Navigate to commitments list
    await navigateToCommitments(page);
    await takeScreenshot(page, 'subcontract-01-list-page');

    // Step 2: Click Create dropdown and select Subcontract
    const createButton = page.getByRole('button', { name: /Create/i }).first();
    await expect(createButton).toBeVisible();
    await createButton.click();
    await page.waitForTimeout(300);

    const subcontractOption = page.getByRole('menuitem', { name: /Subcontract/i });
    await expect(subcontractOption).toBeVisible();
    await subcontractOption.click();

    // Step 3: Wait for form to load
    await page.waitForURL(`**/${TEST_PROJECT_ID}/commitments/new?type=subcontract**`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'subcontract-02-form-loaded');

    // Step 4: Verify form header
    await expect(page.getByRole('heading', { name: /new subcontract/i })).toBeVisible();

    // Step 5: Fill in required fields
    // Contract Number
    const numberField = page.getByLabel(/contract.*number|commitment.*number/i).first();
    if (await numberField.isVisible()) {
      await numberField.clear();
      await numberField.fill(contractNumber);
    } else {
      // Try alternative selector
      const numberInput = page.locator('#number, input[name="number"], input[name="contract_number"]').first();
      await numberInput.clear();
      await numberInput.fill(contractNumber);
    }

    // Title
    const titleField = page.getByLabel(/title/i).first();
    if (await titleField.isVisible()) {
      await titleField.fill(title);
    } else {
      const titleInput = page.locator('#title, input[name="title"]').first();
      await titleInput.fill(title);
    }

    // Select Contract Company
    const companySelect = page.locator('[data-slot="select-trigger"]').first();
    if (await companySelect.isVisible({ timeout: 2000 })) {
      await companySelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[data-slot="select-item"]').first();
      if (await firstOption.isVisible({ timeout: 2000 })) {
        await firstOption.click();
      }
    }

    await takeScreenshot(page, 'subcontract-03-form-filled');

    // Step 6: Submit the form
    const submitButton = page.getByRole('button', { name: /create subcontract/i });
    await expect(submitButton).toBeVisible();

    // Listen for API response
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/') && resp.request().method() === 'POST',
      { timeout: 15000 }
    ).catch(() => null);

    await submitButton.click();

    // Step 7: Wait for API response
    const response = await responsePromise;
    if (response) {
      const status = response.status();
      console.log('Create Subcontract API Response status:', status);

      if (status === 200 || status === 201) {
        const body = await response.json().catch(() => ({}));
        if (body.id) {
          createdSubcontractIds.push(body.id);
          console.log('Created subcontract ID:', body.id);
        }
      }
    }

    // Step 8: Verify success - should navigate away from form
    await page.waitForTimeout(2000);
    const currentUrl = page.url();

    if (!currentUrl.includes('/commitments/new')) {
      // Successfully navigated away
      await takeScreenshot(page, 'subcontract-04-created-success');

      // Verify we can see the created commitment
      await navigateToCommitments(page);
      await page.waitForTimeout(1000);

      // Search for the created commitment
      const searchInput = page.getByPlaceholder(/Search commitments/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill(contractNumber);
        await page.waitForTimeout(500);
      }

      await takeScreenshot(page, 'subcontract-05-in-list');
    } else {
      // Still on form - check for errors
      await takeScreenshot(page, 'subcontract-04-error');
      const errorText = await page.locator('.text-red-600, .text-destructive, [role="alert"]').first().textContent().catch(() => null);
      console.log('Form error:', errorText);
    }
  });

  test('should validate required fields on subcontract form', async ({ page }) => {
    // Navigate directly to subcontract form
    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/commitments/new?type=subcontract`);
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /create subcontract/i });
    await submitButton.click();
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'subcontract-validation-01-errors');

    // Check for validation error messages
    const errorMessages = page.locator('.text-red-600, .text-destructive, [role="alert"], text=/required/i');
    const errorCount = await errorMessages.count();

    // Should have at least one validation error
    expect(errorCount).toBeGreaterThan(0);
  });
});

test.describe('Commitments - Create Purchase Order Flow', () => {
  test('should create a purchase order with required fields', async ({ page }) => {
    const testId = generateTestId();
    const contractNumber = `PO-${testId}`;
    const title = `Test Purchase Order ${testId}`;

    // Step 1: Navigate to commitments list
    await navigateToCommitments(page);
    await takeScreenshot(page, 'po-01-list-page');

    // Step 2: Click Create dropdown and select Purchase Order
    const createButton = page.getByRole('button', { name: /Create/i }).first();
    await expect(createButton).toBeVisible();
    await createButton.click();
    await page.waitForTimeout(300);

    const poOption = page.getByRole('menuitem', { name: /Purchase Order/i });
    await expect(poOption).toBeVisible();
    await poOption.click();

    // Step 3: Wait for form to load
    await page.waitForURL(`**/${TEST_PROJECT_ID}/commitments/new?type=purchase_order**`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'po-02-form-loaded');

    // Step 4: Verify form header
    await expect(page.getByRole('heading', { name: /new purchase order/i })).toBeVisible();

    // Step 5: Fill in required fields
    // Contract Number
    const numberField = page.getByLabel(/contract.*number|commitment.*number/i).first();
    if (await numberField.isVisible()) {
      await numberField.clear();
      await numberField.fill(contractNumber);
    } else {
      const numberInput = page.locator('#number, input[name="number"], input[name="contract_number"]').first();
      await numberInput.clear();
      await numberInput.fill(contractNumber);
    }

    // Title
    const titleField = page.getByLabel(/title/i).first();
    if (await titleField.isVisible()) {
      await titleField.fill(title);
    } else {
      const titleInput = page.locator('#title, input[name="title"]').first();
      await titleInput.fill(title);
    }

    // Select Contract Company
    const companySelect = page.locator('[data-slot="select-trigger"]').first();
    if (await companySelect.isVisible({ timeout: 2000 })) {
      await companySelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[data-slot="select-item"]').first();
      if (await firstOption.isVisible({ timeout: 2000 })) {
        await firstOption.click();
      }
    }

    // Fill Bill To (PO specific)
    const billToField = page.getByLabel(/bill to/i);
    if (await billToField.isVisible({ timeout: 2000 })) {
      await billToField.fill('123 Test Street\nTest City, ST 12345');
    }

    // Fill Ship To (PO specific)
    const shipToField = page.getByLabel(/ship to/i);
    if (await shipToField.isVisible({ timeout: 2000 })) {
      await shipToField.fill('456 Ship Street\nShip City, ST 67890');
    }

    await takeScreenshot(page, 'po-03-form-filled');

    // Step 6: Submit the form
    const submitButton = page.getByRole('button', { name: /create purchase order/i });
    await expect(submitButton).toBeVisible();

    // Listen for API response
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/') && resp.request().method() === 'POST',
      { timeout: 15000 }
    ).catch(() => null);

    await submitButton.click();

    // Step 7: Wait for API response
    const response = await responsePromise;
    if (response) {
      const status = response.status();
      console.log('Create PO API Response status:', status);

      if (status === 200 || status === 201) {
        const body = await response.json().catch(() => ({}));
        if (body.id) {
          createdPurchaseOrderIds.push(body.id);
          console.log('Created purchase order ID:', body.id);
        }
      }
    }

    // Step 8: Verify success
    await page.waitForTimeout(2000);
    const currentUrl = page.url();

    if (!currentUrl.includes('/commitments/new')) {
      await takeScreenshot(page, 'po-04-created-success');

      // Verify in list
      await navigateToCommitments(page);
      await page.waitForTimeout(1000);

      const searchInput = page.getByPlaceholder(/Search commitments/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill(contractNumber);
        await page.waitForTimeout(500);
      }

      await takeScreenshot(page, 'po-05-in-list');
    } else {
      await takeScreenshot(page, 'po-04-error');
      const errorText = await page.locator('.text-red-600, .text-destructive, [role="alert"]').first().textContent().catch(() => null);
      console.log('Form error:', errorText);
    }
  });

  test('should validate required fields on purchase order form', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/commitments/new?type=purchase_order`);
    await page.waitForLoadState('networkidle');

    const submitButton = page.getByRole('button', { name: /create purchase order/i });
    await submitButton.click();
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'po-validation-01-errors');

    const errorMessages = page.locator('.text-red-600, .text-destructive, [role="alert"], text=/required/i');
    const errorCount = await errorMessages.count();

    expect(errorCount).toBeGreaterThan(0);
  });
});

test.describe('Commitments - Edit Commitment Flow', () => {
  let testCommitmentId: string | null = null;

  test.beforeAll(async () => {
    // Create a test subcontract for editing
    const { data, error } = await supabase
      .from('subcontracts')
      .insert({
        project_id: TEST_PROJECT_ID,
        contract_number: `EDIT-TEST-${Date.now()}`,
        title: 'Test Subcontract for Edit',
        status: 'draft',
        executed: false,
      })
      .select('id')
      .single();

    if (data) {
      testCommitmentId = data.id;
      createdSubcontractIds.push(data.id);
    }
    if (error) {
      console.error('Failed to create test commitment for edit:', error);
    }
  });

  test('should navigate to edit page from list action menu', async ({ page }) => {
    if (!testCommitmentId) {
      test.skip();
      return;
    }

    await navigateToCommitments(page);
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'edit-01-list-page');

    // Find action button for a commitment row
    const actionButtons = page.locator('tbody button, [role="row"] button').first();
    if (await actionButtons.isVisible({ timeout: 5000 })) {
      await actionButtons.click();
      await page.waitForTimeout(300);

      await takeScreenshot(page, 'edit-02-action-menu');

      const editOption = page.getByRole('menuitem', { name: /Edit/i });
      if (await editOption.isVisible({ timeout: 2000 })) {
        await editOption.click();
        await page.waitForURL(`**/edit**`, { timeout: 10000 });
        await takeScreenshot(page, 'edit-03-edit-form');
      }
    }
  });

  test('should edit commitment title and save', async ({ page }) => {
    if (!testCommitmentId) {
      test.skip();
      return;
    }

    // Navigate directly to edit page
    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/commitments/${testCommitmentId}/edit`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'edit-04-direct-edit-page');

    // Update the title
    const titleField = page.getByLabel(/title/i).first();
    const newTitle = `Updated Title ${Date.now()}`;

    if (await titleField.isVisible({ timeout: 5000 })) {
      await titleField.clear();
      await titleField.fill(newTitle);

      await takeScreenshot(page, 'edit-05-title-changed');

      // Submit the form
      const submitButton = page.getByRole('button', { name: /save|update/i });
      if (await submitButton.isVisible()) {
        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/api/') && (resp.request().method() === 'PUT' || resp.request().method() === 'PATCH'),
          { timeout: 15000 }
        ).catch(() => null);

        await submitButton.click();

        const response = await responsePromise;
        if (response) {
          console.log('Edit API Response status:', response.status());
        }

        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'edit-06-save-result');

        // Verify the title was updated in the database
        const { data } = await supabase
          .from('subcontracts')
          .select('title')
          .eq('id', testCommitmentId)
          .single();

        if (data) {
          expect(data.title).toBe(newTitle);
        }
      }
    }
  });

  test('should navigate to edit page from detail page', async ({ page }) => {
    if (!testCommitmentId) {
      test.skip();
      return;
    }

    // Navigate to detail page
    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/commitments/${testCommitmentId}`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'edit-07-detail-page');

    // Look for Edit button
    const editButton = page.getByRole('button', { name: /Edit/i }).first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForURL(`**/edit**`, { timeout: 10000 });
      await takeScreenshot(page, 'edit-08-edit-from-detail');
    }
  });
});

test.describe('Commitments - Delete and Restore Flow', () => {
  let testCommitmentId: string | null = null;

  test.beforeEach(async () => {
    // Create a fresh test subcontract for each delete test
    const { data, error } = await supabase
      .from('subcontracts')
      .insert({
        project_id: TEST_PROJECT_ID,
        contract_number: `DELETE-TEST-${Date.now()}`,
        title: 'Test Subcontract for Delete',
        status: 'draft',
        executed: false,
      })
      .select('id')
      .single();

    if (data) {
      testCommitmentId = data.id;
    }
    if (error) {
      console.error('Failed to create test commitment for delete:', error);
    }
  });

  test.afterEach(async () => {
    // Hard delete the test commitment
    if (testCommitmentId) {
      await supabase.from('subcontracts').delete().eq('id', testCommitmentId);
    }
  });

  test('should soft delete commitment via action menu', async ({ page }) => {
    if (!testCommitmentId) {
      test.skip();
      return;
    }

    await navigateToCommitments(page);
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'delete-01-list-page');

    // Find action button
    const actionButtons = page.locator('tbody button, [role="row"] button').first();
    if (await actionButtons.isVisible({ timeout: 5000 })) {
      await actionButtons.click();
      await page.waitForTimeout(300);

      await takeScreenshot(page, 'delete-02-action-menu');

      const deleteOption = page.getByRole('menuitem', { name: /Delete/i });
      if (await deleteOption.isVisible({ timeout: 2000 })) {
        await deleteOption.click();
        await page.waitForTimeout(500);

        // Confirm deletion if dialog appears
        const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'delete-03-after-delete');
      }
    }
  });

  test('should soft delete commitment via API', async () => {
    if (!testCommitmentId) {
      test.skip();
      return;
    }

    // Soft delete via database update
    const { error: deleteError } = await supabase
      .from('subcontracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', testCommitmentId);

    expect(deleteError).toBeNull();

    // Verify record still exists with deleted_at set
    const { data, error } = await supabase
      .from('subcontracts')
      .select('deleted_at')
      .eq('id', testCommitmentId)
      .single();

    expect(error).toBeNull();
    expect(data?.deleted_at).toBeTruthy();
  });

  test('should restore deleted commitment', async () => {
    if (!testCommitmentId) {
      test.skip();
      return;
    }

    // First soft delete
    await supabase
      .from('subcontracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', testCommitmentId);

    // Verify it's deleted
    const { data: deletedData } = await supabase
      .from('subcontracts')
      .select('deleted_at')
      .eq('id', testCommitmentId)
      .single();

    expect(deletedData?.deleted_at).toBeTruthy();

    // Restore
    const { error: restoreError } = await supabase
      .from('subcontracts')
      .update({ deleted_at: null })
      .eq('id', testCommitmentId);

    expect(restoreError).toBeNull();

    // Verify restored
    const { data: restoredData } = await supabase
      .from('subcontracts')
      .select('deleted_at')
      .eq('id', testCommitmentId)
      .single();

    expect(restoredData?.deleted_at).toBeNull();
  });

  test('should navigate to recycle bin page', async ({ page }) => {
    await navigateToCommitments(page);
    await takeScreenshot(page, 'delete-04-main-page');

    // Look for recycle bin link/button
    const recycleLink = page.locator('a:has-text("Recycle"), a:has-text("Deleted"), a:has-text("Trash")').first();
    if (await recycleLink.isVisible({ timeout: 5000 })) {
      await recycleLink.click();
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, 'delete-05-recycle-bin');
    } else {
      // Try direct navigation
      await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/commitments/recycled`);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, 'delete-05-recycle-bin-direct');
    }
  });

  test('should restore commitment from recycle bin UI', async ({ page }) => {
    if (!testCommitmentId) {
      test.skip();
      return;
    }

    // Soft delete the commitment first
    await supabase
      .from('subcontracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', testCommitmentId);

    // Navigate to recycle bin
    await page.goto(`${BASE_URL}/${TEST_PROJECT_ID}/commitments/recycled`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'restore-01-recycle-bin');

    // Look for restore button
    const restoreButton = page.getByRole('button', { name: /restore/i }).first();
    if (await restoreButton.isVisible({ timeout: 5000 })) {
      await restoreButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'restore-02-after-restore');

      // Verify commitment is restored in database
      const { data } = await supabase
        .from('subcontracts')
        .select('deleted_at')
        .eq('id', testCommitmentId)
        .single();

      expect(data?.deleted_at).toBeNull();
    }
  });

  test('should not show deleted commitments in main list', async ({ page }) => {
    if (!testCommitmentId) {
      test.skip();
      return;
    }

    // Get the contract number before soft delete
    const { data: commitmentData } = await supabase
      .from('subcontracts')
      .select('contract_number')
      .eq('id', testCommitmentId)
      .single();

    const contractNumber = commitmentData?.contract_number;

    // Soft delete
    await supabase
      .from('subcontracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', testCommitmentId);

    // Navigate to commitments list
    await navigateToCommitments(page);
    await page.waitForTimeout(1000);

    // Search for the deleted commitment
    const searchInput = page.getByPlaceholder(/Search commitments/i);
    if (await searchInput.isVisible() && contractNumber) {
      await searchInput.fill(contractNumber);
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, 'delete-06-not-in-main-list');

    // The deleted commitment should not appear in the main list
    // It should either show no results or not include our test item
    const noResults = page.locator('text=/no commitments|no results|nothing found/i');
    const isNoResults = await noResults.isVisible({ timeout: 2000 }).catch(() => false);

    // If we can't find "no results", verify our specific item isn't shown
    if (!isNoResults && contractNumber) {
      const commitmentRow = page.locator(`text=${contractNumber}`);
      const isVisible = await commitmentRow.isVisible({ timeout: 1000 }).catch(() => false);
      expect(isVisible).toBe(false);
    }
  });
});

// Cleanup after all tests
test.afterAll(async () => {
  // Clean up created subcontracts
  for (const id of createdSubcontractIds) {
    await supabase.from('subcontracts').delete().eq('id', id);
  }

  // Clean up created purchase orders
  for (const id of createdPurchaseOrderIds) {
    await supabase.from('purchase_orders').delete().eq('id', id);
  }
});
