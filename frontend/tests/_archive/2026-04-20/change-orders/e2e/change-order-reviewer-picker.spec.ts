import { test, expect } from "@playwright/test";

/**
 * E2E tests for designated reviewer picker in change order creation form
 */

const TEST_PROJECT_ID = "1"; // Update based on your test data

async function selectFirstReviewerOption(page: import("@playwright/test").Page) {
  const userOptions = page.locator('[role="option"]').filter({
    hasNotText: "No reviewer selected",
  });
  const userCount = await userOptions.count();
  if (userCount === 0) {
    return false;
  }
  // Use keyboard navigation to avoid dropdown viewport clipping issues.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  return true;
}

test.describe("Change Order Reviewer Picker", () => {
  // Use authenticated state
  test.use({ storageState: "tests/.auth/user.json" });

  test.beforeEach(async ({ page }) => {
    // Navigate to change order creation page
    await page.goto(`http://localhost:3000/${TEST_PROJECT_ID}/change-orders/new`);

    // Wait for page to load
    await expect(page.locator("h1, h2").filter({ hasText: /new change order/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("should display designated reviewer select field", async ({ page }) => {
    // Scroll to the Workflow & Review section
    await page.locator('text="Workflow & Review"').scrollIntoViewIfNeeded();

    // Check that the reviewer field exists
    const reviewerField = page.getByTestId("change-order-reviewer");
    await expect(reviewerField).toBeVisible();

    // Check the label
    await expect(page.locator('label:has-text("Designated Reviewer")')).toBeVisible();
  });

  test("should load and display users in reviewer dropdown", async ({ page }) => {
    // Scroll to the reviewer field
    await page.locator('text="Workflow & Review"').scrollIntoViewIfNeeded();

    // Click the reviewer select trigger
    const reviewerSelect = page.getByTestId("change-order-reviewer");
    await reviewerSelect.click();

    // Wait for the dropdown to open and users to load
    await page.waitForTimeout(1000);

    // Check that at least one user option is visible (or "No users found" message)
    const hasUsers = await page.locator('[role="option"]').count();
    const noUsersMessage = page.locator('text="No users found"');

    if (hasUsers > 0) {
      // Verify that user options are displayed
      expect(hasUsers).toBeGreaterThan(0);

      // Verify the "No reviewer selected" option exists
      await expect(
        page.locator('[role="option"]:has-text("No reviewer selected")'),
      ).toBeVisible();
    } else {
      // If no users, should show the "No users found" message
      await expect(noUsersMessage).toBeVisible();
    }
  });

  test("should select a reviewer and display it in the trigger", async ({ page }) => {
    // Scroll to the reviewer field
    await page.locator('text="Workflow & Review"').scrollIntoViewIfNeeded();

    // Click the reviewer select trigger
    const reviewerSelect = page.getByTestId("change-order-reviewer");
    await reviewerSelect.click();

    // Wait for dropdown to load
    await page.waitForTimeout(1000);

    // Find all user options (excluding the "No reviewer selected" option)
    const selected = await selectFirstReviewerOption(page);
    if (selected) {

      // Wait for selection to complete
      await page.waitForTimeout(500);

      // Verify that the selected user is displayed in the trigger
      // The trigger should now show the user's name
      const triggerText = await reviewerSelect.textContent();
      expect(triggerText).not.toContain("Select a reviewer");
      expect(triggerText).not.toContain("Loading users");
    } else {
      // Skip test if no users are available
      test.skip();
    }
  });

  test("should clear reviewer selection", async ({ page }) => {
    // Scroll to the reviewer field
    await page.locator('text="Workflow & Review"').scrollIntoViewIfNeeded();

    // Click the reviewer select trigger
    const reviewerSelect = page.getByTestId("change-order-reviewer");
    await reviewerSelect.click();

    // Wait for dropdown to load
    await page.waitForTimeout(1000);

    // Find user options
    const selected = await selectFirstReviewerOption(page);
    if (selected) {
      await page.waitForTimeout(500);

      // Open the dropdown again
      await reviewerSelect.click();
      await page.waitForTimeout(500);

      // Click the "No reviewer selected" option to clear
      await page.keyboard.press("Home");
      await page.keyboard.press("Enter");

      // Wait for selection to clear
      await page.waitForTimeout(500);

      // Verify that the trigger shows the cleared state again
      const triggerText = await reviewerSelect.textContent();
      expect(triggerText).toContain("No reviewer selected");
    } else {
      // Skip test if no users are available
      test.skip();
    }
  });

  test("should display user details in dropdown options", async ({ page }) => {
    // Scroll to the reviewer field
    await page.locator('text="Workflow & Review"').scrollIntoViewIfNeeded();

    // Click the reviewer select trigger
    const reviewerSelect = page.getByTestId("change-order-reviewer");
    await reviewerSelect.click();

    // Wait for dropdown to load
    await page.waitForTimeout(1000);

    // Find user options
    const userOptions = page.locator('[role="option"]').filter({
      hasNotText: "No reviewer selected",
    }).filter({
      hasNotText: "No users found",
    });

    const userCount = await userOptions.count();

    if (userCount > 0) {
      // Check the first user option structure
      const firstOption = userOptions.first();

      // The option should contain user information
      // (name, email, or job title)
      const optionText = await firstOption.textContent();
      expect(optionText).toBeTruthy();
      expect(optionText!.length).toBeGreaterThan(0);

      // Each option should be visible and clickable
      await expect(firstOption).toBeVisible();
    } else {
      // Skip test if no users are available
      test.skip();
    }
  });

  test("should include reviewer in form submission", async ({ page }) => {
    // Fill out required fields
    await page.getByTestId("change-order-number").fill("CO-TEST-001");
    await page.getByTestId("change-order-title").fill("Test Change Order");

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

    // Scroll to reviewer field and select a reviewer
    await page.locator('text="Workflow & Review"').scrollIntoViewIfNeeded();
    const reviewerSelect = page.getByTestId("change-order-reviewer");
    await reviewerSelect.click();
    await page.waitForTimeout(1000);

    const selected = await selectFirstReviewerOption(page);
    if (selected) {
      await page.waitForTimeout(500);

      // Submit the form
      const submitButton = page.getByTestId("change-order-submit");
      await submitButton.click();

      // Wait for navigation or success message
      await page.waitForTimeout(2000);

      // Verify we're either on the detail page or see a success message
      // (The exact behavior depends on your implementation)
      const currentUrl = page.url();
      const isOnDetailPage = currentUrl.includes("/change-orders/") && !currentUrl.endsWith("/new");
      const hasSuccessToast = (await page.locator('[role="status"], .toast').count()) > 0;

      expect(isOnDetailPage || hasSuccessToast).toBeTruthy();
    } else {
      // Skip if no users available
      test.skip();
    }
  });
});
