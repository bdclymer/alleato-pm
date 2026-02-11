import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/index';
import {
  countChangeEvents,
  fetchChangeEventById,
  fetchLineItems,
} from '../helpers/db';
import { cleanupChangeEvents } from '../helpers/cleanup';
import { pollFor } from '../helpers/poll';

const projectId = Number(
  process.env.PLAYWRIGHT_PROJECT_ID ??
    process.env.NEXT_PUBLIC_TEST_PROJECT_ID ??
    '60',
);

const createdChangeEventIds: number[] = [];

function uniqueChangeEventNumber() {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CE-${Date.now().toString().slice(-6)}-${suffix}`;
}

function parseCurrency(value: string) {
  return Number(value.replace(/[^0-9.-]+/g, ''));
}

async function createChangeEventViaUi(
  page: Page,
  overrides?: { status?: string },
) {
  const number = uniqueChangeEventNumber();
  const title = `QA Change Event ${number}`;
  const statusLabel = overrides?.status ?? 'Open';

  await page.goto(`/${projectId}/change-events/new`, {
    waitUntil: 'domcontentloaded',
  });

  await page.getByTestId('change-event-number-input').fill(number);
  await page.getByTestId('change-event-title-input').fill(title);

  await page.getByTestId('change-event-status-select').click();
  await page.getByRole('option', { name: statusLabel }).click();

  await page.getByTestId('change-event-submit-button').click();

  await expect(page).toHaveURL(new RegExp(`/${projectId}/change-events/\\d+$`));

  const pathname = new URL(page.url()).pathname;
  const id = Number(pathname.split('/').pop());

  if (!Number.isFinite(id)) {
    throw new Error(`Unable to parse change event id from URL: ${page.url()}`);
  }

  createdChangeEventIds.push(id);

  return { id, number, title, statusLabel };
}

async function getStatusCounts(page: Page) {
  const [all, open, pending, approved] = await Promise.all([
    page.getByTestId('change-events-count-all').innerText(),
    page.getByTestId('change-events-count-open').innerText(),
    page.getByTestId('change-events-count-pending').innerText(),
    page.getByTestId('change-events-count-approved').innerText(),
  ]);

  const normalize = (value: string) => Number(value.replace(/,/g, ''));

  return {
    all: normalize(all),
    open: normalize(open),
    pending: normalize(pending),
    approved: normalize(approved),
  };
}

test.describe.serial('Change Events', () => {
  test.afterEach(async () => {
    await cleanupChangeEvents(createdChangeEventIds);
    createdChangeEventIds.length = 0;
  });

  test('Change Events list loads for authed user and avoids schema errors', async ({ page }) => {
    await page.goto(`/${projectId}/change-events`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(
      page.getByRole('heading', { name: /Change Events/i }),
    ).toBeVisible();

    await expect(page.getByText('Unable to load change events')).toHaveCount(0);
    await expect(
      page.getByText(/column change_events\.event_number does not exist/i),
    ).toHaveCount(0);
  });

  test('Create Change Event shows validation errors and blocks persistence', async ({ page }) => {
    const beforeCount = await countChangeEvents(projectId);

    await page.goto(`/${projectId}/change-events/new`, {
      waitUntil: 'domcontentloaded',
    });

    await page.getByTestId('change-event-submit-button').click();

    await expect(page.getByText('Number is required')).toBeVisible();
    await expect(page.getByText('Title is required')).toBeVisible();

    await pollFor(() => countChangeEvents(projectId)).toBe(beforeCount);
  });

  test('Create Change Event persists to the database with expected values', async ({ page }) => {
    const { id, number, title } = await createChangeEventViaUi(page);

    await expect
      .poll(async () => (await fetchChangeEventById(id))?.number)
      .toBe(number);

    const record = await fetchChangeEventById(id);
    expect(record).not.toBeNull();
    expect(record?.project_id).toBe(projectId);
    expect(record?.number).toBe(number);
    expect(record?.title).toBe(title);
    expect(record?.status?.toLowerCase()).toBe('open');
    expect(record?.created_at).toBeTruthy();
  });

  test('Tabs, status pills, and counts stay consistent as status changes', async ({ page }) => {
    await page.goto(`/${projectId}/change-events`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByTestId('change-events-tab-detail')).toBeVisible();
    await expect(page.getByTestId('change-events-tab-summary')).toBeVisible();
    await expect(page.getByTestId('change-events-tab-rfqs')).toBeVisible();
    await expect(page.getByTestId('change-events-tab-recycle')).toBeVisible();

    const beforeCounts = await getStatusCounts(page);

    const { id } = await createChangeEventViaUi(page);

    await page.goto(`/${projectId}/change-events`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByTestId(`change-event-row-${id}`)).toBeVisible();

    await expect
      .poll(async () => await getStatusCounts(page))
      .toEqual({
        all: beforeCounts.all + 1,
        open: beforeCounts.open + 1,
        pending: beforeCounts.pending,
        approved: beforeCounts.approved,
      });

    await page.getByTestId('change-events-tab-open').click();
    await expect(page.getByTestId(`change-event-row-${id}`)).toBeVisible();

    await page.goto(`/${projectId}/change-events/${id}`, {
      waitUntil: 'domcontentloaded',
    });

    await page.getByTestId('change-event-submit-approval').click();
    await expect(page.getByText(/Pending Approval/i)).toBeVisible();

    await page.goto(`/${projectId}/change-events`, {
      waitUntil: 'domcontentloaded',
    });

    await expect
      .poll(async () => await getStatusCounts(page))
      .toEqual({
        all: beforeCounts.all + 1,
        open: beforeCounts.open,
        pending: beforeCounts.pending + 1,
        approved: beforeCounts.approved,
      });

    await page.getByTestId('change-events-tab-pending').click();
    await expect(page.getByTestId(`change-event-row-${id}`)).toBeVisible();
  });

  test('Line items roll up into detail totals and persist in the database', async ({ page, authenticatedRequest }) => {
    const { id } = await createChangeEventViaUi(page);

    const lineItemPayloads = [
      {
        description: 'QA line item 1',
        quantity: 2,
        unitCost: 100,
        nonCommittedCost: 25,
      },
      {
        description: 'QA line item 2',
        quantity: 1,
        unitCost: 50,
        nonCommittedCost: 10,
      },
    ];

    for (const payload of lineItemPayloads) {
      const response = await authenticatedRequest.post(
        `/api/projects/${projectId}/change-events/${id}/line-items`,
        { data: payload },
      );
      expect(response.ok()).toBe(true);
    }

    await expect
      .poll(async () => (await fetchLineItems(id)).length)
      .toBe(2);

    const expectedCostRom = 2 * 100 + 1 * 50;
    const expectedNonCommitted = 25 + 10;

    await page.goto(`/${projectId}/change-events/${id}`, {
      waitUntil: 'domcontentloaded',
    });

    await page.getByTestId('change-event-tab-line-items').click();

    await expect(page.getByTestId('change-event-total-cost-rom')).toHaveText(
      new RegExp(expectedCostRom.toFixed(2).replace('.', '\\.') + '$'),
    );

    await expect(page.getByTestId('change-event-total-non-committed')).toHaveText(
      new RegExp(expectedNonCommitted.toFixed(2).replace('.', '\\.') + '$'),
    );

    const dbLineItems = await fetchLineItems(id);
    const dbCostTotal = dbLineItems.reduce(
      (sum, item) => sum + Number(item.cost_rom || 0),
      0,
    );
    const dbNonCommittedTotal = dbLineItems.reduce(
      (sum, item) => sum + Number(item.non_committed_cost || 0),
      0,
    );

    const uiCostTotal = parseCurrency(
      await page.getByTestId('change-event-total-cost-rom').innerText(),
    );
    const uiNonCommittedTotal = parseCurrency(
      await page.getByTestId('change-event-total-non-committed').innerText(),
    );

    expect(uiCostTotal).toBeCloseTo(dbCostTotal, 2);
    expect(uiNonCommittedTotal).toBeCloseTo(dbNonCommittedTotal, 2);
  });

  test('Recycle bin shows soft-deleted change events', async ({ page }) => {
    const { id } = await createChangeEventViaUi(page);

    await page.goto(`/${projectId}/change-events`, {
      waitUntil: 'domcontentloaded',
    });

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.getByTestId(`change-event-actions-${id}`).click();
    await page.getByTestId(`change-event-delete-${id}`).click();

    await expect(page.getByTestId(`change-event-row-${id}`)).toHaveCount(0);

    await page.getByTestId('change-events-tab-recycle').click();
    await expect(
      page.getByTestId(`change-event-recycle-row-${id}`),
    ).toBeVisible();
  });

  test.skip('Summary view totals match line item rollups (TODO)', async () => {
    // Summary totals are not currently exposed in the UI.
  });

  test.skip('RFQs workflow persists and lists linked RFQs (TODO)', async () => {
    // RFQs tab is currently informational only.
  });

  test.skip('Recycle bin restore returns items to active lists (TODO)', async () => {
    // Restore action is not yet available in the UI.
  });

  test.skip('Downstream financial impact updates contract/budget totals (TODO)', async () => {
    // Financial impact rollups are not yet wired to change events.
  });
});
