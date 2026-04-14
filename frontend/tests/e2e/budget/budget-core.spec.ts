import { test, expect } from "../../fixtures/index";
import { createTestProject } from "../../helpers/bootstrap";

let projectId: number;

/**
 * Waits for the main budget table so the page is ready for interaction.
 */
async function waitForBudgetTable(
  page: Parameters<typeof test>[0]["page"],
) {
  await page.waitForSelector("table", { timeout: 15000 });
}

test.describe("Budget Core", () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(
      page,
      { template: "commercial" },
      authenticatedRequest,
    );
    projectId = project.project.id;
  });

  test("loads budget page with seeded line items", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/budget`);
    await waitForBudgetTable(page);

    await expect(page.getByRole("button", { name: /^budget$/i }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("table tbody tr").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("opens the budget line item creation modal", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/budget`);

    const createButton = page.getByRole("button", { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 15000 });
    await createButton.click();

    const budgetLineItemOption = page.getByRole("menuitem", {
      name: /budget line item/i,
    });
    await expect(budgetLineItemOption).toBeVisible({ timeout: 5000 });
    await budgetLineItemOption.click();

    await expect(page.getByText(/Add Budget Line Items|Create Budget Line Items/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("opens budget column detail modal", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/budget`);
    await waitForBudgetTable(page);

    const cell = page.locator('button[aria-label^="Edit $"]').first();
    await expect(cell).toBeVisible({ timeout: 15000 });
    await cell.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });

    const closeButton = page.getByRole("button", { name: /close|cancel/i }).first();
    await closeButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
  });
});
