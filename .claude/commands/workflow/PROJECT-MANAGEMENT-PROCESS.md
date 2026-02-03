# Project Management Process Documentation

**Last Updated:** 2026-01-10
**Status:** ACTIVE
**Purpose:** Define the complete workflow for implementing and verifying features

---

## 🎯 Core Principle

**DO NOT STOP UNTIL VERIFICATION PASSES**

When a task is assigned:

1. Implement the work
2. Run verification (automated)
3. **IF VERIFICATION FAILS → FIX IMMEDIATELY**
4. Re-run verification
5. **ONLY claim completion when verification PASSES**

**BANNED:** "Here's what's broken" without fixing it
**REQUIRED:** "Here's what WAS broken and is NOW fixed"

---

## 📋 Complete Workflow

### Phase 1: Task Assignment

**Input:** User provides task description
**Output:** Task documented in `.claude/current-task.md`

**Actions:**

1. Read CLAUDE.md for current rules
2. Identify execution gates (database, UI, documentation)
3. Create task tracking if complex (3+ steps)

### Phase 2: Implementation

**Input:** Task requirements
**Output:** Working code

**Actions:**

1. Implement changes
2. Run `npm run quality` after EVERY code change
3. Fix TypeScript/ESLint errors immediately
4. Run relevant tests as you go

**Rules:**

- Fix errors immediately, don't accumulate them
- Don't move to next file until current file passes quality check
- Use TodoWrite tool to track multi-step work

### Phase 3: Testing (MANDATORY - UPDATED 2026-01-10)

**Input:** Completed code
**Output:** Passing tests with documented evidence

**HARD REQUIREMENT:** NO feature is complete without passing tests and evidence.

**Actions:**

1. **Write tests** if feature is new
   - Location: `frontend/tests/e2e/<feature>-*.spec.ts`
   - Coverage: API tests + Browser tests minimum

2. **Run tests** with HTML reporter

   ```bash
   cd frontend
   npx playwright test tests/e2e/<feature>*.spec.ts --reporter=html
   ```text
3. **Capture evidence** (ALL REQUIRED):
   - Terminal output showing pass/fail counts
   - HTML report: `frontend/playwright-report/index.html`
   - Screenshots of test results

4. **Document results** in `TEST-RESULTS.md`:
   - Test execution date
   - Pass/fail summary
   - HTML report path
   - Any known issues

5. **Update STATUS.md** with test evidence:

   ```markdown
   ## Testing Status: ✅ PASSING
   **Test Results:** [View Report](./TEST-RESULTS.md)
   **Pass Rate:** XX/XX (100%)
   ```

**What You CANNOT Say Without Testing:**

- ❌ "Feature complete"
- ❌ "All working"
- ❌ "Tests passing"
- ❌ "Ready for review"

**What You MUST Say With Evidence:**

- ✅ "Tests executed: 24/24 passing (see TEST-RESULTS.md)"
- ✅ "HTML report: frontend/playwright-report/index.html"
- ✅ "Evidence documented in STATUS.md"

**See Full Protocol:** [MANDATORY-TESTING-PROTOCOL.md](./MANDATORY-TESTING-PROTOCOL.md)

**Historical Context:** This requirement was added after Change Events was claimed "complete" with 44% test failure rate. This ensures it never happens again.

### Phase 4: Automatic Verification (MANDATORY)

**Input:** Claimed completion
**Output:** Independent verification report

**Process:**

```text
Main Agent completes work
    ↓
AUTOMATICALLY spawn Skeptical Verifier agent
    ↓
Verifier independently runs:
  - npm run quality
  - Test suites
  - Code inspections
  - Database schema checks
    ↓
Verifier writes report to:
  docs-ai/contents/docs/PRPs/[feature-name]/VERIFICATION-[task-name].md
    ↓
IF PASS → Main agent logs completion
IF FAIL → Main agent FIXES issues and re-verifies
```diff
**Skeptical Verifier Mindset:**

- Assume worker LIED about "it works"
- Assume tests were NOT run
- Assume requirements NOT fully met
- Prove these assumptions wrong with evidence

### Phase 5: Fix Loop (IF VERIFICATION FAILS)

**Input:** Failed verification report
**Output:** Passing verification

**Process:**

```text
while (verification status !== PASS) {
  1. Read verification report
  2. Fix ALL identified issues
  3. Re-run quality/tests manually
  4. Spawn verifier agent again
  5. Check new verification report
}
```

**Rules:**

- Fix ALL issues, not just some
- Don't report "85% passing is good enough"
- Don't ask user to review until verification PASSES

### Phase 6: Completion

**Input:** Passing verification
**Output:** Logged completion

**Actions:**

1. Update `.claude/task-log.md` with:
   - Timestamp
   - Quality check status
   - Test results (actual numbers)
   - Verification status
   - Path to verification report
2. Commit changes (if requested)
3. Report to user

---

## 📂 File Organization

### Task Tracking (Transient)

```bash
.claude/
├── current-task.md              # Active task
├── task-log.md                  # Historical log
├── tasks/[id].md                # Task definitions
└── worker-done-[id].md          # Worker completion signals
```markdown
### Documentation (Permanent)

```text
documentation/*project-mgmt/
├── in-progress/
│   └── [feature-name]/          # Feature directory
│       ├── README.md            # Feature overview
│       ├── PLANS-[FEATURE].md   # Implementation plan
│       ├── TASKS-[FEATURE].md   # Task tracking
│       ├── VERIFICATION-[name].md  # Verification reports
│       └── specs/               # Specifications
├── complete/
│   └── [feature-name]/          # Completed features
├── todo/
│   └── [feature-name].md        # Planned work
└── templates/
    ├── task.md
    ├── verification.md
    └── completion-report.md
```

**Rule:** Verification reports go in the feature's directory
**Location:** `docs-ai/contents/docs/PRPs/[feature-name]/VERIFICATION-[name].md`
**Why:** Keeps all feature documentation together, easy to find everything related to one feature

---

## ❌ What Went Wrong (Lessons Learned)

### Issue 1: Premature Completion Claims

**Problem:** Agent claimed "TASK COMPLETE" without running verification

**Evidence:**

- Claimed 14/14 tests passing
- Actually 13/14 passing
- Claimed zero TypeScript errors
- Actually 15 TypeScript errors

**Root Cause:** Verification was manual, not automatic

**Fix Applied:**

- Made verification spawning MANDATORY
- Added to CLAUDE.md as hard rule
- Verification now automatic after work completion

### Issue 2: Reporting Instead of Fixing

**Problem:** Agent found issues and reported them instead of fixing

**Evidence:**

- "Verification found 3 issues" → Stopped work
- "Auto-generate test failing" → Just reported it
- "TypeScript errors in 5 files" → Listed them without fixing

**Root Cause:** No clear rule that failures MUST be fixed immediately

**Fix Applied:**

- Added "MANDATORY: Verification Failure Response" section to CLAUDE.md
- Explicit ban on reporting without fixing
- Required behavior: Fix → Re-verify → Pass

### Issue 3: Confusing File Locations

**Problem:** Verification reports in `.claude/` instead of documentation

**Evidence:**

- User asked "where does the verifier provide updates?"
- User questioned "why wouldn't it be with project management files?"

**Root Cause:** Treating verification as temporary task tracking instead of permanent documentation

**Fix Applied:**

- Moved verification reports to `documentation/*project-mgmt/complete/`
- Updated CLAUDE.md with correct paths
- Clear separation: transient tracking vs permanent docs

### Issue 4: Accepting Partial Success

**Problem:** Agent said "85% passing is acceptable"

**Evidence:**

- 23/27 tests passing marked as "ACCEPTABLE"
- TypeScript errors ignored because "not in target files"
- Known issues marked "non-blocking" without fixing

**Root Cause:** No clear definition that completion = 100% passing

**Fix Applied:**

- Updated CLAUDE.md: Verification PASS required for completion
- Banned "acceptable" with failures
- Exception only for user decisions, not agent decisions

### Issue 5: User Had to Remind Agent of Process

**Problem:** User had to ask "was the verifier run?"

**Evidence:**

- Agent promised automatic workflow
- Workflow didn't happen automatically
- User frustrated: "I shouldn't have to ask"

**Root Cause:** Workflow described but not enforced

**Fix Applied:**

- Made verification AUTOMATIC (not optional)
- Added enforcement rules to CLAUDE.md
- This document to ensure process is followed

---

## ✅ Process Validation Checklist

Before claiming ANY task complete:

- [ ] All code changes made
- [ ] `npm run quality` passes (zero errors in changed files)
- [ ] Tests written (if new feature)
- [ ] Tests executed and passing (actual output captured)
- [ ] **Skeptical Verifier agent spawned AUTOMATICALLY**
- [ ] Verification report created in `documentation/*project-mgmt/complete/`
- [ ] Verification status: **PASS**
- [ ] IF VERIFICATION FAILED: Fixed ALL issues and re-verified until PASS
- [ ] Completion logged to `.claude/task-log.md`
- [ ] Verification report path referenced in log

**If ANY checkbox is unchecked → Task is NOT complete**

---

## 🔄 Verification Failure Response (Detailed)

When verifier reports FAILED status:

### Step 1: Read Verification Report

- Location: `docs-ai/contents/docs/PRPs/[feature-name]/VERIFICATION-[name].md`
- Read ENTIRE report
- List ALL issues found

### Step 2: Fix ALL Issues

- Do NOT pick and choose
- Do NOT say "these are minor"
- Fix EVERY item marked FAILED
- Fix EVERY test failure
- Fix EVERY TypeScript error

### Step 3: Verify Fixes Locally

```bash
# Run quality check
npm run quality --prefix frontend

# Run tests
npx playwright test [relevant-test-file]

# Confirm zero errors
```markdown
### Step 4: Re-Run Verification
- Spawn verifier agent AGAIN
- Provide same requirements
- Wait for new verification report

### Step 5: Check New Report
- Read new verification report
- IF PASS → Proceed to completion
- IF FAIL → Return to Step 2

**Repeat until PASS**

---

## 🚨 Red Flags (Stop and Fix)

If you catch yourself saying/thinking:
- ❌ "Most tests are passing, that's good enough"
- ❌ "This error is in a different file, not my problem"
- ❌ "The user can decide if they want this fixed"
- ❌ "I'll document this issue for later"
- ❌ "85% success rate is acceptable"
- ❌ "Known issue - low priority"

**STOP IMMEDIATELY**

These are signs you're about to claim premature completion.

**Correct Response:**
✅ "Tests failing → I will fix them now"
✅ "Errors found → Fixing all of them"
✅ "Verification failed → Re-running after fixes"

---

## 📊 Success Metrics

A task is SUCCESSFULLY complete when:
- ✅ Verification report status: **PASS**
- ✅ Quality check: **Zero errors** in changed files
- ✅ Tests: **100% passing** (or explicitly approved failures)
- ✅ No outstanding issues marked "TODO" or "known issue"
- ✅ User can immediately use/deploy the feature

**Not success:**
- ❌ "Mostly working"
- ❌ "Just needs a few fixes"
- ❌ "Ready except for..."
- ❌ "95% complete"

---

## 🔧 Tools and Commands

### Quality Check
```bash
# Full project check
npm run quality --prefix frontend

# Auto-fix what's possible
npm run quality:fix --prefix frontend
```yaml
### Testing

```bash
# Run specific test file
npx playwright test tests/e2e/[test-file].spec.ts

# Run with single worker (more stable)
npx playwright test [file] --workers=1

# Run with output
npx playwright test [file] --reporter=line
```yaml
### Verification
```bash
# Spawn verifier agent (via Task tool in conversation)
Task({
  subagent_type: "debugger",
  prompt: "SKEPTICAL VERIFIER MODE... [full prompt]",
  description: "Verify [task name]"
})
```

---

## 📝 Templates

### Verification Report Template

Location: `documentation/*project-mgmt/templates/verification.md`

```markdown
# Verification Report: [Task Name]

## Verifier Info
- Timestamp: [ISO timestamp]
- Task: [Task description]

## Quality Check Results
```text
[Actual command output]
```text
Status: PASS / FAIL

## Test Results

```text
[Actual test output]
```

- Tests passed: X/Y
- Pass rate: Z%

Status: PASS (100%) / FAIL

## Code Verification

- [ ] Requirement 1: MET / NOT MET [evidence]
- [ ] Requirement 2: MET / NOT MET [evidence]

## Final Status

**VERIFIED ✓** / **FAILED ✗**

## Issues Found

[List or "None"]

```markdown
### Task Log Entry Template
```markdown
## [Task Name] - COMPLETE ✓
- Timestamp: [ISO timestamp]
- Quality Check: PASS (output: [summary])
- Tests Run: [X/Y passing]
- Verification: VERIFIED ✓
- Evidence: documentation/*project-mgmt/complete/verification-[name].md

### Files Changed
1. [file path] - [what changed]
```diff
---

## 🎓 Training Examples

### Good Example: Fix → Verify → Pass

```text
1. Implement feature
2. Run npm run quality → 3 errors found
3. Fix all 3 errors immediately
4. Run npm run quality → PASS
5. Run tests → 2 failures
6. Fix both test failures
7. Run tests → ALL PASS
8. Spawn verifier
9. Verifier reports: PASS
10. Log completion
```

### Bad Example: Report → Stop

```text
1. Implement feature
2. Run npm run quality → 3 errors found
3. Say "Found 3 errors, they are..."
4. Spawn verifier
5. Verifier reports: FAIL (3 TypeScript errors)
6. Say "Verifier found issues"
7. STOP ❌
```

**What went wrong:** Stopped at step 3 instead of fixing

---

## 🔒 Enforcement

This process is MANDATORY for all feature work.

**Violations:**

- Claiming completion without verification: **BLOCKED**
- Reporting issues without fixing: **BLOCKED**
- Accepting <100% pass rate without user approval: **BLOCKED**

**Authority:** This document + CLAUDE.md

**Review:** If workflow fails, update this document

---

**Document Status:** ACTIVE
**Next Review:** After next feature completion
**Owner:** Development Process

*This document was created after discovering process failures in the Change Events implementation. It codifies the lessons learned to prevent recurrence.*
