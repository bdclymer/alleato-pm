import { expect, test } from '@playwright/test';

const projectId = '60';
const basePath = `/${projectId}/change-events`;

test.describe('Change Events UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(basePath, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Change Events")', {
      timeout: 15_000,
    });
  });

  test('detail tab renders table with actions and search', async ({ page }) => {
    const header = page.getByRole('heading', { name: /Change Events/i });
    await expect(header).toBeVisible();

    const searchInput = page.getByPlaceholder('Search change events...');
    await expect(searchInput).toBeVisible();

    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    await expect(refreshBtn).toBeVisible();

    const createButton = page.getByRole('button', { name: /New Change Event/i });
    await expect(createButton).toBeVisible();

    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();
  });

  test('summary tab surfaces metrics and highlights', async ({ page }) => {
    const summaryTrigger = page.locator(
      '[data-slot="tabs-trigger"][id$="-trigger-summary"]',
    );
    await summaryTrigger.click({ force: true });
    const summaryContent = page.locator(
      '[data-slot="tabs-content"][id$="-content-summary"]',
    );
    await expect(summaryContent).toContainText(/Summary|Status breakdown|Top estimated impacts|No data available yet/i, {
      timeout: 15000,
    });
  });

  test('rfqs tab documents the phase 2 plan', async ({ page }) => {
    const rfqTrigger = page.locator(
      '[data-slot="tabs-trigger"][id$="-trigger-rfqs"]',
    );
    await rfqTrigger.click({ force: true });
    const rfqContent = page.locator(
      '[data-slot="tabs-content"][id$="-content-rfqs"]',
    );
    await expect(rfqContent).toContainText(/RFQ|Request for Quote/i, {
      timeout: 15000,
    });
  });

  test('recycle bin tab shows empty state or entries', async ({ page }) => {
    const recycleTrigger = page.locator(
      '[data-slot="tabs-trigger"][id$="-trigger-recycle"]',
    );
    await recycleTrigger.click({ force: true });
    const recycleContent = page.locator(
      '[data-slot="tabs-content"][id$="-content-recycle"]',
    );
    await expect(recycleContent).toContainText(/Recycle Bin|Soft-deleted change events/i, {
      timeout: 15000,
    });
  });
});
