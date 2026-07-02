# Task: Comments Annotation Polish

Status: Complete
Owner: Codex
Created: 2026-07-02
Linear Issue: Pending/Unavailable
Linear URL: Pending/Unavailable
Related Handoff: N/A

## Objective

Bring the comment header control and page annotation behavior back in line with the Alleato dropdown pattern and the annotation-first comment model: compact command menu, subtle trigger, minimal markers, quiet comment mode, and a clean discussion sidebar entry path.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified before adding new ones.
- [x] Source-of-truth owner chosen for the workflow/data/control plane.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined.

## Attention Brief

Primary user: Alleato project user reviewing a page with contextual discussion.
Primary job: add a comment to the page without losing focus on the work itself.
Primary decision: place a comment, reveal existing comments, or open the discussion list.
Tier 1: add comment, minimal marker, discussion visibility.
Tier 2: stacked page discussion and site-wide comments destination.
Tier 3: implementation-specific Velt chrome and advanced metadata.
Hide until requested: full thread list, site-wide history, filters, resolved history.
Remove: orange trigger chip, verbose dropdown copy, full-page comment-mode border, oversized persistent markers.
Primary action: add comment.
Failure-loudly behavior: comment visibility and mode changes must remain reachable from the header; if Velt cannot render markers or the sidebar, the control must still expose the commands and not silently redirect away from page annotation.

## Acceptance Criteria

- [x] Header comment dropdown matches the existing compact dropdown pattern.
- [x] Dropdown contains only `Add comment`, `View discussion`, and `View comments` / `Hide comments`.
- [x] Dropdown labels are compact and generic; no page-specific explanatory copy remains.
- [x] Header comment trigger no longer uses an orange active background.
- [x] Entering comment mode does not frame the whole page with a loud border.
- [x] After submitting a comment, the page returns to a minimal annotation state instead of staying visually noisy.
- [x] Existing page comment markers render as subtle collapsed markers by default.
- [x] Marker hover reveals more context; hover out returns the marker to the collapsed state.
- [x] `View discussion` opens the page discussion sidebar.
- [x] Sidebar retains the `View all site comments` link with tooltip, while the dropdown does not duplicate global history/feed UI.

## Failure-Loudly Behavior

- If comments are hidden, the dropdown label changes to `View comments`; if visible, it changes to `Hide comments`.
- If comment mode cannot start, the trigger remains clickable and keyboard accessible instead of silently doing nothing.
- If the page discussion sidebar cannot load comments, it still opens and shows a clear empty/error state rather than redirecting away from page context.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Existing shared dropdown primitives reused; no bespoke dropdown layout introduced.
- [x] Comment mode behavior adjusted at the Velt integration seam, not with page-local overrides.
- [x] Styling changes applied in shared/global comment theming, not scattered per page.
- [x] User-facing copy/UI follows project noise gate and design doctrine rules.

## Planned Files

- `docs/ops/tasks/2026-07-02-comments-annotation-polish.md`
- `frontend/src/components/header/comments-sidebar-button.tsx`
- `frontend/src/components/velt/VeltGlobalLayer.tsx`
- `frontend/src/app/globals.css`

## Integration Checklist

- [x] End-to-end path wired through one owner, not separate disconnected pieces.
- [x] All entry points for the workflow use the same canonical service/runtime.
- [x] No page-local override added to compensate for shared primitive or integration defects.
- [x] Linear kickoff and milestone comments recorded, or blocker documented.

## Regression Guardrails

- [x] Guardrail added so the same class of dropdown/persistent-comment-mode regression fails loudly next time.
- [x] Existing behavior adjusted only for intentional changes.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Browser/user-flow verification run for frontend-visible changes.
- [x] End-to-end workflow proof captured for the actual requested outcome.
- [x] Design doctrine audit scripts run on changed UI surfaces.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Template gate | `sed -n '1,240p' docs/ops/tasks/TASK-TEMPLATE.md` | Process gap | Referenced template path is absent in repo; this task file mirrors the existing task-file format already in use. |
| Changed type-debt gate | `cd frontend && npm run typecheck:changed` | Pass | No new `any` debt introduced by the comments polish changes. |
| Targeted ESLint | `cd frontend && ./node_modules/.bin/eslint src/components/header/comments-sidebar-button.tsx src/components/velt/VeltGlobalLayer.tsx` | Pass | No lint errors on changed TypeScript surfaces. |
| Design doctrine audit | `node .agents/skills/alleato-design-doctrine/scripts/audit-surface-complexity.mjs frontend/src/components/header/comments-sidebar-button.tsx frontend/src/components/velt/VeltGlobalLayer.tsx` | Pass | Dropdown/menu and Velt integration passed the complexity gate. |
| Browser verification: dropdown labels | `.codex-artifacts/comments-dropdown-open-2.png` | Pass | Verified compact 3-row command menu: `Add comment`, `View discussion`, `View comments`. |
| Browser verification: visibility toggle state | Playwright script output `BEFORE_START ... View comments` and `AFTER_START ... Hide comments` | Pass | Confirmed dynamic label flips with page-comment visibility state. |
| Browser verification: add comment entry | Playwright script output `ADD_COMMENT_MODE_PASS` | Pass | Header command enters page comment placement mode on local `http://localhost:3001/`. |
| Browser verification: subtle comment mode | `.codex-artifacts/comments-comment-hover-highlight.png` | Pass | Hover highlight reduced to a quiet edge highlight; no full-page border/frame rendered on local route. |
| Browser verification: discussion sidebar | `.codex-artifacts/comments-view-discussion-fixed-7.png` | Pass | `View discussion` opens the right-side discussion panel with footer link to all site comments. |
| Sub-agent runtime verification | Browser debugger agent `019f2366-a98d-7a42-9d67-4e0090335155` | Pass with note | Verified collapsed marker bubble, hover-expanded preview card, and that submit exits comment mode. Also captured exact Velt DOM selectors and highlighter hooks. |
| Unrelated local runtime issue | Browser debugger report on `/api/admin/feedback/velt` mirror | Unrelated | Velt UI comment post succeeded; local mirror request hit `ERR_CONNECTION_REFUSED`. Not part of this dropdown/annotation polish task. |

## Files Changed

- `docs/ops/tasks/2026-07-02-comments-annotation-polish.md` - task gate and verification ledger.
- `frontend/src/components/header/comments-sidebar-button.tsx` - unified compact comments menu, renamed commands, neutral trigger, and fixed `View discussion` interaction path.
- `frontend/src/components/velt/VeltGlobalLayer.tsx` - removed persistent comment mode and pin highlighter, enabled collapsed hoverable annotations.
- `frontend/src/app/globals.css` - neutral Velt tokens and explicit overrides for subtle annotation highlights and marker chrome.
