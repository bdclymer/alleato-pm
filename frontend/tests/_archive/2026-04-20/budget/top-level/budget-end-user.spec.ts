import { test, expect } from "../fixtures/index";
import { createTestProject } from "../helpers/bootstrap";

let projectId: number;

test.describe("Budget System – End User Workflows", () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test("Project manager opens budget line item creation modal", async ({
    page,
    safeNavigate,
  }) => {
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

  test("Project manager navigates budget tabs", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");

    const tabsNav = page.getByRole("navigation", { name: /budget tabs/i });
    await expect(tabsNav).toBeVisible({ timeout: 15000 });

    const budgetDetails = page.getByRole("button", { name: /budget details/i });
    await budgetDetails.click();

    await expect(page.getByRole("button", { name: /budget details/i })).toBeVisible({
      timeout: 15000,
    });
  });
});
