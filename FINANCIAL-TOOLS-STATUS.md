# Financial Tools — Master Status

> **Single source of truth.** Updated as work progresses.
> **Last updated:** 2026-03-04

---

## What We're Building

7 financial tools that match (and beat) Procore's functionality, using the Alleato design system. Every tool must have working CRUD, correct design system components, passing E2E tests, and a clean TypeScript build.

---

## Acumatica FinancialDashboards (External)

Status: Local setup complete.

- Source cloned at `frontend/FinancialDashboards/CustomizationProject`
- Import-ready package created at `frontend/FinancialDashboards/dist/FinancialDashboards2019R1.zip`
- Setup runbook added: `frontend/FinancialDashboards/ALLEATO-SETUP.md`
- Note: Publish in sandbox first due to potential dashboard/GI overwrite risk.

---

## Current Score per Tool

| Tool | Before | After | Key Fixes Applied |
|------|--------|-------|-------------------|
| Budget | 8/10 | **8/10** | No changes needed (BudgetPageHeader is intentional exception) |
| Prime Contracts | 6/10 | **7.5/10** | Fixed `invoiced_amount` field mismatch, StatusBadge migration |
| Commitments | 7/10 | **8/10** | StatusBadge migration, wired Restore button to existing API |
| Change Events | 7/10 | **7.5/10** | Replaced `window.confirm()` with ConfirmationDialog, StatusBadge |
| Change Orders | 7/10 | **7.5/10** | StatusBadge migration |
| Direct Costs | 6/10 | **7.5/10** | Fixed form hang (LineItemsManager was disabled during debug) |
| Invoicing | 5/10 | **7/10** | Fixed type mismatch, StatusBadge, added KpiRow metrics |

---

## Task List

### ✅ DONE: Phase 1 — Investigation
All 7 tools audited. Reports at `.claude/investigations/{tool}/investigation-report.md`

### ✅ DONE: Phase 2 — Implementation
All code fixes applied. Reports at `.claude/investigations/{tool}/implementation-report.md`

### 🔴 TODO: Phase 3 — Run E2E Tests
**What needs to happen:** Run the existing Playwright tests against the dev server and get a pass/fail count per tool.

Test files already exist at `frontend/tests/e2e/`:
- `budget/` — 30+ spec files
- `change-events/` — 5 spec files
- `change-orders/` — 5 spec files
- `commitments/` — 15 spec files
- `direct-costs/` — 4 spec files
- `invoices/` — 2 spec files
- `prime-contracts/` — 2 spec files
- `live-verify-all-tools.spec.ts` — page load check for all 7

**Command to run:**
```bash
cd frontend
npx playwright test tests/e2e/live-verify-all-tools.spec.ts --project=chromium --reporter=line
```

**Status:** NOT YET RUN THIS SESSION. Previous background agent task output not found.

### 🔴 TODO: Phase 4 — DoD Verification
Check all 7 tools against 10-point Definition of Done:
1. Page loads in < 3s, no console errors
2. All expected columns visible in list view
3. Create works end-to-end
4. Edit works and persists on reload
5. Delete removes record (with confirmation dialog)
6. Form validation blocks empty submit
7. Zero design system violations (`grep` for hardcoded colors)
8. TypeScript clean (`npx tsc --noEmit`)
9. E2E test files exist and at least page-load test passes
10. Mobile 375px renders without horizontal scroll

**Status:** NOT STARTED

### 🔴 TODO: Phase 5 — Final Report
Write `docs-ai/contents/docs/financial-tools/COMPLETION-REPORT.md` summarizing all work.

**Status:** NOT STARTED

---

## What's Blocking Progress

**Phase 3 is blocked** because:
- Background e2e-tester agent was spawned but output file not found (may have failed silently)
- Dev server status unknown — tests need `http://localhost:3000` running

**Immediate next step:** Check if dev server is running, then run `live-verify-all-tools.spec.ts` to get a baseline pass/fail for all 7 tools.

---

## Files Changed This Session

| File | Change |
|------|--------|
| `frontend/src/features/commitments/commitments-table-config.tsx` | StatusBadge migration, removed statusVariant() |
| `frontend/src/app/(main)/[projectId]/commitments/recycle-bin/page.tsx` | Wired Restore button to `POST /api/commitments/[id]/restore` |
| `frontend/src/features/invoicing/invoicing-table-config.tsx` | Fixed billing_period_id type, StatusBadge |
| `frontend/src/app/(main)/[projectId]/invoicing/page.tsx` | Added KpiRow metrics |
| `frontend/src/lib/validation/prime-contracts.ts` | Changed `invoiced` → `invoiced_amount` |
| `frontend/src/features/prime-contracts/prime-contracts-table-config.tsx` | StatusBadge, invoiced_amount fix |
| `frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx` | invoiced_amount in totals |
| `frontend/src/features/change-events/change-events-table-config.tsx` | StatusBadge |
| `frontend/src/app/(main)/[projectId]/change-events/page.tsx` | ConfirmationDialog replaces window.confirm |
| `frontend/src/features/change-orders/change-orders-table-config.tsx` | StatusBadge |
| `frontend/src/components/direct-costs/DirectCostForm.tsx` | Re-enabled LineItemsManager |
| `frontend/src/components/ds/status-badge.tsx` | Added "out for bid", "out for signature", "complete", "terminated", "executed" |
| `.claude/agents/bug-team/e2e-tester.md` | NEW — E2E test agent spec |
| `.claude/agents/bug-team/dod-verifier.md` | NEW — 10-point DoD agent spec |
| `.claude/agents/bug-team/financial-tools-lead.md` | Updated to v2 |
| `.claude/agents/bug-team/README.md` | Updated to v2 |

---

## Definition of Done (per tool)

A tool is COMPLETE when ALL of these pass:

- [ ] Page loads without console errors
- [ ] List shows data with correct columns
- [ ] Create: form opens, required fields validate, submit succeeds with toast
- [ ] Edit: changes persist on reload
- [ ] Delete: confirmation dialog appears, record removed with toast
- [ ] Form validation: empty submit shows field-level error messages
- [ ] Design system: zero `Badge` with manual variant mapping (use StatusBadge)
- [ ] TypeScript: zero errors in tool files
- [ ] E2E test file exists at `frontend/tests/e2e/{tool}/`
- [ ] Mobile 375px: no horizontal scroll

---

## How to Check Progress Yourself

```bash
# 1. Are code changes TypeScript-clean?
cd frontend && npx tsc --noEmit --skipLibCheck 2>&1 | grep -v "node_modules" | head -20

# 2. Does every tool page load?
cd frontend && npx playwright test tests/e2e/live-verify-all-tools.spec.ts --project=chromium

# 3. Design system violations?
grep -r "statusVariant\|typeVariant\|Badge variant=" frontend/src/features/ frontend/src/app/\(main\)/
# Should return nothing (or only Badge for non-status category labels)
```
