import { test, expect, type Page } from '@playwright/test';

type RoutingState = 'home' | 'login' | 'notfound' | 'unknown';

async function detectState(page: Page): Promise<RoutingState> {
  const hasLogin = await page.getByRole('button', { name: 'Login' }).isVisible().catch(() => false);
  const hasEmail = await page.getByRole('textbox', { name: 'Email' }).isVisible().catch(() => false);
  if (hasLogin && hasEmail) return 'login';

  const has404 = await page.getByRole('heading', { name: '404' }).isVisible().catch(() => false);
  if (has404) return 'notfound';

  const hasProjectToolsText = await page.getByText('Project Tools', { exact: false }).isVisible().catch(() => false);
  const hasProjectShell =
    hasProjectToolsText ||
    (await page.getByRole('combobox').first().isVisible().catch(() => false)) ||
    (await page.getByPlaceholder('Search projects...').isVisible().catch(() => false));
  if (hasProjectShell) return 'home';

  return 'unknown';
}

async function waitForState(page: Page): Promise<RoutingState> {
  for (let i = 0; i < 10; i++) {
    const state = await detectState(page);
    if (state !== 'unknown') return state;
    await page.waitForTimeout(500);
  }
  return 'unknown';
}

test.describe('Project-Scoped Routing', () => {
  test('renders valid no-auth routing shell state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const state = await waitForState(page);
    expect(['home', 'login']).toContain(state);

    if (state === 'login') {
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      return;
    }

    const hasSearchProjects = await page.getByPlaceholder('Search projects...').isVisible().catch(() => false);
    const hasProjectSelect = await page.getByRole('combobox').first().isVisible().catch(() => false);
    expect(hasSearchProjects || hasProjectSelect).toBeTruthy();
  });
});
