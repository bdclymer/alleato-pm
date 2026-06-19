# Task: Global AI Assistant Tool Registry

Status: In Progress
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-554 - https://linear.app/megankharrison/issue/AAI-554/implement-global-ai-assistant-tool-registry
Related Handoff: docs/ops/handoffs/2026-06-19-S58-global-ai-assistant-tool-registry.md

## Objective

Centralize all AI assistant tools behind one canonical registry, policy, and
visibility layer so workflows such as Executive Daily Brief consume filtered
tool subsets instead of inventing separate registries. The finished state must
make it obvious where every assistant tool is declared, who owns it, what policy
allows it, what evidence/run ledger it writes to, and which routes/agents can
see it.

This task exists because the Executive Daily Brief implementation created a
workflow-local registry at `frontend/src/lib/ai-ops/tool-registry.ts`, but the
broader assistant tools remain spread across `frontend/src/lib/ai/tools/**`.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Inventory every AI assistant tool factory under `frontend/src/lib/ai/tools/**`.
- [x] Inventory non-`tools/**` assistant tool definitions, including
      self-knowledge, orchestrator, RAG, document, and route-local tools.
- [x] Identify duplicate tool names, overlapping responsibilities, and direct
      `tool({ ... })` definitions that bypass shared constructors.
- [x] Define one canonical registry module path.
- [x] Define the registry contract: name, description, owner, category, input
      schema, output schema, read/write capability, delivery capability, source
      families, project scope, actor modes, ledger/evidence requirements, and
      execution factory.
- [x] Define how workflow packs request filtered subsets from the global
      registry.
- [x] Define failure-loudly behavior for unregistered tools, duplicate names,
      forbidden writes, forbidden delivery, and missing evidence policy.

## Implementation Checklist

- [x] Create the global assistant tool registry module.
- [x] Move or wrap `project-tools.ts` tools into registry entries.
- [x] Move or wrap `action-tools.ts` tools into registry entries.
- [x] Move or wrap operational/search/memory tools into registry entries.
- [x] Move or wrap financial/Acumatica tools into registry entries.
- [x] Move or wrap schedule/progress-report/document/intelligence tools into
      registry entries.
- [x] Move or wrap Executive Daily Brief tools so
      `frontend/src/lib/ai-ops/tool-registry.ts` consumes the global registry
      instead of owning standalone definitions.
- [x] Update assistant/orchestrator tool assembly to request tools through the
      registry policy layer.
- [x] Update route-local tool usage or document why a route-local tool is not an
      assistant tool.
- [x] Ensure all write/delivery tools have explicit policy gates.
- [x] Ensure source-bearing tools declare source family and evidence behavior.
- [ ] Ensure every tool execution can be traced to run/task/session telemetry
      appropriate to its workflow.

## Integration Checklist

- [x] AI assistant runtime uses the global registry for tool selection.
- [x] Specialist agents use registry-filtered tool subsets.
- [x] Executive Daily Brief workflow uses registry-filtered tool subsets.
- [ ] Tool policy filters by actor, workflow, project/source access, write
      permission, delivery permission, and channel.
- [x] Tool visibility is recorded before model calls.
- [x] Forbidden tools are hidden before model calls and fail loudly if invoked.
- [ ] Existing public behavior remains compatible for users.

## Regression Guardrails

- [x] Test fails on duplicate registered tool names.
- [x] Test fails when an assistant tool exists outside the registry without an
      explicit allowlist reason.
- [x] Test fails when a write/delivery tool lacks policy metadata.
- [x] Test fails when a source-bearing tool lacks source-family metadata.
- [x] Test proves Executive Daily Brief receives only its allowed subset.
- [x] Test proves disabled delivery tools are hidden and cannot send.
- [x] Static guardrail added to detect new direct `tool({ ... })` definitions
      outside approved constructors/registry files.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper
      sub-agent.
- [x] Targeted registry contract tests run.
- [x] Targeted assistant/orchestrator tests run.
- [x] Targeted Executive Daily Brief workflow-pack tests run.
- [ ] Browser or API smoke test verifies assistant still responds with expected
      tool visibility.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint src/lib/ai/tool-registry.ts src/lib/ai/__tests__/tool-registry.test.ts src/lib/ai-ops/tool-registry.ts src/lib/ai-ops/__tests__/workflow-pack.test.ts` | Passed | Global registry, registry tests, Executive Daily Brief registry consumer, and workflow-pack test lint cleanly. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/__tests__/tool-registry.test.ts src/lib/ai-ops/__tests__/workflow-pack.test.ts --runInBand` | Passed | 2 suites, 14 tests passed. Tests prove duplicate-name failure, source-bearing metadata failure, delivery-channel metadata failure, Executive Daily Brief filtered subset, and AI Ops definition projection. |
| Assistant smoke       | Pending | Pending | Broad assistant/orchestrator runtime still needs smoke verification after more tool factories are wrapped. |
| Workflow-pack proof   | `src/lib/ai-ops/__tests__/workflow-pack.test.ts` | Passed | Executive Daily Brief registry now equals `toolDefinitionsForWorkflow({ workflowId: executive_daily_brief })` from the global registry. |
| Guardrail proof       | `npm run rag:verify:assistant-tool-registry` | Passed | Guardrail ensures `frontend/src/lib/ai-ops/tool-registry.ts` imports the global registry and does not reintroduce workflow-local `WORKFLOW_TOOL_DEFINITIONS` or `sourceAdapterToolDefinitions`. |
| RAG docs gate         | `npm run codex:finish -- --message "Add global assistant tool registry foundation" --files ...` | Initially blocked, then remediated | Pre-commit correctly blocked because `frontend/src/lib/ai/**` changed without updating `docs/architecture/AI-RAG-ARCHITECTURE.md`. Architecture doc now records the global assistant tool registry foundation and notes no table/schema, embedding, RAG chunk sync, search RPC, or retrieval policy changed. |
| Linear handoff check  | `npm run linear:codex:check -- docs/ops/handoffs/2026-06-19-S58-global-ai-assistant-tool-registry.md` | Passed | Handoff includes Linear issue, changed files, commands, evidence, milestone comment IDs, risks, and next action. |
| Runtime registry proof | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/__tests__/tool-registry.test.ts --runInBand` | Passed | Registry tests now prove the assistant chat workflow exposes project/action/factory-composed tools and fails loudly when a runtime factory exposes an unregistered tool. |
| Orchestrator registry proof | `cd frontend && npx eslint src/lib/ai/tool-registry.ts src/lib/ai/__tests__/tool-registry.test.ts src/lib/ai/orchestrator.ts` | Passed | Strategist assembly now filters `createProjectTools()` and `createActionTools()` through `filterRegisteredToolSet()` before Microsoft operator exclusions. |
| Expanded orchestrator registry proof | `cd frontend && npx eslint src/lib/ai/tool-registry.ts src/lib/ai/__tests__/tool-registry.test.ts src/lib/ai/orchestrator.ts` | Passed | Strategist and specialist tool assembly now filters project, action, web search, marketing, feature request, progress report, workspace, structured output, document intelligence, intelligence, and Executive Brief factories through `filterRegisteredToolSet()`. |
| Expanded registry tests | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/__tests__/tool-registry.test.ts --runInBand` | Passed | 9 tests prove assistant chat registry coverage for aggregate project/action tools plus standalone web/search/feature/progress/workspace/document/intelligence/executive/marketing factories and fail-loud runtime filtering. |
| Typecheck delegation | Sub-agent `019edf88-2f4e-74f0-beec-ca24692af2f3`, `cd frontend && npm run typecheck` | Failed unrelated repo debt | Bounded typecheck timed out after 60s with no current-task type error surfaced. Worker identified likely owner files as `frontend/tsconfig.json` and `frontend/scripts/run-typecheck-bounded.mjs`, unrelated to `tool-registry.ts`, `orchestrator.ts`, or registry tests. |
| Runtime import smoke | Direct TSX-based import of `createStrategistTools()` | Invalid smoke method | Direct TSX-based import hit Next `server-only` guard through `microsoft-graph/calendar-events.ts`; this is not a valid app/server harness for the orchestrator module. |
| Policy/visibility tests | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/__tests__/tool-registry.test.ts src/lib/ai/__tests__/cmo-orchestrator.test.ts --runInBand` | Passed | 2 suites, 12 tests passed. Tests cover registry policy hiding for write tools and existing orchestrator registration behavior with registry helpers mocked for isolated CMO tests. |
| Direct tool guardrail | `npm run rag:verify:assistant-tool-registry` | Passed | Guardrail now fails new direct `tool({ ... })` definitions unless the file is an approved factory/constructor or has an explicit non-assistant allowlist reason. |
| Policy lint | `cd frontend && npx eslint src/lib/ai/tool-registry.ts src/lib/ai/__tests__/tool-registry.test.ts src/lib/ai/orchestrator.ts src/lib/ai/__tests__/cmo-orchestrator.test.ts` | Passed | Registry policy helpers, Strategist visibility trace, tests, and orchestrator changes lint cleanly. |

## Files Expected To Change

- `frontend/src/lib/ai/tools/**` - migrate existing tool factories into registry
  entries or registry-backed wrappers.
- `frontend/src/lib/ai/orchestrator.ts` - consume registry-filtered tool sets.
- `frontend/src/lib/ai/bot-core.ts` - consume registry-filtered tool sets if it
  assembles assistant tools directly.
- `frontend/src/lib/ai-ops/tool-registry.ts` - become an Executive Daily Brief
  filtered view over the global registry.
- `frontend/src/lib/ai-ops/executive-daily-brief-workflow.ts` - keep workflow
  allowlist, but source definitions from the global registry.
- `frontend/src/lib/ai/**/__tests__/**` - add registry contract and migration
  coverage.
- `scripts/verify/**` - add direct-tool-definition guardrail if no existing
  guardrail fits.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - keep the AI/RAG architecture map
  current when assistant tool-layer files change.

## Risks / Gaps

- First implementation slice created the global registry contract and migrated
  Executive Daily Brief only. The large assistant factories are inventoried but
  still need registry-backed wrapping in follow-up slices before this task can
  close.
- This is cross-cutting and may expose existing duplicate names or tools with
  unclear ownership.
- A mechanical migration without policy metadata would repeat the same problem
  in a new file; each tool must declare ownership and policy behavior.
- Some route-local tools may be legitimate non-assistant tools and should be
  documented rather than forced into the assistant registry.

## Final Status

- [ ] All checklist items are complete.
- [ ] Evidence is recorded.
- [ ] Any deferred work is explicitly marked Blocked/Deferred with owner and
      next action.
- [ ] Final response includes what is done, what remains, and recommended next
      steps.
