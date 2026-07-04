# Task: Comment Annotation Redesign

Status: In Progress
Owner: Codex
Created: 2026-07-02
Linear Issue: AAI-883 - https://linear.app/megankharrison/issue/AAI-883/redesign-shared-comment-system-into-quiet-figma-style-annotations
Related Handoff: docs/ops/handoffs/2026-07-02-S111-comment-annotation-redesign.md

## Objective

Redesign the shared comment system into a quiet, annotation-first experience that keeps comments subordinate to project content while preserving the existing collaboration runtime and page-level context.

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

## Acceptance Criteria

- The shared header comment entry point uses one quiet icon with subtle unread/unresolved state and no raw count.
- Resolved comments disappear from page surfaces and the sidebar by default, with an explicit control to show resolved or all threads.
- Inline page markers are nearly invisible by default and expand only on hover or selection.
- Table-heavy surfaces use stable row-edge annotation markers by default rather than loud floating cell badges.
- The discussion panel is wider, calmer, and text-first, with the conversation carrying the highest visual weight.
- The reply composer uses progressive disclosure and does not expose secondary actions before typing begins.
- Visible comment UI is primarily owned by Alleato primitives or Alleato-controlled wrappers instead of permanent CSS combat against third-party chrome.

## Attention Brief

Primary user: PM, reviewer, or teammate working inside live project records.
Primary job: Inspect a context-bound discussion, reply or resolve it, and return to work without losing focus.
Primary decision: Does this exact row, field, task, or object need attention, or is it resolved?
Tier 1: Underlying project content and the currently open discussion thread.
Tier 2: Subtle marker presence, unread state, unresolved state, and the header entry point.
Tier 3: Search, filters, full metadata, attachments, overflow actions, and resolved-history access.
Hide until requested: Resolved threads, advanced thread actions, full timestamps, secondary metadata, and attachment/mention controls.
Remove: Large colored pins, assignment banners, nested cards, repeated pills, duplicate comment actions, and noisy hover chrome.
Primary action: Open, reply to, or resolve a context-bound discussion.
Failure-loudly behavior: If a comment loses stable context, the UI must explicitly surface that state and provide a canonical path back to the source record instead of silently rendering orphaned markers.

## Files To Change

- `frontend/src/components/header/comments-sidebar-button.tsx`
- `frontend/src/components/velt/VeltGlobalLayer.tsx`
- `frontend/src/components/comments/cell-comment-indicator.tsx`
- `frontend/src/features/comments/comments-split-page.tsx`
- `frontend/src/components/ds/comment-thread.tsx`
- `frontend/src/app/globals.css`
- `docs/ops/tasks/2026-07-02-comment-annotation-redesign.md`
- `docs/ops/handoffs/2026-07-02-S111-comment-annotation-redesign.md`
- `docs/ops/orchestration/session-board.md`

## Evidence

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Linear issue | `AAI-883` | Pass | Created before implementation on 2026-07-02. |
| Kickoff tracking | Handoff + session board | Pass | Session claimed in `docs/ops/orchestration/session-board.md`; handoff created. |
| Narrow lint | `cd frontend && npx eslint src/components/header/comments-sidebar-button.tsx src/features/comments/comments-split-page.tsx src/components/velt/VeltGlobalLayer.tsx src/components/ds/comment-thread.tsx src/components/comments/cell-comment-indicator.tsx "src/app/(main)/comments/comments-page-utils.ts" "src/app/(main)/comments/__tests__/comments-page-utils.test.ts" src/lib/stores/comments-visibility-store.ts` | Pass | Clean on touched TS/TSX surfaces. |
| Targeted unit test | `cd frontend && npm run test:unit -- --runInBand --runTestsByPath "src/app/(main)/comments/__tests__/comments-page-utils.test.ts"` | Pass | 6 tests passed. |
| Browser verification | `/Users/meganharrison/Documents/alleato-pm/tmp/AAI-883/comments-page.png`, `/Users/meganharrison/Documents/alleato-pm/tmp/AAI-883/project-invoices.png`, `/Users/meganharrison/Documents/alleato-pm/tmp/AAI-883/project-invoices-discussion-popover-v2.png` | Partial | Auth was repaired via Playwright setup. `/comments` and `/876/invoices` now render live. Remaining issue: the header discussion trigger rendered with the unread dot but did not mount popover content on click in the authenticated invoices page. |
| Earlier browser blocker | `/Users/meganharrison/Documents/alleato-pm/tmp/AAI-883/login-blocker.png` | Resolved | Initial delegated run was blocked at `/auth/login?callbackUrl=%2F`; later fixed by refreshing `frontend/tests/.auth/user.json` with Playwright auth setup against `localhost:3001`. |
| Runtime blocker note | `cd frontend && npm test -- --runTestsByPath "src/app/(main)/comments/__tests__/comments-page-utils.test.ts" --runInBand` | Unrelated failure documented | Wrong runner invoked Playwright, not Jest; corrected with `npm run test:unit`. |

## Files Changed

- `docs/ops/tasks/2026-07-02-comment-annotation-redesign.md` - task ledger.
- `docs/ops/handoffs/2026-07-02-S111-comment-annotation-redesign.md` - worker handoff.
- `docs/ops/orchestration/session-board.md` - ownership claim.
- `frontend/src/components/header/comments-sidebar-button.tsx` - quiet discussion trigger, lightweight dropdown, unresolved-only recents.
- `frontend/src/features/comments/comments-split-page.tsx` - calmer discussion list/detail split, URL-backed scopes, lightweight search.
- `frontend/src/components/velt/VeltGlobalLayer.tsx` - removed duplicate Velt chrome toggles at the source.
- `frontend/src/components/comments/cell-comment-indicator.tsx` - near-invisible hover marker.
- `frontend/src/components/ds/comment-thread.tsx` - smaller avatars, divider-based rhythm, quieter composer.
- `frontend/src/app/(main)/comments/comments-page-utils.ts` - unresolved/mine/mentions/resolved scopes and calmer timestamps.
- `frontend/src/app/(main)/comments/__tests__/comments-page-utils.test.ts` - guardrails for new scope behavior.
- `frontend/src/lib/stores/comments-visibility-store.ts` - annotations hidden by default.
- `frontend/src/app/globals.css` - calmer Velt thread styling and wider discussion rail.

## Risks / Gaps

- The visible thread/sidebar experience still depends on Velt runtime surfaces; if Velt UI ownership cannot be reduced enough through supported configuration, the remaining work may require a stronger Alleato-owned wrapper strategy.
- Browser verification is currently blocked by auth, so live confirmation of the Velt sidebar/thread chrome is still pending.
- The `/comments` page is materially quieter after implementation, but the authenticated header discussion trigger still appears to have a live click/popover regression on `/876/invoices`.
- The repository checkout contains unrelated dirty files. Final staging and publish must stay scoped to AAI-883-owned files only.

## Final Status

- [ ] All checklist items are complete.
- [ ] Evidence is recorded.
- [ ] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [ ] Final response includes what is done, what remains, and recommended next steps.
