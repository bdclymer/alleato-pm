import { test } from "@playwright/test";

test("budget validation seed", async ({ page }) => {
  await page.goto("http://localhost:3000/67/budget");
  await page.waitForLoadState("networkidle");
});
