import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test("Invoice detail page - check edit button visibility", async ({ page }) => {
  // Navigate directly to invoice 116
  await page.goto(`${BASE_URL}/67/invoicing/116`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  
  const url = page.url();
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  console.log("URL:", url);
  console.log("H1:", h1);
  
  // Look for all buttons
  const allBtns = await page.locator("button").allTextContents();
  console.log("All buttons:", allBtns);
  
  // Look for status
  const statusText = await page.locator("[data-status], .badge, .status-badge, span[class*='badge']").allTextContents();
  console.log("Status elements:", statusText);
  
  // Check for invoice details
  const cardTitles = await page.locator("h2, h3").allTextContents();
  console.log("Card titles:", cardTitles);
  
  // Look for the page content more broadly
  const bodyVisible = await page.locator("main").textContent();
  console.log("Main content (200 chars):", bodyVisible?.substring(0, 200));
  
  // Check for edit button
  const editBtn = page.locator("button:has-text('Edit')");
  const editCount = await editBtn.count();
  console.log("Edit buttons:", editCount);
  
  // Click edit and check for slideover
  if (editCount > 0) {
    await editBtn.click();
    await page.waitForTimeout(1000);
    
    // Check for slideover/sheet/dialog
    const slideoverOpen = await page.locator("[data-state='open']").count();
    const dialogOpen = await page.locator("[role='dialog'][data-state='open']").count();
    console.log("Open data-state elements:", slideoverOpen);
    console.log("Open dialogs:", dialogOpen);
    
    // Get form fields
    const inputFields = await page.locator("input:visible").count();
    const selectFields = await page.locator("select:visible, [role='combobox']:visible").count();
    console.log("Visible inputs:", inputFields);
    console.log("Visible selects:", selectFields);
    
    if (inputFields > 0) {
      console.log("PASS: Edit slideover opened with form fields");
    }
  }
});
