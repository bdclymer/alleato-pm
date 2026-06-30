# Handoff: 2026-06-30 - RAG Pipeline Reliability

## Intake Block

1) Session ID: S103
2) Task ID: `docs/ops/tasks/2026-06-30-rag-pipeline-reliability.md`
3) Linear issue: AAI-779
4) Linear URL: https://linear.app/megankharrison/issue/AAI-779/make-rag-pipeline-reliability-consistently-green
5) Current status: Blocked/Deferred; live RAG data gates are green, provider-credit runway gate is blocked.
6) Files changed (absolute paths): `/Users/meganharrison/Documents/alleato-pm/backend/src/services/health/ai_provider_health.py`; `/Users/meganharrison/Documents/alleato-pm/backend/tests/test_ai_provider_health.py`; `/Users/meganharrison/Documents/alleato-pm/docs/ai-plan/councils/2026-06-30-rag-strategy-council-pipeline-reliability.md`; `/Users/meganharrison/Documents/alleato-pm/docs/ops/plans/2026-06-30-rag-pipeline-green-plan.md`; `/Users/meganharrison/Documents/alleato-pm/docs/ops/tasks/2026-06-30-rag-pipeline-reliability.md`; `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-06-30-S103-rag-pipeline-reliability.md`.
7) Commands run and outcome (pass/fail counts): `npm run rag:verify:source-lifecycle` pass; `npm run rag:verify:meetings` pass; `npm run rag:verify:source-specific` pass; `npm run rag:verify:render-ai` fail on low AI Gateway credits; `PYTHONPATH="$PWD/backend:$PWD/backend/src" backend/.venv/bin/python -m pytest backend/tests/test_ai_provider_health.py -q` pass, 4 tests.
8) Evidence artifacts (screenshot/video/report/log paths): This handoff; `docs/ai-plan/councils/2026-06-30-rag-strategy-council-pipeline-reliability.md`; `docs/ops/plans/2026-06-30-rag-pipeline-green-plan.md`.
9) Top 3 findings:
- Current ingestion/vectorization/source-specific gates are green.
- Provider runway is not green: AI Gateway balance is `$4.8289`, below the `$5.00` safe floor.
- Existing backend AI provider cron did not check the credit floor; it only probed one successful token.
10) Recommended next action (one line): Top up/configure AI Gateway autorecharge, then rerun `npm run rag:verify:render-ai`.
11) Handoff file path: `docs/ops/handoffs/2026-06-30-S103-rag-pipeline-reliability.md`
12) Migration ledger evidence: N/A.

## Linear Updates

- Kickoff: AAI-779 created as urgent parented work item.
- Progress: AAI-779 comment `25ffc53a-6f06-4c2d-bef2-e018c81c0b22` posted with code changes, command evidence, blocker, detection gap, prevention, and next action.

## Current Status

The RAG pipeline is not broken at the retrieval/chunk/source-specific layer in
the current snapshot. The live failure is provider runway: AI Gateway credits
are below the configured safe floor. This can still break RAG consistency because
embedding, task extraction, source synthesis, and packet compilation all depend
on provider availability.

The backend provider health cron now checks the AI Gateway credit floor after a
successful one-token provider probe. Low credits return `status=down`,
`reason=low_credits`, and a non-zero cron exit path, which triggers the existing
Render/Teams/Slack alert behavior before provider exhaustion turns into silent
RAG degradation.

## Blocker Detail

Cause: AI Gateway credit balance is below the safe floor.

Detection gap: `scripts/verify/verify_render_ai_gateway_health.mjs` caught the
low balance, but the backend scheduled `ai_provider_health` cron only issued a
cheap completion probe. A successful one-token response could pass while credits
were already below the operational floor.

Prevention: add the same credit-floor probe to the backend cron so Render fails
and Teams/Slack alert before credits are exhausted.

Owner: Provider billing/runway for AI Gateway; code owner for
`backend/src/services/health/ai_provider_health.py`.

Next action: top up/configure AI Gateway autorecharge, then rerun
`npm run rag:verify:render-ai`.

## Verification

| Check | Command | Result |
| ----- | ------- | ------ |
| Source lifecycle | `npm run rag:verify:source-lifecycle` | Pass |
| Meeting vectorization | `npm run rag:verify:meetings` | Pass |
| Source-specific RAG | `npm run rag:verify:source-specific` | Pass |
| Render/provider runway | `npm run rag:verify:render-ai` | Fail: AI Gateway balance `$4.8289` below `$5.00` floor |
| Provider health regression | `PYTHONPATH="$PWD/backend:$PWD/backend/src" backend/.venv/bin/python -m pytest backend/tests/test_ai_provider_health.py -q` | Pass: 4 passed |

Note: the same pytest command with system `python3` failed before test
collection because the host environment lacks `python-multipart`; the project
virtualenv contains the expected backend dependencies.
