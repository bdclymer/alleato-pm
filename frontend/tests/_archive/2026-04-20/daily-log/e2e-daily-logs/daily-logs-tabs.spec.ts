import { test, expect } from "@playwright/test";

async function getFirstProjectId(request: any, baseURL: string) {
  const resp = await request.get(`${baseURL}/api/projects?limit=1&archived=false`);
  const json = await resp.json();
  const id = json?.data?.[0]?.id;
  return id;
}

test.describe("Daily Logs Tabs", () => {
  test("project-scoped tabs render and create buttons visible", async ({ page, request, baseURL }) => {
    const projectId = await getFirstProjectId(request, baseURL!);
    test.skip(!projectId, "No project available for testing");

    await page.goto(`/${projectId}/daily-log`);
    await page.waitForLoadState("networkidle");

    // Tabs present
    await expect(page.getByRole('tab', { name: 'Logs' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Manpower' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Equipment' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Notes' })).toBeVisible();

    // Manpower tab actions
    await page.getByRole('tab', { name: 'Manpower' }).click();
    await expect(page.getByRole('button', { name: 'Add Manpower' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();

    // Equipment tab actions
    await page.getByRole('tab', { name: 'Equipment' }).click();
    await expect(page.getByRole('button', { name: 'Add Equipment' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();

    // Notes tab actions
    await page.getByRole('tab', { name: 'Notes' }).click();
    await expect(page.getByRole('button', { name: 'Add Note' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();
  });
});

