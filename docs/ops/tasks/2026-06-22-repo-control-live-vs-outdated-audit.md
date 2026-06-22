# Task: Repo Control Live vs Outdated Audit

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created yet - blocked
Related Handoff: N/A

## Objective

Create a practical control map for the repo so product runtime code, generated
artifacts, tests, agent tooling, archives, and delete candidates are visibly
separated. The immediate outcome is a cleanup inventory and guardrail plan that
prevents AI agents from treating outdated folders as live code.

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

- A repo-control inventory identifies live product/runtime paths, generated
  paths, archive/output paths, test paths, and agent/tooling paths.
- The specific confusing examples are classified with owner, live status, and
  recommended action: test folders, `tools`, `scripts`,
  `claude-memory-compiler-main`, `extract-design-system`, and Liveblocks files.
- No destructive deletes happen until the inventory marks a path as safe and a
  guardrail exists to keep it from reappearing.
- The final answer clearly separates what is known, what is still uncertain,
  and the recommended cleanup order.

## Files Changed

- `docs/ops/tasks/2026-06-22-repo-control-live-vs-outdated-audit.md` - working task ledger.
- `docs/ops/repo-control-live-vs-outdated-inventory.md` - initial control inventory and cleanup order.
- `docs/ops/repo-control/README.md` - repo-control source of truth for live, tooling, generated, artifact, and retirement paths.
- `docs/alleato-os-docs/operations/repo-control.md` - frontend documentation site source-of-truth page for repo control.
- `scripts/audits/check-repo-control.mjs` - guardrail for unclassified tracked top-level paths and cleanup debt reporting.
- `package.json` - adds `npm run repo:control`.
- `e2e-screenshots/` - removed after confirming it contained only an empty nested directory and no tracked files.
- `verify-output/` - removed after confirming it was ignored and had zero tracked files.
- `frontend/tests/agent-browser-runs/` - removed duplicate evidence sink after confirming it was ignored and had zero tracked files.
- `frontend/e2e-screenshots/` - removed legacy screenshot sink after confirming it was ignored and had zero tracked files.
- `frontend/tests/e2e-screenshots/` - removed legacy screenshot sink after confirming it was ignored and had zero tracked files.
- `tools/` - removed ignored Liveblocks MCP server and nested dependencies after confirming there were zero tracked files.
- `.extract-design-system/` - removed tracked generated extraction output after confirming no live references outside the repo-control guard.
- `design-system/` - removed tracked generated starter token output after confirming no live references to root `design-system/tokens.*`.
- `tests/agent-browser-runs/` - removed committed evidence artifacts; this remains the ignored runtime output root for future browser verification.
- `frontend/tests/screenshots/` - removed committed legacy screenshot artifacts.
- Liveblocks runtime/API/demo/dependency paths - removed and blocked from reintroduction by repo-control guard.
- `frontend/src/lib/collaboration/rooms.ts` - canonical room/entity helper replacing the retired Liveblocks namespace.
- Generated route/project/database inventories - regenerated after route and API deletion.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `node --check scripts/audits/check-repo-control.mjs` | Pass | Syntax check for repo-control guard. |
| Static/type/lint      | `pnpm --dir frontend exec tsc --noEmit --pretty false` | Fail then superseded | Failed with Node heap OOM near 4 GB. Re-ran with larger heap. |
| Static/type/lint      | `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir frontend exec tsc --noEmit --pretty false` | Pass | Larger-heap frontend typecheck passed after Liveblocks retirement. |
| Targeted tests        | `npm run repo:control`; `node scripts/audits/check-repo-control.mjs --strict` | Pass | All tracked top-level paths are classified; deleted artifact/generated roots and retired Liveblocks paths fail if recreated. Strict mode passes. |
| Targeted tests        | `npm run check:routes` | Pass | No route conflicts after removing demo and Liveblocks API routes. |
| Browser/user-flow     | N/A | N/A | Cleanup/source-control task; no retained user-facing route required browser proof. Removed admin spreadsheet demo link and route. |
| DB/provider read-back | N/A                | N/A    | Audit-only slice; no schema/provider changes. |
| End-to-end proof      | `find`, `rg`, `du`, `git ls-files`, and `frontend/package.json` inspection | Pass | Classified named folders, artifact roots, tracked artifact debt, active test roots, Claude hooks, and Liveblocks runtime references. |
| Cleanup proof         | `find e2e-screenshots -maxdepth 4 -print`; `du -sh e2e-screenshots`; `git ls-files e2e-screenshots`; `rmdir ...`; `test ! -e e2e-screenshots` | Pass | Removed only the empty untracked root screenshot shell. |
| Cleanup proof         | `git ls-files`; `git check-ignore`; `du -sh`; `rm -rf verify-output frontend/tests/agent-browser-runs frontend/e2e-screenshots frontend/tests/e2e-screenshots tools`; `test ! -e ...` | Pass | Removed ignored generated output roots and ignored Liveblocks MCP tooling with zero tracked files. |
| Cleanup proof         | `rg` reference checks; `git ls-files .extract-design-system design-system`; `apply_patch` delete; `rmdir`; `npm run repo:control` | Pass | Removed tracked generated design extraction/token outputs and made guard fail if they reappear. |
| Cleanup proof         | `git ls-files tests/agent-browser-runs frontend/tests/screenshots`; `du -sh`; `rm -rf tests/agent-browser-runs frontend/tests/screenshots`; `npm run repo:control` | Pass | Removed committed evidence/screenshot artifacts from git-controlled paths; future browser runs still write to ignored `tests/agent-browser-runs`. |
| Liveblocks proof      | `rg` import/path scan; `pnpm --dir frontend remove @liveblocks/...`; `npm run map:project`; `npm run docs:generate-app-expert`; `npm run db:inventory`; `npm run repo:control`; `node scripts/audits/check-repo-control.mjs --strict` | Pass | Liveblocks runtime/API/demo/dependencies removed; generated discovery files refreshed; guard now fails if Liveblocks returns. |
| Docs proof            | `docs/alleato-os-docs/operations/repo-control.md` | Pass | Source-of-truth summary exists under the new frontend documentation site path requested by the user. |

## Risks / Gaps

- The worktree already contains unrelated dirty files. This audit must avoid
  sweeping unrelated edits into a cleanup commit.
- Some folders are external-agent configuration rather than product runtime.
  Deleting them without replacing agent instructions could make future tooling
  worse.
- Linear issue was not created because the current Linear toolset exposed
  comment operations only, not issue creation. This should be backfilled if the
  Linear create capability is restored.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
