# Codex Task: Directory Tool Implementation

## Metadata
- Feature: directory
- Priority: HIGH
- Estimated Complexity: MEDIUM
- Dependencies: None
- Current Status: ~60% Complete (pages exist, needs polish and testing)

---

## Inputs

### Crawl Data
- Location: `documentation/*project-mgmt/active/directory/crawl-directory/`
- Test data: `procore-directory-crawl-test/`
- Key pages:
  - `pages/users-by-company/` - Users grouped by company
  - `pages/company-directory/` - Companies list

### Support Documentation
- RAG query: `"directory users companies contacts procore"`
- Context file: `CONTEXT.md`
- Implementation plan: `PROCORE_DIRECTORY_IMPLEMENTATION_PLAN.md`
- Execution plan: `EXECUTION-PLAN-DIRECTORY.md`

### Reference Screenshots
- In `procore-directory-crawl-test/pages/`

---

## Success Criteria

- [ ] Users tab with roles and permissions
- [ ] Companies tab with vendor information
- [ ] Contacts tab with company association
- [ ] Groups tab for distribution lists
- [ ] Add/Invite user flow
- [ ] Permission management
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
cat .agents/patterns/errors/fk-constraint-user.md
```

### Phase 1: RESEARCH
1. Analyze crawl screenshots
2. Review CONTEXT.md for database schema
3. Review existing implementation (per CONTEXT.md):
   - `frontend/src/app/[projectId]/directory/users/page.tsx`
   - `frontend/src/app/[projectId]/directory/companies/page.tsx`
   - `frontend/src/app/[projectId]/directory/contacts/page.tsx`
   - `frontend/src/app/[projectId]/directory/groups/page.tsx`
   - `frontend/src/app/[projectId]/directory/employees/page.tsx`
   - `frontend/src/app/[projectId]/directory/settings/page.tsx`
4. Review services:
   - `frontend/src/services/directoryService.ts`
   - `frontend/src/services/companyService.ts`
   - `frontend/src/services/inviteService.ts`
   - `frontend/src/services/permissionService.ts`

### Phase 2: PLAN
1. Review `TASKS-DIRECTORY-TOOL.md`
2. Identify remaining work (estimated 40%)

### Phase 3: IMPLEMENT
Focus areas:
1. **Permission Management UI** - Role assignment, granular permissions
2. **User Invite Flow** - Email invitations, bulk add
3. **Distribution Groups** - Member management
4. **Company/Contact CRUD** - Full forms

### Phase 4: TEST
```bash
cd frontend && npx playwright test tests/e2e/directory*.spec.ts --reporter=html
```

### Phase 5: VERIFY
```bash
npx tsx .agents/tools/enforce-gates.ts directory
```

### Phase 6: PR
Create PR with evidence from GATES.md

---

## Constraints (MANDATORY)

- Must read `.agents/patterns/` before starting any phase
- Must use auth fixture (`import { test } from '../fixtures'`) for all tests
- Must use `waitForLoadState('domcontentloaded')` NOT `networkidle`
- Must use `[projectId]` NOT `[id]` for project routes
- **IMPORTANT:** User profiles require FK constraint handling - see `.agents/patterns/errors/fk-constraint-user.md`
- Must regenerate Supabase types before database work
- Must NOT claim complete without GATES.md checksums

---

## Gates (Auto-enforced)

| Gate | Command | Must Pass |
|------|---------|-----------|
| Patterns | Read `.agents/patterns/index.json` | Applied |
| TypeScript | `npm run typecheck --prefix frontend` | 0 errors |
| ESLint | `npm run lint --prefix frontend` | 0 errors |
| Tests | `npx playwright test tests/e2e/directory*.spec.ts` | 100% |
| Gates | `npx tsx .agents/tools/enforce-gates.ts directory` | All PASSED |

---

## Deliverables

### Database (from CONTEXT.md)
- [x] `project_users` - Project membership
- [x] `companies` - Company records
- [x] `contacts` - Contact records
- [x] `distribution_groups` - Email groups
- [x] `distribution_group_members` - Group membership
- [ ] Verify RLS policies
- [ ] Regenerate types if needed

### API Endpoints
Review existing in `frontend/src/app/(other)/api/projects/[projectId]/directory/`:
- [ ] `/people` - List, Create
- [ ] `/people/[personId]` - Get, Update, Delete
- [ ] `/people/[personId]/permissions` - Manage permissions
- [ ] `/people/[personId]/invite` - Send invite
- [ ] `/companies` - List, Create
- [ ] `/companies/[companyId]` - Get, Update, Delete
- [ ] `/groups` - List, Create
- [ ] `/groups/[groupId]` - Get, Update, Delete
- [ ] `/groups/[groupId]/members` - Manage members

### Frontend Pages (from CONTEXT.md)
- [x] Users: `/[projectId]/directory/users`
- [x] Companies: `/[projectId]/directory/companies`
- [x] Contacts: `/[projectId]/directory/contacts`
- [x] Groups: `/[projectId]/directory/groups`
- [x] Employees: `/[projectId]/directory/employees`
- [x] Settings: `/[projectId]/directory/settings`

### Components
- [ ] User Invite Modal
- [ ] Permission Matrix Editor
- [ ] Company Form
- [ ] Contact Form
- [ ] Group Member Manager
- [ ] Bulk Add Users

### Services (from CONTEXT.md - existing)
- [x] `directoryService.ts`
- [x] `companyService.ts`
- [x] `inviteService.ts`
- [x] `permissionService.ts`

### Tests
- [ ] `frontend/tests/e2e/directory-users.spec.ts`
- [ ] `frontend/tests/e2e/directory-companies.spec.ts`
- [ ] `frontend/tests/e2e/directory-contacts.spec.ts`
- [ ] `frontend/tests/e2e/directory-groups.spec.ts`
- [ ] `frontend/tests/e2e/directory-permissions.spec.ts`

### Documentation
- [x] `CONTEXT.md` exists
- [ ] `TASKS.md` - Task checklist
- [ ] `GATES.md` - Gate checksums

---

## Completion Evidence

When claiming completion, provide:

```markdown
## Completion Report
- Feature: directory
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
- [screenshot1.png] - Users tab
- [screenshot2.png] - Companies tab
- [screenshot3.png] - Permission matrix
- [screenshot4.png] - Invite user modal
...
```

---

## Procore Feature Reference

Based on CONTEXT.md and crawl data:

1. **Users Tab**
   - Project team member list
   - Role/permission display
   - Invite new users
   - Bulk add from company directory

2. **Companies Tab**
   - Vendor/subcontractor list
   - Company details (address, phone, etc.)
   - Link to contacts

3. **Contacts Tab**
   - Individual contacts
   - Company association
   - Quick add contact

4. **Groups Tab**
   - Distribution groups for notifications
   - Member management
   - Used by RFIs, submittals, etc.

5. **Permission Management**
   - Permission templates/roles
   - Tool-level permissions
   - Read/Standard/Admin levels

Key Fields:
- Name
- Email
- Company
- Role
- Permission Template
- Status (Active, Pending, Inactive)
- Last Login
