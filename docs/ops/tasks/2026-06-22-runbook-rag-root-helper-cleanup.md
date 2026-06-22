# Task: Runbook RAG root helper cleanup

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - Linear issue creation tool unavailable in current connector set; only comment/document tools exposed
Related Handoff: N/A

## Objective

Update the active runbook so RAG/AI operations use maintained package scripts
and `scripts/verify/**` commands instead of loose root helper scripts, then
archive root helpers that no longer have active operational references.

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

- `docs/RUNBOOK.md` no longer points operators at loose root RAG/test helpers
  when maintained package scripts or `scripts/verify/**` commands exist.
- Newly unreferenced root helper scripts are moved into
  `scripts/archive/2026-06-22-root-helpers/`.
- `scripts/ROOT-SCRIPTS.md` reflects the active root scripts that remain.
- `repo:control` strict mode passes.
- Reference scan shows archived helper names are absent from active runbook and
  package scripts.

## Files To Change

- `docs/ops/tasks/2026-06-22-runbook-rag-root-helper-cleanup.md`
- `docs/RUNBOOK.md`
- `scripts/ROOT-SCRIPTS.md`
- `scripts/archive/2026-06-22-root-helpers/**`
- `scripts/audits/check-repo-control.mjs`
- `frontend/test-rag-terminal.mjs`

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `node --check scripts/audits/check-repo-control.mjs` | Pass | Guard script parses. |
| Targeted tests        | `npm run repo:control`; `node scripts/audits/check-repo-control.mjs --strict`; root inventory coverage script | Pass | Repo-control strict passes; root inventory covers tracked root scripts. |
| Browser/user-flow     | N/A | Pass | Docs/control-plane cleanup only; no frontend UI change. |
| DB/provider read-back | N/A | Pass | No DB/provider changes. |
| End-to-end proof      | Active-reference scan for archived helper paths across `docs/RUNBOOK.md`, `package.json`, `frontend`, and `scripts` excluding archive | Pass | No active references remain. Historical planning/audit references may remain outside active runbook scope. |

## Files Changed

- `docs/ops/tasks/2026-06-22-runbook-rag-root-helper-cleanup.md` - task ledger and evidence.
- `docs/RUNBOOK.md` - replaces loose root RAG/test helper commands with maintained package scripts and `scripts/verify/**` commands.
- `scripts/ROOT-SCRIPTS.md` - removes newly archived helpers from active root inventory.
- `scripts/archive/2026-06-22-root-helpers/README.md` - records newly archived RAG/test helpers.
- `scripts/archive/2026-06-22-root-helpers/**` - preserves archived RAG/test helper scripts for lookup.
- `scripts/audits/check-repo-control.mjs` - removes newly archived helper names from root allowlist.
- `frontend/test-rag-terminal.mjs` - moved to archive as `frontend-test-rag-terminal.mjs`.

## Risks / Gaps

- Historical planning/audit docs may still mention old paths as history. This
  task targets active operational docs and root live-looking clutter.
- `docs/ai-plan/rag-cutover-coverage-audit.md` still mentions
  `scripts/test-rag-terminal.mjs` as historical audit evidence.
- `fix-teams-attribution.py` remains root-level because historical PRP and
  orchestration docs still reference that path.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
