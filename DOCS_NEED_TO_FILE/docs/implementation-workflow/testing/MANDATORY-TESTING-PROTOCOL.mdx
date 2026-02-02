# MANDATORY TESTING PROTOCOL

**Created:** 2026-01-10
**Reason:** Claude Code repeatedly claimed features "complete" without testing
**Enforcement:** HARD REQUIREMENT - No exceptions

---

## 🔴 CRITICAL RULE

**NO FEATURE IS COMPLETE WITHOUT PASSING TESTS AND EVIDENCE.**

If you claim completion without testing, you have violated the core project requirement.

---

## The Problem This Solves

### Historical Violations (What Went Wrong)

1. **2026-01-10 - Change Events "Complete" Claim**
   - ❌ Claimed "COMPLETE - All Issues Fixed"
   - ❌ Created STATUS.md saying "Mostly Complete"
   - ❌ Moved verification reports to archive (implying done)
   - ❌ NEVER RAN THE TESTS
   - ✅ Reality: 12/27 tests failing (44% failure rate)
   - ✅ Reality: Auth completely broken

2. **Pattern Identified**
   - Code written → "Complete!"
   - TypeScript compiles → "Complete!"
   - Quick manual check → "Complete!"
   - **ACTUAL TESTING SKIPPED ENTIRELY**

### Why This Keeps Happening

- Testing takes time and reveals problems
- It's easier to assume code works than prove it works
- Verifier agents were run BEFORE testing (backwards)
- No enforcement mechanism to require evidence

---

## MANDATORY TESTING WORKFLOW (DO NOT DEVIATE)

```
┌─────────────────────────────────────────────────────────┐
│ Step 1: IMPLEMENT CODE                                  │
│ Write the actual implementation                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: WRITE TESTS (if none exist)                     │
│ Create Playwright tests for the feature                 │
│ Required: API tests + Browser tests                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: RUN TESTS                                        │
│ Execute: npx playwright test <feature>*.spec.ts         │
│ Generate HTML report: --reporter=html                   │
│ CAPTURE OUTPUT - DO NOT SKIP                            │
└─────────────────────────────────────────────────────────┘
                         ↓
                    ┌────────┐
                    │ PASS?  │
                    └────────┘
                  /            \
            NO ✗                ✓ YES
           /                      \
          ↓                        ↓
┌───────────────────┐    ┌──────────────────────┐
│ Step 4a: FIX BUGS │    │ Step 5: COLLECT      │
│ Debug failures    │    │ EVIDENCE             │
│ Fix the issues    │    │ • HTML report path   │
│ Return to Step 3  │    │ • Screenshots        │
│ (RE-RUN TESTS)    │    │ • Test count results │
└───────────────────┘    │ • Any videos         │
                         └──────────────────────┘
                                   ↓
                         ┌──────────────────────┐
                         │ Step 6: UPDATE       │
                         │ STATUS.md            │
                         │ Add test evidence    │
                         │ Link to HTML report  │
                         └──────────────────────┘
                                   ↓
                         ┌──────────────────────┐
                         │ Step 7: RUN          │
                         │ VERIFIER AGENT       │
                         │ Independent check    │
                         │ Fresh eyes on tests  │
                         └──────────────────────┘
                                   ↓
                         ┌──────────────────────┐
                         │ Step 8: CLAIM        │
                         │ COMPLETION           │
                         │ Only after all above │
                         └──────────────────────┘
```

---

## REQUIRED EVIDENCE CHECKLIST

Before claiming ANY feature is complete, you MUST have:

### 1. Test Execution Proof
```bash
# Run tests with HTML reporter
cd frontend
npx playwright test tests/e2e/<feature>*.spec.ts --reporter=html
```

**Required Evidence:**
- [ ] HTML report generated at `frontend/playwright-report/index.html`
- [ ] Test count summary (e.g., "24 passed, 1 failed, 14 skipped")
- [ ] Screenshot of test results or report file path
- [ ] All critical tests passing (100% or documented exceptions)

### 2. Test Results Documentation
Create `<feature>/TEST-RESULTS.md` with:
```markdown
# Test Results: <Feature Name>

**Date:** YYYY-MM-DD
**Test Suite:** tests/e2e/<feature>*.spec.ts
**Report:** [HTML Report](../../frontend/playwright-report/index.html)

## Summary
- **Total Tests:** X
- **Passed:** X
- **Failed:** X (with explanations)
- **Skipped:** X (with reasons)

## Evidence
- HTML Report: `frontend/playwright-report/index.html`
- Screenshots: Attached or described
- Test run duration: Xms

## Test Categories
- API Tests: X/X passing
- Browser Tests: X/X passing
- Integration Tests: X/X passing

## Known Issues (if any)
- Issue 1: [Description + tracking]
- Issue 2: [Description + tracking]

## Conclusion
✅ ALL CRITICAL TESTS PASSING - Ready for verification
```

### 3. Screenshots/Videos
- [ ] HTML report screenshot showing test results
- [ ] Any failing test screenshots (if failures exist)
- [ ] Browser test videos (if available)

### 4. Status Update
Update `<feature>/STATUS.md` with test results:
```markdown
## Testing Status: ✅ COMPLETE

**Test Execution Date:** 2026-01-XX
**Test Results:** [View Report](./TEST-RESULTS.md)

### Test Summary
- API Tests: 24/24 passing
- Browser Tests: 15/15 passing
- Total: 39/39 passing

**Evidence:** [HTML Report](../../frontend/playwright-report/index.html)
```

---

## PLAYWRIGHT TESTING REQUIREMENTS

### Auth Setup (CRITICAL)

**File:** `frontend/tests/auth.setup.ts`

**Requirements:**
- Use test credentials from .env (TEST_USER_1, TEST_PASSWORD_1)
- Authenticate with Supabase using `signInWithPassword()`
- Save auth state to `.auth/user.json`
- Verify auth works before proceeding

**Reference:** https://playwright.dev/docs/auth

**Example:**
```typescript
import { test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

setup('authenticate', async ({ page }) => {
  const supabase = createClient(url, key);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_1,
    password: process.env.TEST_PASSWORD_1,
  });

  if (error) throw new Error(`Auth failed: ${error.message}`);

  // Save state...
});
```

### Test File Requirements

**Location:** `frontend/tests/e2e/<feature>-*.spec.ts`

**Minimum Coverage:**
1. **API Tests** (`<feature>-api.spec.ts`)
   - GET endpoints (list, single, filters, pagination, sorting)
   - POST endpoints (create with valid/invalid data)
   - PUT/PATCH endpoints (update operations)
   - DELETE endpoints (soft delete, verify)
   - Error handling (401, 404, 400, 500)
   - Performance tests (response times)

2. **Browser Tests** (`<feature>-browser.spec.ts`)
   - Page loads without errors
   - Forms submit successfully
   - Data displays correctly
   - User interactions work
   - Navigation functions

3. **Integration Tests** (if applicable)
   - Cross-module interactions
   - Database constraints
   - Foreign key relationships

### Running Tests

```bash
# Run specific feature tests
npx playwright test tests/e2e/<feature>*.spec.ts --reporter=html

# Run with UI for debugging
npx playwright test tests/e2e/<feature>*.spec.ts --ui

# Run single test file
npx playwright test tests/e2e/<feature>-api.spec.ts

# Generate trace for debugging
npx playwright test --trace on
```

---

## VERIFICATION AGENT REQUIREMENTS

After tests pass, spawn INDEPENDENT verifier agent:

```typescript
Task({
  subagent_type: "debugger", // or "test-automator"
  description: "Verify <feature> tests independently",
  prompt: `VERIFICATION TASK

You are an INDEPENDENT VERIFIER. Your job is to verify tests with SKEPTICISM.

**Assume the worker LIED about:**
- "Tests pass" → Run them yourself
- "All working" → Prove it yourself
- "Evidence provided" → Verify it exists

**Feature:** <feature-name>
**Test Files:** tests/e2e/<feature>*.spec.ts

**Your Tasks:**
1. Run all tests: npx playwright test tests/e2e/<feature>*.spec.ts --reporter=html
2. Verify HTML report generated
3. Check test count matches claims
4. Review any failures
5. Attempt to break the feature (edge cases)
6. Document findings

**Output:** documentation/*project-mgmt/in-progress/<feature>/VERIFICATION-TESTS.md

**Required Evidence:**
- Test execution output
- HTML report confirmation
- Pass/fail counts
- Any issues discovered

If ANYTHING fails → Mark as FAILED, not "mostly working".
`
});
```

---

## BANNED PHRASES (Triggers for Violation)

If you say these WITHOUT test evidence, you are VIOLATING the protocol:

- ❌ "All tests passing" (without running them)
- ❌ "Feature complete" (without test report)
- ❌ "Implementation verified" (without evidence)
- ❌ "Ready for production" (without test results)
- ❌ "No issues found" (without actually testing)

**Instead, say:**
- ✅ "Tests executed: 24/24 passing (see report)"
- ✅ "Feature tested - evidence: [link]"
- ✅ "Verification complete with proof: [screenshot]"

---

## ENFORCEMENT MECHANISMS

### 1. Task Completion Definition (Updated)

A task is COMPLETE only when ALL apply:
- [ ] Code implemented
- [ ] **Tests written (if none exist)**
- [ ] **Tests RUN and PASSING** ← NEW HARD REQUIREMENT
- [ ] **Test evidence documented** ← NEW HARD REQUIREMENT
- [ ] Quality check passes (npm run quality)
- [ ] Independent verifier confirms (if complex)
- [ ] Evidence logged to `.claude/task-log.md`

### 2. Status File Requirements

`STATUS.md` MUST include:
```markdown
## Testing Evidence

**Last Test Run:** 2026-01-XX HH:MM
**Test Results:** [Report Link](./TEST-RESULTS.md)
**Pass Rate:** XX/XX (100%)
**HTML Report:** [View](../../frontend/playwright-report/index.html)

### Test Coverage
- API Tests: ✅ XX/XX passing
- Browser Tests: ✅ XX/XX passing
- Integration Tests: ✅ XX/XX passing
```

### 3. Verification Report Requirements

`VERIFICATION-<name>.md` MUST include:
```markdown
## Test Verification

**Verifier:** [Agent ID or Claude session]
**Date:** YYYY-MM-DD

### Tests Executed
- Ran: npx playwright test tests/e2e/<feature>*.spec.ts
- Result: XX/XX passing
- Evidence: [HTML report path]

### Independent Validation
- [ ] Tests actually run (not cached)
- [ ] All critical paths tested
- [ ] Pass counts accurate
- [ ] No false positives

**Verdict:** ✅ VERIFIED / ❌ FAILED
```

---

## EXAMPLE: CORRECT WORKFLOW

### Before (WRONG - What was happening)
```
1. Write code
2. TypeScript compiles ✓
3. "Complete!" ← WRONG
4. Move to archive
5. User discovers it's broken
```

### After (CORRECT - What MUST happen)
```
1. Write code
2. TypeScript compiles ✓
3. Write Playwright tests
4. Run tests: npx playwright test --reporter=html
5. Results: 24/27 passing ← PROBLEMS FOUND
6. Fix 3 failing tests
7. Re-run tests: 27/27 passing ✓
8. Document evidence in TEST-RESULTS.md
9. Update STATUS.md with test results
10. Spawn verifier agent to independently confirm
11. Verifier runs tests, confirms passing
12. ONLY THEN claim complete
```

---

## INTEGRATION WITH PROJECT MANAGEMENT

### Update to PROJECT-MANAGEMENT-PROCESS.md

Add this section:

```markdown
## 🧪 MANDATORY TESTING (NEW - 2026-01-10)

**Every feature MUST go through testing before completion.**

1. After implementation → Write tests (if none exist)
2. Run tests with HTML reporter
3. Fix failures until 100% critical tests pass
4. Document evidence (TEST-RESULTS.md)
5. Update STATUS.md with test results
6. Run verifier agent (independent validation)
7. Only then move to complete/

**No exceptions. No shortcuts.**
```

### Feature Directory Structure (Updated)

```
in-progress/<feature>/
├── README.md
├── STATUS.md              # MUST include test results
├── TASKS.md
├── TEST-RESULTS.md        # NEW - Test evidence
├── specs/
├── reference/
└── archive/
    ├── VERIFICATION-<name>.md  # Must include test verification
    └── ...
```

---

## SLASH COMMAND PROPOSAL

Create `/test-complete` command that enforces this:

```bash
# User runs: /test-complete <feature>

# Command checks:
1. Does TEST-RESULTS.md exist?
2. Is it dated within last 24 hours?
3. Does it show passing tests?
4. Does STATUS.md reference test results?
5. Does HTML report exist?

# If ANY check fails → ERROR: "Testing incomplete"
# If all pass → Allow completion claim
```

---

## ACCOUNTABILITY

### For Claude Code Agent

If you claim completion without testing:
1. User will call you out (as happened today)
2. You must immediately run tests
3. Fix failures
4. Provide evidence
5. Apologize for the violation

### For Verifier Agents

If you verify without running tests:
1. You have failed your primary purpose
2. Re-run with actual test execution
3. Document what you missed
4. Update verification report

---

## SUCCESS METRICS

### Before This Protocol
- Features claimed "complete" with 44% test failure rate
- No test evidence required
- Verification done before testing
- Manual testing only, no automation

### After This Protocol (Goals)
- 100% of "complete" features have test evidence
- HTML reports for all features
- Verifier agents run tests independently
- No completion without proof

---

## QUICK REFERENCE CHECKLIST

Before saying "Feature X is complete":

- [ ] Tests written for all critical functionality
- [ ] Ran: `npx playwright test tests/e2e/<feature>*.spec.ts --reporter=html`
- [ ] Results: XX/XX passing (100% or documented exceptions)
- [ ] Created TEST-RESULTS.md with evidence
- [ ] Updated STATUS.md with test results
- [ ] HTML report exists and linked
- [ ] Screenshots/videos captured if applicable
- [ ] Verifier agent ran tests independently
- [ ] Verification report created
- [ ] All evidence documented and linked

**If ANY checkbox is unchecked → FEATURE IS NOT COMPLETE.**

---

## REFERENCES

- Playwright Auth: https://playwright.dev/docs/auth
- Playwright Reports: https://playwright.dev/docs/test-reporters
- Project Process: `PROJECT-MANAGEMENT-PROCESS.md`
- Task Completion: `.claude/MANDATORY-GATES.md`

---

**Last Updated:** 2026-01-10
**Reason for Creation:** Repeated violations of claiming completion without testing
**Enforcement:** Mandatory - No exceptions - Hard requirement
