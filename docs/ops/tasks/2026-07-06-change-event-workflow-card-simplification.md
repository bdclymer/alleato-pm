# Change Event Workflow Card Simplification

Date: 2026-07-06
Linear: [AAI-956](https://linear.app/megankharrison/issue/AAI-956/reduce-cognitive-load-in-change-event-assistant-workflow-card)
Status: Complete

## Objective

Reduce cognitive load in the AI Assistant change-event workflow card by making
the default state focused on the next user action and moving diagnostic detail
behind progressive disclosure.

## Scope

- Simplify the default `change_event_workflow` card in chat.
- Remove the large warning/checklist stack from the initial view.
- Show one primary next question/action first.
- Hide draft fields, checklist, missing risks, and related evidence behind
  compact disclosure controls.
- Keep existing workflow metadata, retrieval evidence, and `createChangeEvent`
  ownership unchanged.

## Out Of Scope

- Backend workflow behavior changes.
- Retrieval/planner changes.
- Eve or Deep Agent ownership changes.
- New database schema or migrations.

## Done Checklist

- [x] Create Linear issue before implementation.
- [x] Create task markdown before implementation.
- [x] Simplify default card hierarchy.
- [x] Add progressive disclosure for details/evidence.
- [x] Add project-context prerequisite card before change-event detail intake.
- [x] Run focused design/code checks.
- [x] Attempt browser visual verification.
- [x] Post Linear closeout comment.

## Evidence

- Linear issue: `AAI-956`.
- Linear closeout comment: `5ea46b09-adf5-48c2-97cd-c643266ebdfb`.
- Changed the missing-project flow so the assistant first asks which project to
  use and displays a reusable `project_picker` widget instead of showing the
  change-event workflow details too early.
- Added `actionLabel` to `ProjectPickerWidgetPayload` so the same picker can
  say `Use project` for context selection while preserving queue-generation
  usage elsewhere.
- Replaced the `project_picker` searchable popover with a short direct project
  list, so the picker passes the surface-complexity budget and does not behave
  like a mini page.
- Added project-context parsing in `buildChangeEventWorkflowDraft` so a picker
  follow-up containing `Project ID` and `Project Name` continues the same
  workflow.
- Added `change_event_workflow` to chat text suppression so the workflow card
  owns its response without duplicate text.
- Simplified `ChangeEventWorkflowWidget` default hierarchy to one status line,
  one next question, primary actions, and disclosure controls for details and
  sources.
- `cd frontend && npx jest src/lib/ai/__tests__/assistant-widgets.test.ts src/lib/ai/__tests__/change-event-workflow.test.ts --runInBand`
  passed with 14 tests.
- `cd frontend && npx eslint src/components/ai-assistant/assistant-widget-renderer.tsx src/components/ai-assistant/chat-area.tsx src/app/api/ai-assistant/chat/handler-v2.ts src/lib/ai/change-event-workflow.ts src/lib/ai/assistant-widgets.ts src/lib/ai/__tests__/assistant-widgets.test.ts src/lib/ai/__tests__/change-event-workflow.test.ts`
  passed with one pre-existing warning at
  `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx:884`.
- `cd frontend && npm run typecheck:changed` passed.
- `node .agents/skills/alleato-design-doctrine/scripts/audit-surface-complexity.mjs frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`
  passed.
- `npx markdownlint-cli2 --no-globs docs/ops/tasks/2026-07-06-change-event-workflow-card-simplification.md`
  passed.
- Browser automation attempted `http://localhost:3001/ai`, but the automation
  session redirected to `/auth/login?callbackUrl=%2Fai`; authenticated visual
  proof is blocked in that browser session.

## Failure Contract

- Cause: the previous card exposed internal workflow state, checklist rows,
  missing fields, warnings, and evidence as Tier 1 content.
- Detection gap: implementation checks validated data/state but did not include
  a cognitive-load gate for the live chat surface.
- Prevention: default the card to one next action, hide diagnostic detail until
  requested, and run the design-doctrine/noise-gate review for the changed UI.
