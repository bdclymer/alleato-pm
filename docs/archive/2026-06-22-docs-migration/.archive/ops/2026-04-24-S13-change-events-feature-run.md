# Handoff: 2026-04-24 - S13 change-events feature run

## Intake Block

1) Session ID: `S13`
2) Task ID: `ORCH-016`
3) Current status: `Blocked`
4) Files changed (absolute paths):
   - `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-04-24-S13-change-events-feature-run.md`
5) Commands run and outcome (pass/fail counts):
   - `pwd && sed -n '1,240p' docs/ops/orchestration/worker-protocol.md` -> pass
   - `sed -n '1,260p' .claude/skills/testing/test-scenario-run-feature/SKILL.md` -> pass
   - `sed -n '261,520p' .claude/skills/testing/test-scenario-run-feature/SKILL.md` -> pass
   - `sed -n '1,240p' docs/ops/orchestration/session-board.md && printf '\n---REVIEW---\n' && sed -n '1,240p' docs/ops/orchestration/review-queue.md` -> pass
   - `which agent-browser && agent-browser --version` -> pass
   - `curl -sf -o /dev/null http://localhost:3000 && echo DEV_SERVER_UP || echo DEV_SERVER_DOWN` -> pass (server down)
   - `set -a; source /Users/meganharrison/Documents/alleato-pm/.env.local; set +a; psql "$DATABASE_URL" -Atc "select to_regclass('public.test_suites') as test_suites, to_regclass('public.test_cases') as test_cases, to_regclass('public.test_runs') as test_runs, to_regclass('public.test_results') as test_results, to_regclass('public.test_screenshots') as test_screenshots;"` -> pass
   - `set -a; source /Users/meganharrison/Documents/alleato-pm/.env.local; set +a; psql "$DATABASE_URL" -Atc "select id, suite_type, tool_name, display_name, total_cases from public.test_suites where tool_name = 'change-events' and suite_type = 'feature';"` -> pass
   - `set -a; source /Users/meganharrison/Documents/alleato-pm/.env.local; set +a; psql "$DATABASE_URL" -Atc "select test_number, test_name, priority, start_url, setup_steps, steps, expected_result, status from public.test_cases where suite_id = 'a6bc5f06-441c-497d-8a6a-304a024b946a' order by test_number;"` -> pass
   - `set -a; source /Users/meganharrison/Documents/alleato-pm/.env.local; set +a; psql "$DATABASE_URL" -Atc "select id, test_number from public.test_cases where suite_id = 'a6bc5f06-441c-497d-8a6a-304a024b946a' and test_number = '1.1';"` -> pass
   - `set -a; source /Users/meganharrison/Documents/alleato-pm/.env.local; set +a; psql "$DATABASE_URL" -Atc "select column_name, is_nullable, data_type from information_schema.columns where table_schema='public' and table_name='test_screenshots' order by ordinal_position;"` -> pass
   - `node` upload loop against Supabase Storage for `1.1-setup.png`, `1.1-final.png`, `1.1-failure-current.png` -> pass
   - `psql` inserts for `public.test_results` and `public.test_screenshots` -> pass
   - `test -f .env && rg -n '^TEST_USER_1=|^TEST_PASSWORD_1=|^SUPABASE_DB_URL=' .env` -> pass
   - `test -f /Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-04-24-S13-change-events-feature-run.md && sed -n '1,260p' /Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-04-24-S13-change-events-feature-run.md || echo HANDOFF_MISSING` -> pass (missing prior file)
   - `printenv | rg 'SUPABASE|DATABASE_URL|POSTGRES'` -> no matching env output
   - `rg -n "SUPABASE_DB_URL|mcp__.*execute_sql|psql \"\\$SUPABASE_DB_URL\"|test_runs|test_results|test_screenshots" docs scripts .claude -S` -> pass
   - `rg -n "Required Intake Block|Session ID|Task ID|Current status|Handoff file path" docs/ops/handoffs docs/ops/orchestration -S` -> pass
   - `sed -n '1,220p' docs/ops/handoffs/HANDOFF-TEMPLATE.md && printf '\n---EXAMPLE---\n' && sed -n '1,220p' docs/ops/handoffs/2026-04-14-SB-workstream.md` -> pass
   - `rg -n "SUPABASE_DB_URL|SUPABASE_URL|SUPABASE_ANON_KEY|SERVICE_ROLE|postgres://|supabase.*project-id|lgveqfnpkxvzbnnwuled" .env .env.* frontend/.env* scripts -S` -> pass
6) Evidence artifacts (screenshot/video/report/log paths):
   - `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1-setup.png`
   - `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1-final.png`
   - `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1-failure-current.png`
   - `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/recordings/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/1.1.webm`
   - `/Users/meganharrison/Documents/alleato-pm/docs/testing/results/change-events-feature-20260424-194339.md`
7) Top 3 findings (frontend-visible issues first):
   - The approval transition case `4.1` is blocked by a line-item revenue-source validation error, so a status-only save still does not clear to `Pending Approval`.
   - The delete case `3.1` surfaced the explicit guardrail that only `Open` or `Void` rows can be deleted, so a `Rejected` row cannot be used for that case.
   - The edit path case `2.1` still drops the description on save, so the form persists title/type/scope/origin but not the description text.
8) Recommended next action (one line):
   - Fix the line-item revenue-source validation on status-only saves, then rerun `4.1` and the pending `4.2` approval case.
9) Handoff file path:
   - `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-04-24-S13-change-events-feature-run.md`

## Current Status

The narrowed batch completed four cases after the initial 1.1 failure: `2.2` passed, `3.1` skipped on a status prerequisite blocker, `3.2` passed, and `4.1` failed on a save validation error. Case `4.2` remains pending because `4.1` never transitioned the row to `Pending Approval`.

Current counts since the resume: `pass=4`, `fail=2`, `skip=1`, `pending=1` (`4.2`).

## Exact Next Step

Fix the approval save validation on `4.1` so the row can transition to `Pending Approval`, then run `4.2`.

## Known Pitfalls

- The browser run used a dedicated session because the default session was dropping to `about:blank`.
- Case evidence is present locally and in Supabase Storage, but the bucket is private so the DB rows intentionally keep `public_url` null.
- The create form exposes `Origin = Emails / Meetings / RFI's`, not the expected `Field`, which is the core defect observed.
- The delete flow enforces a hard status guard: rows must be `Open` or `Void`; `Rejected` rows cannot be deleted from the UI.
- Status-only saves can still be tripped by the line-item revenue-source validation, so approval transitions need a guardrail that fails on unrelated line-item state.

## Resume Commands

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run dev > /tmp/nextjs-dev.log 2>&1 &
for i in $(seq 1 12); do
  grep -q "Ready" /tmp/nextjs-dev.log 2>/dev/null && echo "Server ready" && break
  sleep 5
done
```

## Evidence

1. Reopen `/67/change-events/new` in `agent-browser --session feature-e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff`.
2. Inspect the `Origin` field mapping and description persistence path.
3. Rerun case `1.1` after the fix.

## Evidence

- `test_runs.id = e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff`
- `test_results.id = 300bcefb-7b0d-4914-a077-bd2cdbbb560b`
- `change_events.id = 05204534-3ef2-4e62-ade7-8c692ba163b9`
- Screenshot rows:
  - `setup`
  - `final`
  - `failure-current`

## Narrowed Batch Summary

Cases executed in this resume window:

- `2.2` - pass - `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/2.2-setup.png`, `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/2.2-final.png`, `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/recordings/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/2.2.webm`
- `3.1` - skip - `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/3.1-setup.png`, `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/3.1-final.png`, `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/recordings/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/3.1.webm`
- `3.2` - pass - `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/3.2-setup.png`, `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/3.2-final.png`, `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/recordings/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/3.2.webm`
- `4.1` - fail - `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/4.1-setup.png`, `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/screenshots/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/4.1-final.png`, `/Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/20260424-194339-feature-change-events/recordings/e92cfdc7-0ec4-4987-b2f2-c757ddaf75ff/4.1.webm`

Pending unexecuted case:

- `4.2` - approve a pending approval change event - pending because `4.1` did not persist `Pending Approval`
