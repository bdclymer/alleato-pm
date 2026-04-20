import { test, expect, type Page } from '@playwright/test';

const MEETINGS2_PATH = '/meetings2';

type Meetings2State = 'meetings' | 'login' | 'error' | 'notfound' | 'unknown';

async function detectState(page: Page): Promise<Meetings2State> {
  const hasMeetingsHeading = await page.getByRole('heading', { name: 'Meetings' }).isVisible().catch(() => false);
  if (hasMeetingsHeading) return 'meetings';

  const hasLoginButton = await page.getByRole('button', { name: 'Login' }).isVisible().catch(() => false);
  const hasEmail = await page.getByRole('textbox', { name: 'Email' }).isVisible().catch(() => false);
  if (hasLoginButton && hasEmail) return 'login';

  const hasError = await page.getByText('Error loading meetings. Please try again later.').isVisible().catch(() => false);
  if (hasError) return 'error';

  const has404 = await page.getByRole('heading', { name: '404' }).isVisible().catch(() => false);
  if (has404) return 'notfound';

  return 'unknown';
}

async function waitForState(page: Page): Promise<Meetings2State> {
  for (let i = 0; i < 12; i++) {
    const state = await detectState(page);
    if (state !== 'unknown') return state;
    await page.waitForTimeout(500);
  }
  return 'unknown';
}

test.describe('Meetings2 Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEETINGS2_PATH);
    await page.waitForLoadState('networkidle');
  });

  test('renders valid state for no-auth smoke', async ({ page }) => {
    const state = await waitForState(page);
    expect(['meetings', 'login', 'error']).toContain(state);

    if (state === 'login') {
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      return;
    }

    if (state === 'error') {
      await expect(page.getByText('Error loading meetings. Please try again later.')).toBeVisible();
      return;
    }

    await expect(page.getByRole('heading', { name: 'Meetings' })).toBeVisible();
    await expect(page.getByPlaceholder(/Search/i)).toBeVisible();
  });
});
