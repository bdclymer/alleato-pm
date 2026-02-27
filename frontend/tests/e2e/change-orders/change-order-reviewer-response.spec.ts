import { test, expect } from "@playwright/test";

test.describe("ChangeOrderReviewerResponse Component", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/test-change-order-reviewer");
  });

  test("should display approve and reject buttons for reviewer scenario", async ({
    page,
  }) => {
    // Default scenario is "reviewer"
    await expect(page.getByText("Reviewer Action Required")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approve", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reject", exact: true })
    ).toBeVisible();
  });

  test("should open approve dialog and show form fields", async ({ page }) => {
    // Click Approve button
    await page.getByRole("button", { name: "Approve", exact: true }).click();

    // Check dialog is open
    await expect(
      page.getByRole("heading", { name: "Approve Change Order", exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(/Confirm that you want to approve this change order/i)
    ).toBeVisible();

    // Check form fields exist
    await expect(page.getByLabel(/Approval Notes/i)).toBeVisible();
    await expect(page.getByLabel(/Schedule Impact/i)).toBeVisible();

    // Check action buttons
    await expect(
      page.getByRole("button", { name: "Cancel" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Approve Change Order/i })
    ).toBeVisible();
  });

  test("should open reject dialog and require rejection reason", async ({
    page,
  }) => {
    // Click Reject button
    await page.getByRole("button", { name: "Reject", exact: true }).click();

    // Check dialog is open
    await expect(
      page.getByRole("heading", { name: "Reject Change Order", exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(/Provide a reason for rejecting this change order/i)
    ).toBeVisible();

    // Check required field
    await expect(page.getByLabel(/Rejection Reason/i)).toBeVisible();
    await expect(page.getByText(/This field is required/i)).toBeVisible();

    // Check optional field
    await expect(page.getByLabel(/Additional Comments/i)).toBeVisible();

    // Reject button should be disabled without reason
    const rejectButton = page.getByRole("button", {
      name: /Reject Change Order/i,
    });
    await expect(rejectButton).toBeDisabled();
  });

  test("should enable reject button when reason is provided", async ({
    page,
  }) => {
    // Click Reject button
    await page.getByRole("button", { name: "Reject", exact: true }).click();

    // Initially disabled
    const rejectButton = page.getByRole("button", {
      name: /Reject Change Order/i,
    });
    await expect(rejectButton).toBeDisabled();

    // Fill rejection reason
    await page
      .getByLabel(/Rejection Reason/i)
      .fill("Cost exceeds budget limits");

    // Should be enabled now
    await expect(rejectButton).toBeEnabled();
  });

  test("should display info card for non-reviewer scenario", async ({
    page,
  }) => {
    // Switch to non-reviewer scenario
    await page
      .getByRole("button", { name: "Not Reviewer (View Only)" })
      .click();

    // Check info card is displayed
    await expect(page.getByText("Pending Reviewer Action")).toBeVisible();
    await expect(
      page.getByText(/This change order is awaiting review by Jane Doe/i)
    ).toBeVisible();

    // Approve/Reject buttons should not be visible
    await expect(
      page.getByRole("button", { name: "Approve", exact: true })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reject", exact: true })
    ).not.toBeVisible();
  });

  test("should display no action message for completed status", async ({
    page,
  }) => {
    // Switch to completed scenario
    await page
      .getByRole("button", { name: "Completed Status (No Action)" })
      .click();

    // Check info card is displayed
    await expect(page.getByText("No Action Required")).toBeVisible();
    await expect(
      page.getByText(/This change order has a status of "approved"/i)
    ).toBeVisible();

    // Approve/Reject buttons should not be visible
    await expect(
      page.getByRole("button", { name: "Approve", exact: true })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reject", exact: true })
    ).not.toBeVisible();
  });

  test("should be able to fill approval form fields", async ({ page }) => {
    // Click Approve button
    await page.getByRole("button", { name: "Approve", exact: true }).click();

    // Fill optional fields
    await page
      .getByLabel(/Approval Notes/i)
      .fill("Approved with minor adjustments");
    await page
      .getByLabel(/Schedule Impact/i)
      .fill("2 days extension required");

    // Verify fields are filled
    await expect(page.getByLabel(/Approval Notes/i)).toHaveValue(
      "Approved with minor adjustments"
    );
    await expect(page.getByLabel(/Schedule Impact/i)).toHaveValue(
      "2 days extension required"
    );

    // Approve button should be enabled (optional fields)
    await expect(
      page.getByRole("button", { name: /Approve Change Order/i })
    ).toBeEnabled();
  });

  test("should be able to fill rejection form fields", async ({ page }) => {
    // Click Reject button
    await page.getByRole("button", { name: "Reject", exact: true }).click();

    // Fill required field
    await page
      .getByLabel(/Rejection Reason/i)
      .fill("Insufficient justification provided");

    // Fill optional field
    await page
      .getByLabel(/Additional Comments/i)
      .fill("Please provide more detailed cost breakdown");

    // Verify fields are filled
    await expect(page.getByLabel(/Rejection Reason/i)).toHaveValue(
      "Insufficient justification provided"
    );
    await expect(page.getByLabel(/Additional Comments/i)).toHaveValue(
      "Please provide more detailed cost breakdown"
    );

    // Reject button should be enabled
    await expect(
      page.getByRole("button", { name: /Reject Change Order/i })
    ).toBeEnabled();
  });

  test("should close approve dialog on cancel", async ({ page }) => {
    // Open dialog
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Approve Change Order", exact: true })
    ).toBeVisible();

    // Click cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Dialog should be closed
    await expect(
      page.getByRole("heading", { name: "Approve Change Order", exact: true })
    ).not.toBeVisible();
  });

  test("should close reject dialog on cancel", async ({ page }) => {
    // Open dialog
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Reject Change Order", exact: true })
    ).toBeVisible();

    // Click cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Dialog should be closed
    await expect(
      page.getByRole("heading", { name: "Reject Change Order", exact: true })
    ).not.toBeVisible();
  });
});
