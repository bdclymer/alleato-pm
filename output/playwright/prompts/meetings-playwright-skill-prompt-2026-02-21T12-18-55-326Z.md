Use the playwright skill.

Goal:
Run a meetings end-to-end regression focused on CRUD, validation, and financial integrity checks.

Environment:
- App URL: http://localhost:3000
- Project ID: 67
- Assume authenticated state is required; if login is needed, pause and ask for creds/OTP instead of failing.
- Do not run destructive actions on existing real records; create uniquely named test data and clean up only records created in this run.

Reference context to align behavior:
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/meetings/forms-meetings/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/meetings/ui-meetings/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/meetings/tasks-meetings/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/meetings/TASKS.md
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/meetings/plans-meetings/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/meetings/api-endpoints-meetings/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/meetings/schema-meetings/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/meetings/sitemap-table/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/meetings/prp-meetings.md
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/meetings/meeting-transcript-format.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/meetings/meetings-crud.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/meetings/meetings2-page.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/project/project-meeting-detail.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/meetings/meeting-item.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/meetings/meetings-modal.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/meetings/mgmt-meetings.png
- /Users/meganharrison/Documents/github/alleato-pm/scripts/screenshot-capture/outputs/analysis-json/goodwill_bart_-_meetings.json
- /Users/meganharrison/Documents/github/alleato-pm/scripts/screenshot-capture/outputs/dom/goodwill_bart_-_meetings.html
- /Users/meganharrison/Documents/github/alleato-pm/scripts/screenshot-capture/outputs/emails/procore-emails-crawl/pages/ajax_overview_details_domain_name_meetings_filter_open_row_models_5b_5d_meetingtopic_row_title_meetings/dom.html

Test flow:
- 1) Navigate to /{projectId}/meetings (or /{projectId}/meetings/new for create-first flows).
- 2) Verify default state and required controls render.
- 3) Trigger validation errors with empty/invalid submit and verify blocking behavior.
- 4) Create a new meetings record with unique timestamped values.
- 5) Verify key derived values/totals in UI when applicable.
- 6) Submit and verify redirect to detail/list URL with created identifier.
- 7) Verify persisted data from UI or API response payload where possible.
- 8) Record any not-testable assertions with explicit reason and blocker.

Selector strategy:
- Prefer stable `data-testid` and role/label selectors from the existing tests above.
- Use fallback selectors only when primary selectors are absent.
- Capture any selector fallback in the final report.

Known selector hints from codebase:
- (none found)

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
  - /Users/meganharrison/Documents/github/alleato-pm/output/playwright/meetings-workflow/runs/{iso-timestamp}

Output format:
- Return:
  1) concise bullet summary
  2) pass/fail table for assertions
  3) list of artifact file paths
  4) explicit blockers + recommended next fix per blocker
