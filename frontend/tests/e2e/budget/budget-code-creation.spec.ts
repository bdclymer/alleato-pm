import { test, expect } from "../../fixtures/index";
import { createTestProject } from "../../helpers/bootstrap";

let projectId: number;

test.describe("Budget Code Creation Flow (Authenticated)", () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test("opens create budget code modal", async ({ page, safeNavigate }) => {
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

    const budgetCodeSelector = page
      .getByRole("combobox")
      .filter({ hasText: /select budget code/i })
      .first();
    await expect(budgetCodeSelector).toBeVisible({ timeout: 15000 });
    await budgetCodeSelector.click();

    const createNewOption = page.getByText(/create new budget code/i);
    await expect(createNewOption).toBeVisible({ timeout: 5000 });
    await createNewOption.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });
  });
});
