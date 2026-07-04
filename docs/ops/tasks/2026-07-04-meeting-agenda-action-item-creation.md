# Task: Meeting Agenda Action Item Creation

Status: In Progress
Owner: Codex
Created: 2026-07-04
Linear Issue: AAI-928
Linear URL: https://linear.app/megankharrison/issue/AAI-928/make-agenda-row-action-item-creation-first-class

## Objective

Make the agenda row action-item flow useful after the duplicate action-items cleanup by letting a meeting owner create a real linked task from an agenda item with title, owner, and due date.

## Product Contract

Action items should be real linked tasks, not duplicate agenda rows. Creating one from the agenda should keep the meeting source link through `meeting_item_id`, inherit agenda-row defaults when useful, and allow the user to intentionally leave owner or due date empty.

## Acceptance Criteria

- [x] Expanded agenda rows can create a linked task with title, owner, and due date.
- [x] Empty owner and due date can intentionally override inherited agenda item values.
- [x] The Action items section remains quiet until linked tasks exist.
- [x] Focused tests cover the create-task payload and nullable owner/due-date schema.
- [x] Focused lint/type/route guardrails pass.
- [ ] Commit is pushed to `origin/main`.
- [ ] Vercel production deploy is Ready and assigned to `projects.alleatogroup.com`.
- [ ] Live production browser/API verification proves a linked action item appears in the Action items section.

## Implementation Checklist

- [x] Use current `origin/main` as the base.
- [x] Preserve the existing meeting item task API and source-stub behavior.
- [x] Avoid database migrations.
- [x] Keep the agenda row dense; no card or secondary panel.
- [ ] Delete production verification meetings/tasks after testing.
- [ ] Post kickoff, evidence, and closeout to Linear.

## Evidence

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Kickoff | Linear `AAI-928` | Pass | Issue created under Meetings project. |
| Focused unit tests | `npm run test:unit -- --runInBand --runTestsByPath src/components/domain/meetings/__tests__/agenda-section.test.tsx 'src/app/api/projects/[projectId]/meetings/[meetingId]/items/[itemId]/tasks/__tests__/route.test.ts' src/lib/meetings/__tests__/schemas.test.ts` | Pass | 3 suites, 46 tests. |
| Whitespace check | `git diff --check` | Pass | No whitespace errors. |
| Changed-file typecheck | `npm run typecheck:changed` | Pass | Verification sub-agent: no new any type debt. |
| Changed-file lint debt | `npm run lint:changed:debt` | Pass | Verification sub-agent: no new ESLint debt across 6 changed frontend files. |
| Route guardrails | `GUARDRAIL_ENFORCE_RAW_ERRORS=true node scripts/check-changed-route-guardrails.mjs` | Pass | Verification sub-agent: 1 changed route, 0 raw error routes. |
| Route conflicts | `npm run check:routes` | Pass | Verification sub-agent: no route conflicts. |
