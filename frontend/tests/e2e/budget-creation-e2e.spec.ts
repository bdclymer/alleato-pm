import fs from "fs";
import path from "path";
import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

const getBaseUrl = () =>
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.BASE_URL ||
  "http://localhost:3000";

const screenshotsDir = path.join("tests", "screenshots", "budget-creation-e2e");

const ensureScreenshotsDir = () => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

test.use({ video: "on" });

test.describe.skip("Budget creation workflow", () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test("creates a budget and validates commitments impact", async ({ page }) => {
    ensureScreenshotsDir();
    const baseUrl = getBaseUrl();

    await page.goto(
    );
    await page.waitForLoadState("networkidle");

    const bootstrapResponse = await page.request.post(
      `${baseUrl}/api/projects/bootstrap`,
      {
        data: {
          name: `Budget Creation E2E ${Date.now()}`,
        },
      },
    );
    expect(bootstrapResponse.ok()).toBeTruthy();
    const bootstrapData = (await bootstrapResponse.json()) as {
      project: { id: number };
    };
    const projectId = bootstrapData.project.id;

    await page.goto(`${baseUrl}/${projectId}/budget`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(screenshotsDir, "01-budget-page.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Create" }).click();
    await page.getByRole("menuitem", { name: "Budget Line Item" }).click();
    await expect(
      page.getByRole("heading", { name: "Create Budget Line Items" }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "02-line-item-modal.png"),
      fullPage: true,
    });

    await page
      .getByRole("button", { name: /Select budget code/i })
      .click();
    await page.getByText("Create New Budget Code").click();

    const createBudgetDialog = page.getByRole("dialog", {
      name: "Create New Budget Code",
    });
    await expect(createBudgetDialog).toBeVisible();

    const divisionButton = createBudgetDialog
      .getByRole("button")
      .filter({
        hasText:
          /General Requirements|Existing Conditions|Concrete|Masonry|Metals|Wood|Thermal|Openings|Finishes/i,
      })
      .first();
    await divisionButton.click();

    const costCodeButton = createBudgetDialog
      .getByRole("button")
      .filter({ hasText: / - / })
      .first();
    await costCodeButton.click();

    await createBudgetDialog.getByRole("combobox").click();
    await page.getByRole("option", { name: /L - Labor/i }).click();
    await createBudgetDialog
      .getByRole("button", { name: "Create Budget Code" })
      .click();

    await expect(
      page.getByText("Budget code created and added to form"),
    ).toBeVisible();

    await page.getByPlaceholder("0").first().fill("10");
    await page.getByRole("button", { name: /Select UOM/i }).click();
    await page.getByRole("option", { name: /EA - Each/i }).click();
    await page.getByPlaceholder("0.00").first().fill("100");
    await expect(page.getByPlaceholder("0.00").nth(1)).toHaveValue("1000.00");

    await page
      .getByRole("button", { name: /Create 1 Line Item/i })
      .click();
    await expect(page.getByText("Budget line items created")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotsDir, "03-line-item-created.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Lock Budget" }).click();
    const lockDialog = page.getByRole("alertdialog");
    await lockDialog.getByRole("button", { name: "Lock Budget" }).click();
    await expect(page.getByText("Locked")).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "04-budget-locked.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Create" }).click();
    await page.getByRole("menuitem", { name: "Budget Modification" }).click();
    await expect(
      page.getByRole("heading", { name: "Create Budget Modification" }),
    ).toBeVisible();

    await page.getByLabel("Title*").fill("Scope adjustment");
    await page.getByLabel("Description").fill("Adjust scope for added labor.");
    await page.getByLabel("Amount*").fill("500");
    await page.getByLabel("Reason").fill("Scope review update");

    await page
      .getByRole("button", { name: /Create Draft Modification/i })
      .click();
    await expect(
      page.getByText(/Budget modification .* created as draft/i),
    ).toBeVisible();

    await page.getByRole("button", { name: "Unlock Budget" }).click();
    const unlockDialog = page.getByRole("alertdialog");
    await unlockDialog.getByRole("button", { name: "Unlock Budget" }).click();
    await expect(page.getByText("Locked")).not.toBeVisible();

    const budgetCodesResponse = await page.request.get(
      `${baseUrl}/api/projects/${projectId}/budget-codes`,
    );
    expect(budgetCodesResponse.ok()).toBeTruthy();
    const budgetCodesData = (await budgetCodesResponse.json()) as {
      budgetCodes: { code: string }[];
    };
    const onBudgetCode = budgetCodesData.budgetCodes[0]?.code;
    expect(onBudgetCode).toBeTruthy();

    await page.goto(`${baseUrl}/${projectId}/commitments/new?type=purchase_order`);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Contract #").fill(`PO-${Date.now()}`);
    await page.getByLabel("Title").fill("Unbudgeted purchase order");
    await page.getByRole("button", { name: "Add Line" }).click();

    const unbudgetedCode = "27-000";
    await page.getByPlaceholder("Budget Code").fill(unbudgetedCode);
    await page.getByPlaceholder("Description").fill("Unbudgeted line item");
    await page.getByPlaceholder("0").first().fill("2");
    await page.getByRole("button", { name: "UOM" }).click();
    await page.getByRole("option", { name: /Each/i }).click();
    await page.getByPlaceholder("$0.00").fill("250");

    await expect(
      page.getByRole("alert").filter({ hasText: /not on the project budget/i }),
    ).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotsDir, "05-unbudgeted-warning.png"),
      fullPage: true,
    });

    await page
      .getByRole("button", { name: "Create Purchase Order" })
      .click();
    await page.waitForURL(`**/${projectId}/commitments`);

    await page.goto(`${baseUrl}/${projectId}/commitments/new?type=purchase_order`);
    await page.waitForLoadState("networkidle");

    const approvedAmount = 1000;
    await page.getByLabel("Contract #").fill(`PO-${Date.now()}-APP`);
    await page.getByLabel("Title").fill("Approved purchase order");
    await page.getByLabel("Status*").click();
    await page.getByRole("option", { name: "Approved" }).click();
    await page.getByRole("button", { name: "Add Line" }).click();
    await page.getByPlaceholder("Budget Code").fill(onBudgetCode as string);
    await page.getByPlaceholder("Description").fill("Approved line item");
    await page.getByPlaceholder("0").first().fill("5");
    await page.getByRole("button", { name: "UOM" }).click();
    await page.getByRole("option", { name: /Each/i }).click();
    await page.getByPlaceholder("$0.00").fill("200");

    await page
      .getByRole("button", { name: "Create Purchase Order" })
      .click();
    await page.waitForURL(`**/${projectId}/commitments`);

    await page.goto(`${baseUrl}/${projectId}/budget?tab=budget-details`);
    await page.waitForLoadState("networkidle");

    const expectedAmount = formatCurrency(approvedAmount);
    const committedRow = page
      .locator("tr")
      .filter({ hasText: onBudgetCode as string })
      .filter({ hasText: "Commitments" })
      .first();
    await expect(committedRow).toContainText(expectedAmount);

    await page.screenshot({
      path: path.join(screenshotsDir, "06-budget-details-commitment.png"),
      fullPage: true,
    });
  });
});
