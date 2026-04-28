import { test, expect } from '../fixtures/index';

test.describe('Ask Alleato widget', () => {
  test('pill opens AI and feedback tabs', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.localStorage.setItem('alleato_onboarding_completed_v3', new Date().toISOString()));
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Ask Alleato' }).click();
    await expect(page.getByRole('tab', { name: 'Ask AI' })).toBeVisible();
    await expect(page.getByPlaceholder('Ask anything about your projects...')).toBeVisible();

    await page.getByRole('tab', { name: 'Send feedback' }).click();
    await expect(page.getByPlaceholder('Bug, idea, or just confused — anything works')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bug' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Idea' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confused' })).toBeVisible();
  });

  test('keyboard shortcut opens the widget', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('alleato_onboarding_completed_v3', new Date().toISOString());
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Ask Alleato' })).toBeVisible();
    await page.waitForFunction(() => (
      document.documentElement.dataset.askAlleatoShortcutReady === 'true'
    ));
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'i',
        ctrlKey: true,
        bubbles: true,
      }));
    });
    await expect(page.getByRole('tab', { name: 'Ask AI' })).toBeVisible();
  });
});
