# Task: Production Meeting Agenda Export Fix

Status: In Progress
Owner: Codex
Created: 2026-07-04
Linear Issue: AAI-921
Linear URL: https://linear.app/megankharrison/issue/AAI-921/fix-production-meeting-agenda-build-export-regression

## Objective

Restore the current `main` production deploy by fixing the missing `MeetingActionItemsSection` export used by the meeting agenda page.

## Root Cause

Vercel production deployment `dpl_EnVKUVpeG3xnTDQnXMN5icFoGHuk` built commit `3eeab0d` and failed because `frontend/src/app/(main)/[projectId]/meetings/[meetingId]/agenda/page.tsx` imports `MeetingActionItemsSection` from `frontend/src/components/domain/meetings/agenda-section.tsx`, but that module only exports `AgendaSection`.

## Acceptance Criteria

- [x] `MeetingActionItemsSection` exists at the imported module boundary.
- [x] The action-items section stays quiet and uses existing meeting detail data.
- [x] Focused tests cover the restored export behavior.
- [x] Focused lint/type/route guardrails pass.
- [ ] Commit is pushed to `origin/main`.
- [ ] Vercel production deploy for fixed `main` is Ready and assigned to `projects.alleatogroup.com`.
- [ ] Meeting prep source-first behavior remains live on production.

## Implementation Checklist

- [x] Use clean worktree from current `origin/main`.
- [x] No schema or migration changes.
- [x] No new page-level visual container or duplicate CTA.
- [ ] Failure and verification evidence posted to Linear.

## Evidence

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Vercel failure | `vercel inspect dpl_EnVKUVpeG3xnTDQnXMN5icFoGHuk --logs` | Fail reproduced | Missing `MeetingActionItemsSection` export from `agenda-section.tsx`. |
| Focused unit test | `npm run test:unit -- --runInBand --runTestsByPath 'src/components/domain/meetings/__tests__/agenda-section.test.tsx'` | Pass | 6 tests passed, including restored action-items export behavior. |
| Targeted ESLint | `./node_modules/.bin/eslint 'src/components/domain/meetings/agenda-section.tsx' 'src/components/domain/meetings/__tests__/agenda-section.test.tsx'` | Pass | No ESLint errors for changed files. |
| Changed type debt guard | `cd frontend && npm run typecheck:changed` | Pass | No new `any` type debt detected. |
| Changed ESLint debt guard | `cd frontend && npm run lint:changed:debt` | Pass | No new ESLint debt detected across changed frontend files. |
| Route conflict guard | `npm run check:routes` | Pass | No route conflicts found. |
| Changed API route guard | `GUARDRAIL_ENFORCE_RAW_ERRORS=true node scripts/check-changed-route-guardrails.mjs` | Pass | No changed API routes to validate. |
| Whitespace check | `git diff --check -- docs/ops/tasks/2026-07-04-production-meeting-agenda-export-fix.md frontend/src/components/domain/meetings/agenda-section.tsx frontend/src/components/domain/meetings/__tests__/agenda-section.test.tsx` | Pass | No whitespace errors. |
| Production build | `CI=true npm run build:production` | Pass | Build worker reported exit 0, compiled successfully, and restored non-production routes. |
