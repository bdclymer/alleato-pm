/**
 * Meetings tool — end-to-end coverage of the core workflow:
 * create meeting via dialog → detail page → add category → add item →
 * inline-edit item status → convert to minutes → record official minutes
 * text → create follow-up (carries items) → previous-minutes visible on
 * carried item → soft delete from list → recycle bin restore.
 *
 * Runs against project 876 on this worktree's dedicated dev server
 * (see playwright.config.ts baseURL / PLAYWRIGHT_BASE_URL).
 *
 * Tests run serially and share meeting/follow-up ids captured from the
 * create/follow-up steps — the list page groups meetings by series behind a
 * collapsed expand toggle, so navigating straight to `/PROJECT/meetings/ID`
 * is the reliable way to reach a specific meeting's detail page instead of
 * re-deriving it from the (collapsed) list UI on every test.
 */
import { test, expect, type Locator, type Page } from "@playwright/test";

const PROJECT_ID = "876";
const BASE_MEETINGS_URL = `/${PROJECT_ID}/meetings`;

test.use({ storageState: "tests/.auth/user.json" });

test.describe.configure({ mode: "serial" });

const RUN_ID = Date.now();
const MEETING_NAME = `E2E Meeting ${RUN_ID}`;
const CATEGORY_NAME = `E2E Category ${RUN_ID}`;
const ITEM_TITLE = `E2E Item ${RUN_ID}`;
const OFFICIAL_MINUTES_TEXT = `Official minutes recorded during e2e run ${RUN_ID}.`;

// Populated by the "create meeting" / "create follow-up" tests and reused by
// later tests in the serial run.
let meetingId = "";
let followUpMeetingId = "";

function meetingDetailUrl(id: string): string {
  return `/${PROJECT_ID}/meetings/${id}`;
}

// Short settle wait after the first hydration-dependent element becomes
// visible. Next.js can paint server-streamed HTML for text content a beat
// before React finishes attaching event handlers to nearby interactive
// elements — clicking immediately on that signal intermittently no-ops.
async function settleAfterHydration(page: Page) {
  await page.waitForTimeout(1500);
}

async function openMeetingsList(page: Page) {
  await page.goto(BASE_MEETINGS_URL, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Meetings" })).toBeVisible();
  const createButton = page.getByRole("button", { name: "Create Meeting" });
  await expect(createButton).toBeEnabled({ timeout: 30000 });
  // The toolbar row-count text only renders once the series-list query has
  // resolved — wait for it instead of a skeleton class, which can also
  // appear in unrelated header chrome. A hidden mobile-toolbar duplicate of
  // this text also exists in the DOM, so target the visible (desktop) one.
  const rowCount = page.getByText(/\d+ rows?/).last();
  let loaded = false;
  for (let attempt = 1; attempt <= 3 && !loaded; attempt++) {
    if (attempt > 1) await page.reload({ waitUntil: "domcontentloaded" });
    // Same cold-compile-tax mitigation as openMeetingDetail: reload and
    // give the (possibly still-compiling, or momentarily stalled under
    // sustained sequential-test load) list route another runway rather
    // than treating a single slow load as a real failure.
    loaded = await expect(rowCount)
      .toBeVisible({ timeout: 30000 })
      .then(() => true)
      .catch(() => false);
  }
  expect(loaded).toBe(true);
  await settleAfterHydration(page);
}

/**
 * Clicks `trigger` and waits for `expectVisible` to appear, retrying the
 * click a few times if it doesn't. This dev server compiles routes/chunks
 * on first hit (Turbopack), which occasionally delays a click's effect long
 * enough that a single-shot `.click()` + `expect().toBeVisible()` flakes —
 * re-clicking is harmless here (opening an already-open dialog / re-firing
 * an idempotent toggle) and makes the wait resilient to that cold-start tax.
 */
async function clickUntilVisible(
  trigger: Locator,
  expectVisible: Locator,
  attempts = 4,
): Promise<void> {
  await trigger.waitFor({ state: "visible" });
  // First paint can beat hydration on a cold dev server; clicks before React
  // attaches handlers silently no-op, so wait for the network to settle once.
  await trigger.page().waitForLoadState("networkidle").catch(() => undefined);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await trigger.click();
    try {
      await expect(expectVisible).toBeVisible({ timeout: 15000 });
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
    }
  }
}

/**
 * Opens a dropdown/menu via `menuTrigger` and clicks `menuItem`, treating
 * "open the menu" + "click the item" as one retry-safe unit — a menu opened
 * under the dev server's cold-compile tax can auto-close before a second,
 * separate click reaches it, so re-open + re-click together on failure
 * instead of assuming the menu stays open across two independent steps.
 */
async function openMenuAndClickItem(
  menuTrigger: Locator,
  menuItem: Locator,
  attempts = 4,
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await menuTrigger.click();
    const itemAppeared = await menuItem
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!itemAppeared) continue;

    await menuItem.click();
    return;
  }
  // Final attempt — let the natural assertion failure below report why.
  await menuTrigger.click();
  await menuItem.click();
}

async function openMeetingDetail(page: Page, id: string) {
  await page.goto(meetingDetailUrl(id), { waitUntil: "domcontentloaded" });
  const generalInfo = page.getByText("General Information");
  try {
    await expect(generalInfo).toBeVisible({ timeout: 20000 });
  } catch {
    // Turbopack compiles API routes on first hit in dev, which can push a
    // cold request past the first timeout window. Reload once and give it
    // a longer runway before treating this as a real failure.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(generalInfo).toBeVisible({ timeout: 30000 });
  }
  await settleAfterHydration(page);
}

test.describe("Meetings tool", () => {
  test("create meeting via dialog", async ({ page }) => {
    await openMeetingsList(page);

    await clickUntilVisible(
      page.getByRole("button", { name: "Create Meeting" }),
      page.getByRole("dialog"),
    );

    await page.getByLabel("Meeting Name *").fill(MEETING_NAME);

    await page.getByRole("dialog").getByRole("button", { name: "Create Meeting" }).click();

    // Dialog closes and navigates to the new meeting's detail page.
    await page.waitForURL(new RegExp(`/${PROJECT_ID}/meetings/[^/]+$`), {
      timeout: 15000,
      waitUntil: "commit",
    });
    meetingId = new URL(page.url()).pathname.split("/").pop()!;
    expect(meetingId).toBeTruthy();

    await expect(page.getByText(MEETING_NAME).first()).toBeVisible();
  });

  test("detail page shows general information and default agenda section", async ({ page }) => {
    await openMeetingDetail(page, meetingId);

    await expect(page.getByText("General Information")).toBeVisible();
    await expect(page.getByTestId("agenda-section")).toBeVisible();
    // A freshly-created meeting starts with an "Uncategorized Items" category.
    await expect(page.getByTestId("agenda-category").first()).toBeVisible();
  });

  test("add category", async ({ page }) => {
    await openMeetingDetail(page, meetingId);

    const categoryInput = page.getByPlaceholder("Category name");
    await clickUntilVisible(page.getByRole("button", { name: "Add category" }), categoryInput);
    await categoryInput.fill(CATEGORY_NAME);
    // `fill()` sets the value without a real keyboard event; give React's
    // controlled-input state a beat to catch up before pressing Enter,
    // otherwise the keydown handler can read stale (empty) state and skip
    // the create call entirely.
    await page.waitForTimeout(300);

    const createCategoryResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        /\/api\/projects\/\d+\/meetings\/[^/]+\/categories$/.test(new URL(res.url()).pathname),
      { timeout: 15000 },
    );
    await categoryInput.press("Enter");
    const createCategoryResponse = await createCategoryResponsePromise;
    expect(createCategoryResponse.status()).toBe(201);

    await expect(page.getByText(CATEGORY_NAME)).toBeVisible();
  });

  test("add item to the new category", async ({ page }) => {
    await openMeetingDetail(page, meetingId);

    const categoryBlock = page.getByTestId("agenda-category").filter({ hasText: CATEGORY_NAME });
    await expect(categoryBlock).toBeVisible();

    const quickAddInput = categoryBlock.getByPlaceholder("Add item…");
    await quickAddInput.fill(ITEM_TITLE);
    await page.waitForTimeout(300);

    const createItemResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        /\/api\/projects\/\d+\/meetings\/[^/]+\/items$/.test(new URL(res.url()).pathname),
      { timeout: 15000 },
    );
    await quickAddInput.press("Enter");
    const createItemResponse = await createItemResponsePromise;
    expect(createItemResponse.status()).toBe(201);

    await expect(page.getByTestId("agenda-item-row").filter({ hasText: ITEM_TITLE })).toBeVisible();
  });

  test("inline-edit item status", async ({ page }) => {
    await openMeetingDetail(page, meetingId);

    const itemRow = page.getByTestId("agenda-item-row").filter({ hasText: ITEM_TITLE });
    await expect(itemRow).toBeVisible();

    // Status select is the first combobox-style trigger in the item row.
    const statusTrigger = itemRow.getByRole("combobox").first();
    const inProgressOption = page.getByRole("option", { name: "In Progress" });

    const patchResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === "PATCH" &&
        /\/api\/projects\/\d+\/meetings\/[^/]+\/items\/[^/]+$/.test(new URL(res.url()).pathname),
      { timeout: 15000 },
    );
    await openMenuAndClickItem(statusTrigger, inProgressOption);
    const patchResponse = await patchResponsePromise;
    expect(patchResponse.status()).toBe(200);
    const patchBody = (await patchResponse.json()) as { status?: string };
    expect(patchBody.status).toBe("in_progress");

    await expect(statusTrigger).toContainText("In Progress");
  });

  test("convert to minutes and record official minutes text", async ({ page }) => {
    await openMeetingDetail(page, meetingId);

    // A single click, not a retry loop — this is a mutating POST, and
    // re-clicking while a cold-compiled route is still resolving the first
    // request can fire the mutation multiple times concurrently. Give the
    // (possibly first-hit / Turbopack-compiling) route a generous timeout
    // instead of retrying the click.
    const convertResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        /\/api\/projects\/\d+\/meetings\/[^/]+\/convert$/.test(new URL(res.url()).pathname),
      { timeout: 60000 },
    );
    await page.getByRole("button", { name: "Convert to Minutes" }).click();
    const convertResponse = await convertResponsePromise;
    expect(convertResponse.status()).toBe(200);
    await expect(page.getByRole("button", { name: "Revert to Agenda" })).toBeVisible({
      timeout: 15000,
    });

    const itemRow = page.getByTestId("agenda-item-row").filter({ hasText: ITEM_TITLE });
    // Expand the item to reveal the Official Minutes textarea.
    await itemRow.getByRole("button", { name: "Expand item" }).click();

    const minutesField = itemRow.getByPlaceholder("Record the official minutes for this item…");
    await expect(minutesField).toBeVisible();
    await minutesField.fill(OFFICIAL_MINUTES_TEXT);
    // `fill()` sets the value without a real keyboard event; give React's
    // controlled-input state a beat to catch up before blurring, otherwise
    // the blur handler can read stale state and the PATCH commits nothing
    // (UI still shows the typed value locally, masking the failed persist).
    await page.waitForTimeout(300);

    const commitResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === "PATCH" &&
        /\/api\/projects\/\d+\/meetings\/[^/]+\/items\/[^/]+$/.test(new URL(res.url()).pathname),
      { timeout: 15000 },
    );
    // Blur commits the draft.
    await itemRow.getByText("Tasks").click();
    const commitResponse = await commitResponsePromise;
    expect(commitResponse.status()).toBe(200);
    const commitBody = (await commitResponse.json()) as { official_minutes?: string | null };
    expect(commitBody.official_minutes).toBe(OFFICIAL_MINUTES_TEXT);

    await expect(minutesField).toHaveValue(OFFICIAL_MINUTES_TEXT);
  });

  test("create follow-up meeting carries open items with previous minutes visible", async ({
    page,
  }) => {
    await openMeetingDetail(page, meetingId);

    const moreActionsButton = page.getByRole("button", { name: "More actions" });
    const createFollowUpItem = page.getByRole("menuitem", { name: "Create Follow-Up Meeting" });

    // Opening the menu is safe to retry (idempotent toggle), but creating
    // the follow-up is a real POST — retrying that click risks creating
    // multiple follow-up meetings. So: retry only the "menu opened" step,
    // then click the item exactly once and confirm success via the actual
    // network response rather than a URL-shape guess (the destination URL
    // has the same shape as the source, so `waitForURL` can't disambiguate
    // "navigated" from "already there").
    await clickUntilVisible(moreActionsButton, createFollowUpItem);

    const followUpResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        /\/api\/projects\/\d+\/meetings\/[^/]+\/follow-up$/.test(new URL(res.url()).pathname),
      { timeout: 15000 },
    );
    await createFollowUpItem.click();
    const followUpResponse = await followUpResponsePromise;
    expect(followUpResponse.status()).toBe(201);
    const followUpBody = (await followUpResponse.json()) as { meeting: { id: string } };
    followUpMeetingId = followUpBody.meeting.id;
    expect(followUpMeetingId).toBeTruthy();
    expect(followUpMeetingId).not.toBe(meetingId);

    await page.waitForURL(new RegExp(`/${PROJECT_ID}/meetings/${followUpMeetingId}$`), {
      timeout: 15000,
      waitUntil: "commit",
    });

    const carriedItemRow = page.getByTestId("agenda-item-row").filter({ hasText: ITEM_TITLE });
    await expect(carriedItemRow).toBeVisible();

    await carriedItemRow.getByRole("button", { name: "Expand item" }).click();
    await carriedItemRow.getByText("Previous Minutes").click();

    await expect(carriedItemRow.getByText(OFFICIAL_MINUTES_TEXT)).toBeVisible();
  });

  test("soft delete meeting from list and restore from recycle bin", async ({ page }) => {
    await openMeetingsList(page);

    // Filter the list down to just this run's series first — by this point
    // in a serial run the project has many pre-existing meeting series, and
    // relying on default list order to surface a brand-new row is fragile.
    const searchToggle = page.getByRole("button", { name: "Search table" });
    if (await searchToggle.isVisible().catch(() => false)) {
      await searchToggle.click();
    }
    const searchInput = page.getByPlaceholder("Search meetings or series...");
    await searchInput.fill(MEETING_NAME);
    await page.waitForTimeout(500); // debounced search

    // Meetings are grouped by series; expand the series row that matches our
    // meeting name to reveal the nested meeting row and its row actions.
    // Wait for the row to actually exist before handing off to the
    // click-retry helper — otherwise a slow list fetch means every retry
    // attempt burns its own actionability timeout waiting for a locator
    // that hasn't appeared yet, which can exceed the test's overall budget.
    const seriesRow = page.locator("tr", { hasText: MEETING_NAME });
    await expect(seriesRow.first()).toBeVisible({ timeout: 30000 });

    const seriesToggle = seriesRow
      .getByRole("button", { name: /Expand series|Collapse series/ })
      .first();
    // The series row's own "Meeting actions" trigger doesn't exist yet —
    // wait for at least one nested meeting row (any of them) to confirm
    // the series has expanded before scoping to a specific meeting number.
    await clickUntilVisible(
      seriesToggle,
      page.getByRole("button", { name: "Meeting actions" }).first(),
    );

    // The original meeting (created earlier in this run, meetingId) and its
    // follow-up share the same series name/row text, so scope to the row
    // showing meeting number 1 specifically — otherwise `.first()` on
    // "Meeting actions" can hit whichever meeting the table happens to
    // render first, silently deleting the wrong one.
    // Use the row's accessible name anchored at "#1 " — a bare hasText("#1")
    // also matches the series wrapper <tr> that CONTAINS the nested meetings
    // table (its text includes every child row), which resolves to two
    // "Meeting actions" buttons and trips strict mode.
    const originalMeetingRow = page.getByRole("row", { name: /^#1 / });
    const meetingActionsButton = originalMeetingRow.getByRole("button", {
      name: "Meeting actions",
    });
    await expect(meetingActionsButton).toBeVisible({ timeout: 15000 });

    await openMenuAndClickItem(meetingActionsButton, page.getByRole("menuitem", { name: "Delete" }));

    await expect(page.getByRole("alertdialog")).toBeVisible();
    const deleteResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === "DELETE" &&
        new URL(res.url()).pathname === `/api/projects/${PROJECT_ID}/meetings/${meetingId}`,
      { timeout: 30000 },
    );
    await page.getByRole("button", { name: "Delete Meeting" }).click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.status()).toBe(200);
    await expect(page.getByRole("alertdialog")).not.toBeVisible();

    // Confirm the specific meeting is gone (soft-deleted) via a fresh detail
    // fetch — the follow-up meeting shares the same series name, so
    // text-presence alone can't distinguish "this meeting" from "a sibling
    // meeting in the same series."
    const detailAfterDelete = await page.request.get(
      `/api/projects/${PROJECT_ID}/meetings/${meetingId}`,
    );
    expect(detailAfterDelete.status()).toBe(404);

    // Restore from the recycle bin. Same "#1" scoping as above — the
    // recycle bin can also show a sibling meeting in the same series.
    await page.getByRole("button", { name: "Recycle Bin" }).click();
    await page.waitForURL(/tab=recycle-bin/);
    // Re-apply the search filter — the recycle bin tab is a distinct table
    // view and doesn't reliably inherit the previous tab's search term.
    const recycleBinSearchToggle = page.getByRole("button", { name: "Search table" });
    if (await recycleBinSearchToggle.isVisible().catch(() => false)) {
      await recycleBinSearchToggle.click();
    }
    const recycleBinSearchInput = page.getByPlaceholder("Search meetings or series...");
    if (await recycleBinSearchInput.isVisible().catch(() => false)) {
      await recycleBinSearchInput.fill(MEETING_NAME);
      await page.waitForTimeout(500);
    }

    const recycleBinSeriesToggle = page
      .locator("tr", { hasText: MEETING_NAME })
      .getByRole("button", { name: /Expand series|Collapse series/ })
      .first();
    await expect(recycleBinSeriesToggle).toBeVisible({ timeout: 30000 });

    // Same wrapper-row pitfall as above — anchor on the row accessible name.
    // And same hydration pitfall as the main tab: a single bare click on the
    // toggle can no-op before handlers attach, so retry until the nested
    // row's Restore button actually appears.
    const recycleBinRestoreButton = page
      .getByRole("row", { name: /^#1 / })
      .getByRole("button", { name: "Restore" });
    await clickUntilVisible(recycleBinSeriesToggle, recycleBinRestoreButton);

    const restoreResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        new URL(res.url()).pathname === `/api/projects/${PROJECT_ID}/meetings/${meetingId}/restore`,
      { timeout: 30000 },
    );
    await recycleBinRestoreButton.click();
    const restoreResponse = await restoreResponsePromise;
    expect(restoreResponse.status()).toBe(200);

    // The restored meeting is readable again via a fresh detail fetch.
    const detailAfterRestore = await page.request.get(
      `/api/projects/${PROJECT_ID}/meetings/${meetingId}`,
    );
    expect(detailAfterRestore.status()).toBe(200);

    // And it's back in the default "All" list. Re-apply the search filter so
    // the assertion doesn't depend on list order/pagination, and assert the
    // visible series ROW — bare getByText can match a hidden mobile-toolbar
    // duplicate of the search term.
    await page.getByRole("button", { name: "All", exact: true }).click();
    await page.waitForURL((url) => !url.search.includes("tab=recycle-bin"));
    const allTabSearchToggle = page.getByRole("button", { name: "Search table" });
    if (await allTabSearchToggle.isVisible().catch(() => false)) {
      await allTabSearchToggle.click();
    }
    const allTabSearchInput = page.getByPlaceholder("Search meetings or series...");
    if (await allTabSearchInput.isVisible().catch(() => false)) {
      await allTabSearchInput.fill(MEETING_NAME);
      await page.waitForTimeout(500);
    }
    await expect(
      page.getByRole("row", { name: new RegExp(MEETING_NAME) }).first(),
    ).toBeVisible({ timeout: 30000 });
  });
});
