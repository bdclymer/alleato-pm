# Master Task List — Alleato-Procore Feature Completion PRP

**Generated:** 2026-02-23
**Source:** Reality Map audit of all 31 features
**Companion:** `docs-ai/contents/docs/REALITY-MAP.md`

---

## How This Document Works

This is the **single source of truth** for what needs to be done. Tasks are organized by priority phase. Within each phase, tasks are ordered by business value.

**Status Key:**
- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done
- `[?]` — Needs verification (claimed done, not confirmed)

---

## Phase 0: Immediate Fixes (Do First — Unblocks Everything)

These are architectural issues that affect multiple features. Fix before building new things.

| # | Task | Feature | Type | Est. Effort | Status |
|---|------|---------|------|-------------|--------|
| 0.1 | Move RFI API routes from `/api/rfis/` to `/api/projects/[projectId]/rfis/` | RFIs | Bug Fix | 1-2 hrs | [x] Created project-scoped routes, updated hook, deleted old routes |
| 0.2 | Create `use-direct-costs.ts` hook (API routes + forms exist but no hook) | Direct Costs | Bug Fix | 1 hr | [x] Created 8 hooks: CRUD + bulk ops + export with blob download |
| 0.3 | Verify Meetings DB table exists (hook says `meetings` but DB has `meeting_segments`) | Meetings | Investigation | 30 min | [x] Verified: uses `document_metadata` table, no fix needed |
| 0.4 | Remove or merge Budget-v2 into Budget (duplicate page causing confusion) | Budget | Cleanup | 30 min | [x] Removed Budget-v2 nav entry + deleted page directory |
| 0.5 | Clarify Tasks vs Schedule relationship (both exist, share hook) | Schedule/Tasks | Decision | 30 min | [x] Removed Tasks pages, updated 6 nav files to point to Schedule |
| 0.6 | Clarify Invoices vs Invoicing relationship (two separate pages) | Invoicing | Decision | 30 min | [x] Decision: separate features (Invoices=vendor billing, Invoicing=owner billing) |

---

## Phase 1: QA Verification of Tier A & B Features (Highest ROI)

These features CLAIM to be complete. Before building anything new, verify what actually works. Use the Bug Investigation Team (`/investigate <feature>`).

### Priority 1A: Verify Tier A Features (Should be working)

| # | Task | Feature | What to Verify | Status |
|---|------|---------|----------------|--------|
| 1.1 | `/investigate directory` | Directory | Full CRUD for people + companies, permissions, bulk ops, import/export | [ ] |
| 1.2 | `/investigate drawings` | Drawings | Upload, view, areas, sets, revisions, download | [ ] |
| 1.3 | `/investigate specifications` | Specifications | CRUD sections, areas, revisions, upload, download | [ ] |
| 1.4 | `/investigate punch-list` | Punch List | Create, edit, delete, assign, status workflow | [ ] |

### Priority 1B: Verify Tier B Features (Core functionality, likely has bugs)

| # | Task | Feature | What to Verify | Status |
|---|------|---------|----------------|--------|
| 1.5 | `/investigate budget` | Budget | Line items CRUD, lock/unlock, history, export, import, views, forecast, modifications, snapshots | [ ] |
| 1.6 | `/investigate commitments` | Commitments | List, line items, export, import | [ ] |
| 1.7 | `/investigate change-orders` | Change Orders | CRUD, line items, approve/reject, attachments, export | [ ] |
| 1.8 | `/investigate change-events` | Change Events | CRUD, RFQs, approvals, convert to CO | [ ] |
| 1.9 | `/investigate prime-contracts` | Prime Contracts | CRUD, line items, change orders, attachments | [ ] |
| 1.10 | `/investigate direct-costs` | Direct Costs | CRUD, bulk operations, export (AFTER fixing hook in Phase 0) | [ ] |
| 1.11 | `/investigate schedule` | Schedule | Tasks CRUD, bulk edit, import, dependencies | [ ] |
| 1.12 | `/investigate rfis` | RFIs | CRUD, assignees, detail view (AFTER fixing API route in Phase 0) | [ ] |
| 1.13 | `/investigate meetings` | Meetings | CRUD, detail view (AFTER verifying DB in Phase 0) | [ ] |

---

## Phase 2: Wire Up Tier D Features (DB Exists, Frontend Needs Work)

These features have database tables already built. The work is creating API routes, hooks, and connecting forms. Use `/create-feature` scaffolding where possible.

| # | Task | Feature | DB Tables Ready | Work Needed | Est. Effort | Status |
|---|------|---------|----------------|-------------|-------------|--------|
| 2.1 | Build Submittals feature (9 DB tables exist!) | Submittals | `submittals`, `submittal_types`, `submittal_documents`, `submittal_history`, `reviews`, `review_comments`, + 3 more | API routes, hooks, list page, forms, review workflow | 2-3 days | [ ] |
| 2.2 | Build Daily Log feature | Daily Log | `daily_logs` | API routes, hook, wire existing create dialogs to API | 1 day | [ ] |
| 2.3 | Build Documents feature | Documents | `document_metadata`, `document_chunks` | API routes, hook, upload/manage UI | 1-2 days | [ ] |
| 2.4 | Build Invoices/Invoicing (consolidate into one) | Invoicing | `billing_periods` | Unified API, hooks, billing period management, approval flow | 1-2 days | [ ] |

---

## Phase 3: Build Missing Features (High Business Value)

These features have NO database tables and NO backend. Full build required.

### Priority 3A: Core Procore Tools

| # | Task | Feature | Procore Reference Data | Work Needed | Est. Effort | Status |
|---|------|---------|----------------------|-------------|-------------|--------|
| 3.1 | Build Transmittals | Transmittals | Crawl data exists (Medium coverage) | Full stack: DB tables, API, hooks, forms, list page | 2-3 days | [ ] |
| 3.2 | Build Emails | Emails | Crawl data exists (Low coverage) | Full stack: DB tables, API, hooks, compose/inbox UI | 3-4 days | [ ] |
| 3.3 | Build Photos | Photos | Crawl data exists (Low coverage) | Full stack: DB tables, API, hooks, upload/gallery UI | 2-3 days | [ ] |

### Priority 3B: Secondary Tools

| # | Task | Feature | Work Needed | Est. Effort | Status |
|---|------|---------|-------------|-------------|--------|
| 3.4 | Build Reporting | Reporting | Report builder UI, data aggregation API, export | 3-5 days | [ ] |
| 3.5 | Build Action Plans | Action Plans | If page exists, assess scope | 1-3 days | [ ] |
| 3.6 | Build Inspections | Inspections | Full stack | 2-3 days | [ ] |
| 3.7 | Build Observations | Observations | Full stack | 1-2 days | [ ] |
| 3.8 | Build Bidding | Bidding | Full stack | 3-5 days | [ ] |
| 3.9 | Build Time & Materials | T&M | Full stack | 2-3 days | [ ] |
| 3.10 | Build Timesheets | Timesheets | Page exists, DB table `timesheets` may exist | 2-3 days | [ ] |

---

## Phase 4: Polish & Architecture (After Core Features Work)

| # | Task | Type | Scope | Est. Effort | Status |
|---|------|------|-------|-------------|--------|
| 4.1 | Add service layer to Budget (extract from components) | Refactor | Budget | 1 day | [ ] |
| 4.2 | Add service layer to Commitments | Refactor | Commitments | 4 hrs | [ ] |
| 4.3 | Add service layer to Change Orders | Refactor | Change Orders | 4 hrs | [ ] |
| 4.4 | Add service layer to Change Events | Refactor | Change Events | 4 hrs | [ ] |
| 4.5 | Add service layer to Schedule | Refactor | Schedule | 4 hrs | [ ] |
| 4.6 | Add service layer to Direct Costs | Refactor | Direct Costs | 4 hrs | [ ] |
| 4.7 | Add service layer to RFIs | Refactor | RFIs | 4 hrs | [ ] |
| 4.8 | Add service layer to Meetings | Refactor | Meetings | 4 hrs | [ ] |
| 4.9 | Add service layer to Prime Contracts | Refactor | Prime Contracts | 4 hrs | [ ] |
| 4.10 | SOV dedicated API and hook (currently piggybacks contracts) | Feature | SOV | 1 day | [ ] |
| 4.11 | Consistent error handling across all API routes | Polish | All | 2-3 days | [ ] |
| 4.12 | E2E tests for all Tier A+B features | Testing | All | 3-5 days | [ ] |
| 4.13 | Client Dashboard functional wiring | Feature | Client Dashboard | 1-2 days | [ ] |

---

## Phase 5: DB Tables Without Features (Optional/Future)

These DB tables exist but may not need immediate frontend work:

| Table Group | Domain | Action Needed |
|-------------|--------|---------------|
| `qtos`, `qto_items` | Quantity Take-Offs | Decide if this is a separate tool or part of Budget |
| `subcontractors` + 3 related tables | Subcontractor CRM | Separate from Directory. Build if needed for prequalification |
| `fm_*` (12 tables) | Facility Management | Specialized domain — defer unless business need |
| `risks`, `decisions`, `issues`, `notes` | Project Intelligence | Could enhance Daily Log or be standalone tools |
| AI/RAG tables (13 tables) | AI Pipeline | Backend infrastructure — may already be functional |

---

## Recommended Execution Order

### Week 1: Foundation
1. **Phase 0** — Fix all immediate issues (half day)
2. **Phase 1A** — Verify Tier A features with `/investigate` (1 day)
3. Fix any critical bugs found in Phase 1A (1-2 days)

### Week 2: Core Verification
4. **Phase 1B** — Verify Tier B features (2 days)
5. Fix critical bugs found in Phase 1B (2-3 days)

### Week 3-4: Build Missing Core
6. **Phase 2.1** — Submittals (highest value — 9 DB tables ready) (2-3 days)
7. **Phase 2.2** — Daily Log (1 day)
8. **Phase 2.3** — Documents (1-2 days)
9. **Phase 2.4** — Invoicing consolidation (1-2 days)

### Week 5-6: Remaining Features
10. **Phase 3A** — Transmittals, Emails, Photos (1 week)
11. **Phase 3B** — Secondary tools as prioritized (ongoing)

### Ongoing
12. **Phase 4** — Service layer refactoring, E2E tests (parallel with feature work)

---

## Total Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 0: Immediate Fixes | 0.5 days | CRITICAL |
| Phase 1: QA Verification | 3-5 days | HIGH |
| Phase 2: Wire Up (DB ready) | 5-8 days | HIGH |
| Phase 3A: Core Missing Features | 7-10 days | MEDIUM |
| Phase 3B: Secondary Features | 15-25 days | LOW |
| Phase 4: Polish/Architecture | 5-8 days | LOW |
| **Total (Phases 0-3A)** | **~16-24 days** | — |
| **Total (Everything)** | **~36-56 days** | — |

---

## How to Use This Document

1. **Start with Phase 0** — Fix the architectural issues first
2. **Run `/investigate` for Phase 1** — This tells you what ACTUALLY works vs what's broken
3. **Update this document** as tasks complete — change `[ ]` to `[x]`
4. **For each Phase 2/3 task**, create a PRP with `/prp-create <feature>` before building
5. **Verify with `/investigate <feature> --retest`** after each feature is built

**This document replaces all previous task lists and provides the single source of truth for project completion.**
