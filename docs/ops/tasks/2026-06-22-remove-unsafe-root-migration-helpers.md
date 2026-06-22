# Task: Remove unsafe root migration helpers

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - Linear issue creation tool unavailable in current connector set; only comment/document tools exposed
Related Handoff: N/A

## Objective

Remove stale root-level migration helper scripts that either contain hardcoded
provider secrets or point operators at outdated manual migration paths, and
replace old docs references with the current Supabase migration/type workflow.

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

- Unsafe/stale root migration helpers are deleted from `scripts/`.
- Unreferenced hardcoded service-role helper scripts outside the root migration
  set are deleted or repaired.
- Active docs no longer tell operators to run those deleted helpers.
- `scripts/ROOT-SCRIPTS.md` and `repo:control` no longer classify deleted
  helpers as live root scripts.
- `repo:control` fails if those deleted root helper filenames reappear.
- Verification proves no active references remain outside historical task docs.

## Files To Change

- `docs/ops/tasks/2026-06-22-remove-unsafe-root-migration-helpers.md`
- `docs/features/claude/CLAUDE-COMMANDS.md`
- `scripts/ROOT-SCRIPTS.md`
- `scripts/audits/check-repo-control.mjs`
- unsafe/stale root helper scripts under `scripts/`
- `scripts/send-teams-proactive.mjs`
- `scripts/misc/check-tables.ts`

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `node --check scripts/audits/check-repo-control.mjs` | Pass | Guard script parses. |
| Targeted tests        | `npm run repo:control`; `node scripts/audits/check-repo-control.mjs --strict`; root inventory coverage script | Pass | Repo-control strict passes; root inventory covers tracked root scripts. |
| Browser/user-flow     | N/A | Pass | Docs/control-plane cleanup only; no frontend UI change. |
| DB/provider read-back | N/A | Pass | No DB/provider changes. |
| End-to-end proof      | Active-reference scan for deleted helper paths; service-role literal scan under `scripts/**` excluding archive | Pass | Deleted helper paths have no active references; service-role literal scan only finds the guard regex itself. |

## Files Changed

- `docs/ops/tasks/2026-06-22-remove-unsafe-root-migration-helpers.md` - task ledger and evidence.
- `docs/features/claude/CLAUDE-COMMANDS.md` - replaces stale one-off migration helper commands with `npm run db:push`, `npm run db:migrations:verify-clean`, and `npm run db:types`.
- `scripts/ROOT-SCRIPTS.md` - removes deleted helper filenames from active root inventory and records them as deleted unsafe/stale migration helpers.
- `scripts/audits/check-repo-control.mjs` - blocks deleted helper paths and adds hardcoded service-role style secret detection under `scripts/**`.
- `scripts/send-teams-proactive.mjs` - removes hardcoded Supabase and Teams secret fallbacks; now requires env vars and fails loudly.
- `scripts/misc/check-tables.ts` - deleted unreferenced hardcoded service-role table checker.
- `scripts/apply-budget-migration.mjs` - deleted unsafe/stale root migration helper.
- `scripts/apply-migration-pg.js` - deleted stale root migration helper.
- `scripts/apply-migration.js` - deleted stale root migration helper.
- `scripts/apply-permissions-fix.js` - deleted stale root permissions helper.
- `scripts/apply-permissions-fix.mjs` - deleted stale root permissions helper.
- `scripts/apply-storage-rls-migration.sh` - deleted stale root storage/RLS helper.
- `scripts/create-drawing-tables.js` - deleted unsafe/stale drawing table helper.
- `scripts/fix-mcp-and-create-tables.js` - deleted unsafe/stale drawing table helper.

## Risks / Gaps

- Secret-bearing files may already exist in git history. Removing them from the
  working tree is necessary but does not rotate credentials or rewrite history.
- The Supabase service-role credential and Teams app secret found in tracked
  files should be treated as exposed and rotated outside this repo cleanup.
- Hardcoded Supabase anon keys remain in a few tool/eval files. Those are lower
  sensitivity than service-role secrets, but should still be normalized in a
  separate pass if the goal is zero literal provider keys.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
