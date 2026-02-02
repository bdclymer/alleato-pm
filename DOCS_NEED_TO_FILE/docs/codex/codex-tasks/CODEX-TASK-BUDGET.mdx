# Codex Task: Budget Tool Implementation

## Metadata
- Feature: budget
- Priority: HIGH
- Estimated Complexity: LARGE
- Dependencies: None (standalone tool)
- Current Status: ~60% Complete (pages exist, needs tabs, history, forecasting)

---

## Inputs

### Crawl Data
- Location: `documentation/*project-mgmt/active/budget/procore-budget-crawl/`
- Sitemap: `reports/sitemap-table2.md` (40 pages cataloged)
- Key pages:
  - `pages/budgets/` - Main budget list
  - `pages/budget-main-view/` - Budget main view with tabs
  - `pages/budget-details-tab/` - Details tab
  - `pages/budget-forecast-tab/` - Forecast tab
  - `pages/budget-history-tab/` - History/audit tab
  - `pages/budget-snapshots-tab/` - Snapshots tab
  - `pages/budget-export-dropdown/` - Export options
  - `pages/budget-import-dropdown/` - Import options

### Support Documentation
- RAG query: `"budget procore"`
- Additional docs in `docs/` folder

### Reference Screenshots
- Main: `procore-budget-crawl/pages/budgets/screenshot.png`
- Detail tabs: `procore-budget-crawl/pages/budget-*-tab/screenshot.png`

---

## Success Criteria

- [ ] All budget tabs functional (Details, Forecast, History, Snapshots)
- [ ] Budget line items CRUD with cost codes
- [ ] Import/Export functionality
- [ ] Financial views/column configuration
- [ ] Budget locking mechanism
- [ ] All API endpoints tested (100% pass rate)
- [ ] `npm run quality --prefix frontend` passes (0 errors)
- [ ] GATES.md shows all PASSED with checksums
- [ ] Visual comparison: 90%+ match to Procore screenshots

---

## Workflow

### Phase 0: PATTERNS (Mandatory)
```bash
# Read pattern library first
cat .agents/patterns/index.json
cat .agents/patterns/errors/route-param-mismatch.md
cat .agents/patterns/errors/premature-completion.md
```

### Phase 1: RESEARCH
1. Analyze crawl screenshots in `procore-budget-crawl/pages/`
2. Review existing implementation:
   - `frontend/src/app/[projectId]/budget/page.tsx`
   - `frontend/src/app/[projectId]/budget/setup/`
   - `frontend/src/app/(other)/api/projects/[projectId]/budget/`
3. Identify gaps between current and Procore reference

### Phase 2: PLAN
1. Create `TASKS.md` with specific deliverables
2. Document missing features vs existing

### Phase 3: IMPLEMENT
Follow existing patterns in:
- Table config: `frontend/src/config/tables/`
- Components: `frontend/src/components/domain/`
- API routes: `frontend/src/app/(other)/api/`

### Phase 4: TEST
```bash
# Write and run tests
cd frontend && npx playwright test tests/e2e/budget*.spec.ts --reporter=html
```

### Phase 5: VERIFY
```bash
# Run gate enforcement
npx tsx .agents/tools/enforce-gates.ts budget
```

### Phase 6: PR
Create PR with evidence from GATES.md

---

## Constraints (MANDATORY)

- Must read `.agents/patterns/` before starting any phase
- Must use auth fixture (`import { test } from '../fixtures'`) for all tests
- Must use `waitForLoadState('domcontentloaded')` NOT `networkidle`
- Must use `[projectId]` NOT `[id]` for project routes
- Must regenerate Supabase types before database work:
  ```bash
  npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
  ```
- Must NOT claim complete without GATES.md checksums

---

## Gates (Auto-enforced)

| Gate | Command | Must Pass |
|------|---------|-----------|
| Patterns | Read `.agents/patterns/index.json` | Applied |
| TypeScript | `npm run typecheck --prefix frontend` | 0 errors |
| ESLint | `npm run lint --prefix frontend` | 0 errors |
| Tests | `npx playwright test tests/e2e/budget*.spec.ts` | 100% |
| Gates | `npx tsx .agents/tools/enforce-gates.ts budget` | All PASSED |

---

## Deliverables

### Database
- [x] Tables exist (budget_line_items, budget_views, budget_snapshots, etc.)
- [ ] Verify RLS policies
- [ ] Regenerate types if schema changes

### API Endpoints (Existing)
- [x] GET `/api/projects/[projectId]/budget` - Main budget
- [x] GET `/api/projects/[projectId]/budget/details` - Details
- [x] GET `/api/projects/[projectId]/budget/forecast` - Forecast
- [x] GET `/api/projects/[projectId]/budget/history` - History
- [x] POST `/api/projects/[projectId]/budget/import` - Import
- [x] POST `/api/projects/[projectId]/budget/lock` - Lock budget
- [x] CRUD `/api/projects/[projectId]/budget/views` - View management

### Frontend Pages
- [x] Main page: `/[projectId]/budget` (exists, needs tabs)
- [x] Setup page: `/[projectId]/budget/setup`
- [x] New line item: `/[projectId]/budget/line-item/new`
- [ ] Details tab component
- [ ] Forecast tab component
- [ ] History tab component
- [ ] Snapshots tab component
- [ ] Financial views selector

### Tests
- [ ] `frontend/tests/e2e/budget-api.spec.ts` - API tests
- [ ] `frontend/tests/e2e/budget-browser.spec.ts` - Browser tests
- [ ] `frontend/tests/e2e/budget-tabs.spec.ts` - Tab navigation tests

### Documentation
- [ ] `TASKS.md` - Task checklist
- [ ] `GATES.md` - Gate checksums

---

## Completion Evidence

When claiming completion, provide:

```markdown
## Completion Report
- Feature: budget
- Date: [timestamp]
- PR: [link]

### Gates
| Gate | Status | Checksum | Timestamp |
|------|--------|----------|-----------|
| TypeScript | PASSED | [xxxx] | [timestamp] |
| ESLint | PASSED | [xxxx] | [timestamp] |
| Tests | PASSED | [xxxx] | [timestamp] |

### Tests
- Total: X
- Passed: X (100%)
- Report: `frontend/playwright-report/index.html`

### Files Changed
1. [file path] - [description]
...

### Screenshots
- [screenshot1.png] - Budget main view
- [screenshot2.png] - Details tab
- [screenshot3.png] - Forecast tab
...
```

---

## Procore Feature Reference

Based on crawl data, budget includes:

1. **Main View** - Summary table with cost codes
2. **Details Tab** - Line item breakdown
3. **Forecast Tab** - Projections and EAC
4. **History Tab** - Audit trail of changes
5. **Snapshots Tab** - Point-in-time captures
6. **Views** - Custom column configurations
7. **Import/Export** - CSV/Excel support
8. **Budget Locking** - Prevent modifications

Key Procore Fields:
- Cost Code
- Description
- Original Budget
- Budget Modifications
- Revised Budget
- Approved COs
- Pending COs
- Committed Costs
- Direct Costs
- Projected Cost
- Over/Under
