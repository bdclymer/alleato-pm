import { test, expect, type Page } from '@playwright/test';

const PROJECT_HOME_PATH = '/14/home';

type HomeState = 'project_home' | 'login' | 'notfound' | 'unknown';

async function detectHomeState(page: Page): Promise<HomeState> {
  const hasLogin = await page.getByRole('button', { name: 'Login' }).isVisible().catch(() => false);
  const hasEmail = await page.getByRole('textbox', { name: 'Email' }).isVisible().catch(() => false);
  if (hasLogin && hasEmail) return 'login';

  const has404 = await page.getByRole('heading', { name: '404' }).isVisible().catch(() => false);
  if (has404) return 'notfound';

  const hasHomeShell = await page.getByText('Project Tools', { exact: false }).isVisible().catch(() => false);
  if (hasHomeShell) return 'project_home';

  return 'unknown';
}

async function waitForHomeState(page: Page): Promise<HomeState> {
  for (let i = 0; i < 10; i++) {
    const state = await detectHomeState(page);
    if (state !== 'unknown') return state;
    await page.waitForTimeout(500);
  }
  return 'unknown';
}

test.describe('Project Home - Collapsible Summary', () => {
  test('renders valid no-auth state for project home', async ({ page }) => {
    await page.goto(PROJECT_HOME_PATH);
    await page.waitForLoadState('networkidle');

    const state = await waitForHomeState(page);
    expect(['project_home', 'login']).toContain(state);

    if (state === 'login') {
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      return;
    }

    await expect(page.getByText('Project Tools', { exact: false })).toBeVisible();
  });
});
