import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.use({ storageState: 'tests/.auth/user.json' });

test.describe('Submittals smoke', () => {
  test.beforeAll(async () => {
    // Seed deterministic data; ensure env vars are set when running.
    // Example:
    // await execa('node', ['scripts/seed-submittals-smoke.js'], {
    //   env: {
    //     ...process.env,
    //     SUPABASE_URL: process.env.SUPABASE_URL,
    //     SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    //     SUBMITTALS_PROJECT_ID: process.env.SUBMITTALS_PROJECT_ID,
    //     SUBMITTALS_USER_ID: process.env.SUBMITTALS_USER_ID,
    //   },
    // });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/submittals`);
    await page.waitForLoadState('networkidle');
  });

  test('navigates tabs and respects Ball In Court filter', async ({ page }) => {
    await page.getByTestId('submittals-tab-items').click();
    await expect(page.getByTestId('submittals-table')).toBeVisible();

    await page.getByTestId('submittals-tab-ball-in-court').click();
    await expect(page.getByTestId('submittals-filter-chip')).toContainText(/Ball In Court/i);
  });

  test('dropdown actions are present', async ({ page }) => {
    await page.getByTestId('submittals-dropdown-create').click();
    await expect(page.getByTestId('submittals-create-submittal')).toBeVisible();
    await expect(page.getByTestId('submittals-create-package')).toBeVisible();

    await page.getByTestId('submittals-dropdown-export').click();
    await expect(page.getByTestId('submittals-export-csv')).toBeVisible();
    await expect(page.getByTestId('submittals-export-pdf')).toBeVisible();
    await expect(page.getByTestId('submittals-export-excel')).toBeVisible();
  });

  test('settings save and persist', async ({ page }) => {
    await page.goto(`/submittals/settings/general`);
    await page.waitForLoadState('networkidle');

    const numbering = page.getByTestId('submittals-numbering-prefix');
    await numbering.fill('SUB');
    await page.getByTestId('submittals-settings-save').click();
    await expect(page.getByText(/Settings saved/i)).toBeVisible();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('submittals-numbering-prefix')).toHaveValue('SUB');
  });
});
