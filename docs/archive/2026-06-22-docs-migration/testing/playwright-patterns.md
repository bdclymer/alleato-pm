# Playwright Patterns — Alleato-PM

> A snapshot of the tried-and-true Playwright patterns we reuse across e2e suites. Copy snippets directly into new specs so every test feels familiar and stable.

## 1. Project layout we expect
- `frontend/config/playwright/playwright.config.ts` configures `chromium`, 1 worker, `video: 'on'`, `timeout: 120000`, and `expect.timeout: 15000`.
- All suites live under `frontend/tests/<domain>/` (e.g., `change-orders/`, `financial/`).
- Shared helpers live in `tests/helpers/` and `tests/fixtures/` (`auth.setup.ts`, `db.ts`, `navigation.ts`, `poll.ts`, etc.).

## 2. Selector strategy
1. Prefer `getByTestId()` for unique UI elements (`data-testid` attributes are the most resilient).
2. When targeting accessibility roles, scope by `name`:
   ```ts
   await page.getByRole('button', { name: /create change order/i }).click();
   ```
3. Avoid ambiguous `getByText` calls in tables. If you must use text, combine with `.first()`, `.last()`, or scope to a `within` block.
4. `locator('#id')` is valid when the component has a predictable ID, but avoid relying on auto-generated ones.

## 3. Navigation/wait patterns
- Never use `waitForLoadState('networkidle')`. Always wait for `domcontentloaded`, or explicitly wait for the critical node (table, form, toast).
- Use `safeNavigate()` and `waitForTableLoad()` from `helpers/navigation.ts` when hitting list routes to handle race conditions.
- When you need to wait for backend persistence, use `pollFor()`:
  ```ts
  await pollFor(
    () => getChangeOrder(created.id),
    (fresh) => expect(fresh.status).toBe('approved'),
    20000,
  );
  ```

## 4. Data helpers we reuse
- `tests/helpers/db.ts` exports `createChangeOrder`, `deleteChangeOrdersByProject`, `createProject`, etc.
- Every suite should seed its own project:
  ```ts
  test.beforeAll(async () => {
    projectId = await createProject(`E2E ${Date.now()}`);
    await addProjectMember(projectId, testUserId, 'admin');
  });
  ```
- Use `cleanupProjectArtifacts(projectId)` in `afterAll` so nothing bleeds into other tests.

## 5. Pattern for form-driven CRUD tests
1. `page.goto('/${projectId}/feature/new', { waitUntil: 'domcontentloaded' });`
2. Fill inputs using `getByLabel`, `getByTestId`, or `locator('#id')`.
3. Click the submit button with `getByRole('button', { name: /save|create/i })`.
4. Assert the toast, table row, or DB row exists; use `pollFor` or `expect(...).toBeVisible({ timeout: 15000 })`.
5. Delete the fixture and confirm removal (UI + optional DB).

## 6. Flake-resistant assertions
- Always check for the element that signals success (toast, status chip, new row) before continuing.
- When an action may be delayed (e.g., workflow approval), assert via `pollFor` rather than `expect(some locator).toHaveText(...)` immediately.
- Use `expect(locator).toBeAttached()` or `.toBeVisible()` with explicit timeouts instead of relying on implicit waits.

## 7. Avoid these anti-patterns
- Hardcoding `/31/...` URLs or IDs.
- Using `page.waitForTimeout()` as the main wait (only use it for short animation delays).
- Not cleaning up data (`cleanupProjectArtifacts` exists for a reason).
- Relying on row counts instead of searching for your seeded row.
- Using the wrong CHECK constraint case when seeding a row (inspect `supabase/migrations` or `database.types.ts`).

## 8. Reuse docs and templates
- When documenting a new pattern, link back to this file plus `docs/testing/templates/*.md` (crud, modal, form) so the next engineer copies the same code style.
- Keep this doc synchronized with `docs/testing/e2e-testing-guide.md` — if you update `pollFor` guidance, update both.
