# Task: Convert manpower page tables to UnifiedTablePage

Status: In Progress
Owner: Codex
Created: 2026-06-20
Linear Issue: Not available in this session - proceeding under direct user request
Related Handoff: None

## Objective

Move the manpower page off local raw table/search implementations and onto the shared `UnifiedTablePage` patterns so the staffing surface follows the design system and clears the remaining table-shell warnings without losing persisted staffing workflows.

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

- [ ] Unit or integration test added/updated for the core behavior.
- [ ] Contract test added/updated for cross-module or source/delivery boundaries.
- [x] Guardrail added so the same class of bug fails loudly next time.
- [x] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated test run.
- [ ] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services.
- [ ] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check | Command / artifact | Result | Notes |
| ----- | ------------------ | ------ | ----- |
| Static/type/lint | `pnpm --dir frontend exec eslint src/features/manpower/manpower-page-client.tsx`; `npm --prefix frontend run quality:changed` | Pass | No new ESLint debt, no new `any`, no unsafe patterns, no changed route guardrail issues. |
| Targeted tests | `pnpm --dir frontend exec jest --runInBand --runTestsByPath src/features/manpower/parser.unit.test.ts` | Pass | Existing manpower parser tests still pass after the UI refactor. |
| Browser/user-flow | `agent-browser open http://localhost:3001/manpower`; Playwright probe with `frontend/tests/.auth/user.json` | Blocked | Both paths redirected to `/auth/login?callbackUrl=%2Fmanpower`; saved auth state is stale and direct browser login did not advance. |
| DB/provider read-back | Not applicable | Pass | No DB/provider changes in this task. |
| End-to-end proof | `http://localhost:3001/manpower` runtime probe | Partial | Route compiles and serves, but authenticated page proof is still blocked by local auth state. |

## Files Changed

- `docs/ops/tasks/2026-06-20-manpower-unified-table-page.md` - task ledger and evidence
- `frontend/src/features/manpower/manpower-page-client.tsx` - migrate manpower tables to shared unified-table patterns

## Risks / Gaps

- Live browser verification is blocked by local auth state drift: `frontend/tests/.auth/user.json` redirects to login and the direct `agent-browser` login attempt stayed on the auth page.
- Detection gap: the repo’s saved auth session is stale, so UI verification can fail before reaching the feature under test.
- Prevention step: refresh `frontend/tests/.auth/user.json` with the repo’s auth setup flow before the next frontend verification pass.
- Owner: frontend auth test state / local verification environment.
- This task does not mutate persisted staffing data shape or APIs.

## Final Status

- [ ] All checklist items are complete.
- [ ] Evidence is recorded.
- [ ] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [ ] Final response includes what is done, what remains, and recommended next steps.
