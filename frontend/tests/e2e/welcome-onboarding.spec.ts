import { test, expect } from '../fixtures/index';

test.describe('Welcome onboarding', () => {
  test('force-opens, advances, skips, and persists completion', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('alleato_onboarding_completed_v3');
    });
    await page.goto('/?onboarding=1', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText("You're not testing software.")).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText(/I read your last 14 meetings/)).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('One widget. Two superpowers.')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Set up your first test project.')).toBeVisible();

    await page.getByRole('button', { name: 'Skip tour' }).click();
    await expect(page.getByText('Set up your first test project.')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Ask Alleato' })).toBeVisible();

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('alleato_onboarding_completed_v3'),
    );
    expect(stored).toBeTruthy();
  });

  test('create test project CTA routes to prechecked create-project flow', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('alleato_onboarding_completed_v3');
    });
    await page.goto('/?onboarding=1', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: /Create your first test project/ }).click();

    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/create-project\?testProject=1/);
  });
});
