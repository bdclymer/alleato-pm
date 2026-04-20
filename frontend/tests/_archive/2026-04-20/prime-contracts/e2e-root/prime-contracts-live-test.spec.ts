/**
 * Live Test: Prime Contracts Feature
 * Bug Investigation Team - Live Tester
 *
 * Tests the prime-contracts feature at /31/prime-contracts
 * Auth state is pre-saved and loaded automatically.
 */

import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ID = "31";
const BASE_URL = `http://localhost:3000`;
const PRIME_CONTRACTS_URL = `${BASE_URL}/${PROJECT_ID}/prime-contracts`;

const FINDINGS: string[] = [];

function log(msg: string) {
  console.log(msg);
  FINDINGS.push(msg);
}

test.describe("Prime Contracts - Live Bug Investigation", () => {
  test.beforeAll(async () => {
    FINDINGS.length = 0;
    log("=== PRIME CONTRACTS LIVE TEST STARTED ===");
    log(`URL: ${PRIME_CONTRACTS_URL}`);
    log(`Date: ${new Date().toISOString()}`);
    log("");
  });

  // ─── TEST 1: Page Load ───────────────────────────────────────────────────
  test("TEST 1: Page Load - Does page render without errors?", async ({ page }) => {
    log("## TEST 1: Page Load");

    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("response", (response) => {
      if (!response.ok() && response.url().includes("/api/")) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(PRIME_CONTRACTS_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for async data fetch

    // Check page title/header
    const headingText = await page.locator("h1, h2").first().textContent().catch(() => null);
    log(`  Page heading: ${headingText ?? "(none found)"}`);

    // Check for Prime Contracts title
    const titleVisible = await page.getByText("Prime Contracts").first().isVisible().catch(() => false);
    log(`  Title "Prime Contracts" visible: ${titleVisible}`);

    // Check for description
    const descVisible = await page.getByText(/manage prime contracts/i).isVisible().catch(() => false);
    log(`  Description visible: ${descVisible}`);

    // Check for runtime error dialogs
    const runtimeError = await page.locator("text=Runtime Error").count();
    log(`  Runtime errors on page: ${runtimeError}`);

    // Check for "Application error"
    const appError = await page.locator("text=Application error").count();
    log(`  Application error visible: ${appError}`);

    // Capture console errors
    log(`  Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((err) => log(`    ERROR: ${err.substring(0, 200)}`));

    // Capture network errors
    log(`  API errors: ${networkErrors.length}`);
    networkErrors.forEach((err) => log(`    API ERROR: ${err}`));

    await page.screenshot({ path: "/tmp/prime-contracts-test1-pageload.png", fullPage: true });
    log(`  Screenshot: /tmp/prime-contracts-test1-pageload.png`);

    // Check the page URL (redirected?)
    log(`  Final URL: ${page.url()}`);

    expect(titleVisible, "Prime Contracts title should be visible").toBe(true);
    expect(runtimeError, "Should have no runtime errors").toBe(0);
    log("  RESULT: PASS\n");
  });

  // ─── TEST 2: Table / List ────────────────────────────────────────────────
  test("TEST 2: List/Table - Is data table rendered?", async ({ page }) => {
    log("## TEST 2: List/Table");

    await page.goto(PRIME_CONTRACTS_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check for table element
    const tableVisible = await page.locator("table").isVisible().catch(() => false);
    log(`  <table> element visible: ${tableVisible}`);

    // Check for table headers / column names
    const thElements = await page.locator("th").allTextContents().catch(() => []);
    log(`  Table headers: ${thElements.join(", ")}`);

    // Check for tbody rows
    const rowCount = await page.locator("tbody tr").count();
    log(`  Table rows (tbody tr): ${rowCount}`);

    // Check for loading spinner
    const loadingVisible = await page.locator("[data-testid='loading'], .animate-spin, text=Loading").first().isVisible().catch(() => false);
    log(`  Loading indicator visible: ${loadingVisible}`);

    // Check for empty state
    const emptyStateVisible = await page.getByText("No contracts found").isVisible().catch(() => false);
    log(`  Empty state visible: ${emptyStateVisible}`);

    // Check for data rows (contract numbers or titles)
    const dataContent = await page.locator("tbody tr").first().textContent().catch(() => null);
    if (dataContent) {
      log(`  First row content: ${dataContent.trim().substring(0, 200)}`);
    } else {
      log(`  First row content: (no rows)`);
    }

    // Check tabs
    const tabsText = await page.locator("[role='tab'], [data-state]").allTextContents().catch(() => []);
    log(`  Tabs visible: ${tabsText.filter(Boolean).join(", ")}`);

    await page.screenshot({ path: "/tmp/prime-contracts-test2-table.png", fullPage: true });
    log(`  Screenshot: /tmp/prime-contracts-test2-table.png`);

    // Verify the table or empty state is shown
    expect(tableVisible || emptyStateVisible, "Should show table or empty state").toBe(true);
    log("  RESULT: PASS\n");
  });

  // ─── TEST 3: Create Contract ─────────────────────────────────────────────
  test("TEST 3: Create Contract - Form opens and submits", async ({ page }) => {
    log("## TEST 3: Create Contract");

    const consoleErrors: string[] = [];
    const apiRequests: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("request", (req) => {
      if (req.url().includes("/api/") && req.method() !== "GET") {
        apiRequests.push(`${req.method()} ${req.url()}`);
      }
    });

    await page.goto(PRIME_CONTRACTS_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Find the "New Contract" button
    const newContractBtn = page.getByRole("button", { name: /new contract/i });
    const btnVisible = await newContractBtn.isVisible().catch(() => false);
    log(`  "New Contract" button visible: ${btnVisible}`);

    if (!btnVisible) {
      // Try alternative selectors
      const altBtn = page.getByRole("button", { name: /add|create|new/i });
      const altVisible = await altBtn.first().isVisible().catch(() => false);
      log(`  Alternative button visible: ${altVisible}`);
      const allButtons = await page.getByRole("button").allTextContents().catch(() => []);
      log(`  All buttons: ${allButtons.join(", ")}`);
    }

    expect(btnVisible, "New Contract button should be visible").toBe(true);

    // Click the button - it navigates to /new page
    await newContractBtn.click();
    await page.waitForTimeout(2000);

    const newUrl = page.url();
    log(`  After click URL: ${newUrl}`);

    const navigatedToNew = newUrl.includes("/prime-contracts/new");
    log(`  Navigated to new contract page: ${navigatedToNew}`);

    if (!navigatedToNew) {
      // Maybe it opens a dialog
      const dialogVisible = await page.locator("[role='dialog']").isVisible().catch(() => false);
      log(`  Dialog opened instead: ${dialogVisible}`);
    }

    await page.waitForTimeout(2000);

    // Check form fields on the new contract page
    const allLabels = await page.locator("label").allTextContents().catch(() => []);
    log(`  Form labels: ${allLabels.filter(Boolean).join(", ")}`);

    const allInputs = await page.locator("input, textarea, select").count();
    log(`  Number of form inputs: ${allInputs}`);

    await page.screenshot({ path: "/tmp/prime-contracts-test3-newform.png", fullPage: true });
    log(`  Screenshot (new form page): /tmp/prime-contracts-test3-newform.png`);

    // Fill in the form
    const TEST_CONTRACT_NUMBER = `TEST-${Date.now()}`;
    const TEST_CONTRACT_TITLE = `Test Contract ${new Date().toISOString().slice(0, 10)}`;

    // Try to fill contract number
    const contractNumberField = page.locator('input[name="contract_number"], input[id*="contract_number"], input[placeholder*="number"], input[placeholder*="Number"]').first();
    const contractNumberExists = await contractNumberField.isVisible().catch(() => false);
    log(`  Contract number field visible: ${contractNumberExists}`);
    if (contractNumberExists) {
      await contractNumberField.fill(TEST_CONTRACT_NUMBER);
      log(`  Filled contract number: ${TEST_CONTRACT_NUMBER}`);
    }

    // Try to fill title
    const titleField = page.locator('input[name="title"], input[id*="title"], textarea[name="title"]').first();
    const titleExists = await titleField.isVisible().catch(() => false);
    log(`  Title field visible: ${titleExists}`);
    if (titleExists) {
      await titleField.fill(TEST_CONTRACT_TITLE);
      log(`  Filled title: ${TEST_CONTRACT_TITLE}`);
    }

    // Look for a description or notes field
    const descField = page.locator('textarea[name="description"], input[name="description"]').first();
    const descExists = await descField.isVisible().catch(() => false);
    if (descExists) {
      await descField.fill("Created by automated live test");
      log(`  Filled description`);
    }

    await page.screenshot({ path: "/tmp/prime-contracts-test3-filled.png", fullPage: true });
    log(`  Screenshot (filled form): /tmp/prime-contracts-test3-filled.png`);

    // Submit the form
    const submitBtn = page.getByRole("button", { name: /create|save|submit/i }).first();
    const submitVisible = await submitBtn.isVisible().catch(() => false);
    log(`  Submit button visible: ${submitVisible}`);

    if (submitVisible) {
      await submitBtn.click();
      await page.waitForTimeout(3000);

      const afterSubmitUrl = page.url();
      log(`  URL after submit: ${afterSubmitUrl}`);

      // Check for success toast
      const successToast = await page.locator("[data-sonner-toast], [role='status']").first().textContent().catch(() => null);
      log(`  Toast message: ${successToast ?? "(none)"}`);

      // Check for error messages
      const errorMsg = await page.locator("text=error, [role='alert']").first().textContent().catch(() => null);
      log(`  Error message: ${errorMsg ?? "(none)"}`);

      await page.screenshot({ path: "/tmp/prime-contracts-test3-submit.png", fullPage: true });
      log(`  Screenshot (after submit): /tmp/prime-contracts-test3-submit.png`);

      // Check API calls made
      log(`  API calls made: ${apiRequests.join(", ") || "(none)"}`);
    }

    log(`  Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((e) => log(`    ERROR: ${e.substring(0, 200)}`));

    log("  RESULT: See findings above\n");
  });

  // ─── TEST 4: Edit Contract ────────────────────────────────────────────────
  test("TEST 4: Edit Contract - Find existing and edit", async ({ page }) => {
    log("## TEST 4: Edit Contract");

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(PRIME_CONTRACTS_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check if rows exist
    const rowCount = await page.locator("tbody tr").count();
    log(`  Number of contract rows: ${rowCount}`);

    if (rowCount === 0) {
      log("  SKIP: No contracts exist to edit");
      log("  RESULT: SKIP (no data)\n");
      return;
    }

    // Get first row content for reference
    const firstRowText = await page.locator("tbody tr").first().textContent().catch(() => "(none)");
    log(`  First row: ${firstRowText?.trim().substring(0, 200)}`);

    // Look for row action buttons (ellipsis/more)
    const firstRow = page.locator("tbody tr").first();
    await firstRow.hover();
    await page.waitForTimeout(500);

    // Check for action button (three dots, edit, etc.)
    const actionBtn = firstRow.locator('button[aria-haspopup="menu"], button:has(svg), [data-testid*="action"]').first();
    const actionVisible = await actionBtn.isVisible().catch(() => false);
    log(`  Row action button visible: ${actionVisible}`);

    if (actionVisible) {
      await actionBtn.click();
      await page.waitForTimeout(500);

      // Look for Edit option in dropdown
      const editOption = page.getByRole("menuitem", { name: /edit/i });
      const editVisible = await editOption.isVisible().catch(() => false);
      log(`  Edit menu item visible: ${editVisible}`);

      if (editVisible) {
        await editOption.click();
        await page.waitForTimeout(2000);
        log(`  URL after clicking Edit: ${page.url()}`);

        await page.screenshot({ path: "/tmp/prime-contracts-test4-edit.png", fullPage: true });
        log(`  Screenshot (edit page): /tmp/prime-contracts-test4-edit.png`);

        // Check edit form
        const editLabels = await page.locator("label").allTextContents().catch(() => []);
        log(`  Edit form labels: ${editLabels.filter(Boolean).join(", ")}`);

        // Try to modify a field
        const titleField = page.locator('input[name="title"]').first();
        if (await titleField.isVisible().catch(() => false)) {
          const currentValue = await titleField.inputValue().catch(() => "");
          log(`  Current title value: ${currentValue}`);
          await titleField.fill(currentValue + " (EDITED)");

          const saveBtn = page.getByRole("button", { name: /save|update/i }).first();
          if (await saveBtn.isVisible().catch(() => false)) {
            await saveBtn.click();
            await page.waitForTimeout(2000);
            log(`  URL after save: ${page.url()}`);
            const toast = await page.locator("[data-sonner-toast]").first().textContent().catch(() => null);
            log(`  Toast after save: ${toast ?? "(none)"}`);
          }
        }
      }

      const allMenuItems = await page.locator("[role='menuitem']").allTextContents().catch(() => []);
      log(`  All menu items: ${allMenuItems.join(", ")}`);
    } else {
      // Try clicking on the row directly
      await firstRow.click();
      await page.waitForTimeout(2000);
      log(`  URL after row click: ${page.url()}`);

      // Look for an Edit button on detail page
      const editBtn = page.getByRole("button", { name: /edit/i });
      const editBtnVisible = await editBtn.isVisible().catch(() => false);
      log(`  Edit button on detail page: ${editBtnVisible}`);
    }

    log(`  Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((e) => log(`    ERROR: ${e.substring(0, 200)}`));
    log("  RESULT: See findings above\n");
  });

  // ─── TEST 5: Delete Contract ──────────────────────────────────────────────
  test("TEST 5: Delete Contract - Confirmation dialog", async ({ page }) => {
    log("## TEST 5: Delete Contract");

    await page.goto(PRIME_CONTRACTS_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const rowCount = await page.locator("tbody tr").count();
    log(`  Contract rows: ${rowCount}`);

    if (rowCount === 0) {
      log("  SKIP: No contracts to test delete");
      log("  RESULT: SKIP\n");
      return;
    }

    // Hover first row and click action menu
    const firstRow = page.locator("tbody tr").first();
    await firstRow.hover();
    await page.waitForTimeout(300);

    const actionBtn = firstRow.locator('button[aria-haspopup="menu"], button:has(svg)').last();
    const actionVisible = await actionBtn.isVisible().catch(() => false);
    log(`  Row action button visible: ${actionVisible}`);

    if (actionVisible) {
      await actionBtn.click();
      await page.waitForTimeout(500);

      const deleteOption = page.getByRole("menuitem", { name: /delete/i });
      const deleteVisible = await deleteOption.isVisible().catch(() => false);
      log(`  Delete menu item visible: ${deleteVisible}`);

      if (deleteVisible) {
        await deleteOption.click();
        await page.waitForTimeout(500);

        // Check for confirmation dialog
        const dialogVisible = await page.locator("[role='alertdialog']").isVisible().catch(() => false);
        log(`  Confirmation dialog visible: ${dialogVisible}`);

        const dialogTitle = await page.locator("[role='alertdialog'] h2, [role='alertdialog'] [class*='title']").first().textContent().catch(() => null);
        log(`  Dialog title: ${dialogTitle}`);

        const dialogDesc = await page.locator("[role='alertdialog'] [class*='description']").first().textContent().catch(() => null);
        log(`  Dialog description: ${dialogDesc}`);

        await page.screenshot({ path: "/tmp/prime-contracts-test5-delete.png", fullPage: true });
        log(`  Screenshot (delete dialog): /tmp/prime-contracts-test5-delete.png`);

        // Click Cancel to not actually delete test data
        const cancelBtn = page.getByRole("button", { name: /cancel/i });
        if (await cancelBtn.isVisible().catch(() => false)) {
          await cancelBtn.click();
          log(`  Clicked Cancel (not deleting real data)`);
        }
      }
    }

    log("  RESULT: See findings above\n");
  });

  // ─── TEST 6: Form Validation ──────────────────────────────────────────────
  test("TEST 6: Form Validation - Empty required fields", async ({ page }) => {
    log("## TEST 6: Form Validation");

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Navigate to new contract form
    await page.goto(`${BASE_URL}/${PROJECT_ID}/prime-contracts/new`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    log(`  URL: ${page.url()}`);

    const formVisible = await page.locator("form").isVisible().catch(() => false);
    log(`  Form visible: ${formVisible}`);

    const allLabels = await page.locator("label").allTextContents().catch(() => []);
    log(`  Form labels: ${allLabels.filter(Boolean).join(", ")}`);

    const allInputs = await page.locator("input, textarea, select").count();
    log(`  Form input count: ${allInputs}`);

    await page.screenshot({ path: "/tmp/prime-contracts-test6-empty.png", fullPage: true });
    log(`  Screenshot (empty form): /tmp/prime-contracts-test6-empty.png`);

    // Try submitting empty form
    const submitBtn = page.getByRole("button", { name: /create|save|submit/i }).first();
    const submitVisible = await submitBtn.isVisible().catch(() => false);
    log(`  Submit button visible: ${submitVisible}`);

    if (submitVisible) {
      await submitBtn.click();
      await page.waitForTimeout(1500);

      // Check for validation errors
      const validationErrors = await page.locator("[class*='error'], [aria-invalid='true'], [data-invalid]").allTextContents().catch(() => []);
      log(`  Validation error elements: ${validationErrors.filter(Boolean).length}`);
      validationErrors.filter(Boolean).forEach((e) => log(`    Validation: ${e.trim()}`));

      // Check for required field indicators
      const requiredFields = await page.locator("[required], [aria-required='true']").count();
      log(`  Required field indicators: ${requiredFields}`);

      // Check for toast with error
      const toastText = await page.locator("[data-sonner-toast]").first().textContent().catch(() => null);
      log(`  Toast message: ${toastText ?? "(none)"}`);

      await page.screenshot({ path: "/tmp/prime-contracts-test6-validation.png", fullPage: true });
      log(`  Screenshot (after empty submit): /tmp/prime-contracts-test6-validation.png`);
    }

    log(`  Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((e) => log(`    ERROR: ${e.substring(0, 200)}`));
    log("  RESULT: See findings above\n");
  });

  // ─── TEST 7: API Health Check ──────────────────────────────────────────────
  test("TEST 7: API Health - Direct API endpoint test", async ({ page }) => {
    log("## TEST 7: API Health Check");

    // Test the contracts API directly
    const response = await page.request.get(`${BASE_URL}/api/projects/${PROJECT_ID}/contracts`);
    log(`  GET /api/projects/${PROJECT_ID}/contracts status: ${response.status()}`);

    if (response.ok()) {
      const body = await response.json().catch(() => null);
      if (Array.isArray(body)) {
        log(`  Response: Array with ${body.length} items`);
        if (body.length > 0) {
          log(`  First item keys: ${Object.keys(body[0]).join(", ")}`);
          log(`  First item sample: ${JSON.stringify(body[0]).substring(0, 300)}`);
        }
      } else {
        log(`  Response type: ${typeof body}`);
        log(`  Response sample: ${JSON.stringify(body).substring(0, 300)}`);
      }
    } else {
      const text = await response.text().catch(() => "(cannot read)");
      log(`  Error response: ${text.substring(0, 500)}`);
    }

    // Test the single contract endpoint structure
    log(`  Testing contract detail endpoint format...`);
    const listResponse = await page.request.get(`${BASE_URL}/api/projects/${PROJECT_ID}/contracts`);
    if (listResponse.ok()) {
      const contracts = await listResponse.json().catch(() => []);
      if (Array.isArray(contracts) && contracts.length > 0) {
        const firstId = contracts[0].id;
        const detailResponse = await page.request.get(`${BASE_URL}/api/projects/${PROJECT_ID}/contracts/${firstId}`);
        log(`  GET /api/projects/${PROJECT_ID}/contracts/${firstId} status: ${detailResponse.status()}`);
        if (detailResponse.ok()) {
          const detail = await detailResponse.json().catch(() => null);
          log(`  Detail keys: ${detail ? Object.keys(detail).join(", ") : "(none)"}`);
        }
      }
    }

    log("  RESULT: See findings above\n");
  });

  // ─── SAVE FINDINGS ────────────────────────────────────────────────────────
  test.afterAll(async () => {
    FINDINGS.push("=== TEST RUN COMPLETE ===");
    FINDINGS.push(`Total findings: ${FINDINGS.length} log entries`);
    FINDINGS.push(`Completed: ${new Date().toISOString()}`);

    const outputDir = "/Users/meganharrison/Documents/github/alleato-procore/.claude/investigations/prime-contracts";
    fs.mkdirSync(outputDir, { recursive: true });

    const reportContent = `# Prime Contracts Live Test Report
Generated: ${new Date().toISOString()}
URL Tested: ${PRIME_CONTRACTS_URL}

${FINDINGS.join("\n")}
`;

    fs.writeFileSync(path.join(outputDir, "live-test.md"), reportContent, "utf-8");
    console.log(`\nReport saved to: ${path.join(outputDir, "live-test.md")}`);
  });
});
