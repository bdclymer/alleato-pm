Use the playwright skill.

Goal:
Run a directory end-to-end regression focused on CRUD, validation, and financial integrity checks.

Environment:
- App URL: http://localhost:3000
- Project ID: 67
- Assume authenticated state is required; if login is needed, pause and ask for creds/OTP instead of failing.
- Do not run destructive actions on existing real records; create uniquely named test data and clean up only records created in this run.

Reference context to align behavior:
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/directory/specifications/forms-directory/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/directory/quick-start/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/directory/specifications/ui-directory/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/directory/tasks-directory-tool/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/directory/tasks-directory/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/directory/directory-implementation-status/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/directory/directory-status-update/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/directory/status/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/directory/plans-directory/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/directory/specifications/api-endpoints-directory/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/directory/directory-api.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/directory/directory-final.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/directory/directory-functionality.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/directory/directory-simple.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/directory/directory-workflow.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/directory/contacts.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/directory/directory-companies.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/directory/directory-comprehensive.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/directory/directory.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/tools-directory.png
- /Users/meganharrison/Documents/github/alleato-pm/scripts/screenshot-capture/outputs/analysis-json/goodwill_bart_-_directory.json
- /Users/meganharrison/Documents/github/alleato-pm/scripts/screenshot-capture/outputs/dom/goodwill_bart_-_directory.html
- /Users/meganharrison/Documents/github/alleato-pm/scripts/screenshot-capture/outputs/emails/procore-emails-crawl/pages/directory/dom.html
- /Users/meganharrison/Documents/github/alleato-pm/scripts/screenshot-capture/outputs/emails/procore-emails-crawl/pages/directory/metadata.json

Test flow:
- 1) Navigate to /{projectId}/directory (or /{projectId}/directory/new for create-first flows).
- 2) Verify default state and required controls render.
- 3) Trigger validation errors with empty/invalid submit and verify blocking behavior.
- 4) Create a new directory record with unique timestamped values.
- 5) Verify key derived values/totals in UI when applicable.
- 6) Submit and verify redirect to detail/list URL with created identifier.
- 7) Verify persisted data from UI or API response payload where possible.
- 8) Record any not-testable assertions with explicit reason and blocker.

Selector strategy:
- Prefer stable `data-testid` and role/label selectors from the existing tests above.
- Use fallback selectors only when primary selectors are absent.
- Capture any selector fallback in the final report.

Known selector hints from codebase:
- data-testid="email"
- data-testid="password"
- data-testid="login-button"
- data-testid="users-table"
- data-testid="status-badge"
- data-testid="search-input"
- data-testid="filters-button"
- data-testid="filters-panel"
- data-testid="company-filter"
- data-testid="apply-filters"
- data-testid="clear-filters"
- data-testid="user-name"
- data-testid="group-by-company"
- data-testid="company-group"
- data-testid="add-user-button"
- data-testid="user-form-dialog"

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
  - /Users/meganharrison/Documents/github/alleato-pm/output/playwright/directory-workflow/runs/{iso-timestamp}

Output format:
- Return:
  1) concise bullet summary
  2) pass/fail table for assertions
  3) list of artifact file paths
  4) explicit blockers + recommended next fix per blocker
