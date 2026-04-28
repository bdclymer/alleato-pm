# Create Project + Budget Preview Verification

- Status: pass with one defect found and fixed during the run
- Project: `984`
- URL: `http://localhost:3000/984/budget`
- Browser mode: headed `agent-browser`
- Video: `session.webm`

## Flow Covered

1. Created project `Test Codex Budget Preview 2026-04-26`.
2. Used the project-created next-step modal to open the Budget tool.
3. Opened the Cost Codes tab, switched to All, selected Concrete, Finishes, and Electrical divisions, and saved.
4. Opened Create > Import, downloaded `budget-template-project-984.xlsx`, populated the downloaded workbook with three line items, uploaded it, and imported it.
5. Verified imported totals: Concrete `$85,000`, Finishes `$65,000`, Electrical `$120,000`, Grand Total `$270,000`.
6. Opened Create > Budget Line Item and added another `03-3000.M` line item for `2 x $5,000`.
7. Verified final totals after the route fix: Concrete `$95,000`, Grand Total `$280,000`.

## Defect Found And Fixed

Manual add-line-item initially failed when adding to an existing cost code/type with:

`insert or update on table "budget_line_history" violates foreign key constraint "budget_line_history_budget_line_id_fkey"`

Cause: the live database trigger wrote budget-line history during a speculative insert branch before the conflict resolved to an update, creating history against a transient line ID. This is exactly the kind of failure that can appear as a raw FK error even when the frontend form flow is otherwise correct.

Fix applied: `supabase/migrations/20260426000001_fix_budget_line_history_trigger_timing.sql` moves durable create/update history writes to `AFTER INSERT OR UPDATE` trigger timing and keeps delete history on a separate `BEFORE DELETE` trigger.

Follow-up guardrails added:

- `frontend/tests/e2e/budget/budget.smoke.spec.ts` now has a regression that repeats an add against an existing budget line and asserts the API succeeds without surfacing the `budget_line_history` FK error.
- `frontend/tests/e2e/budget/budget.smoke.spec.ts` is part of the normal budget smoke and now runs against the live preview route with browser auth.

Validation:

- Headed agent-browser flow passed with screenshots and video.
- Targeted Playwright regression passed after applying the live DB trigger fix: `tests/e2e/budget/budget.smoke.spec.ts --grep "adds to an existing budget line"`.
- Full Playwright budget smoke passed through the normal config against watchable preview: `BASE_URL=http://localhost:3000 PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/budget/budget.smoke.spec.ts --config=config/playwright/playwright.config.ts --project=chromium --workers=1` (`5 passed`, including auth setup).
- `npm run check:routes` passed.
- Full frontend typecheck passed: `pnpm --dir frontend exec tsc --noEmit --pretty false --incremental false`.
- Targeted ESLint passed with warnings only in pre-existing design-system debt outside the budget path.
- Live DB verification confirmed `budget_line_changes_after_write` is an `AFTER INSERT OR UPDATE` trigger and `budget_line_delete_before` is a `BEFORE DELETE` trigger.

## Key Artifacts

- `screenshots/04-project-created-modal.png`
- `screenshots/09-cost-codes-saved.png`
- `screenshots/14-imported-budget-lines-visible.png`
- `screenshots/20-after-manual-line-item-create.png`
- `screenshots/30-after-manual-line-item-fixed.png`
- `downloads/budget-template-project-984.xlsx`
- `downloads/budget-template-project-984-completed.xlsx`
- `body-after-manual-line-item-fixed.txt`
