# Codex Task: Prime Contracts Tool Implementation

## Metadata
- Feature: prime-contracts
- Priority: HIGH
- Estimated Complexity: MEDIUM
- Dependencies: None
- Current Status: ~70% Complete (backend done, frontend needs components)

---

## Inputs

### Crawl Data
- Location: `documentation/*project-mgmt/active/prime-contracts/procore-prime-contracts-crawl/`
- Sitemap: `sitemap-table-prime-contracts.md`
- Key pages:
  - `pages/prime_contracts/` - List view
  - `pages/create/` - Create form
  - `pages/562949958876859/` - Detail view (with tabs)
  - `pages/edit/` - Edit form
  - `pages/configure_tab/` - Settings

### Support Documentation
- RAG query: `"prime contracts procore"`
- Existing docs: `EXECUTION-PLAN.md`, `SUMMARY.md`, `STATUS.md`

### Reference Screenshots
- List: `procore-prime-contracts-crawl/pages/prime_contracts/screenshot.png`
- Detail: `procore-prime-contracts-crawl/pages/562949958876859/screenshot.png`
- Create: `procore-prime-contracts-crawl/pages/create/screenshot.png`
- Edit: `procore-prime-contracts-crawl/pages/edit/screenshot.png`

---

## Success Criteria

- [ ] Contract list page with summary cards
- [ ] Contract detail with all tabs (General, Change Orders, Invoices, Payments, Emails, History)
- [ ] Contract creation/edit forms
- [ ] Change order approve/reject workflow
- [ ] Line items management (SOV)
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
1. Analyze crawl screenshots
2. Review existing STATUS.md (shows 70% complete)
3. Review existing implementation:
   - `frontend/src/app/[projectId]/contracts/` (may exist)
   - `frontend/src/app/(other)/api/projects/[projectId]/contracts/`
4. Identify remaining gaps from TASKS.md

### Phase 2: PLAN
1. Update `TASKS.md` with remaining deliverables
2. Focus on: Contract Actions Toolbar, Line Items Sub-page, Change Orders UI

### Phase 3: IMPLEMENT
High Priority remaining:
1. Contract Actions Toolbar - Export, bulk operations
2. Line Items Sub-page - Dedicated SOV management
3. Change Orders Sub-page - Create/edit COs UI

Medium Priority:
4. Advanced Filters - Status, date range, vendor
5. Billing/Payments UI

### Phase 4: TEST
```bash
cd frontend && npx playwright test tests/e2e/prime-contracts*.spec.ts --reporter=html
```

### Phase 5: VERIFY
```bash
npx tsx .agents/tools/enforce-gates.ts prime-contracts
```

### Phase 6: PR
Create PR with evidence from GATES.md

---

## Constraints (MANDATORY)

- Must read `.agents/patterns/` before starting any phase
- Must use auth fixture (`import { test } from '../fixtures'`) for all tests
- Must use `waitForLoadState('domcontentloaded')` NOT `networkidle`
- Must use `[projectId]` NOT `[id]` for project routes
- Must use `[contractId]` NOT `[id]` for contract routes
- Must regenerate Supabase types before database work
- Must NOT claim complete without GATES.md checksums

---

## Gates (Auto-enforced)

| Gate | Command | Must Pass |
|------|---------|-----------|
| Patterns | Read `.agents/patterns/index.json` | Applied |
| TypeScript | `npm run typecheck --prefix frontend` | 0 errors |
| ESLint | `npm run lint --prefix frontend` | 0 errors |
| Tests | `npx playwright test tests/e2e/prime-contracts*.spec.ts` | 100% |
| Gates | `npx tsx .agents/tools/enforce-gates.ts prime-contracts` | All PASSED |

---

## Deliverables

### Database (Complete per STATUS.md)
- [x] 7/7 tables created
- [x] RLS policies enforced
- [x] Types generated

### API Endpoints (Complete per STATUS.md)
- [x] 13/13 API routes implemented
- [x] Validation in place
- [x] Change order approve/reject workflow

### Frontend Pages (80% per STATUS.md)
- [x] List page: `/[projectId]/contracts`
- [x] Detail page: `/[projectId]/contracts/[contractId]`
- [x] Create page: `/[projectId]/contracts/new`
- [x] Edit page: `/[projectId]/contracts/[contractId]/edit`
- [ ] Line Items sub-page
- [ ] Change Orders sub-page

### Components (37% per STATUS.md)
- [x] Schedule of Values grid
- [x] Contract summary cards
- [x] Contract detail tabs
- [ ] Contract Actions Toolbar
- [ ] Advanced Filters
- [ ] Billing/Payments UI
- [ ] Line Items Manager
- [ ] Change Order Form

### Tests
- [ ] `frontend/tests/e2e/prime-contracts-api.spec.ts`
- [ ] `frontend/tests/e2e/prime-contracts-browser.spec.ts`
- [ ] `frontend/tests/e2e/prime-contracts-forms.spec.ts`

### Documentation
- [x] `TASKS.md` exists
- [x] `STATUS.md` exists
- [ ] `GATES.md` - Gate checksums

---

## Completion Evidence

When claiming completion, provide:

```markdown
## Completion Report
- Feature: prime-contracts
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
- [screenshot1.png] - Contracts list
- [screenshot2.png] - Contract detail
- [screenshot3.png] - Create form
...
```

---

## Procore Feature Reference

Based on STATUS.md and crawl data:

1. **Contracts List** - Summary cards with key metrics
2. **Contract Detail Tabs**:
   - General - Contract overview
   - Change Orders - CO management
   - Invoices - Billing records
   - Payments - Payment tracking
   - Emails - Communication log
   - History - Audit trail
3. **Schedule of Values** - Line item grid
4. **Change Order Workflow** - Create, approve, reject
5. **Export Options** - PDF, CSV

Key Fields:
- Contract #
- Title
- Vendor/GC
- Original Value
- Approved COs
- Revised Value
- Status
- Executed Date
- Substantial Completion
