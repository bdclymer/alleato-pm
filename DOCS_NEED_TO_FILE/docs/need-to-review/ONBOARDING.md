# Alleato-Procore Onboarding Guide

Welcome! This guide will get you productive quickly.

---

## What is Alleato-Procore?

A construction project management system that replicates Procore's functionality. We're building:
- Financial management (budgets, contracts, invoicing)
- Project coordination (RFIs, submittals, meetings)
- Field operations (daily logs, punch lists, photos)

**Tech Stack:**
- Frontend: Next.js 15 (App Router), Tailwind CSS, shadCN UI
- Backend: Supabase (PostgreSQL with Row-Level Security)
- Testing: Playwright E2E

---

## Day 1: Orientation

### 1. Understand the Data We Have

We've crawled Procore extensively. Here's what exists:

```
apps/docs/pages/PLANS/
├── budget/                 # 237 files
├── change-events/          # 32 files
├── change-orders/          # 236 files
├── commitments/            # 250 files
├── direct-costs/           # 240 files
├── invoicing/              # 15+ files
├── prime-contracts/        # 91 files
└── ... (22 features total, 2,953 files)
```

Each feature folder contains:
- **Screenshots** of every Procore screen
- **HTML DOM** captures for analysis
- **Metadata JSON** with extracted components
- **Comparison reports** showing gaps

### 2. Pick a Feature to Explore

Open this file to see all features:
```bash
cat documentation/FEATURE-INDEX.md
```

Then explore a feature:
```bash
# See what's in a feature folder
ls -la apps/docs/pages/PLANS/prime-contracts/

# Look at screenshots
open apps/docs/pages/PLANS/prime-contracts/procore-prime-contracts-crawl/pages/
```

### 3. Read the Development Process

```bash
cat documentation/DEVELOPMENT-PROCESS.md
```

This is **THE** process we follow for every feature.

---

## Day 2-3: Your First Task

### Recommended First Task: Audit a Feature

Pick a feature that doesn't have a COMPARISON-REPORT.md and create one.

**Steps:**
1. Open all screenshots in the feature's crawl folder
2. Look at our implementation in `frontend/src/app/(main)/[projectId]/`
3. Document what Procore has vs what we have
4. Calculate a match score

**Output:** `COMPARISON-REPORT.md` following this template:

```markdown
# {Feature} Comparison Report

**Date:** YYYY-MM-DD
**Match Score:** X%

## Summary
Brief overview of gaps.

## Field-by-Field Comparison

| Procore Field | Our Implementation | Status |
|---------------|-------------------|--------|
| Field 1 | Implemented | ✅ |
| Field 2 | Missing | ❌ |
| Field 3 | Partial | ⚠️ |

## Critical Issues
List blockers.

## Effort Estimate
How much work to reach 80% match.
```

---

## Key Documents

| Document | Purpose | Location |
|----------|---------|----------|
| Development Process | How we build features | `documentation/DEVELOPMENT-PROCESS.md` |
| Feature Index | Navigate all crawled data | `documentation/FEATURE-INDEX.md` |
| CLAUDE.md | AI assistant instructions | `CLAUDE.md` (root) |
| Database Types | Current schema | `frontend/src/types/database.types.ts` |

---

## Common Tasks

### "I need to see what Procore looks like for X"

```bash
# Find screenshots
open apps/docs/pages/PLANS/{feature}/procore-{feature}-crawl/pages/

# Each page folder has:
# - screenshot.png (visual)
# - dom.html (HTML structure)
# - metadata.json (extracted buttons, forms, tables)
```

### "I need to understand the current database schema"

```bash
# View the auto-generated types
cat frontend/src/types/database.types.ts

# Regenerate after schema changes
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public \
  > frontend/src/types/database.types.ts
```

### "I need to understand a Procore business rule"

Query the RAG system with embedded Procore support documentation.
(Ask Megan for access to the Supabase vector store.)

### "I need to run tests"

```bash
cd frontend

# Run all tests
npx playwright test

# Run specific feature tests
npx playwright test tests/e2e/{feature}.spec.ts

# Visual test mode
npx playwright test --ui
```

### "I need to check code quality"

```bash
# ALWAYS run before committing
npm run quality --prefix frontend

# Must pass with 0 errors
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                          │
│  Next.js 15 (App Router)                                │
│  ├── /(main)/[projectId]/    # Project-scoped pages     │
│  ├── /components/            # Reusable UI components   │
│  ├── /hooks/                 # Custom React hooks       │
│  └── /services/              # Business logic           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                       Supabase                          │
│  ├── PostgreSQL Database (90+ tables)                   │
│  ├── Row-Level Security (per-project isolation)         │
│  ├── Auth (JWT-based)                                   │
│  └── Storage (documents, photos)                        │
└─────────────────────────────────────────────────────────┘
```

### Key Database Tables

**Financial:**
- `prime_contracts` - Owner contracts
- `subcontracts` - Subcontractor agreements
- `purchase_orders` - Material/equipment POs
- `change_orders` - Contract modifications
- `invoices` / `owner_invoices` - Billing
- `budget_lines` - Budget tracking

**Project Management:**
- `projects` - Main project records
- `rfis` - Requests for Information
- `submittals` - Document submittals
- `meetings` - Meeting records
- `daily_logs` - Daily reports

**Directory:**
- `companies` - Company records
- `contacts` - Contact people
- `users` - System users

---

## Development Workflow

```
1. DISCOVER    → Review Procore crawl data
                 What are we building?

2. DESIGN      → Create schema from UI requirements
                 What data structure supports this?

3. IMPLEMENT   → Build with dev annotations
                 Show data sources during development

4. VERIFY      → Compare against Procore screenshots
                 Does it match?

5. TEST        → Run automated E2E tests
                 Does it work?

6. DOCUMENT    → Update status and match score
                 What's the current state?
```

---

## Dev Mode (Data Source Visibility)

During development, enable dev mode to see where data comes from:

```tsx
// In any component, register its data source
import { useDataSource } from '@/components/dev';

function ContractsTable({ contracts }) {
  useDataSource({
    component: 'ContractsTable',
    table: 'prime_contracts',
    columns: ['id', 'number', 'title', 'value'],
    calculatedFields: {
      revised_value: 'original + approved_changes'
    }
  });

  return <Table data={contracts} />;
}
```

A floating panel shows all registered data sources.
**Remove before production.**

---

## Questions?

- **Technical questions:** Ask in code review
- **Process questions:** Refer to `DEVELOPMENT-PROCESS.md`
- **Feature questions:** Check the feature's folder in `apps/docs/pages/PLANS/`
- **Business rules:** Query the RAG system or ask Megan

---

## Checklist

- [ ] Read `documentation/DEVELOPMENT-PROCESS.md`
- [ ] Read `documentation/FEATURE-INDEX.md`
- [ ] Explore one feature's crawl folder
- [ ] Look at `frontend/src/types/database.types.ts`
- [ ] Run `npm run quality --prefix frontend`
- [ ] Run a Playwright test
- [ ] Create a COMPARISON-REPORT.md for one feature

After completing this checklist, you're ready to contribute!
