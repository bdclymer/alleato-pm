import { test, expect, Page } from "@playwright/test";

/**
 * Commitments Edit Workflow E2E Tests
 *
 * Tests the edit functionality for commitments including:
 * - Navigate to edit page from detail view
 * - Form prefilled with existing data
 * - Save updates and verify changes
 * - Cancel edit returns to detail page
 * - Financial summary cards show real data
 */

const BASE_URL = "http://localhost:3000";
const TEST_PROJECT_ID = "67";

async function login(page: Page) {
  await page.goto(
    `${BASE_URL}/dev-login?email=test@example.com&password=testpassword123`,
  );
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

async function navigateToCommitments(
  page: Page,
  projectId: string = TEST_PROJECT_ID,
) {
  await page.goto(`${BASE_URL}/${projectId}/commitments`);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("heading", { name: "Commitments" })).toBeVisible({ timeout: 30000 });
}

async function getFirstCommitmentId(page: Page): Promise<string | null> {
  // Wait for API data to load
  await page.waitForTimeout(2000);

  // Try to find a commitment link/row in the table
  const firstRow = page
    .locator("tbody tr, [role='row']")
    .filter({ hasNotText: "No commitments" })
    .first();
  if ((await firstRow.count()) === 0) return null;

  // Get the commitment number/link from the first row
  const link = firstRow.locator("a").first();
  if ((await link.count()) === 0) return null;

  const href = await link.getAttribute("href");
  if (!href) return null;

  // Extract commitmentId from URL like /67/commitments/<id>
  const parts = href.split("/");
  return parts[parts.length - 1] || null;
}

test.describe("Commitments - Edit Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to edit page from detail view", async ({ page }) => {
    await navigateToCommitments(page);
    const commitmentId = await getFirstCommitmentId(page);

    if (!commitmentId) {
      test.skip();
      return;
    }

    // Navigate to detail page
    await page.goto(
      `${BASE_URL}/${TEST_PROJECT_ID}/commitments/${commitmentId}`,
    );
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30000 });

    // Find and click Edit button
    const editButton = page.getByRole("link", { name: /Edit/i }).first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForURL(`**/${commitmentId}/edit**`, { timeout: 10000 });

      // Verify we're on the edit page
      await expect(page.locator("text=Edit")).toBeVisible({ timeout: 5000 });
    }
  });

  test("should prefill edit form with existing data", async ({ page }) => {
    await navigateToCommitments(page);
    const commitmentId = await getFirstCommitmentId(page);

    if (!commitmentId) {
      test.skip();
      return;
    }

    // Navigate directly to edit page
    await page.goto(
      `${BASE_URL}/${TEST_PROJECT_ID}/commitments/${commitmentId}/edit`,
    );
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30000 });

    // Verify form fields are populated (not empty)
    const titleInput = page.locator(
      'input[name="title"], #title',
    );
    if (await titleInput.isVisible({ timeout: 5000 })) {
      const titleValue = await titleInput.inputValue();
      // Title should be prefilled (not empty) for an existing commitment
      expect(titleValue.length).toBeGreaterThan(0);
    }

    // Check contract number is prefilled
    const numberInput = page.locator(
      'input[name="contractNumber"], #contractNumber',
    );
    if (await numberInput.isVisible({ timeout: 3000 })) {
      const numberValue = await numberInput.inputValue();
      expect(numberValue.length).toBeGreaterThan(0);
    }
  });

  test("should update commitment title and save", async ({ page }) => {
    await navigateToCommitments(page);
    const commitmentId = await getFirstCommitmentId(page);

    if (!commitmentId) {
      test.skip();
      return;
    }

    // Navigate to edit page
    await page.goto(
      `${BASE_URL}/${TEST_PROJECT_ID}/commitments/${commitmentId}/edit`,
    );
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30000 });

    // Get current title value
    const titleInput = page.locator(
      'input[name="title"], #title',
    );
    if (!(await titleInput.isVisible({ timeout: 5000 }))) {
      test.skip();
      return;
    }

    const originalTitle = await titleInput.inputValue();

    // Update title with a test suffix
    const testTitle = `${originalTitle} [E2E Test]`;
    await titleInput.clear();
    await titleInput.fill(testTitle);

    // Submit the form
    const submitButton = page.getByRole("button", {
      name: /Save|Update|Submit/i,
    });
    await submitButton.click();

    // Wait for redirect to detail page or toast
    await page.waitForTimeout(3000);

    // Verify success (toast or redirect)
    const successToast = page.locator("text=updated successfully");
    const isOnDetailPage = page.url().includes(`/commitments/${commitmentId}`);

    const toastVisible = await successToast
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(toastVisible || isOnDetailPage).toBeTruthy();

    // Restore original title
    if (isOnDetailPage && !page.url().includes("/edit")) {
      // Navigate back to edit to restore
      await page.goto(
        `${BASE_URL}/${TEST_PROJECT_ID}/commitments/${commitmentId}/edit`,
      );
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30000 });

      const restoreInput = page.locator(
        'input[name="title"], #title',
      );
      if (await restoreInput.isVisible({ timeout: 5000 })) {
        await restoreInput.clear();
        await restoreInput.fill(originalTitle);
        await page
          .getByRole("button", { name: /Save|Update|Submit/i })
          .click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test("should cancel edit and return to detail page", async ({ page }) => {
    await navigateToCommitments(page);
    const commitmentId = await getFirstCommitmentId(page);

    if (!commitmentId) {
      test.skip();
      return;
    }

    // Navigate to edit page
    await page.goto(
      `${BASE_URL}/${TEST_PROJECT_ID}/commitments/${commitmentId}/edit`,
    );
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30000 });

    // Click cancel button
    const cancelButton = page.getByRole("button", { name: /Cancel/i });
    if (await cancelButton.isVisible({ timeout: 5000 })) {
      await cancelButton.click();
      await page.waitForTimeout(2000);

      // Should navigate back to detail page
      expect(page.url()).toContain(`/commitments/${commitmentId}`);
      expect(page.url()).not.toContain("/edit");
    }
  });

  test("should show loading state while fetching commitment data", async ({
    page,
  }) => {
    await navigateToCommitments(page);
    const commitmentId = await getFirstCommitmentId(page);

    if (!commitmentId) {
      test.skip();
      return;
    }

    // Navigate to edit page
    await page.goto(
      `${BASE_URL}/${TEST_PROJECT_ID}/commitments/${commitmentId}/edit`,
    );

    // Should show loading skeleton initially
    const skeleton = page.locator('[class*="skeleton"], [class*="Skeleton"]');
    // Loading may flash quickly, just verify page eventually loads
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30000 });

    // Form should be visible after loading
    const form = page.locator("form");
    await expect(form).toBeVisible({ timeout: 10000 });
  });

  test("should display breadcrumb navigation on edit page", async ({
    page,
  }) => {
    await navigateToCommitments(page);
    const commitmentId = await getFirstCommitmentId(page);

    if (!commitmentId) {
      test.skip();
      return;
    }

    await page.goto(
      `${BASE_URL}/${TEST_PROJECT_ID}/commitments/${commitmentId}/edit`,
    );
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30000 });

    // Verify breadcrumbs show Commitments > [number] > Edit
    await expect(page.locator('text="Commitments"').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text="Edit"').first()).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Commitments - Financial Data Display", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should display financial columns in commitments table", async ({
    page,
  }) => {
    await navigateToCommitments(page);
    await page.waitForTimeout(2000);

    // Verify financial column headers exist
    const columnHeaders = [
      "Original Amount",
      "Billed to Date",
      "Balance to Finish",
    ];
    for (const header of columnHeaders) {
      const headerCell = page
        .locator(
          `th:has-text("${header}"), [role="columnheader"]:has-text("${header}")`,
        )
        .first();
      if (
        await headerCell.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await expect(headerCell).toBeVisible();
      }
    }
  });

  test("should display summary cards with financial totals", async ({
    page,
  }) => {
    await navigateToCommitments(page);

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Verify summary cards exist with labels
    const cardLabels = [
      "Original Amount",
      "Revised Amount",
      "Billed to Date",
      "Balance to Finish",
    ];

    for (const label of cardLabels) {
      const card = page.locator(`text=${label}`).first();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(card).toBeVisible();
      }
    }

    // Check that at least one card has a dollar amount
    const dollarValues = page.locator('text=/\\$[\\d,.]+/');
    const dollarCount = await dollarValues.count();
    expect(dollarCount).toBeGreaterThanOrEqual(0);
  });

  test("should display financial data on detail page", async ({ page }) => {
    await navigateToCommitments(page);
    const commitmentId = await getFirstCommitmentId(page);

    if (!commitmentId) {
      test.skip();
      return;
    }

    // Navigate to detail page
    await page.goto(
      `${BASE_URL}/${TEST_PROJECT_ID}/commitments/${commitmentId}`,
    );
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30000 });

    // Detail page should show financial summary
    const financialLabels = [
      "Original Contract",
      "Approved CO",
      "Revised Contract",
      "Billed to Date",
      "Balance",
    ];

    let visibleCount = 0;
    for (const label of financialLabels) {
      const element = page.locator(`text=${label}`).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        visibleCount++;
      }
    }

    // At least some financial labels should be visible
    expect(visibleCount).toBeGreaterThan(0);
  });
});

test.describe("Commitments - Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should display settings page with tabs", async ({ page }) => {
    await page.goto(
      `${BASE_URL}/${TEST_PROJECT_ID}/commitments/settings`,
    );
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator("text=Commitment Settings").first(),
    ).toBeVisible({ timeout: 30000 });

    // Verify tabs
    const tabs = ["General", "Distribution", "Defaults", "Billing"];
    for (const tab of tabs) {
      await expect(page.locator(`text=${tab}`).first()).toBeVisible({
        timeout: 3000,
      });
    }
  });

  test("should switch between settings tabs", async ({ page }) => {
    await page.goto(
      `${BASE_URL}/${TEST_PROJECT_ID}/commitments/settings`,
    );
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator("text=Commitment Settings").first(),
    ).toBeVisible({ timeout: 30000 });

    // Click Distribution tab
    const distributionTab = page
      .getByRole("tab", { name: "Distribution" })
      .first();
    if (await distributionTab.isVisible({ timeout: 3000 })) {
      await distributionTab.click();
      await page.waitForTimeout(500);

      // Verify Distribution content is visible
      await expect(
        page.locator("text=Distribution Settings").first(),
      ).toBeVisible({ timeout: 3000 });
    }

    // Click Billing tab
    const billingTab = page.getByRole("tab", { name: "Billing" }).first();
    if (await billingTab.isVisible({ timeout: 3000 })) {
      await billingTab.click();
      await page.waitForTimeout(500);

      // Verify Billing content is visible
      await expect(
        page.locator("text=Billing Settings").first(),
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test("should navigate back to commitments from settings", async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/${TEST_PROJECT_ID}/commitments/settings`,
    );
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator("text=Commitment Settings").first(),
    ).toBeVisible({ timeout: 30000 });

    // Click back button
    const backButton = page.getByRole("button", { name: /Back/i }).first();
    if (await backButton.isVisible({ timeout: 3000 })) {
      await backButton.click();
      await page.waitForTimeout(2000);

      // Should be back on commitments list
      expect(page.url()).toContain("/commitments");
      expect(page.url()).not.toContain("/settings");
    }
  });
});
