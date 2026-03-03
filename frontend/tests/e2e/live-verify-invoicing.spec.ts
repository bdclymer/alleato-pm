import { test, expect, Page } from "@playwright/test";

// Use auth state from user.json
test.use({ storageState: "./tests/.auth/user.json" });

const BASE_URL = "http://localhost:3000";
const PROJECT_ID = 67;

test.describe("Invoicing - Live Verification", () => {
  
  test("Test 1: Invoicing list page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/${PROJECT_ID}/invoicing`);
    await page.waitForLoadState("domcontentloaded");
    
    // Should not redirect to login
    expect(page.url()).not.toContain("/auth/login");
    
    // Should show invoicing heading
    const heading = page.getByRole("heading", { name: /invoicing/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    
    console.log("URL:", page.url());
    console.log("PASS: Invoicing list page loaded");
  });

  test("Test 3: Create Invoice page loads (new/page.tsx)", async ({ page }) => {
    await page.goto(`${BASE_URL}/${PROJECT_ID}/invoicing/new`);
    await page.waitForLoadState("domcontentloaded");
    
    // Should not redirect to login
    expect(page.url()).not.toContain("/auth/login");
    expect(page.url()).not.toContain(`/${PROJECT_ID}/invoicing?`);
    
    // Should show "Create Owner Invoice" heading
    const heading = page.getByRole("heading", { name: /create owner invoice/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    
    // Should have contract select
    const contractLabel = page.getByText("Contract *");
    await expect(contractLabel).toBeVisible();
    
    // Should have status field
    const statusLabel = page.getByText("Status");
    await expect(statusLabel).toBeVisible();
    
    // Should NOT show "Loading invoice..." 
    const loadingText = page.getByText("Loading invoice...");
    await expect(loadingText).not.toBeVisible();
    
    // Create Invoice button should be present
    const createBtn = page.getByRole("button", { name: /create invoice/i });
    await expect(createBtn).toBeVisible();
    
    console.log("PASS: Create invoice page (new/page.tsx) renders correctly");
  });

  test("Test 6: Form Validation", async ({ page }) => {
    await page.goto(`${BASE_URL}/${PROJECT_ID}/invoicing/new`);
    await page.waitForLoadState("domcontentloaded");
    
    // Wait for form to be ready
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    
    // Try to submit without required field
    await page.click('button[type="submit"]');
    
    // Should show validation error for contract
    const errorMsg = page.getByText(/contract is required/i);
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    
    console.log("PASS: Form validation works");
  });
});
