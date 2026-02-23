Use the playwright skill.

Goal:
Run a change-orders end-to-end regression focused on CRUD, validation, and financial integrity checks.

Environment:
- App URL: http://localhost:3000
- Project ID: 67
- Assume authenticated state is required; if login is needed, pause and ask for creds/OTP instead of failing.
- Do not run destructive actions on existing real records; create uniquely named test data and clean up only records created in this run.

Reference context to align behavior:
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-orders/forms-changeorders/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-orders/ui-changeorders/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-orders/tasks-changeorders/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-orders/crawl-change-orders/change-orders-crawl-status/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-orders/plans-changeorders/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-orders/api-endpoints-changeorders/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-orders/schema-changeorders/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-orders/crawl-change-orders/sitemap-table-change-orders/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-orders/.archive/specs-change-orders/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/PRPs/change-orders/change-orders/index.mdx
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/change-orders/change-orders.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-orders/change-order-contract-picker.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-orders/change-order-reviewer-picker.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-orders/change-order-reviewer-response.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-orders/change-order-scope-schedule.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-orders/change-order-ui.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/change-orders/change-orders-crud.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/frontend/tests/e2e/prime-contracts/api-change-orders.spec.ts
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/change-event/potential-change-order.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/change-orders/prime - change orders.png
- /Users/meganharrison/Documents/github/alleato-pm/docs/procore-screenshots/prime-contract/potential-change-order.png
- /Users/meganharrison/Documents/github/alleato-pm/scripts/screenshot-capture/outputs/procore-support-docs/pages/add-a-related-item-to-a-prime-contract-change-order/dom.html
- /Users/meganharrison/Documents/github/alleato-pm/scripts/screenshot-capture/outputs/procore-support-docs/pages/add-a-related-item-to-a-prime-contract-change-order/metadata.json
- /Users/meganharrison/Documents/github/alleato-pm/scripts/screenshot-capture/outputs/procore-support-docs/pages/add-a-related-item-to-a-prime-contract-change-order/screenshot.png

Test flow:
- 1) Navigate to /{projectId}/change-orders (or /{projectId}/change-orders/new for create-first flows).
- 2) Verify default state and required controls render.
- 3) Trigger validation errors with empty/invalid submit and verify blocking behavior.
- 4) Create a new change orders record with unique timestamped values.
- 5) Verify key derived values/totals in UI when applicable.
- 6) Submit and verify redirect to detail/list URL with created identifier.
- 7) Verify persisted data from UI or API response payload where possible.
- 8) Record any not-testable assertions with explicit reason and blocker.

Selector strategy:
- Prefer stable `data-testid` and role/label selectors from the existing tests above.
- Use fallback selectors only when primary selectors are absent.
- Capture any selector fallback in the final report.

Known selector hints from codebase:
- getByTestId("change-order-submit")
- getByTestId("change-order-number")
- getByTestId("change-order-title")
- getByTestId("change-order-description")
- getByTestId("change-order-status")
- getByTestId("created-change-order-id")
- getByTestId(`row-actions-${changeOrder.id}`)
- getByTestId(`row-action-delete-${changeOrder.id}`)
- getByTestId("confirm-delete-button")
- data-testid="change-order-contract"
- data-testid="change-order-number"
- data-testid="change-order-title"
- data-testid="change-order-submit"
- getByTestId("change-order-reviewer")
- getByTestId("change-order-contract")
- getByTestId("change-order-schedule-impact")

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
  - /Users/meganharrison/Documents/github/alleato-pm/output/playwright/change-orders-workflow/runs/{iso-timestamp}

Output format:
- Return:
  1) concise bullet summary
  2) pass/fail table for assertions
  3) list of artifact file paths
  4) explicit blockers + recommended next fix per blocker
