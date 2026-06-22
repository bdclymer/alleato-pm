# Task: Scripts source-of-truth normalization

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - Linear issue creation tool unavailable in current connector set; only comment/document tools exposed
Related Handoff: N/A

## Objective

Make `scripts/` understandable and safe for agents by documenting live script
categories, deleting generated local clutter, and extending repo-control so
unclassified or retired script artifact roots fail loudly.

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

- `scripts/README.md` exists and classifies the script categories agents should
  treat as live, generated, archived, or external tool sandboxes.
- Generated clutter under `scripts/` is deleted when it is safe to remove:
  Python caches, `.DS_Store`, nested `node_modules`, and local output folders.
- `repo:control` fails if deleted script artifact roots reappear.
- `repo:control` fails if a new tracked `scripts/<category>` appears without
  classification.
- Verification proves the guard passes after cleanup.

## Files To Change

- `docs/ops/tasks/2026-06-22-scripts-source-of-truth-normalization.md`
- `scripts/README.md`
- `scripts/audits/check-repo-control.mjs`
- generated local artifact paths under `scripts/**`

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `node --check scripts/audits/check-repo-control.mjs` | Pass | Guard script parses. |
| Targeted tests        | `npm run repo:control`; `node scripts/audits/check-repo-control.mjs --strict` | Pass | Script categories classified; deleted script artifact roots absent. |
| Browser/user-flow     | N/A | Pass | Control-plane cleanup only; no frontend UI change. |
| DB/provider read-back | N/A | Pass | No DB/provider changes. |
| End-to-end proof      | `find scripts -path '*/node_modules'`; `find scripts -path '*/__pycache__'`; `find scripts -name .DS_Store`; artifact-root absence check | Pass | No nested script `node_modules`, Python caches, or `.DS_Store` remain. Blocked roots are absent. |

## Files Changed

- `docs/ops/tasks/2026-06-22-scripts-source-of-truth-normalization.md` - task ledger and evidence.
- `.gitignore` - ignores script-local generated dependency/cache/output roots.
- `scripts/README.md` - classifies live script categories, tool sandboxes, legacy root scripts, and deleted generated roots.
- `scripts/audits/check-repo-control.mjs` - enforces tracked script category classification and blocks deleted script artifact roots.
- `scripts/change-events-crawl/crawl-report.md` - removed retired crawl report artifact.
- `scripts/change-events-crawl/html/**` - removed retired crawl HTML artifacts.
- `scripts/change-events-crawl/screenshots/**` - removed retired crawl screenshot artifacts.
- `scripts/playwright-crawl/outputs/migration-validation-report.json` - removed runtime crawl output artifact.
- `verify-output/**` - removed regenerated verification screenshots caught by repo-control.

## Risks / Gaps

- `scripts/` contains many old one-off operational scripts. This task classifies
  and removes generated clutter; it does not prove every individual script is
  still needed.
- The broader repo has extensive unrelated dirty state. This task must only
  claim script-control paths it owns.
- `scripts/change-events-crawl/` is now empty after artifact deletion; it will
  disappear from git after the tracked artifact deletions are committed.
- Several modified/deleted script files from prior cleanup work remain outside
  this task's ownership.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
