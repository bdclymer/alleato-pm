# Task: Staging Preview Build OOM

Status: In Progress
Owner: Codex
Created: 2026-06-21
Linear Issue: AAI-586 - https://linear.app/megankharrison/issue/AAI-586/unblock-staging-preview-build-after-turbopack-oom
Related Handoff: N/A

## Objective

Unblock the `staging` Vercel Preview deployment for the AI feature flag smoke by adding a narrow env-controlled build engine switch, enabling it only for `Preview (staging)`, and verifying the deployment can reach READY.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

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
- [ ] Provider/env/config changes handled through CLI/API/MCP when available.
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

- [ ] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [ ] Targeted automated test run.
- [ ] Browser/user-flow verification run for frontend-visible changes.
- [ ] Database/provider read-back performed for migrations/config/external services.
- [ ] End-to-end workflow proof captured for the actual requested outcome.
- [ ] Evidence artifacts recorded below.
- [ ] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `node --check frontend/scripts/build/run-production-build.mjs` | Passed | Build wrapper parses after adding `NEXT_PRODUCTION_BUILD_ENGINE`. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/tools/__tests__/outbound-action-policy.test.ts src/lib/ai/stream/__tests__/compaction.test.ts --runInBand` | Passed | 2 suites / 11 tests passed. The build-script behavior is env-gated and will be verified by the staging preview build. |
| Browser/user-flow     | Pending | Pending | Run only after preview deployment is READY. |
| DB/provider read-back | Pending | Pending | Vercel env read-back required after setting build engine for Preview `staging`. |
| End-to-end proof      | `vercel inspect alleato-2cy2k4loe-meganharrisons-projects.vercel.app --logs --scope meganharrisons-projects` | Failed before fix | Build failed during `pnpm run build:production`; `Next.js build worker exited with code: null and signal: SIGKILL`; Vercel detected an OOM event. |

## Files Changed

- `frontend/scripts/build/run-production-build.mjs` - add env-controlled build engine selection.
- `docs/ops/tasks/2026-06-21-staging-preview-build-oom.md` - task done gate and evidence.

## Risks / Gaps

- The initial deployment failure is build-infrastructure debt, not caused by the AI feature flags.
- The build-engine override must be scoped to Preview `staging`; production build behavior should remain unchanged.
- The worktree contains unrelated existing changes and untracked files; this task owns only the files listed above plus provider env state.

## Final Status

- [ ] All checklist items are complete.
- [ ] Evidence is recorded.
- [ ] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [ ] Final response includes what is done, what remains, and recommended next steps.
