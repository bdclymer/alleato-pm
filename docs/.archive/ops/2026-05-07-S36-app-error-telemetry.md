# Handoff: 2026-05-07 — Application Error Telemetry

## Intake Block

1) Session ID: S36
2) Task ID: AAI-340
3) Linear issue: AAI-340
4) Linear URL: https://linear.app/megankharrison/issue/AAI-340/implement-application-error-telemetry-and-repair-queue
5) Current status: Pending Review
6) Files changed (absolute paths):
   - `/Users/meganharrison/Documents/alleato-pm/supabase/migrations/20260507180000_create_app_error_telemetry.sql`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/types/database.types.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/app-error-telemetry.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/app-error-reporter.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/app-error-classification.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/linear/issues.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/guardrails/api.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/api-client.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/api/app-error-events/route.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/api/admin/app-errors/[groupId]/route.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/(admin)/errors/page.tsx`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/(admin)/errors/app-errors-client.tsx`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/admin/errors/page.tsx`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/components/providers/app-error-telemetry-provider.tsx`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/root-client-widgets.tsx`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/global-error.tsx`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/components/layout/RouteErrorPage.tsx`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/components/providers/chunk-error-recovery.tsx`
7) Commands run and outcome (pass/fail counts):
   - `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts` — pass
   - `npx supabase db query --linked --file supabase/migrations/20260507180000_create_app_error_telemetry.sql` — initial fail due user FK type mismatch, pass after correcting `user_profiles.id` FK columns to UUID and cleaning partial tables
   - `npx supabase db query --linked "insert into supabase_migrations.schema_migrations(...)"` — pass; marked only `20260507180000`
   - `npm run db:migrations:verify-applied -- supabase/migrations/20260507180000_create_app_error_telemetry.sql` — pass
   - `npx supabase db query --linked "select public.record_app_error_event(...)"` — pass; grouped smoke event inserted and read back, then cleaned up
   - `npm run check:routes` — pass
   - `cd frontend && npx eslint --quiet ...telemetry files...` — pass
   - `cd frontend && npm run typecheck` — fail, existing repo-wide type debt unrelated to telemetry files; first telemetry page typing issue fixed
   - `cd frontend && tsc --noEmit --pretty false | rg "telemetry file patterns"` — pass by no matches after fix; no telemetry-specific compiler output remains
   - `agent-browser open http://localhost:3000/admin/errors ...` — pass after adding `/admin/errors` redirect to `/errors`
   - `agent-browser click "tbody tr:first-child button[aria-label='Open error details']"` — pass; detail sheet opened with classification, diagnosis, fix packet, Linear link fields, and recent events
   - `cd frontend && npx eslint --quiet 'src/lib/app-error-classification.ts' 'src/app/api/admin/app-errors/[groupId]/route.ts' 'src/app/(admin)/errors/app-errors-client.tsx'` — pass
   - `cd frontend && npx eslint --quiet 'src/lib/linear/issues.ts' 'src/lib/app-error-classification.ts' 'src/app/api/admin/app-errors/[groupId]/route.ts' 'src/app/(admin)/errors/app-errors-client.tsx'` — pass
   - `agent-browser eval "fetch('/api/admin/app-errors/<group>', { method: 'POST' })..."` — blocked by Linear upstream 401; route returned fail-loud `UPSTREAM_FAILURE` with `Linear credentials were rejected. Update LINEAR_MCP_TOKEN or LINEAR_API_KEY.`
   - Linear connector `_save_issue` — pass; created `AAI-343` from the captured source-sync fix packet.
   - `npx supabase db query --linked "update public.app_error_groups set linear_issue_id = 'AAI-343'..."` — pass; linked source-sync error group to `AAI-343` and set status `triaged`.
   - `npx supabase db query --linked "update public.app_error_groups set linear_issue_id = 'AAI-340'..."` — pass; linked Linear credential failure groups back to the active telemetry issue and set status `needs_human`.
8) Evidence artifacts (screenshot/video/report/log paths):
   - Browser screenshot: `/Users/meganharrison/.agent-browser/tmp/screenshots/screenshot-2026-05-07T18-02-54-661Z-awuvib.png`
   - Detail sheet screenshot: `/Users/meganharrison/.agent-browser/tmp/screenshots/screenshot-2026-05-07T21-18-30-531Z-ktgi6b.png`
   - Browser text proof: page showed `Application Errors`, `Active groups`, `Captured events`, and grouped rows from live telemetry
   - Detail text proof: sheet showed `Client runtime failure`, `Diagnosis`, copy-ready `Fix Packet`, `Linear Link`, and raw `Recent Events`
   - Linear-create failure proof: request id `7ec37325-925d-4ba9-b5e0-8093e228c4eb` returned `UPSTREAM_FAILURE` because the runtime Linear credential was rejected.
   - Linear issue created from fix packet: `AAI-343` — `https://linear.app/megankharrison/issue/AAI-343/high-network-or-upstream-failure-apiadminsource-syncstatus`
   - DB link proof: source-sync group `e9e534b3-b23d-4f67-a71e-9f7beef229c1` now has `linear_issue_id=AAI-343`, `status=triaged`.
   - DB triage proof: runtime Linear credential failure groups are linked to `AAI-340` and marked `needs_human`.
   - Migration ledger: `Supabase migration ledger check passed: 20260507180000`
9) Top 3 findings (frontend-visible issues first):
   - `/admin/errors` would 404 because `(admin)` is a route group; added a redirect so `/admin/errors` and `/errors` both resolve to the error review surface.
   - Telemetry immediately captured real existing failures through client route-boundary, client API fetch, and API guardrail paths, proving the grouping loop is live.
   - Error groups now generate a structured fix packet in the admin detail sheet, so repeated failures can move into Linear/Codex without manually reconstructing the evidence.
   - The admin detail sheet now has a `Create Issue` action wired to a server-side Linear GraphQL helper; duplicate creation is guarded by returning the existing linked issue when present.
   - A real captured source-sync timeout was converted into Linear issue `AAI-343` and linked back to `app_error_groups`, proving the repair queue handoff shape works even while the app runtime token needs refresh.
   - Full frontend typecheck remains blocked by existing repo-wide nullability and AI-chat type debt unrelated to this task.
10) Recommended next action (one line): Refresh the runtime Linear credential, then rerun the `Create Issue` action and confirm the created issue id/url persists to `app_error_groups`.
11) Handoff file path: docs/ops/handoffs/2026-05-07-S36-app-error-telemetry.md
12) Migration ledger evidence: `npm run db:migrations:verify-applied -- supabase/migrations/20260507180000_create_app_error_telemetry.sql` passed for `20260507180000`.

## Linear Updates

- Kickoff comment: Posted to AAI-340.
- Milestone comments: Completion comment pending.

## Current Status

Implementation complete and pending review with one runtime config blocker. Raw telemetry events, grouped error records, API/client capture, route/global/chunk error capture, admin review UI, status update API, detail/fix-packet API, copy-ready admin fix packet sheet, Linear link fields, direct Linear issue creation route/button, `/admin/errors` redirect, remote migration apply, ledger verification, targeted lint, route check, database smoke, and browser smoke are complete. A real captured source-sync timeout was converted into Linear issue `AAI-343` and linked back to the error group. Live in-app Linear creation currently fails because the configured Linear credential is rejected by Linear.

## Exact Next Step

Refresh `LINEAR_MCP_TOKEN` or `LINEAR_API_KEY` for the frontend runtime, then rerun `Create Issue` from `/admin/errors` and verify `linear_issue_id`, `linear_issue_url`, and `status=triaged` persist on the group.

## Known Pitfalls

- Telemetry writes must remain non-blocking; the recorder logs telemetry failures but does not throw into user flows.
- `user_profiles.id` is UUID on the linked remote; app error user FK columns must stay UUID.
- Full frontend typecheck currently fails on unrelated repo-wide debt; use targeted grep until that baseline is repaired.
- Existing worktree includes unrelated changes from other sessions; do not revert or mix them with this telemetry work.
- The Linear app connector works for Codex comments, but the app runtime uses its own env token. If the runtime token is stale/revoked, the admin button must fail loudly rather than pretending an issue was created.

## Evidence

- Admin page: `frontend/src/app/(admin)/errors/page.tsx`
- Admin client: `frontend/src/app/(admin)/errors/app-errors-client.tsx`
- Client reporter: `frontend/src/lib/app-error-reporter.ts`
- Server recorder: `frontend/src/lib/app-error-telemetry.ts`
- Fix packet builder: `frontend/src/lib/app-error-classification.ts`
- Linear issue helper: `frontend/src/lib/linear/issues.ts`
- API guardrail capture: `frontend/src/lib/guardrails/api.ts`
- Shared fetch capture: `frontend/src/lib/api-client.ts`
- Migration: `supabase/migrations/20260507180000_create_app_error_telemetry.sql`
