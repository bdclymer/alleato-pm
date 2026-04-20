# Tool Test Catalog (Phase 1)

- Updated: 2026-04-20
- Scope: docs/testing + frontend/tests Playwright suites
- Intent: establish one canonical ownership model per tool and define target suite size for consolidation.

## Canonical Model

- `Parity Matrix` (`docs/testing/*-test-matrix.md`): complete feature parity checklist (source-of-truth for what should be covered).
- `Guided Scenarios` (`docs/testing/*-scenarios.md`): compact human-run regression smoke paths.
- `Playwright` (`frontend/tests/...`): deterministic automated core flows only.

### Coverage Levels

- `Smoke`: 8-15 tests/tool (critical create-read-update-delete + navigation + permissions sanity).
- `Regression`: 20-40 tests/tool (workflow, filtering, exports, major edge cases).
- `Extended`: 40+ only for high-risk/high-complexity tools (budget, commitments) with explicit justification.

## Per-Tool Baseline And Targets

| Tool | Matrix Cases (current) | Guided Scenarios (current) | Playwright Tests (current, mapped) | Recommended Automated Target | Notes |
|---|---:|---:|---:|---:|---|
| budget | 128 | 10 | 242 | 60 | High complexity; keep extended regression but remove legacy/duplicate suites. |
| prime-contracts | 90 | 27 | 241 | 35 |  |
| commitments | 89 | 40 | 258 | 70 | Current automated volume is excessive; consolidate into modular suites. |
| direct-costs | 89 | 31 | 59 | 30 |  |
| change-events | 70 | 15 | 70 | 35 |  |
| change-orders | 90 | 13 | 67 | 30 |  |
| invoices | 86 | 14 | 35 | 20 |  |
| directory | 108 | 14 | 202 | 45 |  |
| schedule | 93 | 13 | 30 | 25 |  |
| documents | 73 | 15 | 20 | 25 |  |
| drawings | — | 13 | 19 | 20 |  |
| photos | 93 | 85 | 1 | 25 | Large manual scenarios; reduce to risk-based coverage. |
| meetings | 87 | 18 | 10 | 15 |  |
| daily-log | 85 | 14 | 4 | 15 |  |
| submittals | 77 | 21 | 6 | 20 | Current docs are inventory-heavy; convert to executable parity cases. |
| specifications | 40 | — | 29 | 18 | Current matrix is feature inventory, not executable case set. |
| rfis | 88 | 19 | 10 | 20 |  |
| punch-list | 78 | 19 | 5 | 15 |  |
| project-lifecycle | — | — | 77 | 12 | Keep as cross-tool journey smoke only. |

## Guardrails To Enforce In CI

- Enforce naming policy: only `*.smoke.spec.ts`, `*.regression.spec.ts`, `*.api.spec.ts`, `*.workflow.spec.ts`.
- Fail on new files matching ad-hoc patterns: `verify`, `debug`, `live`, `gauntlet`, `final`, `investigation`.
- Enforce skip budget: hard fail when total `test.skip` > 25 or per-file skip ratio > 30% without waiver.
- Require each Playwright test to reference a matrix/scenario ID in test title or comment.
