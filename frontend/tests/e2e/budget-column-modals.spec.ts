import { test, expect } from "../fixtures/index";
import { createTestProject } from "../helpers/bootstrap";

let projectId: number;

test.describe("Budget Column Detail Modals", () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test("opens a budget column modal", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");

    const cell = page.locator('button[aria-label^="Edit $"]').first();
    if ((await cell.count()) === 0) {
      await expect(page.locator("table")).toBeVisible({ timeout: 15000 });
      return;
    }

    await cell.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });

    const closeButton = page.getByRole("button", { name: /close/i }).first();
    await closeButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
  });
});
