# Testing Anti-Patterns — Alleato-PM

> A shared reference that captures patterns we forbid in Playwright E2E tests, API helpers, and testing docs. Use it as a checklist when reviewing new specs or debugging flaky suites.

## 1. Hardcoding environment-specific project IDs
Hardcoding `/31/budget` or `/12/commitments` makes tests brittle because the seed data or project memberships can change on every run. Always:
- create the project during `test.beforeAll` (or via `createProject()` helper)
- store the ID in a local variable
- build every URL from `${projectId}` so other suites can run in parallel.

## 2. Using `networkidle` waits
Modern apps never reach a true “network idle” state because of SSE, WebSocket, or analytics beacons. Any `page.waitForLoadState('networkidle')` causes hangs in CI. Always use `domcontentloaded` or explicitly wait for the element you care about.

## 3. Relying on `waitForTimeout` as the main wait strategy
Sleeping for 5 seconds is slow and unreliable. Replace `await page.waitForTimeout(5000)` with a `waitFor` pattern such as `expect(locator).toBeVisible({ timeout: 15000 })` or `await pollFor()` so the test waits only as long as needed.

## 4. Skipping cleanup
Leaving records behind pollutes other tests and causes order-dependent failures. Every suite must clean after itself:
- `test.afterAll` should call `cleanupProjectArtifacts(projectId)`
- `test.beforeEach` can delete stale rows for the entity under test
- when using DB helpers, wrap them with `.catch(() => {})` so cleanup never blocks the suite.

## 5. Asserting strict row counts
Expecting `rows.length === 1` breaks once another test inserts data, especially when suites share projects. Instead, assert the presence of your specific seeded data (e.g., by text or `data-testid`) and tolerate extra rows.

## 6. Writing smoke tests that do nothing
A test that only verifies a page loads is a smoke test, not an E2E test. Every E2E spec must:
1. load a route
2. interact with at least one UI control or API helper
3. mutate state (create/edit/delete)
4. verify the result (UI + optional DB check)
If you need a health check, keep it in a separate smoke suite.

## 7. Sending wrong enum values
Supabase CHECK constraints are case-sensitive. `createSubcontract({ status: 'draft' })` fails if the migration expects `'Draft'`. Always copy the exact case from `supabase/migrations` or `database.types.ts`.

## 8. Using brittle selectors
Avoid `getByText` on table rows unless you scope to the exact cell. Prefer `getByTestId`, `getByRole` with explicit `name`, or `locator('#id')`. When you must use `getByText`, combine it with `.first()` or `.last()` so it doesn't fail when duplicate text appears.

## 9. Not polling for persistence
After UI actions, expect some eventual consistency. Instead of asserting immediately, use `pollFor()` to repeatedly fetch the record and assert field values. This prevents transient failures when the backend buffers writes.

## 10. Mixing UI navigation helpers without waiting
Chaining `await safeNavigate(page, '/budget'); await page.goto('/budget');` without waiting for `domcontentloaded` or `waitForTableLoad` causes race conditions. Always wait for the helper to settle and verify key elements (table header, form field, toast) before continuing.

## Recommended fix pattern
Whenever you spot one of the anti-patterns above:
1. Update the test to use the safe alternative described in this doc
2. Re-run the suite locally with `pnpm test:unit` (or `npx playwright test <file>`) to confirm the flake is gone
3. Add the scenario to `tests/playwright-report/report.json` if it ever caused a CI failure so we can prevent regressions.

Use this doc as a living checklist for new tests, docs, and automation helpers. Keep it tidy — if you discover a new anti-pattern, add it here before it spawns another flaky run.
