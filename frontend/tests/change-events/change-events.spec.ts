/**
 * ==============================================================================
 * CHANGE EVENTS E2E TEST SUITE
 * ==============================================================================
 *
 * PURPOSE:
 * This test suite validates the complete Change Events feature workflow,
 * including CRUD operations, status transitions, line item calculations,
 * and soft delete (recycle bin) functionality.
 *
 * COVERAGE:
 *   1. List page loads without schema errors
 *   2. Form validation blocks invalid submissions
 *   3. Create flow persists data correctly
 *   4. Status tabs and counts update correctly on status changes
 *   5. Line items roll up into detail totals
 *   6. Soft delete moves items to recycle bin
 *
 * SKIPPED TESTS (TODO):
 *   - Summary view totals (UI not implemented)
 *   - RFQs workflow (informational only)
 *   - Recycle bin restore (action not available)
 *   - Financial impact rollups (not wired yet)
 *
 * PREREQUISITES:
 *   - Authenticated user session (handled by fixtures/index.ts)
 *   - Valid project with change events enabled
 *   - Database access for verification queries
 *
 * ENVIRONMENT VARIABLES:
 *   PLAYWRIGHT_PROJECT_ID    - Project ID for testing (optional)
 *   NEXT_PUBLIC_TEST_PROJECT_ID - Fallback project ID (optional)
 *   Default: 60
 *
 * CLEANUP:
 *   Each test cleans up created change events via afterEach hook.
 *   Uses cleanupChangeEvents() helper to remove test data.
 *
 * TEST DATA PATTERN:
 *   - Change event numbers: CE-<timestamp>-<random> (e.g., CE-123456-AB12)
 *   - Titles: "QA Change Event <number>"
 *   - Line items: QA line item 1, QA line item 2, etc.
 * ==============================================================================
 */

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/index';
import {
  countChangeEvents,
  fetchChangeEventById,
  fetchLineItems,
} from '../helpers/db';
import { cleanupChangeEvents } from '../helpers/cleanup';
import { pollFor } from '../helpers/poll';

// ==============================================================================
// CONFIGURATION
// ==============================================================================

/**
 * Project ID for testing. Resolved from environment variables with fallback.
 * Priority: PLAYWRIGHT_PROJECT_ID > NEXT_PUBLIC_TEST_PROJECT_ID > 60
 */
const projectId = Number(
  process.env.PLAYWRIGHT_PROJECT_ID ??
    process.env.NEXT_PUBLIC_TEST_PROJECT_ID ??
    '60',
);

/**
 * Tracks IDs of change events created during tests for cleanup.
 * Cleared after each test via afterEach hook.
 */
const createdChangeEventIds: number[] = [];

// ==============================================================================
// UTILITY FUNCTIONS
// ==============================================================================

/**
 * Generates a unique change event number for test data.
 * Format: CE-<last 6 digits of timestamp>-<4 random alphanumeric chars>
 *
 * @returns {string} Unique change event number (e.g., "CE-123456-AB12")
 *
 * @example
 * uniqueChangeEventNumber() // "CE-945821-X7KP"
 */
function uniqueChangeEventNumber() {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CE-${Date.now().toString().slice(-6)}-${suffix}`;
}

/**
 * Parses a currency string into a numeric value.
 * Strips all non-numeric characters except decimal point and minus sign.
 *
 * @param {string} value - Currency string (e.g., "$1,234.56" or "($500.00)")
 * @returns {number} Numeric value (e.g., 1234.56 or -500.00)
 *
 * @example
 * parseCurrency("$1,234.56") // 1234.56
 * parseCurrency("($500.00)") // -500.00
 */
function parseCurrency(value: string) {
  return Number(value.replace(/[^0-9.-]+/g, ''));
}

// ==============================================================================
// UI INTERACTION HELPERS
// ==============================================================================

/**
 * Creates a new change event via the UI form.
 *
 * Flow:
 *   1. Navigate to /[projectId]/change-events/new
 *   2. Fill number, title, and status fields
 *   3. Submit form
 *   4. Wait for redirect to detail page
 *   5. Extract and return created record ID from URL
 *
 * @param {Page} page - Playwright page object
 * @param {object} [overrides] - Optional field overrides
 * @param {string} [overrides.status] - Status label to select (default: "Open")
 * @returns {Promise<{id: number, number: string, title: string, statusLabel: string}>}
 *          Created change event data including database ID
 * @throws {Error} If unable to parse change event ID from redirect URL
 *
 * @example
 * const { id, number } = await createChangeEventViaUi(page);
 * const { id } = await createChangeEventViaUi(page, { status: 'Pending' });
 */
async function createChangeEventViaUi(
  page: Page,
  overrides?: { status?: string },
) {
  const number = uniqueChangeEventNumber();
  const title = `QA Change Event ${number}`;
  const statusLabel = overrides?.status ?? 'Open';

  // Navigate to create form
  await page.goto(`/${projectId}/change-events/new`, {
    waitUntil: 'domcontentloaded',
  });

  // Fill form fields
  await page.getByTestId('change-event-number-input').fill(number);
  await page.getByTestId('change-event-title-input').fill(title);

  // Select status from dropdown
  await page.getByTestId('change-event-status-select').click();
  await page.getByRole('option', { name: statusLabel }).click();

  // Submit form
  await page.getByTestId('change-event-submit-button').click();

  // Wait for redirect to detail page and extract ID from URL
  await expect(page).toHaveURL(new RegExp(`/${projectId}/change-events/\\d+$`));

  const pathname = new URL(page.url()).pathname;
  const id = Number(pathname.split('/').pop());

  if (!Number.isFinite(id)) {
    throw new Error(`Unable to parse change event id from URL: ${page.url()}`);
  }

  // Track for cleanup
  createdChangeEventIds.push(id);

  return { id, number, title, statusLabel };
}

/**
 * Extracts status counts from the change events list page.
 * Reads count badges for All, Open, Pending, and Approved statuses.
 *
 * @param {Page} page - Playwright page object (must be on change events list)
 * @returns {Promise<{all: number, open: number, pending: number, approved: number}>}
 *          Status counts as numeric values
 *
 * @example
 * const counts = await getStatusCounts(page);
 * // { all: 15, open: 5, pending: 8, approved: 2 }
 */
async function getStatusCounts(page: Page) {
  // Fetch all count values in parallel for performance
  const [all, open, pending, approved] = await Promise.all([
    page.getByTestId('change-events-count-all').innerText(),
    page.getByTestId('change-events-count-open').innerText(),
    page.getByTestId('change-events-count-pending').innerText(),
    page.getByTestId('change-events-count-approved').innerText(),
  ]);

  // Normalize: remove commas and convert to number
  const normalize = (value: string) => Number(value.replace(/,/g, ''));

  return {
    all: normalize(all),
    open: normalize(open),
    pending: normalize(pending),
    approved: normalize(approved),
  };
}

// ==============================================================================
// TEST SUITE
// ==============================================================================

/**
 * Change Events test suite.
 *
 * Uses test.describe.serial to run tests sequentially.
 * This is required because:
 *   - Tests share the createdChangeEventIds array for cleanup
 *   - Some tests depend on database state from previous operations
 *   - Status count tests need predictable baseline counts
 */
test.describe.serial('Change Events', () => {
  /**
   * Cleanup hook: Removes all change events created during each test.
   * Prevents test data accumulation and ensures test isolation.
   */
  test.afterEach(async () => {
    await cleanupChangeEvents(createdChangeEventIds);
    createdChangeEventIds.length = 0; // Reset array without reassigning
  });

  // ============================================================================
  // TEST: List Page Load
  // ============================================================================

  /**
   * Verifies the change events list page loads correctly for authenticated users.
   *
   * Validates:
   *   - Page heading is visible
   *   - No "Unable to load" error message
   *   - No database schema errors (specifically event_number column)
   *
   * This test catches:
   *   - Authentication/authorization issues
   *   - Database schema mismatches
   *   - API endpoint failures
   */
  test('Change Events list loads for authed user and avoids schema errors', async ({ page }) => {
    await page.goto(`/${projectId}/change-events`, {
      waitUntil: 'domcontentloaded',
    });

    // Verify page rendered successfully
    await expect(
      page.getByRole('heading', { name: /Change Events/i }),
    ).toBeVisible();

    // Verify no error states
    await expect(page.getByText('Unable to load change events')).toHaveCount(0);
    await expect(
      page.getByText(/column change_events\.event_number does not exist/i),
    ).toHaveCount(0);
  });

  // ============================================================================
  // TEST: Form Validation
  // ============================================================================

  /**
   * Verifies form validation prevents submission with missing required fields.
   *
   * Test flow:
   *   1. Record current change event count in database
   *   2. Navigate to create form
   *   3. Submit without filling required fields
   *   4. Verify validation error messages appear
   *   5. Verify no new record was created in database
   *
   * This test catches:
   *   - Missing client-side validation
   *   - Form submission bypassing validation
   *   - Silent database writes on invalid data
   */
  test('Create Change Event shows validation errors and blocks persistence', async ({ page }) => {
    // Baseline: count existing records
    const beforeCount = await countChangeEvents(projectId);

    await page.goto(`/${projectId}/change-events/new`, {
      waitUntil: 'domcontentloaded',
    });

    // Submit empty form
    await page.getByTestId('change-event-submit-button').click();

    // Verify validation messages
    await expect(page.getByText('Number is required')).toBeVisible();
    await expect(page.getByText('Title is required')).toBeVisible();

    // Verify no database write occurred
    await pollFor(() => countChangeEvents(projectId)).toBe(beforeCount);
  });

  // ============================================================================
  // TEST: Create Persistence
  // ============================================================================

  /**
   * Verifies the create form correctly persists data to the database.
   *
   * Test flow:
   *   1. Create change event via UI
   *   2. Poll database until record appears
   *   3. Verify all field values match input
   *
   * Validates:
   *   - Record is created with correct project_id
   *   - Number and title match form input
   *   - Status defaults to "open"
   *   - created_at timestamp is populated
   *
   * This test catches:
   *   - Field mapping errors between UI and API
   *   - Missing or incorrect default values
   *   - Foreign key assignment issues
   */
  test('Create Change Event persists to the database with expected values', async ({ page }) => {
    const { id, number, title } = await createChangeEventViaUi(page);

    // Poll until database reflects the new record
    await expect
      .poll(async () => (await fetchChangeEventById(id))?.number)
      .toBe(number);

    // Verify all fields
    const record = await fetchChangeEventById(id);
    expect(record).not.toBeNull();
    expect(record?.project_id).toBe(projectId);
    expect(record?.number).toBe(number);
    expect(record?.title).toBe(title);
    expect(record?.status?.toLowerCase()).toBe('open');
    expect(record?.created_at).toBeTruthy();
  });

  // ============================================================================
  // TEST: Status Tabs and Counts
  // ============================================================================

  /**
   * Verifies status tabs and count badges update correctly as status changes.
   *
   * Test flow:
   *   1. Navigate to list and verify all tabs are visible
   *   2. Record baseline status counts
   *   3. Create new "Open" change event
   *   4. Verify counts updated (all +1, open +1)
   *   5. Verify record appears in "Open" tab
   *   6. Change status to "Pending Approval"
   *   7. Verify counts updated (open -1, pending +1)
   *   8. Verify record appears in "Pending" tab
   *
   * This test catches:
   *   - Tab filtering issues
   *   - Count calculation errors
   *   - Status transition failures
   *   - UI/database sync issues
   */
  test('Tabs, status pills, and counts stay consistent as status changes', async ({ page }) => {
    await page.goto(`/${projectId}/change-events`, {
      waitUntil: 'domcontentloaded',
    });

    // Verify all tabs are present
    await expect(page.getByTestId('change-events-tab-detail')).toBeVisible();
    await expect(page.getByTestId('change-events-tab-summary')).toBeVisible();
    await expect(page.getByTestId('change-events-tab-rfqs')).toBeVisible();
    await expect(page.getByTestId('change-events-tab-recycle')).toBeVisible();

    // Record baseline counts
    const beforeCounts = await getStatusCounts(page);

    // Create new change event (defaults to "Open" status)
    const { id } = await createChangeEventViaUi(page);

    // Navigate back to list and verify counts updated
    await page.goto(`/${projectId}/change-events`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByTestId(`change-event-row-${id}`)).toBeVisible();

    // Verify counts: all +1, open +1, others unchanged
    await expect
      .poll(async () => await getStatusCounts(page))
      .toEqual({
        all: beforeCounts.all + 1,
        open: beforeCounts.open + 1,
        pending: beforeCounts.pending,
        approved: beforeCounts.approved,
      });

    // Verify record appears in Open tab
    await page.getByTestId('change-events-tab-open').click();
    await expect(page.getByTestId(`change-event-row-${id}`)).toBeVisible();

    // Change status to "Pending Approval"
    await page.goto(`/${projectId}/change-events/${id}`, {
      waitUntil: 'domcontentloaded',
    });

    await page.getByTestId('change-event-submit-approval').click();
    await expect(page.getByText(/Pending Approval/i)).toBeVisible();

    // Navigate back and verify counts updated
    await page.goto(`/${projectId}/change-events`, {
      waitUntil: 'domcontentloaded',
    });

    // Verify counts: open -1, pending +1
    await expect
      .poll(async () => await getStatusCounts(page))
      .toEqual({
        all: beforeCounts.all + 1,
        open: beforeCounts.open,
        pending: beforeCounts.pending + 1,
        approved: beforeCounts.approved,
      });

    // Verify record now appears in Pending tab
    await page.getByTestId('change-events-tab-pending').click();
    await expect(page.getByTestId(`change-event-row-${id}`)).toBeVisible();
  });

  // ============================================================================
  // TEST: Line Item Rollups
  // ============================================================================

  /**
   * Verifies line items aggregate correctly into change event totals.
   *
   * Test flow:
   *   1. Create change event via UI
   *   2. Add two line items via API
   *   3. Poll database until line items appear
   *   4. Calculate expected totals from line item data
   *   5. Navigate to detail page line items tab
   *   6. Verify UI totals match expected values
   *   7. Verify UI totals match database totals
   *
   * Line item calculations:
   *   - Cost ROM = sum(quantity * unitCost) = (2*100) + (1*50) = 250
   *   - Non-committed = sum(nonCommittedCost) = 25 + 10 = 35
   *
   * This test catches:
   *   - Line item aggregation errors
   *   - UI/database total mismatches
   *   - Decimal precision issues
   */
  test('Line items roll up into detail totals and persist in the database', async ({ page, authenticatedRequest }) => {
    const { id } = await createChangeEventViaUi(page);

    // Test line items with known values for calculation verification
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

    // Create line items via API
    for (const payload of lineItemPayloads) {
      const response = await authenticatedRequest.post(
        `/api/projects/${projectId}/change-events/${id}/line-items`,
        { data: payload },
      );
      expect(response.ok()).toBe(true);
    }

    // Wait for line items to appear in database
    await expect
      .poll(async () => (await fetchLineItems(id)).length)
      .toBe(2);

    // Calculate expected totals
    const expectedCostRom = 2 * 100 + 1 * 50; // 250
    const expectedNonCommitted = 25 + 10; // 35

    // Navigate to detail page
    await page.goto(`/${projectId}/change-events/${id}`, {
      waitUntil: 'domcontentloaded',
    });

    // Switch to line items tab
    await page.getByTestId('change-event-tab-line-items').click();

    // Verify UI totals match expected values
    await expect(page.getByTestId('change-event-total-cost-rom')).toHaveText(
      new RegExp(expectedCostRom.toFixed(2).replace('.', '\\.') + '$'),
    );

    await expect(page.getByTestId('change-event-total-non-committed')).toHaveText(
      new RegExp(expectedNonCommitted.toFixed(2).replace('.', '\\.') + '$'),
    );

    // Verify UI totals match database totals (cross-validation)
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

    // Use toBeCloseTo for floating point comparison (2 decimal places)
    expect(uiCostTotal).toBeCloseTo(dbCostTotal, 2);
    expect(uiNonCommittedTotal).toBeCloseTo(dbNonCommittedTotal, 2);
  });

  // ============================================================================
  // TEST: Soft Delete (Recycle Bin)
  // ============================================================================

  /**
   * Verifies soft delete moves change events to recycle bin.
   *
   * Test flow:
   *   1. Create change event via UI
   *   2. Navigate to list page
   *   3. Click delete action (with dialog auto-accept)
   *   4. Verify record disappears from main list
   *   5. Navigate to recycle tab
   *   6. Verify record appears in recycle bin
   *
   * This test catches:
   *   - Delete action not triggering soft delete
   *   - Recycle bin filtering issues
   *   - UI not refreshing after delete
   */
  test('Recycle bin shows soft-deleted change events', async ({ page }) => {
    const { id } = await createChangeEventViaUi(page);

    await page.goto(`/${projectId}/change-events`, {
      waitUntil: 'domcontentloaded',
    });

    // Auto-accept confirmation dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Trigger delete via actions menu
    await page.getByTestId(`change-event-actions-${id}`).click();
    await page.getByTestId(`change-event-delete-${id}`).click();

    // Verify record removed from main list
    await expect(page.getByTestId(`change-event-row-${id}`)).toHaveCount(0);

    // Verify record appears in recycle bin
    await page.getByTestId('change-events-tab-recycle').click();
    await expect(
      page.getByTestId(`change-event-recycle-row-${id}`),
    ).toBeVisible();
  });

  // ============================================================================
  // SKIPPED TESTS (TODO)
  // ============================================================================

  /**
   * TODO: Verify summary view totals match line item rollups.
   * Blocked: Summary totals are not currently exposed in the UI.
   */
  test.skip('Summary view totals match line item rollups (TODO)', async () => {
    // Summary totals are not currently exposed in the UI.
  });

  /**
   * TODO: Verify RFQs can be created and linked to change events.
   * Blocked: RFQs tab is currently informational only.
   */
  test.skip('RFQs workflow persists and lists linked RFQs (TODO)', async () => {
    // RFQs tab is currently informational only.
  });

  /**
   * TODO: Verify recycle bin restore returns items to active lists.
   * Blocked: Restore action is not yet available in the UI.
   */
  test.skip('Recycle bin restore returns items to active lists (TODO)', async () => {
    // Restore action is not yet available in the UI.
  });

  /**
   * TODO: Verify downstream financial impact updates contract/budget totals.
   * Blocked: Financial impact rollups are not yet wired to change events.
   */
  test.skip('Downstream financial impact updates contract/budget totals (TODO)', async () => {
    // Financial impact rollups are not yet wired to change events.
  });
});
