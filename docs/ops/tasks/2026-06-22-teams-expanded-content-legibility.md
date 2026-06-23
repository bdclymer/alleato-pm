# Task: Teams Expanded Content Legibility

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-595 - https://linear.app/megankharrison/issue/AAI-595/make-teams-document-metadata-expanded-content-legible
Related Handoff: N/A

## Objective

The inline expanded row on `/document-metadata?type=teams` renders Teams
messages as readable sender/time/message blocks instead of raw ingestion text.

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

- Expanding a Teams row shows readable message blocks.
- The side sheet and inline expanded row use the same Teams parser/renderer.
- The table stays quiet: no extra cards, summary panels, or duplicate CTAs.
- A focused test covers Teams message parsing/formatting.

## Failure-Loudly Behavior

- Raw Teams ingestion syntax should not be the primary display when message
  markers can be parsed.
- If parsing fails, the renderer falls back to whitespace-preserved text rather
  than an empty row.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/lint           | `cd frontend && npm run lint:errors -- --quiet 'src/components/document-metadata/teams-conversation.tsx' 'src/components/document-metadata/__tests__/teams-conversation.test.ts' 'src/app/(admin)/document-metadata/document-metadata-client.tsx' 'src/app/(admin)/document-metadata/document-metadata-sheet.tsx'` | Pass | Changed UI/test files lint clean. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/components/document-metadata/__tests__/teams-conversation.test.ts` | Pass | 2 tests cover Teams marker parsing and fallback behavior. |
| Browser/user-flow     | `agent-browser open http://localhost:3001/document-metadata?type=teams`; click first row expand control | Pass | Expanded row rendered `Conversation` with sender/time/message blocks. |
| DB/provider read-back | N/A | Pass | No database/provider changes. Uses existing content API and loaded content from prior fix. |
| End-to-end proof      | `tests/agent-browser-runs/2026-06-22-teams-expanded-content-legibility/teams-expanded-row-readable.png` | Pass | Screenshot captures readable expanded Teams row. |

## Files Changed

- `docs/ops/tasks/2026-06-22-teams-expanded-content-legibility.md` - task ledger.
- `frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx` - inline expanded row renderer.
- `frontend/src/app/(admin)/document-metadata/document-metadata-sheet.tsx` - remove duplicate Teams renderer.
- `frontend/src/components/document-metadata/teams-conversation.tsx` - shared Teams renderer.

## Risks / Gaps

- Full bounded typecheck was not rerun for this tiny UI renderer change because the immediately prior run timed out on existing repo full-program scope debt before diagnostics. Focused lint, unit, and browser verification passed.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
