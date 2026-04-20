import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREEN_DIR = path.join(__dirname, "../screenshots/daily-logs-e2e");

test.beforeAll(() => {
  if (!fs.existsSync(SCREEN_DIR)) {
    fs.mkdirSync(SCREEN_DIR, { recursive: true });
  }
});

test.describe("Daily Logs", () => {
  test("/daily-log list has core controls and renders", async ({ page }) => {
    await page.goto("/daily-log");
    await page.waitForLoadState("networkidle");

    // Search input exists
    const search = page.locator('input[placeholder*="Search" i]').first();
    await expect(search).toBeVisible();

    // Columns toggle exists
    const columnsBtn = page.locator('button:has-text("Columns")').first();
    await expect(columnsBtn).toBeVisible();

    // Export exists
    const exportBtn = page.locator('button:has-text("Export")').first();
    await expect(exportBtn).toBeVisible();

    // Add/Create button exists
    const addBtn = page.locator('button:has-text("Create Log Entry")').first();
    await expect(addBtn).toBeVisible();

    // Table or empty state present
    const hasTable = (await page.locator("table").count()) > 0;
    const hasEmpty = (await page.locator('text=/No .* found/i').count()) > 0;
    expect(hasTable || hasEmpty).toBeTruthy();

    await page.screenshot({ path: path.join(SCREEN_DIR, "01-daily-log-list.png"), fullPage: true });
  });
});

