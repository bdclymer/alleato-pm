import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_PROJECT_ID = "31";
const TEST_SECTION_NUMBER = "99 99 99";
const TEST_TITLE = "Test Specification E2E";

test.describe("Specifications Feature", () => {
  let testSectionId: number | null = null;

  test.beforeAll(async () => {
    // Clean up any existing test specifications
    const { data } = await supabase
      .from("specification_sections")
      .select("id")
      .eq("project_id", parseInt(TEST_PROJECT_ID))
      .eq("section_number", TEST_SECTION_NUMBER);

    if (data && data.length > 0) {
      for (const spec of data) {
        await supabase
          .from("specification_sections")
          .delete()
          .eq("id", spec.id);
      }
    }
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testSectionId) {
      await supabase
        .from("specification_sections")
        .delete()
        .eq("id", testSectionId);
    }
  });

  test("should upload a new specification", async ({ page }) => {
    await page.goto(`/${TEST_PROJECT_ID}/specifications`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for page to load (use .first() to avoid strict mode violation)
    await expect(page.getByRole("heading", { name: "Specifications" }).first()).toBeVisible();

    // Click upload button
    await page.getByRole("button", { name: /upload specification/i }).click();

    // Wait for dialog to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upload Specification" })).toBeVisible();

    // Fill in section number
    await page.getByLabel(/section number/i).fill(TEST_SECTION_NUMBER);

    // Fill in title
    await page.getByLabel(/title/i).fill(TEST_TITLE);

    // Fill in description
    await page.getByLabel(/description/i).fill("E2E test specification description");

    // Upload file
    const fileInput = page.locator('input[type="file"][accept="application/pdf"]');
    await fileInput.setInputFiles({
      name: "test-spec.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test content"),
    });

    // Wait for file to be selected
    await expect(page.getByText("test-spec.pdf")).toBeVisible();

    // Submit form
    await page.getByRole("button", { name: /upload specification/i, exact: false }).last().click();

    // Wait for success toast
    await expect(
      page.getByText(/specification.*created.*successfully/i),
      "Success toast should appear after upload"
    ).toBeVisible({ timeout: 10000 });

    // Wait for dialog to close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });

    // Verify the specification appears in the table
    await expect(
      page.getByText(TEST_SECTION_NUMBER),
      "Section number should be visible in table"
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.getByText(TEST_TITLE),
      "Title should be visible in table"
    ).toBeVisible();

    // Store the section ID for cleanup
    const { data } = await supabase
      .from("specification_sections")
      .select("id")
      .eq("project_id", parseInt(TEST_PROJECT_ID))
      .eq("section_number", TEST_SECTION_NUMBER)
      .single();

    testSectionId = data?.id || null;
  });

  test("should filter specifications by search", async ({ page }) => {
    await page.goto(`/${TEST_PROJECT_ID}/specifications`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for table to load (use .first() to avoid strict mode violation)
    await expect(page.getByRole("heading", { name: "Specifications" }).first()).toBeVisible();

    // Search for the test specification
    const searchInput = page.getByPlaceholder(/search by section number or title/i);
    await searchInput.fill(TEST_SECTION_NUMBER);

    // Wait for search to filter results
    await page.waitForTimeout(500);

    // Should see the test specification
    await expect(page.getByText(TEST_TITLE)).toBeVisible();

    // Search for something that doesn't exist
    await searchInput.clear();
    await searchInput.fill("NONEXISTENT99999");
    await page.waitForTimeout(500);

    // Should not see the test specification
    await expect(page.getByText(TEST_TITLE)).not.toBeVisible();
  });

  test("should filter specifications by status", async ({ page }) => {
    await page.goto(`/${TEST_PROJECT_ID}/specifications`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for page to load
    await expect(page.getByRole("heading", { name: "Specifications" }).first()).toBeVisible();

    // Open status filter (target the combobox showing "All statuses", not the project selector)
    await page.locator('button[role="combobox"]').filter({ hasText: "All statuses" }).click();

    // Select "Active"
    await page.getByRole("option", { name: "Active" }).click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Should see active specifications (including our test)
    await expect(page.getByText(TEST_TITLE)).toBeVisible();

    // Switch to "Archived" (status trigger now shows "Active")
    await page.locator('button[role="combobox"]').filter({ hasText: "Active" }).click();
    await page.getByRole("option", { name: "Archived" }).click();
    await page.waitForTimeout(500);

    // Should not see our active test specification
    await expect(page.getByText(TEST_TITLE)).not.toBeVisible();
  });

  test("should view specification detail page", async ({ page }) => {
    await page.goto(`/${TEST_PROJECT_ID}/specifications`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for table to load (use .first() to avoid strict mode violation)
    await expect(page.getByRole("heading", { name: "Specifications" }).first()).toBeVisible();

    // Click on the test specification row
    await page.getByRole("row").filter({ hasText: TEST_TITLE }).click();

    // Wait for detail page to load
    await expect(
      page.getByRole("heading", { name: TEST_TITLE }),
      "Detail page heading should be visible"
    ).toBeVisible({ timeout: 5000 });

    // Verify detail page content
    await expect(page.getByText(TEST_SECTION_NUMBER)).toBeVisible();
    await expect(page.getByText("E2E test specification description")).toBeVisible();

    // Verify current revision section
    await expect(page.getByText(/current revision/i)).toBeVisible();
    await expect(page.getByText(/rev 1/i)).toBeVisible();

    // Verify revision history section
    await expect(page.getByRole("heading", { name: "Revision History" })).toBeVisible();
    await expect(page.getByText("test-spec.pdf")).toBeVisible();
  });

  test("should add a new revision", async ({ page }) => {
    if (!testSectionId) {
      test.skip(true, "Test section ID not available");
    }

    await page.goto(`/${TEST_PROJECT_ID}/specifications/${testSectionId}`);
    await page.waitForLoadState("domcontentloaded");

    // Click "Add Revision" button
    await page.getByRole("button", { name: /add revision/i }).click();

    // Wait for dialog to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add New Revision" })).toBeVisible();

    // Upload new file
    const fileInput = page.locator('input[type="file"][accept="application/pdf"]').last();
    await fileInput.setInputFiles({
      name: "test-spec-v2.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 revision 2 content"),
    });

    // Wait for file to be selected
    await expect(page.getByText("test-spec-v2.pdf")).toBeVisible();

    // Add revision notes
    await page.getByLabel(/revision notes/i).fill("E2E test revision");

    // Submit form
    await page.getByRole("button", { name: /add revision/i, exact: false }).last().click();

    // Wait for success toast
    await expect(
      page.getByText(/revision.*added.*successfully/i),
      "Success toast should appear"
    ).toBeVisible({ timeout: 10000 });

    // Wait for dialog to close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });

    // Verify new revision appears in history
    await expect(page.getByText(/rev 2/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("test-spec-v2.pdf")).toBeVisible();
    await expect(page.getByText("E2E test revision")).toBeVisible();
  });

  test("should edit specification metadata", async ({ page }) => {
    if (!testSectionId) {
      test.skip(true, "Test section ID not available");
    }

    await page.goto(`/${TEST_PROJECT_ID}/specifications/${testSectionId}`);
    await page.waitForLoadState("domcontentloaded");

    // Click edit button
    await page.getByRole("button", { name: /edit/i }).click();

    // Wait for edit dialog to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit Specification" })).toBeVisible();

    // Update title
    const titleInput = page.getByLabel(/title/i);
    await titleInput.clear();
    await titleInput.fill(TEST_TITLE + " (Updated)");

    // Update description
    const descInput = page.getByLabel(/description/i);
    await descInput.clear();
    await descInput.fill("Updated E2E test description");

    // Submit form
    await page.getByRole("button", { name: /save changes/i }).click();

    // Wait for success toast
    await expect(
      page.getByText(/specification.*updated.*successfully/i),
      "Success toast should appear"
    ).toBeVisible({ timeout: 10000 });

    // Wait for dialog to close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });

    // Verify updates are visible
    await expect(page.getByRole("heading", { name: TEST_TITLE + " (Updated)" })).toBeVisible();
    await expect(page.getByText("Updated E2E test description")).toBeVisible();
  });

  test("should delete a specification", async ({ page }) => {
    if (!testSectionId) {
      test.skip(true, "Test section ID not available");
    }

    await page.goto(`/${TEST_PROJECT_ID}/specifications`);
    await page.waitForLoadState("domcontentloaded");

    // Find the test specification row and open its menu
    const row = page.getByRole("row").filter({ hasText: TEST_TITLE });
    const menuButton = row.getByRole("button", { name: /open menu/i });
    await menuButton.click();

    // Click delete option
    await page.getByRole("menuitem", { name: /delete/i }).click();

    // Wait for confirmation dialog
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Are you sure?" })).toBeVisible();

    // Confirm deletion
    await page.getByRole("button", { name: /delete/i, exact: false }).last().click();

    // Wait for success toast
    await expect(
      page.getByText(/specification.*deleted.*successfully/i),
      "Success toast should appear"
    ).toBeVisible({ timeout: 10000 });

    // Wait for dialog to close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });

    // Verify specification is no longer in the table
    await expect(page.getByText(TEST_TITLE)).not.toBeVisible({ timeout: 5000 });

    // Clear testSectionId since it's been deleted
    testSectionId = null;
  });

  test("should validate required fields on upload", async ({ page }) => {
    await page.goto(`/${TEST_PROJECT_ID}/specifications`);
    await page.waitForLoadState("domcontentloaded");

    // Click upload button
    await page.getByRole("button", { name: /upload specification/i }).click();

    // Wait for dialog to open
    await expect(page.getByRole("dialog")).toBeVisible();

    // Submit button should be disabled when no file is selected
    const submitButton = page.getByRole("button", { name: /upload specification/i, exact: false }).last();
    await expect(submitButton).toBeDisabled();

    // Fill in section number and title but no file
    await page.getByLabel(/section number/i).fill("00 00 00");
    await page.getByLabel(/title/i).fill("Validation Test");

    // Submit button should still be disabled (no file)
    await expect(submitButton).toBeDisabled();

    // Dialog should still be visible (form was not submitted)
    await expect(page.getByRole("dialog")).toBeVisible();

    // Cancel the dialog
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
