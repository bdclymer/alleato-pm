# Autonomous Multi-Project Workflow Design

**Author:** Claude Code Workflow Analysis
**Created:** 2026-01-09
**Status:** Proposal for Review

---

## Executive Summary

This document proposes a comprehensive workflow system designed to solve two critical challenges:

1. **Tracking everything across multiple parallel projects**
2. **Ensuring agents don't falsely claim work as "completed" or "tested"**

The solution centers on **test-driven verification gates** that prevent progression until work is independently validated.

---

## The Core Problem

### Current Failure Modes

1. **False Completion Claims**: Agents mark tasks "done" without running tests
2. **Untested Code**: Code gets committed without verification
3. **Lost Context**: Work scattered across sessions without clear handoff
4. **Documentation Drift**: Task files become stale or inconsistent
5. **No Independent Verification**: The agent that writes code also "verifies" it

### Root Cause

**There is no hard gate between "I wrote the code" and "This task is complete."**

---

## Proposed Solution: Test-Gated Workflow

### Core Principle

> **No task can be marked "completed" until an independent verification process confirms it works.**

This is not optional guidance—it's an enforcement mechanism.

---

## Folder Structure (Proposed)

```
/documentation/
├── *project-mgmt/                    # Project management hub
│   ├── PROJECT_MONITORING.md          # Master dashboard (existing)
│   ├── VERIFICATION_PROTOCOL.md       # Verification rules (existing)
│   ├── WORKFLOW-DESIGN-PROPOSAL.md    # This document
│   │
│   ├── in-progress/                   # Active projects (Kanban: In Progress)
│   │   ├── change-events/
│   │   │   ├── README.md              # Project index with links
│   │   │   ├── TASKS.md               # Checklists ONLY (no prose)
│   │   │   ├── PROGRESS.md            # Session-by-session updates
│   │   │   ├── crawl/                 # Procore crawl data
│   │   │   │   ├── screenshots/
│   │   │   │   ├── dom-html/
│   │   │   │   ├── sitemap.md
│   │   │   │   └── summary.md
│   │   │   ├── specs/
│   │   │   │   ├── schema.md
│   │   │   │   ├── api-endpoints.md
│   │   │   │   ├── forms.md
│   │   │   │   └── workflows.md
│   │   │   └── test-results/          # Test output artifacts
│   │   │       ├── latest-run.json
│   │   │       └── screenshots/
│   │   │
│   │   ├── change-orders/             # Same structure
│   │   ├── direct-costs/              # Same structure
│   │   └── directory/                 # Same structure
│   │
│   ├── todo/                          # Queued projects (Kanban: To Do)
│   │   ├── commitments/
│   │   └── prime-contracts/
│   │
│   ├── review/                        # Awaiting verification (Kanban: Review)
│   │
│   └── complete/                      # Verified complete (Kanban: Done)
│       └── completion-reports/
│
└── docs/                              # Reference documentation
    ├── database/
    ├── api/
    └── development/
```

### Key Principles

1. **Each project is self-contained** in its folder
2. **TASKS.md contains ONLY checklists** - no explanatory text
3. **specs/ folder has the detailed documentation**
4. **crawl/ folder preserves Procore reference data**
5. **test-results/ captures verification evidence**

---

## TASKS.md Format (Strict Standard)

The TASKS.md file must be **machine-parseable** and **human-scannable**.

### Template

```markdown
# TASKS: [Project Name]

**Project ID:** INI-YYYY-MM-DD-###
**Status:** In Progress | Review | Complete
**Last Verified:** [timestamp] | Never

---

## Phase 1: Foundation
### Database Schema
- [ ] Create migration file for [table_name]
- [ ] Add RLS policies
- [ ] Generate TypeScript types
- **GATE: `npm run typecheck` passes**
- **GATE: Migration applies without errors**

### API Endpoints
- [ ] GET /api/[resource]
- [ ] POST /api/[resource]
- [ ] PUT /api/[resource]/[id]
- [ ] DELETE /api/[resource]/[id]
- **GATE: All endpoints return expected responses**
- **GATE: E2E API tests pass**

---

## Phase 2: Frontend
### List View
- [ ] Create page component
- [ ] Implement data fetching
- [ ] Add table with sorting/filtering
- **GATE: Page loads without console errors**
- **GATE: Visual matches Procore reference**

### Forms
- [ ] Create form component
- [ ] Add validation
- [ ] Connect to API
- **GATE: Form submission creates record**
- **GATE: Form tests pass (npm run test:forms)**

---

## Phase 3: Integration
- [ ] Budget integration
- [ ] Notifications
- **GATE: Full E2E workflow passes**

---

## Verification Summary
| Gate | Status | Last Run | Evidence |
|------|--------|----------|----------|
| Typecheck | | | |
| Lint | | | |
| Unit Tests | | | |
| E2E Tests | | | |
| Visual Match | | | |

---

## Session Log
| Date | Agent | Tasks Completed | Tests Run | Verified |
|------|-------|-----------------|-----------|----------|
| | | | | |
```

### Rules for TASKS.md

1. **Checklists only** - No explanatory paragraphs
2. **GATE markers** - Define what must pass before proceeding
3. **Verification Summary table** - Tracks actual test results
4. **Session Log** - Who worked, what tests ran

---

## Testing as the Backbone

### When Tests Must Run

| Trigger | Required Tests | Gate Type |
|---------|----------------|-----------|
| After writing any code | `npm run typecheck` + `npm run lint` | Hard (blocks commit) |
| After completing a task group | Relevant E2E tests | Soft (logged, not blocking) |
| Before marking phase complete | Full test suite for feature | Hard (blocks progression) |
| Before marking project complete | Full E2E + Visual verification | Hard (blocks completion claim) |

### Test Categories

1. **Code Quality (Always Required)**
   ```bash
   npm run quality --prefix frontend  # Typecheck + Lint
   ```

2. **Unit Tests (Per Feature)**
   ```bash
   npm run test:unit --prefix frontend
   ```

3. **E2E Tests (Per Feature)**
   ```bash
   npx playwright test --grep "change-events"
   ```

4. **Form Tests (Per Form)**
   ```bash
   npm run test:forms --prefix frontend
   ```

5. **Visual Verification (Per Page)**
   ```bash
   npx playwright test --project=visual
   ```

### Verification Levels (From PROJECT_MONITORING.md)

| Level | What It Checks | How It Runs | Required For |
|-------|---------------|-------------|--------------|
| L1: Code Quality | TS + ESLint | `npm run quality` | Every commit |
| L2: Functional | Unit + Integration | `npm run test:unit` | Phase completion |
| L3: Feature | E2E for specific feature | `npx playwright test --grep "feature"` | Phase completion |
| L4: Independent | Different agent verifies | Agent handoff | Project completion |

---

## Agent Session Protocol

### Starting Work

1. **Read PROJECT_MONITORING.md** - Understand current state
2. **Check TASKS.md** - Find next uncompleted item
3. **Register session** in PROJECT_MONITORING.md
4. **Update TASKS.md** with session start

### During Work

1. **After each code change**: Run `npm run quality`
2. **After completing a checkbox**: Run relevant tests
3. **Before claiming "done"**: Ensure GATE conditions pass
4. **Update TASKS.md** with actual test results

### Ending Work

1. **Run full verification for completed items**
2. **Update Verification Summary table**
3. **Log session in Session Log**
4. **Update PROJECT_MONITORING.md**
5. **Commit with clear message**

### Handoff Between Sessions

Each session must leave behind:
- Updated TASKS.md with verified checkboxes
- Test evidence in test-results/
- Session log entry
- Clear "next steps" in PROGRESS.md

---

## Parallel Project Execution

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                  PROJECT_MONITORING.md                       │
│              (Single source of truth)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┬───────────────┐
       │               │               │               │
       ▼               ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Change Events│ │ Change Orders│ │ Direct Costs │ │  Directory   │
│   Session    │ │   Session    │ │   Session    │ │   Session    │
├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤
│ TASKS.md     │ │ TASKS.md     │ │ TASKS.md     │ │ TASKS.md     │
│ (isolated)   │ │ (isolated)   │ │ (isolated)   │ │ (isolated)   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Rules for Parallel Sessions

1. **Each session works on ONE project** at a time
2. **No cross-project dependencies** until integration phase
3. **Each project has its own TASKS.md** and test suite
4. **PROJECT_MONITORING.md** coordinates across all projects
5. **Merge conflicts resolved by timestamp** (latest wins)

### Conflict Avoidance

- Projects work on isolated code paths
- Shared components frozen during parallel work
- Integration happens in dedicated integration phase
- Database migrations numbered sequentially

---

## Verification Agent Protocol

### Purpose

An independent agent (or the same agent in a new session) must verify completion claims.

### Verification Process

```markdown
## Verification Checklist for [Project Name]

### Pre-Verification
- [ ] Read the project's TASKS.md
- [ ] Identify all GATE conditions
- [ ] Pull latest code

### Execute Tests
- [ ] Run: `npm run quality --prefix frontend`
  - Result: [PASS/FAIL]
  - Output: [screenshot or log file]

- [ ] Run: `npm run test:unit --prefix frontend`
  - Result: [PASS/FAIL]
  - Coverage: [X]%

- [ ] Run: `npx playwright test --grep "[project]"`
  - Result: [PASS/FAIL]
  - Tests: [X] passed, [Y] failed

### Browser Verification (Playwright)
- [ ] Navigate to feature page
- [ ] Create new record
- [ ] Edit record
- [ ] Delete record
- [ ] Verify no console errors
- [ ] Screenshot matches Procore reference

### Verdict
- **VERIFIED**: All gates passed
- **FAILED**: [list failures]
- **PARTIAL**: [list what passed/failed]
```

---

## Implementation Roadmap

### Phase 1: Structure Setup (Immediate)
1. Reorganize existing project folders to match new structure
2. Create standardized TASKS.md for each active project
3. Move crawl data into proper locations

### Phase 2: Test Infrastructure
1. Create per-project test patterns (grep selectors)
2. Add npm scripts for project-specific test runs
3. Create verification scripts that output to test-results/

### Phase 3: Automation
1. Add Claude Code hooks for automatic verification
2. Create slash commands for common operations
3. Build reporting dashboards

### Phase 4: Scaling
1. Add more projects to the system
2. Create onboarding templates
3. Document lessons learned

---

## Quick Reference

### Per-Project Documentation Files

| File | Purpose | Update Frequency |
|------|---------|------------------|
| README.md | Index with links to all docs | When structure changes |
| TASKS.md | Checklists only | Every session |
| PROGRESS.md | Session-by-session updates | Every session |
| specs/schema.md | Database design | When schema changes |
| specs/api-endpoints.md | API contracts | When APIs change |
| specs/forms.md | Form specifications | When forms change |
| specs/workflows.md | Business logic flows | When workflows change |
| crawl/sitemap.md | Procore page structure | Initial crawl |
| crawl/summary.md | Implementation notes from crawl | Initial crawl |

### Test Commands Quick Reference

```bash
# Quality gates (run after every change)
npm run quality --prefix frontend

# Project-specific E2E tests
npx playwright test --grep "change-events"
npx playwright test --grep "change-orders"
npx playwright test --grep "direct-costs"
npx playwright test --grep "directory"

# Form tests
npm run test:forms --prefix frontend

# Full test suite
npm run test --prefix frontend

# Visual verification
npm run test:visual --prefix frontend
```

---

## Next Steps

1. **Review this proposal** - Does this structure work for your needs?
2. **Clarify test requirements** - What constitutes a "passing" visual match?
3. **Decide on verification cadence** - After every task? Every phase?
4. **Choose starting project** - Which project should we restructure first?

---

## Questions for Discussion

1. **Crawl Data Retention**: Keep all screenshots, or just key reference images?
2. **Session Length**: How long should a typical agent session be?
3. **Cross-Project Dependencies**: Any shared components between the 4 projects?
4. **Verification Strictness**: Hard block on any failure, or allow "known issues"?
5. **Git Strategy**: One branch per project, or feature branches within main?

---

*This proposal is designed to be iterated. Please provide feedback and we'll refine the approach.*
