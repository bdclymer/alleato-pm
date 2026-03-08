# Alleato-Procore Reality Map

**Generated:** 2026-02-23
**Purpose:** Honest assessment of every feature's actual implementation status
**TypeScript Status:** Compiles clean (0 errors)
**Database:** 220+ tables exist in Supabase

---

## How to Read This Document

Each feature is rated on a **completeness tier**:

| Tier | Meaning | What It Has |
|------|---------|-------------|
| **A - Production-Ready** | Full stack complete, needs QA only | Page + API + Hooks + Services + Forms + DB Tables |
| **B - Functional** | Core CRUD works, missing polish | Page + API + Hooks + some Forms + DB Tables |
| **C - Partial** | Some pieces work, significant gaps | Page + (some API or hooks) + DB Tables |
| **D - Skeleton** | Page exists, no backend | Page only (maybe a hook) + DB Tables exist |
| **E - Shell** | Page exists, nothing behind it | Page only, no DB tables or APIs |

---

## Feature Status Overview

### Tier A — Production-Ready (Needs QA Verification)

| Feature | Page | API Routes | Hooks | Services | Forms/Dialogs | DB Tables | Notes |
|---------|------|------------|-------|----------|---------------|-----------|-------|
| **Directory** | YES | Extensive (people, companies, groups, permissions, import/export) | 10+ hooks | 7 services | 9+ dialogs | `people`, `companies`, `project_directory_memberships`, `project_companies`, `project_roles`, `user_directory_permissions`, `distribution_groups` | Most complete feature. Full CRUD, permissions, bulk ops, import/export |
| **Drawings** | YES | Full CRUD (sets, areas, revisions, download) | 5 hooks | 3 services | Upload dialog | `drawings`, `drawing_areas`, `drawing_sets` | Has dedicated viewer, areas, revisions |
| **Specifications** | YES | Full CRUD (sections, areas, revisions, download) | 3 hooks | 3 services | Edit modal, upload, revision dialog | `specifications`, `specification_sections`, `specification_areas`, `specification_section_revisions` | Has detail pages, revision system |
| **Punch List** | YES | Full CRUD | 1 hook | 1 service | Form dialog | `punch_items` | Clean implementation |

### Tier B — Functional (Core Works, Gaps Exist)

| Feature | Page | API Routes | Hooks | Services | Forms/Dialogs | DB Tables | Known Gaps |
|---------|------|------------|-------|----------|---------------|-----------|------------|
| **Budget** | YES | Extensive (lines, lock, history, export, import, views, forecast, modifications, snapshots) | 1 hook (`use-budget-data`) | NO | 28+ modals/forms | `budget_lines`, `budget_modifications`, `budget_snapshots`, `budget_views`, `budget_line_history`, `budget_mod_lines`, `vertical_markup`, `project_budget_codes` | No service layer; heavy component logic. Budget-v2 page exists as duplicate |
| **Commitments** | YES | Line items, export, import | 3 hooks | NO | Email/export dialogs | `contracts`, `schedule_of_values`, `sov_line_items` | No service layer. Commitments = contracts table |
| **Change Orders** | YES | Full CRUD (line-items, approve/reject, attachments, export) | 3 hooks | NO | Detail view, approval workflow, line items table | `change_orders`, `change_order_lines` | No service layer |
| **Change Events** | YES | Full CRUD (rfqs, approvals, attachments, convert-to-CO) | 2 hooks | NO | Form, RFQ form, convert dialog | `change_events`, `change_event_rfqs` | No service layer |
| **Prime Contracts** | YES | Full CRUD (line-items, change-orders, attachments) | 2 hooks | NO | Contract form, subcontract form, PO form, import from budget | `prime_contracts`, `contracts`, `purchase_orders`, `subcontracts` | No service layer. Shares contracts API |
| **Direct Costs** | YES | Full CRUD (bulk, export) | NO | NO | Create form, export dialog | `direct_costs` | **Missing hook** — uses inline fetch or direct API calls |
| **Schedule** | YES | Tasks CRUD (bulk, import) | 1 hook | NO | Task edit modal, bulk edit, import/export | `schedule_tasks`, `schedule_dependencies`, `schedule_deadlines` | No service layer |
| **RFIs** | YES | CRUD exists | 1 hook | NO | NO | `rfis`, `rfi_assignees` | **API route at wrong level** (`/api/rfis/` not `/api/projects/[projectId]/rfis/`). No form dialogs |
| **Meetings** | YES | CRUD + individual meeting | 1 hook | NO | Create dialog, edit modal | `meeting_segments` (Fireflies integration) | DB table is meeting_segments not meetings — may be mismatch |

### Tier C — Partial (Significant Gaps)

| Feature | Page | API Routes | Hooks | Services | Forms/Dialogs | DB Tables | What's Missing |
|---------|------|------------|-------|----------|---------------|-----------|----------------|
| **Home** | YES | Checklist only | 5 hooks | NO | Doc metadata modal, team member form | `projects`, `project_briefings`, `project_insights` | Dashboard only, no CRUD — this is expected |
| **Invoicing** | YES | Owner invoices (approve, submit) | NO | NO | NO | `billing_periods` | Missing forms, missing hooks. Approval-only endpoints |
| **SOV (Schedule of Values)** | YES | NO (uses contracts API) | NO | NO | Grid/row components (in contracts domain) | `schedule_of_values`, `sov_line_items` | No dedicated API or hooks. Piggybacks on contracts |

### Tier D — Skeleton (Page + DB Tables, No Backend Wiring)

| Feature | Page | API Routes | Hooks | Services | Forms/Dialogs | DB Tables Exist | What's Needed |
|---------|------|------------|-------|----------|---------------|-----------------|---------------|
| **Daily Log** | YES | NO | NO | NO | Create dialogs exist | `daily_logs` | Need API routes, hook, wire up forms to API |
| **Documents** | YES | NO | 1 hook (knowledge docs) | NO | Preview modal | `document_metadata`, `document_chunks` | Need CRUD API, proper document management hook |
| **Submittals** | YES (shell) | NO | NO | NO | NO | `submittals`, `submittal_types`, `submittal_documents`, `submittal_history`, `submittal_notifications`, `submittal_analytics_events`, `submittal_performance_metrics`, `reviews`, `review_comments` | **DB is extensive (9 tables!)** but zero frontend wiring. High-value gap |
| **Invoices** | YES | NO | NO | NO | NO | `billing_periods` (shared w/ invoicing) | Separate from invoicing page. Needs full build |

### Tier E — Shell (Page Only, Minimal/No Backend)

| Feature | Page | API Routes | Hooks | Services | Forms/Dialogs | DB Tables | Status |
|---------|------|------------|-------|----------|---------------|-----------|--------|
| **Emails** | YES | NO | NO | NO | NO | None visible | Placeholder page only |
| **Photos** | YES | NO | NO | NO | NO | None visible | Placeholder page only |
| **Transmittals** | YES | NO | NO | NO | NO | None visible | Placeholder page only |
| **Reporting** | YES | NO | NO | NO | NO | None visible | Placeholder page only |
| **Admin** | YES | NO | NO | NO | Auto-form exists | `table_metadata` | Dev/admin tool, not user-facing |
| **Design System** | YES | NO | NO | NO | NO | None | Internal dev reference page |
| **Client Dashboard** | YES | NO | 1 hook (clients) | NO | NO | `clients` | Minimal client portal |
| **Budget-v2** | YES | NO | Shares budget hook | NO | NO | Shares budget tables | Duplicate/experimental. Should be merged or removed |
| **Tasks** | YES | NO | Shares schedule hook | NO | NO | `project_tasks` | Confusing overlap with Schedule. Needs clarification |

---

## Critical Architecture Issues Found

### 1. RFI API Route at Wrong Level
**Location:** `/api/rfis/` instead of `/api/projects/[projectId]/rfis/`
**Impact:** Breaks project-scoping pattern. May not enforce project-level RLS correctly.
**Fix:** Move to `/api/projects/[projectId]/rfis/`

### 2. Submittals: Massive DB, Zero Frontend
**9 database tables** exist for submittals (including analytics, notifications, reviews, documents) but the frontend is an empty shell page. This represents significant wasted database work OR the highest-value feature to wire up.

### 3. No Service Layer for Most Features
Only Directory (7 services), Drawings (3), Specifications (3), and Punch List (1) have service classes. All other features have business logic either:
- Inline in API routes
- Inline in hooks
- Missing entirely

### 4. Direct Costs Missing Hook
Has API routes and forms but no `use-direct-costs.ts` hook. Data fetching may be inline or broken.

### 5. Meetings DB Mismatch
The `meetings` API/hooks exist but the DB table is `meeting_segments` (Fireflies integration). There may be no actual `meetings` table for CRUD — need to verify.

### 6. Duplicate/Confusing Features
- **Budget vs Budget-v2**: Two pages, same data. Pick one.
- **Tasks vs Schedule**: Both exist, share the same hook. Clarify purpose.
- **Invoices vs Invoicing**: Two separate pages and routes. Consolidate.

---

## Database Tables Without Frontend Features

These tables exist in the database but have NO corresponding frontend page:

| Table(s) | Domain | Potential Feature |
|----------|--------|-------------------|
| `qtos`, `qto_items` | Quantity Take-Offs | Could be a standalone tool |
| `subcontractors`, `subcontractor_contacts`, `subcontractor_documents`, `subcontractor_projects` | Subcontractor Management | Full CRM for subs (separate from directory) |
| `fm_*` (12 tables) | Facility Management / ASRS | Specialized domain — may not be needed |
| `procore_*` (6 tables) | Procore Reverse Engineering | Dev tooling, not user-facing |
| `risks` | Risk Management | Could be extracted from meetings/AI |
| `decisions` | Decision Log | Could be a project tool |
| `issues`, `notes` | Issue/Note Tracking | Could enhance daily log or standalone |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total feature directories | 31 |
| Tier A (Production-Ready, needs QA) | 4 |
| Tier B (Functional, has gaps) | 9 |
| Tier C (Partial) | 3 |
| Tier D (Skeleton — DB exists, no wiring) | 4 |
| Tier E (Shell — page only) | 11 |
| Database tables | 220+ |
| Hooks | 60+ |
| Services | 14 |
| API route groups | 21 |
| TypeScript errors | 0 |
