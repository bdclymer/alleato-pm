# Story 12.2: Feature Parity - Invoicing

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a accounting user,
I want to create and manage invoices with Procore-aligned statuses, line items, and totals,
so that billing is accurate and auditable.

## Acceptance Criteria

1. UI and API behavior for the tool matches Procore crawl/test-plan requirements for core workflow states and data fields.
2. Data model and validations align with documented required fields, status transitions, and totals/derived values where applicable.
3. Known Procore parity gaps are closed and verified against crawl evidence and existing E2E specs.
4. Route parameters and page conventions follow project gates ([projectId] naming, page header pattern, no deprecated layout components).
5. Changes pass `npm run quality` in `frontend/` and targeted Playwright suite for this tool.

## Tasks / Subtasks

- [ ] Gather parity context from crawl + existing tests (AC: 1,2,3)
  - [ ] Extract required fields, workflows, selectors, and artifacts from prompt/test-plan references
  - [ ] Confirm current app behavior and identify parity gaps
- [ ] Implement parity fixes for invoicing (AC: 1,2,4)
  - [ ] Update pages/components/services/api routes as required
  - [ ] Ensure status transitions, validation, totals, and table/detail behaviors match expected flow
- [ ] Implement/refresh Playwright coverage for invoicing (AC: 1,3,5)
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

- [Source: output/playwright/prompts/invoicing-playwright-skill-prompt-2026-02-21T12-18-55-213Z.md]
- [Source: output/playwright/invoices/test-plan.md]
- [Source: output/playwright/dashboard/dashboard-data.json]
- [Source: frontend/tests/e2e/financial/invoicing.spec.ts]
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

### File List
