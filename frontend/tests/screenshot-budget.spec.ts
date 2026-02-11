import { test, expect } from './fixtures/index';
import { createTestProject } from './helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip("Budget Screenshots", () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test("Take budget page screenshots", async ({ page }) => {
    // Go to budget page
    await page.goto("http://localhost:3000/34/budget");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Screenshot 1: Budget page overview
    await page.screenshot({
      path: "frontend/tests/screenshots/budget-current-state.png",
      fullPage: true
    });
    console.log("✓ Budget page screenshot taken");

    // Click Create button
    const createButton = page.getByRole("button", { name: /create/i }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // Screenshot 2: Create dropdown
      await page.screenshot({
        path: "frontend/tests/screenshots/budget-create-dropdown.png",
        fullPage: true
      });

      // Click Budget Line Item
      const budgetLineOption = page.getByRole("menuitem", { name: "Budget Line Item" });
      if (await budgetLineOption.isVisible({ timeout: 3000 })) {
        await budgetLineOption.click();
        await page.waitForTimeout(2000);

        // Screenshot 3: Budget Line Item modal
        await page.screenshot({
          path: "frontend/tests/screenshots/budget-line-item-modal.png",
          fullPage: true
        });
        console.log("✓ Budget line item modal screenshot taken");

        // Try to submit empty form
        const submitButton = page.getByRole("button", { name: /Create.*Line item/i });
        if (await submitButton.isVisible({ timeout: 3000 })) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          // Screenshot 4: Validation errors
          await page.screenshot({
            path: "frontend/tests/screenshots/budget-validation-errors.png",
            fullPage: true
          });
          console.log("✓ Validation errors screenshot taken");
        }
      }
    }

    console.log("🎉 All budget screenshots completed!");
  });
});
