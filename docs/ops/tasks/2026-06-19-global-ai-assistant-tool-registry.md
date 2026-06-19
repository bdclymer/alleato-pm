# Task: Global AI Assistant Tool Registry

Status: Draft
Owner: Codex
Created: 2026-06-19
Linear Issue: Not created yet - blocked until this task is started
Related Handoff: Not created yet

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

- [ ] Inventory every AI assistant tool factory under `frontend/src/lib/ai/tools/**`.
- [ ] Inventory non-`tools/**` assistant tool definitions, including
      self-knowledge, orchestrator, RAG, document, and route-local tools.
- [ ] Identify duplicate tool names, overlapping responsibilities, and direct
      `tool({ ... })` definitions that bypass shared constructors.
- [ ] Define one canonical registry module path.
- [ ] Define the registry contract: name, description, owner, category, input
      schema, output schema, read/write capability, delivery capability, source
      families, project scope, actor modes, ledger/evidence requirements, and
      execution factory.
- [ ] Define how workflow packs request filtered subsets from the global
      registry.
- [ ] Define failure-loudly behavior for unregistered tools, duplicate names,
      forbidden writes, forbidden delivery, and missing evidence policy.

## Implementation Checklist

- [ ] Create the global assistant tool registry module.
- [ ] Move or wrap `project-tools.ts` tools into registry entries.
- [ ] Move or wrap `action-tools.ts` tools into registry entries.
- [ ] Move or wrap operational/search/memory tools into registry entries.
- [ ] Move or wrap financial/Acumatica tools into registry entries.
- [ ] Move or wrap schedule/progress-report/document/intelligence tools into
      registry entries.
- [ ] Move or wrap Executive Daily Brief tools so
      `frontend/src/lib/ai-ops/tool-registry.ts` consumes the global registry
      instead of owning standalone definitions.
- [ ] Update assistant/orchestrator tool assembly to request tools through the
      registry policy layer.
- [ ] Update route-local tool usage or document why a route-local tool is not an
      assistant tool.
- [ ] Ensure all write/delivery tools have explicit policy gates.
- [ ] Ensure source-bearing tools declare source family and evidence behavior.
- [ ] Ensure every tool execution can be traced to run/task/session telemetry
      appropriate to its workflow.

## Integration Checklist

- [ ] AI assistant runtime uses the global registry for tool selection.
- [ ] Specialist agents use registry-filtered tool subsets.
- [ ] Executive Daily Brief workflow uses registry-filtered tool subsets.
- [ ] Tool policy filters by actor, workflow, project/source access, write
      permission, delivery permission, and channel.
- [ ] Tool visibility is recorded before model calls.
- [ ] Forbidden tools are hidden before model calls and fail loudly if invoked.
- [ ] Existing public behavior remains compatible for users.

## Regression Guardrails

- [ ] Test fails on duplicate registered tool names.
- [ ] Test fails when an assistant tool exists outside the registry without an
      explicit allowlist reason.
- [ ] Test fails when a write/delivery tool lacks policy metadata.
- [ ] Test fails when a source-bearing tool lacks source-family metadata.
- [ ] Test proves Executive Daily Brief receives only its allowed subset.
- [ ] Test proves disabled delivery tools are hidden and cannot send.
- [ ] Static guardrail added to detect new direct `tool({ ... })` definitions
      outside approved constructors/registry files.

## Verification Checklist

- [ ] Static/type/lint check run, or explicitly delegated to a cheaper
      sub-agent.
- [ ] Targeted registry contract tests run.
- [ ] Targeted assistant/orchestrator tests run.
- [ ] Targeted Executive Daily Brief workflow-pack tests run.
- [ ] Browser or API smoke test verifies assistant still responds with expected
      tool visibility.
- [ ] Evidence artifacts recorded below.
- [ ] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      |                    |        |       |
| Targeted tests        |                    |        |       |
| Assistant smoke       |                    |        |       |
| Workflow-pack proof   |                    |        |       |
| Guardrail proof       |                    |        |       |

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

## Risks / Gaps

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
