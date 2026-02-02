# Prime Contracts – Patterns & Pitfalls

## API_AUTH_STORAGE_STATE
- **Symptom:** Playwright API specs returned 404s despite valid auth cookies in `tests/.auth/user.json`.
- **Root Cause:** Requests used manual `Cookie` headers via `request` fixture; Next.js `cookies()` ignored them, so Supabase server client had no session.
- **Impact:** All API route tests for prime contracts (CRUD, line items, change orders) reported false negatives and blocked verification.
- **Guard:** Always create API contexts with `storageState` (`createAuthenticatedRequestContext`) instead of header injection. Avoid `withAuth` for API routes.
- **Entry Checks:** If an API test touches Next.js routes, confirm it builds context from `tests/.auth/user.json` and omits manual Cookie headers.
- **Fix Applied:** Updated prime-contract API specs to use authenticated request contexts and added helper in `frontend/tests/helpers/api-auth.ts`.

## ROUTE_PATH_INCONSISTENCY
- **Symptom:** Prime contract pages lived under `/[projectId]/prime-contracts/...` but UI links pushed to `/[projectId]/contracts/...`, causing navigation 404s and broken breadcrumbs.
- **Root Cause:** Legacy "contracts" path lingered after folder rename.
- **Impact:** List, create, detail, and edit flows could not navigate within the module; tests would fail or stall.
- **Guard:** Centralize route segments (`prime-contracts`) and search for stale `/contracts` pushes whenever moving routes. Add regression check in UI tests for in-app navigation.
- **Fix Applied:** Normalized navigation paths in list/new/detail/edit pages to `/prime-contracts` routes; rewrote detail/edit pages for clarity.

## TEST_DATA_DEPENDENCY_PROJECT_ID
- **Symptom:** Change-order API tests assumed project `118` existed.
- **Root Cause:** Hard-coded project id in setup instead of querying fixtures.
- **Impact:** Tests failed on environments without that id, blocking automation.
- **Guard:** Derive project ids from Supabase admin queries or fixtures; avoid hard-coded ids in tests.
- **Fix Applied:** Change-order tests now fetch the first available project via admin client before creating fixtures.

## REMAINING_FEATURE_GAPS
- **Symptom:** Prime contracts module still missing Phase 4/5 deliverables (actions toolbar, advanced filters/search, line items/change orders management sub-pages, billing/payments UI, full E2E coverage, verification report).
- **Impact:** Feature is not production-complete; testing gaps risk false confidence.
- **Guard:** Track TASKS.md Phase 4/5 items; block "complete" status until toolbar, filters, sub-pages, billing UI, E2E tests, and HTML verification report are finished.
- **Fix Status:** Not yet addressed; pending implementation and coverage.

## PLAYWRIGHT_BASE_URL_PORT_MISMATCH
- **Symptom:** Prime-contract Playwright API tests returned 404/HTML because `NEXT_PUBLIC_APP_URL` pointed to localhost:3000 while tests ran on custom port.
- **Root Cause:** Absolute URLs in tests used `process.env.NEXT_PUBLIC_APP_URL`, not the Playwright `baseURL` override.
- **Impact:** All API tests failed before hitting actual routes.
- **Guard:** When overriding Playwright port/host (sandbox), also set `NEXT_PUBLIC_APP_URL` to the same (`http://127.0.0.1:<port>`), or refactor tests to use `apiContext` relative paths only.
- **Fix Applied:** Runs now use `PLAYWRIGHT_HOST/PLAYWRIGHT_PORT` with `NEXT_PUBLIC_APP_URL` set to the same port.

## STATUS_ENUM_MISMATCH_UPDATE
- **Symptom:** Contract update API returned 400 (`prime_contracts_status_check`) during Playwright PUT test.
- **Root Cause:** DB check constraint accepts a different status enum than the legacy test assumption; updating to unsupported statuses triggers DB constraint.
- **Impact:** PUT test failed despite valid payload otherwise.
- **Guard:** Use DB-supported statuses or omit status changes in tests unless the enum is aligned; consider harmonizing schemas/types and validation.
- **Fix Applied:** Test updates avoid unsupported statuses; PUT now passes.
