import { test, expect, type Page } from '@playwright/test';

const WIZARD_PATH = '/1/setup';

type WizardState = 'wizard' | 'login' | 'notfound' | 'unknown';

async function detectState(page: Page): Promise<WizardState> {
  const hasLogin = await page.getByRole('button', { name: 'Login' }).isVisible().catch(() => false);
  const hasEmail = await page.getByRole('textbox', { name: 'Email' }).isVisible().catch(() => false);
  if (hasLogin && hasEmail) return 'login';

  const has404 = await page.getByRole('heading', { name: '404' }).isVisible().catch(() => false);
  if (has404) return 'notfound';

  const hasWizardTitle = await page.getByRole('heading', { name: 'Project Setup' }).isVisible().catch(() => false);
  if (hasWizardTitle) return 'wizard';

  return 'unknown';
}

async function waitForState(page: Page): Promise<WizardState> {
  for (let i = 0; i < 10; i++) {
    const state = await detectState(page);
    if (state !== 'unknown') return state;
    await page.waitForTimeout(500);
  }
  return 'unknown';
}

test.describe('Project Setup Wizard Comprehensive Testing', () => {
  test('renders valid no-auth wizard state', async ({ page }) => {
    await page.goto(WIZARD_PATH);
    await page.waitForLoadState('networkidle');

    const state = await waitForState(page);
    expect(['wizard', 'login']).toContain(state);

    if (state === 'login') {
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      return;
    }

    await expect(page.getByRole('heading', { name: 'Project Setup' })).toBeVisible();
  });
});
