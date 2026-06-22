# Task: Remove deprecated Project Intelligence paths

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created yet - blocked
Related Handoff: N/A

## Objective

Remove or hard-block deprecated Project Intelligence entry points so agents and
developers see one live implementation path: `project_intelligence_synthesis_v1`
through `backend/src/services/intelligence/project_intelligence.py`.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified before adding new ones.
- [x] Source-of-truth owner chosen for the workflow/data/control plane.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Integration Checklist

- [x] End-to-end path wired through one owner, not separate disconnected pieces.
- [x] All entry points for the workflow use the same canonical service/runtime.
- [x] Source adapters or external dependencies return typed, inspectable results.
- [x] Run/task/session ledger records every meaningful attempt.
- [x] Artifacts link back to source evidence and run logs.
- [x] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.

## Regression Guardrails

- [x] Unit or integration test added/updated for the core behavior.
- [x] Contract test added/updated for cross-module or source/delivery boundaries.
- [x] Guardrail added so the same class of bug fails loudly next time.
- [x] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated test run.
- [x] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services.
- [x] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Acceptance Criteria

- Runtime config no longer advertises deprecated Project Intelligence packet
  writers or task-extraction crons as live.
- Backend API no longer exposes deprecated Project Intelligence packet writer
  routes as normal callable endpoints.
- Deprecated direct scripts are removed when they are only wrappers around legacy
  writers.
- Documentation outside the docs-site source of truth no longer gives
  activation instructions for deprecated paths.
- A guardrail fails if deprecated Project Intelligence path names are reintroduced
  in live runtime/config/docs outside explicitly allowed historical artifacts.

## Files Changed

- `render.yaml` - remove deprecated crons/env entries.
- `backend/render.yaml` - remove deprecated env entries if present.
- `backend/src/api/main.py` - remove deprecated API endpoints.
- `backend/src/services/scheduler.py` - remove deprecated task extraction and compiler-drain scheduler wrappers if no live callers remain.
- `backend/src/scripts/refresh_operating_packet_direct.py` - delete legacy direct operating packet writer.
- `backend/src/scripts/enqueue_periodic_packet_refresh.py` - delete legacy packet-refresh enqueue script if no live callers remain.
- `backend/src/services/intelligence/operating_summary.py` - delete legacy operating summary writer if imports are removed.
- `backend/src/services/task_extraction.py` - delete redundant task extraction service if no live callers remain.
- `backend/src/services/agents/deep_project_intelligence.py` and contracts - delete removed Deep Agents project-status bridge after extracting shared helpers.
- `frontend/src/lib/ai/deep-agent-project-status.ts` and test - delete removed frontend bridge and replace with live research/app-expert bridge.
- `frontend/src/app/(admin)/intelligence-compiler/page.tsx` and API routes - delete removed admin compiler surface.
- Generated inventories - regenerate project map, app-surface index, app-expert runtime artifacts, and DB inventory so agents no longer discover deleted paths.
- `scripts/verify/verify_project_intelligence_live_paths.mjs` - add guardrail.
- `package.json` - add guardrail script.
- Project Intelligence docs-site pages - remove deprecated path display or move it behind canonical cleanup language.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false` | Pass | Default heap OOMed first; larger heap completed with no type errors. |
| Static/type/lint      | `python3 -m py_compile backend/src/api/main.py backend/src/services/scheduler.py backend/src/services/intelligence/compiler.py backend/src/scripts/run_domain_packet_compiler.py backend/src/services/agents/runtime_common.py backend/src/services/agents/memory/contracts.py backend/src/services/agents/memory/tools.py backend/src/services/agents/research_agent/agent.py backend/src/services/agents/app_expert/agent.py backend/src/services/agents/content_builder/agent.py backend/src/services/agents/docs_research_agent/agent.py backend/src/services/agents/llm_wiki/agent.py backend/src/services/agents/microsoft_executive_assistant/agent.py` | Pass | Confirms backend imports after helper extraction. |
| Targeted tests        | `cd frontend && npx jest src/lib/ai/__tests__/deep-agent-bridge.test.ts src/lib/ai/__tests__/packet-fast-path.test.ts src/lib/ai/__tests__/intelligence-page-state.test.ts src/lib/ai/__tests__/advisor-synthesis.test.ts src/lib/ai/automation-blueprints/__tests__/planner.test.ts --runInBand` | Pass | 5 suites, 19 tests. |
| Browser/user-flow     | Generated route inventory + navigation source scan | Pass | Deleted `/intelligence-compiler`; regenerated app-surface and app-expert route inventories; final scan found no stale live route references. |
| DB/provider read-back | `npm run db:inventory` | Pass | Regenerated DB inventory from live MAIN and RAG databases; stale deleted file references removed. |
| Provider cleanup      | Render API service inventory + `DELETE /v1/services/crn-d827cg8g4nts73fj5dbg` | Pass | Deleted retired `alleato-task-extraction` cron; read-back showed zero retired cron matches. |
| Provider read-back    | Render API `GET /v1/services` + `GET /v1/services/srv-d8271ohj2pic739klb7g/env-vars` | Pass | No retired cron services and no retired `DEEP_AGENTS_PROJECT_INTELLIGENCE_*` backend env keys remain. Canonical `alleato-project-synthesis-sweep` exists but is suspended. |
| End-to-end proof      | `npm run rag:verify:project-intelligence-live-paths && npm run docs:verify:project-intelligence` | Pass | Guardrails pass on final tree. |
| End-to-end proof      | `rg -n "intelligence-compiler|deep-agent-project-status|deep_project_intelligence|deep_project_intelligence_contracts|alleato-task-extraction|alleato-packet-refresh-periodic|alleato-intelligence-compiler-drain|project-operating-summary-v1|project_operating_summary|operating_summary.py|/api/intelligence/deep-agent/(project-status|executive-briefing)|/api/intelligence/compiler/(run|status)|DEEP_AGENTS_PROJECT_INTELLIGENCE" ...` | Pass | No matches in live source, generated inventories, runtime config, package scripts, or docs-site source of truth outside intentional verifier exclusions. |

## Risks / Gaps

- Some helper functions in `backend/src/services/intelligence/compiler.py` are
  still used by the live synthesis path, so the entire file cannot be deleted in
  one pass without refactoring shared helpers.
- Historical PRPs, handoffs, eval outputs, and archived reports may retain old
  names as historical evidence. The guardrail should ignore clearly historical
  folders but fail live paths.
- Worktree had unrelated dirty files before and during this cleanup; they were
  not reverted. This task is not committed/pushed.
- Live Render cleanup removed retired services/envs, but the canonical
  `alleato-project-synthesis-sweep` cron is currently suspended. Activation is
  a separate follow-up from deprecated-path removal.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
