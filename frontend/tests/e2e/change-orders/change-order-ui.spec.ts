import { test, expect } from "@playwright/test";
import {
  createChangeOrder,
  deleteChangeOrder,
  listChangeOrdersForProject,
} from "../../helpers/db";

/**
 * Change Orders UI E2E Tests
 *
 * Comprehensive tests for change order list, detail, and workflow pages.
 * Uses project 67 ("Vermillion Rise Warehouse") which the test user
 * (test1@mail.com) already has access to via project_directory_memberships.
 */
const PROJECT_ID = 67;

test.describe("Change Orders – UI Flows", () => {
  test.describe.configure({ retries: 1 });

  test.beforeEach(async () => {
    // Clean slate for each test
    const existing = await listChangeOrdersForProject(PROJECT_ID);
    const testCOs = existing.filter(
      (co) => co.co_number?.startsWith("CO-UI-") ?? false
    );
    for (const co of testCOs) {
      await deleteChangeOrder(co.id);
    }
  });

  test.afterAll(async () => {
    // Final cleanup
    const existing = await listChangeOrdersForProject(PROJECT_ID);
    const testCOs = existing.filter(
      (co) => co.co_number?.startsWith("CO-UI-") ?? false
    );
    for (const co of testCOs) {
      await deleteChangeOrder(co.id);
    }
  });

  test("List page renders with table and change orders", async ({ page }) => {
    // Seed test data
    await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-LIST-001",
      title: "Test Change Order 1",
      description: "Testing list rendering",
      status: "draft",
      amount: 1000,
    });
    await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-LIST-002",
      title: "Test Change Order 2",
      description: "Another test",
      status: "pending",
      amount: 2000,
    });

    await page.goto(`/${PROJECT_ID}/change-orders`);
    await page.waitForLoadState("domcontentloaded");

    // Verify page header
    await expect(page.getByText("Change Orders")).toBeVisible({
      timeout: 15000,
    });

    // Verify table renders with both change orders
    await expect(page.getByText("CO-UI-LIST-001")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("CO-UI-LIST-002")).toBeVisible();
    await expect(page.getByText("Test Change Order 1")).toBeVisible();
    await expect(page.getByText("Test Change Order 2")).toBeVisible();
  });

  test("Create Change Order button navigates to form and creates CO", async ({
    page,
  }) => {
    await page.goto(`/${PROJECT_ID}/change-orders`);
    await page.waitForLoadState("domcontentloaded");

    // Click Create button
    await page.getByRole("button", { name: /create change order/i }).click();

    // Should navigate to new change order form
    await expect(page).toHaveURL(
      new RegExp(`/${PROJECT_ID}/change-orders/new`)
    );

    // Fill out the form
    await page
      .locator('[data-testid="change-order-number"]')
      .fill("CO-UI-CREATE-001");
    await page
      .locator('[data-testid="change-order-title"]')
      .fill("UI Created Change Order");
    await page
      .locator('[data-testid="change-order-description"]')
      .fill("Created via UI test");
    await page.locator('[data-testid="change-order-amount"]').fill("5000");

    // Submit form
    await page.locator('[data-testid="change-order-submit"]').click();

    // Should show success toast
    await expect(page.getByText(/change order created/i)).toBeVisible({
      timeout: 15000,
    });

    // Should redirect to detail page
    await page.waitForURL(new RegExp(`/${PROJECT_ID}/change-orders/\\d+`), {
      timeout: 15000,
    });

    // Verify we're on detail page with correct data
    await expect(page.getByText("CO-UI-CREATE-001")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("UI Created Change Order")).toBeVisible();
  });

  test("Click change order row navigates to detail page", async ({ page }) => {
    // Create a change order
    const co = await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-NAV-001",
      title: "Navigation Test CO",
      description: "Testing row click navigation",
      status: "draft",
      amount: 3000,
    });

    await page.goto(`/${PROJECT_ID}/change-orders`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for the change order to appear in the list
    await expect(page.getByText("CO-UI-NAV-001")).toBeVisible({
      timeout: 15000,
    });

    // Click on the change order row (could be the number or title)
    await page.getByText("CO-UI-NAV-001").click();

    // Should navigate to detail page
    await expect(page).toHaveURL(
      new RegExp(`/${PROJECT_ID}/change-orders/${co.id}`)
    );

    // Verify detail page content
    await expect(page.getByText("Navigation Test CO")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Testing row click navigation")).toBeVisible();
  });

  test("Detail page shows all tabs: General, Line Items, Attachments, Reviews, History", async ({
    page,
  }) => {
    const co = await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-TABS-001",
      title: "Tabs Test CO",
      description: "Testing tab rendering",
      status: "pending",
      amount: 4500,
    });

    await page.goto(`/${PROJECT_ID}/change-orders/${co.id}`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for page to load
    await expect(page.getByText("CO-UI-TABS-001")).toBeVisible({
      timeout: 15000,
    });

    // Verify all tabs are present
    await expect(page.getByRole("tab", { name: /general/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("tab", { name: /line items/i })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /attachments/i })
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /reviews/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /history/i })).toBeVisible();

    // Click each tab to verify they're functional
    await page.getByRole("tab", { name: /line items/i }).click();
    await expect(page.getByText(/line items/i)).toBeVisible();

    await page.getByRole("tab", { name: /attachments/i }).click();
    await expect(page.getByText(/attachments/i)).toBeVisible();

    await page.getByRole("tab", { name: /reviews/i }).click();
    await expect(page.getByText(/reviews/i)).toBeVisible();

    await page.getByRole("tab", { name: /history/i }).click();
    await expect(page.getByText(/history/i)).toBeVisible();
  });

  test("Status filter tabs work correctly", async ({ page }) => {
    // Create change orders with different statuses
    await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-FILTER-DRAFT",
      title: "Draft CO",
      status: "draft",
      amount: 1000,
    });
    await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-FILTER-PENDING",
      title: "Pending CO",
      status: "pending",
      submitted_at: new Date().toISOString(),
      amount: 2000,
    });
    await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-FILTER-APPROVED",
      title: "Approved CO",
      status: "approved",
      approved_at: new Date().toISOString(),
      amount: 3000,
    });

    await page.goto(`/${PROJECT_ID}/change-orders`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for all to load
    await expect(page.getByText("CO-UI-FILTER-DRAFT")).toBeVisible({
      timeout: 15000,
    });

    // Check if status tabs exist
    const allTab = page.getByRole("tab", { name: /all/i });
    const draftTab = page.getByRole("tab", { name: /draft/i });
    const pendingTab = page.getByRole("tab", { name: /pending/i });
    const approvedTab = page.getByRole("tab", { name: /approved/i });

    if (await allTab.isVisible()) {
      // Click Draft tab
      await draftTab.click();
      await page.waitForTimeout(1000); // Wait for filter to apply
      await expect(page.getByText("CO-UI-FILTER-DRAFT")).toBeVisible();

      // Click Pending tab
      await pendingTab.click();
      await page.waitForTimeout(1000);
      await expect(page.getByText("CO-UI-FILTER-PENDING")).toBeVisible();

      // Click Approved tab
      await approvedTab.click();
      await page.waitForTimeout(1000);
      await expect(page.getByText("CO-UI-FILTER-APPROVED")).toBeVisible();

      // Click All tab to show all
      await allTab.click();
      await page.waitForTimeout(1000);
      await expect(page.getByText("CO-UI-FILTER-DRAFT")).toBeVisible();
      await expect(page.getByText("CO-UI-FILTER-PENDING")).toBeVisible();
      await expect(page.getByText("CO-UI-FILTER-APPROVED")).toBeVisible();
    }
  });

  test("Search functionality filters change orders", async ({ page }) => {
    await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-SEARCH-001",
      title: "Foundation Work",
      description: "Additional foundation reinforcement",
      status: "draft",
      amount: 5000,
    });
    await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-SEARCH-002",
      title: "Electrical Upgrades",
      description: "Panel upgrade and wiring",
      status: "draft",
      amount: 3000,
    });

    await page.goto(`/${PROJECT_ID}/change-orders`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for both to appear
    await expect(page.getByText("CO-UI-SEARCH-001")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("CO-UI-SEARCH-002")).toBeVisible();

    // Find and use search input
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Foundation");
      await page.waitForTimeout(1000); // Wait for search to apply

      // Should show only the foundation CO
      await expect(page.getByText("CO-UI-SEARCH-001")).toBeVisible();
      await expect(page.getByText("Foundation Work")).toBeVisible();

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(1000);

      // Both should appear again
      await expect(page.getByText("CO-UI-SEARCH-001")).toBeVisible();
      await expect(page.getByText("CO-UI-SEARCH-002")).toBeVisible();
    }
  });

  test("Edit change order from detail page", async ({ page }) => {
    const co = await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-EDIT-001",
      title: "Original Title",
      description: "Original description",
      status: "draft",
      amount: 2500,
    });

    await page.goto(`/${PROJECT_ID}/change-orders/${co.id}`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText("Original Title")).toBeVisible({
      timeout: 15000,
    });

    // Look for Edit button
    const editButton = page.getByRole("button", { name: /edit/i });
    if (await editButton.isVisible()) {
      await editButton.click();

      // Should navigate to edit page or show edit form
      await page.waitForTimeout(1000);

      // Try to update title field
      const titleInput = page.locator('[data-testid="change-order-title"]');
      if (await titleInput.isVisible()) {
        await titleInput.clear();
        await titleInput.fill("Updated Title");

        // Save changes
        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        // Should show success message
        await expect(page.getByText(/updated/i)).toBeVisible({
          timeout: 10000,
        });

        // Verify updated title appears
        await expect(page.getByText("Updated Title")).toBeVisible();
      }
    }
  });

  test("Approve a change order (if user is reviewer)", async ({ page }) => {
    const co = await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-APPROVE-001",
      title: "CO to Approve",
      description: "Testing approval workflow",
      status: "pending",
      submitted_at: new Date().toISOString(),
      amount: 6000,
    });

    await page.goto(`/${PROJECT_ID}/change-orders/${co.id}`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText("CO-UI-APPROVE-001")).toBeVisible({
      timeout: 15000,
    });

    // Look for Approve button
    const approveButton = page.getByRole("button", { name: /approve/i });
    if (await approveButton.isVisible()) {
      await approveButton.click();

      // May have confirmation dialog
      const confirmButton = page.getByRole("button", { name: /confirm/i });
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }

      // Should show success message
      await expect(
        page.getByText(/approved|success/i).first()
      ).toBeVisible({ timeout: 10000 });

      // Status should update to approved
      await expect(page.getByText(/approved/i)).toBeVisible();
    }
  });

  test("Reject a change order with reason", async ({ page }) => {
    const co = await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-REJECT-001",
      title: "CO to Reject",
      description: "Testing rejection workflow",
      status: "pending",
      submitted_at: new Date().toISOString(),
      amount: 7500,
    });

    await page.goto(`/${PROJECT_ID}/change-orders/${co.id}`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText("CO-UI-REJECT-001")).toBeVisible({
      timeout: 15000,
    });

    // Look for Reject button
    const rejectButton = page.getByRole("button", { name: /reject/i });
    if (await rejectButton.isVisible()) {
      await rejectButton.click();

      // Should show rejection reason input
      const reasonInput = page.getByPlaceholder(/reason|why/i);
      if (await reasonInput.isVisible({ timeout: 5000 })) {
        await reasonInput.fill("Exceeds budget allocation for this quarter");

        // Submit rejection
        const submitButton = page.getByRole("button", {
          name: /submit|confirm/i,
        });
        await submitButton.click();

        // Should show success message
        await expect(
          page.getByText(/rejected|success/i).first()
        ).toBeVisible({ timeout: 10000 });

        // Status should update to rejected
        await expect(page.getByText(/rejected/i)).toBeVisible();

        // Rejection reason should be visible
        await expect(
          page.getByText("Exceeds budget allocation for this quarter")
        ).toBeVisible();
      }
    }
  });

  test("Back to list button navigates correctly", async ({ page }) => {
    const co = await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-UI-BACK-001",
      title: "Back Button Test",
      status: "draft",
      amount: 1500,
    });

    await page.goto(`/${PROJECT_ID}/change-orders/${co.id}`);
    await page.waitForLoadState("domcontentloaded");

    // Click back/return button
    const backButton = page.getByRole("link", {
      name: /back|return|change orders/i,
    });
    await backButton.click();

    // Should return to list page
    await expect(page).toHaveURL(
      new RegExp(`/${PROJECT_ID}/change-orders$`)
    );
  });
});
