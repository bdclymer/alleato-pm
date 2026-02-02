# Codex Task Files

This directory contains self-contained task definitions for autonomous Codex execution.

---

## Quick Start for Codex

```bash
# 1. Pick a task file
cat documentation/1-project-mgmt/codex-tasks/CODEX-TASK-[FEATURE].md

# 2. Read patterns FIRST (mandatory)
cat .agents/patterns/index.json

# 3. Follow the workflow in the task file
# Phase 0: PATTERNS → Phase 1: RESEARCH → Phase 2: PLAN → ...

# 4. Run gate enforcement before claiming complete
npx tsx .agents/tools/enforce-gates.ts [feature]
```

---

## Available Tasks

| Task | Feature | Priority | Status | Complexity |
|------|---------|----------|--------|------------|
| [CODEX-TASK-BUDGET.md](./CODEX-TASK-BUDGET.md) | budget | HIGH | ~60% | LARGE |
| [CODEX-TASK-PRIME-CONTRACTS.md](./CODEX-TASK-PRIME-CONTRACTS.md) | prime-contracts | HIGH | ~70% | MEDIUM |
| [CODEX-TASK-COMMITMENTS.md](./CODEX-TASK-COMMITMENTS.md) | commitments | HIGH | ~22% | LARGE |
| [CODEX-TASK-DIRECTORY.md](./CODEX-TASK-DIRECTORY.md) | directory | HIGH | ~60% | MEDIUM |

---

## Task File Structure

Each task file contains:

1. **Metadata** - Feature name, priority, complexity, dependencies
2. **Inputs** - Crawl data locations, RAG queries, reference screenshots
3. **Success Criteria** - Specific checkboxes that must all pass
4. **Workflow** - 7-phase process from PATTERNS to PR
5. **Constraints** - Mandatory rules (auth fixtures, wait strategies, etc.)
6. **Gates** - Commands that must pass with checksums
7. **Deliverables** - Database, API, Frontend, Tests, Documentation
8. **Completion Evidence** - Required format for claiming done

---

## How to Use These Tasks

### For Parallel Execution

When running multiple Codex instances:

1. Each instance works on ONE task at a time
2. Check for lock files before starting: `.claude/locks/[feature]/`
3. Create lock file when starting a task
4. Remove lock file when done or blocked
5. Do NOT work on features that have active lock files

### Lock File Format

```bash
# Create lock
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Codex instance starting" > .claude/locks/budget.lock

# Remove lock
rm .claude/locks/budget.lock
```

---

## Mandatory Patterns

Before starting ANY task, read these patterns:

```bash
# Core patterns to always read
.agents/patterns/errors/networkidle-timeout.md    # Test wait strategy
.agents/patterns/errors/auth-fixture-missing.md   # Test authentication
.agents/patterns/errors/route-param-mismatch.md   # Route naming
.agents/patterns/errors/premature-completion.md   # Verification required
```

---

## Gate Enforcement

Every task must pass gates before completion:

```bash
# Run all gates for a feature
npx tsx .agents/tools/enforce-gates.ts [feature]

# This produces:
# - GATES.md with checksums and timestamps
# - Evidence snippets from actual command output
# - PASS/FAIL status for each gate
```

**No checksum = Not complete**

---

## Creating New Task Files

1. Copy `CODEX-TASK-TEMPLATE.md`
2. Replace placeholders with actual values
3. Fill in crawl data locations
4. Adjust deliverables based on crawl analysis
5. Save as `CODEX-TASK-[FEATURE].md`

---

## Task Priorities

| Priority | Features |
|----------|----------|
| HIGH | Budget, Prime Contracts, Commitments, Directory |
| MEDIUM | Change Events, Change Orders, Direct Costs, Invoices |
| LOW | Schedule, Submittals, RFIs, Punch List |

---

## Related Files

- Template: `CODEX-TASK-TEMPLATE.md`
- Pattern Library: `.agents/patterns/`
- Gate Tool: `.agents/tools/enforce-gates.ts`
- Workflow: `.agents/workflows/feature-implementation.md`
- Test Fixtures: `frontend/tests/fixtures/index.ts`
