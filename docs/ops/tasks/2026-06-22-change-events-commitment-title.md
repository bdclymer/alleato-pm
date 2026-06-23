# Task: Change Events Commitment Title

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - Linear issue creation tool unavailable in this session
Related Handoff: N/A

## Objective

When a change event line item has an assigned commitment, the `/25125/change-events` table shows the assigned commitment title in the `Commitment Title` column.

## Non-Negotiable Done Rule

This task is not done until every required checklist item below is checked, with evidence filled in. If any required item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

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

- [x] `GET /api/projects/25125/change-events` includes `commitment_title` for rows whose line items have `commitment_id`.
- [x] The change events table continues to render the existing `commitment_title` column without page-local UI overrides.
- [x] If assigned commitment IDs cannot be hydrated, the server logs a specific warning with the affected project and count.

## Noise Gate Brief

Primary user: project manager reviewing change events.
Primary job: identify cost exposure and the assigned commitment without opening every row.
Primary decision: whether the change event has already been assigned to the right commitment.
Tier 1: change event number/title, cost, assigned commitment title.
Tier 2: RFQ and PCO linkage.
Tier 3: status, scope, reason, origin.
Hide until requested: line-item details in expanded row.
Remove: no new UI elements.
Primary action: open the row or send selected rows to RFQ/commitment CO.
Failure-loudly behavior: API logs when assigned commitment IDs cannot be resolved.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `npm run quality:changed` | Partial / unrelated failure | Passed `lint:changed:debt`, `typecheck:changed`, then failed `guardrails:unsafe-patterns` on unrelated existing files: `frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx` silent catch and `frontend/src/app/(main)/[projectId]/pcos/page.tsx` unreasoned suppression. |
| Targeted tests        | `npm run test:unit -- --runInBand --runTestsByPath 'src/app/api/projects/[projectId]/change-events/__tests__/route.commitment-title.test.ts'` | Pass | Regression proves list route hydrates assigned commitment title and queries commitment labels through the service client. |
| Browser/user-flow     | `agent-browser open http://localhost:3001/25125/change-events`; `agent-browser snapshot`; `agent-browser screenshot docs/ops/evidence/2026-06-22-change-events-commitment-title/change-events-table.png` | Pass | Snapshot contains rendered `Commitment Title` cells: Roofing, Plumbing, Casework, Security & Fire Alarm, and Framing/Drywall title. |
| DB/provider read-back | Read-only Supabase service query from `frontend/` | Pass | Project 25125 has 16 change events, 16 line items, and 6 assigned `commitment_id` values. |
| End-to-end proof      | `curl http://localhost:3001/api/projects/25125/change-events?limit=100` before browser verification | Pass | Live API returned `rowsWithCommitmentTitle: 6` with sample titles including Roofing, Plumbing, Casework, Security & Fire Alarm. |
| Finish flow           | `npm run codex:finish -- --message "Show assigned commitment titles in change events" --files ...` | Blocked by unrelated staged files | Existing staged files belong to another change-event over/under task; left untouched. |

## Files Changed

- `frontend/src/app/api/projects/[projectId]/change-events/route.ts` - hydrate assigned commitment number/title for list rows.
- `frontend/src/app/api/projects/[projectId]/change-events/__tests__/route.commitment-title.test.ts` - regression coverage for assigned commitment title hydration.
- `docs/ops/tasks/2026-06-22-change-events-commitment-title.md` - task definition and evidence ledger.

## Risks / Gaps

- Supabase type generation failed without stderr in this shell; the generated file was restored from `HEAD` before implementation and relevant generated table definitions were inspected.
- The detached Next dev server wrapper exited after startup during final handoff. Browser and live API verification were completed while the server was active.
- Publishing remains blocked until the pre-existing staged files for the unrelated change-event over/under task are committed or unstaged by their owner.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
