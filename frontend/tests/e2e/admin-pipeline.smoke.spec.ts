import { test, expect } from "@playwright/test";

test.describe("Feedback Inbox Smoke", () => {
  test("feedback inbox renders with Open and All filter tabs", async ({ page }) => {
    await page.goto("/feedback-inbox");
    await page.waitForLoadState("domcontentloaded");

    const welcomeClose = page.getByRole("button", { name: /close welcome/i });
    if (await welcomeClose.isVisible()) await welcomeClose.click();

    await expect(page.getByText("Feedback Inbox").first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /open/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /all/i })).toBeVisible();
  });

  test("clicking Open tab does not crash the page", async ({ page }) => {
    await page.goto("/feedback-inbox");
    await page.waitForLoadState("domcontentloaded");

    const welcomeClose = page.getByRole("button", { name: /close welcome/i });
    if (await welcomeClose.isVisible()) await welcomeClose.click();

    await page.getByRole("tab", { name: /open/i }).click();
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });
});
