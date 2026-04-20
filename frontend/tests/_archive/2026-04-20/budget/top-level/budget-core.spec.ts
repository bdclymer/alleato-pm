/**
 * Budget Core E2E Tests
 *
 * Tests core budget functionality including:
 * - Page load with seeded data
 * - Budget line item creation modal
 * - Budget column detail modal (for editing values)
 *
 * @fileoverview E2E tests for the Budget module's fundamental features.
 * These tests verify that the budget page loads correctly, users can access
 * the creation flow for new line items, and can interact with existing
 * budget data through the column detail modal.
 *
 * @requires Authenticated user session (handled by fixtures)
 * @requires Test project with seeded budget data (created in beforeEach)
 */

import { test, expect } from "../fixtures/index";
import { createTestProject } from "../helpers/bootstrap";

/** Project ID assigned during test setup - used for navigation to budget page */
let projectId: number;

/**
 * Helper function to wait for the budget table to be rendered.
 * Used to ensure data has loaded before interacting with table elements.
 *
 * @param page - Playwright page object with waitForSelector method
 * @throws TimeoutError if table doesn't appear within 15 seconds
 */
const waitForBudgetTable = async (page: { waitForSelector: (selector: string, options?: { timeout?: number }) => Promise<void> }) => {
  await page.waitForSelector("table", { timeout: 15000 });
};

/**
 * Budget Core Test Suite
 *
 * Covers the essential budget page functionality that all users need:
 * 1. Viewing budget data (page load, tab navigation, table display)
 * 2. Creating new budget line items (modal workflow)
 * 3. Editing existing budget values (column detail modal)
 */
test.describe("Budget Core", () => {
  /**
   * Test Setup: Create a fresh test project before each test.
   *
   * This ensures test isolation - each test gets its own project with
   * seeded budget data, preventing test pollution and allowing parallel execution.
   *
   * The createTestProject helper:
   * - Creates a new project via API
   * - Seeds initial budget line items
   * - Returns project metadata including ID for navigation
   */
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  /**
   * Test: Budget Page Load
   *
   * Verifies that the budget page loads successfully with all required elements:
   * - Budget tabs navigation (Budget, Change Orders, etc.)
   * - The "Budget" tab button itself
   * - At least one row in the budget table (from seeded data)
   *
   * This is the most fundamental test - if this fails, the budget module
   * is completely broken.
   *
   * @priority Critical
   * @coverage UI rendering, data fetch, tab navigation
   */
  test("loads budget page with seeded line items", async ({ page, safeNavigate }) => {
    // Navigate to the budget page for our test project
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");
    await waitForBudgetTable(page);

    // Verify the budget tabs navigation is present (contains Budget, Change Orders, etc.)
    const tabsNav = page.getByRole("navigation", { name: /budget tabs/i });
    await expect(tabsNav).toBeVisible({ timeout: 15000 });

    // Verify the Budget tab button is visible and accessible
    const budgetTab = page.getByRole("button", { name: /^budget$/i }).first();
    await expect(budgetTab).toBeVisible({ timeout: 15000 });

    // Verify at least one budget line item row exists (from seeded data)
    // This confirms the API fetch succeeded and data rendered
    await expect(page.locator("table tbody tr").first()).toBeVisible({
      timeout: 15000,
    });
  });

  /**
   * Test: Budget Line Item Creation Modal
   *
   * Verifies the workflow to create a new budget line item:
   * 1. Click the "Create" button in the page header
   * 2. Select "Budget Line Item" from the dropdown menu
   * 3. Verify the creation modal appears with correct title
   *
   * Note: This test only verifies the modal opens - it does NOT test
   * actually creating a line item. That's covered in budget-line-item-crud.spec.ts
   *
   * @priority High
   * @coverage Modal opening, menu navigation, UI accessibility
   */
  test("opens the budget line item creation modal", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");

    // Click the Create button to open the creation menu
    const createButton = page.getByRole("button", { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 15000 });
    await createButton.click();

    // Select "Budget Line Item" from the dropdown menu
    const budgetLineItemOption = page.getByRole("menuitem", {
      name: /budget line item/i,
    });
    await expect(budgetLineItemOption).toBeVisible({ timeout: 5000 });
    await budgetLineItemOption.click();

    // Verify the modal appears with the expected title
    // Note: Title may vary ("Add" vs "Create") so we match either
    const modalTitle = page
      .getByText(/Add Budget Line Items|Create Budget Line Items/i)
      .first();
    await expect(modalTitle).toBeVisible({ timeout: 15000 });
  });

  /**
   * Test: Budget Column Detail Modal
   *
   * Verifies that clicking on a budget value cell opens the detail modal:
   * 1. Find an editable cell (button with "Edit $X.XX" aria-label)
   * 2. Click to open the column detail modal
   * 3. Verify the dialog appears
   * 4. Close the dialog and verify it disappears
   *
   * The column detail modal allows users to:
   * - View transaction history for that cell
   * - Add new transactions (direct costs, change orders, etc.)
   * - See how the value was calculated
   *
   * @priority High
   * @coverage Modal open/close, editable cell interaction
   */
  test("opens budget column detail modal", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");
    await waitForBudgetTable(page);

    // Find an editable budget cell (has aria-label starting with "Edit $")
    // These are the clickable monetary value cells in the budget table
    const cell = page.locator('button[aria-label^="Edit $"]').first();
    await expect(cell).toBeVisible({ timeout: 15000 });
    await cell.click();

    // Verify the detail modal dialog appears
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });

    // Test modal dismissal - close button should hide the dialog
    const closeButton = page.getByRole("button", { name: /close/i }).first();
    await closeButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
  });
});
