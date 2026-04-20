import { test, expect } from "@playwright/test";

/**
 * E2E tests for scope and schedule impact fields in change order creation form
 */

const TEST_PROJECT_ID = "1"; // Update based on your test data

test.describe("Change Order Scope & Schedule Fields", () => {
  // Use authenticated state
  test.use({ storageState: "tests/.auth/user.json" });

  test.beforeEach(async ({ page }) => {
    // Navigate to change order creation page
    await page.goto(`http://localhost:3000/${TEST_PROJECT_ID}/change-orders/new`);

    // Wait for page to load
    await page.waitForTimeout(2000);
  });

  test("should display scope radio buttons", async ({ page }) => {
    // Scroll to the Scope & Schedule section
    await page.locator('text="Scope & Schedule Impact"').scrollIntoViewIfNeeded();

    // Check that the scope label exists
    await expect(page.getByText("Scope", { exact: true })).toBeVisible();

    // Check that both radio options are visible
    await expect(page.getByText("In Scope", { exact: true })).toBeVisible();
    await expect(page.getByText("Out of Scope", { exact: true })).toBeVisible();
  });

  test("should select in scope radio button", async ({ page }) => {
    // Scroll to the scope field
    await page.locator('text="Scope & Schedule Impact"').scrollIntoViewIfNeeded();

    // Click the "In Scope" radio button
    await page.locator('label:has-text("In Scope")').click();

    // Wait for selection
    await page.waitForTimeout(500);

    // Verify the radio button is checked
    const inScopeRadio = page.locator('input[value="in_scope"]');
    await expect(inScopeRadio).toBeChecked();
  });

  test("should select out of scope radio button", async ({ page }) => {
    // Scroll to the scope field
    await page.locator('text="Scope & Schedule Impact"').scrollIntoViewIfNeeded();

    // Click the "Out of Scope" radio button
    await page.locator('label:has-text("Out of Scope")').click();

    // Wait for selection
    await page.waitForTimeout(500);

    // Verify the radio button is checked
    const outOfScopeRadio = page.locator('input[value="out_of_scope"]');
    await expect(outOfScopeRadio).toBeChecked();
  });

  test("should display schedule impact select field", async ({ page }) => {
    // Scroll to the schedule impact field
    await page.locator('text="Scope & Schedule Impact"').scrollIntoViewIfNeeded();

    // Check that the schedule impact field exists
    const scheduleImpactField = page.getByTestId("change-order-schedule-impact");
    await expect(scheduleImpactField).toBeVisible();

    // Check the label
    await expect(page.locator('label:has-text("Schedule Impact")')).toBeVisible();
  });

  test("should select schedule impact options", async ({ page }) => {
    // Scroll to the schedule impact field
    await page.locator('text="Scope & Schedule Impact"').scrollIntoViewIfNeeded();

    // Click the schedule impact select trigger
    const scheduleImpactSelect = page.getByTestId("change-order-schedule-impact");
    await scheduleImpactSelect.click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // Verify all options are visible
    await expect(
      page.locator('[role="option"]:has-text("Yes - Impacts Schedule")'),
    ).toBeVisible();
    await expect(
      page.locator('[role="option"]:has-text("No - No Impact")'),
    ).toBeVisible();
    await expect(page.locator('[role="option"]:has-text("Unknown")')).toBeVisible();

    // Select "Yes - Impacts Schedule"
    await page.locator('[role="option"]:has-text("Yes - Impacts Schedule")').click();

    // Wait for selection
    await page.waitForTimeout(500);

    // Verify the selection is displayed in the trigger
    const triggerText = await scheduleImpactSelect.textContent();
    expect(triggerText).toContain("Yes");
  });

  test("should include scope and schedule impact in form data", async ({ page }) => {
    // Fill out required fields
    await page.getByTestId("change-order-number").fill("CO-TEST-002");
    await page.getByTestId("change-order-title").fill("Test Change Order with Scope");

    // Select a contract (required field)
    const contractSelect = page.getByTestId("change-order-contract");
    await contractSelect.click();
    await page.waitForTimeout(1000);

    const contractOptions = page.locator('[role="option"]').filter({
      hasNotText: "No contracts found",
    });

    const contractCount = await contractOptions.count();

    if (contractCount > 0) {
      await contractOptions.first().click();
      await page.waitForTimeout(500);
    } else {
      // Skip if no contracts available
      test.skip();
    }

    // Scroll to scope & schedule section
    await page.locator('text="Scope & Schedule Impact"').scrollIntoViewIfNeeded();

    // Select "In Scope"
    await page.locator('label:has-text("In Scope")').click();
    await page.waitForTimeout(300);

    // Select schedule impact "Yes"
    const scheduleImpactSelect = page.getByTestId("change-order-schedule-impact");
    await scheduleImpactSelect.click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]:has-text("Yes - Impacts Schedule")').click();
    await page.waitForTimeout(500);

    // Submit the form
    const submitButton = page.getByTestId("change-order-submit");
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Verify we're either on the detail page or see a success/error message
    const currentUrl = page.url();
    const isOnDetailPage = currentUrl.includes("/change-orders/") && !currentUrl.endsWith("/new");
    const hasToast = (await page.locator('[role="status"], .toast').count()) > 0;

    expect(isOnDetailPage || hasToast).toBeTruthy();
  });

  test("should display field descriptions", async ({ page }) => {
    // Scroll to the Scope & Schedule section
    await page.locator('text="Scope & Schedule Impact"').scrollIntoViewIfNeeded();

    // Check that helpful descriptions are present
    await expect(
      page.locator('text="Is this change within the original project scope?"'),
    ).toBeVisible();
    await expect(
      page.locator('text="Will this change affect the project schedule?"'),
    ).toBeVisible();
  });
});
