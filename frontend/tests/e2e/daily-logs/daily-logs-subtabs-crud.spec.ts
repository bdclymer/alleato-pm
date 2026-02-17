import { test, expect } from "@playwright/test";

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function getFirstProjectId(request: any, baseURL: string) {
  const resp = await request.get(`${baseURL}/api/projects?limit=1&archived=false`);
  const json = await resp.json();
  return json?.data?.[0]?.id;
}

test.describe("Daily Logs Subtabs CRUD", () => {
  test("create manpower, equipment, note then delete via log", async ({ page, request, baseURL }) => {
    const projectId = await getFirstProjectId(request, baseURL!);
    test.skip(!projectId, "No project available for testing");
    const today = ymd(new Date());

    // Go to page and create log via server form
    await page.goto(`/${projectId}/daily-log`);
    await page.waitForLoadState('networkidle');
    await page.locator('form:has(input[name="log_date"]) input[name="log_date"]').fill(today);
    await page.locator('form:has(input[name="log_date"]) button[type="submit"]').click();
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Manpower
    await page.getByRole('tab', { name: 'Manpower' }).click();
    await page.locator('form:has(select[name="daily_log_id"]) select[name="daily_log_id"]').selectOption({ label: today });
    await page.locator('form:has(select[name="daily_log_id"]) input[name="trade"]').fill('Carpenters');
    await page.locator('form:has(select[name="daily_log_id"]) input[name="workers_count"]').fill('2');
    await page.locator('form:has(select[name="daily_log_id"]) button[type="submit"]').click();
    await page.reload();
    await page.getByRole('tab', { name: 'Manpower' }).click();
    expect(await page.locator('text=Carpenters').count()).toBeGreaterThan(0);

    // Equipment
    await page.getByRole('tab', { name: 'Equipment' }).click();
    await page.locator('form:has(select[name="daily_log_id"]) select[name="daily_log_id"]').selectOption({ label: today });
    await page.locator('form:has(select[name="daily_log_id"]) input[name="equipment_name"]').fill('Loader');
    await page.locator('form:has(select[name="daily_log_id"]) button[type="submit"]').click();
    await page.reload();
    await page.getByRole('tab', { name: 'Equipment' }).click();
    expect(await page.locator('text=Loader').count()).toBeGreaterThan(0);

    // Notes
    await page.getByRole('tab', { name: 'Notes' }).click();
    await page.locator('form:has(select[name="daily_log_id"]) select[name="daily_log_id"]').selectOption({ label: today });
    await page.locator('form:has(select[name="daily_log_id"]) input[name="description"]').fill('Site clean');
    await page.locator('form:has(select[name="daily_log_id"]) button[type="submit"]').click();
    await page.reload();
    await page.getByRole('tab', { name: 'Notes' }).click();
    expect(await page.locator('text=Site clean').count()).toBeGreaterThan(0);

    // Delete the log (cascades children) and verify removal
    await page.getByRole('tab', { name: 'Logs' }).click();
    const firstActions = page.locator('table').locator('button[aria-label="Row actions"]').first();
    await firstActions.click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    await page.reload();
    await page.waitForLoadState('networkidle');
    const remainingRows = await page.locator(`tr:has-text("${today}")`).count();
    expect(remainingRows).toBe(0);

    await page.getByRole('tab', { name: 'Manpower' }).click();
    expect(await page.locator('text=Carpenters').count()).toBe(0);
    await page.getByRole('tab', { name: 'Equipment' }).click();
    expect(await page.locator('text=Loader').count()).toBe(0);
    await page.getByRole('tab', { name: 'Notes' }).click();
    expect(await page.locator('text=Site clean').count()).toBe(0);
  });
});
