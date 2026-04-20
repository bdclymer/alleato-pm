import { test, expect } from '@playwright/test';
import {
  addProjectMember,
  createProject,
  createSubcontract,
  deletePurchaseOrdersByProject,
  deleteSubcontractsByProject,
  getUserIdByEmail,
  listSubcontractsForProject,
} from '../../helpers/db';
import { cleanupProjectArtifacts } from '../../helpers/cleanup';
import { pollFor } from '../../helpers/poll';

const testUserEmail = process.env.PLAYWRIGHT_TEST_USER_EMAIL ?? 'test1@mail.com';
let projectId: number;

const makeNumber = (suffix: string) => `SC-SMOKE-${Date.now()}-${suffix}`;

test.describe.serial('Commitments Smoke', () => {
  test.beforeAll(async () => {
    const userId = await getUserIdByEmail(testUserEmail);
    projectId = await createProject(`E2E Commitments Smoke ${Date.now()}`);
    await addProjectMember(projectId, userId, 'admin');
  });

  test.afterAll(async () => {
    if (projectId) {
      await cleanupProjectArtifacts(projectId);
    }
  });

  test('list page loads and shows empty state', async ({ page }) => {
    await deleteSubcontractsByProject(projectId);
    await deletePurchaseOrdersByProject(projectId);

    await page.goto(`/${projectId}/commitments`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /commitments/i })).toBeVisible();

    const noData = page.getByText(/no commitments|no data/i);
    const rows = page.locator('tbody tr');
    const hasEmptyText = await noData.isVisible().catch(() => false);
    const rowCount = await rows.count().catch(() => 0);

    expect(hasEmptyText || rowCount === 0).toBe(true);
  });

  test('subcontract seeded in DB appears in list', async ({ page }) => {
    await deleteSubcontractsByProject(projectId);

    const subcontract = await createSubcontract({
      project_id: projectId,
      contract_number: makeNumber('LIST'),
      title: 'Smoke Subcontract',
      status: 'Draft',
      executed: false,
    });

    await page.goto(`/${projectId}/commitments`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(subcontract.contract_number)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Smoke Subcontract')).toBeVisible();
  });

  test('create subcontract form validates required fields', async ({ page }) => {
    await page.goto(`/${projectId}/commitments/new?type=subcontract`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#contractNumber')).toBeVisible({ timeout: 15000 });

    const submit = page.getByRole('button', { name: /create|save|submit/i });
    await submit.click();

    const errors = page.locator('.text-red-500, .text-destructive, [role="alert"], .text-red-600');
    await expect(errors.first()).toBeVisible();
  });

  test('create subcontract persists to database', async ({ page }) => {
    await deleteSubcontractsByProject(projectId);

    const number = makeNumber('CREATE');
    const title = `Smoke Created ${number}`;

    await page.goto(`/${projectId}/commitments/new?type=subcontract`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#contractNumber')).toBeVisible({ timeout: 15000 });

    await page.locator('#contractNumber').clear();
    await page.locator('#contractNumber').fill(number);
    await page.locator('#title').clear();
    await page.locator('#title').fill(title);

    await page.getByRole('button', { name: /create|save|submit/i }).click();

    await pollFor(
      () => listSubcontractsForProject(projectId),
      (rows) => {
        const created = rows.find((row) => row.title === title);
        expect(created).toBeTruthy();
      },
      20000,
    );
  });
});
