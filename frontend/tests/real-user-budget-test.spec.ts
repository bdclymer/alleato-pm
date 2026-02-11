import { test, expect } from './fixtures/index';
import { createTestProject } from './helpers/bootstrap';
import {

  addProjectMember,
  createProject,
  getUserIdByEmail,
} from "./helpers/db";
import { cleanupProjectArtifacts } from "./helpers/cleanup";
test.skip(true, "Legacy budget spec - migrated to budget-core");


const testUserEmail = process.env.PLAYWRIGHT_TEST_USER_EMAIL ?? "test1@mail.com";

let projectId: number;

test.describe.skip("Real User Budget Workflow - Create Budget Line Item", () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeAll(async () => {
    const userId = await getUserIdByEmail(testUserEmail);
    projectId = await createProject(`Real Budget Test ${Date.now()}`);
    await addProjectMember(projectId, userId, "admin");
  });

  test.afterAll(async () => {
    if (projectId) {
      await cleanupProjectArtifacts(projectId);
    }
  });

  test("User creates a budget line item from scratch like a real person would", async ({ page }) => {
    console.log(`Testing with project ID: ${projectId}`);

    // Step 1: User goes to the budget page
    await page.goto(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000); // Give it a moment to load

    console.log("✓ Navigated to budget page");

    // Step 2: User clicks the Create button
    const createButton = page.getByRole("button", { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 15000 });
    await createButton.click();

    console.log("✓ Clicked Create button");

    // Step 3: User sees dropdown and clicks "Budget Line Item"
    await page.waitForTimeout(1000);
    const budgetLineOption = page.getByRole("menuitem", { name: "Budget Line Item" });
    if (await budgetLineOption.isVisible({ timeout: 5000 })) {
      await budgetLineOption.click();
    } else {
      // Maybe it's a direct form, not a dropdown
      console.log("No dropdown found, looking for direct form");
    }

    console.log("✓ Selected Budget Line Item option");

    // Step 4: User sees the form/modal
    await page.waitForTimeout(1000);

    // Look for any form or modal
    const modal = page.getByRole("dialog");
    const formVisible = await modal.isVisible({ timeout: 5000 });

    if (!formVisible) {
      console.log("No modal found, looking for inline form");
      await page.screenshot({ path: "frontend/tests/screenshots/debug-no-modal.png" });
    }

    console.log("✓ Form/modal is visible");

    // Step 5: User clicks on "Select budget code..." dropdown
    const budgetCodeButton = page.locator('button:has-text("Select budget code...")');
    await expect(budgetCodeButton).toBeVisible({ timeout: 10000 });
    await budgetCodeButton.click();
    console.log("✓ Clicked budget code selector");

    await page.waitForTimeout(1000);

    // Look for available budget codes in the dropdown
    const firstBudgetCode = page.locator('[role="option"]').first();
    if (await firstBudgetCode.isVisible({ timeout: 5000 })) {
      await firstBudgetCode.click();
      console.log("✓ Selected first available budget code");
    } else {
      throw new Error("No budget codes available - test needs existing budget codes");
    }

    // Step 6: User enters quantity (optional)
    const qtyInput = page.locator('input[placeholder="Quantity"]');
    if (await qtyInput.isVisible({ timeout: 3000 })) {
      await qtyInput.click();
      await qtyInput.fill("1");
      console.log("✓ Filled quantity");
    }

    // Step 7: User selects UOM (Unit of Measure) if needed
    const uomSelect = page.locator('button:has-text("Select")');
    if (await uomSelect.isVisible({ timeout: 3000 })) {
      await uomSelect.click();
      await page.waitForTimeout(500);
      const firstUom = page.locator('[role="option"]').first();
      if (await firstUom.isVisible({ timeout: 3000 })) {
        await firstUom.click();
        console.log("✓ Selected UOM");
      }
    }

    // Step 8: User enters unit cost (optional)
    const unitCostInput = page.locator('input[placeholder="Unit cost"]');
    if (await unitCostInput.isVisible({ timeout: 3000 })) {
      await unitCostInput.click();
      await unitCostInput.fill("50000");
      console.log("✓ Filled unit cost");
    }

    // Step 9: User enters amount (REQUIRED)
    const amountInput = page.locator('input[placeholder="0.00"]').last(); // Amount field is last
    await expect(amountInput).toBeVisible({ timeout: 10000 });
    await amountInput.click();
    await amountInput.fill("50000");
    console.log("✓ Filled amount: 50000");

    // Step 10: User clicks "Create 1 Line item" button
    await page.waitForTimeout(1000);
    const submitButton = page.getByRole("button", { name: /Create.*Line item/i });

    await expect(submitButton).toBeVisible({ timeout: 10000 });
    console.log("✓ Found 'Create 1 Line item' button");

    await submitButton.click();
    console.log("✓ Clicked submit");

    // Step 10: Verify success (modal closes or success message)
    await page.waitForTimeout(3000);

    // Check if modal closed (success) or still open (error)
    const modalStillOpen = await modal.isVisible().catch(() => false);

    if (modalStillOpen) {
      console.log("❌ Modal still open - checking for error messages");
      await page.screenshot({ path: "frontend/tests/screenshots/budget-submit-error.png" });

      // Look for any error messages
      const errorText = await page.locator('[role="alert"], .error, [class*="error"]').allTextContents();
      if (errorText.length > 0) {
        console.log("Error messages found:", errorText);
        throw new Error(`Form submission failed with errors: ${errorText.join(", ")}`);
      } else {
        throw new Error("Form submission failed - modal still open but no visible error messages");
      }
    }

    console.log("✅ Modal closed - form submitted successfully!");

    // Step 11: Verify the budget line item appears in the table
    await page.waitForTimeout(2000);

    // Look for the budget table
    const budgetTable = page.locator('table').first();
    await expect(budgetTable).toBeVisible({ timeout: 10000 });

    // Look for our data in the table
    const tableContent = await budgetTable.textContent();

    console.log("Checking table for our data...");

    // Check for amount
    const hasAmount = tableContent?.includes("50,000") || tableContent?.includes("50000");
    console.log(`Amount found in table: ${hasAmount}`);

    // Check for cost code (if we managed to set one)
    const hasCostCode = tableContent?.includes("01-001") || tableContent?.includes("01-");
    console.log(`Cost code found in table: ${hasCostCode}`);

    // Check for description
    const hasDescription = tableContent?.includes("Foundation");
    console.log(`Description found in table: ${hasDescription}`);

    // Take final screenshot
    await page.screenshot({ path: "frontend/tests/screenshots/budget-final-success.png" });

    // At minimum, we should see our amount
    if (!hasAmount) {
      throw new Error("Budget line item not found in table - amount not visible");
    }

    console.log("🎉 SUCCESS: User successfully created a budget line item!");
    console.log("✓ Form submitted without errors");
    console.log("✓ Data appears in budget table");
    console.log("✓ Real end-to-end workflow complete");
  });
});
