import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/index";
import { createTestProject } from "../../helpers/bootstrap";

let projectId: number;
let budgetCodes: Array<Record<string, unknown>> = [];

/**
 * Chooses a seeded budget code that already has a cost type so the create sheet can submit.
 */
function getSelectableBudgetCodeLabel(): string {
  const match = budgetCodes.find((code) => {
    const costTypeId =
      code.costTypeId ??
      code.cost_type_id ??
      code.costType ??
      code.cost_type;

    const fullLabel =
      code.fullLabel ??
      code.full_label ??
      code.label ??
      code.code;

    return Boolean(costTypeId) && typeof fullLabel === "string" && fullLabel.length > 0;
  });

  if (!match) {
    throw new Error("Bootstrap did not return a selectable budget code with a cost type.");
  }

  return String(
    match.fullLabel ?? match.full_label ?? match.label ?? match.code,
  );
}

/**
 * Opens the active create sheet used by the budget page.
 */
async function openBudgetCreateSheet(page: Page) {
  const createButton = page.getByRole("button", { name: /create/i }).first();
  await expect(createButton).toBeVisible({ timeout: 15000 });
  await createButton.click();

  const budgetLineItemOption = page.getByRole("menuitem", {
    name: /budget line item/i,
  });
  await expect(budgetLineItemOption).toBeVisible({ timeout: 5000 });
  await budgetLineItemOption.click();

  await expect(page.getByText(/Add Budget Line Items/i)).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Fills the minimum fields required for a single-row budget line item submission.
 */
async function fillBudgetCreateRow(page: Page, budgetCodeLabel: string) {
  const budgetCodeTrigger = page
    .locator('button[role="combobox"]')
    .filter({ hasText: /select budget code/i })
    .first();

  await expect(budgetCodeTrigger).toBeVisible({ timeout: 10000 });
  await budgetCodeTrigger.click();

  const searchInput = page.getByPlaceholder(/search budget codes/i);
  await expect(searchInput).toBeVisible({ timeout: 5000 });
  await searchInput.fill(budgetCodeLabel);

  const matchingCode = page.locator("[cmdk-item]").filter({ hasText: budgetCodeLabel }).first();
  await expect(matchingCode).toBeVisible({ timeout: 10000 });
  await matchingCode.click();

  const amountInput = page.getByLabel(/^Amount$/i).first();
  await expect(amountInput).toBeVisible({ timeout: 5000 });
  await amountInput.fill("50000");
}

/**
 * Opens the original budget edit sidebar from the first editable value cell.
 */
async function openOriginalBudgetSidebar(page: Page) {
  const editableCell = page.locator('button[aria-label^="Edit $"]').first();
  await expect(editableCell).toBeVisible({ timeout: 15000 });
  await editableCell.click();

  await expect(page.getByText(/^Original Budget Amount$/i)).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Budget Line Item Failure Messaging", () => {
  test.beforeEach(async ({ page, authenticatedRequest, safeNavigate }) => {
    const project = await createTestProject(
      page,
      { template: "commercial" },
      authenticatedRequest,
    );
    projectId = project.project.id;
    budgetCodes = project.budgetCodes;

    await safeNavigate(`/${projectId}/budget`);
    await expect(page.getByRole("heading", { name: /budget/i }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("shows the server message when budget line item creation fails", async ({ page }) => {
    const createFailure = "Budget line items are locked by accounting sync.";

    await page.route(`**/api/projects/${projectId}/budget`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: createFailure,
        }),
      });
    });

    await openBudgetCreateSheet(page);
    await fillBudgetCreateRow(page, getSelectableBudgetCodeLabel());

    await page.getByRole("button", { name: /create 1 line item/i }).click();

    await expect(page.getByText(createFailure)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Add Budget Line Items/i)).toBeVisible();
  });

  test("shows the server message and request id when budget updates fail", async ({ page }) => {
    const updateFailure = "Budget line update failed because the record is locked.";
    const requestId = "req_budget_update_123";

    await page.route(`**/api/projects/${projectId}/budget/lines/*`, async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error_message: updateFailure,
          request_id: requestId,
        }),
      });
    });

    await openOriginalBudgetSidebar(page);

    const originalBudgetInput = page.getByLabel(/original budget/i).first();
    await expect(originalBudgetInput).toBeVisible({ timeout: 5000 });
    await originalBudgetInput.fill("12345");

    const saveButton = page.getByRole("button", { name: /save changes/i });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();

    await expect(page.getByText(/Failed to update budget/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(updateFailure)).toBeVisible();
    await expect(page.getByText(`Request ID: ${requestId}`)).toBeVisible();
    await expect(page.getByText(/^Original Budget Amount$/i)).toBeVisible();
  });
});
