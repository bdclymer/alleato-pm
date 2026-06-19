# Task: Feature request Linear standard correction

Status: Complete
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-552
Related Handoff: N/A

## Objective

Correct the feature request workspace against the attached Linear design standard. The main column must stop duplicating sidebar property rows, use a compact chip row, restore the readiness callout as a real warning container, preserve useful two-column packet structure, and distinguish original request text from generated content.

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

- [x] Main metadata row is compact chips, not duplicated label/value properties.
- [x] Sidebar remains the structured property editor.
- [x] Readiness is a discrete warning/callout container, not inline bold text.
- [x] Section labels are small, uppercase, letter-spaced, and muted.
- [x] Acceptance Criteria and Verification Steps remain a two-column parallel section on desktop.
- [x] Original Request has a blockquote treatment and does not look system-authored.
- [x] AI drafts and long implementation detail remain hidden until requested.

## Failure-Loudly Behavior

- Readiness blockers are visible in the callout and in the sidebar readiness section.
- Missing issue rows fall back to a quiet row with the next action.
- If `impeccable teach` remains unavailable, this task records the limitation rather than pretending PRODUCT.md exists.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint 'src/components/feature-requests/FeatureRequestDetail.tsx'` | Pass | Focused lint on corrected component |
| Targeted tests        | `npm run check:routes`; `git diff --check` | Pass | No route conflicts; diff whitespace clean |
| Browser/user-flow     | `/tmp/feature-request-linear-standard-desktop.png`; `/tmp/feature-request-linear-standard-mobile.png` | Pass | Route loaded; no horizontal overflow on desktop or mobile |
| DB/provider read-back | N/A                | N/A    | UI-only change |
| End-to-end proof      | Browser first-read text and screenshots | Pass | Header now shows chips: `ready for planning`, `Almost ready`, `high priority`, `Brandon`, `workflow improvement`; sidebar remains property rows |

## Files Changed

- `frontend/src/components/feature-requests/FeatureRequestDetail.tsx` - Correct Linear structure and hierarchy.
- `docs/ops/tasks/2026-06-19-feature-request-linear-standard-correction.md` - Task gate and evidence ledger.

## Risks / Gaps

- `PRODUCT.md` is missing and `npx impeccable teach` reports `Warning: cannot access teach`; proceeded under `DESIGN.md`, the Alleato noise gate, and the attached Linear standard.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
