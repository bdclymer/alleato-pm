import { test, expect } from "../fixtures/index";
import { createTestProject } from "../helpers/bootstrap";

let projectId: number;

const waitForBudgetTable = async (page: { waitForSelector: (selector: string, options?: { timeout?: number }) => Promise<void> }) => {
  await page.waitForSelector("table", { timeout: 15000 });
};

test.describe("Budget Core", () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test("loads budget page with seeded line items", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");
    await waitForBudgetTable(page);

    const tabsNav = page.getByRole("navigation", { name: /budget tabs/i });
    await expect(tabsNav).toBeVisible({ timeout: 15000 });

    const budgetTab = page.getByRole("button", { name: /^budget$/i }).first();
    await expect(budgetTab).toBeVisible({ timeout: 15000 });

    await expect(page.locator("table tbody tr").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("opens the budget line item creation modal", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");

    const createButton = page.getByRole("button", { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 15000 });
    await createButton.click();

    const budgetLineItemOption = page.getByRole("menuitem", {
      name: /budget line item/i,
    });
    await expect(budgetLineItemOption).toBeVisible({ timeout: 5000 });
    await budgetLineItemOption.click();

    const modalTitle = page
      .getByText(/Add Budget Line Items|Create Budget Line Items/i)
      .first();
    await expect(modalTitle).toBeVisible({ timeout: 15000 });
  });

  test("opens budget column detail modal", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");
    await waitForBudgetTable(page);

    const cell = page.locator('button[aria-label^="Edit $"]').first();
    await expect(cell).toBeVisible({ timeout: 15000 });
    await cell.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });

    const closeButton = page.getByRole("button", { name: /close/i }).first();
    await closeButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
  });
});
