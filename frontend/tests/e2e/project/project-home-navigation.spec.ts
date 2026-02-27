import { test, expect, type Page } from '@playwright/test';

const PROJECT_HOME_PATH = '/1/home';

type NavState = 'project_home' | 'login' | 'notfound' | 'unknown';

async function detectNavState(page: Page): Promise<NavState> {
  const hasLogin = await page.getByRole('button', { name: 'Login' }).isVisible().catch(() => false);
  const hasEmail = await page.getByRole('textbox', { name: 'Email' }).isVisible().catch(() => false);
  if (hasLogin && hasEmail) return 'login';

  const has404 = await page.getByRole('heading', { name: '404' }).isVisible().catch(() => false);
  if (has404) return 'notfound';

  const hasProjectToolsLabel = await page.getByText('Project Tools', { exact: false }).isVisible().catch(() => false);
  if (hasProjectToolsLabel) return 'project_home';

  return 'unknown';
}

async function waitForNavState(page: Page): Promise<NavState> {
  for (let i = 0; i < 10; i++) {
    const state = await detectNavState(page);
    if (state !== 'unknown') return state;
    await page.waitForTimeout(500);
  }
  return 'unknown';
}

test.describe('Project Home Navigation Dropdown', () => {
  test('renders valid no-auth state for project home navigation shell', async ({ page }) => {
    await page.goto(PROJECT_HOME_PATH);
    await page.waitForLoadState('networkidle');

    const state = await waitForNavState(page);
    expect(['project_home', 'login']).toContain(state);

    if (state === 'login') {
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      return;
    }

    await expect(page.getByText('Project Tools', { exact: false })).toBeVisible();
  });
});
