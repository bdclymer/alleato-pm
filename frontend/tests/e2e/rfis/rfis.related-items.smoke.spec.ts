import { test, expect } from "@playwright/test";

const PROJECT_ID = Number(process.env.E2E_PROJECT_ID ?? "67");

// Verifies the "Related Items" tab renders in entity detail pages.
// Added by the entity-relationships feature (claude/add-entity-relationships-dmUl4).
// Will FAIL until that branch is merged — that is expected before the merge.
test.describe("Related Items Panel Smoke", () => {
  test("RFI detail page has Related Items tab", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/rfis`);
    await page.waitForLoadState("domcontentloaded");

    const welcomeClose = page.getByRole("button", { name: /close welcome/i });
    if (await welcomeClose.isVisible()) await welcomeClose.click();

    const firstRow = page.getByRole("row").nth(1);
    if ((await firstRow.count()) === 0) {
      console.warn("No RFI rows found — skipping detail navigation");
      return;
    }

    await firstRow.click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("tab", { name: /related items/i })).toBeVisible();
  });

  test("Submittal detail page has Related Items tab", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/submittals`);
    await page.waitForLoadState("domcontentloaded");

    const welcomeClose = page.getByRole("button", { name: /close welcome/i });
    if (await welcomeClose.isVisible()) await welcomeClose.click();

    const firstRow = page.getByRole("row").nth(1);
    if ((await firstRow.count()) === 0) {
      console.warn("No Submittal rows found — skipping detail navigation");
      return;
    }

    await firstRow.click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("tab", { name: /related items/i })).toBeVisible();
  });
});
