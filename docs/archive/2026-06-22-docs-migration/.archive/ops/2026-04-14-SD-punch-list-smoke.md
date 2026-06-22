# SD Handoff - Punch List Smoke Test

## Scope

- Task ID: `ORCH-014`
- Objective: run a smoke test for the `punch-list` feature, capture evidence, and produce a pass/fail punch list
- Owned paths:
  - `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/(main)/[projectId]/punch-list/**`
  - `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/api/projects/[projectId]/punch-items/**`
  - `/Users/meganharrison/Documents/github/alleato-pm/docs/testing/punch-list-test-matrix.md`
  - `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/**`
  - `/Users/meganharrison/Documents/github/alleato-pm/docs/ops/handoffs/2026-04-14-SD-punch-list-smoke.md`

## Intake Block

1. Session ID: `SD`
2. Task ID: `ORCH-014`
3. Current status: `Pending Review`
4. Files changed (absolute paths):
   - `/Users/meganharrison/Documents/github/alleato-pm/docs/ops/orchestration/session-board.md`
   - `/Users/meganharrison/Documents/github/alleato-pm/docs/ops/handoffs/2026-04-14-SD-punch-list-smoke.md`
   - `/Users/meganharrison/Documents/github/alleato-pm/docs/ops/orchestration/review-queue.md`
   - `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/report.md`
   - `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/api/projects/[projectId]/punch-items/payload.ts`
   - `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/api/projects/[projectId]/punch-items/route.ts`
   - `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/api/projects/[projectId]/punch-items/[punchItemId]/route.ts`
   - `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/api/projects/[projectId]/punch-items/__tests__/route.test.ts`
5. Commands run and outcome (pass/fail counts):
   - `pwd` - pass
   - `rg --files docs/ops/orchestration . | rg 'session-board\\.md|review-queue\\.md|leader-runbook\\.md|worker-protocol\\.md|punch.?list|punch-list|punch list|test-matrix\\.md$|scenarios\\.md$'` - pass
   - `git status --short` - pass
   - `sed -n '1,220p' docs/ops/orchestration/session-board.md` - pass
   - `sed -n '1,220p' docs/ops/orchestration/review-queue.md` - pass
   - `sed -n '1,260p' docs/testing/punch-list-test-matrix.md` - pass
   - `find frontend/src/app/api/projects/\\[projectId\\]/punch-list -name 'route.ts' -type f | sort` - fail, path does not exist
   - `find frontend/src/app/\\(main\\)/\\[projectId\\]/punch-list -name 'page.tsx' -type f | sort` - pass
   - `rg -n "export async function (GET|POST|PATCH|PUT|DELETE)|export function (GET|POST|PATCH|PUT|DELETE)" frontend/src/app/api/\\[projectId\\]/punch-list -g 'route.ts'` - fail, path does not exist
   - `sed -n '1,260p' docs/ops/orchestration/worker-protocol.md` - pass
   - `rg --files frontend/src/app/api | rg 'punch|punch-list|punch-items'` - pass
   - `rg -n "punch-list|punch_items|punch item|punch-items" frontend/src/app/api frontend/src/hooks frontend/src/components frontend/src/app/\\(main\\)/\\[projectId\\]/punch-list -g '!**/*.map'` - pass
   - `ls docs/ops/handoffs | tail -20` - pass
   - `sed -n '1,220p' docs/ops/handoffs/2026-04-14-S9-directory-members-company.md` - pass
   - `rg -n "smoke:fixtures|smoke-test-output|agent-browser|TEST_USER_1|PROJECT_ID=767|punch-list" package.json frontend/package.json scripts -g '!**/node_modules/**'` - pass
   - `sed -n '1,220p' docs/ops/handoffs/HANDOFF-TEMPLATE.md` - pass
   - `sed -n '1,260p' frontend/src/hooks/use-punch-items.ts` - pass
   - `sed -n '1,260p' frontend/src/components/domain/punch-items/punch-item-form-dialog.tsx` - pass
   - `sed -n '1,220p' '/Users/meganharrison/.agents/skills/supabase-postgres-best-practices/SKILL.md'` - pass
   - `sed -n '1,220p' '/Users/meganharrison/.agents/skills/supabase-postgres-best-practices/references/schema-data-types.md'` - pass
   - `sed -n '1,220p' '/Users/meganharrison/.agents/skills/supabase-postgres-best-practices/references/schema-constraints.md'` - pass
   - `npx jest --runTestsByPath 'src/app/api/projects/[projectId]/punch-items/__tests__/route.test.ts' --runInBand` - pass (10/10)
   - `npx eslint 'src/app/api/projects/[projectId]/punch-items/route.ts' 'src/app/api/projects/[projectId]/punch-items/[punchItemId]/route.ts' 'src/app/api/projects/[projectId]/punch-items/payload.ts' 'src/app/api/projects/[projectId]/punch-items/__tests__/route.test.ts'` - pass
   - `agent-browser --session punch-fix-verify ...` required-fields-only create rerun - pass
6. Evidence artifacts:
   - `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/report.md`
   - `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/screenshots/validation.png`
   - `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/screenshots/create-result.png`
   - `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/screenshots/create-result-fixed.png`
   - `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/screenshots/detail-page.png`
   - `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/screenshots/edit-prefill.png`
   - `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/screenshots/edit-result.png`
   - `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/screenshots/recycle-bin.png`
   - `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/screenshots/restore-result.png`
7. Top 3 findings (frontend-visible issues first):
   - The required-fields-only create bug is fixed by a shared write-path schema that normalizes blank optional fields to `null` before validation/database writes.
   - PATCH now uses the same validated write boundary as POST, removing the old raw-JSON + generic-500 path and preventing route drift.
   - The feature is user-facing as `punch-list` but the implemented API contract lives under `/api/projects/[projectId]/punch-items`, so convention-only smoke harnesses still need that mapping.
8. Recommended next action (one line):
   - Accept this fix and rerun the full punch-list smoke report so the stale failing artifact is replaced with a passing one.
9. Handoff file path:
   - `/Users/meganharrison/Documents/github/alleato-pm/docs/ops/handoffs/2026-04-14-SD-punch-list-smoke.md`

## Current Status

Smoke run completed, the primary create failure was fixed, targeted route verification passed, and the required-fields-only browser flow now succeeds live.

## Exact Next Step

Leader review, then rerun the formal punch-list smoke report to update the archived verdict.

## Known Pitfalls

- The route slug mismatch (`punch-list` UI vs `punch-items` API) can create false failures if commands are copied directly from the generic skill template.
- Raw `curl` replay of the Supabase auth cookie can produce a misleading delete-route auth decode error; browser-context fetch is the reliable verification path here.
- Existing local changes in unrelated files must not be disturbed.

## Resume Commands

```bash
cd /Users/meganharrison/Documents/github/alleato-pm/frontend
npx jest --runTestsByPath 'src/app/api/projects/[projectId]/punch-items/__tests__/route.test.ts' --runInBand
cd /Users/meganharrison/Documents/github/alleato-pm
agent-browser --session punch-fix-verify open http://localhost:3000/767/punch-list
```

## Evidence

- Smoke report: `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/report.md`
- Primary failure screenshot: `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/screenshots/create-result.png`
- Fixed-flow screenshot: `/Users/meganharrison/Documents/github/alleato-pm/smoke-test-output/punch-list/screenshots/create-result-fixed.png`
