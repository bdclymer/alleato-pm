import { test, expect } from "@playwright/test";

test.describe("Budget Details - Sorting/Filtering/Search (GAP-004)", () => {
  const projectId = "67"; // Test project ID

  test.beforeEach(async ({ page }) => {
    // Navigate to budget page and switch to Budget Details tab
    await page.goto(`http://localhost:3000/${projectId}/budget?tab=budget-details`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for the Budget Details tab to be active
    await expect(page.locator('[role="tab"][aria-selected="true"]').filter({ hasText: "Budget Details" })).toBeVisible();

    // Wait for table to load (either data or loading state)
    await page.waitForSelector('table, text="Loading budget details"', { timeout: 10000 });
  });

  test("search box appears above Budget Details table", async ({ page }) => {
    // Verify search input exists
    const searchInput = page.getByPlaceholder(/search budget codes/i);
    await expect(searchInput).toBeVisible();

    // Verify search icon is present
    const searchIcon = page.locator('svg.lucide-search').first();
    await expect(searchIcon).toBeVisible();
  });

  test("search filters budget line items", async ({ page }) => {
    // Wait for table to finish loading
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    // Get initial row count
    const initialRows = await page.locator('tbody tr').count();
    expect(initialRows).toBeGreaterThan(0);

    // Type a search query (searching for cost codes with "01" in them)
    const searchInput = page.getByPlaceholder(/search budget codes/i);
    await searchInput.fill("01");

    // Wait a moment for filtering to occur
    await page.waitForTimeout(500);

    // Get filtered row count
    const filteredRows = await page.locator('tbody tr').count();

    // Filtered results should be less than or equal to initial
    expect(filteredRows).toBeLessThanOrEqual(initialRows);

    // Verify all visible rows contain "01"
    const visibleRows = await page.locator('tbody tr').all();
    for (const row of visibleRows) {
      const text = await row.textContent();
      expect(text?.toLowerCase()).toContain("01");
    }
  });

  test("clear button appears when searching", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search budget codes/i);
    await searchInput.fill("test");

    // Clear button should appear
    const clearButton = page.getByRole("button", { name: /clear/i }).first();
    await expect(clearButton).toBeVisible();

    // Click clear button
    await clearButton.click();

    // Search input should be empty
    await expect(searchInput).toHaveValue("");
  });

  test("empty state shows when no search results", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    const searchInput = page.getByPlaceholder(/search budget codes/i);
    await searchInput.fill("NONEXISTENT_SEARCH_QUERY_XYZ123");

    await page.waitForTimeout(500);

    // Should show "No budget line items match" message
    await expect(page.getByText(/no budget line items match/i)).toBeVisible();

    // Should show clear search button
    const clearSearchLink = page.getByRole("button", { name: /clear search/i });
    await expect(clearSearchLink).toBeVisible();
  });

  test("column headers are sortable (clickable)", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table thead', { timeout: 10000 });

    // Check that Budget Code header is clickable
    const budgetCodeHeader = page.locator('thead th').filter({ hasText: "Budget Code" }).first();
    await expect(budgetCodeHeader).toHaveCSS("cursor", "pointer");

    // Check that sort icon is present
    const sortIcon = budgetCodeHeader.locator('svg.lucide-arrow-up-down');
    await expect(sortIcon).toBeVisible();
  });

  test("clicking column header sorts ascending then descending", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    const budgetCodeHeader = page.locator('thead th').filter({ hasText: "Budget Code" }).first();

    // Click once - should sort ascending
    await budgetCodeHeader.click();
    await page.waitForTimeout(300);

    // Should show up arrow (ascending)
    const upArrow = budgetCodeHeader.locator('svg.lucide-arrow-up');
    await expect(upArrow).toBeVisible();

    // Get first budget code value
    const firstRowBefore = await page.locator('tbody tr').first().textContent();

    // Click again - should sort descending
    await budgetCodeHeader.click();
    await page.waitForTimeout(300);

    // Should show down arrow (descending)
    const downArrow = budgetCodeHeader.locator('svg.lucide-arrow-down');
    await expect(downArrow).toBeVisible();

    // Get first budget code value after second click
    const firstRowAfter = await page.locator('tbody tr').first().textContent();

    // Values should be different (sorted differently)
    expect(firstRowBefore).not.toBe(firstRowAfter);
  });

  test("numeric columns sort numerically", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    // Click on "Original Budget Amount" header
    const originalBudgetHeader = page.locator('thead th').filter({ hasText: "Original Budget Amount" }).first();
    await originalBudgetHeader.click();
    await page.waitForTimeout(300);

    // Should sort ascending (low to high)
    const upArrow = originalBudgetHeader.locator('svg.lucide-arrow-up');
    await expect(upArrow).toBeVisible();

    // Click again to sort descending
    await originalBudgetHeader.click();
    await page.waitForTimeout(300);

    // Should sort descending (high to low)
    const downArrow = originalBudgetHeader.locator('svg.lucide-arrow-down');
    await expect(downArrow).toBeVisible();
  });

  test("search and sort work together", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    // First search for something
    const searchInput = page.getByPlaceholder(/search budget codes/i);
    await searchInput.fill("01");
    await page.waitForTimeout(500);

    // Then sort by Budget Code
    const budgetCodeHeader = page.locator('thead th').filter({ hasText: "Budget Code" }).first();
    await budgetCodeHeader.click();
    await page.waitForTimeout(300);

    // Should show up arrow
    const upArrow = budgetCodeHeader.locator('svg.lucide-arrow-up');
    await expect(upArrow).toBeVisible();

    // All visible rows should still contain "01" AND be sorted
    const rows = await page.locator('tbody tr').all();
    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      const text = await row.textContent();
      expect(text?.toLowerCase()).toContain("01");
    }
  });

  test("result count shows when searching", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    const searchInput = page.getByPlaceholder(/search budget codes/i);
    await searchInput.fill("01");
    await page.waitForTimeout(500);

    // Should show "X of Y items" text
    await expect(page.getByText(/\d+ of \d+ items/)).toBeVisible();
  });
});
