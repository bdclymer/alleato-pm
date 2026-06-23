# Alleato-Procore Feature Index

> Quick navigation to all crawled Procore data and implementation status.

## Feature Directory

| Feature | Screenshots | Status | Match | Priority | Start Here |
|---------|-------------|--------|-------|----------|------------|
| [Budget](#budget) | 40 pages | In Progress | TBD | HIGH | [README](../apps/docs/pages/PLANS/budget/README.md) |
| [Budget Forecasting](#budget-forecasting) | 3 files | Not Started | - | MEDIUM | [README](../apps/docs/pages/PLANS/budget-forecasting/) |
| [Change Events](#change-events) | 32 files | In Progress | TBD | HIGH | [README](../apps/docs/pages/PLANS/change-events/README.md) |
| [Change Orders](#change-orders) | 100+ pages | In Progress | TBD | HIGH | [README](../apps/docs/pages/PLANS/change-orders/) |
| [Commitments](#commitments) | 115+ pages | In Progress | TBD | HIGH | [README](../apps/docs/pages/PLANS/commitments/README.md) |
| [Daily Logs](#daily-logs) | 41 files | Not Started | - | MEDIUM | [Folder](../apps/docs/pages/PLANS/daily-logs/) |
| [Direct Costs](#direct-costs) | 240 files | In Progress | TBD | HIGH | [README](../apps/docs/pages/PLANS/direct-costs/) |
| [Directory](#directory) | 23 files | Partial | TBD | MEDIUM | [Folder](../apps/docs/pages/PLANS/directory/) |
| [Drawings](#drawings) | 25 files | Not Started | - | LOW | [Folder](../apps/docs/pages/PLANS/drawings/) |
| [Emails](#emails) | 208 files | Not Started | - | LOW | [Folder](../apps/docs/pages/PLANS/emails/) |
| [Forms Framework](#forms) | 7 files | Framework | - | LOW | [Folder](../apps/docs/pages/PLANS/forms/) |
| [Invoicing](#invoicing) | 15+ files | In Progress | TBD | HIGH | [README](../apps/docs/pages/PLANS/invoicing/) |
| [Meetings](#meetings) | 268 files | Partial | TBD | MEDIUM | [Folder](../apps/docs/pages/PLANS/meetings/) |
| [Photos](#photos) | 62 files | Not Started | - | LOW | [Folder](../apps/docs/pages/PLANS/photos/) |
| [Prime Contracts](#prime-contracts) | 91 files | In Progress | **40.8%** | HIGH | [SUMMARY](../apps/docs/pages/PLANS/prime-contracts/COMPARISON-SUMMARY.md) |
| [Punch List](#punch-list) | 242 files | Not Started | - | MEDIUM | [Folder](../apps/docs/pages/PLANS/punch-list/) |
| [RFIs](#rfis) | 182 files | Partial | TBD | MEDIUM | [Folder](../apps/docs/pages/PLANS/rfis/) |
| [Schedule](#schedule) | 53 files | Not Started | - | MEDIUM | [Folder](../apps/docs/pages/PLANS/schedule/) |
| [Specifications](#specifications) | 173 files | Partial | TBD | LOW | [Folder](../apps/docs/pages/PLANS/specifications/) |
| [Submittals](#submittals) | 53 files | Partial | TBD | MEDIUM | [Folder](../apps/docs/pages/PLANS/submittals/) |

---

## Quick Links by Feature

### Budget

**Financial tracking at the project level**

| Resource | Path |
|----------|------|
| Screenshots | `apps/docs/pages/PLANS/budget/procore-budget-crawl/pages/` |
| Main View | `budget-main-view/screenshot.png` |
| Forecast Tab | `budget-forecast-tab/screenshot.png` |
| Details Tab | `budget-details-tab/screenshot.png` |
| Snapshots Tab | `budget-snapshots-tab/screenshot.png` |
| History Tab | `budget-history-tab/screenshot.png` |
| Implementation Plan | `PLANS.md` |
| Task List | `TASKS.md` |

---

### Change Events

**Potential changes before they become change orders**

| Resource | Path |
|----------|------|
| Screenshots | `apps/docs/pages/PLANS/change-events/reference/playwright-crawl-output/` |
| List View | `01-change-events-list/screenshot.png` |
| Create Form | `02-create-form-initial/screenshot.png` |
| Form Fields | `02-create-form-initial/form-fields.json` |
| Specs | `specs/` folder |
| API Reference | `specs/API.md` |
| Schema | `specs/SCHEMA.md` |

---

### Commitments

**Subcontracts and Purchase Orders**

| Resource | Path |
|----------|------|
| Screenshots | `apps/docs/pages/PLANS/commitments/procore-crawl-output/pages/` |
| Crawl Status | `COMMITMENTS-CRAWL-STATUS.md` |
| Implementation Plan | `PLANS.md` |
| Task List | `TASKS.md` (17KB, detailed breakdown) |
| Form Fields | `forms/` |
| Verification | `VERIFICATION-detail-tabs.md` |

---

### Prime Contracts

**Owner contracts (GC perspective)**

| Resource | Path |
|----------|------|
| Screenshots | `apps/docs/pages/PLANS/prime-contracts/procore-prime-contracts-crawl/` |
| **Comparison Report** | `COMPARISON-REPORT.md` |
| **Executive Summary** | `COMPARISON-SUMMARY.md` (Start here!) |
| Execution Plan | `EXECUTION-PLAN.md` (138KB, very detailed) |
| Current Status | `STATUS.md` |
| Patterns/Pitfalls | `PATTERNS-PITFALLS.md` |

**Key Finding:** 40.8% match score. Missing all financial calculations.

---

### Direct Costs

**Labor, materials, equipment costs**

| Resource | Path |
|----------|------|
| Screenshots | `apps/docs/pages/PLANS/direct-costs/procore-direct-costs-crawl/` |
| Implementation Docs | Various `.md` files |

---

### Invoicing

**Billing and payment applications**

| Resource | Path |
|----------|------|
| Screenshots | `apps/docs/pages/PLANS/invoicing/` |
| Crawl from App | `procore-invoicing-crawl/` |
| Crawl from Support | `procore-support-invoicing-crawl/` |

---

### Meetings

**Meeting management and minutes**

| Resource | Path |
|----------|------|
| Screenshots | `apps/docs/pages/PLANS/meetings/` |
| Large dataset - 268 files of crawled meeting UI |

---

### RFIs

**Request for Information**

| Resource | Path |
|----------|------|
| Screenshots | `apps/docs/pages/PLANS/rfis/` |
| 182 crawled files |

---

### Punch List

**Deficiency tracking**

| Resource | Path |
|----------|------|
| Screenshots | `apps/docs/pages/PLANS/punch-list/` |
| 242 crawled files |

---

## How to Use This Index

### Starting a New Feature

1. Find the feature in the table above
2. Click "Start Here" to read the overview
3. Open the screenshots folder to see what Procore looks like
4. Read the COMPARISON-REPORT.md if it exists
5. Follow the [Development Process](./DEVELOPMENT-PROCESS.md)

### Understanding Current State

Look at:

- **Match Score** - How close is implementation to Procore
- **Status** - Current development state
- **Priority** - Business importance

### Finding Specific UI Elements

```bash
# Find all screenshot files
find apps/docs/pages/PLANS -name "screenshot.png" | head -20

# Find form field captures
find apps/docs/pages/PLANS -name "*.csv" -o -name "form-fields.json"

# Find comparison reports
find apps/docs/pages/PLANS -name "COMPARISON*.md"
```

---

## Support Documentation (RAG)

The `procore-support-docs` folder contains:

- 474 files of crawled Procore help documentation
- Embedded in Supabase vector store
- Query via RAG for business rules, workflows, definitions

**Use RAG when you need to understand:**

- What a field means in Procore context
- Business rules for workflows
- How features interact
- Edge cases and validation rules

---

## Priority Guide

### Tier 1 (Core Financial)

Must work correctly for app to be useful:

- Budget
- Prime Contracts
- Commitments
- Change Orders / Change Events
- Direct Costs
- Invoicing

### Tier 2 (Project Management)

Important but not blocking:

- Schedule
- Daily Logs
- Meetings
- RFIs
- Submittals
- Punch List

### Tier 3 (Supporting)

Nice to have:

- Photos
- Drawings
- Specifications
- Emails
- Directory

---

## Metrics Dashboard

| Metric | Count |
|--------|-------|
| Total Features | 22 |
| Total Crawled Files | 2,953 |
| Total Screenshots | 1,018+ |
| Total HTML DOMs | 626 |
| Total Metadata JSONs | 1,072 |
| Features with Comparison Reports | 1 (Prime Contracts) |
| Average Match Score | TBD (need to audit all) |

---

## Next Steps

1. **Audit each feature** - Generate COMPARISON-REPORT.md for all features
2. **Calculate match scores** - Know exactly where we stand
3. **Prioritize gaps** - Focus on Tier 1 features first
4. **Implement dev mode** - Use the annotation system during development
5. **Regular verification** - Run comparison tests after each feature sprint
