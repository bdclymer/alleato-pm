# README - PRP Pipeline

## Which Workflow Do I Use?

All features — new or existing — use the same Procore-First workflow.

| Situation | Command |
|-----------|---------|
| **Hands-off automation (recommended)** | **`/prp-pipeline <feature-name>`** |
| Step-by-step manual | Run each step below in order |

---

## Automated: `/prp-pipeline <feature-name>`

**One command, no babysitting.** Runs all phases using separate sub-agents with gate checks between each.

```
You run:     /prp-pipeline punch-list
             ↓
Phase 1:     Sub-agent runs /prp-create           → gate: PRP file exists, score ≥ 8/10?
Phase 2:     Sub-agent runs /prp-test-scenarios   → gate: TEST-SCENARIOS.md exists?
Phase 3:     Sub-agent runs /prp-audit            → gate: AUDIT.md + TASKS.md exist?
Phase 4:     Sub-agent runs /prp-execute          → gate: TASKS.md complete, tsc clean?
Phase 5:     Sub-agent runs /prp-validate         → gate: PASSED?
             ↓
Pipeline complete — summary report produced
```

**On failure:** Each phase gets one automatic retry with the error context. If it still fails after retry, the pipeline stops and reports what went wrong.

---

## Workflow: Procore-First (All Features)

Use this workflow for all features — new or existing.

```
Step 1    /prp-create <feature-name>         ← What does Procore do?
          ↓
Step 2    /prp-test-scenarios <feature-name> ← What should users be able to do?
          ↓
Step 3    /prp-audit <feature-name>          ← What's built vs what's missing?
          ↓
Step 4    /prp-execute PRPs/<feature>/prp-<feature>.md
          ↓
Step 5    /prp-validate PRPs/<feature>/prp-<feature>.md
```

### Step 1: `/prp-create <feature-name>`

**What it does:** Researches Procore functionality and creates the feature spec.

- Reads planning artifacts (`_bmad-output/planning-artifacts/<feature>/`) as supplemental context only
- Reads Procore manifest (`.claude/procore-manifests/<feature>/`) as primary UI structure source
- Runs `procore-docs-rag` queries for business rules, workflows, and statuses
- WebFetches Procore support articles for anything still unclear
- Produces `PRPs/<feature>/prp-<feature>.md` — what Procore does and what we need to build

**Output:** PRP answering "what to build" based on Procore. No codebase analysis. No schema analysis.

### Step 2: `/prp-test-scenarios <feature-name>`

**What it does:** Generates human-readable Given/When/Then test scenarios from the PRP.

- Reads `PRPs/<feature>/prp-<feature>.md` as the source of truth
- Reads `PRPs/<feature>/AUDIT.md` if it exists (to know what's already implemented)
- Produces scenarios across 10 groups: Navigation, Create, Edit, Detail View, Status Workflows, List Features, Row Actions, Business Rules, Integrations, Error States
- Marks each scenario "Ready to test" or "Blocked (requires: {item})"

**Output:** `PRPs/<feature>/TEST-SCENARIOS.md` — acceptance criteria for the feature, not Playwright scripts.

### Step 3: `/prp-audit <feature-name>`

**What it does:** Compares the PRP spec against the current implementation.

- Reviews database schema — tables, columns, FK types (INTEGER vs UUID)
- Analyzes codebase — pages, API routes, components, hooks
- Reviews incident log for applicable guardrails
- Categorizes every PRP requirement as ✅ implemented / 🟡 partial / 🔴 missing

**Output:** `PRPs/<feature>/AUDIT.md` (gap analysis) + `PRPs/<feature>/TASKS.md` (ordered implementation tasks).

### Step 4: `/prp-execute PRPs/<feature>/prp-<feature>.md`

**What it does:** Implements the feature following the PRP and TASKS.md.

- Reads TASKS.md, AUDIT.md, CLAUDE.md, and all relevant project rules
- Invokes `supabase-postgres-best-practices` skill for any Supabase-related tasks
- Audits existing Supabase code before writing new code
- Uses `/create-feature` scaffold for new CRUD entities (never writes from scratch)
- Generates Supabase types before any database code
- Follows TASKS.md phase order, checks off tasks as completed
- Runs progressive validation (TypeScript, lint, route checks)

**Output:** Implemented feature code with TASKS.md updated (all items checked).

### Step 5: `/prp-validate PRPs/<feature>/prp-<feature>.md`

**What it does:** Final verification — both technical correctness AND Procore behavioral compliance.

- **Technical gates:** TASKS.md complete, TypeScript errors = 0, lint errors = 0, routes clean
- **Procore compliance:** RAG spot-check + manifest spot-check (status values, required fields, list columns)
- **Browser verification:** screenshots + videos required (minimum 4 each) via agent-browser
  - Required videos: `create-happy-path.webm`, `edit-prefill.webm`, `validation-errors.webm`, `status-workflow.webm`
- **DB field-level validation:** every field checked after create (not just "record exists")
- **Edit pre-fill check:** all dropdowns must show saved values, not "Select..."

**Output:** `PRPs/<feature>/VALIDATION-REPORT.md` with PASS / FAIL status and confidence score.

---

## Command Quick Reference

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| **`/prp-pipeline`** | **Full automated workflow** | **Feature name** | **Everything — hands-off** |
| `/prp-create` | Procore research → feature spec | Feature name | `prp-<feature>.md` |
| `/prp-test-scenarios` | Generate user-facing test cases | Feature name | `TEST-SCENARIOS.md` |
| `/prp-audit` | Gap analysis: built vs missing | Feature name | `AUDIT.md` + `TASKS.md` |
| `/prp-execute` | Implement from PRP + audit | Path to PRP | Working code + updated TASKS.md |
| `/prp-validate` | Final verification with browser evidence | Path to PRP | `VALIDATION-REPORT.md` |

---

## File Locations

| File | Location |
|------|----------|
| PRP documents | `PRPs/<feature>/` |
| TASKS.md | `PRPs/<feature>/TASKS.md` |
| AUDIT.md | `PRPs/<feature>/AUDIT.md` |
| TEST-SCENARIOS.md | `PRPs/<feature>/TEST-SCENARIOS.md` |
| VALIDATION-REPORT.md | `PRPs/<feature>/VALIDATION-REPORT.md` |
| Verify output (screenshots/videos) | `verify-output/<feature>/` |
| Scaffolds | `.claude/scaffolds/crud-resource/` |
| PRP template | `.claude/templates/TEMPLATE-PRP.md` |
| Incident log | `docs/patterns/INCIDENT-LOG.md` |
| Pattern files | `docs/patterns/` |
| Project rules | `.claude/rules/` |
| Procore manifests | `.claude/procore-manifests/<feature>/` |
| Planning artifacts | `_bmad-output/planning-artifacts/<feature>/` |

---

## Rules That Apply to All Commands

These are enforced by CLAUDE.md and `.claude/rules/`. Every command inherits them.

1. **Supabase Types Gate** — Run `npm run db:types` before any database code
2. **Route Naming Gate** — Use `[projectId]`, `[contractId]`, etc. Never `[id]`
3. **Scaffolding Gate** — Use `/create-feature` for new CRUD entities
4. **Authentication Gate** — Playwright auth is automatic. Never ask user to log in
5. **Next.js Cache Gate** — Clear `.next` cache when creating new routes
6. **Root Cause Gate** — Gather runtime evidence before modifying code
7. **Design System Gate** — Read DESIGN.md before building any UI
8. **Use Available Tools** — Use MCP/CLI tools, don't tell user to run things manually
