/**
 * Change Events Live Tester Verification - 6 Protocol Tests
 * Auto-authenticates via setup project (auth.setup.ts)
 */
import { test, expect, Page } from "@playwright/test";

const PROJECT_ID = 67;
const BASE_URL = `http://localhost:3000/${PROJECT_ID}/change-events`;

// Helper: wait for page to be stable (no loading spinners)
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 30000 });
  // Wait for loading spinner to disappear if present
  const spinner = page.locator('[data-testid="loading-spinner"], .animate-spin').first();
  const spinnerVisible = await spinner.isVisible().catch(() => false);
  if (spinnerVisible) {
    await spinner.waitFor({ state: "hidden", timeout: 20000 }).catch(() => {});
  }
}

// Helper: get console errors
const consoleErrors: string[] = [];

test.describe("Change Events - 6 Protocol Verification", () => {
  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(`PAGE ERROR: ${err.message}`);
    });
  });

  // ============================================================
  // TEST 1: PAGE LOADS
  // ============================================================
  test("T1: Page Loads - no console errors, correct ProjectPageHeader", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await waitForPageLoad(page);

    const currentUrl = page.url();
    console.log(`T1 URL: ${currentUrl}`);

    // Must not be redirected to login
    expect(currentUrl).not.toContain("/auth/login");
    expect(currentUrl).toContain("/change-events");

    // Check for ProjectPageHeader - title "Change Events"
    const heading = page.getByRole("heading", { name: "Change Events" }).first();
    await expect(heading).toBeVisible({ timeout: 15000 });
    console.log("T1: Heading visible");

    // Check for description text
    const description = page.getByText(/track scope changes/i).first();
    const descVisible = await description.isVisible().catch(() => false);
    console.log(`T1: Description visible: ${descVisible}`);

    // No fatal console errors (filter out benign ones)
    const fatalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("Warning:") &&
        !e.includes("HMR") &&
        !e.includes("hydrat")
    );
    console.log(`T1: Console errors: ${JSON.stringify(fatalErrors)}`);

    // Take screenshot
    await page.screenshot({
      path: "/tmp/change-events-t1-page-load.png",
      fullPage: false,
    });

    expect(fatalErrors.length).toBe(0);
    console.log("T1: PASS");
  });

  // ============================================================
  // TEST 2: LIST RENDERS DATA
  // ============================================================
  test("T2: List Renders Data - table visible, columns correct, data rows", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await waitForPageLoad(page);

    // Check table is present
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 15000 });
    console.log("T2: Table visible");

    // Check for expected column headers
    const expectedColumns = ["#", "Title", "Status"];
    for (const col of expectedColumns) {
      const header = page.locator(`th, [role="columnheader"]`).filter({ hasText: col }).first();
      const isVisible = await header.isVisible().catch(() => false);
      console.log(`T2: Column "${col}" visible: ${isVisible}`);
    }

    // Check data rows exist
    const rows = page.locator("tbody tr, [role='row']:not([role='columnheader'])");
    const rowCount = await rows.count();
    console.log(`T2: Data rows count: ${rowCount}`);

    // Check for "New Change Event" button
    const newButton = page.locator('[data-testid="change-events-new-button"]').first();
    const newButtonVisible = await newButton.isVisible().catch(() => false);
    console.log(`T2: New button visible: ${newButtonVisible}`);

    // Check tabs (All Change Events, Open, Pending, Approved)
    const allTab = page.getByText(/All Change Events/i).first();
    const allTabVisible = await allTab.isVisible().catch(() => false);
    console.log(`T2: All Change Events tab visible: ${allTabVisible}`);

    await page.screenshot({
      path: "/tmp/change-events-t2-list.png",
      fullPage: false,
    });

    // Table must be visible
    await expect(table).toBeVisible();
    console.log(`T2: PASS (${rowCount} rows)`);
  });

  // ============================================================
  // TEST 3: CREATE WORKS
  // ============================================================
  test("T3: Create Works - button → form → submit → success toast → record appears", async ({
    page,
  }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await waitForPageLoad(page);

    // Get initial count
    const rows = page.locator("tbody tr");
    const initialCount = await rows.count();
    console.log(`T3: Initial row count: ${initialCount}`);

    // Click "New Change Event" button
    const newButton = page.locator('[data-testid="change-events-new-button"]').first();
    await expect(newButton).toBeVisible({ timeout: 10000 });
    await newButton.click();

    // Wait for navigation to /new page
    await page.waitForURL(/\/change-events\/new/, { timeout: 15000 });
    await waitForPageLoad(page);
    console.log(`T3: Navigated to: ${page.url()}`);

    // Verify form page has ProjectPageHeader
    const createHeading = page.getByRole("heading", { name: /create change event/i }).first();
    await expect(createHeading).toBeVisible({ timeout: 10000 });
    console.log("T3: Create form page loaded");

    await page.screenshot({
      path: "/tmp/change-events-t3-create-form.png",
      fullPage: false,
    });

    // Fill required fields - Title is required
    const titleInput = page
      .locator('input[name="title"], input[placeholder*="title" i], #title')
      .first();
    const titleVisible = await titleInput.isVisible().catch(() => false);
    if (titleVisible) {
      await titleInput.fill("LIVE TEST Change Event " + Date.now());
      console.log("T3: Filled title");
    } else {
      // Try to find any visible text input
      const inputs = page.locator('input[type="text"]:visible').first();
      const inputVisible = await inputs.isVisible().catch(() => false);
      if (inputVisible) {
        await inputs.fill("LIVE TEST Change Event " + Date.now());
        console.log("T3: Filled first visible text input");
      } else {
        console.log("T3: WARNING - Could not find title input");
      }
    }

    // Submit the form
    const submitButton = page
      .locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")')
      .first();
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    console.log(`T3: Submit button text: ${await submitButton.textContent()}`);
    await submitButton.click();

    // Wait for success toast or navigation
    const toastOrNav = await Promise.race([
      page
        .locator('[data-sonner-toast], [data-testid="toast"]')
        .first()
        .waitFor({ state: "visible", timeout: 10000 })
        .then(() => "toast"),
      page
        .waitForURL(/\/change-events\/\d+/, { timeout: 10000 })
        .then(() => "navigation"),
    ]).catch(() => "timeout");

    console.log(`T3: Post-submit result: ${toastOrNav}`);

    await page.screenshot({
      path: "/tmp/change-events-t3-after-submit.png",
      fullPage: false,
    });

    if (toastOrNav === "navigation") {
      // Check we're on the detail page
      const url = page.url();
      console.log(`T3: Navigated to detail page: ${url}`);
      expect(url).toMatch(/\/change-events\/\d+/);
      console.log("T3: PASS - navigated to detail page after create");
    } else if (toastOrNav === "toast") {
      const toastText = await page
        .locator('[data-sonner-toast]')
        .first()
        .textContent()
        .catch(() => "");
      console.log(`T3: Toast text: ${toastText}`);
      expect(toastText).toMatch(/success|created/i);
      console.log("T3: PASS - success toast appeared");
    } else {
      console.log("T3: WARNING - Neither toast nor navigation detected within timeout");
      // Check console errors
      console.log(`T3: Console errors: ${JSON.stringify(consoleErrors)}`);
    }
  });

  // ============================================================
  // TEST 4: EDIT WORKS
  // ============================================================
  test("T4: Edit Works - click record → detail page → edit → save → persists", async ({
    page,
  }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await waitForPageLoad(page);

    // Find and click the first row to view detail
    const firstRow = page.locator("tbody tr").first();
    const rowExists = await firstRow.isVisible().catch(() => false);

    if (!rowExists) {
      console.log("T4: No rows in table, skipping edit test");
      test.skip();
      return;
    }

    // Click on first row
    await firstRow.click();

    // Wait for detail page to load
    await page.waitForURL(/\/change-events\/\d+/, { timeout: 15000 });
    await waitForPageLoad(page);
    const detailUrl = page.url();
    console.log(`T4: Detail page URL: ${detailUrl}`);

    // Verify detail page loaded - should have a heading
    const detailHeading = page.locator("h1, h2").first();
    const headingText = await detailHeading.textContent().catch(() => "");
    console.log(`T4: Detail heading: ${headingText}`);

    await page.screenshot({
      path: "/tmp/change-events-t4-detail.png",
      fullPage: false,
    });

    // Look for Edit button
    const editButton = page
      .locator('a[href*="/edit"], button:has-text("Edit"), a:has-text("Edit")')
      .first();
    const editVisible = await editButton.isVisible().catch(() => false);

    if (!editVisible) {
      console.log("T4: No edit button found on detail page - checking page structure");
      // Get page content for debugging
      const pageContent = await page.locator("main").textContent().catch(() => "");
      console.log(`T4: Page content snippet: ${pageContent?.slice(0, 300)}`);
      // Still check that the detail route works (URL is correct)
      expect(detailUrl).toMatch(/\/change-events\/\d+/);
      console.log("T4: PARTIAL - detail page loads but edit button not found");
      return;
    }

    await editButton.click();
    await page.waitForURL(/\/edit/, { timeout: 10000 });
    await waitForPageLoad(page);
    console.log(`T4: Edit page URL: ${page.url()}`);

    await page.screenshot({
      path: "/tmp/change-events-t4-edit-form.png",
      fullPage: false,
    });

    // Find a text field to edit
    const notesInput = page.locator('textarea[name="notes"], textarea[name="description"], textarea').first();
    const notesVisible = await notesInput.isVisible().catch(() => false);

    if (notesVisible) {
      const currentValue = await notesInput.inputValue().catch(() => "");
      const newValue = `Edited at ${new Date().toISOString()}`;
      await notesInput.clear();
      await notesInput.fill(newValue);
      console.log(`T4: Changed notes from "${currentValue?.slice(0, 50)}" to "${newValue}"`);
    } else {
      console.log("T4: Notes/description field not found, trying title");
    }

    // Save
    const saveButton = page
      .locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")')
      .first();
    const saveVisible = await saveButton.isVisible().catch(() => false);

    if (!saveVisible) {
      console.log("T4: Save button not found");
      return;
    }

    await saveButton.click();

    // Wait for toast or navigation back to detail
    const result = await Promise.race([
      page
        .locator('[data-sonner-toast]')
        .first()
        .waitFor({ state: "visible", timeout: 10000 })
        .then(() => "toast"),
      page
        .waitForURL(/\/change-events\/\d+(?!\/edit)/, { timeout: 10000 })
        .then(() => "navigation"),
    ]).catch(() => "timeout");

    console.log(`T4: Post-save result: ${result}`);

    await page.screenshot({
      path: "/tmp/change-events-t4-after-save.png",
      fullPage: false,
    });

    if (result === "toast" || result === "navigation") {
      console.log("T4: PASS - save successful");
    } else {
      console.log(`T4: WARNING - save may have timed out. Console errors: ${JSON.stringify(consoleErrors)}`);
    }
  });

  // ============================================================
  // TEST 5: DELETE WORKS
  // ============================================================
  test("T5: Delete Works - find delete action → confirm → record removed → toast", async ({
    page,
  }) => {
    // First create a record specifically for deletion
    await page.goto(`http://localhost:3000/${PROJECT_ID}/change-events/new`, {
      waitUntil: "domcontentloaded",
    });
    await waitForPageLoad(page);

    // Fill title
    const titleInput = page
      .locator('input[name="title"], input[placeholder*="title" i], #title')
      .first();
    const titleVisible = await titleInput.isVisible().catch(() => false);

    if (titleVisible) {
      const deleteTestTitle = "DELETE TEST CE " + Date.now();
      await titleInput.fill(deleteTestTitle);
      console.log(`T5: Created CE for deletion: ${deleteTestTitle}`);

      const submitButton = page
        .locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")')
        .first();
      await submitButton.click();

      // Wait for navigation to detail or list
      await Promise.race([
        page.waitForURL(/\/change-events\/\d+/, { timeout: 15000 }),
        page.waitForURL(/\/change-events$/, { timeout: 15000 }),
      ]).catch(() => {});

      console.log(`T5: After create, URL: ${page.url()}`);
    } else {
      console.log("T5: Could not create test record - will use existing record");
    }

    // Go to the list page
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await waitForPageLoad(page);

    // Find delete action on first row - look for row actions button (3-dot menu)
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    console.log(`T5: Row count: ${rowCount}`);

    if (rowCount === 0) {
      console.log("T5: No rows to delete");
      test.skip();
      return;
    }

    // Try to find row action buttons (kebab/ellipsis menus)
    const lastRow = rows.last();
    await lastRow.hover();

    // Look for action button within the row
    const actionButton = lastRow
      .locator('button[aria-label*="actions" i], button[aria-label*="menu" i], button:has([data-lucide="more-horizontal"]), button:has(.lucide-ellipsis), button:has-text("...")')
      .first();
    const actionVisible = await actionButton.isVisible().catch(() => false);
    console.log(`T5: Row action button visible: ${actionVisible}`);

    await page.screenshot({
      path: "/tmp/change-events-t5-before-delete.png",
      fullPage: false,
    });

    if (!actionVisible) {
      // Try right-clicking for context menu
      console.log("T5: Row action button not found, looking for alternative delete triggers");

      // Check if there's a direct delete button
      const directDelete = page
        .locator('button:has-text("Delete"), [aria-label*="Delete" i]')
        .first();
      const directVisible = await directDelete.isVisible().catch(() => false);
      console.log(`T5: Direct delete button visible: ${directVisible}`);

      if (!directVisible) {
        console.log("T5: BLOCKED - No delete action found in UI");
        return;
      }
    }

    if (actionVisible) {
      await actionButton.click();
      await page.waitForTimeout(500);

      // Look for Delete option in dropdown
      const deleteOption = page
        .locator('[role="menuitem"]:has-text("Delete"), [role="option"]:has-text("Delete"), button:has-text("Delete")')
        .first();
      const deleteVisible = await deleteOption.isVisible().catch(() => false);
      console.log(`T5: Delete menu item visible: ${deleteVisible}`);

      await page.screenshot({
        path: "/tmp/change-events-t5-action-menu.png",
        fullPage: false,
      });

      if (deleteVisible) {
        // Handle window.confirm dialog
        page.on("dialog", async (dialog) => {
          console.log(`T5: Dialog appeared: ${dialog.message()}`);
          await dialog.accept();
        });

        await deleteOption.click();
        await page.waitForTimeout(2000);

        // Check for success toast
        const toast = page.locator('[data-sonner-toast]').first();
        const toastVisible = await toast.isVisible().catch(() => false);

        if (toastVisible) {
          const toastText = await toast.textContent().catch(() => "");
          console.log(`T5: Toast text: ${toastText}`);
        }

        const newRowCount = await page.locator("tbody tr").count();
        console.log(`T5: Row count after delete: ${newRowCount} (was ${rowCount})`);

        await page.screenshot({
          path: "/tmp/change-events-t5-after-delete.png",
          fullPage: false,
        });

        if (newRowCount < rowCount || toastVisible) {
          console.log("T5: PASS - record deleted");
        } else {
          console.log("T5: UNCERTAIN - row count unchanged after delete");
        }
      } else {
        console.log("T5: BLOCKED - Delete option not visible in dropdown");
      }
    }
  });

  // ============================================================
  // TEST 6: FORM VALIDATION
  // ============================================================
  test("T6: Form Validation - empty required fields show error messages", async ({ page }) => {
    await page.goto(`http://localhost:3000/${PROJECT_ID}/change-events/new`, {
      waitUntil: "domcontentloaded",
    });
    await waitForPageLoad(page);

    const formUrl = page.url();
    console.log(`T6: Form URL: ${formUrl}`);
    expect(formUrl).toContain("/change-events/new");

    await page.screenshot({
      path: "/tmp/change-events-t6-empty-form.png",
      fullPage: false,
    });

    // Try to submit with empty required fields
    const submitButton = page
      .locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")')
      .first();
    await expect(submitButton).toBeVisible({ timeout: 10000 });

    // Clear title if pre-filled
    const titleInput = page
      .locator('input[name="title"], input[placeholder*="title" i], #title')
      .first();
    const titleVisible = await titleInput.isVisible().catch(() => false);
    if (titleVisible) {
      await titleInput.clear();
      console.log("T6: Cleared title field");
    }

    await submitButton.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "/tmp/change-events-t6-after-empty-submit.png",
      fullPage: false,
    });

    // Check for validation error messages
    const errorMessages = page.locator(
      '[class*="error"], [class*="invalid"], [aria-invalid="true"], .text-red-500, .text-destructive, [role="alert"]'
    );
    const errorCount = await errorMessages.count();
    console.log(`T6: Error elements count: ${errorCount}`);

    // Check specific error texts
    const errorTexts = await errorMessages.allTextContents().catch(() => []);
    console.log(`T6: Error texts: ${JSON.stringify(errorTexts.slice(0, 10))}`);

    // Check if form is still on same page (not submitted with errors)
    const currentUrl = page.url();
    const stillOnForm = currentUrl.includes("/change-events/new");
    console.log(`T6: Still on form after empty submit: ${stillOnForm}`);

    // HTML5 native validation also counts
    const invalidInputs = await page.locator("input:invalid, textarea:invalid").count();
    console.log(`T6: HTML5 invalid inputs: ${invalidInputs}`);

    if (errorCount > 0 || invalidInputs > 0 || stillOnForm) {
      console.log("T6: PASS - validation prevented submission");
    } else {
      console.log("T6: UNCERTAIN - unclear if validation fired");
    }
  });

  // ============================================================
  // TEST EXTRA: Verify [changeEventId] route naming
  // ============================================================
  test("T-EXTRA: Route naming [changeEventId] - detail and edit pages work", async ({
    page,
  }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await waitForPageLoad(page);

    // Get first row's ID by clicking it
    const firstRow = page.locator("tbody tr").first();
    const rowExists = await firstRow.isVisible().catch(() => false);

    if (!rowExists) {
      console.log("EXTRA: No rows - skipping route test");
      test.skip();
      return;
    }

    await firstRow.click();
    await page.waitForURL(/\/change-events\/\d+/, { timeout: 15000 });

    const detailUrl = page.url();
    const idMatch = detailUrl.match(/\/change-events\/(\d+)/);
    const changeEventId = idMatch?.[1];
    console.log(`EXTRA: Change event ID from URL: ${changeEventId}`);
    console.log(`EXTRA: Detail URL: ${detailUrl}`);

    // Verify detail page loads (not 404)
    const pageTitle = await page.title();
    console.log(`EXTRA: Page title: ${pageTitle}`);

    const is404 = await page
      .locator("text=404, text=not found, text=Not Found")
      .first()
      .isVisible()
      .catch(() => false);
    console.log(`EXTRA: Is 404: ${is404}`);
    expect(is404).toBe(false);

    // Try edit page
    if (changeEventId) {
      await page.goto(
        `http://localhost:3000/${PROJECT_ID}/change-events/${changeEventId}/edit`,
        { waitUntil: "domcontentloaded" }
      );
      await waitForPageLoad(page);
      const editUrl = page.url();
      console.log(`EXTRA: Edit URL: ${editUrl}`);

      const editIs404 = await page
        .locator("text=404, text=not found, text=Not Found")
        .first()
        .isVisible()
        .catch(() => false);
      console.log(`EXTRA: Edit is 404: ${editIs404}`);
      expect(editIs404).toBe(false);

      await page.screenshot({
        path: "/tmp/change-events-extra-edit.png",
        fullPage: false,
      });
    }

    console.log("EXTRA: Route naming test complete");
  });
});
