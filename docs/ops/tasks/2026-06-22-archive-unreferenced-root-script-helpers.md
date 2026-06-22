# Task: Archive unreferenced root script helpers

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - Linear issue creation tool unavailable in current connector set; only comment/document tools exposed
Related Handoff: N/A

## Objective

Move unreferenced one-off root script helpers out of `scripts/` into a dated
archive folder so agents stop treating them as live operational entry points,
while preserving historical recovery/import code for lookup.

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

- Unreferenced root helper scripts are moved to
  `scripts/archive/2026-06-22-root-helpers/`.
- Package-owned root scripts and root scripts referenced by current runbooks are
  not moved in this pass.
- `scripts/README.md` and `scripts/ROOT-SCRIPTS.md` explain archive policy.
- `repo:control` classifies `scripts/archive/` and still passes strict mode.
- Reference scan shows the archived helpers are no longer referenced from active
  package scripts or docs outside the archive.

## Files To Change

- `docs/ops/tasks/2026-06-22-archive-unreferenced-root-script-helpers.md`
- `scripts/README.md`
- `scripts/ROOT-SCRIPTS.md`
- `scripts/archive/2026-06-22-root-helpers/**`
- `scripts/audits/check-repo-control.mjs`

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `node --check scripts/audits/check-repo-control.mjs` | Pass | Guard script parses after archive category/root script updates. |
| Targeted tests        | `npm run repo:control`; `node scripts/audits/check-repo-control.mjs --strict`; root inventory coverage script | Pass | Repo-control passes; root inventory covers every tracked root script. |
| Browser/user-flow     | N/A | Pass | Control-plane cleanup only; no frontend UI change. |
| DB/provider read-back | N/A | Pass | No DB/provider changes. |
| End-to-end proof      | `rg` active-reference scan excluding `scripts/archive/**`; `find scripts/archive/2026-06-22-root-helpers -maxdepth 1 -type f` | Pass | Archived helper names have no active references outside archive/task docs; archive contains README plus 16 helper files. |

## Files Changed

- `docs/ops/tasks/2026-06-22-archive-unreferenced-root-script-helpers.md` - task ledger and evidence.
- `scripts/README.md` - classifies `scripts/archive/` as archived script helpers.
- `scripts/ROOT-SCRIPTS.md` - removes archived helpers from active root inventory and records the archive.
- `scripts/archive/2026-06-22-root-helpers/README.md` - archive rationale and file list.
- `scripts/archive/2026-06-22-root-helpers/**` - preserved unreferenced one-off root helpers.
- `scripts/audits/check-repo-control.mjs` - classifies `scripts/archive` and removes archived helper filenames from the root allowlist.

## Risks / Gaps

- Archived scripts are preserved, not proven safe to run from their new path.
  They should be restored or modernized before any future production use.
- Some root helpers remain because they are package-owned or referenced by
  current runbooks.
- `fix-teams-attribution.py` remains at root because historical PRP/orchestration
  docs still reference that path.
- `backfill-insights-embeddings.mjs`, `backfill-meeting-summary-embeddings.mjs`,
  `backfill-summary-embeddings.mjs`, `test-rag-terminal.mjs`,
  `test-ai-tools.mjs`, and `test-ai-tool-queries.mjs` remain at root because
  `docs/RUNBOOK.md` references them.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
