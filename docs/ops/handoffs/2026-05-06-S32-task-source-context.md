# Handoff: 2026-05-06 - Task Source Context

## Intake Block

1) Session ID: S32
2) Task ID: AAI-333
3) Linear issue: AAI-333
4) Linear URL: https://linear.app/megankharrison/issue/AAI-333/improve-extracted-task-detail-with-source-context-due-dates-and
5) Current status: Pending Review
6) Files changed (absolute paths):
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/types/database.types.ts
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/app/api/tasks/route.ts
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/app/api/tasks/[taskId]/route.ts
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/features/tasks/task-utils.ts
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/app/(tables)/tasks/page.tsx
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/components/ai/TaskFeedbackButtons.tsx
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/hooks/use-task-feedback.ts
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/services/task-training-service.ts
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/task-feedback-types.ts
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/orchestration/session-board.md
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-05-06-S32-task-source-context.md
7) Commands run and outcome (pass/fail counts):
   - PASS: `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts`
   - PASS: `npx eslint 'src/app/(tables)/tasks/page.tsx' 'src/app/api/tasks/route.ts' 'src/app/api/tasks/[taskId]/route.ts' 'src/features/tasks/task-utils.ts' 'src/app/(main)/[projectId]/tasks/page.tsx' 'src/components/ai/TaskFeedbackButtons.tsx' 'src/hooks/use-task-feedback.ts' 'src/lib/ai/services/task-training-service.ts' 'src/lib/ai/task-feedback-types.ts'`
   - PASS: `npm run check:routes`
   - PASS: `git diff --check -- <task-owned files>`
   - PASS: `npm run linear:codex:check -- docs/ops/handoffs/2026-05-06-S32-task-source-context.md`
   - FAIL (unrelated repo debt): `npx tsc --noEmit --pretty false` reports existing errors outside task-owned files, including nullable `params`/`searchParams` route debt and unrelated admin/AI-chat typing issues.
   - PASS: agent-browser opened `http://localhost:3000/tasks`, loaded all-task list, selected a task, and verified source context, source link, due-date control, and project select render.
8) Evidence artifacts (screenshot/video/report/log paths): tests/agent-browser-runs/2026-05-06-S32-task-source-context/tasks-source-context.png
9) Top 3 findings (frontend-visible issues first):
   - Task detail page showed source title/link metadata but not the actual email/Teams/source excerpt.
   - Task detail page only edited status even though due date/project fields already exist in the task table.
   - API response contract omitted source-context fields, so frontend could not render context reliably.
10) Recommended next action (one line): Review and accept, then add deterministic E2E once the task data seed is stabilized.
11) Handoff file path: docs/ops/handoffs/2026-05-06-S32-task-source-context.md
12) Migration ledger evidence: No migration created; existing columns confirmed by regenerated Supabase types.

## Linear Updates

- Kickoff comment: Posted to AAI-333 on 2026-05-07 with scope, owned paths, and initial typegen evidence.
- Milestone comments: Pending.
- Completion/blocker comment: Posted to AAI-333 on 2026-05-07 with implementation summary, command evidence, screenshot path, and unrelated TypeScript debt note.

## Current Status

Done:
- Task API includes bounded source context from `document_metadata` communication fields.
- Task detail displays the source excerpt inline with the source link.
- Task detail supports editing due date and linking/unlinking a project through the existing task PATCH route.
- Project task server loader selects the same context fields for project-scoped task tables.
- Client/server feedback types were split so task feedback no longer imports server-only `node:crypto` into the browser bundle.

Remaining:
- Full repo TypeScript still fails on unrelated existing debt.

## Exact Next Step

Leader review of AAI-333 evidence and acceptance/rework disposition.

## Known Pitfalls

- `tasks.project_id` is numeric and must stay aligned with `projects.id`.
- `document_metadata.content` can be long; UI/API should return a bounded excerpt.
- Source URL may be external while meeting routes are app-internal.
- The all-task scope can be slow locally because it loads hundreds of communication-backed tasks.

## Resume Commands

```bash
npx eslint 'src/app/(tables)/tasks/page.tsx' 'src/app/api/tasks/route.ts' 'src/app/api/tasks/[taskId]/route.ts' 'src/features/tasks/task-utils.ts' 'src/app/(main)/[projectId]/tasks/page.tsx' 'src/components/ai/TaskFeedbackButtons.tsx' 'src/hooks/use-task-feedback.ts' 'src/lib/ai/services/task-training-service.ts' 'src/lib/ai/task-feedback-types.ts'
npm run check:routes
npm run linear:codex:check -- docs/ops/handoffs/2026-05-06-S32-task-source-context.md
```

## Evidence

- Supabase type generation completed before DB-backed edits.
- Browser evidence: `tests/agent-browser-runs/2026-05-06-S32-task-source-context/tasks-source-context.png`.
- Detail panel verified with source text containing `Context`, Outlook source link href, due date input, and project select.
