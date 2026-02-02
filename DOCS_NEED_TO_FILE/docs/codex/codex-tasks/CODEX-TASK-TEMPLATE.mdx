# Codex Task Template

This template defines the structure for autonomous Codex task execution. Each Procore tool implementation should have its own task file based on this template.

---

## Task File Structure

```markdown
# Codex Task: [Tool Name] Implementation

## Metadata
- Feature: [feature-name]
- Priority: HIGH | MEDIUM | LOW
- Estimated Complexity: SMALL | MEDIUM | LARGE
- Dependencies: [list any required features]

## Inputs
- Crawl Data: `documentation/*project-mgmt/[status]/[feature]/procore-[feature]-crawl/`
- Support Docs: RAG query `"[feature] procore"`
- Reference Screenshots: `procore-[feature]-crawl/pages/*/screenshot.png`

## Success Criteria
- [ ] All pages from crawl data have corresponding routes
- [ ] All forms match Procore field structure
- [ ] All API endpoints functional
- [ ] All tests pass (100%)
- [ ] Quality gate passes (0 errors)
- [ ] GATES.md shows all PASSED with checksums
- [ ] Visual comparison: 90%+ match to Procore screenshots

## Workflow
1. PATTERNS: Read `.agents/patterns/index.json` - apply relevant patterns
2. RESEARCH: Analyze crawl data, identify all pages/forms
3. PLAN: Create TASKS.md with all deliverables
4. IMPLEMENT: Build pages following existing patterns
5. TEST: Write and pass E2E tests
6. VERIFY: Run `npx tsx .agents/tools/enforce-gates.ts [feature]`
7. PR: Create PR with evidence

## Constraints (MANDATORY)
- Must read `.agents/patterns/` before starting any phase
- Must use auth fixture (`import { test } from '../fixtures'`) for all tests
- Must use `waitForLoadState('domcontentloaded')` NOT `networkidle`
- Must use `[projectId]` NOT `[id]` for project routes
- Must regenerate Supabase types before database work
- Must NOT claim complete without GATES.md checksums

## Gates (Auto-enforced)
| Gate | Command | Must Pass |
|------|---------|-----------|
| Patterns | Read `.agents/patterns/index.json` | Applied |
| TypeScript | `npm run typecheck --prefix frontend` | 0 errors |
| ESLint | `npm run lint --prefix frontend` | 0 errors |
| Tests | `npx playwright test tests/e2e/[feature]*.spec.ts` | 100% |
| Gates | `npx tsx .agents/tools/enforce-gates.ts [feature]` | All PASSED |

## Deliverables
### Database
- [ ] Tables verified in Supabase
- [ ] Types regenerated: `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts`
- [ ] RLS policies (if needed)

### API Endpoints
- [ ] GET `/api/projects/[projectId]/[feature]` - List
- [ ] GET `/api/projects/[projectId]/[feature]/[id]` - Detail
- [ ] POST `/api/projects/[projectId]/[feature]` - Create
- [ ] PUT `/api/projects/[projectId]/[feature]/[id]` - Update
- [ ] DELETE `/api/projects/[projectId]/[feature]/[id]` - Delete

### Frontend Pages
- [ ] List page: `/[projectId]/[feature]`
- [ ] Detail page: `/[projectId]/[feature]/[id]`
- [ ] Create page: `/[projectId]/[feature]/new`
- [ ] Edit page: `/[projectId]/[feature]/[id]/edit`

### Tests
- [ ] API tests: `frontend/tests/e2e/[feature]-api.spec.ts`
- [ ] Browser tests: `frontend/tests/e2e/[feature]-browser.spec.ts`
- [ ] Form tests: `frontend/tests/e2e/[feature]-forms.spec.ts`

### Documentation
- [ ] `TASKS.md` - Task checklist
- [ ] `PLANS.md` - Implementation plan
- [ ] `GATES.md` - Gate checksums
- [ ] `VERIFICATION-*.md` - Verification reports

## Completion Evidence
When claiming completion, provide:
```markdown
## Completion Report
- Feature: [feature-name]
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
- [screenshot1.png] - List page
- [screenshot2.png] - Detail page
...
```
```

---

## Creating a New Task File

1. Copy this template
2. Replace `[Tool Name]`, `[feature-name]`, `[feature]` with actual values
3. Fill in the crawl data location
4. Adjust deliverables based on crawl analysis
5. Save as `CODEX-TASK-[FEATURE].md`

---

## Task Priorities

| Priority | Features |
|----------|----------|
| HIGH | Budget, Prime Contracts, Commitments, Directory |
| MEDIUM | Change Events, Change Orders, Direct Costs, Invoices |
| LOW | Schedule, Submittals, RFIs, Punch List |

---

## Parallel Execution Rules

When running multiple Codex instances:

1. Each instance works on ONE feature at a time
2. Check for lock files before starting: `.claude/locks/[feature]/`
3. Create lock file when starting a task
4. Remove lock file when done or blocked
5. Do NOT work on features that have active lock files

---

## Blockers and Escalation

If genuinely blocked:

1. Document the blocker in `{feature_dir}/BLOCKERS.md`
2. Include:
   - What you tried
   - Why it failed
   - What you need to proceed
3. Create a GitHub issue if needed
4. Move to next available task

DO NOT claim "blocked" for:
- Test failures (fix them)
- TypeScript errors (fix them)
- Missing dependencies (install them)
- Unclear requirements (check crawl data and RAG)
