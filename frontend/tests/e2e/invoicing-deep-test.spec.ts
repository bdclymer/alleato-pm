import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test("Deep Test 3: Create - verify Owner Invoice navigates to form", async ({ page }) => {
  await page.goto(`${BASE_URL}/67/invoicing`, { waitUntil: "networkidle" });
  
  // Get initial URL
  const initialUrl = page.url();
  console.log("Initial URL:", initialUrl);
  
  // Click Create Invoice dropdown button
  await page.click("button:has-text('Create Invoice')");
  await page.waitForTimeout(500);
  
  // Get all menu items
  const menuItems = await page.locator("[role='menuitem']").allTextContents();
  console.log("Menu items:", menuItems);
  
  // Click Owner Invoice
  const ownerOption = page.locator("[role='menuitem']:has-text('Owner Invoice')");
  const ownerCount = await ownerOption.count();
  console.log("Owner Invoice option visible:", ownerCount);
  
  await ownerOption.click();
  await page.waitForTimeout(3000);
  
  const afterUrl = page.url();
  console.log("URL after clicking Owner Invoice:", afterUrl);
  console.log("Navigation happened:", afterUrl !== initialUrl);
  
  // Get page heading
  const h1 = await page.locator("h1").allTextContents();
  console.log("All h1 elements:", h1);
  
  // Check if a modal/dialog opened
  const dialogs = await page.locator("[role='dialog']").count();
  const modals = await page.locator(".modal, [data-radix-dialog]").count();
  const sheets = await page.locator("[data-radix-popper-content-wrapper]").count();
  console.log("Dialogs:", dialogs, "Modals:", modals, "Popper:", sheets);
});

test("Deep Test 4: Edit - click invoice row and verify edit UI", async ({ page }) => {
  await page.goto(`${BASE_URL}/67/invoicing`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  
  // Get all rows
  const rowCount = await page.locator("table tbody tr").count();
  console.log("Total rows:", rowCount);
  
  // Get first row content
  const firstRow = page.locator("table tbody tr").first();
  const rowText = await firstRow.textContent();
  console.log("First row text:", rowText?.substring(0, 150));
  
  // Get all buttons in first row
  const rowButtons = firstRow.locator("button");
  const rowButtonCount = await rowButtons.count();
  console.log("Buttons in row:", rowButtonCount);
  
  for (let i = 0; i < rowButtonCount; i++) {
    const btn = rowButtons.nth(i);
    const btnText = await btn.textContent();
    const ariaLabel = await btn.getAttribute("aria-label");
    const className = await btn.getAttribute("class");
    console.log(`Button ${i}: text="${btnText}" aria-label="${ariaLabel}" class="${className?.substring(0, 80)}"`);
  }
  
  // Find the "Open menu" button or three-dot button (last button in row)
  const lastButton = rowButtons.last();
  const lastBtnLabel = await lastButton.getAttribute("aria-label");
  console.log("Last button aria-label:", lastBtnLabel);
  
  // Click the last button (should be "Open menu")
  await lastButton.click();
  await page.waitForTimeout(500);
  
  // Check what appeared
  const menuItems = await page.locator("[role='menuitem']").allTextContents();
  console.log("Context menu items:", menuItems);
  
  // If we have menu items, try clicking "Edit"
  const editItem = page.locator("[role='menuitem']:has-text('Edit')");
  const editCount = await editItem.count();
  console.log("Edit menu item count:", editCount);
  
  if (editCount > 0) {
    await editItem.click();
    await page.waitForTimeout(2000);
    console.log("URL after edit:", page.url());
    
    // Look for edit form/sheet/dialog
    const dialogs = await page.locator("[role='dialog']").count();
    const sheets = await page.locator("[data-state='open']").count();
    console.log("Dialogs:", dialogs, "Open states:", sheets);
    
    const editHeading = await page.locator("h2, h3").allTextContents();
    console.log("Headings after edit click:", editHeading);
  }
});

test("Deep Test 5: Delete - trigger and verify confirmation", async ({ page }) => {
  await page.goto(`${BASE_URL}/67/invoicing`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  
  // Find a row with Draft status (deletable)
  // First, look for draft status in the rows
  const draftRows = page.locator("table tbody tr").filter({ hasText: "Draft" });
  const draftCount = await draftRows.count();
  console.log("Draft rows:", draftCount);
  
  if (draftCount > 0) {
    const firstDraftRow = draftRows.first();
    const draftText = await firstDraftRow.textContent();
    console.log("First draft row:", draftText?.substring(0, 120));
    
    // Get the last button in the draft row (should be Open menu)
    const menuBtn = firstDraftRow.locator("button").last();
    await menuBtn.click();
    await page.waitForTimeout(500);
    
    const menuItems = await page.locator("[role='menuitem']").allTextContents();
    console.log("Context menu items for draft row:", menuItems);
    
    // Look for Delete option
    const deleteItem = page.locator("[role='menuitem']:has-text('Delete')");
    const deleteCount = await deleteItem.count();
    console.log("Delete menu item:", deleteCount, deleteCount > 0 ? "(available)" : "(not found or disabled)");
    
    if (deleteCount > 0) {
      // Check if it's disabled
      const isDisabled = await deleteItem.getAttribute("aria-disabled") || await deleteItem.getAttribute("disabled");
      console.log("Delete disabled?", isDisabled);
      
      if (!isDisabled || isDisabled === "false") {
        await deleteItem.click();
        await page.waitForTimeout(1000);
        
        // Check for confirmation dialog
        const confirmDialogs = await page.locator("[role='alertdialog']").count();
        const confirmBtns = await page.locator("button:has-text('Delete'), button:has-text('Confirm'), button:has-text('Yes')").allTextContents();
        console.log("Alert dialogs:", confirmDialogs);
        console.log("Confirm buttons:", confirmBtns);
        
        // Cancel rather than actually deleting
        const cancelBtn = page.locator("button:has-text('Cancel')");
        if (await cancelBtn.count() > 0) {
          await cancelBtn.click();
          console.log("Cancelled delete - good, confirmation dialog appeared");
        }
      }
    }
  }
});

test("Deep Test: Invoice detail page directly", async ({ page }) => {
  // First find an invoice ID from the list
  const apiResponse = await page.request.get(`${BASE_URL}/api/projects/67/invoicing/owner`);
  const data = await apiResponse.json();
  console.log("API status:", apiResponse.status());
  console.log("Invoice count:", data.length || data.data?.length);
  
  if (data && data.length > 0) {
    const firstInvoice = data[0];
    console.log("First invoice:", JSON.stringify(firstInvoice).substring(0, 200));
    
    // Navigate to the detail page
    await page.goto(`${BASE_URL}/67/invoicing/${firstInvoice.id}`, { waitUntil: "networkidle" });
    console.log("Detail page URL:", page.url());
    
    const h1 = await page.locator("h1").first().textContent().catch(() => "");
    console.log("Detail h1:", h1);
    
    // Look for edit button/form
    const editBtns = await page.locator("button:has-text('Edit'), button:has-text('Save')").allTextContents();
    console.log("Edit buttons:", editBtns);
    
    // Check what's on the page
    const allBtns = await page.locator("button").allTextContents();
    console.log("All buttons:", allBtns.slice(0, 10));
  }
});
