# Handoff: 2026-05-02 - Subcontract Schema Guardrails

## Intake Block

1) Session ID: S31
2) Task ID: AAI-307
3) Linear issue: AAI-307
4) Linear URL: https://linear.app/megankharrison/issue/AAI-307/bug-subcontract-create-path-wrote-nonexistent-schema-column-and
5) Current status: In Progress
6) Files changed (absolute paths): `/Users/meganharrison/Documents/alleato-pm/package.json`; `/Users/meganharrison/Documents/alleato-pm/scripts/predeploy-quality-gate.sh`; `/Users/meganharrison/Documents/alleato-pm/scripts/audits/check-no-manual-db-type-overrides.mjs`; `/Users/meganharrison/Documents/alleato-pm/scripts/check-db-types-current.mjs`; `/Users/meganharrison/Documents/alleato-pm/frontend/package.json`; `/Users/meganharrison/Documents/alleato-pm/frontend/scripts/audit/audit-db-mappers.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/db/subcontracts.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/db/__tests__/subcontracts.unit.test.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/src/app/api/projects/[projectId]/subcontracts/__tests__/route.test.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/src/components/domain/contracts/subcontract-form/useSubcontractFormState.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/tests/helpers/db.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/tests/e2e/commitments/commitments.smoke.spec.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/tests/e2e/commitments/commitments.regression.spec.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/src/components/domain/change-events/ChangeEventRfqsTab.tsx`; `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-05-02-S31-subcontract-schema-guardrails.md`
7) Commands run and outcome (pass/fail counts): `node scripts/audits/check-no-manual-db-type-overrides.mjs` (pass); `node scripts/check-db-types-current.mjs` (pass); `cd frontend && npm run test:unit -- --runTestsByPath src/lib/db/__tests__/subcontracts.unit.test.ts --runInBand` (pass, 5/5); `cd frontend && npm run test:unit -- --runTestsByPath src/app/api/projects/[projectId]/subcontracts/__tests__/route.test.ts --runInBand` (pass, 1/1); `cd frontend && npx playwright test tests/e2e/commitments/commitments.smoke.spec.ts -g "create subcontract persists to database" --config=config/playwright/playwright.no-webserver.config.ts --project=chromium` (pass, targeted); `cd frontend && npx playwright test tests/e2e/commitments/commitments.regression.spec.ts -g "Create subcontract via form persists to database" --config=config/playwright/playwright.no-webserver.config.ts --project=chromium` (pass, targeted); `cd frontend && npm run audit:forms` (pass); `npm run db:audit` (fail, unrelated audit debt in `frontend/src/lib/acumatica/mirror-sync.ts` on `acumatica_sync_state` unknown columns); `cd frontend && npm run audit:forms:components` (fail, legacy repo debt: 495 violations)
8) Evidence artifacts (screenshot/video/report/log paths): `http://localhost:3000/762/commitments/new?type=subcontract` live repro/fix route; `frontend/tests/test-results/e2e-commitments-commitment-b71eb-ntract-persists-to-database-chromium/test-failed-1.png`; `frontend/tests/test-results/e2e-commitments-commitment-b71eb-ntract-persists-to-database-chromium/error-context.md`; Linear issue `AAI-307`
9) Top 3 findings (frontend-visible issues first): Subcontract create failed because the app tried to write a nonexistent `subcontracts.accounting_method` column; generated Supabase DB types were bypassed locally and there was no route-level or mapper-level contract guardrail to stop it; the broader audit still shows unrelated DB audit debt in `mirror-sync` plus large form-component legacy debt across the repo.
10) Recommended next action (one line): Fix the `acumatica_sync_state` write payload next, then run the full forms/component cleanup in prioritized file clusters.
11) Handoff file path: `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-05-02-S31-subcontract-schema-guardrails.md`
12) Migration ledger evidence: None required. No migration was created in this slice.

## Linear Updates

- Kickoff comment: Posted to AAI-307 as Linear comment `f4c48db5-4046-4a85-9c4a-c4927f4c7453`.
- Milestone comments: Initial Codex status/evidence update posted in `f4c48db5-4046-4a85-9c4a-c4927f4c7453`.
- Completion/blocker comment: Pending

## Current Status

The subcontract schema-drift bug is fixed and guarded.

- The subcontract mapper no longer writes `accounting_method` into `subcontracts`.
- The route now has contract coverage proving unsupported columns are not inserted.
- Repo guardrails now fail loudly on stale generated DB types, manual DB type overrides in write surfaces, and mapper-return payload drift against generated insert columns.
- The subcontract create form preload path is more stable under dev-time route compilation races.
- The commitments smoke/regression create specs now assert the real success path instead of treating a global `role="alert"` surface as an error.
- The broader form-field audit is clean again after fixing the RFQ numeric placeholder.

Open follow-up from the broad audit:

- `npm run db:audit` still fails in `frontend/src/lib/acumatica/mirror-sync.ts`.
- `npm run audit:forms:components` still reports large legacy form-component debt across many files.

## Exact Next Step

Fix the `acumatica_sync_state` unknown-column payload in `frontend/src/lib/acumatica/mirror-sync.ts`, rerun `npm run db:audit`, then start the form-component debt cleanup from the highest-violation files.

## Known Pitfalls

- The orchestration ledger files already contain unresolved merge-conflict markers; only minimal edits should be made until that cleanup is handled deliberately.
- `npm run db:audit` is now stricter because it includes mapper-payload auditing, so unrelated DB write debt will surface immediately.
- The broad form-component audit is existing repo debt, not a regression introduced by this subcontract fix.
- The subcontract form uses transient retry only for idempotent preload GETs; do not apply that pattern to mutating requests.

## Resume Commands

```bash
cd /Users/meganharrison/Documents/alleato-pm
sed -n '1,240p' docs/ops/handoffs/2026-05-02-S31-subcontract-schema-guardrails.md
sed -n '1,240p' frontend/src/lib/db/subcontracts.ts
sed -n '1,220p' frontend/src/app/api/projects/[projectId]/subcontracts/__tests__/route.test.ts
sed -n '1,260p' frontend/scripts/audit/audit-db-mappers.ts
node scripts/audits/check-no-manual-db-type-overrides.mjs
node scripts/check-db-types-current.mjs
npm run db:audit
cd frontend && npm run audit:forms && npm run audit:forms:components
```

## Evidence

- Linear issue: https://linear.app/megankharrison/issue/AAI-307/bug-subcontract-create-path-wrote-nonexistent-schema-column-and
- Failing screenshot before test assertion repair: `frontend/tests/test-results/e2e-commitments-commitment-b71eb-ntract-persists-to-database-chromium/test-failed-1.png`
- Failing error context before assertion repair: `frontend/tests/test-results/e2e-commitments-commitment-b71eb-ntract-persists-to-database-chromium/error-context.md`
