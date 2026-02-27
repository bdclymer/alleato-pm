import { test, expect, type Page } from '@playwright/test';

const PROJECT_ID = '67';
const MEETING_ID = '01KCEQ6T0WTN827CN68P7R0A4E';
const DETAIL_PATH = `/${PROJECT_ID}/meetings/${MEETING_ID}`;

type DetailState = 'meeting_detail' | 'login' | 'notfound' | 'unknown';

async function gotoWithRetry(page: Page, path: string) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTransientNavigationError =
        message.includes('ERR_EMPTY_RESPONSE') ||
        message.includes('ERR_CONNECTION_REFUSED') ||
        message.includes('Timeout');
      if (!isTransientNavigationError || attempt === 4) {
        throw error;
      }
      await page.waitForTimeout(1000);
    }
  }
}

async function detectState(page: Page): Promise<DetailState> {
  const hasLogin = await page.getByRole('button', { name: 'Login' }).isVisible().catch(() => false);
  const hasEmail = await page.getByRole('textbox', { name: 'Email' }).isVisible().catch(() => false);
  if (hasLogin && hasEmail) return 'login';

  const has404 = await page.getByRole('heading', { name: '404' }).isVisible().catch(() => false);
  if (has404) return 'notfound';

  const hasDetailHeading = await page.locator('h1').first().isVisible().catch(() => false);
  const hasBreadcrumbMeetings = await page.getByRole('link', { name: 'Meetings' }).isVisible().catch(() => false);
  const hasTranscriptSection = await page.getByRole('heading', { name: /full transcript/i }).isVisible().catch(() => false);
  const isMeetingRoute = /\/\d+\/meetings\/[^/]+/.test(page.url());
  if ((hasDetailHeading && hasBreadcrumbMeetings) || (hasTranscriptSection && isMeetingRoute)) {
    return 'meeting_detail';
  }

  return 'unknown';
}

async function waitForState(page: Page): Promise<DetailState> {
  for (let i = 0; i < 20; i++) {
    const state = await detectState(page);
    if (state !== 'unknown') return state;
    await page.waitForTimeout(500);
  }
  return 'unknown';
}

test.describe('Project Meeting Detail Page', () => {
  test('renders valid state for no-auth smoke', async ({ page }) => {
    await gotoWithRetry(page, DETAIL_PATH);
    await page.waitForLoadState('networkidle');

    const state = await waitForState(page);
    expect(['meeting_detail', 'login', 'notfound']).toContain(state);

    if (state === 'login') {
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      return;
    }

    if (state === 'notfound') {
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
      return;
    }

    await expect(page.getByRole('link', { name: 'Meetings' }).first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /full transcript/i }).or(page.getByText(/view in fireflies/i)).first(),
    ).toBeVisible();
  });
});
