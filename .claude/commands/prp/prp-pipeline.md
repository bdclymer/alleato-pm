# README - PRP Pipeline

## Which Workflow Do I Use?

| Situation | Workflow |
|-----------|----------|
| Building a brand new feature from scratch | **Workflow A: New Feature** |
| Feature has existing code but is broken or incomplete | **Workflow B: Fix / Complete** |
| Just need to run and fix tests for an existing feature | Run `/prp-test <feature>` directly |
| **Want hands-off automation (recommended)** | **`/prp-pipeline <feature-name>`** |

---

## Automated: `/prp-pipeline <feature-name>`

**One command, no babysitting.** Auto-detects whether to run Workflow A or B, then executes all phases using separate sub-agents with gate checks between each.

```
You run:     /prp-pipeline punch-list
             ↓
Orchestrator detects: no existing code → Workflow A
             ↓
Phase 1:     Sub-agent runs /prp-create        → gate: PRP file exists?
Phase 2:     Sub-agent runs /prp-quality        → gate: score ≥ 8/10?
Phase 3:     Sub-agent runs /prp-execute        → gate: TASKS.md complete, tsc clean?
Phase 4:     Sub-agent runs /prp-test           → gate: all tests passing?
Phase 5:     Sub-agent runs /prp-validate       → gate: PASSED?
             ↓
Pipeline complete — summary report produced
```

**On failure:** Each phase gets one automatic retry with the error context. If it still fails after retry, the pipeline stops and reports what went wrong.

---

## Workflow A: New Feature

Use when there is no existing code for this feature.

```plain text
Step 1    /prp-create <feature-name>
          ↓
Step 2    /prp-quality <path/to/prp.md>
          ↓
Step 3    /prp-execute <path/to/prp.md>
          ↓
Step 4    /prp-test <feature-name>
          ↓
Step 5    /prp-validate <path/to/prp.md>
```

### Step 1: `/prp-create <feature-name>`

**What it does:** Researches the codebase and creates a comprehensive PRP document.

- Generates fresh Supabase types and reviews the database schema
- Reads the incident log for past mistakes related to this feature type
- Checks for Procore crawl data in `docs/PRPs/<feature>/crawl/`
- Explores the codebase for similar features to use as patterns
- Produces three files in `docs/PRPs/<feature>/`:
  - `prp-<feature>.md` — the full PRP document
  - `TASKS.md` — implementation checklist (live tracker)
  - `prp-<feature>.html` — browser-viewable version

**Output:** PRP document ready for quality review.

### Step 2: `/prp-quality <path/to/prp.md>`

**What it does:** Validates the PRP is complete enough for one-pass implementation.

- Checks all template sections are filled (Goal, Why, What, Context, Tasks, Validation)
- Runs the "No Prior Knowledge" test
- Verifies file references exist and URLs are accessible
- Scores 1-10 on context completeness, information density, implementation readiness, validation quality
- Minimum 8/10 required to proceed

**Output:** APPROVED (proceed to Step 3) or NEEDS REVISION (fix and re-run Step 2).

### Step 3: `/prp-execute <path/to/prp.md>`

**What it does:** Implements the feature following the PRP.

- Reads TASKS.md, CLAUDE.md, and all relevant project rules
- Uses `/create-feature` scaffold for new CRUD entities (never writes from scratch)
- Generates Supabase types before any database code
- Follows PRP task order, updates TASKS.md after each completed task
- Runs progressive validation (TypeScript, lint, route checks, query tests)
- Writes E2E tests meeting project standards (Create, Read, Edit, Delete, Validation)

**Output:** Implemented feature code with TASKS.md updated. Tests are written but not yet run.

### Step 4: `/prp-test <feature-name>`

**What it does:** Runs ALL tests, fixes failures, re-runs until everything passes.

- Starts the dev server
- Runs TypeScript compilation and lint
- Runs route conflict check
- Runs Playwright E2E tests with actual output shown
- If any test fails: diagnoses, fixes, re-runs (up to 3 attempts per failure)
- Verifies E2E tests meet standards (not smoke tests)
- Runs production build

**Output:** All tests passing with actual Playwright output in the conversation. Fix history documented.

### Step 5: `/prp-validate <path/to/prp.md>`

**What it does:** Final verification that everything is complete and correct.

- Checks TASKS.md — all tasks must be marked `[x]`
- Runs TypeScript, lint, route check, Supabase types freshness, production build
- Tests Supabase queries with actual `node -e` execution
- Confirms `/prp-test` was already run (does NOT run tests itself)
- Verifies E2E test coverage meets CRUD standards
- Checks code pattern compliance (page headers, route naming, file organization)
- Produces structured validation report

**Output:** Validation report with PASSED / FAILED status and confidence score.

---

## Workflow B: Fix / Complete Existing Feature

Use when the feature has existing code that is broken, incomplete, or both.

```
Step 1    /prp-audit <feature-name>
          ↓
Step 2    /prp-execute <path/to/fix-prp.md>
          ↓
Step 3    /prp-test <feature-name>
          ↓
Step 4    /prp-validate <path/to/fix-prp.md>
```

### Step 1: `/prp-audit <feature-name>`

**What it does:** Audits the existing code to find what works, what's broken, and what's missing.

- Discovers all existing artifacts (pages, routes, components, hooks, tests, PRP docs, DB tables)
- Runs every validation check (TypeScript, lint, routes, query tests, E2E tests, dev server)
- Categorizes everything into Working / Broken / Missing
- Generates a targeted fix PRP (`prp-<feature>-fix.md`) that only covers gaps
- Generates TASKS.md with only fix/completion tasks (nothing for what already works)

**Output:** Gap analysis + targeted fix PRP + TASKS.md. No `/prp-quality` needed — the audit itself is the quality check.

### Step 2: `/prp-execute <path/to/fix-prp.md>`

**Same as Workflow A Step 3**, but with fix PRP behavior:

- Reads the "Working (DO NOT TOUCH)" section and leaves those files alone
- Uses existing working code as pattern reference instead of scaffolds
- Only creates new files if explicitly called for in the "Missing" section
- Focuses on fixing broken items first, then building missing items

### Step 3: `/prp-test <feature-name>`

**Same as Workflow A Step 4.** Runs all tests, fixes failures, re-runs until passing.

### Step 4: `/prp-validate <path/to/fix-prp.md>`

**Same as Workflow A Step 5.** Final verification.

---

## Command Quick Reference

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| **`/prp-pipeline`** | **Full automated workflow** | **Feature name** | **Everything — hands-off** |
| `/prp-create` | Research + write PRP | Feature name | PRP + TASKS.md + HTML |
| `/prp-quality` | Validate PRP completeness | Path to PRP | APPROVED or NEEDS REVISION |
| `/prp-audit` | Audit existing feature | Feature name | Gap analysis + fix PRP + TASKS.md |
| `/prp-execute` | Implement from PRP | Path to PRP | Working code + updated TASKS.md |
| `/prp-test` | Run tests + fix failures | Feature name | All tests passing |
| `/prp-validate` | Final verification | Path to PRP | Validation report |

---

## File Locations

| File | Location |
|------|----------|
| PRP documents | `docs/PRPs/<feature>/` |
| TASKS.md | `docs/PRPs/<feature>/TASKS.md` |
| Crawl data | `docs/PRPs/<feature>/crawl/` |
| Fix PRPs | `docs/PRPs/<feature>/prp-<feature>-fix.md` |
| Scaffolds | `.claude/scaffolds/crud-resource/` |
| PRP template | `.claude/templates/TEMPLATE-PRP.md` |
| Tasks template | `.claude/templates/tasks_template.md` |
| Incident log | `docs/patterns/INCIDENT-LOG.md` |
| Pattern files | `docs/patterns/` |
| Project rules | `.claude/rules/` |
| E2E tests | `frontend/tests/e2e/` |
| Playwright auth | `frontend/tests/.auth/user.json` |

---

## Rules That Apply to All Commands

These are enforced by CLAUDE.md and `.claude/rules/`. Every command inherits them.

1. **Supabase Types Gate** — Run `npm run db:types` before any database code
2. **Route Naming Gate** — Use `[projectId]`, `[contractId]`, etc. Never `[id]`
3. **Scaffolding Gate** — Use `/create-feature` for new CRUD entities
4. **Authentication Gate** — Playwright auth is automatic. Never ask user to log in
5. **Next.js Cache Gate** — Clear `.next` cache when creating new routes
6. **Root Cause Gate** — Gather runtime evidence before modifying code
7. **E2E Testing Standards** — Tests must be real CRUD workflows, not smoke tests
8. **Use Available Tools** — Use MCP/CLI tools, don't tell user to run things manually
