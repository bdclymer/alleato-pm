import { test, expect } from "@playwright/test";
import {
  createChangeOrder,
  deleteChangeOrder,
  listChangeOrdersForProject,
} from "../helpers/db";

/**
 * Change Orders E2E Tests
 *
 * Uses project 67 ("Vermillion Rise Warehouse") which the test user
 * (test1@mail.com) already has access to via project_directory_memberships.
 */
const PROJECT_ID = 67;

test.describe("Change Orders – Full CRUD E2E", () => {
  // Retry once for intermittent auth session flakiness
  test.describe.configure({ retries: 1 });
  test.beforeEach(async () => {
    // Clean slate for each test - delete all CO test data
    const existing = await listChangeOrdersForProject(PROJECT_ID);
    const testCOs = existing.filter(
      (co) => co.co_number?.startsWith("CO-E2E-") ?? false
    );
    for (const co of testCOs) {
      await deleteChangeOrder(co.id);
    }
  });

  test.afterAll(async () => {
    // Final cleanup of any test data
    const existing = await listChangeOrdersForProject(PROJECT_ID);
    const testCOs = existing.filter(
      (co) => co.co_number?.startsWith("CO-E2E-") ?? false
    );
    for (const co of testCOs) {
      await deleteChangeOrder(co.id);
    }
  });

  test("List page renders with seeded change orders", async ({ page }) => {
    // Seed data via DB helper (service role key bypasses RLS)
    await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-E2E-LIST-001",
      title: "Seeded Change Order",
      description: "For list rendering test",
      status: "draft",
    });
    await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-E2E-LIST-002",
      title: "Approved CO",
      description: "Already approved",
      status: "approved",
      approved_at: new Date().toISOString(),
    });

    await page.goto(`/${PROJECT_ID}/change-orders`);
    await page.waitForLoadState("domcontentloaded");

    // Verify both rows appear
    await expect(page.getByText("CO-E2E-LIST-001")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("CO-E2E-LIST-002")).toBeVisible();
    await expect(page.getByText("Seeded Change Order")).toBeVisible();
    await expect(page.getByText("Approved CO")).toBeVisible();
  });

  test("Create a change order via the form", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/change-orders/new`);
    await page.waitForLoadState("domcontentloaded");

    // Fill form fields
    await page
      .locator('[data-testid="change-order-number"]')
      .fill("CO-E2E-CREATE-001");
    await page
      .locator('[data-testid="change-order-title"]')
      .fill("E2E Test Change Order");
    await page
      .locator('[data-testid="change-order-description"]')
      .fill("Created by Playwright E2E test");
    await page
      .locator('[data-testid="change-order-amount"]')
      .fill("12500.50");

    // Submit the form
    await page.locator('[data-testid="change-order-submit"]').click();

    // Should show success toast
    await expect(page.getByText("Change order created")).toBeVisible({
      timeout: 15000,
    });

    // Wait for redirect to detail page
    await page.waitForURL(new RegExp(`/${PROJECT_ID}/change-orders/\\d+`), {
      timeout: 15000,
    });

    // Should show the new CO on detail page
    await expect(page.getByText("CO-E2E-CREATE-001")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("E2E Test Change Order")).toBeVisible();
    await expect(page.getByText("$12,500.50")).toBeVisible();

    // Verify in database
    const cos = await listChangeOrdersForProject(PROJECT_ID);
    const created = cos.find((co) => co.co_number === "CO-E2E-CREATE-001");
    expect(created).toBeDefined();
    expect(created!.title).toBe("E2E Test Change Order");
    expect(Number(created!.amount)).toBeCloseTo(12500.5, 2);
  });

  test("Form validation prevents empty required fields", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/change-orders/new`);
    await page.waitForLoadState("domcontentloaded");

    // Submit without filling required fields
    await page.locator('[data-testid="change-order-submit"]').click();

    // Should show validation errors
    await expect(
      page.getByText("Change order number is required")
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Title is required")).toBeVisible();
  });

  test("Detail page shows all change order data", async ({ page }) => {
    const co = await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-E2E-DETAIL-001",
      title: "Detail View Test",
      description: "Testing the detail page layout",
      status: "pending",
      submitted_at: new Date().toISOString(),
    });

    await page.goto(`/${PROJECT_ID}/change-orders/${co.id}`);
    await page.waitForLoadState("domcontentloaded");

    // Verify header content
    await expect(page.getByText("CO-E2E-DETAIL-001")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Detail View Test")).toBeVisible();
    await expect(
      page.getByText("Testing the detail page layout")
    ).toBeVisible();

    // Verify status badge
    await expect(page.getByText("pending")).toBeVisible();

    // Verify Financial Details card
    await expect(page.getByText("Financial Details")).toBeVisible();

    // Verify Timeline card
    await expect(page.getByText("Timeline")).toBeVisible();
  });

  test("Back button navigates from detail to list page", async ({ page }) => {
    const co = await createChangeOrder({
      project_id: PROJECT_ID,
      co_number: "CO-E2E-NAV-001",
      title: "Navigation Test",
      description: "Testing back navigation",
      status: "draft",
    });

    await page.goto(`/${PROJECT_ID}/change-orders/${co.id}`);
    await page.waitForLoadState("domcontentloaded");

    // Click back button
    await page.getByText("Back to Change Orders").click();

    // Should be on the list page
    await expect(page).toHaveURL(
      new RegExp(`/${PROJECT_ID}/change-orders`)
    );
  });

  test("Create form sets due date and private flag", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/change-orders/new`);
    await page.waitForLoadState("domcontentloaded");

    // Fill required fields
    await page
      .locator('[data-testid="change-order-number"]')
      .fill("CO-E2E-FLAGS-001");
    await page
      .locator('[data-testid="change-order-title"]')
      .fill("Flags Test CO");
    await page
      .locator('[data-testid="change-order-amount"]')
      .fill("5000");

    // Set due date
    await page
      .locator('[data-testid="change-order-due-date"]')
      .fill("2026-06-15");

    // Set private flag
    await page.locator("#is_private").check();

    // Submit
    await page.locator('[data-testid="change-order-submit"]').click();

    // Verify toast
    await expect(page.getByText("Change order created")).toBeVisible({
      timeout: 15000,
    });

    // Verify in database
    const cos = await listChangeOrdersForProject(PROJECT_ID);
    const created = cos.find((co) => co.co_number === "CO-E2E-FLAGS-001");
    expect(created).toBeDefined();
    expect(created!.due_date).toBe("2026-06-15");
    expect(created!.is_private).toBe(true);
    expect(Number(created!.amount)).toBe(5000);
  });

  test("Cancel button returns to list page", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/change-orders/new`);
    await page.waitForLoadState("domcontentloaded");

    // Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Should navigate back to list
    await expect(page).toHaveURL(
      new RegExp(`/${PROJECT_ID}/change-orders`)
    );
  });
});
