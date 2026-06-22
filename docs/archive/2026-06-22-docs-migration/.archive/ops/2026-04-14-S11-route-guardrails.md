# Handoff: 2026-04-14 - S11 route guardrails

## Intake Block

1. Session ID: `S11`
2. Task ID: `ORCH-013`
3. Current status: `Pending Review`
4. Files changed (absolute paths)
   - `/Users/meganharrison/Documents/github/alleato-pm/scripts/check-changed-route-guardrails.mjs`
   - `/Users/meganharrison/Documents/github/alleato-pm/scripts/__tests__/check-changed-route-guardrails.test.mjs`
   - `/Users/meganharrison/Documents/github/alleato-pm/scripts/predeploy-quality-gate.sh`
   - `/Users/meganharrison/Documents/github/alleato-pm/package.json`
   - `/Users/meganharrison/Documents/github/alleato-pm/frontend/package.json`
5. Commands run and outcome (pass/fail counts)
   - `npm run test:route-guardrails` -> pass (`3` tests, `0` failures)
   - `npm run verify:changed-route-guardrails` -> fail as intended (`7` raw-error routes in changed set now block)
   - `cd frontend && npm run guardrails:changed` -> fail as intended (`7` raw-error routes in changed set now block)
   - `npm run verify:all-route-guardrails` -> pass (`274` raw-error routes reported, non-blocking debt scan preserved)
   - `npm run verify:changed-api-client-enforcement` -> pass (`0` changed frontend code files against current HEAD diff)
6. Evidence artifacts (screenshot/video/report/log paths)
   - Terminal command output only
7. Top 3 findings (frontend-visible issues first)
   - Changed-route guardrails were giving false confidence because raw-error debt defaulted to non-blocking even on touched routes.
   - Predeploy had no changed-file API-client enforcement step, so new raw `fetch('/api/...')` debt could slip through even though the lint rule existed.
   - After hardening, the changed-route gate now correctly blocks on these touched raw-error routes: `frontend/src/app/api/agentation/inbox/route.ts`, `frontend/src/app/api/projects/[projectId]/budget/lines/[lineId]/route.ts`, `frontend/src/app/api/projects/[projectId]/commitment-options/route.ts`, `frontend/src/app/api/projects/[projectId]/vendors/route.ts`, `frontend/src/app/api/settings/users/invite/route.ts`, `frontend/src/app/api/testing/parity/route.ts`, `frontend/src/app/api/testing/runs/[runId]/results/route.ts`.
8. Recommended next action (one line)
   - Assign the seven blocking routes to their owners for structured-envelope migration, because the guardrail now fails loudly on them.
9. Handoff file path
   - `/Users/meganharrison/Documents/github/alleato-pm/docs/ops/handoffs/2026-04-14-S11-route-guardrails.md`

## Implementation Summary

- Changed-route raw-error enforcement now defaults to `true`; full-repo debt scans remain non-blocking by default unless explicitly overridden.
- Added a focused Node test to lock the enforcement behavior so this cannot silently drift back.
- Made the root and frontend changed-route npm commands explicit about raw-error enforcement.
- Added a root `verify:changed-api-client-enforcement` command and inserted it into `scripts/predeploy-quality-gate.sh` before route/build steps so new changed-file API-client debt is caught predeploy.

## Risks

- The changed-route gate now surfaces real debt in seven touched API routes; those routes will continue to block until migrated.
- `verify:changed-api-client-enforcement` checks changes relative to current `HEAD`/base diff, not arbitrary uncommitted working-tree edits. That keeps it stable in a shared worktree, but means developers still need to run it in the branch/commit flow where the diff is meaningful.
