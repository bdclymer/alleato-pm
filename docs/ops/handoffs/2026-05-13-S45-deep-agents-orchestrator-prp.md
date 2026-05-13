# Handoff: 2026-05-13 - Deep Agents Project Intelligence Orchestrator PRP

## Intake Block

1) Session ID: S45
2) Task ID: AAI-356
3) Linear issue: AAI-356
4) Linear URL: https://linear.app/megankharrison/issue/AAI-356/evaluate-deep-agents-backend-orchestrator-for-alleato-project
5) Current status: Pending Review
6) Files changed (absolute paths):
- `/Users/meganharrison/Documents/alleato-pm/docs/PRPs/deep-agents-project-intelligence/prp-deep-agents-project-intelligence.md`
- `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-05-13-S45-deep-agents-orchestrator-prp.md`
- `/Users/meganharrison/Documents/alleato-pm/docs/ops/orchestration/session-board.md`
- `/Users/meganharrison/Documents/alleato-pm/docs/ops/orchestration/review-queue.md`
- `/Users/meganharrison/Documents/alleato-pm/backend/src/api/main.py`
- `/Users/meganharrison/Documents/alleato-pm/backend/requirements.txt`
- `/Users/meganharrison/Documents/alleato-pm/backend/src/services/agents/__init__.py`
- `/Users/meganharrison/Documents/alleato-pm/backend/src/services/agents/deep_project_intelligence.py`
- `/Users/meganharrison/Documents/alleato-pm/backend/src/services/agents/deep_project_intelligence_contracts.py`
- `/Users/meganharrison/Documents/alleato-pm/backend/tests/test_deep_project_intelligence.py`
7) Commands run and outcome (pass/fail counts):
- PASS: `rg --files docs docs/PRPs _bmad-output 2>/dev/null | rg 'PRP|ai|intelligence|rag|linear|orchestration' | head -120`
- PASS: `rg -n "Deep Agents|LangGraph|AI SDK|ToolLoopAgent|packet-first|intelligence orchestrator|project intelligence" docs frontend/src backend/src scripts package.json frontend/package.json backend/requirements.txt 2>/dev/null | head -160`
- PASS: `git diff --check -- docs/PRPs/deep-agents-project-intelligence/prp-deep-agents-project-intelligence.md docs/ops/handoffs/2026-05-13-S45-deep-agents-orchestrator-prp.md docs/ops/orchestration/session-board.md docs/ops/orchestration/review-queue.md`
- PASS: `npm run linear:codex:check -- docs/ops/handoffs/2026-05-13-S45-deep-agents-orchestrator-prp.md`
- PASS: `python -m pytest backend/tests/test_deep_project_intelligence.py -q`
- PASS: `python -m pytest backend/tests/test_deep_project_intelligence.py -q` after Slice 2 read-only source probes (`6 passed`)
- PASS: `python -m pytest backend/tests/test_deep_project_intelligence.py -q` after Slice 3A Deep Agents runtime hook (`8 passed`)
- FAIL unrelated: `python -m pytest backend/tests/test_deep_project_intelligence.py backend/tests/test_api_routes.py -q` failed in legacy Fireflies ingestion endpoint tests because the shared test harness still exposes the mocked admin dependency as required `args`/`kwargs` query params. New Deep Agents tests passed in the same run.
8) Evidence artifacts (screenshot/video/report/log paths):
- `docs/PRPs/deep-agents-project-intelligence/prp-deep-agents-project-intelligence.md`
- `backend/tests/test_deep_project_intelligence.py`
- Linear kickoff comment: `4f16e521-7217-405d-8089-26cace8d2657`
9) Top 3 findings (frontend-visible issues first):
- Deep Agents should not replace AI SDK UI/chat transport; it should be evaluated as a backend orchestration harness for complex project-intelligence workflows.
- Current repo evidence already has packet-first intelligence and AI SDK tool loops, but the product contract is distributed across route branches, fallbacks, and quality checks.
- Slice 3A is now implemented as a backend-only Deep Agents runtime hook with no production chat route integration.
10) Recommended next action (one line): Deploy backend dependencies, enable runtime in a non-production environment, then test one real project request.
11) Handoff file path: `docs/ops/handoffs/2026-05-13-S45-deep-agents-orchestrator-prp.md`
12) Migration ledger evidence: Not applicable; no migration created.

## Linear Updates

- Kickoff comment: Posted to AAI-356, comment id `4f16e521-7217-405d-8089-26cace8d2657`.
- Milestone comments: Completion comment posted after PRP/checks, comment id `331fa6a6-ff7d-4047-9929-725a6f57a99c`.
- Completion/blocker comment: Pending Review comment posted after validation, comment id `331fa6a6-ff7d-4047-9929-725a6f57a99c`.

## Current Status

Created an architecture PRP that evaluates LangChain Deep Agents as a backend project-intelligence orchestrator while keeping the AI SDK as the chat/UI integration layer.

The PRP includes the framework boundary, current repo evidence, pilot request/response contracts, subagent shape, backend integration slices, non-goals, risks, guardrails, and verification commands.

Implemented Slice 1 as a backend-only contract spike:

- Added Pydantic request/response contracts for the pilot packet.
- Added `build_project_status_contract_spike(...)`.
- Added `POST /api/intelligence/deep-agent/project-status`, gated by `DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED=true`.
- Added focused tests for explicit missing source coverage, project lookup failure, feature-gate behavior, successful contract response, and 404 on unresolved project.

Implemented Slice 2 as read-only source coverage probes:

- Added source probes for packet, Teams, meetings, emails, documents, financials, schedule, RFIs, and submittals.
- Added bounded project-filtered table reads through the existing backend Supabase store.
- Added per-source `checked`, `missing`, and `failed` statuses.
- Added per-source `toolTrace` entries.
- Added sample evidence extraction from source rows.
- Kept the endpoint backend-only and environment-gated.

Implemented Slice 3A as a backend-only Deep Agents runtime hook:

- Added `deepagents>=0.6.1` and `langchain-openai>=0.3.0` to backend requirements.
- Added lazy `create_deep_agent` invocation behind `DEEP_AGENTS_PROJECT_INTELLIGENCE_RUNTIME=deep_agents`.
- Fed the runtime only pre-collected source coverage/evidence, not broad DB tools.
- Added `deepagents_runtime` success/failure traces.
- Runtime failure falls back to the contract response instead of returning a generic error.

Known ledger issue: local `session-board.md` already has an older S44 row using `AAI-356` for Source Sync drill-in work. The live Linear issue created for this session is also `AAI-356`. This is recorded as a ledger collision risk rather than hidden.

## Exact Next Step

Install backend dependencies in the deployment environment, set `DEEP_AGENTS_PROJECT_INTELLIGENCE_RUNTIME=deep_agents` only in non-production first, and run one real project-status request through the backend endpoint.

## Known Pitfalls

- Do not replace AI SDK UI or existing AI Elements.
- Do not introduce LangChain/Deep Agents into frontend code.
- Do not let the pilot bypass existing packet-first tables or source-health ledgers.
- Do not call the pilot successful unless missing/stale/failed source categories are explicit in the response.
- Do not treat read-only probes as final answer synthesis; they are coverage inputs for a future orchestrator.
- Do not enable runtime in production until non-production proves model/provider compatibility.
- Resolve or annotate the local AAI-356 session-board collision before broader orchestration cleanup.

## Resume Commands

```bash
sed -n '1,260p' docs/PRPs/deep-agents-project-intelligence/prp-deep-agents-project-intelligence.md
python -m pytest backend/tests/test_deep_project_intelligence.py -q
npm run linear:codex:check -- docs/ops/handoffs/2026-05-13-S45-deep-agents-orchestrator-prp.md
```

## Evidence

- `docs/PRPs/deep-agents-project-intelligence/prp-deep-agents-project-intelligence.md`
- `backend/src/services/agents/deep_project_intelligence.py`
- `backend/src/services/agents/deep_project_intelligence_contracts.py`
- `backend/tests/test_deep_project_intelligence.py`
- `docs/architecture/AI-RAG-ARCHITECTURE.md`
- `docs/ai-plan/councils/2026-05-08-rag-strategy-council-durable-assistant-strategy.md`
- LangChain docs reviewed: Deep Agents overview, memory, subagents, permissions, backends.
