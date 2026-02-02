# Codex Task: Commitments Tool Implementation

## Metadata
- Feature: commitments
- Priority: HIGH
- Estimated Complexity: LARGE
- Dependencies: None
- Current Status: ~22% Complete (basic pages exist, needs detail tabs, SOV, change orders)

---

## Inputs

### Crawl Data
- Location: `documentation/*project-mgmt/active/commitments/procore-crawl-output/`
- Key pages:
  - `pages/commitment detail subcontractor/` - Subcontract detail
  - `pages/action button/` - Actions dropdown
  - `pages/commitment-detail-export/` - Export options
  - `pages/562949957166626_pdf/` - PDF export
  - `pages/562949957166673/` through various IDs - Different commitment types

### Support Documentation
- RAG query: `"commitments subcontracts purchase orders procore"`
- Context file: `CONTEXT.md`
- Verification: `VERIFICATION-detail-tabs.md`

### Reference Screenshots
- Multiple commitment detail views in `procore-crawl-output/pages/`
- Forms in `forms/` subdirectory

---

## Success Criteria

- [ ] Commitments list with subcontracts and POs combined
- [ ] Detail view with all tabs (General, SOV, Change Orders, Invoices, Attachments)
- [ ] Schedule of Values (SOV) management
- [ ] Commitment change orders
- [ ] Create/Edit forms for both types
- [ ] All API endpoints tested (100% pass rate)
- [ ] `npm run quality --prefix frontend` passes (0 errors)
- [ ] GATES.md shows all PASSED with checksums
- [ ] Visual comparison: 90%+ match to Procore screenshots

---

## Workflow

### Phase 0: PATTERNS (Mandatory)
```bash
cat .agents/patterns/index.json
cat .agents/patterns/errors/route-param-mismatch.md
cat .agents/patterns/errors/premature-completion.md
```

### Phase 1: RESEARCH
1. Analyze crawl screenshots in `procore-crawl-output/pages/`
2. Review CONTEXT.md for database schema
3. Review existing implementation:
   - `frontend/src/app/[projectId]/commitments/page.tsx`
   - `frontend/src/app/[projectId]/commitments/new/page.tsx`
   - `frontend/src/app/[projectId]/commitments/[commitmentId]/page.tsx`
   - `frontend/src/components/domain/contracts/`
4. Identify gaps (estimated 78% remaining)

### Phase 2: PLAN
1. Create/update `TASKS.md` with detailed deliverables
2. Prioritize: Detail tabs, SOV management, Change orders

### Phase 3: IMPLEMENT
Priority order:
1. **Detail Tab Components** - General, SOV, COs, Invoices, Attachments
2. **SOV Management** - Line items with cost codes, progress tracking
3. **Change Order UI** - Create/edit/approve workflow
4. **Unified List View** - Combined subcontracts + POs

### Phase 4: TEST
```bash
cd frontend && npx playwright test tests/e2e/commitment*.spec.ts --reporter=html
```

### Phase 5: VERIFY
```bash
npx tsx .agents/tools/enforce-gates.ts commitments
```

### Phase 6: PR
Create PR with evidence from GATES.md

---

## Constraints (MANDATORY)

- Must read `.agents/patterns/` before starting any phase
- Must use auth fixture (`import { test } from '../fixtures'`) for all tests
- Must use `waitForLoadState('domcontentloaded')` NOT `networkidle`
- Must use `[projectId]` NOT `[id]` for project routes
- Must use `[commitmentId]` NOT `[id]` for commitment routes
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
| Tests | `npx playwright test tests/e2e/commitment*.spec.ts` | 100% |
| Gates | `npx tsx .agents/tools/enforce-gates.ts commitments` | All PASSED |

---

## Deliverables

### Database (from CONTEXT.md)
- [x] `subcontracts` - Subcontract records
- [x] `purchase_orders` - Purchase order records
- [x] `commitments_unified` - Unified view
- [x] `subcontract_sov_items` - Subcontract SOV
- [x] `purchase_order_sov_items` - PO SOV
- [ ] Verify RLS policies
- [ ] Regenerate types if needed

### API Endpoints
- [x] GET `/api/projects/[projectId]/commitments` - List (exists)
- [ ] GET `/api/projects/[projectId]/commitments/[commitmentId]` - Detail
- [ ] POST `/api/projects/[projectId]/commitments` - Create
- [ ] PUT `/api/projects/[projectId]/commitments/[commitmentId]` - Update
- [ ] DELETE `/api/projects/[projectId]/commitments/[commitmentId]` - Delete
- [ ] CRUD `/api/projects/[projectId]/commitments/[commitmentId]/sov` - SOV items
- [ ] CRUD `/api/projects/[projectId]/commitments/[commitmentId]/change-orders` - COs
- [ ] CRUD `/api/projects/[projectId]/commitments/[commitmentId]/invoices` - Invoices
- [ ] CRUD `/api/projects/[projectId]/commitments/[commitmentId]/attachments` - Attachments

### Frontend Pages (from CONTEXT.md)
- [x] List page: `/[projectId]/commitments`
- [x] Create page: `/[projectId]/commitments/new`
- [x] Detail page: `/[projectId]/commitments/[commitmentId]`
- [ ] Detail tabs implemented (SOV, COs, Invoices, Attachments)
- [ ] Edit page: `/[projectId]/commitments/[commitmentId]/edit`

### Components
- [x] `CreateSubcontractForm.tsx`
- [x] `CreatePurchaseOrderForm.tsx`
- [ ] SOV Grid Component
- [ ] Change Order Form
- [ ] Invoice List
- [ ] Attachment Manager
- [ ] Commitment Summary Cards

### Tests
- [ ] `frontend/tests/e2e/commitment-api.spec.ts`
- [ ] `frontend/tests/e2e/commitment-browser.spec.ts`
- [ ] `frontend/tests/e2e/commitment-sov.spec.ts`
- [ ] `frontend/tests/e2e/commitment-change-orders.spec.ts`

### Documentation
- [x] `CONTEXT.md` exists
- [x] `VERIFICATION-detail-tabs.md` exists
- [ ] `TASKS.md` - Task checklist
- [ ] `GATES.md` - Gate checksums

---

## Completion Evidence

When claiming completion, provide:

```markdown
## Completion Report
- Feature: commitments
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
- [screenshot1.png] - Commitments list
- [screenshot2.png] - Detail with tabs
- [screenshot3.png] - SOV management
- [screenshot4.png] - Change order form
...
```

---

## Procore Feature Reference

Based on CONTEXT.md and crawl data:

1. **List View**
   - Combined subcontracts and POs
   - Filtering by type, status, vendor
   - Summary totals

2. **Detail View Tabs**
   - **General** - Contract info, dates, status
   - **Schedule of Values (SOV)** - Line items with cost codes, progress
   - **Change Orders** - Commitment-level COs
   - **Invoices** - Billing records
   - **Attachments** - Documents, PDFs

3. **SOV Management**
   - Line items with cost codes
   - Original amount, changes, current amount
   - Progress tracking (% complete)
   - Invoice linking

4. **Change Orders**
   - Create commitment COs
   - Approval workflow
   - Link to budget change events

Key Fields:
- Commitment # (SC-001, PO-001)
- Title
- Vendor/Subcontractor
- Contract Value
- Approved COs
- Revised Value
- Status (Draft, Pending, Approved, etc.)
- Executed Date
