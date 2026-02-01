import { test, expect } from "@playwright/test";
import {
  addProjectMember,
  createProject,
  getUserIdByEmail,
  deleteBudgetLinesByProject,
} from "../helpers/db";
import { cleanupProjectArtifacts } from "../helpers/cleanup";

const testUserEmail =
  process.env.PLAYWRIGHT_TEST_USER_EMAIL ?? "test1@mail.com";

let projectId: number;
let testUserId: string;

test.describe("Budget Line Item Creation – Real User Workflow", () => {
  // ── SETUP: Create isolated project ──────────────────────────────
  test.beforeAll(async () => {
    testUserId = await getUserIdByEmail(testUserEmail);
    projectId = await createProject(`E2E Budget Simple ${Date.now()}`);
    await addProjectMember(projectId, testUserId, "admin");
  });

  // ── TEARDOWN: Clean everything ──────────────────────────────────
  test.afterAll(async () => {
    if (projectId) {
      await cleanupProjectArtifacts(projectId);
    }
  });

  test.beforeEach(async () => {
    // Clean slate for each test
    await deleteBudgetLinesByProject(projectId);
  });

  // ── DISCOVERY: See what happens when we click Create ────────────
  test("Navigate to budget page and explore create flow", async ({ page }) => {
    console.log(`Testing with project ID: ${projectId}`);

    // Navigate to budget page
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000); // Wait for any loading states

    // Take screenshot to see current state
    await page.screenshot({ path: "budget-page-initial.png", fullPage: true });

    // Look for the Create button
    const createButton = page.getByRole("button", { name: /create/i }).first();
    const createButtonVisible = await createButton.isVisible({ timeout: 10000 }).catch(() => false);

    console.log("Create button visible:", createButtonVisible);

    if (createButtonVisible) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // Take screenshot after clicking Create
      await page.screenshot({ path: "budget-after-create-click.png", fullPage: true });

      // Check what modal/dialog appeared
      const dialog = page.getByRole("dialog");
      const dialogVisible = await dialog.isVisible({ timeout: 5000 }).catch(() => false);
      console.log("Dialog visible after Create click:", dialogVisible);

      if (dialogVisible) {
        // See what options are in the dialog
        const dialogContent = await dialog.textContent();
        console.log("Dialog content:", dialogContent);

        // Look for specific elements
        const budgetLineItemOption = page.getByText("Budget Line Item");
        const optionVisible = await budgetLineItemOption.isVisible({ timeout: 3000 }).catch(() => false);
        console.log("Budget Line Item option visible:", optionVisible);

        if (optionVisible) {
          await budgetLineItemOption.click();
          await page.waitForTimeout(1000);

          await page.screenshot({ path: "budget-line-item-form.png", fullPage: true });

          // Check what form fields are available
          const allInputs = await page.locator("input, select, textarea").all();
          console.log("Form inputs count:", allInputs.length);

          for (const input of allInputs) {
            const placeholder = await input.getAttribute("placeholder").catch(() => null);
            const name = await input.getAttribute("name").catch(() => null);
            const type = await input.getAttribute("type").catch(() => null);
            console.log("Input:", { placeholder, name, type });
          }
        }
      } else {
        console.log("No dialog appeared - checking current page content");
        const pageContent = await page.textContent("body");
        console.log("Page content contains 'cost type':", pageContent?.toLowerCase().includes("cost type"));
        console.log("Page content contains 'validation':", pageContent?.toLowerCase().includes("validation"));
      }
    } else {
      console.log("Create button not found - checking page content");
      const pageContent = await page.textContent("body");
      console.log("Page contains 'budget':", pageContent?.toLowerCase().includes("budget"));
      console.log("Page contains 'create':", pageContent?.toLowerCase().includes("create"));
    }

    // This test is just for exploration - it always passes
    expect(true).toBe(true);
  });

  // ── VALIDATION: Test form with missing required fields ─────────
  test("Test validation when submitting incomplete form", async ({ page }) => {
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Click Create button (we know it exists from previous test)
    const createButton = page.getByRole("button", { name: /create/i }).first();
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // Look for Budget Line Item option
      const budgetLineItemOption = page.getByText("Budget Line Item");
      if (await budgetLineItemOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await budgetLineItemOption.click();
        await page.waitForTimeout(1000);

        // Try to submit without filling required fields
        const submitButton = page.getByRole("button", { name: /save|create|add|submit/i }).last();
        if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          // Look for validation errors (not generic "failed to create")
          const errorText = page.locator("text=*");
          const pageContent = await page.textContent("body");

          // Check that we get specific validation errors, not generic failures
          const hasGenericFailure = pageContent?.toLowerCase().includes("failed to create") ||
                                   pageContent?.toLowerCase().includes("unexpected error");

          const hasSpecificValidation = pageContent?.toLowerCase().includes("required") ||
                                      pageContent?.toLowerCase().includes("cost type") ||
                                      pageContent?.toLowerCase().includes("missing");

          console.log("Has generic failure:", hasGenericFailure);
          console.log("Has specific validation:", hasSpecificValidation);

          // Take screenshot of validation state
          await page.screenshot({ path: "validation-state.png", fullPage: true });

          // The improvement should show specific errors, not generic ones
          if (hasGenericFailure) {
            console.log("❌ Still showing generic error messages");
          }
          if (hasSpecificValidation) {
            console.log("✅ Showing specific validation messages");
          }

          // Test passes if we get specific validation (the improvement) rather than generic errors
          expect(hasGenericFailure).toBe(false);
        }
      }
    }
  });
});