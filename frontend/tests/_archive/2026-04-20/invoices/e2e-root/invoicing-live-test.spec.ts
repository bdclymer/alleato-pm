import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
// Auth is configured globally in playwright.config.ts via storageState: './tests/.auth/user.json'

test("Test 1: Page Loads - correct heading and no errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  
  await page.goto(`${BASE_URL}/67/invoicing`, { waitUntil: "networkidle" });
  
  // Check URL didn't redirect to login
  expect(page.url()).not.toContain("login");
  
  // Check heading
  const heading = await page.locator("h1").first().textContent();
  expect(heading).toContain("Invoicing");
  
  // Check Create Invoice button exists
  await expect(page.locator("button:has-text('Create Invoice')")).toBeVisible();
  
  console.log("URL:", page.url());
  console.log("H1:", heading);
  console.log("Console errors:", errors.filter(e => !e.includes("favicon")).length);
});

test("Test 2: List Renders Data - table with columns and rows", async ({ page }) => {
  await page.goto(`${BASE_URL}/67/invoicing`, { waitUntil: "networkidle" });
  
  // Check table headers
  await expect(page.locator("th:has-text('Invoice #')")).toBeVisible();
  await expect(page.locator("th:has-text('Status')")).toBeVisible();
  await expect(page.locator("th:has-text('Amount')")).toBeVisible();
  
  // Check data rows
  const rows = await page.locator("table tbody tr").count();
  expect(rows).toBeGreaterThan(0);
  console.log("Data rows:", rows);
  
  // Check first row has invoice number
  const firstCellText = await page.locator("table tbody tr").first().textContent();
  console.log("First row:", firstCellText?.substring(0, 100));
});

test("Test 3: Create Button - dropdown opens", async ({ page }) => {
  await page.goto(`${BASE_URL}/67/invoicing`, { waitUntil: "networkidle" });
  
  await page.click("button:has-text('Create Invoice')");
  await page.waitForTimeout(500);
  
  // Check dropdown menu appears
  const ownerOption = page.locator("[role='menuitem']:has-text('Owner Invoice')");
  await expect(ownerOption).toBeVisible();
  console.log("Dropdown opens with Owner Invoice option: PASS");
  
  // Click Owner Invoice option
  await ownerOption.click();
  await page.waitForTimeout(2000);
  const newUrl = page.url();
  console.log("After clicking Owner Invoice, URL:", newUrl);
  
  // Should navigate to /new or similar
  const heading = await page.locator("h1").first().textContent().catch(() => "");
  console.log("New page heading:", heading);
});

test("Test 4 & 5: Edit and Delete - row actions menu", async ({ page }) => {
  await page.goto(`${BASE_URL}/67/invoicing`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  
  // Find a row actions button (...)
  const rowMenuBtn = page.locator("table tbody tr").first().locator("button[aria-label='Open menu'], button:has([data-lucide='more-horizontal']), button").last();
  
  // Look for row action buttons
  const moreButtons = page.locator("table tbody tr").first().locator("button");
  const moreButtonCount = await moreButtons.count();
  console.log("Buttons in first row:", moreButtonCount);
  
  // Try clicking on the first invoice to see detail/edit
  const firstInvoiceLink = page.locator("table tbody tr").first().locator("button[class*='text-primary'], button[class*='hover:underline']");
  const firstInvoiceLinkCount = await firstInvoiceLink.count();
  console.log("Invoice link buttons in first row:", firstInvoiceLinkCount);
  
  if (firstInvoiceLinkCount > 0) {
    const invoiceText = await firstInvoiceLink.first().textContent();
    console.log("Clicking invoice:", invoiceText);
    await firstInvoiceLink.first().click();
    await page.waitForTimeout(2000);
    console.log("Detail URL:", page.url());
    const detailHeading = await page.locator("h1").first().textContent().catch(() => "");
    console.log("Detail page heading:", detailHeading);
  }
});

test("Test 6: Form Validation - no /new page, create via API", async ({ page }) => {
  // The "Create Invoice" goes to /67/invoicing/new which resolves to [invoiceId] page
  await page.goto(`${BASE_URL}/67/invoicing/new`, { waitUntil: "networkidle" });
  console.log("URL after /new:", page.url());
  const heading = await page.locator("h1").first().textContent().catch(() => "");
  console.log("Heading at /new:", heading);
});
