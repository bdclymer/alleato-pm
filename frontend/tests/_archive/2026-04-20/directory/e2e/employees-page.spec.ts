import { test, expect, type Page } from '@playwright/test';

const EMPLOYEES_PATH = '/directory/employees';

type PageState = 'directory' | 'login' | 'notfound' | 'unknown';

async function gotoWithRetry(page: Page, path: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15000 });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTransientNavigationError =
        message.includes('ERR_CONNECTION_REFUSED') || message.includes('ERR_EMPTY_RESPONSE');
      if (!isTransientNavigationError || attempt === 3) {
        throw error;
      }
      await page.waitForTimeout(1000);
    }
  }
}

async function detectPageState(page: Page): Promise<PageState> {
  const hasDirectoryHeading = await page.getByRole('heading', { name: 'Directory' }).isVisible().catch(() => false);
  if (hasDirectoryHeading) return 'directory';

  const hasLogin = await page.getByRole('button', { name: 'Login' }).isVisible().catch(() => false);
  const hasEmail = await page.getByRole('textbox', { name: 'Email' }).isVisible().catch(() => false);
  if (hasLogin && hasEmail) return 'login';

  const has404 = await page.getByRole('heading', { name: '404' }).isVisible().catch(() => false);
  if (has404) return 'notfound';

  return 'unknown';
}

async function waitForPageState(page: Page): Promise<PageState> {
  for (let i = 0; i < 10; i++) {
    const state = await detectPageState(page);
    if (state !== 'unknown') return state;
    await page.waitForTimeout(500);
  }
  return 'unknown';
}

test.describe('Employees Page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithRetry(page, EMPLOYEES_PATH);
    await page.waitForLoadState('networkidle');
  });

  test('renders directory employees table or auth redirect', async ({ page }) => {
    const state = await waitForPageState(page);

    if (state === 'login') {
      await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      return;
    }

    expect(state).toBe('directory');
    await expect(page.getByPlaceholder('Search employees...')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('shows expected table controls when directory is visible', async ({ page }) => {
    const state = await waitForPageState(page);

    if (state === 'login') {
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      return;
    }

    expect(state).toBe('directory');
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Phone")')).toBeVisible();
    await expect(page.locator('button:has-text("View")')).toBeVisible();
  });
});
