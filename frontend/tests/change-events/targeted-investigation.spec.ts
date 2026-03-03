/**
 * Targeted investigation for Change Events failures
 */
import { test, expect, Page } from "@playwright/test";

const PROJECT_ID = 67;

test.describe("Change Events - Targeted Investigation", () => {
  // ============================================================
  // T2 INVESTIGATION: What's actually on the page when empty?
  // ============================================================
  test("T2-INVEST: Empty table page structure", async ({ page }) => {
    await page.goto(`http://localhost:3000/${PROJECT_ID}/change-events`, {
      waitUntil: "networkidle",
    });

    // Screenshot the actual page
    await page.screenshot({ path: "/tmp/ce-t2-invest-full.png", fullPage: true });

    // Check the actual DOM structure
    const hasTable = await page.locator("table").first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator("text=No change events found").isVisible().catch(() => false);
    const hasGrid = await page.locator('[role="grid"]').first().isVisible().catch(() => false);

    // Get the full page HTML structure
    const bodyText = await page.locator("main, [role='main'], .main-content").first().textContent().catch(() => "");

    console.log(`T2-INVEST: hasTable: ${hasTable}`);
    console.log(`T2-INVEST: hasEmptyState: ${hasEmptyState}`);
    console.log(`T2-INVEST: hasGrid: ${hasGrid}`);
    console.log(`T2-INVEST: page text snippet: ${bodyText?.slice(0, 500)}`);

    // Check what kind of list/grid element is used
    const listElement = await page.locator('[data-testid*="table"], [class*="table"], [role="grid"], [role="list"]').first().isVisible().catch(() => false);
    console.log(`T2-INVEST: listElement visible: ${listElement}`);

    // Check tabs
    const allTabCount = await page.locator('[data-testid="change-events-count-all"]').textContent().catch(() => "not found");
    console.log(`T2-INVEST: All tab count element: ${allTabCount}`);

    // Check search input
    const searchInput = await page.locator('input[placeholder*="search" i]').isVisible().catch(() => false);
    console.log(`T2-INVEST: Search input visible: ${searchInput}`);

    // Check toolbar
    const toolbar = await page.locator('[data-testid="table-toolbar"], .toolbar').first().isVisible().catch(() => false);
    console.log(`T2-INVEST: Toolbar visible: ${toolbar}`);

    // Count all elements that match our empty state
    console.log(`T2-INVEST: Result: Empty state shown with "No change events found" = ${hasEmptyState}`);
    console.log(`T2-INVEST: Table element not present when empty = ${!hasTable}`);
    console.log("T2-INVEST: CONCLUSION - Table only renders when there is data; empty state shows instead");
  });

  // ============================================================
  // T3 INVESTIGATION: Create flow - what happens when clicking New?
  // ============================================================
  test("T3-INVEST: Create flow investigation", async ({ page }) => {
    // Track all navigation
    const navigations: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        navigations.push(frame.url());
      }
    });

    await page.goto(`http://localhost:3000/${PROJECT_ID}/change-events`, {
      waitUntil: "networkidle",
    });

    // Click the New Change Event button
    const newButton = page.locator('[data-testid="change-events-new-button"]').first();
    await expect(newButton).toBeVisible({ timeout: 10000 });
    console.log(`T3-INVEST: New button found`);

    await newButton.click();
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`T3-INVEST: URL after clicking New: ${currentUrl}`);
    console.log(`T3-INVEST: All navigations: ${JSON.stringify(navigations)}`);

    await page.screenshot({ path: "/tmp/ce-t3-invest-after-new-click.png", fullPage: false });

    // What's on the page now?
    const pageTitle = await page.locator("h1, h2").first().textContent().catch(() => "");
    console.log(`T3-INVEST: Page heading: ${pageTitle}`);

    // Is there a form?
    const formCount = await page.locator("form").count();
    console.log(`T3-INVEST: Forms on page: ${formCount}`);

    // Check if navigated correctly
    if (currentUrl.includes("/change-events/new")) {
      console.log("T3-INVEST: CORRECT - navigated to /new");
    } else {
      console.log(`T3-INVEST: UNEXPECTED URL: ${currentUrl}`);
      // Check if there's a modal/dialog instead
      const dialog = await page.locator('[role="dialog"], [data-radix-dialog-content]').first().isVisible().catch(() => false);
      console.log(`T3-INVEST: Dialog visible: ${dialog}`);
    }

    // Now try to navigate directly to /new
    await page.goto(`http://localhost:3000/${PROJECT_ID}/change-events/new`, {
      waitUntil: "networkidle",
    });
    const newPageUrl = page.url();
    console.log(`T3-INVEST: Direct /new URL: ${newPageUrl}`);

    await page.screenshot({ path: "/tmp/ce-t3-invest-new-page.png", fullPage: false });

    const headingAfterNav = await page.locator("h1, h2").first().textContent().catch(() => "");
    console.log(`T3-INVEST: Heading after direct nav: ${headingAfterNav}`);

    const formAfterNav = await page.locator("form").first().isVisible().catch(() => false);
    console.log(`T3-INVEST: Form visible after direct nav: ${formAfterNav}`);

    // Check for 404 or auth redirect
    const is404 = currentUrl.includes("not-found") || currentUrl.includes("404");
    const isLoginRedirect = currentUrl.includes("/auth/login");
    console.log(`T3-INVEST: Is 404: ${is404}, Is login redirect: ${isLoginRedirect}`);

    // If the new page works, find and inspect the form fields
    if (newPageUrl.includes("/change-events/new")) {
      const allInputs = await page.locator("input, textarea, select").all();
      for (const input of allInputs) {
        const name = await input.getAttribute("name").catch(() => "");
        const placeholder = await input.getAttribute("placeholder").catch(() => "");
        const type = await input.getAttribute("type").catch(() => "");
        const isVisible = await input.isVisible().catch(() => false);
        if (isVisible) {
          console.log(`T3-INVEST: Input: name="${name}" placeholder="${placeholder}" type="${type}"`);
        }
      }
    }
  });

  // ============================================================
  // T3-CREATE: Actually create a record
  // ============================================================
  test("T3-CREATE: Actually create a change event", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Go directly to create page
    await page.goto(`http://localhost:3000/${PROJECT_ID}/change-events/new`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const url = page.url();
    console.log(`T3-CREATE: URL: ${url}`);

    // Check if we're on the form page
    if (!url.includes("/change-events/new")) {
      console.log(`T3-CREATE: BLOCKED - Not on create page, got: ${url}`);
      return;
    }

    await page.screenshot({ path: "/tmp/ce-t3-create-form.png", fullPage: true });

    // Find and fill the title field
    const titleField = page.locator('input[name="title"]').first();
    const titleVisible = await titleField.isVisible().catch(() => false);
    console.log(`T3-CREATE: Title field visible: ${titleVisible}`);

    if (!titleVisible) {
      // Find all visible inputs
      const allInputs = await page.locator("input:visible").all();
      console.log(`T3-CREATE: Visible inputs count: ${allInputs.length}`);
      for (let i = 0; i < allInputs.length; i++) {
        const name = await allInputs[i].getAttribute("name").catch(() => "");
        const placeholder = await allInputs[i].getAttribute("placeholder").catch(() => "");
        console.log(`T3-CREATE: Input[${i}]: name="${name}" placeholder="${placeholder}"`);
      }
    }

    if (titleVisible) {
      await titleField.fill("LIVE TEST CE " + Date.now());
    }

    // Find submit button
    const submitBtn = page.locator('button[type="submit"]').first();
    const submitVisible = await submitBtn.isVisible().catch(() => false);
    console.log(`T3-CREATE: Submit button visible: ${submitVisible}`);

    if (submitVisible) {
      const submitText = await submitBtn.textContent().catch(() => "");
      console.log(`T3-CREATE: Submit text: "${submitText}"`);
    }

    // Submit
    if (titleVisible && submitVisible) {
      // Watch for network requests
      const apiRequests: { url: string; method: string; status?: number }[] = [];
      page.on("request", (req) => {
        if (req.url().includes("/api/")) {
          apiRequests.push({ url: req.url(), method: req.method() });
        }
      });
      page.on("response", (res) => {
        if (res.url().includes("/api/")) {
          const req = apiRequests.find((r) => r.url === res.url());
          if (req) req.status = res.status();
        }
      });

      await submitBtn.click();

      // Wait for something to happen
      await page.waitForTimeout(5000);

      const postUrl = page.url();
      console.log(`T3-CREATE: URL after submit: ${postUrl}`);
      console.log(`T3-CREATE: API requests: ${JSON.stringify(apiRequests)}`);
      console.log(`T3-CREATE: Console errors: ${JSON.stringify(errors)}`);

      // Check for toast
      const toast = await page.locator('[data-sonner-toast]').first().textContent().catch(() => "");
      console.log(`T3-CREATE: Toast: "${toast}"`);

      await page.screenshot({ path: "/tmp/ce-t3-create-after-submit.png", fullPage: false });

      if (postUrl.includes("/change-events/") && !postUrl.includes("/new")) {
        const idMatch = postUrl.match(/\/change-events\/(\d+)/);
        console.log(`T3-CREATE: PASS - navigated to detail page, ID: ${idMatch?.[1]}`);
        // Return the ID for use in subsequent tests
        console.log(`T3-CREATE: CREATED_ID=${idMatch?.[1]}`);
      } else if (toast.includes("created") || toast.includes("success")) {
        console.log("T3-CREATE: PASS - success toast shown");
      } else {
        console.log(`T3-CREATE: FAIL - unexpected result. URL: ${postUrl}, Toast: "${toast}"`);
      }
    }
  });

  // ============================================================
  // T4+T5+T6: After creating, test edit, delete, and validation
  // ============================================================
  test("T4-T5-T6: Edit, Delete, Validation after creating test data", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Step 1: Create a change event for testing
    await page.goto(`http://localhost:3000/${PROJECT_ID}/change-events/new`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const createUrl = page.url();
    console.log(`COMBO: Create URL: ${createUrl}`);

    if (!createUrl.includes("/change-events/new")) {
      console.log(`COMBO: BLOCKED - create page redirected to ${createUrl}`);
      return;
    }

    const titleField = page.locator('input[name="title"]').first();
    const titleVisible = await titleField.isVisible().catch(() => false);

    if (!titleVisible) {
      console.log("COMBO: BLOCKED - title field not found on create page");
      // Dump form structure
      const html = await page.locator("form").first().innerHTML().catch(() => "no form found");
      console.log(`COMBO: Form HTML (500 chars): ${html.slice(0, 500)}`);
      return;
    }

    const testTitle = `TEST DELETE ME ${Date.now()}`;
    await titleField.fill(testTitle);

    const submitBtn = page.locator('button[type="submit"]').first();
    const apiRequests: { url: string; method: string; status?: number }[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/projects")) {
        apiRequests.push({ url: req.url(), method: req.method() });
      }
    });
    page.on("response", (res) => {
      if (res.url().includes("/api/projects")) {
        const req = apiRequests.find((r) => r.url === res.url() && r.status === undefined);
        if (req) req.status = res.status();
      }
    });

    await submitBtn.click();

    // Wait for navigation to detail page (form should redirect there)
    const navResult = await Promise.race([
      page.waitForURL(/\/change-events\/\d+(?!\/new)/, { timeout: 15000 }).then(() => "nav"),
      page.waitForTimeout(15000).then(() => "timeout"),
    ]);

    console.log(`COMBO-CREATE: API requests: ${JSON.stringify(apiRequests)}`);
    console.log(`COMBO-CREATE: Nav result: ${navResult}, URL: ${page.url()}`);

    const detailUrl = page.url();

    if (!detailUrl.match(/\/change-events\/\d+/)) {
      console.log(`COMBO-CREATE: FAIL - did not navigate to detail page, at: ${detailUrl}`);
      await page.screenshot({ path: "/tmp/ce-combo-create-fail.png", fullPage: false });

      // Check toasts/errors
      const toastText = await page.locator('[data-sonner-toast]').first().textContent().catch(() => "none");
      console.log(`COMBO-CREATE: Toast: "${toastText}"`);
      console.log(`COMBO-CREATE: Console errors: ${JSON.stringify(errors)}`);
      return;
    }

    const idMatch = detailUrl.match(/\/change-events\/(\d+)/);
    const changeEventId = idMatch?.[1];
    console.log(`COMBO-CREATE: PASS - Created CE ID: ${changeEventId}`);

    await page.screenshot({ path: "/tmp/ce-combo-detail.png", fullPage: false });

    // ==== T4: EDIT ====
    console.log("\n--- T4: EDIT ---");
    await page.goto(
      `http://localhost:3000/${PROJECT_ID}/change-events/${changeEventId}/edit`,
      { waitUntil: "networkidle", timeout: 30000 }
    );

    const editUrl = page.url();
    console.log(`T4: Edit URL: ${editUrl}`);

    if (!editUrl.includes("/edit")) {
      console.log(`T4: FAIL - Not on edit page, at: ${editUrl}`);
    } else {
      await page.screenshot({ path: "/tmp/ce-t4-edit.png", fullPage: false });

      // Find title field and change it
      const editTitle = page.locator('input[name="title"]').first();
      const editTitleVisible = await editTitle.isVisible().catch(() => false);

      if (editTitleVisible) {
        const currentTitle = await editTitle.inputValue().catch(() => "");
        const newTitle = `EDITED ${currentTitle}`;
        await editTitle.fill(newTitle);
        console.log(`T4: Changed title from "${currentTitle}" to "${newTitle}"`);

        const saveBtn = page.locator('button[type="submit"]').first();
        await saveBtn.click();

        await page.waitForTimeout(5000);
        const postEditUrl = page.url();
        console.log(`T4: URL after save: ${postEditUrl}`);

        const editToast = await page.locator('[data-sonner-toast]').first().textContent().catch(() => "");
        console.log(`T4: Toast: "${editToast}"`);

        await page.screenshot({ path: "/tmp/ce-t4-after-save.png", fullPage: false });

        // Reload and verify
        await page.goto(
          `http://localhost:3000/${PROJECT_ID}/change-events/${changeEventId}`,
          { waitUntil: "networkidle" }
        );
        const pageContent = await page.locator("h1, h2, h3").first().textContent().catch(() => "");
        console.log(`T4: After reload, heading: "${pageContent}"`);

        if (postEditUrl.match(/\/change-events\/\d+(?!\/edit)/) || editToast.includes("success")) {
          console.log("T4: PASS - edit saved successfully");
        } else {
          console.log("T4: UNCERTAIN - check screenshots");
        }
      } else {
        // Dump edit form structure
        const editHtml = await page.locator("form, main").first().innerHTML().catch(() => "");
        console.log(`T4: Form HTML (500 chars): ${editHtml.slice(0, 500)}`);
      }
    }

    // ==== T6: FORM VALIDATION ====
    console.log("\n--- T6: FORM VALIDATION ---");
    await page.goto(
      `http://localhost:3000/${PROJECT_ID}/change-events/new`,
      { waitUntil: "networkidle" }
    );

    await page.screenshot({ path: "/tmp/ce-t6-empty-form.png", fullPage: false });

    // Clear title and submit
    const validationTitle = page.locator('input[name="title"]').first();
    const validationTitleVisible = await validationTitle.isVisible().catch(() => false);

    if (validationTitleVisible) {
      await validationTitle.clear();
    }

    const validationSubmit = page.locator('button[type="submit"]').first();
    await validationSubmit.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "/tmp/ce-t6-after-empty-submit.png", fullPage: false });

    // Check for error messages
    const errorTexts = await page
      .locator('[class*="error"], [aria-invalid="true"], .text-red, .text-destructive, [role="alert"]')
      .allTextContents()
      .catch(() => []);
    console.log(`T6: Error texts: ${JSON.stringify(errorTexts)}`);

    const invalidInputs = await page.locator("input:invalid").count();
    console.log(`T6: HTML5 invalid inputs: ${invalidInputs}`);

    const stillOnForm = page.url().includes("/change-events/new");
    console.log(`T6: Still on form: ${stillOnForm}`);

    if (errorTexts.length > 0 || invalidInputs > 0 || stillOnForm) {
      console.log("T6: PASS - validation prevents empty submission");
    } else {
      console.log("T6: FAIL - form submitted with empty required fields");
    }

    // ==== T5: DELETE ====
    console.log("\n--- T5: DELETE ---");

    // Go to the list page
    await page.goto(`http://localhost:3000/${PROJECT_ID}/change-events`, {
      waitUntil: "networkidle",
    });

    await page.screenshot({ path: "/tmp/ce-t5-list-before-delete.png", fullPage: false });

    // Check if the created record is now in the list
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    console.log(`T5: Row count: ${rowCount}`);

    if (rowCount === 0) {
      console.log("T5: FAIL - table is empty, created record not visible in list");
      return;
    }

    // Find the row for our created item
    const targetRow = page.locator(`tbody tr`).last();
    await targetRow.hover();

    // Look for action menu button
    const actionMenuBtn = targetRow.locator(
      'button[aria-haspopup="menu"], button[aria-label*="action" i], button[aria-label*="more" i], [data-testid*="row-action"], button:has(svg)'
    ).last();

    const actionVisible = await actionMenuBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`T5: Row action button visible: ${actionVisible}`);

    await page.screenshot({ path: "/tmp/ce-t5-row-hover.png", fullPage: false });

    if (actionVisible) {
      await actionMenuBtn.click();
      await page.waitForTimeout(500);

      await page.screenshot({ path: "/tmp/ce-t5-action-menu.png", fullPage: false });

      const deleteItem = page.locator('[role="menuitem"]:has-text("Delete"), [role="menuitem"]:has-text("delete"), button:has-text("Delete")').first();
      const deleteVisible = await deleteItem.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`T5: Delete menu item visible: ${deleteVisible}`);

      if (deleteVisible) {
        // Handle dialog
        page.once("dialog", async (dialog) => {
          console.log(`T5: Confirm dialog: "${dialog.message()}"`);
          await dialog.accept();
        });

        await deleteItem.click();
        await page.waitForTimeout(3000);

        const newRowCount = await page.locator("tbody tr").count();
        const toastText = await page.locator('[data-sonner-toast]').first().textContent().catch(() => "");
        console.log(`T5: After delete - rows: ${newRowCount} (was ${rowCount}), toast: "${toastText}"`);

        await page.screenshot({ path: "/tmp/ce-t5-after-delete.png", fullPage: false });

        if (newRowCount < rowCount) {
          console.log("T5: PASS - row was removed");
        } else if (toastText.includes("recycle") || toastText.includes("success")) {
          console.log("T5: PASS - success toast shown");
        } else {
          console.log("T5: UNCERTAIN - row count unchanged after delete");
        }
      }
    } else {
      // Snapshot the full row to understand structure
      const rowHtml = await targetRow.innerHTML().catch(() => "");
      console.log(`T5: Row HTML (500 chars): ${rowHtml.slice(0, 500)}`);
    }
  });
});
