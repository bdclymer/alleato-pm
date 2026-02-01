# E2E Testing Guide — Alleato-PM

> A comprehensive reference for writing, running, and debugging Playwright E2E tests.
> After reading this guide, creating new tests should be a no-brainer.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Best Example Tests (Gold Standards)](#best-example-tests-gold-standards)
3. [The Test Skeleton — Copy-Paste Starter](#the-test-skeleton--copy-paste-starter)
4. [Helpers Reference](#helpers-reference)
5. [Selector Priority & Patterns](#selector-priority--patterns)
6. [Navigation Patterns](#navigation-patterns)
7. [Database Enum Values (CHECK Constraints)](#database-enum-values-check-constraints)
8. [Running Tests](#running-tests)
9. [Known Issues & Solutions](#known-issues--solutions)
10. [Anti-Patterns (Things That Break Tests)](#anti-patterns-things-that-break-tests)
11. [Debugging Playbook](#debugging-playbook)
12. [Checklist for New Tests](#checklist-for-new-tests)

---

## Architecture Overview

```
frontend/
  config/playwright/
    playwright.config.ts        # Main config (port 3000, video: on, 1 worker)
  tests/
    .auth/
      user.json                 # Saved auth state (auto-generated)
    auth.setup.ts               # Logs in once, all tests reuse the session
    fixtures/
      index.ts                  # Extended test with authenticatedRequest, safeNavigate
      auth.ts                   # Auth token extraction logic
    helpers/
      db.ts                     # Supabase admin client — create/read/delete test data
      cleanup.ts                # cleanupProjectArtifacts() — tears down entire project
      poll.ts                   # pollFor() — wait for DB state to match expectations
      navigation.ts             # safeNavigate(), waitForTableLoad(), etc.
      test-data.ts              # TestDataManager class + generators + templates
      bootstrap.ts              # createTestProject() — fully populated project via API
      supabase.ts               # Raw Supabase client creation
    financial/
      budget.spec.ts            # Budget CRUD tests
      commitments.spec.ts       # Commitments (subcontracts) CRUD tests
      direct-costs.spec.ts      # Direct costs CRUD tests
    change-orders/
      change-orders.spec.ts     # Change orders CRUD tests (GOLD STANDARD)
    change-events/
      change-events.spec.ts     # Change events CRUD tests (GOLD STANDARD)
    e2e/                        # Legacy/comprehensive tests (70+ files)
```

### How Auth Works

1. `auth.setup.ts` runs **first** (Playwright project dependency)
2. It logs in via the real `/auth/login` page using `TEST_USER_1` / `TEST_PASSWORD_1` env vars
3. Auth cookie is saved to `tests/.auth/user.json`
4. All `chromium` project tests inherit this `storageState` automatically
5. If the cookie hasn't expired, setup **skips** the login (fast re-runs)

### Key Config Values

| Setting | Value | Why |
|---------|-------|-----|
| `workers` | `1` | Tests share DB state; parallel execution causes race conditions |
| `fullyParallel` | `false` | Same reason |
| `video` | `'on'` | Always record for review |
| `timeout` | `120000` | 2 min — some tests seed data + wait for API |
| `expect.timeout` | `15000` | 15s default for assertions |
| `screenshot` | `'only-on-failure'` | Saves disk space |

---

## Best Example Tests (Gold Standards)

### Tier 1: `change-orders.spec.ts` (THE reference)

**Location:** `frontend/tests/change-orders/change-orders.spec.ts`

**Why it's the best:**
- Uses `data-testid` attributes for precise, non-brittle selectors
- Every test seeds its own data via `createChangeOrder()` in `db.ts`
- Every test cleans state first: `await deleteChangeOrdersByProject(projectId)`
- Uses `pollFor()` to verify DB persistence after UI actions
- Tests real user workflows: create, edit, status transitions, delete
- `beforeAll` creates a fresh project; `afterAll` tears it down completely

**Pattern highlights:**

```typescript
// Precise selector via data-testid (ideal)
await page.getByTestId(`row-actions-${changeOrder.id}`).click();
await page.getByRole("menuitem", { name: "Edit" }).click();

// DB verification after UI action
await pollFor(
  () => getChangeOrder(changeOrder.id),
  (updated) => {
    expect(updated.description).toBe("Revised scope description");
  },
);
```

### Tier 2: `change-events.spec.ts`

**Location:** `frontend/tests/change-events/change-events.spec.ts`

**Why it's good:**
- Uses `test.describe.serial()` for ordered tests
- Creates data via UI helper function (`createChangeEventViaUi`)
- Tests financial rollups (line items sum correctly)
- Tests tab filtering with count assertions
- Uses `authenticatedRequest` fixture for API-level data creation

**Pattern highlights:**

```typescript
// Create via API fixture (fast, reliable)
const response = await authenticatedRequest.post(
  `/api/projects/${projectId}/change-events/${id}/line-items`,
  { data: payload },
);
expect(response.ok()).toBe(true);

// Poll DB to verify
await expect
  .poll(async () => (await fetchLineItems(id)).length)
  .toBe(2);
```

### Tier 3: `commitments.spec.ts` and `direct-costs.spec.ts`

**Location:** `frontend/tests/financial/`

**Why they're good:**
- Full CRUD coverage (empty state, seed, create, edit, delete, search, view)
- Resilient patterns (reload fallback for slow data hydration)
- Clean separation of concerns (db helpers do the heavy lifting)

**Pattern highlights (commitments):**

```typescript
// Reload fallback for timing issues
const dataVisible = await page
  .getByRole("cell", { name: "Concrete delivery for foundations" })
  .isVisible({ timeout: 5000 })
  .catch(() => false);
if (!dataVisible) {
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
}
```

---

## The Test Skeleton — Copy-Paste Starter

Copy this for any new feature test file:

```typescript
import { test, expect } from "@playwright/test";
import {
  addProjectMember,
  createProject,
  getUserIdByEmail,
} from "../helpers/db";
import { cleanupProjectArtifacts } from "../helpers/cleanup";
import { pollFor } from "../helpers/poll";

const testUserEmail =
  process.env.PLAYWRIGHT_TEST_USER_EMAIL ?? "test1@mail.com";

let projectId: number;
let testUserId: string;

test.describe("Feature Name – CRUD Workflows", () => {
  // ── SETUP: Create isolated project ──────────────────────────────
  test.beforeAll(async () => {
    testUserId = await getUserIdByEmail(testUserEmail);
    projectId = await createProject(`E2E Feature ${Date.now()}`);
    await addProjectMember(projectId, testUserId, "admin");
  });

  // ── TEARDOWN: Clean everything ──────────────────────────────────
  test.afterAll(async () => {
    if (projectId) {
      await cleanupProjectArtifacts(projectId);
    }
  });

  // ── READ: Empty state ───────────────────────────────────────────
  test("Empty state shows when no items exist", async ({ page }) => {
    // Clean any existing data
    // await deleteItemsByProject(projectId);

    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Assert empty state message OR empty table
    const emptyMsg = page.getByText(/no .* found/i);
    await expect(emptyMsg).toBeVisible({ timeout: 15000 });
  });

  // ── READ: Seeded data renders ───────────────────────────────────
  test("Seeded item renders in the list", async ({ page }) => {
    // Clean slate
    // await deleteItemsByProject(projectId);

    // Seed via DB helper
    // const item = await createItem({ project_id: projectId, ... });

    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Reload fallback for timing
    const visible = await page
      .getByRole("cell", { name: "Expected Text" })
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!visible) {
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
    }

    await expect(
      page.getByRole("cell", { name: "Expected Text" }),
    ).toBeVisible({ timeout: 15000 });
  });

  // ── CREATE: Form submission ─────────────────────────────────────
  test("Create item via form persists to database", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature/new`);
    await page.waitForLoadState("domcontentloaded");

    // Fill form fields
    await page.locator("#fieldName").fill("Test Value");

    // Submit
    await page.getByRole("button", { name: /save|create|submit/i }).click();

    // Verify persistence
    // await pollFor(
    //   () => listItemsForProject(projectId),
    //   (rows) => {
    //     const created = rows.find(r => r.name === "Test Value");
    //     expect(created).toBeTruthy();
    //   },
    //   20000,
    // );
  });

  // ── DELETE: Remove item ─────────────────────────────────────────
  test("Delete item removes it from list", async ({ page }) => {
    // Seed item
    // const item = await createItem({ project_id: projectId, ... });

    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Find row and open action menu
    const row = page.getByRole("row", { name: /Item Name/i });
    await expect(row).toBeVisible({ timeout: 15000 });

    // Click action menu (adapt selector to your UI)
    const actionBtn = row.getByRole("button", { name: /open menu/i });
    await actionBtn.click();
    await page.waitForTimeout(500);

    // Click delete
    await page.getByRole("menuitem", { name: /delete/i }).first().click();

    // Confirm dialog
    const confirmBtn = page.getByRole("button", { name: /delete|confirm/i }).last();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Verify gone
    await expect(row).not.toBeVisible({ timeout: 10000 });
  });
});
```

---

## Helpers Reference

### `db.ts` — Database Operations

All functions use the **Supabase service role key** (admin access, bypasses RLS).

| Function | Purpose | Returns |
|----------|---------|---------|
| `getUserIdByEmail(email)` | Get auth user UUID | `string` |
| `getPersonIdByAuthUserId(authId)` | Resolve auth user to person_id | `string` |
| `createProject(name)` | Create project | `number` (project ID) |
| `addProjectMember(projectId, authUserId, role)` | Add user to project | `void` |
| `createSubcontract(input)` | Create subcontract | row data |
| `createPurchaseOrder(input)` | Create purchase order | row data |
| `createDirectCost(input)` | Create direct cost | row data |
| `createChangeOrder(input)` | Create change order | row data |
| `listSubcontractsForProject(projectId)` | List (non-deleted) | array |
| `listDirectCostsForProject(projectId)` | List all | array |
| `listChangeOrdersForProject(projectId)` | List all | array |
| `listBudgetLinesForProject(projectId)` | List all | array |
| `deleteSubcontractsByProject(projectId)` | Hard delete all | `void` |
| `deleteDirectCostsByProject(projectId)` | Hard delete all | `void` |
| `deleteChangeOrdersByProject(projectId)` | Hard delete all | `void` |
| `deleteBudgetLinesByProject(projectId)` | Hard delete all | `void` |
| `deletePurchaseOrdersByProject(projectId)` | Hard delete all | `void` |
| `deleteProjectMembers(projectId)` | Remove memberships | `void` |
| `deleteProject(projectId)` | Delete project | `void` |
| `getAdminClient()` | Singleton Supabase client | `SupabaseClient` |

**Adding a new entity helper:**

```typescript
// 1. Define the input interface
export interface MyEntityInput {
  project_id: number;
  name: string;
  status?: string;
  // ... match your table columns
}

// 2. Create function
export async function createMyEntity(input: MyEntityInput) {
  const { data, error } = await supabase
    .from("my_entities")
    .insert(input)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create my_entity: ${error?.message}`);
  }
  return data;
}

// 3. List function
export async function listMyEntitiesForProject(projectId: number) {
  const { data, error } = await supabase
    .from("my_entities")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list my_entities: ${error.message}`);
  }
  return data || [];
}

// 4. Delete function
export async function deleteMyEntitiesByProject(projectId: number) {
  const { error } = await supabase
    .from("my_entities")
    .delete()
    .eq("project_id", projectId);

  if (error) {
    throw new Error(`Failed to delete my_entities: ${error.message}`);
  }
}
```

### `cleanup.ts` — Project Teardown

```typescript
cleanupProjectArtifacts(projectId)
```

Deletes in dependency order: change orders -> direct costs -> subcontracts -> purchase orders -> budget lines -> project members -> project. All with `.catch(() => {})` so non-critical failures don't block cleanup.

**When adding a new entity**, add its delete call to `cleanupProjectArtifacts`:

```typescript
export async function cleanupProjectArtifacts(projectId: number) {
  await deleteChangeOrdersByProject(projectId);
  await deleteDirectCostsByProject(projectId).catch(() => {});
  await deleteSubcontractsByProject(projectId).catch(() => {});
  await deletePurchaseOrdersByProject(projectId).catch(() => {});
  await deleteBudgetLinesByProject(projectId).catch(() => {});
  await deleteMyEntitiesByProject(projectId).catch(() => {});  // ADD HERE
  await deleteProjectMembers(projectId);
  await deleteProject(projectId);
}
```

### `poll.ts` — Wait for DB State

Two flavors:

```typescript
// pollFor — runs assertion inside the poll loop
await pollFor(
  () => getChangeOrder(changeOrder.id),   // fetcher
  (updated) => {                           // assertion
    expect(updated.status).toBe("approved");
    expect(updated.approved_at).toBeTruthy();
  },
  15000,  // timeout (default 10s)
);

// pollForSimple — returns the poll builder
await pollForSimple(
  async () => (await fetchLineItems(id)).length,
).toBe(2);
```

### `fixtures/index.ts` — Extended Test

Import from `../fixtures` instead of `@playwright/test` when you need:

```typescript
import { test, expect } from '../fixtures';

test('API test', async ({ authenticatedRequest }) => {
  const res = await authenticatedRequest.get('/api/projects');
  expect(res.ok()).toBe(true);
});

test('navigation test', async ({ safeNavigate }) => {
  await safeNavigate('/projects');
});
```

### `test-data.ts` — Auto-Tracking Data Manager

```typescript
import { TestDataManager, TestDataGenerators } from '../helpers/test-data';

const testData = new TestDataManager();

test.afterEach(async ({ authenticatedRequest }) => {
  await testData.cleanup(authenticatedRequest);  // Deletes in reverse order
});

test('create via API', async ({ authenticatedRequest }) => {
  const project = await testData.create(authenticatedRequest, 'change-events', {
    title: TestDataGenerators.uniqueName('Test CE'),
    status: 'draft',
  }, { projectId: '60' });
});
```

---

## Selector Priority & Patterns

### Preferred Selectors (Most Reliable First)

| Priority | Selector | When to Use | Example |
|----------|----------|-------------|---------|
| 1 | `getByTestId` | When `data-testid` exists | `page.getByTestId("change-order-submit")` |
| 2 | `getByRole` | Buttons, cells, rows, headings | `page.getByRole("button", { name: /save/i })` |
| 3 | `getByLabel` | Form inputs with labels | `page.getByLabel("Description")` |
| 4 | `getByPlaceholder` | Search inputs | `page.getByPlaceholder(/search/i)` |
| 5 | `locator("#id")` | HTML `id` attributes | `page.locator("#contractNumber")` |
| 6 | `getByText` | Static text (use sparingly) | `page.getByText("No items found.")` |

### Common Patterns

```typescript
// Table cell (avoid getByText for table data — causes strict mode violations)
page.getByRole("cell", { name: "Concrete delivery" })

// Table row by content
page.getByRole("row", { name: /Electrical Work Package/i })

// Button in a specific row
const row = page.getByRole("row", { name: /My Item/i });
row.getByRole("button", { name: /open menu/i })

// Dialog actions
const dialog = page.getByRole("dialog");
dialog.getByRole("button", { name: /save/i })

// Tab buttons
page.getByRole("tab", { name: /cost codes/i })

// Menu items (from dropdown)
page.getByRole("menuitem", { name: /delete/i }).first()

// Last matching button (useful for confirmation dialogs)
page.getByRole("button", { name: /delete|confirm/i }).last()
```

### Strict Mode Violation Fix

When `getByText("something")` matches multiple elements:

```typescript
// BAD — matches <p> and <td> containing same text
page.getByText("Concrete delivery")

// GOOD — scoped to table cells only
page.getByRole("cell", { name: "Concrete delivery" })

// GOOD — take first match explicitly
page.getByText("Concrete delivery").first()
```

---

## Navigation Patterns

### The Golden Rule

**NEVER use `networkidle`.** Always use `domcontentloaded`.

```typescript
// BAD — will timeout on modern apps with SSE/WebSocket connections
await page.goto(url);
await page.waitForLoadState('networkidle');

// GOOD
await page.goto(url);
await page.waitForLoadState('domcontentloaded');

// ALSO GOOD — inline option
await page.goto(`/${projectId}/change-events`, {
  waitUntil: 'domcontentloaded',
});
```

### Reload Fallback Pattern

For pages where data might not be visible immediately after seeding:

```typescript
await page.goto(`/${projectId}/direct-costs`);
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(2000);  // Brief wait for API response

// Check if data is visible
const visible = await page
  .getByRole("cell", { name: "My Seeded Item" })
  .isVisible({ timeout: 5000 })
  .catch(() => false);

// If not, reload once
if (!visible) {
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
}

// Now assert
await expect(
  page.getByRole("cell", { name: "My Seeded Item" }),
).toBeVisible({ timeout: 15000 });
```

### Navigation Helpers (from `helpers/navigation.ts`)

```typescript
import { safeNavigate, navigateAndWaitFor, waitForTableLoad } from '../helpers/navigation';

await safeNavigate(page, '/projects');
await navigateAndWaitFor(page, '/projects', '[data-testid="project-list"]');
await waitForTableLoad(page, '[data-testid="budget-table"]', { minRows: 3 });
```

---

## Database Enum Values (CHECK Constraints)

These are **case-sensitive**. Using wrong case causes constraint violations that look like mysterious failures.

### Subcontracts (`subcontracts_status_check`)

```
'Draft' | 'Sent' | 'Pending' | 'Approved' | 'Executed' | 'Closed' | 'Void'
```

### Direct Costs — Status (`direct_costs_status_check`)

```
'Draft' | 'Approved' | 'Rejected' | 'Paid'
```

### Direct Costs — Cost Type (`direct_costs_cost_type_check`)

```
'Expense' | 'Invoice' | 'Subcontractor Invoice'
```

### Change Orders — Status

```
'draft' | 'pending' | 'approved' | 'rejected' | 'void'
```

*(Change orders use lowercase — different convention from subcontracts/direct costs)*

### Companies — Status

```
'ACTIVE' | 'INACTIVE'
```

*(Companies use UPPERCASE)*

### How to Find Constraint Values for New Tables

```bash
rg "CHECK.*status" supabase/migrations/ --no-heading
rg "CHECK.*type" supabase/migrations/ --no-heading
```

Or read the generated types:

```bash
npm run db:types
# Then read frontend/src/types/database.types.ts
```

---

## Running Tests

### Commands (from `frontend/` directory)

```bash
# Run ALL tests
npx playwright test --config=config/playwright/playwright.config.ts

# Run specific suite
npx playwright test tests/financial/ --config=config/playwright/playwright.config.ts

# Run single file
npx playwright test tests/financial/commitments.spec.ts --config=config/playwright/playwright.config.ts

# Run with visible browser
npx playwright test tests/financial/ --config=config/playwright/playwright.config.ts --headed

# Run with UI mode (interactive)
npx playwright test --config=config/playwright/playwright.config.ts --ui

# Run specific test by name
npx playwright test --config=config/playwright/playwright.config.ts -g "Create subcontract"

# View HTML report after run
npx playwright show-report tests/playwright-report

# Using npm scripts
npm run test              # All tests
npm run test:headed       # With browser
npm run test:ui           # UI mode
npm run test:report       # View report
```

### Reporter Output

- `--reporter=list` — Inline pass/fail in terminal (best for CI and watching progress)
- `--reporter=html` — Full HTML report with screenshots, videos, traces (default)
- Videos saved at: `tests/test-results/<test-name>/video.webm`
- Screenshots saved at: `tests/test-results/<test-name>/*.png`

### Filtering Tips

```bash
# Only financial tests
npx playwright test tests/financial/ ...

# Only change-orders
npx playwright test tests/change-orders/ ...

# By grep pattern
npx playwright test -g "Delete" ...  # All tests with "Delete" in name

# Skip setup (use existing auth)
npx playwright test --project=chromium ...
```

---

## Known Issues & Solutions

### Issue 1: Strict Mode Violation — Multiple Elements Match

**Error:** `Error: strict mode violation: getByText("Something") resolved to 2 elements`

**Cause:** Text appears in both a summary area (`<p>`) and a table cell (`<td>`).

**Fix:**
```typescript
// Scope to table cells
page.getByRole("cell", { name: "Something" })

// Or take first explicitly
page.getByText("Something").first()
```

### Issue 2: CHECK Constraint Violation

**Error:** `new row for relation "subcontracts" violates check constraint "subcontracts_status_check"`

**Cause:** Using wrong case (`"draft"` instead of `"Draft"`).

**Fix:** Check [Database Enum Values](#database-enum-values-check-constraints) above. Always use the exact case from the migration.

### Issue 3: Data Not Visible After Seeding

**Error:** Test fails because seeded data doesn't appear in the table.

**Cause:** Page loads before Supabase INSERT commits, or React query cache is stale.

**Fix:** Use the [Reload Fallback Pattern](#reload-fallback-pattern).

### Issue 4: Auth Session Expired Mid-Suite

**Error:** Test redirected to `/auth/login` unexpectedly.

**Cause:** Auth cookie expired during a long test run (2+ minutes).

**Fix:**
1. Delete `tests/.auth/user.json` and re-run (forces fresh login)
2. Or increase cookie expiry in Supabase dashboard

### Issue 5: Action Menu Has Multiple Delete Items

**Error:** `getByRole("menuitem", { name: /delete/i })` matches header menu + row action menu.

**Fix:**
```typescript
// Use data-testid if available
page.locator("[data-testid^='row-action-delete']").first()

// Or scope to the specific menuitem
page.getByRole("menuitem", { name: /delete/i }).first()
```

### Issue 6: Confirmation Dialog — Wrong Button Selected

**Error:** Clicking "Delete" hits the wrong button (there are multiple with matching text).

**Fix:**
```typescript
// Use .last() for confirmation dialogs (they render on top/after)
page.getByRole("button", { name: /delete|confirm/i }).last()
```

### Issue 7: Form Auto-Generates Values

**Error:** `contractNumber` field already has a prefix like `SC-002`, so `.fill()` appends.

**Fix:**
```typescript
await numberInput.clear();  // Clear existing value first
await numberInput.fill(contractNumber);
```

### Issue 8: "Unable to load data" / "Failed to fetch"

**Error:** Page shows error state instead of data.

**Cause:** The test user doesn't have project membership, or the API route has a bug.

**Fix:**
1. Verify `addProjectMember()` ran in `beforeAll`
2. Check that the `role` is `"admin"` (has full access)
3. Check the API route's error handling

### Issue 9: `networkidle` Timeout

**Error:** `page.waitForLoadState('networkidle')` hangs forever.

**Cause:** Modern apps with WebSocket/SSE connections never reach "idle."

**Fix:** Replace with `'domcontentloaded'`. See [Navigation Patterns](#navigation-patterns).

### Issue 10: Feature Not Implemented Yet

**Error:** Button shows toast like "Coming soon" instead of opening form.

**Fix:** Skip the test with a clear message:
```typescript
test.skip("Create item via form persists to database", async ({ page }) => {
  // Feature not yet implemented — handleCreate shows toast.info("Coming soon")
});
```

---

## Anti-Patterns (Things That Break Tests)

### 1. Using `networkidle`
```typescript
// NEVER
await page.waitForLoadState('networkidle');
```

### 2. Hardcoding Project IDs
```typescript
// BAD — fragile, breaks when data changes
await page.goto('/31/budget');

// GOOD — create your own project
const projectId = await createProject(`E2E Test ${Date.now()}`);
await page.goto(`/${projectId}/budget`);
```

### 3. Not Cleaning Up Data
```typescript
// BAD — leaves orphaned data that pollutes other tests
test("create item", async ({ page }) => {
  await createItem({ ... });
  // No cleanup!
});

// GOOD — clean before AND after
test.beforeAll(async () => { /* create project */ });
test.afterAll(async () => { await cleanupProjectArtifacts(projectId); });
```

### 4. Relying on Specific Row Counts
```typescript
// BAD — breaks if other tests leave data
expect(rows).toHaveLength(1);

// GOOD — check your specific item exists
expect(rows.find(r => r.title === "My Item")).toBeTruthy();
```

### 5. Smoke Tests Disguised as E2E
```typescript
// BAD — this is a smoke test, NOT an E2E test
test("page loads", async ({ page }) => {
  await page.goto("/budget");
  await expect(page.locator("h1")).toBeVisible();
});
```

Every E2E test must: navigate, interact, submit, verify result. See the [E2E Testing Standards](/.claude/rules/E2E-TESTING-STANDARDS.md).

### 6. Using `page.waitForTimeout` as Primary Wait

```typescript
// BAD — arbitrary wait, slow and unreliable
await page.waitForTimeout(5000);
await expect(item).toBeVisible();

// GOOD — wait for the actual condition
await expect(item).toBeVisible({ timeout: 15000 });
```

`waitForTimeout` is acceptable for:
- Brief pauses after click to let animations/transitions complete (300-500ms)
- Brief delay between seeding and navigation (1-2s)

### 7. Wrong Enum Case in Test Data

```typescript
// BAD — will violate CHECK constraint
await createSubcontract({ status: "draft" });     // lowercase
await createDirectCost({ cost_type: "expense" });  // lowercase

// GOOD — match exact case from migration
await createSubcontract({ status: "Draft" });
await createDirectCost({ cost_type: "Expense" });
```

---

## Debugging Playbook

### Step 1: Read the Error

Playwright errors include:
- **Selector used** — what it tried to find
- **Page URL** — where the test was
- **Screenshot** — `test-results/<test-name>/*.png`
- **Video** — `test-results/<test-name>/video.webm`

### Step 2: Watch the Video

```bash
# Open video after a failed run
open tests/test-results/<folder-name>/video.webm
```

### Step 3: Run in Headed Mode

```bash
npx playwright test tests/financial/commitments.spec.ts \
  --config=config/playwright/playwright.config.ts \
  --headed
```

### Step 4: Use UI Mode for Debugging

```bash
npx playwright test --config=config/playwright/playwright.config.ts --ui
```

UI mode lets you:
- Step through tests
- See live DOM snapshots
- Inspect locators
- View network requests

### Step 5: Check the Error Context File

When a test fails, Playwright generates error context at:
```
tests/test-results/<test-name>/error-context.md
```

This contains the full page accessibility snapshot (DOM tree) which shows exactly what elements exist.

### Step 6: Add Debug Logging

```typescript
// Temporary — remove before committing
console.log("URL:", page.url());
console.log("Visible buttons:", await page.getByRole("button").allTextContents());

// Take manual screenshot
await page.screenshot({ path: "debug.png" });
```

---

## Checklist for New Tests

Before writing:

- [ ] Read `frontend/src/types/database.types.ts` to verify table/column names
- [ ] Check enum constraints in `supabase/migrations/` for valid status/type values
- [ ] Verify the page/feature exists and works manually in the browser
- [ ] Check if `data-testid` attributes exist on the UI components

While writing:

- [ ] Uses `beforeAll` to create project + add member
- [ ] Uses `afterAll` to call `cleanupProjectArtifacts(projectId)`
- [ ] Each test calls `deleteXByProject(projectId)` for clean slate
- [ ] Uses `domcontentloaded` (never `networkidle`)
- [ ] Uses `getByRole`/`getByTestId` (not fragile `getByText` for table data)
- [ ] Includes reload fallback for data visibility
- [ ] Uses `pollFor()` to verify DB state after mutations
- [ ] Tests real user actions (not just "page loads")
- [ ] Covers: empty state, read, create, edit, delete (minimum)

After writing:

- [ ] Run the test file solo: `npx playwright test tests/your-file.spec.ts ...`
- [ ] Run 2-3 times to check for flakiness
- [ ] Run with the full suite to check for interference
- [ ] Watch the video to verify it looks correct
- [ ] Add entity to `cleanupProjectArtifacts` in `cleanup.ts`
- [ ] Add `deleteXByProject` to `db.ts` exports

---

## Quick Reference: Complete DB Helper Template

When adding support for a new database table, add all three functions to `db.ts`:

```typescript
// ─── My Entities ───────────────────────────────────────────────

export interface MyEntityInput {
  project_id: number;
  name: string;
  status?: string;        // CHECK constraint values: 'Draft' | 'Active' | ...
  description?: string;
  created_by_user_id?: string;
}

export async function createMyEntity(input: MyEntityInput) {
  const { data, error } = await supabase
    .from("my_entities")
    .insert(input)
    .select("*")
    .single();
  if (error || !data) throw new Error(`Failed to create: ${error?.message}`);
  return data;
}

export async function listMyEntitiesForProject(projectId: number) {
  const { data, error } = await supabase
    .from("my_entities")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list: ${error.message}`);
  return data || [];
}

export async function deleteMyEntitiesByProject(projectId: number) {
  const { error } = await supabase
    .from("my_entities")
    .delete()
    .eq("project_id", projectId);
  if (error) throw new Error(`Failed to delete: ${error.message}`);
}
```

Then add `deleteMyEntitiesByProject` to `cleanup.ts` and export all three from `db.ts`.
