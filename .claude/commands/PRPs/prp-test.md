---
description: "Run all tests for a feature, fix failures, and re-run until everything passes"
argument-hint: "<feature-name>"
---

# PRP Test Runner

## Feature: $ARGUMENTS

You are the PRP Test Runner. Your job is to run ALL validation checks and tests for the specified feature, diagnose and fix any failures, and re-run until everything passes. You do NOT stop at the first failure — you fix and retry.

---

## Step 0: Resolve Feature Context

```
FEATURE = "$ARGUMENTS"
PRP_DIR = "docs-ai/contents/docs/PRPs/${FEATURE}"
TASKS_FILE = "${PRP_DIR}/TASKS.md"
```

If `$ARGUMENTS` is empty, **stop immediately** and ask: "What feature should I test? Usage: `/prp-test <feature-name>`"

Identify the feature's test file(s):
1. Search for existing E2E tests: `frontend/tests/e2e/${FEATURE}*.spec.ts`
2. Search for unit tests related to the feature
3. If no tests exist, report this and stop — tests should have been written during `/prp-execute`

---

## Phase 1: Static Analysis (TypeScript + Lint + Routes)

Run these checks **first** — they're fast and catch issues before slower test runs.

### 1a. TypeScript Compilation

```bash
npm run typecheck --prefix frontend 2>&1
```

- If **0 errors**: Mark PASS, move to 1b
- If **errors found**:
  1. Read each error carefully
  2. Fix the source file (not the type definitions)
  3. Re-run typecheck
  4. Repeat up to 3 times
  5. If still failing after 3 attempts, log the remaining errors and continue to 1b

### 1b. ESLint

```bash
npm run lint --prefix frontend 2>&1
```

- If **0 errors**: Mark PASS, move to 1c
- If **errors found**:
  1. Try auto-fix first: `npm run lint --prefix frontend -- --fix`
  2. For remaining errors, fix manually
  3. Re-run lint
  4. Repeat up to 3 times

### 1c. Route Conflict Check

```bash
npm run check:routes 2>&1
```

- If **no conflicts**: Mark PASS
- If **conflicts found**: Fix route naming per `.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md`, re-run

### Phase 1 Summary

Report results:
```
PHASE 1 RESULTS:
- TypeScript: [PASS/FAIL - X errors remaining]
- Lint: [PASS/FAIL - X errors remaining]
- Routes: [PASS/FAIL]
```

If ALL pass, proceed to Phase 2. If any have unresolved errors, note them but continue — E2E tests may reveal additional context.

---

## Phase 2: Dev Server Verification

### 2a. Clear Next.js Cache (MANDATORY)

```bash
cd /Users/meganharrison/Documents/github/alleato-procore/frontend && rm -rf .next
```

### 2b. Start Dev Server

```bash
cd /Users/meganharrison/Documents/github/alleato-procore/frontend && npm run dev > /tmp/nextjs-test-server.log 2>&1 &
```

Wait for server to be ready:
```bash
sleep 15 && tail -20 /tmp/nextjs-test-server.log
```

Verify "Ready" appears in the log. If not, wait longer and check again.

### 2c. Verify Feature Route Loads

Use curl or Playwright to verify the feature's main page returns 200 (not 404):
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/31/${FEATURE}
```

If 404: check that the page file exists and the route is correct. Fix and retry.

---

## Phase 3: E2E Tests (Playwright)

### 3a. Run Feature-Specific Tests

```bash
cd /Users/meganharrison/Documents/github/alleato-procore/frontend && npx playwright test tests/e2e/${FEATURE}*.spec.ts --reporter=list 2>&1
```

**CRITICAL:** Authentication is AUTOMATIC. Auth state is in `tests/.auth/user.json`. Do NOT add login code. Do NOT ask the user to log in.

### 3b. Handle Test Results

**If ALL tests pass:**
- Mark PASS
- Record the pass count
- Proceed to Phase 4

**If ANY tests fail:**
For each failing test:

1. **Read the failure output carefully** — get the exact error message, line number, and assertion that failed
2. **Diagnose the root cause:**
   - Selector not found? → Check the actual DOM (use `--headed` if needed)
   - Timeout? → Page may not be loading; check dev server logs
   - Assertion failed? → Expected value may be wrong, or data isn't being saved
   - Auth error? → Run `npx playwright test tests/auth.setup.ts` once
3. **Fix the root cause** — modify the source code or test file as appropriate
4. **Re-run just the failing test:**
   ```bash
   npx playwright test tests/e2e/${FEATURE}*.spec.ts -g "test name pattern" --reporter=list 2>&1
   ```
5. **Repeat up to 3 times per failing test**

### 3c. E2E Test Quality Check

Verify the tests meet project standards (from `.claude/rules/E2E-TESTING-STANDARDS.md`):

- [ ] At least one **Create** test (fills form, submits, verifies new record)
- [ ] At least one **Read** test (navigates, verifies data renders correctly)
- [ ] At least one **Edit** test (opens record, changes field, saves, verifies)
- [ ] At least one **Delete** test (removes record, verifies it disappears)
- [ ] Form **validation** test (submits empty required fields, verifies errors)

If tests are smoke tests only (just checking page loads), they do NOT meet standards. Report this as a gap.

---

## Phase 4: Production Build

```bash
cd /Users/meganharrison/Documents/github/alleato-procore/frontend && npm run build 2>&1
```

- If **build succeeds**: Mark PASS
- If **build fails**:
  1. Read the build errors
  2. Fix the issues (often TypeScript errors that `tsc` missed, or import issues)
  3. Re-run build
  4. Repeat up to 3 times

---

## Phase 5: Kill Dev Server & Report

### 5a. Clean Up

```bash
pkill -f "next dev" 2>/dev/null || true
```

### 5b. Final Test Report

Produce this report:

```markdown
# PRP Test Report

**Feature:** ${FEATURE}
**Status:** [ALL PASS / PARTIAL PASS / FAIL]

## Results

| Check | Status | Details |
|-------|--------|---------|
| TypeScript | Pass/Fail | X errors |
| Lint | Pass/Fail | X errors |
| Route Check | Pass/Fail | - |
| Dev Server | Pass/Fail | Port 3000 |
| E2E Tests | Pass/Fail | X/Y passing |
| E2E Standards | Pass/Fail | CRUD coverage |
| Production Build | Pass/Fail | - |

## Test Execution Details

### E2E Tests Run
- test-name-1: PASS
- test-name-2: PASS
- test-name-3: FAIL → fixed → PASS (retry 1)

## Fix History

[List every fix made during this test run]
| Fix # | File | What Was Wrong | What Was Fixed |
|-------|------|---------------|----------------|
| 1 | src/... | [description] | [description] |

## Remaining Issues

[List any unresolved failures, or "None"]

## E2E Coverage Assessment

- Create flow: [covered/missing]
- Read flow: [covered/missing]
- Edit flow: [covered/missing]
- Delete flow: [covered/missing]
- Validation: [covered/missing]
```

### 5c. Update TASKS.md

If `${TASKS_FILE}` exists, append a testing session entry:

```markdown
## Testing Session - [date]
- TypeScript: [PASS/FAIL]
- Lint: [PASS/FAIL]
- E2E: [X/Y passing]
- Build: [PASS/FAIL]
- Fixes applied: [count]
```

---

## Rules

1. **Never stop at the first failure** — diagnose, fix, retry up to 3 times per issue.
2. **Authentication is automatic** — NEVER ask the user to log in. NEVER add login code to tests.
3. **Clear .next cache** before starting — stale cache causes false 404s.
4. **Fix source code, not just tests** — if a test fails because the feature is broken, fix the feature.
5. **Report everything** — every fix, every retry, every remaining issue.
6. **Use actual output** — never guess what's happening. Run the command and read the output.
7. **Kill the dev server** when done — don't leave orphan processes.
