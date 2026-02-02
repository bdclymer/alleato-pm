# Pattern: Verification Gates Before Completion

**Severity:** HIGH
**Category:** Workflow / Quality

---

## The Problem

Agents claim "complete" without evidence:
- "Tests should pass" (but weren't run)
- "This should work" (but wasn't verified)
- "Implementation complete" (but no proof)

## The Solution

**Run ALL quality gates before any completion claim:**

### Mandatory Gates

| Gate | Command | Required Outcome |
|------|---------|-----------------|
| TypeScript | `npm run typecheck --prefix frontend` | 0 errors |
| ESLint | `npm run lint --prefix frontend` | 0 errors in YOUR files |
| Tests | `npx playwright test --grep "{feature}"` | All pass |

### Verification Workflow

```bash
# 1. TypeScript check
npm run typecheck --prefix frontend
# Expected: No errors

# 2. ESLint check
npm run lint --prefix frontend
# Expected: 0 errors (warnings OK)

# 3. Run feature tests
cd frontend && npx playwright test --grep "change-events" --reporter=html
# Expected: All tests pass

# 4. Generate verification report (if available)
npx tsx .agents/tools/generate-verification-report.ts <feature-name>
```

### Completion Statement Format

Only claim completion with evidence:

```markdown
COMPLETE: Change Events implementation

**Quality Gates:**
- TypeScript: PASS (0 errors)
- ESLint: PASS (0 errors in feature files)
- Tests: 41/42 pass (98%)

**Evidence:**
- Test output: `frontend/playwright-report/index.html`
- Screenshots: `frontend/tests/screenshots/change-events/`

**Remaining (non-blocking):**
- Summary tab UI (documented in TASKS.mdx)
```

## Detection

Signs of premature completion:
- No test output provided
- No screenshot evidence
- "Should work" language without verification
- Gates not explicitly mentioned

## Never Do This

```markdown
# WRONG
I've implemented the feature. It should work now.
Tests should pass once the dev server is running.
```

```markdown
# RIGHT
TypeScript: PASS (0 errors)
ESLint: PASS
Tests: Executed - 17/17 browser tests pass
Output: frontend/playwright-report/index.html
```

---

**Reference:** `.agents/patterns/errors/premature-completion.md`
