/**
 * Targeted Live Test: Prime Contracts Feature
 * Bug Investigation Team - Live Tester
 * Focused tests to avoid timeouts and gather precise evidence.
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

// Shorter timeout for these tests
test.setTimeout(60000);

test.describe("Prime Contracts - Targeted Bug Investigation", () => {
  test.beforeAll(async () => {
    FINDINGS.length = 0;
    log("=== PRIME CONTRACTS TARGETED TEST ===");
    log(`URL: ${PRIME_CONTRACTS_URL}`);
    log(`Date: ${new Date().toISOString()}`);
    log("");
  });

  test("TEST 1: Page load and structure", async ({ page }) => {
    log("## TEST 1: Page Load");

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(PRIME_CONTRACTS_URL, { waitUntil: "networkidle", timeout: 30000 });

    const title = await page.getByRole("heading", { name: "Prime Contracts" }).isVisible();
    log(`  Title visible: ${title}`);

    const desc = await page.getByText("Manage prime contracts and owner agreements").isVisible();
    log(`  Description visible: ${desc}`);

    const newBtn = await page.getByRole("button", { name: "New Contract" }).isVisible();
    log(`  "New Contract" button visible: ${newBtn}`);

    const emptyState = await page.getByText("No contracts found").isVisible().catch(() => false);
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    log(`  Empty state: ${emptyState}, Table visible: ${hasTable}`);

    // Tabs
    const allContractsTab = await page.getByRole("button", { name: /All Contracts/i }).isVisible().catch(() => false);
    const approvedTab = await page.getByRole("button", { name: /Approved/i }).isVisible().catch(() => false);
    log(`  All Contracts tab: ${allContractsTab}, Approved tab: ${approvedTab}`);

    // Toolbar
    const searchBox = await page.locator('input[placeholder*="Search"]').isVisible().catch(() => false);
    log(`  Search box visible: ${searchBox}`);

    await page.screenshot({ path: "/tmp/pc-t1-page.png", fullPage: true });
    log(`  Screenshot: /tmp/pc-t1-page.png`);

    log(`  Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((e) => log(`    [ERR] ${e.slice(0, 200)}`));
    }

    expect(title).toBe(true);
    log("  RESULT: PASS\n");
  });

  test("TEST 2: New contract form fields audit", async ({ page }) => {
    log("## TEST 2: New Contract Form Audit");

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/${PROJECT_ID}/prime-contracts/new`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const heading = await page.getByRole("heading", { name: /New Prime Contract/i }).isVisible();
    log(`  Heading "New Prime Contract": ${heading}`);

    // Audit all form labels
    const labels = await page.locator("label, [class*='label']").allTextContents();
    log(`  Form labels found: ${labels.filter(Boolean).join(" | ")}`);

    // Required fields
    const contractNumField = page.getByRole("textbox", { name: /Contract #/ });
    const contractNumVisible = await contractNumField.isVisible();
    log(`  Contract # field: ${contractNumVisible}`);

    const titleField = page.locator('input[name="title"], [data-field="title"], #title').first();
    const titleByLabel = page.getByLabel("Title");
    const titleVisible = await titleByLabel.isVisible().catch(() => false) || await titleField.isVisible().catch(() => false);
    log(`  Title field: ${titleVisible}`);

    // All visible inputs
    const inputNames = await page.locator("input, textarea, select").evaluateAll((els) =>
      els.map((el) => {
        const input = el as HTMLInputElement;
        return `${input.tagName.toLowerCase()}[name="${input.name || input.id || "?"}"][type="${input.type || "text"}"]`;
      })
    );
    log(`  Input elements: ${inputNames.join(", ")}`);

    // Submit/Create button
    const createBtn = page.getByRole("button", { name: /^Create$/i });
    const createBtnVisible = await createBtn.isVisible();
    log(`  "Create" button visible: ${createBtnVisible}`);

    const cancelBtn = page.getByRole("button", { name: /Cancel/i });
    const cancelBtnVisible = await cancelBtn.isVisible();
    log(`  "Cancel" button visible: ${cancelBtnVisible}`);

    const autoFillBtn = page.getByRole("button", { name: /Auto-fill/i });
    const autoFillVisible = await autoFillBtn.isVisible().catch(() => false);
    log(`  "Auto-fill" button visible: ${autoFillVisible}`);

    await page.screenshot({ path: "/tmp/pc-t2-newform.png", fullPage: false });
    log(`  Screenshot: /tmp/pc-t2-newform.png`);

    log(`  Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((e) => log(`    [ERR] ${e.slice(0, 200)}`));
    log("  RESULT: COMPLETE\n");
  });

  test("TEST 3: Create contract with valid data - FULL FLOW", async ({ page }) => {
    log("## TEST 3: Create Contract Full Flow");

    const consoleErrors: string[] = [];
    const apiCalls: { method: string; url: string; status?: number }[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("response", (resp) => {
      if (resp.url().includes("/api/")) {
        apiCalls.push({ method: "?", url: resp.url(), status: resp.status() });
      }
    });

    await page.goto(`${BASE_URL}/${PROJECT_ID}/prime-contracts/new`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const TEST_NUM = `E2E-${Date.now().toString().slice(-6)}`;
    const TEST_TITLE = `E2E Test Contract ${new Date().toISOString().slice(0, 10)}`;

    // Fill Contract # field - using role since it has a label with asterisk
    const contractNumInput = page.getByRole("textbox", { name: /Contract #/i });
    if (await contractNumInput.isVisible()) {
      await contractNumInput.clear();
      await contractNumInput.fill(TEST_NUM);
      log(`  Filled Contract #: ${TEST_NUM}`);
    } else {
      log(`  WARNING: Contract # field not found by role`);
      // Try by placeholder
      const byPlaceholder = page.locator('input[placeholder]').first();
      if (await byPlaceholder.isVisible()) {
        await byPlaceholder.fill(TEST_NUM);
        log(`  Filled first input as fallback`);
      }
    }

    // Fill Title - look for input near the "Title" label
    const titleInput = page.locator('input').nth(1); // second input is usually title
    // Better: find by common name patterns
    const allInputs = page.locator('input[type="text"], input:not([type])');
    const inputCount = await allInputs.count();
    log(`  Text inputs count: ${inputCount}`);

    // Find title input specifically
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = allInputs.nth(i);
      const placeholder = await input.getAttribute("placeholder").catch(() => "");
      const name = await input.getAttribute("name").catch(() => "");
      const id = await input.getAttribute("id").catch(() => "");
      log(`    Input ${i}: name="${name}" id="${id}" placeholder="${placeholder}"`);
    }

    // Try filling title by finding the input after "Title" label
    const titleLabel = page.locator('label, [class*="label"]').filter({ hasText: /^Title/i });
    if (await titleLabel.isVisible().catch(() => false)) {
      const titleInputNearLabel = titleLabel.locator("+ * input, ~ * input").first();
      if (await titleInputNearLabel.isVisible().catch(() => false)) {
        await titleInputNearLabel.fill(TEST_TITLE);
        log(`  Filled Title (by label proximity): ${TEST_TITLE}`);
      }
    }

    // Check the current state of the form
    const contractNumValue = await contractNumInput.inputValue().catch(() => "(not found)");
    log(`  Contract # value: ${contractNumValue}`);

    await page.screenshot({ path: "/tmp/pc-t3-filled.png", fullPage: false });

    // Click Create button
    const createBtn = page.getByRole("button", { name: /^Create$/i });
    if (await createBtn.isVisible()) {
      log(`  Clicking Create button...`);
      await createBtn.click();
      await page.waitForTimeout(3000);

      const afterUrl = page.url();
      log(`  URL after Create click: ${afterUrl}`);

      // Check if we're still on /new page (submission failed/stayed)
      const stillOnNew = afterUrl.includes("/new");
      log(`  Still on /new page: ${stillOnNew}`);

      // Check for alert dialogs (critical: new/page.tsx uses alert() for errors)
      // This freezes browser in headless mode
      const alertDialog = page.locator("[role='alertdialog'], dialog").first();
      const alertVisible = await alertDialog.isVisible().catch(() => false);
      log(`  Alert dialog visible: ${alertVisible}`);

      // Check validation errors shown
      const errorParagraphs = await page.locator("p[class*='error'], [class*='error-message'], p").filter({ hasText: /required|invalid/i }).allTextContents();
      log(`  Validation error messages: ${errorParagraphs.join(", ")}`);

      // Check for success toast
      const toastEl = page.locator("[data-sonner-toast], [data-type='success']").first();
      const toastText = await toastEl.textContent().catch(() => null);
      log(`  Toast: ${toastText}`);

      // Check API calls
      const postCalls = apiCalls.filter((c) => c.url.includes("/contracts") && c.status !== undefined);
      postCalls.forEach((c) => log(`  API: ${c.url} -> ${c.status}`));
    } else {
      log(`  ERROR: "Create" button not visible`);
    }

    await page.screenshot({ path: "/tmp/pc-t3-after-submit.png", fullPage: true });
    log(`  Screenshot (after submit): /tmp/pc-t3-after-submit.png`);

    log(`  Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((e) => log(`    [ERR] ${e.slice(0, 200)}`));
    log("  RESULT: COMPLETE\n");
  });

  test("TEST 4: Form validation - empty submit", async ({ page }) => {
    log("## TEST 4: Form Validation");

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Intercept any native alert dialogs
    page.on("dialog", async (dialog) => {
      log(`  DIALOG (type=${dialog.type()}): ${dialog.message()}`);
      await dialog.accept();
    });

    await page.goto(`${BASE_URL}/${PROJECT_ID}/prime-contracts/new`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Click Create without filling anything
    const createBtn = page.getByRole("button", { name: /^Create$/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(2000);

      // Check inline validation errors
      const errorMessages = await page.locator("p, span, div").filter({ hasText: /required/i }).allTextContents();
      log(`  "Required" messages found: ${errorMessages.length}`);
      errorMessages.forEach((msg) => log(`    - ${msg.trim()}`));

      // Check ARIA invalid
      const invalidFields = await page.locator("[aria-invalid='true']").count();
      log(`  aria-invalid fields: ${invalidFields}`);

      // Check for validation error styling
      const errorStyled = await page.locator("[class*='error'], [class*='invalid'], [data-invalid]").count();
      log(`  Error-styled elements: ${errorStyled}`);
    }

    await page.screenshot({ path: "/tmp/pc-t4-validation.png", fullPage: false });
    log(`  Screenshot: /tmp/pc-t4-validation.png`);

    log(`  Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((e) => log(`    [ERR] ${e.slice(0, 200)}`));
    log("  RESULT: COMPLETE\n");
  });

  test("TEST 5: API endpoint audit", async ({ page }) => {
    log("## TEST 5: API Audit");

    // GET contracts
    const getResp = await page.request.get(`${BASE_URL}/api/projects/${PROJECT_ID}/contracts`);
    log(`  GET /api/projects/${PROJECT_ID}/contracts: ${getResp.status()}`);
    const getBody = await getResp.json().catch(() => null);
    if (Array.isArray(getBody)) {
      log(`  Contract count: ${getBody.length}`);
    } else {
      log(`  Response: ${JSON.stringify(getBody).slice(0, 200)}`);
    }

    // Try POST with minimal valid data
    const testContractNum = `API-TEST-${Date.now().toString().slice(-5)}`;
    const postResp = await page.request.post(`${BASE_URL}/api/projects/${PROJECT_ID}/contracts`, {
      data: {
        contract_number: testContractNum,
        title: "API Test Contract",
        status: "draft",
      },
    });
    log(`  POST /api/projects/${PROJECT_ID}/contracts: ${postResp.status()}`);

    if (postResp.ok()) {
      const created = await postResp.json().catch(() => null);
      log(`  Created contract ID: ${created?.id}`);
      log(`  Created contract keys: ${created ? Object.keys(created).join(", ") : "(none)"}`);

      // Clean up - delete the test contract
      if (created?.id) {
        const deleteResp = await page.request.delete(
          `${BASE_URL}/api/projects/${PROJECT_ID}/contracts/${created.id}`
        );
        log(`  DELETE cleanup: ${deleteResp.status()}`);
      }
    } else {
      const errorBody = await postResp.json().catch(() => null);
      log(`  POST error: ${JSON.stringify(errorBody).slice(0, 300)}`);
    }

    // Try POST with missing required fields (test API-level validation)
    const badPostResp = await page.request.post(`${BASE_URL}/api/projects/${PROJECT_ID}/contracts`, {
      data: {
        // No contract_number, no title
        status: "draft",
      },
    });
    log(`  POST (missing required fields): ${badPostResp.status()}`);
    const badBody = await badPostResp.json().catch(() => null);
    log(`  Bad POST response: ${JSON.stringify(badBody).slice(0, 200)}`);

    log("  RESULT: COMPLETE\n");
  });

  test("TEST 6: Contract detail page (after seeding data)", async ({ page }) => {
    log("## TEST 6: Contract Detail Page");

    // First seed a contract via API
    const createResp = await page.request.post(`${BASE_URL}/api/projects/${PROJECT_ID}/contracts`, {
      data: {
        contract_number: `DETAIL-TEST-${Date.now().toString().slice(-5)}`,
        title: "Detail Test Contract",
        status: "draft",
        description: "Created by automated test",
      },
    });

    if (!createResp.ok()) {
      log(`  Could not seed contract: ${createResp.status()}`);
      const err = await createResp.json().catch(() => null);
      log(`  Error: ${JSON.stringify(err)}`);
      log("  RESULT: SKIP (cannot seed data)\n");
      return;
    }

    const created = await createResp.json();
    log(`  Seeded contract ID: ${created.id}`);

    try {
      // Navigate to the list page - contract should appear
      await page.goto(PRIME_CONTRACTS_URL, { waitUntil: "networkidle", timeout: 30000 });

      const rowCount = await page.locator("tbody tr").count();
      log(`  Table rows after seeding: ${rowCount}`);

      // Check if our created contract is visible
      const contractVisible = await page.getByText("Detail Test Contract").isVisible().catch(() => false);
      log(`  Seeded contract visible in list: ${contractVisible}`);

      await page.screenshot({ path: "/tmp/pc-t6-list-with-data.png", fullPage: false });
      log(`  Screenshot (list with data): /tmp/pc-t6-list-with-data.png`);

      if (contractVisible) {
        // Click on the contract row
        await page.getByText("Detail Test Contract").click();
        await page.waitForTimeout(2000);

        const detailUrl = page.url();
        log(`  Detail page URL: ${detailUrl}`);
        log(`  Navigated to detail: ${detailUrl.includes(`/prime-contracts/${created.id}`)}`);

        // Check detail page content
        const detailTitle = await page.getByRole("heading").first().textContent().catch(() => null);
        log(`  Detail page heading: ${detailTitle}`);

        await page.screenshot({ path: "/tmp/pc-t6-detail.png", fullPage: false });
        log(`  Screenshot (detail page): /tmp/pc-t6-detail.png`);

        // Look for Edit button
        const editBtn = await page.getByRole("button", { name: /edit/i }).isVisible().catch(() => false);
        const editLink = await page.getByRole("link", { name: /edit/i }).isVisible().catch(() => false);
        log(`  Edit button: ${editBtn}, Edit link: ${editLink}`);
      }

      // Test row actions (hover to reveal)
      await page.goto(PRIME_CONTRACTS_URL, { waitUntil: "networkidle", timeout: 30000 });
      const firstRow = page.locator("tbody tr").first();
      if (await firstRow.isVisible()) {
        await firstRow.hover();
        await page.waitForTimeout(500);

        // Look for action buttons after hover
        const actionButtons = await page.locator("tbody tr:first-child button").allTextContents();
        log(`  Row action buttons (on hover): ${actionButtons.join(", ")}`);

        // Try the dropdown/context menu
        const moreBtn = page.locator("tbody tr:first-child [aria-haspopup='menu'], tbody tr:first-child [aria-label='More']").first();
        if (await moreBtn.isVisible().catch(() => false)) {
          await moreBtn.click();
          await page.waitForTimeout(500);
          const menuItems = await page.locator("[role='menuitem']").allTextContents();
          log(`  Context menu items: ${menuItems.join(", ")}`);
          // Close menu
          await page.keyboard.press("Escape");
        }
      }

    } finally {
      // Clean up test data
      const deleteResp = await page.request.delete(
        `${BASE_URL}/api/projects/${PROJECT_ID}/contracts/${created.id}`
      );
      log(`  Cleanup DELETE: ${deleteResp.status()}`);
    }

    log("  RESULT: COMPLETE\n");
  });

  test("TEST 7: Edit flow", async ({ page }) => {
    log("## TEST 7: Edit Flow");

    // Seed a contract
    const createResp = await page.request.post(`${BASE_URL}/api/projects/${PROJECT_ID}/contracts`, {
      data: {
        contract_number: `EDIT-TEST-${Date.now().toString().slice(-5)}`,
        title: "Edit Test Contract",
        status: "draft",
      },
    });

    if (!createResp.ok()) {
      log(`  Cannot seed data: ${createResp.status()}`);
      log("  RESULT: SKIP\n");
      return;
    }

    const created = await createResp.json();
    log(`  Seeded contract ID: ${created.id}`);

    try {
      // Navigate directly to edit page
      await page.goto(
        `${BASE_URL}/${PROJECT_ID}/prime-contracts/${created.id}/edit`,
        { waitUntil: "networkidle", timeout: 30000 }
      );

      const editUrl = page.url();
      log(`  Edit page URL: ${editUrl}`);

      const editHeading = await page.getByRole("heading").first().textContent().catch(() => null);
      log(`  Edit page heading: ${editHeading}`);

      const formVisible = await page.locator("form").isVisible().catch(() => false);
      log(`  Form visible on edit page: ${formVisible}`);

      // Check if form is pre-filled
      const contractNumValue = await page.getByRole("textbox", { name: /Contract #/i }).inputValue().catch(() => "(not found)");
      log(`  Contract # pre-filled: ${contractNumValue}`);

      const labels = await page.locator("label").allTextContents();
      log(`  Form labels: ${labels.filter(Boolean).join(" | ")}`);

      await page.screenshot({ path: "/tmp/pc-t7-edit.png", fullPage: false });
      log(`  Screenshot: /tmp/pc-t7-edit.png`);

      // Modify title
      const contractNumInput = page.getByRole("textbox", { name: /Contract #/i });
      if (await contractNumInput.isVisible()) {
        await contractNumInput.clear();
        await contractNumInput.fill("EDIT-MODIFIED");
      }

      // Look for Save button on edit page
      const saveBtn = page.getByRole("button", { name: /save|update/i }).first();
      const saveBtnVisible = await saveBtn.isVisible().catch(() => false);
      log(`  Save/Update button visible: ${saveBtnVisible}`);

      if (saveBtnVisible) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        log(`  URL after save: ${page.url()}`);
        const toast = await page.locator("[data-sonner-toast]").first().textContent().catch(() => null);
        log(`  Toast: ${toast}`);
      }

    } finally {
      const deleteResp = await page.request.delete(
        `${BASE_URL}/api/projects/${PROJECT_ID}/contracts/${created.id}`
      );
      log(`  Cleanup: ${deleteResp.status()}`);
    }

    log("  RESULT: COMPLETE\n");
  });

  test("TEST 8: Delete flow with confirmation dialog", async ({ page }) => {
    log("## TEST 8: Delete Flow");

    page.on("dialog", async (dialog) => {
      log(`  Native dialog (${dialog.type()}): ${dialog.message()}`);
      await dialog.dismiss();
    });

    // Seed a contract
    const createResp = await page.request.post(`${BASE_URL}/api/projects/${PROJECT_ID}/contracts`, {
      data: {
        contract_number: `DEL-TEST-${Date.now().toString().slice(-5)}`,
        title: "Delete Test Contract",
        status: "draft",
      },
    });

    if (!createResp.ok()) {
      log(`  Cannot seed data: ${createResp.status()}`);
      log("  RESULT: SKIP\n");
      return;
    }

    const created = await createResp.json();
    log(`  Seeded contract ID: ${created.id}`);

    let cleaned = false;
    try {
      await page.goto(PRIME_CONTRACTS_URL, { waitUntil: "networkidle", timeout: 30000 });

      const rows = await page.locator("tbody tr").count();
      log(`  Rows visible: ${rows}`);

      if (rows > 0) {
        // Hover first row and look for row actions
        const firstRow = page.locator("tbody tr").first();
        await firstRow.hover();
        await page.waitForTimeout(300);

        // Get all buttons in the row
        const rowButtons = firstRow.locator("button");
        const rowBtnCount = await rowButtons.count();
        log(`  Buttons in first row: ${rowBtnCount}`);

        // Try last button (usually the action/ellipsis menu)
        if (rowBtnCount > 0) {
          const lastBtn = rowButtons.last();
          await lastBtn.click();
          await page.waitForTimeout(500);

          // Look for delete option in dropdown
          const deleteMenuItem = page.getByRole("menuitem", { name: /delete/i });
          const deleteVisible = await deleteMenuItem.isVisible().catch(() => false);
          log(`  Delete menu item: ${deleteVisible}`);

          if (deleteVisible) {
            await deleteMenuItem.click();
            await page.waitForTimeout(500);

            // Check for confirmation dialog
            const confirmDialog = page.locator("[role='alertdialog']");
            const dialogVisible = await confirmDialog.isVisible().catch(() => false);
            log(`  Confirmation AlertDialog visible: ${dialogVisible}`);

            if (dialogVisible) {
              const dialogTitle = await confirmDialog.locator("h2, [class*='title']").first().textContent().catch(() => null);
              const dialogDesc = await confirmDialog.locator("[class*='description']").first().textContent().catch(() => null);
              log(`  Dialog title: ${dialogTitle}`);
              log(`  Dialog desc: ${dialogDesc}`);

              await page.screenshot({ path: "/tmp/pc-t8-delete-dialog.png" });
              log(`  Screenshot: /tmp/pc-t8-delete-dialog.png`);

              // Confirm delete
              const confirmBtn = confirmDialog.getByRole("button", { name: /delete contract/i });
              if (await confirmBtn.isVisible()) {
                await confirmBtn.click();
                await page.waitForTimeout(2000);
                const toast = await page.locator("[data-sonner-toast]").first().textContent().catch(() => null);
                log(`  Toast after delete: ${toast}`);
                cleaned = true;
              }

              // Dismiss if not confirmed
              const cancelBtn = confirmDialog.getByRole("button", { name: /cancel/i });
              if (await cancelBtn.isVisible().catch(() => false)) {
                await cancelBtn.click();
              }
            }
          } else {
            // Show all menu items
            const allMenuItems = await page.locator("[role='menuitem']").allTextContents();
            log(`  Menu items found: ${allMenuItems.join(", ")}`);
            await page.keyboard.press("Escape");
          }
        }
      }
    } finally {
      if (!cleaned) {
        const deleteResp = await page.request.delete(
          `${BASE_URL}/api/projects/${PROJECT_ID}/contracts/${created.id}`
        );
        log(`  Cleanup DELETE (fallback): ${deleteResp.status()}`);
      }
    }

    log("  RESULT: COMPLETE\n");
  });

  test.afterAll(async () => {
    FINDINGS.push("=== TEST COMPLETE ===");
    FINDINGS.push(`Completed: ${new Date().toISOString()}`);

    const outputDir = "/Users/meganharrison/Documents/github/alleato-procore/.claude/investigations/prime-contracts";
    fs.mkdirSync(outputDir, { recursive: true });

    const content = `# Prime Contracts Live Test Report
Generated: ${new Date().toISOString()}
URL Tested: ${PRIME_CONTRACTS_URL}

${FINDINGS.join("\n")}
`;
    fs.writeFileSync(path.join(outputDir, "live-test.md"), content, "utf-8");
    console.log(`\nReport saved.`);
  });
});
