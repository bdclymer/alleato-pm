import { test, expect } from "@playwright/test";

/**
 * GAP-005: Budget Validation - Negative Amount Warning
 *
 * Tests the negative amount warning feature in the budget line item form.
 * When a user enters a negative amount, a warning should appear but still allow submission.
 */

test.describe("Budget Line Item - Negative Amount Warning", () => {
  const TEST_PROJECT_ID = "31"; // Using the default test project

  test.beforeEach(async ({ page }) => {
    // Navigate to the budget page
    await page.goto(`http://localhost:3000/${TEST_PROJECT_ID}/budget`);
    await page.waitForLoadState("domcontentloaded");

    // Click "Add Line Item" button to open the form
    const createButton = page.getByRole("button", {
      name: /add line item/i,
    });
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Wait for the form dialog/modal to appear
    await page.waitForTimeout(1000); // Give modal time to open
  });

  test("should show warning when entering negative amount directly", async ({
    page,
  }) => {
    // Find the amount input field (first row)
    const amountInput = page.locator('input[placeholder="$0.00"]').first();

    // Enter a negative amount
    await amountInput.click();
    await amountInput.fill("-500");

    // Wait for the warning to appear
    const warningAlert = page.locator(
      'div[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).toBeVisible({ timeout: 2000 });

    // Verify the warning message
    await expect(warningAlert).toContainText(
      "Negative amounts are unusual. Please verify this is intentional before saving.",
    );

    // Verify the AlertTriangle icon is present
    const warningIcon = warningAlert.locator("svg");
    await expect(warningIcon).toBeVisible();

    // Verify the alert has warning styling (amber colors)
    const alertClasses = await warningAlert.getAttribute("class");
    expect(alertClasses).toContain("bg-amber-50");
    expect(alertClasses).toContain("border-amber-200");
  });

  test("should show warning when negative amount results from qty × unit cost", async ({
    page,
  }) => {
    // Fill in qty and unit cost to produce negative amount
    const qtyInput = page.locator('input[placeholder="Quantity"]').first();
    const unitCostInput = page.locator('input[placeholder="Unit cost"]').first();

    await qtyInput.click();
    await qtyInput.fill("10");

    await unitCostInput.click();
    await unitCostInput.fill("-50");

    // The amount should auto-calculate to -500
    const amountInput = page.locator('input[placeholder="$0.00"]').first();
    await expect(amountInput).toHaveValue("-500.00");

    // Warning should appear
    const warningAlert = page.locator(
      'div[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).toBeVisible({ timeout: 2000 });
  });

  test("should hide warning when changing negative amount to positive", async ({
    page,
  }) => {
    const amountInput = page.locator('input[placeholder="$0.00"]').first();

    // First enter negative amount
    await amountInput.click();
    await amountInput.fill("-500");

    // Verify warning appears
    const warningAlert = page.locator(
      'div[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).toBeVisible({ timeout: 2000 });

    // Change to positive amount
    await amountInput.click();
    await amountInput.fill("500");

    // Warning should disappear
    await expect(warningAlert).not.toBeVisible({ timeout: 2000 });
  });

  test("should NOT show warning for zero amount", async ({ page }) => {
    const amountInput = page.locator('input[placeholder="$0.00"]').first();

    await amountInput.click();
    await amountInput.fill("0");

    // Warning should NOT appear for zero
    const warningAlert = page.locator(
      'div[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).not.toBeVisible();
  });

  test("should NOT show warning for positive amount", async ({ page }) => {
    const amountInput = page.locator('input[placeholder="$0.00"]').first();

    await amountInput.click();
    await amountInput.fill("1000");

    // Warning should NOT appear for positive amount
    const warningAlert = page.locator(
      'div[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).not.toBeVisible();
  });

  test("should still allow form submission with negative amount (warning, not error)", async ({
    page,
  }) => {
    // Select a budget code (required for submission)
    const budgetCodeButton = page
      .getByRole("button", { name: /select budget code/i })
      .first();
    await budgetCodeButton.click();

    // Select the first budget code from the dropdown
    const firstBudgetCode = page
      .getByRole("option")
      .first();
    await expect(firstBudgetCode).toBeVisible({ timeout: 3000 });
    await firstBudgetCode.click();

    // Enter a negative amount
    const amountInput = page.locator('input[placeholder="$0.00"]').first();
    await amountInput.click();
    await amountInput.fill("-500");

    // Verify warning appears
    const warningAlert = page.locator(
      'div[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).toBeVisible({ timeout: 2000 });

    // Verify the submit button is NOT disabled
    const submitButton = page.getByRole("button", {
      name: /create 1 line item/i,
    });
    await expect(submitButton).toBeEnabled();

    // Note: We're not actually submitting because we don't want to pollute the test database
    // The fact that the button is enabled proves the warning doesn't block submission
  });

  test("should show warning for multiple rows with negative amounts", async ({
    page,
  }) => {
    // Add a second row
    const addRowButton = page.getByRole("button", { name: /add row/i });
    await addRowButton.click();

    // Enter negative amounts in both rows
    const amountInputs = page.locator('input[placeholder="$0.00"]');

    await amountInputs.nth(0).click();
    await amountInputs.nth(0).fill("-100");

    await amountInputs.nth(1).click();
    await amountInputs.nth(1).fill("-200");

    // Both warnings should appear
    const warnings = page.locator(
      'div[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warnings).toHaveCount(2);
  });
});
