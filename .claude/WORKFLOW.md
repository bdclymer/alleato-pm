# Alleato-Procore Feature Development Workflow

## Overview

This document defines the end-to-end workflow for implementing Procore features in the Alleato platform. The workflow follows a **Test-Driven Development (TDD)** approach where test scaffolds are created early and tests run continuously throughout implementation, producing a living evidence log with screenshots.

The methodology is:

> **Observe → Structure → Specify → Test-First → Research → Plan → Build → Validate**

---

## MANDATORY PRE-IMPLEMENTATION RULE

> **BEFORE writing ANY database code, hooks, services, API routes, or migrations:**
>
> 1. **Read the Pattern Registry:** `.claude/PATTERNS.md`
> 2. **Check for a scaffold:** `.claude/scaffolds/crud-resource/`
> 3. **Use the scaffold** if one exists for your pattern (`/scaffold <EntityName>`)
> 4. **Complete the 3-step Supabase Gate** (generate types → read types → confirm schema)
>
> **This is enforced mechanically.** The `enforce-gates.sh` hook will **block all edits** to database-related files until the Supabase Gate is unlocked. There is no override. There is no workaround.
>
> **Why this exists:** Every feature written from scratch repeats the same bugs: wrong FK types (UUID vs INTEGER), missing RLS policies, inconsistent hook patterns, route naming conflicts. Scaffolds and the pattern registry eliminate these by providing validated starting points.
>
> **Incident history:** See `.claude/rules/ROOT-CAUSE-GATE.md` and `.claude/rules/SUPABASE-GATE.md` for the incidents that created this rule.

---

## Workflow Phases

The table below shows the generic command pattern followed by a **concrete example using the Drawings tool** (a pm-tools feature). Replace with your tool's category and name.

| Phase | Name | Generic Command | Example (Drawings) |
|-------|------|-----------------|-------------------|
| 0 | Procore Crawl | `/feature-crawl <feature> <app-url>` | `/feature-crawl drawings https://us02.procore.com/562949954728542/project/drawing_log` |
| 1 | ETL Ingestion | See Phase 1 section below | See Phase 1 section below |
| 2 | Spec Generation | See Phase 2 section below | See Phase 2 section below |
| 3 | Test Scaffold | Write test files + run baseline | `npx playwright test frontend/tests/e2e/drawings.spec.ts --config=frontend/config/playwright/playwright.config.ts` |
| 4 | Research | `/implement-feature <feature> --phase research` | `/implement-feature drawings --phase research` |
| 5 | PRP Creation | `/prp-create <feature>` | `/prp-create drawings` |
| 6 | PRP Quality | `/prp-quality <path/to/prp.md>` | `/prp-quality PRPs/pm-tools/drawings/prp-drawings.md` |
| 7 | PRP Execution | `/prp-execute <path/to/prp.md>` | `/prp-execute PRPs/pm-tools/drawings/prp-drawings.md` |
| 8 | PRP Validation | `/prp-validate <path/to/prp.md>` | `/prp-validate PRPs/pm-tools/drawings/prp-drawings.md` |
| 9 | Final Tests | `npm run quality --prefix frontend && npx playwright test ...` | `npm run quality --prefix frontend && npx playwright test frontend/tests/e2e/drawings*.spec.ts --config=frontend/config/playwright/playwright.config.ts` |

**Tests start at Phase 3 and run continuously through every subsequent phase.**

### Tool Category Reference

Use this table to determine which category folder your tool belongs in:

| Category | Folder | Tools |
|----------|--------|-------|
| Finance | `PRPs/finance-tools/` | budget, commitments, change-orders, direct-costs, invoicing, prime-contracts |
| PM | `PRPs/pm-tools/` | daily-logs, drawings, emails, meetings, photos, punch-list, rfis, scheduling, submittals, transmittals |
| Core | `PRPs/core-tools/` | directory, settings, permissions |

---

## Phase 0: Procore Crawl (Observation)

**Command:** `/feature-crawl <feature-name> <app-url> [support-url]`

**Examples:**

```bash
# Drawings (pm-tools)
/feature-crawl drawings https://us02.procore.com/562949954728542/project/drawing_log

# Budget (finance-tools)
/feature-crawl budget https://us02.procore.com/562949954728542/project/budgets

# Commitments (finance-tools)
/feature-crawl commitments https://us02.procore.com/562949954728542/project/commitments

# Directory (core-tools)
/feature-crawl directory https://us02.procore.com/562949954728542/project/directory

# Scheduling (pm-tools)
/feature-crawl scheduling https://us02.procore.com/562949954728542/project/schedule
```

**Purpose:** Capture the live Procore application UI to create a ground-truth reference of what needs to be rebuilt.

**What happens:**
1. Playwright browser automation logs into Procore
2. Captures full-page screenshots (PNG) for every view
3. Saves complete DOM snapshots (HTML)
4. Extracts structured metadata (JSON): links, dropdowns, tables, forms, buttons
5. Generates sitemap reports and link graphs

**Output location:** `PRPs/<category>/<feature>/crawl-<feature>/`

The PRPs directory is organized by tool category:

```
PRPs/
├── finance-tools/          # Budget, Commitments, Change Orders, Direct Costs, Invoicing, Prime Contracts
├── pm-tools/               # Daily Logs, Drawings, Emails, Meetings, Photos, Punch List, RFIs, Scheduling, Submittals, Transmittals
├── core-tools/             # Directory, Settings, Permissions
└── _shared/                # Cross-cutting patterns and resources
```

Each tool's crawl output is stored inside its own folder:

```
PRPs/<category>/<feature>/
└── crawl-<feature>/
    ├── pages/
    │   └── <page-name>/
    │       ├── screenshot.png
    │       ├── dom.html
    │       └── metadata.json
    ├── reports/
    │   ├── sitemap-table.md
    │   ├── detailed-report.json
    │   └── link-graph.json
    └── README.md
```

**Examples:**

- `PRPs/finance-tools/commitments/crawl-commitments/`
- `PRPs/pm-tools/scheduling/crawl-scheduling/`
- `PRPs/core-tools/directory/crawl-directory/`

**Gate:** Crawl data exists with screenshots, DOM, and metadata for all primary views.

**Status:** Complete for most tools. If crawl data already exists for a feature, skip to Phase 1.

---

## Phase 1: ETL & Supabase Ingestion (Structuring)

**Command:**
```bash
cd scripts/playwright-crawl && \
CRAWL_DIR=/Users/meganharrison/Documents/github/alleato-procore/PRPs/<category>/<feature>/crawl-<feature> \
PROCORE_MODULE=<feature> \
node etl_ingest_procore_crawl.js
```

**Example (Drawings — pm-tools):**

```bash
cd scripts/playwright-crawl && \
CRAWL_DIR=/Users/meganharrison/Documents/github/alleato-procore/PRPs/pm-tools/drawings/crawl-drawings \
PROCORE_MODULE=drawings \
node etl_ingest_procore_crawl.js
```

**Example (Budget — finance-tools):**

```bash
cd scripts/playwright-crawl && \
CRAWL_DIR=/Users/meganharrison/Documents/github/alleato-procore/PRPs/finance-tools/budget/crawl-budget \
PROCORE_MODULE=budget \
node etl_ingest_procore_crawl.js
```

**Example (Directory — core-tools):**

```bash
cd scripts/playwright-crawl && \
CRAWL_DIR=/Users/meganharrison/Documents/github/alleato-procore/PRPs/core-tools/directory/crawl-directory \
PROCORE_MODULE=directory \
node etl_ingest_procore_crawl.js
```

**Purpose:** Transform raw crawl observations into structured, queryable data in Supabase.

**What happens:**
1. Reads crawler metadata JSON files
2. Normalizes system actions (raw UI behaviors) into Supabase tables
3. Promotes system actions to domain commands (canonical operations)
4. Stores UI component inventory, table structures, form fields

**Key Supabase tables populated:**
- `app_crawl_sessions` - Versioned crawl runs
- `app_pages` - UI entry points
- `app_ui_components` - Visual elements
- `app_system_actions` - Raw behavioral actions
- `app_commands` - Canonical domain commands

**Gate:** All crawl data ingested into Supabase. Domain commands promoted from system actions.

---

## Phase 2: Spec Generation (Specification)

**Command:**
```bash
cd scripts/playwright-crawl && \
CRAWL_DIR=/Users/meganharrison/Documents/github/alleato-procore/PRPs/<category>/<feature>/crawl-<feature> \
PROCORE_MODULE=<feature> \
node scripts/generate-procore-module-spec.js
```

**Example (Drawings):**
```bash
cd scripts/playwright-crawl && \
CRAWL_DIR=/Users/meganharrison/Documents/github/alleato-procore/PRPs/pm-tools/drawings/crawl-drawings \
PROCORE_MODULE=drawings \
node scripts/generate-procore-module-spec.js
```

**Example (Budget):**
```bash
cd scripts/playwright-crawl && \
CRAWL_DIR=/Users/meganharrison/Documents/github/alleato-procore/PRPs/finance-tools/budget/crawl-budget \
PROCORE_MODULE=budget \
node scripts/generate-procore-module-spec.js
```

**Example (Directory):**
```bash
cd scripts/playwright-crawl && \
CRAWL_DIR=/Users/meganharrison/Documents/github/alleato-procore/PRPs/core-tools/directory/crawl-directory \
PROCORE_MODULE=directory \
node scripts/generate-procore-module-spec.js
```

**Purpose:** Generate authoritative specification artifacts from structured Supabase data.

**What happens:**

1. Queries `app_system_actions` for all actions with `affects_resource = <module>`
2. Also queries `app_commands` for any promoted canonical commands
3. Classifies actions into commands (buttons/menus), columns (table headers), and tabs
4. Generates five spec artifacts that define what to build

**Output:** `PRPs/<category>/<feature>/spec/`

```
PRPs/<category>/<feature>/
└── spec/
    ├── COMMANDS.md      # Canonical domain commands (what operations exist)
    ├── FORMS.md         # UI form field requirements
    ├── MUTATIONS.md     # Behavior specs (inputs, validation, state changes, side effects)
    └── schema.sql       # Database schema derived from analysis
```

**Artifact descriptions:**
- **COMMANDS.md** - All UI actions discovered from the crawl, plus any promoted canonical commands. Includes discovered table columns with inferred SQL types.
- **FORMS.md** - UI form specifications derived from create/edit actions. Pre-filled with discovered columns. Intentionally incomplete (design decisions happen here).
- **MUTATIONS.md** - Write operations grouped by CRUD type (CREATE, UPDATE, DELETE, READ/export, UI-only). Maps every action to its mutation category.
- **schema.sql** - Database schema auto-generated from discovered table columns. Uses `integer` for `project_id` (matches `projects.id`). Includes RLS policies, indexes, and triggers. Review before applying as migration.

**Also generates:** `README.md` with stats summary and next steps.

**Gate:** All four spec artifacts generated and reviewed. Schema validated against Supabase types gate.

---

## Phase 3: Test Scaffold & Baseline (TDD Foundation)

**Purpose:** Create test infrastructure early so every subsequent phase can be validated with running tests. This is the TDD foundation - tests are written before implementation code.

**Why tests come first:**
- Failing tests define the acceptance criteria concretely
- Every implementation step can be validated immediately
- Prevents the "works on my machine" problem
- Creates a continuous evidence log with screenshots
- Catches regressions as they happen, not at the end

### 3a. Create Test Plan from Specs

Using the spec artifacts from Phase 2, create a test plan:

```
frontend/tests/e2e/<feature>.spec.ts        # E2E acceptance tests
frontend/tests/e2e/<feature>-crud.spec.ts   # CRUD operation tests
frontend/src/__tests__/<feature>/            # Unit test directory
```

**Test categories to scaffold:**
1. **Navigation tests** - Can the user reach the feature page?
2. **List/table tests** - Does the data table render with correct columns?
3. **CRUD tests** - Create, read, update, delete operations work?
4. **Form tests** - Form fields match FORMS.md spec? Validation works?
5. **Filter/sort tests** - Table filtering and sorting functional?
6. **Edge case tests** - Empty states, error states, loading states?

### 3b. Initialize Test Evidence Log

Create the evidence log directory inside the tool's PRPs folder:

```
PRPs/<category>/<feature>/
└── test-evidence/
    ├── log.md                    # Running test evidence log (append-only)
    ├── baseline/                 # Initial screenshots (before implementation)
    │   ├── 001-page-not-found.png
    │   └── ...
    ├── progress/                 # Screenshots during implementation
    │   ├── 001-table-renders.png
    │   ├── 002-create-form.png
    │   └── ...
    └── final/                    # Final passing screenshots
        ├── 001-full-flow.png
        └── ...
```

**Evidence log format** (`log.md`):
```markdown
# Test Evidence Log: <Feature>

## Baseline - [date]
- **Tests written:** 15
- **Tests passing:** 0/15 (expected - no implementation yet)
- **Screenshots:** baseline/001-page-not-found.png
- **Notes:** All tests fail as expected. Ready for implementation.

## Progress - [date] - Phase 7 started
- **Tests passing:** 3/15
- **New passing:** Navigation, page render, empty state
- **Screenshots:** progress/001-table-renders.png
- **Notes:** Basic page structure implemented. Table renders but no data.

## Progress - [date] - CRUD implemented
- **Tests passing:** 10/15
- **New passing:** Create, read, update, delete, list
- **Screenshots:** progress/002-create-form.png, progress/003-list-view.png
- **Notes:** All CRUD operations working. Remaining: filters, edge cases.
```

### 3c. Run Baseline Tests

```bash
# Run tests (all should fail - no implementation exists yet)
npx playwright test frontend/tests/e2e/<feature>.spec.ts \
  --config=frontend/config/playwright/playwright.config.ts

# Capture baseline screenshots
npx playwright test frontend/tests/e2e/<feature>.spec.ts \
  --config=frontend/config/playwright/playwright.config.ts \
  --update-snapshots
```

**Gate:** Test files exist. All tests fail (red phase of TDD). Evidence log initialized with baseline entry.

---

## Phase 4: Research & Analysis (Context Gathering)

**Purpose:** Deep research into the codebase and external resources to prepare for PRP creation.

### 4a. Pattern Registry Review (MANDATORY FIRST STEP)

**Before any other research, read these files in order:**

1. **`.claude/PATTERNS.md`** - The validated pattern registry. Contains every reusable pattern with reference files.
2. **`.claude/scaffolds/README.md`** - Available scaffolds and how to use them.
3. **`frontend/src/types/database.types.ts`** - Current database schema (run `npm run db:types` first).

**Then identify which scaffold applies:**

| Building This | Use This Scaffold |
|--------------|-------------------|
| New CRUD entity with table + API + UI | `.claude/scaffolds/crud-resource/` (all files) |
| New hook for existing table | `.claude/scaffolds/crud-resource/hook.ts` |
| New service for existing table | `.claude/scaffolds/crud-resource/service.ts` |
| New API route for existing resource | `.claude/scaffolds/crud-resource/api-route.ts` |
| New form dialog | `.claude/scaffolds/crud-resource/form-dialog.tsx` |

**If a scaffold exists, you MUST use it.** Do not write the pattern from scratch.

**Verify ALL referenced tables exist in `database.types.ts`:**
- Read TASKS.mdx / ACTIONPLAN.mdx for this feature
- For EVERY table name mentioned (primary tables, related tables, join tables, packages, history, etc.), search `database.types.ts` and confirm it exists
- Record each table as `EXISTS` or `DOES NOT EXIST` — this becomes a fact in the PRP, not a question to resolve during execution
- For tables that don't exist, decide NOW: create via migration, use a placeholder, or descope. Do NOT defer this decision to PRP execution.

### 4b. Procore Documentation Review (MANDATORY)

**Before implementing any Procore tool, review the official Procore tutorials for that tool.**

1. Read `docs/index/PROCORE-TUTORIALS.md` to find the tutorial URL for the feature
2. Fetch and review the Procore tutorial page using `WebFetch`
3. Document key behaviors, terminology, and workflows from the tutorial

**Tutorial URLs:** All 38 Procore tools and their tutorial URLs are in `docs/index/PROCORE-TUTORIALS.md`. Read that file to find the correct URL for the tool you are implementing. Do NOT hardcode URLs here — that file is the single source of truth.

If the tool has no entry in `docs/index/PROCORE-TUTORIALS.md`, search `v2.support.procore.com` for the tool name.

**What to extract from tutorials:**
- Field names and terminology Procore uses (match these exactly in our UI)
- Workflow states and transitions (e.g., Draft → Pending → Approved)
- Required vs optional fields
- Relationships between tools (e.g., Change Events create Change Orders)
- Permission levels and who can do what
- Tab structure and navigation within the tool

**Why this matters:** Procore has specific terminology and workflows. If we don't match them, users familiar with Procore will find the tool confusing. The tutorials are the authoritative source for how each tool should behave.

### 4c. Codebase Analysis

Search the codebase for domain-specific context not covered by the pattern registry:
- Similar features already implemented that share business logic
- Existing TypeScript interfaces and types for related entities
- Existing test patterns for the same category of tool

> **Note:** Generic patterns (hooks, services, API routes, components) are already documented in `.claude/PATTERNS.md`. Do not re-search for these. Only search for feature-specific context.

**READ every file you plan to MODIFY (MANDATORY):**
For each file listed in the "What EXISTS" inventory, you MUST:
1. Read the full file (not just grep for keywords)
2. Document its **current data flow**: Where does it get data? Props from server component? Hook? Direct Supabase query? Inline fetch?
3. Document its **current interface**: What props does it accept? What does it export? What hooks does it use?
4. Document its **current imports**: What dependencies does it pull in?

This information goes directly into the PRP as a "Current State" section for each MODIFY file. Without this, the PRP will make wrong assumptions about how to integrate new code into existing files.

### 4d. Crawl Data Analysis

If crawl data exists from Phase 0:
- Review screenshots for UI requirements
- Extract form fields from metadata
- Map table columns from DOM analysis
- Identify navigation flows from link graphs
- Cross-reference COMMANDS.md with existing codebase capabilities

### 4e. Resolve All Gaps and Ambiguities (MANDATORY)

**Read TASKS.mdx and ACTIONPLAN.mdx for this feature.** For every item that is:
- Marked as a gap, ambiguity, or open question
- Listed as "missing" or "not implemented"
- Flagged with conditional language ("if exists", "check whether", "may need")

**Make a definitive decision NOW and record it as a fact.** Examples:
- "Does `submittal_packages` table exist?" → Search `database.types.ts` → Record: "DOES NOT EXIST — descoped, show placeholder"
- "Does soft delete use a flag or status?" → Check schema → Record: "No `deleted_at` column. Status column is nullable string. Decision: use status='Deleted'"
- "Is detail view in scope?" → Check crawl data + TASKS.mdx → Record: "Detail view IS in scope — add as Task N"

**DO NOT leave conditional logic or unresolved questions for PRP execution.** Every ambiguity resolved here saves 10x the time during implementation.

### 4f. External Research (As Needed)

Research TypeScript/React/Next.js documentation only if the feature requires patterns not already in the codebase:
- Relevant Next.js App Router patterns
- React Query patterns for the data fetching approach
- Supabase client usage patterns
- UI component library (shadcn/ui) patterns

### 4g. Run Tests (TDD Checkpoint)

```bash
# Quick check - should still be 0 passing (no implementation yet)
npx playwright test frontend/tests/e2e/<feature>.spec.ts \
  --config=frontend/config/playwright/playwright.config.ts
```

Update evidence log if any tests now pass due to shared infrastructure changes.

**Gate:** Research documented. Codebase patterns identified. External references collected with URLs.

---

## Phase 5: PRP Creation (Implementation Blueprint)

**Command:** `/prp-create <feature-name>`

**Purpose:** Create a comprehensive Product Requirement Prompt that enables one-pass implementation success.

**What happens:**
1. Reads all research from Phase 4
2. Integrates spec artifacts from Phase 2 (COMMANDS, FORMS, MUTATIONS, schema)
3. Integrates crawl data from Phase 0 (screenshots, metadata)
4. Creates structured PRP following template

**Output:** `PRPs/<category>/<feature>/`

```
PRPs/<category>/<feature>/
├── prp-<feature-name>.md      # Main PRP document
├── TASKS.md                    # Implementation checklist
└── prp-<feature-name>.html    # Browser-viewable version
```

**PRP sections:**
- **Goal** - Feature goal, deliverable, success definition
- **Context** - YAML structure with all references, patterns, gotchas
- **Implementation Tasks** - Dependency-ordered tasks (types → services → components → pages → tests)
- **File Modification Details** - For every file being MODIFIED: current data flow, current interface, what changes, and why. This prevents wrong assumptions about how existing code works.
- **Resolved Decisions** - Every gap/ambiguity from Phase 4e with its resolution and evidence. No conditional logic allowed.
- **Validation Commands** - Actual runnable bash commands (not just checkbox criteria). Must include:
  - `npm run quality --prefix frontend` for typecheck + lint
  - Exact Playwright test commands with `--config` flag
  - Any feature-specific validation commands
- **Validation Gates** - 4-level progressive validation system
- **Final Validation Checklist** - Comprehensive completion criteria

**Critical integration points:**
- COMMANDS.md populates implementation tasks
- MUTATIONS.md provides behavior specifications
- schema.sql becomes the data model section
- Screenshots provide UI component references
- Test scaffold from Phase 3 is referenced in validation gates

**Gate:** PRP created with all sections. Confidence score documented.

---

## Phase 6: PRP Quality Gate (Blueprint Validation)

**Command:** `/prp-quality <path/to/prp.md>`

**Purpose:** Validate the PRP meets quality standards before execution. Minimum 8/10 confidence score required.

**Validation phases:**
1. **Structural** - All required sections present and populated
2. **Context completeness** - "No Prior Knowledge" test passes
3. **Information density** - All references specific and actionable
4. **Implementation readiness** - Tasks properly ordered with dependencies
5. **Validation gates dry-run** - 4-level system properly configured

**Output:** Quality validation report with scores and specific improvement recommendations.

**Gate:** Overall confidence score >= 8/10. All critical issues resolved.

---

## Phase 7: PRP Execution (Implementation)

**Command:** `/prp-execute <path/to/prp.md>`

**Purpose:** Transform the PRP into working code.

**Process:**
1. Load and absorb PRP context
2. **Read `.claude/PATTERNS.md` and identify which scaffolds to use**
3. **Complete the 3-step Supabase Gate** (generate types → read types → confirm schema)
4. Plan implementation following task dependency order
5. **Generate boilerplate from scaffolds** (`/scaffold <EntityName>`)
6. Customize scaffolded code for domain-specific needs
7. Execute remaining tasks: types → services → hooks → components → pages
8. Progressive validation at each level

> **CRITICAL:** Steps 2-3 are enforced by `enforce-gates.sh`. If you skip them, all edits to database-related files will be blocked. This is not optional.

### 7a. TASKS.md Sync Rule (MANDATORY)

**TASKS.md is the single source of truth for what is done and what isn't.**

Rules:

1. **Update TASKS.md in the same step as the work.** Do not batch updates. When you finish implementing a task, update TASKS.md immediately before moving to the next task.
2. **Never mark `[x]` without evidence.** Each checked item must include a one-line evidence note:

   ```markdown
   - [x] Create schedule_tasks migration — ✅ migration `20260128_schedule_tasks.sql` applied, types regenerated
   - [x] Implement useScheduleTasks hook — ✅ `frontend/src/hooks/use-schedule-tasks.ts` created, unit test passing
   - [ ] Build ScheduleTaskFormDialog — pending
   ```

3. **Add a Session Log entry after every task.** Append to the bottom of TASKS.md:

   ```markdown
   ## Session Log

   ### 2026-01-28 14:30 - Migration created
   - Completed: Create schedule_tasks migration
   - Evidence: `supabase/migrations/20260128_schedule_tasks.sql` exists, `npm run db:types` succeeded
   - Tests passing: 0/15 (expected - no UI yet)

   ### 2026-01-28 15:00 - Hook implemented
   - Completed: Implement useScheduleTasks hook
   - Evidence: `frontend/src/hooks/use-schedule-tasks.ts` created, unit test `use-schedule-tasks.test.ts` passes
   - Tests passing: 2/15
   ```

### 7b. Implement → Verify → Check Off Loop

For each task in TASKS.md, follow this exact loop:

```text
┌─────────────────────────────────────┐
│  1. IMPLEMENT the task              │
│     (write the code)                │
├─────────────────────────────────────┤
│  2. VERIFY with a separate agent    │
│     /verify-task or /verify         │
│     (independent confirmation)      │
├─────────────────────────────────────┤
│  3. RUN TESTS                       │
│     npx playwright test ...         │
│     npm run quality --prefix frontend│
├─────────────────────────────────────┤
│  4. UPDATE TASKS.md                 │
│     Mark [x] with evidence note     │
│     Append Session Log entry        │
├─────────────────────────────────────┤
│  5. UPDATE evidence log             │
│     Append test results + screenshot│
└─────────────────────────────────────┘
         ↓ repeat for next task
```

**The verification step (step 2) MUST be a separate agent.** The agent that wrote the code cannot be the one that confirms it works. This is the primary anti-hallucination mechanism:

```bash
# After implementing a task, spawn a verification agent:
/verify-task "Implemented useScheduleTasks hook with CRUD operations"

# Or for quick verification:
/verify
```

The verification agent will:

- Check that the file actually exists
- Run TypeScript compilation to confirm no type errors
- Run the relevant test(s) and capture output
- Confirm the implementation matches TASKS.md description

**If verification fails:** Do not check off the task. Fix the issue, re-verify, then update.

### 7c. TDD Integration - Test After Every Milestone

After each implementation milestone, run the test suite and update the evidence log:

```bash
# After implementing data layer (migration, service, hook)
npx playwright test frontend/tests/e2e/<feature>.spec.ts \
  --config=frontend/config/playwright/playwright.config.ts
# Update evidence log: "Data layer complete. Tests passing: X/Y"

# After implementing UI layer (components, pages)
npx playwright test frontend/tests/e2e/<feature>.spec.ts \
  --config=frontend/config/playwright/playwright.config.ts
# Update evidence log: "UI layer complete. Tests passing: X/Y"
# Capture screenshot: progress/003-ui-complete.png

# After implementing business logic (forms, validation, CRUD)
npx playwright test frontend/tests/e2e/<feature>.spec.ts \
  --config=frontend/config/playwright/playwright.config.ts
# Update evidence log: "Business logic complete. Tests passing: X/Y"
```

### 7d. Progressive Validation Levels

- Level 1: TypeScript compilation, ESLint, Prettier
- Level 2: Unit tests for hooks and services
- Level 3: Integration tests (dev server, API routes, build)
- Level 4: E2E tests, accessibility, performance

**Gate:** All PRP implementation tasks checked off in TASKS.md with evidence notes. Session Log has entries for every task. Progressive validation passed at all 4 levels.

---

## Phase 8: PRP Validation (Requirement Verification)

**Command:** `/prp-validate <path/to/prp.md>`

**Purpose:** Independently verify all PRP requirements are met. Treat this as a skeptical audit.

**Validation phases:**
1. **Technical** - Run all test commands, linting, type checking
2. **Feature** - Verify goal achievement, success criteria, manual testing
3. **Code quality** - Pattern compliance, anti-pattern avoidance, dependency management
4. **Documentation & deployment** - Code documentation, configuration, production readiness

**Output:** Comprehensive validation report with pass/fail for every criterion.

**Gate:** Validation report shows PASSED status. All success criteria met.

---

## Phase 9: Final Test Suite & Playwright (Comprehensive Testing)

**Purpose:** Run the complete test suite, capture final evidence, and close the evidence log.

### 9a. Run Full Test Suite

```bash
# Full E2E test run
npx playwright test frontend/tests/e2e/<feature>*.spec.ts \
  --config=frontend/config/playwright/playwright.config.ts

# Unit tests
npm run test:unit --prefix frontend

# Type checking
npm run typecheck --prefix frontend

# Linting
npm run lint --prefix frontend

# Full quality check
npm run quality --prefix frontend

# Production build
npm run build --prefix frontend
```

### 9b. Capture Final Evidence

```bash
# Run tests with trace and screenshot capture for evidence
npx playwright test frontend/tests/e2e/<feature>*.spec.ts \
  --config=frontend/config/playwright/playwright.config.ts \
  --trace on \
  --screenshot on
```

Move final screenshots to `PRPs/<category>/<feature>/test-evidence/final/`.

### 9c. Close Evidence Log

Add final entry to `PRPs/<category>/<feature>/test-evidence/log.md`:

```markdown
## Final - [date]
- **Tests passing:** 15/15
- **Quality gate:** PASSED (typecheck, lint, build)
- **Screenshots:** final/001-full-flow.png, final/002-crud-complete.png
- **Playwright traces:** [link to trace files]
- **Notes:** All acceptance criteria met. Feature ready for review.
```

### 9d. Compare with Procore Reference

Side-by-side comparison of:
- Procore screenshots (from Phase 0 crawl)
- Alleato screenshots (from final evidence)

Document any intentional differences and parity status.

**Gate:** All tests pass. Evidence log complete. Quality gates pass. Build succeeds.

---

## Evidence Log System

### Purpose

The evidence log provides a **continuous, append-only record** of test results and visual proof throughout development. It serves as:

1. **Progress tracking** - See test count increase over time
2. **Regression detection** - Notice if passing tests start failing
3. **Visual proof** - Screenshots prove the feature works
4. **Debug history** - When something breaks, the log shows when it last worked
5. **Review artifact** - Reviewers can trace the development journey

### Directory Structure

Evidence lives alongside each tool's crawl data and PRP documents:

```
PRPs/
├── finance-tools/
│   ├── budget/
│   │   ├── crawl-budget/          # Phase 0 crawl output
│   │   ├── spec/                  # Phase 2 spec artifacts
│   │   ├── test-evidence/         # TDD evidence log
│   │   │   ├── log.md
│   │   │   ├── baseline/
│   │   │   ├── progress/
│   │   │   └── final/
│   │   ├── prp-budget.md          # Phase 5 PRP document
│   │   └── TASKS.md               # Implementation checklist
│   └── commitments/
│       ├── crawl-commitments/
│       ├── spec/
│       ├── test-evidence/
│       └── ...
├── pm-tools/
│   ├── scheduling/
│   │   ├── crawl-scheduling/
│   │   ├── spec/
│   │   ├── test-evidence/
│   │   └── ...
│   └── ...
└── core-tools/
    └── directory/
        ├── crawl-directory/
        ├── spec/
        ├── test-evidence/
        └── ...
```

Everything for a tool lives in one place: crawl data, specs, PRP, tasks, and test evidence.

### When to Update the Log

| Event | Action |
|-------|--------|
| Tests scaffolded (Phase 3) | Create log, add baseline entry |
| Research complete (Phase 4) | Quick test run, note any changes |
| Each implementation milestone (Phase 7) | Run tests, capture screenshots, append entry |
| Validation complete (Phase 8) | Run full suite, append results |
| Final test run (Phase 9) | Close log with final entry |

### Screenshot Naming Convention

```
<NNN>-<description>.png

Examples:
001-page-not-found.png       (baseline - no implementation)
002-table-renders-empty.png   (progress - table shows but no data)
003-create-form-open.png      (progress - form dialog works)
004-list-with-data.png        (progress - CRUD working)
005-filters-applied.png       (progress - filtering works)
006-full-flow-complete.png    (final - everything works)
```

---

## Quick Reference: Commands by Phase

**Example tool: Drawings (pm-tools)**

All commands below use Drawings as the example. Replace `pm-tools/drawings` with your tool's category/name.

| Phase | What to Run | Example (Drawings) |
|-------|-------------|-------------------|
| 0 | Crawl Procore UI | `/feature-crawl drawings https://us02.procore.com/562949954728542/project/drawing_log` |
| 1 | Ingest to Supabase | `cd scripts/playwright-crawl && CRAWL_DIR=/Users/meganharrison/Documents/github/alleato-procore/PRPs/pm-tools/drawings/crawl-drawings PROCORE_MODULE=drawings node etl_ingest_procore_crawl.js` |
| 2 | Generate specs | `cd scripts/playwright-crawl && CRAWL_DIR=/Users/meganharrison/Documents/github/alleato-procore/PRPs/pm-tools/drawings/crawl-drawings PROCORE_MODULE=drawings node scripts/generate-procore-module-spec.js` |
| 3 | TDD foundation | Write `frontend/tests/e2e/drawings.spec.ts`, then run: `npx playwright test frontend/tests/e2e/drawings.spec.ts --config=frontend/config/playwright/playwright.config.ts` |
| 4 | Research | `/implement-feature drawings --phase research` |
| 5 | Create PRP | `/prp-create drawings` |
| 6 | Quality gate | `/prp-quality PRPs/pm-tools/drawings/prp-drawings.md` |
| 7 | Execute PRP | `/prp-execute PRPs/pm-tools/drawings/prp-drawings.md` |
| 8 | Validate PRP | `/prp-validate PRPs/pm-tools/drawings/prp-drawings.md` |
| 9 | Final tests | `npm run quality --prefix frontend && npx playwright test frontend/tests/e2e/drawings*.spec.ts --config=frontend/config/playwright/playwright.config.ts` |

---

## Phase Dependencies

```
Phase 0 (Crawl)
    ↓
Phase 1 (ETL/Supabase)
    ↓
Phase 2 (Spec Generation)
    ↓
Phase 3 (Test Scaffold) ←── TDD: tests exist before any implementation
    ↓
Phase 4 (Research) ←── tests run as checkpoint
    ↓
Phase 5 (PRP Create) ←── references test scaffold in validation gates
    ↓
Phase 6 (PRP Quality) ←── verifies test plan is part of PRP
    ↓
Phase 7 (PRP Execute) ←── TDD: run tests after every milestone
    ↓
Phase 8 (PRP Validate) ←── runs test suite as part of validation
    ↓
Phase 9 (Final Tests) ←── comprehensive suite + evidence close
```

**Key principle:** Tests are not a phase at the end. Tests are a continuous practice that starts in Phase 3 and runs at every subsequent phase.

---

## Anti-Hallucination Rules

These rules exist because AI agents will claim tasks are complete when they aren't. This has happened repeatedly. These rules are non-negotiable.

### Rule 1: Separate Implementer and Verifier

The agent that writes the code **cannot** be the agent that confirms it works. After every task, spawn a separate verification agent (`/verify-task` or `/verify`). The verifier assumes the implementer is wrong until proven otherwise.

### Rule 2: Evidence or It Didn't Happen

A task is not done unless there is concrete, machine-verifiable evidence:

| Evidence Type | Example |
|---------------|---------|
| File exists | `ls frontend/src/hooks/use-schedule-tasks.ts` returns the file |
| Types compile | `npm run typecheck --prefix frontend` exits 0 |
| Test passes | `npx playwright test <spec>` shows green |
| Build succeeds | `npm run build --prefix frontend` exits 0 |
| Query returns data | Supabase query returns expected rows |

**Not evidence:** "I created the file", "the hook should work", "this follows the pattern". These are claims, not proof. Run the command and show the output.

### Rule 3: TASKS.md Updated Synchronously

TASKS.md must be updated **in the same step** as the implementation. Not after. Not in a batch. Not at the end of the session. The sequence is:

1. Do the work
2. Verify the work (separate agent)
3. Update TASKS.md with `[x]` and evidence note
4. Append Session Log entry
5. Then and only then move to the next task

If the session ends unexpectedly, TASKS.md reflects exactly what was done and what wasn't.

### Rule 4: Session Log is Append-Only

The Session Log at the bottom of TASKS.md is append-only. Never edit or remove previous entries. This creates an audit trail that shows:

- What was done in each session
- What evidence was captured
- How many tests were passing at each checkpoint
- When regressions were introduced

### Rule 5: Verification Catches These Specific Hallucinations

| Hallucination | How Verification Catches It |
|---------------|----------------------------|
| "File created" but file doesn't exist | Verifier runs `ls` on the path |
| "Tests pass" but they don't | Verifier runs the actual test command |
| "Types compile" but they don't | Verifier runs `npm run typecheck` |
| "Hook works" but it has runtime errors | Verifier checks dev server console |
| "Migration applied" but table missing | Verifier runs `npm run db:types` and reads output |
| "Matches Procore UI" but layout is wrong | Verifier captures screenshot and compares |

### Rule 6: Stale TASKS.md Detection

If TASKS.md has not been updated in the current session but work has been done, something is wrong. Before ending any session:

1. Read TASKS.md
2. Compare checked items against actual file system state
3. If there's a mismatch, update TASKS.md to reflect reality
4. Add a Session Log entry documenting the reconciliation

---

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|-------------|-------------|-----------------|
| **Writing hooks/services from scratch** | **Same bugs every time: wrong FK types, missing RLS, inconsistent patterns** | **Read `.claude/PATTERNS.md`, use `/scaffold`, customize** |
| **Skipping schema verification** | **UUID/INTEGER mismatches, missing columns, stale types** | **Complete 3-step Supabase Gate before any DB code** |
| **Ignoring pattern registry** | **Reinvents validated patterns poorly** | **Read `.claude/PATTERNS.md` first, copy reference files** |
| Writing tests last | Bugs discovered too late, rework required | Write test scaffolds in Phase 3, run continuously |
| Skipping the crawl | Guessing at Procore UI leads to wrong implementation | Always start with observation data |
| Skipping PRP quality gate | Low-quality PRPs fail during execution | Enforce 8/10 minimum confidence |
| Not updating evidence log | No proof of progress, regressions go unnoticed | Append after every milestone |
| Implementing without specs | Ad-hoc development misses requirements | Generate specs from structured data first |
| Running tests only in CI | Feedback loop too slow during development | Run locally after every change |
| Self-verifying work | Implementer claims done without proof | Spawn separate verification agent after each task |
| Batch-updating TASKS.md | File goes stale, progress is lost if session crashes | Update synchronously with each task completion |
| Marking `[x]` without evidence | No way to confirm what's actually done | Require evidence note on every checked item |
| Skipping Session Log | No audit trail, hallucinations go undetected | Append entry after every task with evidence + test count |

---

## Glossary

| Term | Definition |
|------|-----------|
| **TDD** | Test-Driven Development. Write tests first, then implement code to make them pass. |
| **PRP** | Product Requirement Prompt. A comprehensive document that enables one-pass implementation by an AI agent. |
| **Domain Command** | A canonical, normalized operation the system supports (e.g., `create_task`, `edit_commitment`). |
| **System Action** | A raw, observed UI behavior from crawling (e.g., "Edit button clicked"). |
| **Evidence Log** | Append-only record of test results and screenshots tracking development progress. |
| **Spec Artifacts** | Generated files (COMMANDS.md, FORMS.md, MUTATIONS.md, schema.sql) that define what to build. |
| **Crawl Data** | Screenshots, DOM snapshots, and metadata captured from the live Procore application. |
| **Progressive Validation** | 4-level validation system (syntax → unit → integration → E2E) where each level must pass before the next. |
