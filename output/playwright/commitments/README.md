# Commitments Feature - E2E Test Documentation

**Generated:** 2026-02-21
**Feature:** Commitments (Subcontracts & Purchase Orders)
**Location:** `/output/playwright/commitments/`

---

## Documentation Overview

This directory contains comprehensive E2E test documentation for the Commitments feature in the Alleato-Procore project.

### 📚 Available Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| **[test-plan.md](./test-plan.md)** | Complete E2E test plan with scenarios, selectors, and validation rules | QA Engineers, Developers |
| **[workflow-summary.md](./workflow-summary.md)** | User workflows, status transitions, and UI reference | Product Managers, Developers |
| **[test-coverage-matrix.md](./test-coverage-matrix.md)** | Detailed coverage analysis and gap identification | QA Managers, Tech Leads |
| **[quick-test-reference.md](./quick-test-reference.md)** | Command reference for running specific tests | Developers, CI/CD Engineers |
| **README.md** | This file - navigation guide | Everyone |

---

## Quick Start

### Run All Commitments Tests

```bash
cd /Users/meganharrison/Documents/github/alleato-pm/frontend
npx playwright test tests/e2e/commitments/
```

### Run Comprehensive UI Tests

```bash
npx playwright test tests/e2e/commitments/commitments-comprehensive.spec.ts --ui
```

### Run Specific Workflow

```bash
# Create workflow
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Create"

# Edit workflow
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Edit"

# Delete workflow
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts -g "Delete"

# SOV workflow
npx playwright test tests/e2e/commitments/commitments-sov-line-items.spec.ts
```

---

## What is the Commitments Feature?

The Commitments feature allows construction project managers to create, track, and manage:

- **Subcontracts** - Contracts with subcontractors for construction work
- **Purchase Orders** - Orders for materials and services

### Key Capabilities

1. **Create & Manage**
   - Create subcontracts and purchase orders
   - Edit commitment details
   - Delete and restore commitments

2. **Schedule of Values (SOV)**
   - Add line items with amounts
   - Track billed amounts
   - Calculate totals automatically

3. **Status Workflow**
   - Draft → Pending → Approved → Executed → Closed
   - Status-based permissions

4. **Import/Export**
   - Import SOV from CSV
   - Export commitments to CSV/PDF

5. **Search & Filter**
   - Search by title or number
   - Filter by status, type, vendor
   - Tab-based filtering

---

## Test Coverage Summary

| Area | Coverage | Tests | Status |
|------|----------|-------|--------|
| **Create Workflows** | 100% | 22 | ✅ Complete |
| **Read Workflows** | 100% | 45 | ✅ Complete |
| **Update Workflows** | 95% | 24 | ✅ Complete |
| **Delete Workflows** | 100% | 11 | ✅ Complete |
| **SOV Line Items** | 95% | 15+ | ✅ Complete |
| **Validation** | 85% | 10 | ⚠️ Needs status workflow tests |
| **Responsive Design** | 80% | 3 | ✅ Complete |
| **Overall** | **90%** | **150+** | ✅ Excellent |

**See [test-coverage-matrix.md](./test-coverage-matrix.md) for detailed breakdown.**

---

## Test Files

### Core CRUD Tests

| File | Tests | Purpose |
|------|-------|---------|
| `commitments-crud-flows.spec.ts` | 12 | Create, Edit, Delete flows |
| `commitment-create.spec.ts` | 8 | Detailed create scenarios |
| `commitments-edit.spec.ts` | 10 | Edit form validation |
| `commitments-soft-delete.spec.ts` | 5 | Soft delete functionality |
| `commitments-recycle-bin.spec.ts` | 4 | Restore deleted items |

### UI Tests

| File | Tests | Purpose |
|------|-------|---------|
| `commitments-comprehensive.spec.ts` | 40+ | Full UI coverage |
| `commitments-list-page.spec.ts` | 15 | List, filter, search |
| `commitments-detail-tabs.spec.ts` | 8 | Detail page tabs |
| `commitment-forms.spec.ts` | 12 | Form field rendering |

### SOV Tests

| File | Tests | Purpose |
|------|-------|---------|
| `commitments-sov-line-items.spec.ts` | 15+ | SOV CRUD, calculations |
| `commitment-sov-import.spec.ts` | 5 | CSV import |

### Validation Tests

| File | Tests | Purpose |
|------|-------|---------|
| `commitment-validation.spec.ts` | 10 | Field validations |
| `form-commitments-company-dropdown.spec.ts` | 5 | Company dropdown |

**See full list in [test-plan.md](./test-plan.md#existing-test-files).**

---

## User Workflows

### Create Subcontract

```
1. Go to /67/commitments
2. Click "Create" → "Subcontract"
3. Fill: Contract Number, Title
4. Click "Create"
5. Success! Redirected to detail page
```

**Test:** `commitments-crud-flows.spec.ts` → "should create a subcontract with required fields"

### Edit Commitment

```
1. Go to /67/commitments
2. Find row → Click ⋮ → Click "Edit"
3. Update fields
4. Click "Save"
5. Success! Changes persisted
```

**Test:** `commitments-crud-flows.spec.ts` → "should edit commitment title and save"

### Delete & Restore

```
1. Go to /67/commitments
2. Find row → Click ⋮ → Click "Delete"
3. Confirm
4. Row removed (soft deleted)
5. Go to Recycle Bin
6. Click "Restore"
7. Commitment visible again
```

**Test:** `commitments-crud-flows.spec.ts` → "should restore deleted commitment"

**See all workflows in [workflow-summary.md](./workflow-summary.md).**

---

## Key Selectors

### Navigation

```typescript
// List page
page.goto('/67/commitments')

// Detail page
page.goto('/67/commitments/{id}')

// Edit page
page.goto('/67/commitments/{id}/edit')
```

### Create Commitment

```typescript
// Create dropdown
page.getByRole('button', { name: /Create/i }).first().click()

// Select type
page.getByRole('menuitem', { name: /Subcontract/i }).click()
page.getByRole('menuitem', { name: /Purchase Order/i }).click()
```

### Form Fields

```typescript
// Contract number
page.locator('#contractNumber').fill('SC-001')

// Title
page.locator('#title').fill('Test Subcontract')

// Submit
page.getByRole('button', { name: 'Create', exact: true }).click()
```

### Search & Filter

```typescript
// Search
page.getByPlaceholder(/Search commitments/i).fill('search term')

// Status filter
page.locator('button:has-text("Status")').first().click()

// Type tabs
page.locator('text=All Commitments').click()
page.locator('text=Subcontracts').click()
page.locator('text=Purchase Orders').click()
```

**See all selectors in [test-plan.md](./test-plan.md#ui-elements--selectors).**

---

## Validation Rules

### Required Fields

| Field | Subcontract | Purchase Order |
|-------|-------------|----------------|
| Contract Number | ✅ Required | ✅ Required |
| Title | ✅ Required | ✅ Required |
| Contract Company | Optional | Optional |
| Original Amount | Optional | Optional |

### Field Formats

| Field | Format | Validation |
|-------|--------|------------|
| Contract Number | Text, max 50 | Alphanumeric, hyphens |
| Original Amount | Numeric | >= 0, max 2 decimals |
| Executed Date | Date | Valid date format |
| Completion Date | Date | >= Start Date |

**See all validations in [test-plan.md](./test-plan.md#validation-rules).**

---

## Status Workflow

```
Draft → Pending → Approved → Executed → Closed
  ↓
Void
```

### Edit Permissions

| Status | Can Edit? | Can Delete? |
|--------|-----------|-------------|
| Draft | ✅ Yes | ✅ Yes |
| Pending | ✅ Yes | ✅ Yes |
| Approved | ⚠️ Limited | ⚠️ Admin only |
| Executed | ❌ No | ❌ No |
| Closed | ❌ No | ❌ No |

**See full workflow in [workflow-summary.md](./workflow-summary.md#status-workflow).**

---

## Running Tests

### All Tests

```bash
cd frontend
npx playwright test tests/e2e/commitments/
```

**Time:** ~5 minutes | **Tests:** 150+

### UI Mode (Best for Development)

```bash
npx playwright test tests/e2e/commitments/commitments-comprehensive.spec.ts --ui
```

**Features:**
- Interactive test runner
- Step-by-step execution
- Visual debugging

### Headed Mode (See Browser)

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts --headed
```

### Debug Mode

```bash
npx playwright test tests/e2e/commitments/commitments-crud-flows.spec.ts --debug
```

**See all commands in [quick-test-reference.md](./quick-test-reference.md).**

---

## Coverage Gaps

### High Priority (Not Tested)

1. **Status Workflow Enforcement** - Test blocked transitions
2. **Read-Only Enforcement** - Test executed commitments cannot be edited
3. **Permissions & Roles** - Test different user access levels
4. **Attachment Upload** - Test file upload/download
5. **Export Functionality** - Test CSV/PDF export

### Medium Priority (Partial Coverage)

6. **Duplicate Number Prevention** - UI error message
7. **Date Range Validation** - Completion >= Start
8. **SOV Reordering** - Drag-and-drop
9. **Concurrent Editing** - Two users, same commitment

**See all gaps in [test-coverage-matrix.md](./test-coverage-matrix.md#coverage-gaps--recommendations).**

---

## Next Steps

### For QA Engineers

1. **Read:** [test-plan.md](./test-plan.md) - Understand all test scenarios
2. **Run:** `npx playwright test tests/e2e/commitments/ --ui` - Execute tests
3. **Review:** [test-coverage-matrix.md](./test-coverage-matrix.md) - Identify gaps
4. **Create:** New tests for high-priority gaps

### For Developers

1. **Read:** [workflow-summary.md](./workflow-summary.md) - Understand user workflows
2. **Reference:** [quick-test-reference.md](./quick-test-reference.md) - Run specific tests
3. **Debug:** Use `--ui` or `--debug` mode for failing tests
4. **Update:** Tests when feature changes

### For Product Managers

1. **Read:** [workflow-summary.md](./workflow-summary.md) - See all user workflows
2. **Review:** [test-coverage-matrix.md](./test-coverage-matrix.md) - Understand coverage
3. **Prioritize:** Coverage gaps based on user impact

### For Tech Leads

1. **Review:** [test-coverage-matrix.md](./test-coverage-matrix.md) - Assess quality
2. **Plan:** Address high-priority gaps
3. **Setup:** CI/CD integration (see [quick-test-reference.md](./quick-test-reference.md#cicd-commands))

---

## Resources

### Project Files

- **Existing Tests:** `/frontend/tests/e2e/commitments/`
- **Page Components:** `/frontend/src/app/(main)/[projectId]/commitments/`
- **API Routes:** `/frontend/src/app/api/projects/[projectId]/commitments/`

### Playwright Resources

- **Playwright Docs:** https://playwright.dev/
- **Best Practices:** https://playwright.dev/docs/best-practices
- **Debugging:** https://playwright.dev/docs/debug

### Project Docs

- **CLAUDE.md:** `/CLAUDE.md` - Development guidelines
- **Testing Standards:** `/.claude/rules/E2E-TESTING-STANDARDS.md`
- **Playwright Gate:** `/.claude/rules/PLAYWRIGHT-GATE.md`

---

## Support

### Questions?

- **QA Team:** Ask about test scenarios, coverage gaps
- **Dev Team:** Ask about selectors, component behavior
- **Product Team:** Ask about user workflows, requirements

### Issues?

1. Check [quick-test-reference.md](./quick-test-reference.md#troubleshooting)
2. Review test file comments
3. Run with `--debug` flag
4. Ask in team chat

---

## Document Versions

| Document | Version | Last Updated |
|----------|---------|--------------|
| test-plan.md | 1.0 | 2026-02-21 |
| workflow-summary.md | 1.0 | 2026-02-21 |
| test-coverage-matrix.md | 1.0 | 2026-02-21 |
| quick-test-reference.md | 1.0 | 2026-02-21 |
| README.md | 1.0 | 2026-02-21 |

---

## Contributing

### Adding New Tests

1. Follow patterns in existing test files
2. Use test data prefixes (`SC-E2E-`, `PO-E2E-`)
3. Include cleanup in `beforeEach` / `afterAll`
4. Add to coverage matrix
5. Update this documentation

### Updating Documentation

1. Keep all 5 documents in sync
2. Update version numbers
3. Run tests to verify examples
4. Commit documentation with code changes

---

**Generated by:** Alleato PM Testing Team
**Project:** Alleato-Procore
**Feature:** Commitments
**Date:** 2026-02-21
**Status:** ✅ Complete
