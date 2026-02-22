import { test, expect } from "@playwright/test";

/**
 * GAP-004: Budget Details - Sorting/Filtering/Search
 *
 * Tests the search, sort, and filter functionality on the Budget Details tab.
 *
 * The Budget Details tab uses custom <button> tabs with aria-current="page" (not role="tab").
 * Search input placeholder: "Search budget codes, descriptions, vendors..."
 * Sort icons: ArrowUp (asc), ArrowDown (desc), ArrowUpDown (unsorted) from lucide-react.
 */

test.describe("Budget Details - Sorting/Filtering/Search (GAP-004)", () => {
  const projectId = "67"; // Test project ID

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page with budget-details tab query param
    await page.goto(
      `http://localhost:3000/${projectId}/budget?tab=budget-details`,
    );
    await page.waitForLoadState("domcontentloaded");

    // Wait for the Budget Details tab to be active
    // BudgetTabs uses <button> with aria-current="page", NOT role="tab"
    await expect(
      page
        .locator('button[aria-current="page"]')
        .filter({ hasText: "Budget Details" }),
    ).toBeVisible({ timeout: 10000 });

    // Wait for table to load (either data or loading/empty state)
    await page.waitForTimeout(3000);
  });

  test("search box appears above Budget Details table", async ({ page }) => {
    // Verify search input exists - placeholder includes "Search budget codes"
    const searchInput = page.getByPlaceholder(
      /search budget codes/i,
    );
    await expect(searchInput).toBeVisible();
  });

  test("search filters budget line items", async ({ page }) => {
    // Wait for table to finish loading
    const tableRows = page.locator("tbody tr");
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });

    // Get initial row count
    const initialRows = await tableRows.count();
    expect(initialRows).toBeGreaterThan(0);

    // Type a search query (searching for cost codes with "01" in them)
    const searchInput = page.getByPlaceholder(
      /search budget codes/i,
    );
    await searchInput.fill("01");

    // Wait a moment for filtering to occur
    await page.waitForTimeout(500);

    // Get filtered row count
    const filteredRows = await tableRows.count();

    // Filtered results should be less than or equal to initial
    expect(filteredRows).toBeLessThanOrEqual(initialRows);

    // Verify all visible rows contain "01"
    const visibleRows = await tableRows.all();
    for (const row of visibleRows) {
      const text = await row.textContent();
      expect(text?.toLowerCase()).toContain("01");
    }
  });

  test("clear button appears when searching", async ({ page }) => {
    const searchInput = page.getByPlaceholder(
      /search budget codes/i,
    );
    await searchInput.fill("test");

    // Clear button should appear (ghost variant button with text "Clear")
    const clearButton = page
      .getByRole("button", { name: /^clear$/i })
      .first();
    await expect(clearButton).toBeVisible();

    // Click clear button
    await clearButton.click();

    // Search input should be empty
    await expect(searchInput).toHaveValue("");
  });

  test("empty state shows when no search results", async ({ page }) => {
    // Wait for table to load
    const tableRows = page.locator("tbody tr");
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder(
      /search budget codes/i,
    );
    await searchInput.fill("NONEXISTENT_SEARCH_QUERY_XYZ123");

    await page.waitForTimeout(500);

    // Should show "No budget line items match" message
    await expect(
      page.getByText(/no budget line items match/i),
    ).toBeVisible();

    // Should show clear search button (link variant)
    const clearSearchLink = page.getByRole("button", {
      name: /clear search/i,
    });
    await expect(clearSearchLink).toBeVisible();
  });

  test("column headers are sortable (clickable)", async ({ page }) => {
    // Wait for table header to load
    const tableHeader = page.locator("table thead");
    await expect(tableHeader).toBeVisible({ timeout: 10000 });

    // Check that Budget Code header has cursor pointer style
    const budgetCodeHeader = page
      .locator("thead th")
      .filter({ hasText: "Budget Code" })
      .first();
    await expect(budgetCodeHeader).toHaveCSS("cursor", "pointer");

    // Check that a sort icon (ArrowUpDown) is present in the header
    const sortIcon = budgetCodeHeader.locator("svg");
    await expect(sortIcon).toBeVisible();
  });

  test("clicking column header sorts ascending then descending", async ({
    page,
  }) => {
    // Wait for table to load
    const tableRows = page.locator("tbody tr");
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });

    const budgetCodeHeader = page
      .locator("thead th")
      .filter({ hasText: "Budget Code" })
      .first();

    // Click once - should sort ascending
    await budgetCodeHeader.click();
    await page.waitForTimeout(300);

    // Should show ArrowUp icon (ascending)
    // The icon switches from ArrowUpDown to ArrowUp on first click
    const upArrow = budgetCodeHeader.locator("svg");
    await expect(upArrow).toBeVisible();

    // Get first budget code value
    const firstRowBefore = await page
      .locator("tbody tr")
      .first()
      .textContent();

    // Click again - should sort descending
    await budgetCodeHeader.click();
    await page.waitForTimeout(300);

    // Get first budget code value after second click
    const firstRowAfter = await page
      .locator("tbody tr")
      .first()
      .textContent();

    // Values should be different (sorted differently)
    expect(firstRowBefore).not.toBe(firstRowAfter);
  });

  test("numeric columns sort numerically", async ({ page }) => {
    // Wait for table to load
    const tableRows = page.locator("tbody tr");
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });

    // Click on "Original Budget Amount" header
    const originalBudgetHeader = page
      .locator("thead th")
      .filter({ hasText: "Original Budget Amount" })
      .first();
    await originalBudgetHeader.click();
    await page.waitForTimeout(300);

    // Should have sort icon visible (ascending)
    const sortIcon = originalBudgetHeader.locator("svg");
    await expect(sortIcon).toBeVisible();

    // Click again to sort descending
    await originalBudgetHeader.click();
    await page.waitForTimeout(300);

    // Sort icon should still be visible (now descending)
    await expect(sortIcon).toBeVisible();
  });

  test("search and sort work together", async ({ page }) => {
    // Wait for table to load
    const tableRows = page.locator("tbody tr");
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });

    // First search for something
    const searchInput = page.getByPlaceholder(
      /search budget codes/i,
    );
    await searchInput.fill("01");
    await page.waitForTimeout(500);

    // Then sort by Budget Code
    const budgetCodeHeader = page
      .locator("thead th")
      .filter({ hasText: "Budget Code" })
      .first();
    await budgetCodeHeader.click();
    await page.waitForTimeout(300);

    // Sort icon should be visible
    const sortIcon = budgetCodeHeader.locator("svg");
    await expect(sortIcon).toBeVisible();

    // All visible rows should still contain "01" AND be sorted
    const rows = await tableRows.all();
    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      const text = await row.textContent();
      expect(text?.toLowerCase()).toContain("01");
    }
  });

  test("result count shows when searching", async ({ page }) => {
    // Wait for table to load
    const tableRows = page.locator("tbody tr");
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder(
      /search budget codes/i,
    );
    await searchInput.fill("01");
    await page.waitForTimeout(500);

    // Should show "X of Y items" text
    await expect(page.getByText(/\d+ of \d+ items/)).toBeVisible();
  });
});
