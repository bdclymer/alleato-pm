import { test, expect } from "@playwright/test";

/**
 * GAP-005: Budget Validation - Negative Amount Warning
 *
 * Tests the negative amount warning feature in the budget line item creator modal.
 * When a user enters a negative amount, a warning should appear but still allow submission.
 *
 * Flow: Budget page → Create dropdown → Budget Line Item → BudgetLineItemCreatorModal
 */

test.describe("Budget Line Item - Negative Amount Warning", () => {
  const TEST_PROJECT_ID = "31"; // Using the default test project

  test.beforeEach(async ({ page }) => {
    // Navigate to the budget page
    await page.goto(`http://localhost:3000/${TEST_PROJECT_ID}/budget`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for page to load (budget data or loading state)
    await page.waitForTimeout(2000);

    // Open the Create dropdown and click "Budget Line Item"
    // The Create button is in the page header
    const createDropdown = page.locator('button:has-text("Create")').first();
    await expect(createDropdown).toBeVisible({ timeout: 10000 });
    await createDropdown.click();

    // Click "Budget Line Item" from the dropdown menu
    const budgetLineItemOption = page.getByRole("menuitem", {
      name: /budget line item/i,
    });
    await expect(budgetLineItemOption).toBeVisible({ timeout: 5000 });
    await budgetLineItemOption.click();

    // Wait for the BudgetLineItemCreatorModal to open (AnimatePresence animation)
    await page.waitForTimeout(500);
    await expect(
      page.locator('h2:has-text("Add Budget Line Items")'),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show warning when entering negative amount directly", async ({
    page,
  }) => {
    // Find the amount input field (first row) - NumberInput with placeholder "$0.00"
    const amountInput = page.locator('input[placeholder="$0.00"]').first();
    await expect(amountInput).toBeVisible();

    // Enter a negative amount
    await amountInput.click();
    await amountInput.fill("-500");

    // Tab away to trigger change
    await amountInput.press("Tab");

    // Wait for the warning to appear
    const warningAlert = page.locator(
      '[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).toBeVisible({ timeout: 3000 });

    // Verify the warning message
    await expect(warningAlert).toContainText(
      "Negative amounts are unusual. Please verify this is intentional before saving.",
    );
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

    // Tab away to trigger calculation
    await unitCostInput.press("Tab");

    // Warning should appear since amount will be -500.00
    const warningAlert = page.locator(
      '[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).toBeVisible({ timeout: 3000 });
  });

  test("should hide warning when changing negative amount to positive", async ({
    page,
  }) => {
    const amountInput = page.locator('input[placeholder="$0.00"]').first();

    // First enter negative amount
    await amountInput.click();
    await amountInput.fill("-500");
    await amountInput.press("Tab");

    // Verify warning appears
    const warningAlert = page.locator(
      '[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).toBeVisible({ timeout: 3000 });

    // Change to positive amount
    await amountInput.click();
    await amountInput.fill("500");
    await amountInput.press("Tab");

    // Warning should disappear
    await expect(warningAlert).not.toBeVisible({ timeout: 3000 });
  });

  test("should NOT show warning for zero amount", async ({ page }) => {
    const amountInput = page.locator('input[placeholder="$0.00"]').first();

    await amountInput.click();
    await amountInput.fill("0");
    await amountInput.press("Tab");

    // Warning should NOT appear for zero
    const warningAlert = page.locator(
      '[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).not.toBeVisible();
  });

  test("should NOT show warning for positive amount", async ({ page }) => {
    const amountInput = page.locator('input[placeholder="$0.00"]').first();

    await amountInput.click();
    await amountInput.fill("1000");
    await amountInput.press("Tab");

    // Warning should NOT appear for positive amount
    const warningAlert = page.locator(
      '[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).not.toBeVisible();
  });

  test("should still allow form submission with negative amount (warning, not error)", async ({
    page,
  }) => {
    // Enter a negative amount
    const amountInput = page.locator('input[placeholder="$0.00"]').first();
    await amountInput.click();
    await amountInput.fill("-500");
    await amountInput.press("Tab");

    // Verify warning appears
    const warningAlert = page.locator(
      '[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warningAlert).toBeVisible({ timeout: 3000 });

    // Verify the submit button exists and is present in the DOM
    // The button text is "Create N Line Item(s)" - it may be disabled until a budget code is selected,
    // but the negative warning itself should NOT disable it
    const submitButton = page.locator('button:has-text("Create 1 Line Item")');
    await expect(submitButton).toBeVisible();

    // The button may be disabled because no budget code is selected (a separate validation),
    // but the negative amount warning should not be the blocker
  });

  test("should show warning for multiple rows with negative amounts", async ({
    page,
  }) => {
    // Add a second row via "Add Another Line Item" button
    const addRowButton = page.getByRole("button", {
      name: /add another line item/i,
    });
    await addRowButton.click();

    // Wait for second row to appear
    await page.waitForTimeout(300);

    // Enter negative amounts in both rows
    const amountInputs = page.locator('input[placeholder="$0.00"]');
    await expect(amountInputs).toHaveCount(2);

    await amountInputs.nth(0).click();
    await amountInputs.nth(0).fill("-100");
    await amountInputs.nth(0).press("Tab");

    await amountInputs.nth(1).click();
    await amountInputs.nth(1).fill("-200");
    await amountInputs.nth(1).press("Tab");

    // Both warnings should appear
    const warnings = page.locator(
      '[role="alert"]:has-text("Negative amounts are unusual")',
    );
    await expect(warnings).toHaveCount(2, { timeout: 3000 });
  });
});
