import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const PID = 67;
// NOTE: Do NOT use test.setTimeout() here.
// The playwright.config.live-verify.ts sets timeout: 120000 (2 minutes).
// Previously, test.setTimeout(60000) caused Test 1 to forcibly close the page
// mid-teardown, corrupting the browser context so Test 2 got
// "Target page, context or browser has been closed".

/**
 * Wait for DOM to fully stabilise on invoicing/new ("use client" page).
 *
 * WHY networkidle DOESN'T WORK:
 *   Next.js dev server keeps HMR WebSocket open → networkidle never fires.
 *
 * WHY domcontentloaded ALONE ISN'T ENOUGH:
 *   Two async loading states fire after mount:
 *   1. ProjectProvider.isLoading → header skeleton ↔ project name swap
 *   2. isLoadingContracts → Contract Select disabled ↔ enabled toggle
 *   Both cause DOM mutations → Playwright "stable" check never passes.
 *
 * SOLUTION:
 *   Navigate with domcontentloaded, then wait for the Contract SelectTrigger
 *   (first combobox in DOM) to become enabled.  It starts disabled when
 *   isLoadingContracts=true and becomes enabled when the contracts fetch
 *   completes.  At that point both loading states are resolved → DOM stable.
 */
async function waitForPageStable(page: Page): Promise<void> {
  const contractSelect = page.getByRole("combobox").first();
  await expect(contractSelect).toBeEnabled({ timeout: 15000 });
  // 500ms buffer: lets any remaining ProjectProvider render cycle flush
  await page.waitForTimeout(500);
}

// ─── Test 1 ────────────────────────────────────────────────────────────────

test("Invoicing: create invoice page renders form correctly", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  console.log("Navigating to invoicing/new...");
  await page.goto(`${BASE}/${PID}/invoicing/new`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  console.log("DOMContentLoaded, URL:", page.url());

  // Must not redirect to login
  expect(page.url()).not.toContain("/auth/login");
  expect(page.url()).toContain("/invoicing/new");

  // Wait for both loading states to resolve → DOM fully stable
  await waitForPageStable(page);
  // Confirm we are still on the correct page (no unexpected navigation)
  expect(page.url()).toContain("/invoicing/new");
  console.log("✓ DOM stable");

  // Heading — rendered by ProjectPageHeader title prop, not the dynamic project name
  await expect(page.getByText("Create Owner Invoice")).toBeVisible({
    timeout: 10000,
  });
  console.log("✓ Heading visible");

  // Must NOT show the old bug (loading spinner that leaked from [invoiceId] page)
  await expect(page.getByText("Loading invoice...")).not.toBeVisible();
  console.log("✓ No stale loading spinner");

  // Contract field: label element check (avoids ambiguous getByText matches)
  await expect(
    page.locator("label").filter({ hasText: "Contract" }).first()
  ).toBeVisible({ timeout: 10000 });
  console.log("✓ Contract label visible");

  // Contract Select is enabled (contracts successfully fetched)
  await expect(page.getByRole("combobox").first()).toBeEnabled({
    timeout: 5000,
  });
  console.log("✓ Contract select enabled");

  // Submit button
  const createBtn = page.getByRole("button", { name: /create invoice/i });
  await expect(createBtn).toBeVisible({ timeout: 10000 });
  await expect(createBtn).toBeEnabled();
  console.log("✓ Create Invoice button visible and enabled");

  if (consoleErrors.length > 0) {
    console.log("Console errors:", consoleErrors);
  }

  console.log("✅ PASS: Create invoice page renders form correctly");
});

// ─── Test 2 ────────────────────────────────────────────────────────────────

test("Invoicing: form validation requires contract selection", async ({
  page,
}) => {
  console.log("Navigating to invoicing/new...");
  await page.goto(`${BASE}/${PID}/invoicing/new`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  console.log("DOMContentLoaded, URL:", page.url());

  expect(page.url()).not.toContain("/auth/login");

  // Wait for DOM stability (contracts loaded, layout settled)
  await waitForPageStable(page);
  expect(page.url()).toContain("/invoicing/new");
  console.log("✓ DOM stable");

  // Find and click submit without selecting a contract
  const submitBtn = page.getByRole("button", { name: /create invoice/i });
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
  await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  await submitBtn.click();
  console.log("✓ Clicked submit (no contract selected)");

  // React Hook Form + Zod validation should surface an error
  const contractError = page.getByText(/contract is required/i);
  await expect(contractError).toBeVisible({ timeout: 10000 });
  console.log("✓ Validation error shown: 'Contract is required'");

  console.log("✅ PASS: Form validation works");
});
