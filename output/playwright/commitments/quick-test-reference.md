# Commitments E2E Tests - Quick Reference Guide

**Last Updated:** 2026-02-21

---

## Run All Commitments Tests

```bash
cd /Users/meganharrison/Documents/github/alleato-pm/frontend
npx playwright test tests/e2e/commitments/
```

**Time:** ~5 minutes | **Tests:** 150+

---

## Run Specific Workflows

### Create Workflows

```bash
# All create tests (subcontract + purchase order)
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Create"

# Subcontract create only
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Create Subcontract"

# Purchase order create only
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Create Purchase Order"

# Form validation
npx playwright test tests/e2e/commitments/commitment-validation.spec.ts
```

**Time:** ~2 minutes

---

### Edit Workflows

```bash
# All edit tests
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Edit"

# Detailed edit scenarios
npx playwright test tests/e2e/commitments/commitments-edit.spec.ts

# Edit from different entry points
npx playwright test tests/e2e/commitments/commitments-edit.spec.ts -g "navigate"
```

**Time:** ~1 minute

---

### Delete & Restore Workflows

```bash
# All delete tests
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Delete"

# Soft delete specific
npx playwright test tests/e2e/commitments/commitments-soft-delete.spec.ts

# Recycle bin
npx playwright test tests/e2e/commitments/commitments-recycle-bin.spec.ts
```

**Time:** ~1 minute

---

### SOV Line Items Workflows

```bash
# All SOV tests
npx playwright test tests/e2e/commitments/commitments-sov-line-items.spec.ts

# SOV CRUD only
npx playwright test tests/e2e/commitments/commitments-sov-line-items.spec.ts -g "Create|Update|Delete"

# SOV calculations only
npx playwright test tests/e2e/commitments/commitments-sov-line-items.spec.ts -g "calculate"

# SOV import
npx playwright test tests/e2e/commitments/commitment-sov-import.spec.ts
```

**Time:** ~2 minutes

---

### List & Filtering Workflows

```bash
# List page tests
npx playwright test tests/e2e/commitments/commitments-list-page.spec.ts

# Search and filter
npx playwright test tests/e2e/commitments/commitments-list-page.spec.ts -g "Search|Filter"

# Tab navigation
npx playwright test tests/e2e/commitments/commitments-comprehensive.spec.ts -g "Tab Navigation"
```

**Time:** ~1 minute

---

### Detail Page Workflows

```bash
# All detail page tests
npx playwright test tests/e2e/commitments/commitments-detail-tabs.spec.ts

# Tab navigation only
npx playwright test tests/e2e/commitments/commitments-detail-tabs.spec.ts -g "navigate"
```

**Time:** ~30 seconds

---

## Run by Test Suite

### Comprehensive UI Tests

```bash
npx playwright test tests/e2e/commitments/commitments-comprehensive.spec.ts
```

**Covers:**
- Page display
- Create dropdown
- Table display
- Filtering
- Form fields
- Responsive design
- API integration
- Empty states
- Loading states

**Time:** ~3 minutes | **Tests:** 40+

---

### CRUD Flows Tests

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts
```

**Covers:**
- Create subcontract
- Create purchase order
- Edit commitment
- Delete & restore

**Time:** ~2 minutes | **Tests:** 12

---

### Validation Tests

```bash
npx playwright test tests/e2e/commitments/commitment-validation.spec.ts
```

**Covers:**
- Required field validation
- Format validation
- Business rule validation

**Time:** ~1 minute | **Tests:** 10

---

### Form Tests

```bash
npx playwright test tests/e2e/commitments/commitment-forms.spec.ts
```

**Covers:**
- Field rendering
- Field behavior
- Dev AutoFill

**Time:** ~1 minute | **Tests:** 12

---

## Run with Different Options

### UI Mode (Best for Development)

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts --ui
```

**Features:**
- Interactive test runner
- Step-by-step execution
- Visual debugging
- Time travel debugging

---

### Debug Mode

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts --debug
```

**Features:**
- Pauses before each action
- Browser DevTools open
- Step through tests

---

### Headed Mode (See Browser)

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts --headed
```

**Features:**
- See browser window
- Watch test execution
- Good for demos

---

### Generate Report

```bash
npx playwright test tests/e2e/commitments/
npx playwright show-report
```

**Opens:** HTML report in browser with:
- Test results
- Screenshots on failure
- Videos on failure (if enabled)
- Trace viewer

---

## Run Specific Test

### By Test Name

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "should create a subcontract with required fields"
```

---

### By Line Number

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts:52
```

Runs the test at line 52 (approximately).

---

## Troubleshooting

### Authentication Issues

If tests fail with "not logged in":

```bash
cd frontend
npx playwright test tests/auth.setup.ts
```

Then re-run your tests.

---

### Stale Data Issues

Clean up test data:

```bash
# Option 1: Run cleanup script (if exists)
node scripts/cleanup-test-data.js

# Option 2: Manually delete from Supabase
# Go to Supabase dashboard → SQL Editor
# DELETE FROM subcontracts WHERE contract_number LIKE 'SC-E2E-%';
# DELETE FROM purchase_orders WHERE contract_number LIKE 'PO-E2E-%';
```

---

### Cache Issues

Clear Playwright cache:

```bash
rm -rf ~/.cache/ms-playwright
npx playwright install --with-deps
```

---

### Port Conflicts

Dev server must be running on port 3000:

```bash
# Terminal 1: Start dev server
cd frontend
npm run dev

# Terminal 2: Run tests
npx playwright test tests/e2e/commitments/
```

If port 3000 is in use:

```bash
lsof -ti:3000 | xargs kill -9
```

---

## Common Test Patterns

### Run Before/After Specific Date

```bash
# Tests created after 2026-02-20
git log --since="2026-02-20" --name-only --oneline | grep commitments

# Tests modified in last 7 days
find tests/e2e/commitments -name "*.spec.ts" -mtime -7
```

---

### Run Failed Tests Only

```bash
npx playwright test --last-failed
```

---

### Run Tests in Parallel

```bash
# Default (4 workers)
npx playwright test tests/e2e/commitments/

# Custom worker count
npx playwright test tests/e2e/commitments/ --workers=8

# Single worker (sequential)
npx playwright test tests/e2e/commitments/ --workers=1
```

---

### Run Tests with Retries

```bash
# Retry failed tests 2 times
npx playwright test tests/e2e/commitments/ --retries=2
```

---

## Test File Quick Reference

| File | Purpose | Test Count | Run Time |
|------|---------|------------|----------|
| `commitments-comprehensive.spec.ts` | Full UI coverage | 40+ | 3 min |
| `commitments-crud-flows.spec.ts` | CRUD workflows | 12 | 2 min |
| `commitments-sov-line-items.spec.ts` | SOV functionality | 15+ | 2 min |
| `commitments-list-page.spec.ts` | List & filtering | 15 | 1 min |
| `commitments-detail-tabs.spec.ts` | Detail page tabs | 8 | 30 sec |
| `commitment-validation.spec.ts` | Validations | 10 | 1 min |
| `commitment-forms.spec.ts` | Form fields | 12 | 1 min |
| `commitments-edit.spec.ts` | Edit workflows | 10 | 1 min |
| `commitments-soft-delete.spec.ts` | Soft delete | 5 | 30 sec |
| `commitments-recycle-bin.spec.ts` | Restore | 4 | 30 sec |
| `commitment-sov-import.spec.ts` | CSV import | 5 | 1 min |
| `commitments-configure.spec.ts` | Settings | 3 | 30 sec |
| `commitment-create.spec.ts` | Create detail | 8 | 1 min |
| `commitment-creation-flow.spec.ts` | Create validation | 6 | 1 min |
| `commitment-submit.spec.ts` | Submit logic | 2 | 20 sec |
| `commitment-full-submit.spec.ts` | End-to-end submit | 3 | 30 sec |
| `commitment-api.spec.ts` | API integration | 4 | 30 sec |
| `form-commitments-company-dropdown.spec.ts` | Company dropdown | 5 | 30 sec |
| `commitment-debug.spec.ts` | Debug scenarios | Ad-hoc | - |

---

## Environment Setup

### Prerequisites

```bash
# Node.js 18+
node --version

# Install dependencies
cd frontend
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

---

### Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

### Dev Server

Tests require dev server running:

```bash
cd frontend
npm run dev
```

Verify server is ready:
```bash
curl http://localhost:3000/67/commitments
```

---

## CI/CD Commands

### GitHub Actions

```bash
# In .github/workflows/playwright.yml
- name: Run Commitments E2E Tests
  run: npx playwright test tests/e2e/commitments/
```

---

### Docker

```bash
# Run tests in Docker container
docker run --rm -v $(pwd):/work -w /work mcr.microsoft.com/playwright:latest \
  npx playwright test tests/e2e/commitments/
```

---

## Useful Aliases

Add to `.bashrc` or `.zshrc`:

```bash
# Alias for commitment tests
alias pt-commitments='cd frontend && npx playwright test tests/e2e/commitments/'
alias pt-commitments-ui='cd frontend && npx playwright test tests/e2e/commitments/ --ui'
alias pt-commitments-headed='cd frontend && npx playwright test tests/e2e/commitments/ --headed'

# Alias for specific workflows
alias pt-create='npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Create"'
alias pt-edit='npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Edit"'
alias pt-delete='npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Delete"'
alias pt-sov='npx playwright test tests/e2e/commitments/commitments-sov-line-items.spec.ts'
```

---

## Performance Benchmarks

| Test Suite | Tests | Time (Headless) | Time (Headed) |
|------------|-------|----------------|---------------|
| All Commitments | 150+ | ~5 min | ~8 min |
| Comprehensive | 40+ | ~3 min | ~5 min |
| CRUD Flows | 12 | ~2 min | ~3 min |
| SOV Line Items | 15+ | ~2 min | ~3 min |
| Validations | 10 | ~1 min | ~1.5 min |

*Benchmarks on MacBook Pro M1, 16GB RAM*

---

## Tips & Best Practices

### 1. Use UI Mode for Development

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts --ui
```

Best for:
- Writing new tests
- Debugging failures
- Understanding test flow

---

### 2. Run Specific Test First

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "should create a subcontract"
```

Don't run the whole suite if you're working on one test.

---

### 3. Use --headed for Demos

```bash
npx playwright test tests/e2e/commitments/commitments-comprehensive.spec.ts --headed --workers=1
```

Shows off the feature to stakeholders.

---

### 4. Generate Report After Full Runs

```bash
npx playwright test tests/e2e/commitments/
npx playwright show-report
```

Share HTML report with team.

---

### 5. Use --retries for Flaky Tests

```bash
npx playwright test tests/e2e/commitments/ --retries=2
```

Auto-retry flaky tests before marking as failed.

---

## Quick Debug Checklist

Test failing? Check these:

- [ ] Dev server running on port 3000?
- [ ] Authentication state valid? (run `tests/auth.setup.ts`)
- [ ] Test data cleaned up? (no leftover E2E records)
- [ ] Supabase connection working?
- [ ] Correct project ID (67) in test?
- [ ] Browser up to date? (`npx playwright install`)
- [ ] Cache cleared? (`.next/` and Playwright cache)

---

**End of Quick Reference**

**For full test plan:** See `test-plan.md`
**For coverage matrix:** See `test-coverage-matrix.md`
**For workflows:** See `workflow-summary.md`
