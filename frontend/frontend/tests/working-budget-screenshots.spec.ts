import { test, expect } from "@playwright/test";

test.describe("Working Budget Screenshots", () => {
  test("Show current budget functionality", async ({ page }) => {
    // Go to the correct port where the server is running
    await page.goto("http://localhost:3003/34/budget");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5000); // Give more time for page to fully load

    // Screenshot 1: Budget page overview
    await page.screenshot({
      path: "frontend/tests/screenshots/budget-working-state.png",
      fullPage: true
    });
    console.log("✓ Budget page screenshot taken");

    // Look for and click Create button
    const createButton = page.locator('button:has-text("Create")').first();
    if (await createButton.isVisible({ timeout: 10000 })) {
      await createButton.click();
      await page.waitForTimeout(2000);

      // Screenshot 2: Create dropdown opened
      await page.screenshot({
        path: "frontend/tests/screenshots/budget-create-menu.png",
        fullPage: true
      });

      // Click Budget Line Item option
      const budgetLineOption = page.locator('text="Budget Line Item"');
      if (await budgetLineOption.isVisible({ timeout: 5000 })) {
        await budgetLineOption.click();
        await page.waitForTimeout(3000);

        // Screenshot 3: Budget Line Item form
        await page.screenshot({
          path: "frontend/tests/screenshots/budget-line-form.png",
          fullPage: true
        });
        console.log("✓ Budget line item form screenshot taken");

        // Try to submit without filling anything to show our validation
        const submitButton = page.locator('button:has-text("Create")').last();
        if (await submitButton.isVisible({ timeout: 5000 })) {
          await submitButton.click();
          await page.waitForTimeout(3000);

          // Screenshot 4: Our improved validation messages
          await page.screenshot({
            path: "frontend/tests/screenshots/budget-validation-working.png",
            fullPage: true
          });
          console.log("✓ Validation screenshot taken - showing our improvements!");
        }
      }
    }

    console.log("🎉 Budget functionality screenshots completed!");
  });
});