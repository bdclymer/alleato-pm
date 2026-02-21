Use the playwright skill.

Goal:
Run a direct-costs end-to-end regression focused on CRUD, validation, and financial integrity checks.

Environment:
- App URL: http://localhost:3000
- Project ID: 67
- Assume authenticated state is required; if login is needed, pause and ask for creds/OTP instead of failing.
- Do not run destructive actions on existing real records; create uniquely named test data and clean up only records created in this run.

Reference context to align behavior:
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/direct-costs/forms-reference/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/direct-costs/tasks/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/direct-costs/crawl-direct-costs/direct-costs-crawl-status/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/direct-costs/status/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/direct-costs/plans/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/direct-costs/reference/plans-direct-costs/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/direct-costs/crawl-direct-costs/sitemap-table-direct-costs/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/direct-costs/crawl-direct-costs/readme/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/direct-costs/direct-costs-rls-fix-verification/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/direct-costs/direct-costs/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/direct-costs/direct-costs-basic.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/direct-costs/direct-costs-comprehensive.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/direct-costs/direct-costs-functional-verification.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/direct-costs/direct-costs.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/financial/direct-costs.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/FireShot Capture 026 - Direct Costs • Goodwill Bart - [us02.procore.com].png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/direct-costs/Direct Costs - Form.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/direct-costs/financial-direct-cost.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/financial-direct-cost-expense.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/project-mgmt/verification-reports/direct-costs/index.html
- /Users/meganharrison/Documents/github/alleato-pm/docs/project-mgmt/verification-reports/direct-costs/screenshots/01-list-page-load.png

Test flow:
- 1) Navigate to /{projectId}/direct-costs (or /{projectId}/direct-costs/new for create-first flows).
- 2) Verify default state and required controls render.
- 3) Trigger validation errors with empty/invalid submit and verify blocking behavior.
- 4) Create a new direct costs record with unique timestamped values.
- 5) Verify key derived values/totals in UI when applicable.
- 6) Submit and verify redirect to detail/list URL with created identifier.
- 7) Verify persisted data from UI or API response payload where possible.
- 8) Record any not-testable assertions with explicit reason and blocker.

Selector strategy:
- Prefer stable `data-testid` and role/label selectors from the existing tests above.
- Use fallback selectors only when primary selectors are absent.
- Capture any selector fallback in the final report.

Known selector hints from codebase:
- data-testid="generic-data-table"
- data-testid="direct-cost-table"
- data-testid="direct-cost-form"
- data-testid="page-title"
- data-testid="direct-costs-create-button"
- data-testid="cost-type-select"
- data-testid="empty-state"

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
  - /Users/meganharrison/Documents/github/alleato-pm/output/playwright/direct-costs-workflow/runs/{iso-timestamp}

Output format:
- Return:
  1) concise bullet summary
  2) pass/fail table for assertions
  3) list of artifact file paths
  4) explicit blockers + recommended next fix per blocker
