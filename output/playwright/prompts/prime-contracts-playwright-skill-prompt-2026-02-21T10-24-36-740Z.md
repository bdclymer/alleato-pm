Use the playwright skill.

Goal:
Run a prime-contracts end-to-end regression focused on CRUD, validation, and financial integrity checks.

Environment:
- App URL: http://localhost:3000
- Project ID: 67
- Assume authenticated state is required; if login is needed, pause and ask for creds/OTP instead of failing.
- Do not run destructive actions on existing real records; create uniquely named test data and clean up only records created in this run.

Reference context to align behavior:
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/forms-primecontracts/index.md
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/ui-primecontracts/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/prime-contracts-page/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/_archive/tasks-prime-contracts/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/tasks-primecontracts/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/status/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/_archive/plans/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/plans-primecontracts/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/api-endpoints-primecontracts/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/schema-primecontracts/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/contracts/prime-contract-form.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/contracts/prime-contracts-form.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/contracts/prime-contracts-new.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/prime-contracts/api-change-orders.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/prime-contracts/api-crud.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/prime-contracts/api-line-items.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/prime-contracts/billing-payments-schema.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/prime-contracts/change-orders-schema.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/docs/need-to-review/sitemap-table-prime-contracts.md
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/Prime Contract • Goodwill Bart - [us02.procore.com].png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/prime-contract/form-contract.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/prime-contract/pc-financial-markup.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/prime-contract/pc-sov.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/prime-contract/potential-change-order.png

Test flow:
- 1) Navigate to /{projectId}/prime-contracts (or /{projectId}/prime-contracts/new for create-first flows).
- 2) Verify default state and required controls render.
- 3) Trigger validation errors with empty/invalid submit and verify blocking behavior.
- 4) Create a new prime contracts record with unique timestamped values.
- 5) Verify key derived values/totals in UI when applicable.
- 6) Submit and verify redirect to detail/list URL with created identifier.
- 7) Verify persisted data from UI or API response payload where possible.
- 8) Record any not-testable assertions with explicit reason and blocker.

Selector strategy:
- Prefer stable `data-testid` and role/label selectors from the existing tests above.
- Use fallback selectors only when primary selectors are absent.
- Capture any selector fallback in the final report.

Known selector hints from codebase:
- data-testid="prime-contract-form"
- data-testid="owner-client-select"
- data-testid="owner-client-option-0"
- data-testid="sov-table"
- data-testid="sov-add-line-empty"
- data-testid="sov-line-0"
- data-testid="sov-line-description"
- data-testid="sov-line-amount"
- getByTestId("executed-error")
- getByTestId("owner-client-select")
- getByTestId("sov-add-line-empty")
- getByTestId("sov-line-0")
- getByTestId("sov-line-description")
- getByTestId("sov-line-amount")
- getByTestId("sov-add-line-footer")
- getByTestId("sov-line-1")

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
  - /Users/meganharrison/Documents/github/alleato-pm/output/playwright/prime-contracts-workflow/runs/{iso-timestamp}

Output format:
- Return:
  1) concise bullet summary
  2) pass/fail table for assertions
  3) list of artifact file paths
  4) explicit blockers + recommended next fix per blocker
