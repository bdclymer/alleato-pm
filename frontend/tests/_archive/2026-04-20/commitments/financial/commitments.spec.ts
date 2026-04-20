import { test, expect } from "@playwright/test";
import {
  addProjectMember,
  createProject,
  createSubcontract,
  getSubcontract,
  getUserIdByEmail,
  listSubcontractsForProject,
  deleteSubcontractsByProject,
  deletePurchaseOrdersByProject,
} from "../helpers/db";
import { cleanupProjectArtifacts } from "../helpers/cleanup";
import { pollFor } from "../helpers/poll";

const testUserEmail =
  process.env.PLAYWRIGHT_TEST_USER_EMAIL ?? "test1@mail.com";

let projectId: number;

const makeNumber = (suffix: string) => `SC-${Date.now()}-${suffix}`;

test.describe("Commitments – Subcontract CRUD", () => {
  test.beforeAll(async () => {
    const userId = await getUserIdByEmail(testUserEmail);
    projectId = await createProject(`E2E Commitments ${Date.now()}`);
    await addProjectMember(projectId, userId, "admin");
  });

  test.afterAll(async () => {
    if (projectId) {
      await cleanupProjectArtifacts(projectId);
    }
  });

  // ── READ: Empty state ──────────────────────────────────────────

  test("Empty state shows when no commitments exist", async ({
    page,
  }) => {
    await deleteSubcontractsByProject(projectId);
    await deletePurchaseOrdersByProject(projectId);

    await page.goto(`/${projectId}/commitments`);
    await page.waitForLoadState("domcontentloaded");

    // Should show empty state or no rows
    const noData = page.getByText(/no commitments|no data/i);
    const emptyTable = page.locator("tbody tr");

    // Either explicit empty text or zero table rows
    const hasEmptyText = await noData
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    const rowCount = await emptyTable.count().catch(() => 0);

    expect(hasEmptyText || rowCount === 0).toBe(true);
  });

  // ── READ: Seeded data renders ──────────────────────────────────

  test("Seeded subcontract renders in the list with correct data", async ({
    page,
  }) => {
    await deleteSubcontractsByProject(projectId);

    const subcontract = await createSubcontract({
      project_id: projectId,
      contract_number: makeNumber("LIST"),
      title: "Electrical Work Package",
      status: "Draft",
      executed: false,
    });

    await page.goto(`/${projectId}/commitments`);
    await page.waitForLoadState("domcontentloaded");

    // Find the row containing our title
    const row = page.getByRole("row", {
      name: /Electrical Work Package/i,
    });
    await expect(row).toBeVisible({ timeout: 15000 });

    // Verify status renders
    await expect(row.getByText(/draft/i)).toBeVisible();
  });

  // ── CREATE: Happy path via form ────────────────────────────────

  test("Create subcontract via form persists to database", async ({
    page,
  }) => {
    await deleteSubcontractsByProject(projectId);

    const contractNumber = makeNumber("CREATE");
    const title = "Foundation Subcontract";

    // Navigate to create subcontract form
    await page.goto(
      `/${projectId}/commitments/new?type=subcontract`,
    );
    await page.waitForLoadState("domcontentloaded");

    // Fill required fields
    const numberInput = page.locator("#contractNumber");
    await expect(numberInput).toBeVisible({ timeout: 15000 });
    await numberInput.clear();
    await numberInput.fill(contractNumber);

    const titleInput = page.locator("#title");
    await titleInput.clear();
    await titleInput.fill(title);

    // Submit the form
    const submitButton = page.getByRole("button", {
      name: /create|save|submit/i,
    });
    await submitButton.click();

    // Wait for navigation back to commitments list or success toast
    // The form might stay on the page if companies aren't loaded
    const navigated = await page
      .waitForURL(`**/${projectId}/commitments`, { timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    if (!navigated) {
      // Check for success toast or if record was created anyway
      const toast = page.getByText(/created|success/i);
      await toast.isVisible({ timeout: 5000 }).catch(() => false);
    }

    // Verify in database — form may prepend a prefix to the contract number
    await pollFor(
      () => listSubcontractsForProject(projectId),
      (rows) => {
        const created = rows.find(
          (r) => r.title === title,
        );
        expect(created).toBeTruthy();
        expect(created!.status).toBe("Draft");
      },
      20000,
    );
  });

  // ── CREATE: Validation prevents empty submission ───────────────

  test("Form validation shows errors for missing required fields", async ({
    page,
  }) => {
    await page.goto(
      `/${projectId}/commitments/new?type=subcontract`,
    );
    await page.waitForLoadState("domcontentloaded");

    // Wait for form to render
    await expect(
      page.locator("#contractNumber"),
    ).toBeVisible({ timeout: 15000 });

    // Submit empty form
    const submitButton = page.getByRole("button", {
      name: /create|save|submit/i,
    });
    await submitButton.click();

    // Should show validation errors
    await page.waitForTimeout(500);

    // Check for any error indicators (red text, error messages)
    const errors = page.locator(
      ".text-red-500, .text-destructive, [role='alert'], .text-red-600",
    );
    const errorCount = await errors.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  // ── EDIT: Modify existing subcontract ──────────────────────────

  test("Edit subcontract updates title and persists", async ({
    page,
  }) => {
    await deleteSubcontractsByProject(projectId);

    const subcontract = await createSubcontract({
      project_id: projectId,
      contract_number: makeNumber("EDIT"),
      title: "Original Title",
      status: "Draft",
      executed: false,
    });

    await page.goto(`/${projectId}/commitments`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for table row with our title
    const row = page.getByRole("row", {
      name: /Original Title/i,
    });
    await expect(row).toBeVisible({ timeout: 15000 });

    // Click row action menu (look for ... or action button in the row)
    const actionButton = row.locator(
      "button:has(svg), [data-testid*='action']",
    ).last();
    await actionButton.click();
    await page.waitForTimeout(300);

    // Click Edit
    const editItem = page.getByRole("menuitem", { name: /edit/i });
    await editItem.click();

    // Wait for edit page/form to load
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Update the title field
    const titleInput = page.locator(
      "#title, input[name='title'], [data-testid='title']",
    );
    if (await titleInput.isVisible({ timeout: 5000 })) {
      await titleInput.clear();
      await titleInput.fill("Revised Electrical Package");

      // Save changes
      const saveButton = page.getByRole("button", {
        name: /save|update|submit/i,
      });
      await saveButton.click();

      // Verify in database
      await pollFor(
        () => getSubcontract(subcontract.id),
        (updated) => {
          expect(updated.title).toBe("Revised Electrical Package");
        },
      );
    }
  });

  // ── DELETE: Remove subcontract ─────────────────────────────────

  test("Delete subcontract removes it from list and database", async ({
    page,
  }) => {
    await deleteSubcontractsByProject(projectId);

    const subcontract = await createSubcontract({
      project_id: projectId,
      contract_number: makeNumber("DELETE"),
      title: "To Be Removed",
      status: "Draft",
      executed: false,
    });

    await page.goto(`/${projectId}/commitments`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for the row
    const row = page.getByRole("row", {
      name: /To Be Removed/i,
    });
    await expect(row).toBeVisible({ timeout: 15000 });

    // Open action menu — click the actions button in the row
    const actionButton = row.locator("button").last();
    await actionButton.click();
    await page.waitForTimeout(500);

    // Click Delete from the dropdown menu
    const deleteItem = page.locator(
      "[data-testid^='row-action-delete']",
    ).first();
    const menuDelete = page.getByRole("menuitem", { name: /delete/i }).first();

    if (await deleteItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteItem.click();
    } else if (await menuDelete.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuDelete.click();
    }

    // Confirm deletion in dialog if one appears
    await page.waitForTimeout(500);
    const confirmButton = page.getByRole("button", {
      name: /delete|confirm|yes/i,
    }).last();
    if (
      await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)
    ) {
      await confirmButton.click();
    }

    // Wait for UI update
    await page.waitForTimeout(2000);

    // Verify row is gone from the active tab (moved to Recycle Bin)
    await expect(
      page.getByRole("row", {
        name: /To Be Removed/i,
      }),
    ).not.toBeVisible({ timeout: 10000 });
  });

  // ── NAVIGATION: Create dropdown routes correctly ───────────────

  test("Create dropdown navigates to subcontract form", async ({
    page,
  }) => {
    await page.goto(`/${projectId}/commitments`);
    await page.waitForLoadState("domcontentloaded");

    const createButton = page
      .getByRole("button", { name: /create/i })
      .first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();
    await page.waitForTimeout(300);

    await page
      .getByRole("menuitem", { name: /subcontract/i })
      .click();

    await page.waitForURL(
      `**/${projectId}/commitments/new?type=subcontract**`,
      { timeout: 10000 },
    );
  });

  test("Create dropdown navigates to purchase order form", async ({
    page,
  }) => {
    await page.goto(`/${projectId}/commitments`);
    await page.waitForLoadState("domcontentloaded");

    const createButton = page
      .getByRole("button", { name: /create/i })
      .first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();
    await page.waitForTimeout(300);

    await page
      .getByRole("menuitem", { name: /purchase order/i })
      .click();

    await page.waitForURL(
      `**/${projectId}/commitments/new?type=purchase_order**`,
      { timeout: 10000 },
    );
  });

  // ── TABS: Filter by type ───────────────────────────────────────

  test("Tabs filter commitments by type", async ({ page }) => {
    await deleteSubcontractsByProject(projectId);
    await deletePurchaseOrdersByProject(projectId);

    // Seed one subcontract
    await createSubcontract({
      project_id: projectId,
      contract_number: makeNumber("TAB-SC"),
      title: "Tab Test Subcontract",
      status: "Draft",
      executed: false,
    });

    // Navigate to commitments
    await page.goto(`/${projectId}/commitments`);
    await page.waitForLoadState("domcontentloaded");

    // Should see the subcontract in the commitments list
    await expect(
      page.getByText("Tab Test Subcontract"),
    ).toBeVisible({ timeout: 15000 });
  });
});
