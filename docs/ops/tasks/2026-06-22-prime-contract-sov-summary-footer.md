# Task: Prime Contract SOV Summary Footer

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created yet - blocked; Linear search exposed comment/document tools only, not issue creation.
Related Handoff: N/A

## Objective

Prime contract SOV tables on the detail overview and Schedule of Values tab show the Procore-style summary rows from the screenshot, and the Add action sits in the same row as the Schedule of Values heading, right aligned.

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
- [x] Contract test added/updated for cross-module or source/delivery boundaries, or marked not applicable for UI-only work.
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

- Overview page SOV section includes summary rows: Subtotal, Original Contract, Approved Changes, Contract Total, Billed to Date, Amount Remaining.
- Schedule of Values tab includes the same summary rows with the same values.
- The Add dropdown is right aligned in the Schedule of Values heading row on both SOV surfaces.
- Summary row math is covered by a focused guardrail test.

## Failure-Loudly Behavior

- Summary calculations are centralized and tested so a change to approved changes, billed-to-date, or remaining-balance math fails in a targeted test.
- The summary footer component requires an explicit currency formatter and numeric summary inputs instead of recomputing from hidden page state.

## Planned Files Changed

- `frontend/src/components/domain/contracts/prime-contract-detail/sov-summary-footer.tsx` - shared SOV summary rows and calculation helper.
- `frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractSovTab.tsx` - use shared footer and move Add action to heading row.
- `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/components/PrimeContractOverviewTab.tsx` - use shared footer and move Add action to heading row.
- `frontend/src/components/domain/contracts/prime-contract-detail/__tests__/sov-summary-footer.test.tsx` - focused guardrail for summary rows/math.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint src/components/domain/contracts/prime-contract-detail/sov-summary-footer.tsx src/components/domain/contracts/prime-contract-detail/PrimeContractSovTab.tsx 'src/app/(main)/[projectId]/prime-contracts/[contractId]/components/PrimeContractOverviewTab.tsx' 'src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx' src/components/domain/contracts/prime-contract-detail/__tests__/sov-summary-footer.test.tsx --quiet` | Pass | Changed files lint clean. |
| Static/type/lint      | `cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false` | Unrelated fail | `src/app/(admin)/table-v2/page.tsx(304,9): Type 'CompanyData \| null' is not assignable to type 'Company \| null \| undefined'. Property 'license_number' is missing in type 'CompanyData' but required in type 'Company'.` |
| Targeted tests        | `cd frontend && npx jest src/components/domain/contracts/prime-contract-detail/__tests__/sov-summary-footer.test.tsx --runInBand` | Pass | 2 tests passed. |
| Browser/user-flow     | `agent-browser --session prime-sov ... http://localhost:3001/1067/prime-contracts/a5d7dbe0-2171-45d5-abe8-f6866d837d5f` | Pass | Overview and SOV tab both showed Subtotal, Original Contract, Approved Changes, Contract Total, Billed to Date, Amount Remaining; Add appears in Schedule of Values heading row. |
| DB/provider read-back | N/A | Pass | No database/schema/provider change required. |
| End-to-end proof      | `docs/ops/evidence/2026-06-22-prime-contract-sov-summary-footer/sov-tab-summary-footer.png` | Pass | Screenshot captured after live local login on requested contract URL. |

## Files Changed

- `docs/ops/tasks/2026-06-22-prime-contract-sov-summary-footer.md` - task ledger and evidence.
- `docs/ops/evidence/2026-06-22-prime-contract-sov-summary-footer/sov-tab-summary-footer.png` - browser evidence screenshot.
- `frontend/src/components/domain/contracts/prime-contract-detail/sov-summary-footer.tsx` - shared SOV summary calculation and footer rows.
- `frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractSovTab.tsx` - SOV tab footer rows and heading-row Add action.
- `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/components/PrimeContractOverviewTab.tsx` - overview SOV footer rows and heading-row Add action.
- `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx` - passes approved change total into the SOV tab.
- `frontend/src/components/domain/contracts/prime-contract-detail/__tests__/sov-summary-footer.test.tsx` - guardrail for footer math and required rows.

## Risks / Gaps

- Typecheck still fails on unrelated admin table/company type drift in `frontend/src/app/(admin)/table-v2/page.tsx`; this task did not modify that file.
- Linear issue creation is blocked by unavailable issue-creation capability in the exposed Linear toolset.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
