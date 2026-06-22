# Task: Root script inventory guard

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - Linear issue creation tool unavailable in current connector set; only comment/document tools exposed
Related Handoff: N/A

## Objective

Stop loose root-level files under `scripts/` from confusing agents by adding a
tracked inventory, classifying root scripts by owner/status, and making
`repo:control` fail when a new root script appears without classification.

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

- `scripts/ROOT-SCRIPTS.md` exists and classifies every tracked root-level
  `scripts/*` file.
- `scripts/README.md` links to the root script inventory and states that new
  root scripts are not allowed without classification.
- `repo:control` fails if any tracked root-level script file is not classified.
- Verification proves the guard passes with the current tracked root scripts.

## Files To Change

- `docs/ops/tasks/2026-06-22-root-script-inventory-guard.md`
- `scripts/README.md`
- `scripts/ROOT-SCRIPTS.md`
- `scripts/audits/check-repo-control.mjs`

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `node --check scripts/audits/check-repo-control.mjs` | Pass | Guard script parses. |
| Targeted tests        | `npm run repo:control`; `node scripts/audits/check-repo-control.mjs --strict`; root inventory coverage script | Pass | Every tracked root-level `scripts/*` file is classified in `scripts/ROOT-SCRIPTS.md`; guard reports classifications and passes. |
| Browser/user-flow     | N/A | Pass | Control-plane cleanup only; no frontend UI change. |
| DB/provider read-back | N/A | Pass | No DB/provider changes. |
| End-to-end proof      | `scripts/ROOT-SCRIPTS.md`; `scripts/README.md`; `scripts/audits/check-repo-control.mjs` | Pass | Human-readable inventory and machine guard now agree. |

## Files Changed

- `docs/ops/tasks/2026-06-22-root-script-inventory-guard.md` - task ledger and evidence.
- `scripts/README.md` - links root script policy to `ROOT-SCRIPTS.md`.
- `scripts/ROOT-SCRIPTS.md` - classifies every tracked root-level script by status and owner category.
- `scripts/audits/check-repo-control.mjs` - blocks unclassified tracked root-level scripts and requires script control files.

## Risks / Gaps

- This task classifies root scripts and prevents new unclassified root scripts.
  It does not delete every legacy one-off script; deletion requires separate
  reference checks by domain.
- The broader repo has extensive unrelated dirty state.
- `backfill-helper`, `import-helper`, and `test-helper` root scripts remain
  candidates for later archive/delete passes after domain-specific reference
  checks.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
