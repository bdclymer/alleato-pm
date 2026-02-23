Use the playwright skill.

Goal:
Run a change-events end-to-end regression focused on regression of recent changes plus CRUD, validation, status transitions, soft-delete, and line-item totals.

Environment:
- App URL: http://localhost:3000
- Project ID: 67
- Assume authenticated state is required; if login is needed, pause and ask for creds/OTP instead of failing.
- Do not run destructive actions on existing real records; create uniquely named test data and clean up only records created in this run.

Reference context to align behavior:
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-events/forms-changeevents/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-events/ui-changeevents/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-events/tasks-change-events/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-events/TASKS.md
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-events/plans-changeevents/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-events/api-endpoints-changeevents/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-events/reference/procore-schema-capture/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-events/schema-changeevents/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-events/audit-log/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-events/PHASE-2-FRONTEND-FIX-SUMMARY.md
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/change-events/change-events.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-events/change-events-api.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-events/change-events-browser-verification.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-events/change-events-comprehensive.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-events/change-events-e2e.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-events/change-events-quick-verify.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-events/change-events-ui.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/change-event/Change Event 2.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/change-event/Change Events 3.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/change-event/Change Events • Goodwill Bart - [us02.procore.com].png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/change-event/Change Events.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/change-event/change events 4.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/change-event/change events 5.png

Test flow:
- 1) Navigate to /{projectId}/change-events (or /{projectId}/change-events/new for create-first flows).
- 2) Verify default state and required controls render.
- 3) Trigger validation errors with empty/invalid submit and verify blocking behavior.
- 4) Create a new change events record with unique timestamped values.
- 5) Verify key derived values/totals in UI when applicable.
- 6) Submit and verify redirect to detail/list URL with created identifier.
- 7) Verify persisted data from UI or API response payload where possible.
- 8) Record any not-testable assertions with explicit reason and blocker.

Selector strategy:
- Prefer stable `data-testid` and role/label selectors from the existing tests above.
- Use fallback selectors only when primary selectors are absent.
- Capture any selector fallback in the final report.

Known selector hints from codebase:
- getByTestId('change-event-number-input')
- getByTestId('change-event-title-input')
- getByTestId('change-event-status-select')
- getByTestId('change-event-submit-button')
- getByTestId('change-events-count-all')
- getByTestId('change-events-count-open')
- getByTestId('change-events-count-pending')
- getByTestId('change-events-count-approved')
- getByTestId('change-events-tab-detail')
- getByTestId('change-events-tab-summary')
- getByTestId('change-events-tab-rfqs')
- getByTestId('change-events-tab-recycle')
- getByTestId(`change-event-row-${id}`)
- getByTestId('change-events-tab-open')
- getByTestId('change-event-submit-approval')
- getByTestId('change-events-tab-pending')

Artifacts to produce:
- Save screenshots for:
  - initial state
  - validation errors (if applicable)
  - form/table filled state before submit
  - post-create detail/list state
  - any failure state
- Save one structured report JSON with:
  - step-by-step pass/fail
  - assertion results
  - URLs visited
  - selector fallbacks used
  - blockers and root causes
- Save outputs under:
  - /Users/meganharrison/Documents/github/alleato-pm/output/playwright/change-events-workflow/runs/{iso-timestamp}

Output format:
- Return:
  1) concise bullet summary
  2) pass/fail table for assertions
  3) list of artifact file paths
  4) explicit blockers + recommended next fix per blocker
