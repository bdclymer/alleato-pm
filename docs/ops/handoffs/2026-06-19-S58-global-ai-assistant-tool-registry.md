# Handoff: 2026-06-19 - Global AI Assistant Tool Registry

## Intake Block

1) Session ID: S58
2) Task ID: AAI-554
3) Linear issue: AAI-554
4) Linear URL: https://linear.app/megankharrison/issue/AAI-554/implement-global-ai-assistant-tool-registry
5) Current status: In Progress
6) Files changed (absolute paths): `/Users/meganharrison/Documents/alleato-pm/docs/ops/tasks/2026-06-19-global-ai-assistant-tool-registry.md`; `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-06-19-S58-global-ai-assistant-tool-registry.md`; `/Users/meganharrison/Documents/alleato-pm/docs/ops/orchestration/session-board.md`; `/Users/meganharrison/Documents/alleato-pm/docs/architecture/AI-RAG-ARCHITECTURE.md`; `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/tool-registry.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/orchestrator.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/__tests__/tool-registry.test.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai-ops/tool-registry.ts`; `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai-ops/__tests__/workflow-pack.test.ts`; `/Users/meganharrison/Documents/alleato-pm/scripts/verify/verify_ai_assistant_tool_registry.mjs`; `/Users/meganharrison/Documents/alleato-pm/package.json`
   - `/Users/meganharrison/Documents/alleato-pm/docs/ops/tasks/2026-06-19-global-ai-assistant-tool-registry.md`
   - `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-06-19-S58-global-ai-assistant-tool-registry.md`
   - `/Users/meganharrison/Documents/alleato-pm/docs/ops/orchestration/session-board.md`
   - `/Users/meganharrison/Documents/alleato-pm/docs/architecture/AI-RAG-ARCHITECTURE.md`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/orchestrator.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/tool-registry.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/__tests__/tool-registry.test.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai-ops/tool-registry.ts`
   - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai-ops/__tests__/workflow-pack.test.ts`
   - `/Users/meganharrison/Documents/alleato-pm/scripts/verify/verify_ai_assistant_tool_registry.mjs`
   - `/Users/meganharrison/Documents/alleato-pm/package.json`
7) Commands run and outcome (pass/fail counts): Pass: AI SDK docs/source checked for current `tool({ inputSchema, execute })` API; Pass: Linear issue AAI-554 created and kickoff comment posted; Pass: assistant tool factories inventoried; Pass: focused ESLint for registry/workflow/orchestrator files; Pass: focused Jest registry/workflow-pack tests; Pass: `npm run rag:verify:assistant-tool-registry`; Pass: `npm run linear:codex:check -- docs/ops/handoffs/2026-06-19-S58-global-ai-assistant-tool-registry.md`; Fail unrelated repo debt: delegated `cd frontend && npm run typecheck` timed out after 60s; Invalid smoke method: direct TSX-based orchestrator import hit Next `server-only` guard; Blocked then remediated: first `npm run codex:finish -- --message "Add global assistant tool registry foundation" --files ...` was stopped by the RAG docs gate until `docs/architecture/AI-RAG-ARCHITECTURE.md` was updated.
   - Pass: read `docs/ops/tasks/2026-06-19-global-ai-assistant-tool-registry.md`.
   - Pass: read AI SDK skill and checked local `node_modules/ai/docs` for current `tool({ inputSchema, execute })` tool API.
   - Pass: created Linear issue AAI-554.
   - Pass: inventoried initial assistant tool assembly entry points in `frontend/src/lib/ai/orchestrator.ts`, `frontend/src/lib/ai/bot-core.ts`, and `frontend/src/lib/ai/tools/**`.
   - Pass: added canonical global assistant registry contract at `frontend/src/lib/ai/tool-registry.ts`.
   - Pass: registered Executive Daily Brief source, generation, artifact, and delivery tools in the global registry with owner, category, capabilities, workflows, actor modes, source families, write/delivery policy, channel policy, evidence policy, and factory metadata.
   - Pass: rewired `frontend/src/lib/ai-ops/tool-registry.ts` to consume `toolDefinitionsForWorkflow()` from the global registry instead of owning standalone workflow-local tool definitions.
   - Pass: added `frontend/src/lib/ai/__tests__/tool-registry.test.ts` for checked-in registry validation, duplicate-name failure, source-bearing metadata failure, delivery-channel metadata failure, Executive Daily Brief subset filtering, and AI Ops definition projection.
   - Pass: extended `frontend/src/lib/ai-ops/__tests__/workflow-pack.test.ts` to prove Executive Daily Brief uses the global registry subset.
   - Pass: added `scripts/verify/verify_ai_assistant_tool_registry.mjs` and `npm run rag:verify:assistant-tool-registry` to prevent Executive Daily Brief from regressing back to workflow-local definitions.
   - Pass: `cd frontend && npx eslint src/lib/ai/tool-registry.ts src/lib/ai/__tests__/tool-registry.test.ts src/lib/ai-ops/tool-registry.ts src/lib/ai-ops/__tests__/workflow-pack.test.ts`.
   - Pass: `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/__tests__/tool-registry.test.ts src/lib/ai-ops/__tests__/workflow-pack.test.ts --runInBand` passed 2 suites / 14 tests.
   - Pass: `npm run rag:verify:assistant-tool-registry`.
   - Pass: `cd frontend && npx eslint src/lib/ai/tool-registry.ts src/lib/ai/__tests__/tool-registry.test.ts src/lib/ai/orchestrator.ts`.
   - Pass: `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/__tests__/tool-registry.test.ts --runInBand` passed 1 suite / 9 tests.
   - Fail unrelated repo debt: delegated `cd frontend && npm run typecheck` timed out after 60s with no current-task type error surfaced.
   - Invalid smoke method: direct TSX-based orchestrator import hit Next `server-only` guard through `microsoft-graph/calendar-events.ts`.
   - Blocked then remediated: first `npm run codex:finish -- --message "Add global assistant tool registry foundation" --files ...` was stopped by the RAG docs gate until `docs/architecture/AI-RAG-ARCHITECTURE.md` was updated.
   - Pass: posted Linear kickoff comment `4aa72d25-b339-4f0e-9527-c0f9a6c0bb45`.
8) Evidence artifacts (screenshot/video/report/log paths): `docs/ops/tasks/2026-06-19-global-ai-assistant-tool-registry.md`; `docs/ops/handoffs/2026-06-19-S58-global-ai-assistant-tool-registry.md`; `docs/architecture/AI-RAG-ARCHITECTURE.md`; `frontend/src/lib/ai/tool-registry.ts`; `frontend/src/lib/ai/orchestrator.ts`; `frontend/src/lib/ai/__tests__/tool-registry.test.ts`; `frontend/src/lib/ai-ops/tool-registry.ts`; `frontend/src/lib/ai-ops/__tests__/workflow-pack.test.ts`; `scripts/verify/verify_ai_assistant_tool_registry.mjs`
   - `docs/ops/tasks/2026-06-19-global-ai-assistant-tool-registry.md`
   - `docs/ops/handoffs/2026-06-19-S58-global-ai-assistant-tool-registry.md`
   - `docs/architecture/AI-RAG-ARCHITECTURE.md`
   - `frontend/src/lib/ai/tool-registry.ts`
   - `frontend/src/lib/ai/orchestrator.ts`
   - `frontend/src/lib/ai/__tests__/tool-registry.test.ts`
   - `scripts/verify/verify_ai_assistant_tool_registry.mjs`
9) Top 3 findings (frontend-visible issues first): Executive Daily Brief and main Strategist/specialist tool assembly now consume global registry-filtered subsets; policy filtering still does not enforce actor/write/channel permissions; direct `tool({ ... })` definitions cannot be globally forbidden until explicit allowlist coverage exists.
   - First implementation slice established the global registry contract and migrated Executive Daily Brief only.
   - Second implementation slice registered aggregate project/action/operational/financial/Acumatica/schedule/progress/document/intelligence/marketing/workspace/web/structured factories and routed Strategist/specialist assembly through `filterRegisteredToolSet()`.
   - Broad direct `tool({ ... })` guardrail remains intentionally unchecked until route-local/non-assistant allowlist decisions are documented.
10) Recommended next action (one line): Add actor/write/delivery/channel policy enforcement plus tool visibility telemetry before model calls, then document/allowlist any legitimate route-local non-assistant tools.
11) Handoff file path: docs/ops/handoffs/2026-06-19-S58-global-ai-assistant-tool-registry.md
12) Migration ledger evidence: Not applicable; no Supabase migrations touched.

## Linear Updates

- Kickoff comment: 4aa72d25-b339-4f0e-9527-c0f9a6c0bb45
- Foundation milestone comment: c2033f0f-e360-41ca-98d3-175af1bf27a5
- Runtime factory filtering milestone comment: d468704f-39bb-460a-952a-6376cf2af6a5

## Current Status

- Created the canonical global assistant tool registry at `frontend/src/lib/ai/tool-registry.ts`.
- Registered Executive Daily Brief source, generation, artifact, Teams delivery, and email delivery tools with owner, workflow, actor, source-family, delivery-channel, write policy, evidence policy, and execution metadata.
- Rewired `frontend/src/lib/ai-ops/tool-registry.ts` so Executive Daily Brief consumes `toolDefinitionsForWorkflow()` from the global registry instead of owning standalone definitions.
- Added focused registry contract tests and a static guardrail that prevents Executive Daily Brief from regressing back to workflow-local tool definitions.
- Updated `docs/architecture/AI-RAG-ARCHITECTURE.md` after the RAG docs gate correctly blocked the first finish attempt.
- Registered the main assistant chat factories and changed Strategist/specialist assembly to call `filterRegisteredToolSet()` before exposing factory tools to the model.
- Expanded `scripts/verify/verify_ai_assistant_tool_registry.mjs` so raw orchestrator spreads of migrated factories fail.

## Known Pitfalls

- The task remains In Progress. Registry visibility now covers the main assistant runtime factories, but actor/write/channel policy enforcement and tool visibility telemetry are still incomplete.
- Direct `tool({ ... })` definitions still exist inside approved factory modules; the next guardrail must distinguish approved factory-local constructors from route-local/non-assistant bypasses.
- Full frontend typecheck is blocked by an unrelated 60-second bounded timeout in the repo's typecheck setup.

## Working Notes

- Current Executive Daily Brief registry lives at `frontend/src/lib/ai-ops/tool-registry.ts`.
- Broad assistant tools still live under `frontend/src/lib/ai/tools/**`.
- Runtime assembly currently happens through factories such as `createProjectTools`, `createActionTools`, `createExecutiveBriefTools`, and `createStrategistTools`.
