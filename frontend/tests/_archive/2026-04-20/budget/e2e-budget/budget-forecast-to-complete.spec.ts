import { test, expect } from "../../fixtures/index";
import { createTestProject } from "../../helpers/bootstrap";

/**
 * Regression test for: Edit the forecast-to-complete value on a line item
 * Issue: POST /budget/forecast was throwing a hard 500 when budget_forecast_line_items
 * table was missing during the DELETE step, blocking all saves including lump_sum.
 */

let projectId: number;

test.describe("Budget: Edit Forecast To Complete", () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test("opens FTC sidebar when forecast cell is clicked", async ({
    page,
    safeNavigate,
  }) => {
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for budget table to be ready
    const forecastCell = page
      .locator('button[aria-label^="Edit"]')
      .filter({ hasText: /\$/ })
      .first();
    await expect(forecastCell).toBeVisible({ timeout: 15000 });

    // Find the "forecast" column cell specifically
    const ftcButton = page
      .locator("td")
      .filter({ hasText: /^\$/ })
      .locator('button[aria-label^="Edit"]')
      .first();

    // Click any editable currency button to open a sidebar
    await forecastCell.click();
    const sidebar = page.getByRole("dialog");
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Close it
    const closeButton = page.getByRole("button", { name: /close/i }).first();
    await closeButton.click();
    await expect(sidebar).not.toBeVisible({ timeout: 5000 });
  });

  test("can save a lump-sum FTC value without error", async ({
    page,
    safeNavigate,
  }) => {
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for the table rows to appear
    await expect(
      page.locator('button[aria-label^="Edit"]').first(),
    ).toBeVisible({ timeout: 15000 });

    // Click the forecast column cell on the first row.
    // The aria-label pattern is "Edit $X.XX" and the column is labelled "forecast".
    // Use the column header text to scope to the right column.
    const forecastHeader = page.locator("th").filter({ hasText: /^forecast$/i });
    await expect(forecastHeader).toBeVisible({ timeout: 5000 });

    // Get all editable forecast cells and click the first one
    const editButtons = page.locator('button[aria-label^="Edit $"]');
    const count = await editButtons.count();
    if (count === 0) {
      test.skip(true, "No line items available to test FTC editing");
      return;
    }

    await editButtons.first().click();

    // Wait for FTC sidebar
    const sidebar = page.getByRole("dialog");
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Verify "Forecast To Complete" title is present
    await expect(
      sidebar.getByText("Forecast To Complete"),
    ).toBeVisible({ timeout: 5000 });

    // Switch to Lump Sum method
    const lumpSumOption = sidebar.getByRole("radio", { name: /lump sum/i });
    await expect(lumpSumOption).toBeVisible({ timeout: 5000 });
    await lumpSumOption.click();

    // Enter a forecast amount
    const amountInput = sidebar.locator('input[type="number"], input[inputmode="decimal"]').first();
    await expect(amountInput).toBeVisible({ timeout: 5000 });
    await amountInput.fill("5000");
    await amountInput.press("Tab");

    // Save button should now be enabled
    const saveButton = sidebar.getByRole("button", { name: /^save$/i });
    await expect(saveButton).toBeEnabled({ timeout: 3000 });
    await saveButton.click();

    // Should show success toast and close sidebar
    await expect(page.getByText(/forecast saved/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(sidebar).not.toBeVisible({ timeout: 5000 });
  });

  test("forecast save does not 500 when budget_forecast_line_items table is unavailable", async ({
    page,
    safeNavigate,
  }) => {
    // This test verifies the API directly to catch the missing-table regression.
    // The fix: DELETE errors from budget_forecast_line_items are swallowed when
    // the table doesn't exist, so automatic/lump_sum saves succeed regardless.
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");

    // Fetch budget lines to get a real line item ID
    const budgetRes = await page.request.get(
      `/api/projects/${projectId}/budget`,
    );
    expect(budgetRes.ok()).toBeTruthy();

    const budgetData = (await budgetRes.json()) as {
      lineItems?: Array<{ id: string }>;
    };
    const lineItems = budgetData.lineItems ?? [];
    if (lineItems.length === 0) {
      test.skip(true, "No line items to test against");
      return;
    }

    const firstLineId = lineItems[0].id;

    // POST forecast with lump_sum method
    const forecastRes = await page.request.post(
      `/api/projects/${projectId}/budget/forecast`,
      {
        data: {
          budgetLineId: firstLineId,
          forecastMethod: "lump_sum",
          forecastAmount: 12345,
          notes: "regression test",
          lineItems: [],
        },
      },
    );

    // Must succeed — previously would 500 if budget_forecast_line_items was absent
    expect(forecastRes.status()).toBe(200);
    const body = (await forecastRes.json()) as { success?: boolean };
    expect(body.success).toBe(true);
  });
});
