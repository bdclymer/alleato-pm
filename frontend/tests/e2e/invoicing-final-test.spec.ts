import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test("Final Test 3: Create Owner Invoice - verifies /new bug", async ({ page }) => {
  await page.goto(`${BASE_URL}/67/invoicing`, { waitUntil: "networkidle" });
  
  // Click Create Invoice dropdown
  await page.click("button:has-text('Create Invoice')");
  await page.waitForTimeout(500);
  
  // Click Owner Invoice
  await page.locator("[role='menuitem']:has-text('Owner Invoice')").click();
  await page.waitForTimeout(3000);
  
  const url = page.url();
  console.log("URL after Owner Invoice click:", url);
  
  // What heading did we get?
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  console.log("H1:", h1);
  
  // Did we stay on invoicing (BUG: router.push ignored in dropdown)
  // OR did we navigate to /new?
  if (url.includes("/invoicing/new")) {
    console.log("NAVIGATED to /new - checking what happened with invoiceId=NaN");
    // The invoiceId param would be "new" which parseInt gives NaN
    // The page should show an error since NaN is not a valid invoice ID
    const errorText = await page.locator("body").textContent();
    console.log("Page has error?", errorText?.includes("not found") || errorText?.includes("error") || errorText?.includes("Error"));
  } else if (url.includes("/invoicing") && !url.includes("/new")) {
    console.log("BUG CONFIRMED: Stayed on /invoicing list page - no navigation happened");
    console.log("The router.push inside DropdownMenuItem onClick may be blocked");
  }
});

test("Final Test 3b: Create via direct /new URL", async ({ page }) => {
  // Directly test what /invoicing/new renders
  await page.goto(`${BASE_URL}/67/invoicing/new`, { waitUntil: "networkidle" });
  
  const url = page.url();
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  const bodyText = await page.locator("body").textContent();
  
  console.log("URL at /new:", url);
  console.log("H1:", h1);
  console.log("Has error message:", bodyText?.includes("not found") || bodyText?.includes("Invalid") || bodyText?.includes("Error") || bodyText?.includes("error"));
  console.log("Body preview:", bodyText?.substring(0, 300));
});

test("Final Test 4: Edit via row actions", async ({ page }) => {
  await page.goto(`${BASE_URL}/67/invoicing`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  
  // Click the "Open menu" button in the first row  
  const firstRow = page.locator("table tbody tr").first();
  const menuBtn = firstRow.locator("button:has-text('Open menu')");
  await menuBtn.click();
  await page.waitForTimeout(500);
  
  // Click "Edit"
  await page.locator("[role='menuitem']:has-text('Edit')").click();
  await page.waitForTimeout(3000);
  
  const url = page.url();
  console.log("URL after Edit click:", url);
  // Should navigate to /67/invoicing/{invoiceId}
  
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  console.log("H1:", h1);
  
  // Look for edit-related UI
  const editBtns = await page.locator("button:has-text('Edit'), button:has-text('Save Changes'), button:has-text('Submit for Approval')").allTextContents();
  console.log("Edit-related buttons:", editBtns);
  
  // Does it show the invoice detail page?
  if (url.includes("/invoicing/") && !url.endsWith("/invoicing")) {
    console.log("PASS: Navigated to invoice detail page");
    // Click Edit button to open the slideover
    const editBtn = page.locator("button:has-text('Edit')");
    const editCount = await editBtn.count();
    if (editCount > 0) {
      await editBtn.first().click();
      await page.waitForTimeout(1000);
      
      const slideoverTitle = await page.locator("h2, [role='dialog'] h2, [data-radix-sheet] h2").allTextContents();
      console.log("Slideover titles:", slideoverTitle);
      
      const formFields = await page.locator("input, select, textarea").count();
      console.log("Form fields visible:", formFields);
    }
  }
});

test("Final Test 5: Delete with confirmation", async ({ page }) => {
  await page.goto(`${BASE_URL}/67/invoicing`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  
  // Find row count before
  const initialCount = await page.locator("table tbody tr").count();
  console.log("Initial row count:", initialCount);
  
  // Click the "Open menu" button in the first row
  const firstRow = page.locator("table tbody tr").first();
  const rowText = await firstRow.textContent();
  console.log("First row content:", rowText?.substring(0, 100));
  
  const menuBtn = firstRow.locator("button:has-text('Open menu')");
  await menuBtn.click();
  await page.waitForTimeout(500);
  
  // Click "Delete"
  await page.locator("[role='menuitem']:has-text('Delete')").click();
  await page.waitForTimeout(500);
  
  // Confirmation dialog should appear
  const alertDialog = page.locator("[role='alertdialog']");
  const dialogCount = await alertDialog.count();
  console.log("Alert dialog appeared:", dialogCount > 0);
  
  if (dialogCount > 0) {
    const dialogText = await alertDialog.textContent();
    console.log("Dialog text:", dialogText?.substring(0, 200));
    
    // Click Cancel to avoid actually deleting
    await page.locator("button:has-text('Cancel')").click();
    await page.waitForTimeout(500);
    
    // Verify dialog closed and data unchanged
    const dialogAfter = await page.locator("[role='alertdialog']").count();
    console.log("Dialog closed after cancel:", dialogAfter === 0);
    
    console.log("PASS: Delete shows confirmation dialog with cancel option");
  }
});

test("Final Test 6: Invoice /new URL behavior", async ({ page }) => {
  // Test the route /67/invoicing/new specifically
  await page.goto(`${BASE_URL}/67/invoicing/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  
  const url = page.url();
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  
  console.log("URL:", url);
  console.log("H1:", h1);
  
  // Get all text visible 
  const visibleText = await page.locator("main, body").first().textContent();
  console.log("Visible text:", visibleText?.substring(0, 400));
  
  // Check for error state vs. form
  const hasError = visibleText?.includes("Failed to fetch") || visibleText?.includes("not found") || visibleText?.includes("error");
  const hasForm = await page.locator("form").count() > 0;
  const hasCreateBtn = await page.locator("button:has-text('Create'), button:has-text('Submit'), input[type='submit']").count() > 0;
  
  console.log("Has error:", hasError);
  console.log("Has form:", hasForm);
  console.log("Has create/submit button:", hasCreateBtn);
  
  if (hasError) {
    console.log("BUG: /invoicing/new shows error state because invoiceId='new' parses to NaN");
  } else if (hasForm) {
    console.log("Has a create form at /new");
  } else {
    console.log("Unknown state at /new - likely loading error or blank page");
  }
});
