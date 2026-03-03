---
description: "Validate that a PRP executed as planned, run the required tests, capture evidence, and loop failures back to execution"
argument-hint: "<path/to/prp.md> [--feature <feature-name>]"
---

# PRP Validation + Testing Gate

Use this command when the implementation work is complete and you need an evidence-backed judgment: validate the PRP execution, write/run the required tests, and escalate any failures back through implementation.

## Inputs

- `{prp_path}`: Exact relative path to the PRP document in `docs-ai/contents/docs/PRPs/{feature}/`.
- `--feature {feature-name}`: Optional override for the feature slug. When omitted, derive the slug from the PRP folder (the directory immediately under `docs-ai/contents/docs/PRPs/` that contains the PRP).

Record the resolved feature name; it is required for locating `TASKS.md`, the verification report, and test artifacts.

## Phase 1 — Evidence-Based Validation (Did we build what the PRP promised?)

1. **Load the PRP** and extract:
   - Final Validation Checklist.
   - Goal / Deliverable / Success Definition statements from the “Goal” section.
   - Success criteria listed under “What”.
   - Manual test steps, integration points, anti-pattern list, dependency notes, and documentation/deployment requirements.
2. **Verify checklist execution**:
   - Each technical command specified must have been executed exactly as written. Record the command, its output, and whether it passed.
   - Confirm Feature Goal end state is present and functioning.
   - Confirm each Success criterion with proof (code, config, test results, screenshots).
   - Confirm any “Manual Testing” commands were run and describe observable outcomes.
   - Validate integration points, dependency updates, and naming/file placement guidance against the codebase.
3. **Capture quality evidence**:
   - Run any anti-pattern checks explicitly requested.
   - Ensure documentation, README updates, and env config notes exist.
   - Make sure no development-only code paths remain.
4. **Evidence requirements**:
   - Final report must reference tangible artifacts (`docs-ai/contents/docs/PRPs/{feature}/verification/index.html`, screenshots, test-output logs, API/db evidence).
   - Every claim that a step passed must include either a file path, command output, or screenshot (never “seems fine”).

## Phase 2 — Testing + Task Loop (Write, run, repair)

This validation gate is paired with the testing command. Follow this precise choreography:

1. **Write or confirm the tests** described in the PRP:
   - If the PRP lists specific tests (Playwright flows, unit suites, API checks), ensure the tests exist in the repository.
   - If tests are missing, author them in the appropriate location (`frontend/tests/...`, `backend/tests/...`, etc.) and document the intent in `TASKS.md`.
   - Do not guess; tests must mirror the PRP’s stated success criteria.
2. **Run every required test set**:
   - `npx tsx .agents/tools/generate-verification-report.ts {feature}` (runs frontend typecheck + Playwright + generates verification report).
   - `npm run lint --prefix frontend`, `npm run lint --prefix backend` (as specified by PRP).
   - `npm run typecheck --prefix frontend/backend` if the PRP calls it out separately.
   - Any additional commands (API smoke tests, `route-check`, supabase query tests, etc.) listed in the Final Validation Checklist.
3. **Failure handling**:
   - When a test fails, capture the failure output and identify the responsible file/step.
   - Append a TODO entry to `docs-ai/contents/docs/PRPs/{feature}/TASKS.md` (this file already tracks implementation work) in the style:

     ```
     - [ ] Investigate "{test-name}" failure – {short failure summary} (status: needs execution fix)
     ```

   - Record the failure in the report with file/line or test identifier and the exact error text.
   - Set the overall gate status to FAIL and instruct the workflow: “Return to `/prp-execute {prp_path}`, fix the tasks, then re-run `/prp-validate {prp_path}` after tests pass.”
   - Do not proceed to Phase 3 until the failing tests are fixed and mark the failure in the conversation and report as blocking.
4. **Passing tests**:
   - When every test command succeeds, note the pass rate (must be ≥ 80% from the verification report) and confirm TypeScript error count is zero.
   - Ensure screenshots exist under `docs-ai/contents/docs/PRPs/{feature}/verification/screenshots/`.
   - Confirm the verification folder contains `index.html`, `screenshots/`, `test-output/`, and any applicable `api-responses/` or `database/` subfolders.

## Phase 3 — Report & Decision

Produce a final validation report with this structure and keep it evidence-heavy:

```
# PRP Validation Report

**PRP File**: {prp_path}
**Feature**: {feature}
**Validation Date**: {timestamp}
**Overall Status**: PASS / FAIL

## Technical Validation Results

### Test Execution
- **Status**: Pass/Fail
- **Commands**:
  - {command} → {pass/fail} – {output summary}
- **Issues**: {failure details or “None”}

### Linting / Type Checking
- **Status**: Pass/Fail
- **Details**: {lint/typecheck output or file references}

## Feature Validation Results

### Goal Achievement
- Found deliverable: {file/path}
- Success Definition met: {details}

### Success Criteria
- Criterion 1: {pass/fail} – {evidence}
- Criterion 2: …

### Documentation / Deployment
- Docs updated: {yes/no + file}
- Env/config noted: {yes/no + file}

## Evidence Artifacts
- Verification report: `docs-ai/contents/docs/PRPs/{feature}/verification/index.html`
- Screenshots: {count}
- API logs: {file(s)} (if applicable)
- Database evidence: {file(s)} (if applicable)

## Summary
- Critical Issues: {list or “None”}
- Confidence Level (1‑10): {score}
- Next Actions: {e.g., “Re-run /prp-execute after fixing TASKS.md entries”}
```

### Validation decision rules

- PASS only when all evidence exists, commands succeed, TypeScript errors = 0, test pass rate ≥ 80%, and no blockers exist.
- FAIL when any requirement is missing, any test/regression fails, or critical blockers remain.
- No partial credit: classify anything non-passing as FAIL and loop back to execution.

## Workflow Positioning

```
PRP Execute → PRP Test (writes+runs tests) → PRP Validate (this command) → PASS or FAIL → on FAIL: back to Execute
```

Document every retry and failure thoroughly in TASKS.md with new entries so the next execution pass can pick up exactly where testing failed.
