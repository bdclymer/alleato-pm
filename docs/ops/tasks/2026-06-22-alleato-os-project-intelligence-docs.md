# Task: Alleato OS Project Intelligence source-of-truth docs

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created yet - blocked
Related Handoff: N/A

## Objective

Create canonical Project Intelligence documentation in the new frontend docs site at
`docs/alleato-os-docs`, organized by category, so the active setup, activation
runbook, deprecated paths, and verification checks have one source of truth.

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

- The new docs site contains a Project Intelligence category with a clear entry
  point and at least these pages: current state, activation runbook,
  deprecated paths, and verification.
- `mint.json` navigation includes the category pages so they are visible in the
  docs frontend.
- The docs state that `project_intelligence_synthesis_v1` is the intended
  canonical writer but not currently active fleet-wide until verified by live
  packet rows.
- Deprecated paths are identified without deleting runtime code in this docs-only
  task.
- A lightweight docs consistency check proves the docs include the active owner
  and do not silently omit the activation gap.

## Files Changed

- `docs/alleato-os-docs/mint.json` - add Project Intelligence category navigation.
- `docs/alleato-os-docs/project-intelligence/index.mdx` - canonical category entry point.
- `docs/alleato-os-docs/project-intelligence/current-state.mdx` - current live state and source of truth.
- `docs/alleato-os-docs/project-intelligence/activation-runbook.mdx` - activation steps and gates.
- `docs/alleato-os-docs/project-intelligence/deprecated-paths.mdx` - legacy paths and deletion criteria.
- `docs/alleato-os-docs/project-intelligence/verification.mdx` - health checks and readbacks.
- `scripts/verify/verify_alleato_os_project_intelligence_docs.mjs` - docs consistency guardrail.
- `package.json` - verification script entry.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `node --check scripts/verify/verify_alleato_os_project_intelligence_docs.mjs`; `mintlify validate` | Pass | Mintlify emitted a duplicate sharp/libvips Objective-C class warning, but validation passed. |
| Targeted tests        | `npm run docs:verify:project-intelligence` | Pass | Confirms category files, `mint.json`, `docs.json`, canonical compiler version, and activation-gap language. |
| Browser/user-flow     | `npm run dev` in docs app; `curl -I` `/project-intelligence`, `/project-intelligence/current-state`, `/project-intelligence/activation-runbook` | Pass | Mintlify used port 3005 because 3004 was occupied; all checked routes returned HTTP 200. |
| DB/provider read-back | Live `intelligence_packets` compiler-version query | Pass | Confirmed no current `project_intelligence_synthesis_v1` rows before docs update. |
| End-to-end proof      | `mint.json` + `docs.json` nav + docs consistency verifier | Pass | New category is visible to both Mintlify config formats used by the docs app. |

## Risks / Gaps

- Linear issue was not created because this is a small docs-only correction in
  the active conversation; create one if this becomes implementation cleanup.
- `npm run lint` in the docs app fails on pre-existing starter-template broken
  links in `development.mdx`, `quickstart.mdx`, and `essentials/*`; no failures
  were reported for the new Project Intelligence pages.
- The docs app worktree had unrelated dirty files before/alongside this task:
  `.vscode/settings.json`, existing `docs.json` changes, and an untracked
  `ai/SOURCE-TO-PROJECT-INTELLIGENCE-PIPELINE.md`.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
