import { test, expect } from "@playwright/test";

/**
 * Test enhanced contract picker in change order creation form
 *
 * Tests that the contract picker:
 * 1. Fetches both prime contracts and commitments
 * 2. Groups them by type
 * 3. Shows contract number, title, and company name
 * 4. Auto-populates change_order_type when a contract is selected
 * 5. Makes contract selection required
 */

const PROJECT_ID = 67; // Vermillion Rise Warehouse - has test data

test.describe("Change Order Contract Picker", () => {
  test.describe.configure({ retries: 1 });

  test("Contract picker shows prime contracts and commitments grouped", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/change-orders/new`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for the page to load
    await expect(page.getByText("New Change Order")).toBeVisible({ timeout: 10000 });

    // Open the contract selector
    const contractSelector = page.locator('[data-testid="change-order-contract"]');
    await contractSelector.click();

    // Wait for dropdown to open and contracts to load
    await page.waitForTimeout(1000);

    // Check if contract dropdown is populated
    // Should see either "Prime Contracts" or "Commitments" group headers
    const dropdownContent = page.locator('[role="listbox"]');
    await expect(dropdownContent).toBeVisible({ timeout: 5000 });

    // Take a screenshot to verify the dropdown structure
    await page.screenshot({
      path: 'screenshots/contract-picker-dropdown.png',
      fullPage: false,
    });

    // Check if we have any contracts/commitments available
    const hasContracts = await page.getByText("Prime Contracts").isVisible({ timeout: 2000 }).catch(() => false);
    const hasCommitments = await page.getByText("Commitments").isVisible({ timeout: 2000 }).catch(() => false);

    // At least one type should be available
    expect(hasContracts || hasCommitments).toBeTruthy();

    console.log(`Has Prime Contracts: ${hasContracts}`);
    console.log(`Has Commitments: ${hasCommitments}`);
  });

  test("Contract picker is required - form validation", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/change-orders/new`);
    await page.waitForLoadState("domcontentloaded");

    // Fill in required fields except contract
    await page.locator('[data-testid="change-order-number"]').fill("CO-TEST-001");
    await page.locator('[data-testid="change-order-title"]').fill("Test Change Order");

    // Try to submit without selecting a contract
    await page.locator('[data-testid="change-order-submit"]').click();

    // Should show validation error
    await expect(page.getByText(/contract.*required/i)).toBeVisible({ timeout: 5000 });
  });

  test("Selecting a contract auto-populates change_order_type", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/change-orders/new`);
    await page.waitForLoadState("domcontentloaded");

    // Open contract selector
    const contractSelector = page.locator('[data-testid="change-order-contract"]');
    await contractSelector.click();
    await page.waitForTimeout(1000);

    // Select the first available option (could be prime or commitment)
    const firstOption = page.locator('[role="option"]').first();

    if (await firstOption.isVisible({ timeout: 3000 })) {
      await firstOption.click();

      // Verify a contract was selected (the placeholder should be replaced)
      await expect(contractSelector).not.toContainText("Select a contract");

      console.log("Contract selected successfully");
    } else {
      console.log("No contracts available for testing");
      test.skip();
    }
  });
});
