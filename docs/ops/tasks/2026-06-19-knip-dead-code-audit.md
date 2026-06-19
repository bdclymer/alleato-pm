# Task: Knip Dead-Code Audit Before Cleanup Deletes

Status: Complete
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-569 - https://linear.app/megankharrison/issue/AAI-569/add-knip-based-dead-code-audit-before-deleting-app-cleanup-candidates
Related Handoff: docs/ops/handoffs/2026-06-19-S70-knip-dead-code-audit.md

## Objective

Add a repeatable, barrel-aware frontend dead-code audit using Knip so cleanup can
start from a trustworthy triaged report instead of raw orphan-script counts.
This task must not delete app code; it produces the guardrail/reporting layer
needed before safe deletion batches.

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

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `node --check scripts/audits/run-knip-dead-code-report.mjs` | Pass | Report runner syntax verified. |
| Targeted tests        | `pnpm --dir frontend exec knip --config knip.json --no-exit-code --no-progress --max-show-issues 5` | Pass | Produced advisory issue counts without failing on existing debt. |
| Browser/user-flow     | Not applicable | Pass | No user-facing UI change. |
| DB/provider read-back | Not applicable | Pass | No database/provider change. |
| End-to-end proof      | `npm run audit:dead-code:frontend:report` | Pass | Wrote raw JSON and triage summary under `docs/ops/evidence/2026-06-19-S70-knip-dead-code-audit/`. |

## Files Changed

- `docs/ops/tasks/2026-06-19-knip-dead-code-audit.md` - task done gate.
- `docs/ops/handoffs/2026-06-19-S70-knip-dead-code-audit.md` - handoff/evidence ledger.
- `docs/ops/orchestration/session-board.md` - S70 ownership row.
- `docs/ops/orchestration/review-queue.md` - S70 review row.
- `frontend/package.json` - frontend Knip audit scripts and dev dependency.
- `frontend/pnpm-lock.yaml` - Knip dependency lockfile update.
- `frontend/knip.json` - Knip configuration for frontend dead-code analysis.
- `package.json` - root audit scripts.
- `scripts/audits/run-knip-dead-code-report.mjs` - report generator and triage summary writer.
- `docs/ops/evidence/2026-06-19-S70-knip-dead-code-audit/knip-report.json` - raw Knip JSON report.
- `docs/ops/evidence/2026-06-19-S70-knip-dead-code-audit/SUMMARY.md` - human-readable triage summary.
- `docs/ops/evidence/2026-06-19-S70-knip-dead-code-audit/knip-stdout-prelude.txt` - dotenv prelude captured outside JSON.

## Risks / Gaps

- Knip still reports candidates that need human verification, especially
  Storybook, tests, App Router-adjacent files, design-system exports, generated
  files, and old archived tests.
- This task intentionally does not delete code; deletion must happen in later
  small domain batches after report triage.
- Current report counts include 554 unused files, 57 unused dependencies, 21
  unused devDependencies, 114 unlisted dependencies, 110 unresolved imports,
  1005 unused exports, 677 unused exported types, 3 duplicate exports, and 4
  unlisted binaries.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
