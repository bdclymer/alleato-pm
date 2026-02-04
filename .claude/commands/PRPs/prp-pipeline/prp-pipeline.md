---
description: "Automated PRP pipeline — auto-detects workflow, runs all phases with gate checks, retries on failure"
argument-hint: "<feature-name>"
---

# PRP Pipeline Orchestrator

## Feature: $ARGUMENTS

You are the PRP Pipeline Orchestrator. Your job is to run the full PRP workflow **hands-off** — detect the right workflow, execute each phase via sub-agents, enforce gate checks between phases, retry once on failure, and produce a final summary.

---

## Step 0: Setup & Workflow Detection

### 0a. Resolve Feature Name

```
FEATURE = "$ARGUMENTS"
PRP_DIR = "docs-ai/contents/docs/PRPs/${FEATURE}"
PRP_FILE = "${PRP_DIR}/prp-${FEATURE}.md"
FIX_PRP_FILE = "${PRP_DIR}/prp-${FEATURE}-fix.md"
TASKS_FILE = "${PRP_DIR}/TASKS.md"
```

If `$ARGUMENTS` is empty, **stop immediately** and ask the user: "What feature should I build? Usage: `/prp-pipeline <feature-name>`"

### 0b. Detect Workflow

Search the codebase for existing artifacts related to this feature:

1. Check for existing page files: `frontend/src/app/(main)/[projectId]/${FEATURE}/` or similar kebab-case variants
2. Check for existing API routes: `frontend/src/app/api/projects/[projectId]/${FEATURE}/` or similar
3. Check for existing hooks: `frontend/src/hooks/use-${FEATURE}*`
4. Check for existing services: `frontend/src/services/${FEATURE}*`
5. Check for existing database tables (grep database.types.ts for the snake_case version)
6. Check for existing PRP docs in `${PRP_DIR}/`

**Decision logic:**

- If **3+ existing artifacts found** (pages, routes, hooks, services, or DB tables) → **Workflow B** (Fix/Complete)
- If **existing PRP + TASKS.md found but code is missing/incomplete** → **Workflow B** (Fix/Complete)
- Otherwise → **Workflow A** (New Feature)

**Announce the decision clearly:**

```
PIPELINE: Detected [Workflow A: New Feature / Workflow B: Fix/Complete]
Reason: [what was found or not found]
Starting pipeline for feature: ${FEATURE}
```

---

## Workflow A: New Feature Pipeline

Execute these phases **sequentially**. Each phase MUST pass its gate before the next phase starts.

### Phase 1: Create PRP

**Action:** Use the Skill tool to invoke `prp-create` with argument `${FEATURE}`.

```
Skill: prp-create
Args: ${FEATURE}
```

**Gate check after completion:**
- [ ] File exists: `${PRP_FILE}`
- [ ] File exists: `${TASKS_FILE}`
- [ ] PRP file is non-empty (> 100 lines)
- [ ] TASKS.md contains checkbox items (`- [ ]`)

**On gate failure:** Retry Phase 1 once. If still failing, STOP the pipeline and report:
```
PIPELINE FAILED at Phase 1 (Create PRP)
Gate failures: [list what failed]
Manual fix needed before re-running /prp-pipeline ${FEATURE}
```

### Phase 2: Quality Check

**Action:** Use the Skill tool to invoke `prp-quality` with the PRP path.

```
Skill: prp-quality
Args: ${PRP_FILE}
```

**Gate check after completion:**
- [ ] Quality report was produced
- [ ] Overall confidence score >= 8/10
- [ ] Status is "APPROVED" (not "REJECTED" or "NEEDS REVISION")

**On gate failure (score < 8 or NEEDS REVISION):**
1. Read the quality report's "Critical Issues" and "Medium Priority Issues"
2. Fix the PRP file directly — address each critical issue
3. Re-run Phase 2 (quality check) once more
4. If still below 8/10 after retry, STOP and report:
```
PIPELINE FAILED at Phase 2 (Quality Check)
Score: X/10 (minimum 8 required)
Unresolved issues: [list from quality report]
Fix the PRP manually, then run: /prp-quality ${PRP_FILE}
```

### Phase 3: Execute Implementation

**Action:** Use the Skill tool to invoke `prp-execute` with the PRP path.

```
Skill: prp-execute
Args: ${PRP_FILE}
```

**Gate check after completion:**
- [ ] TASKS.md has been updated (checked items `- [x]` exist)
- [ ] At least 80% of tasks in TASKS.md are marked complete
- [ ] TypeScript compiles: run `npm run typecheck --prefix frontend` and confirm 0 errors
- [ ] No route conflicts: run `npm run check:routes` (if script exists)

**On gate failure:** Retry Phase 3 once with context about what failed. If still failing, STOP and report:
```
PIPELINE FAILED at Phase 3 (Execute)
Gate failures: [list what failed]
TASKS.md progress: X/Y tasks complete
TypeScript errors: [count]
Route conflicts: [details if any]
```

### Phase 4: Test

**Action:** Use the Skill tool to invoke `prp-test` with the feature name.

```
Skill: prp-test
Args: ${FEATURE}
```

**Gate check after completion:**
- [ ] TypeScript compilation passes (0 errors)
- [ ] Lint passes
- [ ] Playwright E2E tests pass (or no test failures remain)
- [ ] Production build succeeds: `npm run build --prefix frontend`

**On gate failure:** Retry Phase 4 once (the test command already includes fix-and-retry loops internally). If still failing, STOP and report:
```
PIPELINE FAILED at Phase 4 (Test)
Failing tests: [list]
TypeScript errors: [count]
Build status: [pass/fail]
Fix failures manually, then run: /prp-test ${FEATURE}
```

### Phase 5: Validate

**Action:** Use the Skill tool to invoke `prp-validate` with the PRP path and feature name.

```
Skill: prp-validate
Args: ${PRP_FILE} --feature ${FEATURE}
```

**Gate check after completion:**
- [ ] Validation report status is "PASS"
- [ ] Confidence score >= 8/10
- [ ] No critical issues listed

**On gate failure:** Retry Phase 5 once. If the validation identifies execution gaps, loop back to Phase 3 (Execute) once to fix them, then re-validate. If still failing after the loop, STOP and report:
```
PIPELINE FAILED at Phase 5 (Validate)
Status: FAIL
Critical issues: [list]
Confidence: X/10
```

---

## Workflow B: Fix/Complete Pipeline

Execute these phases **sequentially**.

### Phase 1: Audit

**Action:** Use the Skill tool to invoke `prp-audit` with the feature name.

```
Skill: prp-audit
Args: ${FEATURE}
```

**Gate check after completion:**
- [ ] Fix PRP exists: `${FIX_PRP_FILE}` (or updated `${PRP_FILE}`)
- [ ] TASKS.md exists with fix/completion tasks
- [ ] Audit report categorizes items into Working / Broken / Missing

**On gate failure:** Retry Phase 1 once. If still failing, STOP and report.

### Phase 2: Execute Fixes

**Action:** Use the Skill tool to invoke `prp-execute` with the fix PRP path.

Determine which PRP to use:
- If `${FIX_PRP_FILE}` exists, use it
- Otherwise use `${PRP_FILE}`

```
Skill: prp-execute
Args: [chosen PRP path]
```

**Gate check:** Same as Workflow A Phase 3.

**On gate failure:** Same retry logic as Workflow A Phase 3.

### Phase 3: Test

**Action and gates:** Same as Workflow A Phase 4.

### Phase 4: Validate

**Action and gates:** Same as Workflow A Phase 5 (use the fix PRP path if it exists).

---

## Pipeline Summary Report

After the final phase completes (success or failure), produce this summary:

```markdown
# PRP Pipeline Summary

**Feature:** ${FEATURE}
**Workflow:** [A: New Feature / B: Fix/Complete]
**Status:** [COMPLETED / FAILED at Phase N]
**Duration:** [phases completed] / [total phases]

## Phase Results

| Phase | Command | Status | Details |
|-------|---------|--------|---------|
| 1 | /prp-create (or /prp-audit) | Pass/Fail | [brief] |
| 2 | /prp-quality (or /prp-execute) | Pass/Fail | [brief] |
| 3 | /prp-execute (or /prp-test) | Pass/Fail | [brief] |
| 4 | /prp-test (or /prp-validate) | Pass/Fail | [brief] |
| 5 | /prp-validate | Pass/Fail | [brief] |

## Artifacts Produced

- PRP: ${PRP_FILE}
- Tasks: ${TASKS_FILE}
- Tests: frontend/tests/e2e/${FEATURE}*.spec.ts
- Validation: ${PRP_DIR}/verification/

## Retries

[List any phases that needed retry and what was fixed]

## Next Steps

[If completed: "Feature is ready for manual review and PR creation."]
[If failed: "Fix the issues listed above, then re-run: /prp-pipeline ${FEATURE}"]
```

---

## Orchestration Rules

1. **Sequential execution only** — never run phases in parallel. Each phase depends on the previous.
2. **One retry per phase** — if a phase fails its gate, retry once with error context. Two failures = pipeline stop.
3. **Validate-Execute loop** — if Phase 5 (validate) fails due to execution gaps, loop back to Phase 3 once.
4. **Use Skill tool** — invoke each phase command via the Skill tool, not by copy-pasting the command text.
5. **Gate checks are mandatory** — never skip a gate check. Run the actual verification commands.
6. **Report progress** — after each phase, announce the result before moving to the next phase.
7. **Respect CLAUDE.md rules** — all mandatory gates (Supabase types, route naming, auth, etc.) apply to every phase.
8. **No manual intervention** — the pipeline should run without asking the user to do anything. Use available tools for everything.
