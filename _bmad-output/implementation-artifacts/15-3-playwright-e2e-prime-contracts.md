# Story 15.3: Playwright E2E - Prime Contracts

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a QA lead,
I want to execute robust E2E checks for prime contract form, SOV, and post-create flows,
so that critical contract workflows avoid regressions.

## Acceptance Criteria

1. Playwright flow executes for the tool on project 67 and covers initial load, validation, create/update path, and post-submit verification.
2. Assertions include persistence checks (UI or API payload) and capture any blockers with root cause and recommended fix.
3. Artifacts are saved under `output/playwright/*-workflow/runs/{timestamp}` including screenshots and structured report JSON.
4. Route parameters and page conventions follow project gates ([projectId] naming, page header pattern, no deprecated layout components).
5. Changes pass `npm run quality` in `frontend/` and targeted Playwright suite for this tool.

## Tasks / Subtasks

- [ ] Gather parity context from crawl + existing tests (AC: 1,2,3)
  - [ ] Extract required fields, workflows, selectors, and artifacts from prompt/test-plan references
  - [ ] Confirm current app behavior and identify parity gaps
- [ ] Implement parity fixes for prime-contracts (AC: 1,2,4)
  - [ ] Update pages/components/services/api routes as required
  - [ ] Ensure status transitions, validation, totals, and table/detail behaviors match expected flow
- [ ] Implement/refresh Playwright coverage for prime-contracts (AC: 1,3,5)
  - [ ] Add or update tests in existing tool-specific E2E suite
  - [ ] Capture screenshots/report artifacts and verify pass/fail assertions
- [ ] Verify quality gates and document completion (AC: 5)
  - [ ] Run `npm run quality` (frontend)
  - [ ] Run targeted Playwright tests for this tool

## Dev Notes

- Follow AGENTS project gates: route naming gate, Next.js cache gate when debugging routes, and root-cause-first workflow.
- Avoid introducing new data shapes unless proven necessary by crawl evidence and existing schema usage.
- Reuse existing test helpers and selectors before creating new test IDs.

### Project Structure Notes

- Frontend routes: frontend/src/app/(main)/[projectId]/...
- API routes: frontend/src/app/api/...
- Tool components/hooks/services should remain in existing module locations.
- Playwright tests: frontend/tests/e2e/...

### References

- [Source: output/playwright/prompts/prime-contracts-playwright-skill-prompt-2026-02-21T12-18-55-555Z.md]
- [Source: output/playwright/dashboard/dashboard-data.json]
- [Source: output/playwright/prime-contracts-workflow/runs/2026-02-21T10-40-48Z/report.json]
- [Source: frontend/tests/e2e/contracts/]
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

### File List
