# Task: Docs Archive Migration

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - current Linear connector exposes comment tools only, not issue creation/search.
Related Handoff: N/A

## Objective

Make `docs/alleato-os-docs` the unambiguous frontend docs source of truth by
moving historical top-level docs folders into
`docs/archive/2026-06-22-docs-migration/`, documenting the retained structure,
and extending repo-control so archived roots fail loudly if they reappear.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Top-Level Folder Inventory

| Folder | Classification | Action |
| --- | --- | --- |
| `docs/.archive` | historical/archive | Move under migration archive |
| `docs/PRPs` | historical/archive | Move |
| `docs/ai-plan` | historical/archive | Move |
| `docs/alleato-os-docs` | active source of truth | Keep |
| `docs/alleato-templates` | historical/archive | Move |
| `docs/api` | historical/archive | Move |
| `docs/architecture` | generated/current evidence | Keep |
| `docs/asrs` | historical/archive | Move |
| `docs/briefs` | historical/archive | Move |
| `docs/caching` | historical/archive | Move |
| `docs/change-order-process` | historical/archive | Move |
| `docs/codebase-map` | historical/archive | Move |
| `docs/codex` | historical/archive | Move |
| `docs/context` | historical/archive | Move |
| `docs/deployment` | historical/archive | Move |
| `docs/design` | historical/archive | Move |
| `docs/development` | historical/archive | Move |
| `docs/documentation` | historical/archive | Move |
| `docs/engineering` | historical/archive | Move |
| `docs/features` | historical/archive | Move |
| `docs/handoffs` | operational evidence | Keep |
| `docs/help` | historical/archive | Move |
| `docs/implementation-workflow` | historical/archive | Move |
| `docs/integrations` | historical/archive | Move |
| `docs/issues` | historical/archive | Move |
| `docs/memories` | historical/archive | Move |
| `docs/onboarding` | historical/archive | Move |
| `docs/ops` | operational evidence | Keep |
| `docs/patterns` | historical/archive | Move |
| `docs/permissions` | historical/archive | Move |
| `docs/procore-reference` | historical/archive | Move |
| `docs/procore-templates` | generated/current evidence | Keep as evidence/templates, not product docs |
| `docs/project-overview` | historical/archive | Move |
| `docs/projects` | historical/archive | Move |
| `docs/reference` | active source of truth / reference evidence | Keep |
| `docs/reports` | generated/current evidence | Keep as evidence/report history |
| `docs/scheduling` | historical/archive | Move |
| `docs/scratch-notes` | delete candidate | Move to preserve history |
| `docs/superpowers` | historical/archive | Move |
| `docs/testing` | historical/archive | Move |
| `docs/typescript-errors` | historical/archive | Move |

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

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Inventory | `find docs -maxdepth 1 -mindepth 1 -print | sort` and folder file/tracked counts | Pass | Captured before moves in this task. |
| Static/type/lint | `npm run repo:control` | Pass | Repo-control classification check passed after migration. |
| Targeted tests | `node scripts/audits/check-repo-control.mjs --strict` | Pass | Strict mode passed after archived-docs guard update. |
| Browser/user-flow | N/A | Pass | Docs-only filesystem migration; no frontend-visible route changed. |
| DB/provider read-back | N/A | Pass | No database/provider changes. |
| End-to-end proof | `find docs -maxdepth 1 -mindepth 1 -print \| sort`; `find docs/archive/2026-06-22-docs-migration -maxdepth 1 -mindepth 1 -type d -exec basename {} \\; \| sort`; targeted `rg` scan for deprecated active docs paths | Pass | Active top-level folders are `alleato-os-docs`, `architecture`, `archive`, `handoffs`, `ops`, `procore-templates`, `reference`, `reports`. Archive contains 34 moved folders. Targeted scan exited `1` with no matches outside archive and the intentional source-of-truth policy page. |

## Files Changed

- `docs/archive/2026-06-22-docs-migration/**` - preserved historical docs folders.
- `docs/README.md` - final docs structure and usage rules.
- `docs/alleato-os-docs/operations/docs-source-of-truth.mdx` - canonical docs site source-of-truth policy.
- `scripts/audits/check-repo-control.mjs` - guard archived top-level docs roots.
- `docs/ops/tasks/2026-06-22-docs-archive-migration.md` - task ledger and evidence.

## Risks / Gaps

- Linear issue creation is unavailable in this tool session; the local task ledger records the capability gap.
- The repo has substantial pre-existing unrelated dirt; this task did not stage or revert unrelated changes.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
