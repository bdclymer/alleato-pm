import { test, expect } from "../fixtures/index";
import { createTestProject } from "../helpers/bootstrap";

let projectId: number;

test.describe("Budget Page - Display and Navigation", () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test("loads budget page and key controls", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/budget`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });

    const createButton = page.getByRole("button", { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 15000 });
  });
});
