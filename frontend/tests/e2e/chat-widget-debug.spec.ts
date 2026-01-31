import { test, expect } from '@playwright/test';

const CHAT_BUTTON = 'button[aria-label="Open chat"]';
const CHATKIT_PANEL = '[data-testid="rag-chatkit-panel"]';
const FALLBACK_PANEL = '[data-testid="simple-rag-chat"]';

test.describe('AI Chat Widget – Public Access', () => {
  test('renders ChatKit UI for anonymous visitors when backend is online', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator(CHAT_BUTTON).click();

    await expect(page.locator(CHATKIT_PANEL)).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: 'tests/screenshots/chat-widget-online.png',
      fullPage: false,
    });
  });

  test('falls back to demo chat when backend is offline', async ({ page }) => {
    await page.route('**/api/rag-chatkit/bootstrap', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-rag-backend-status': 'offline',
        },
        body: JSON.stringify({
          thread_id: null,
          current_agent: null,
          context: {
            backend_status: 'offline',
            notice: 'Simulated offline backend',
          },
        }),
      });
    });

    await page.route('**/api/rag-chatkit/state**', (route) => route.abort());

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator(CHAT_BUTTON).click();

    await expect(page.locator(FALLBACK_PANEL)).toBeVisible({ timeout: 5000 });
    await page.screenshot({
      path: 'tests/screenshots/chat-widget-offline.png',
      fullPage: false,
    });
  });
});
