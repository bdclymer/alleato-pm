# Prompt: Properly Verify Tests for Feature Completion

Copy this prompt when you need Claude to actually run and verify tests:

---

## Run and Verify Tests for [FEATURE NAME]

Please follow the test-runner-verifier protocol to ACTUALLY RUN tests and provide evidence they work.

### Requirements:

1. **Setup Verification**
   - Confirm dev server is running (`pnpm dev`)
   - Check auth file exists: `frontend/tests/.auth/user.json`
   - Verify test environment is ready

2. **Run Tests 3 Times** (not just once)

   ```bash
   for i in 1 2 3; do
     echo "Run $i of 3:"
     pnpm test:e2e tests/e2e/[feature].spec.ts --reporter=list
   done
   ```

3. **Provide Evidence**
   - Show the ACTUAL terminal output (not hypothetical)
   - Include all test names and pass/fail status
   - Show execution times
   - Capture any error messages

4. **If Tests Fail**
   - DO NOT claim completion
   - Debug using: `npx playwright test --debug`
   - Fix the issues
   - Re-run all 3 times again
   - Only claim success when ALL runs pass

5. **Create Verification Report**
   Create TEST-VERIFICATION.md with:
   - Date and time of test runs
   - Actual terminal output (copy/paste)
   - Stability results (3 runs)
   - Any issues fixed
   - Final status: PASS or BLOCKED

### Example of Acceptable Evidence:

```text
Run 1 of 3:
Running 5 tests using 1 worker
  ✓ Feature › test 1 (2.3s)
  ✓ Feature › test 2 (1.8s)
  ✓ Feature › test 3 (2.1s)
  ✓ Feature › test 4 (1.9s)
  ✓ Feature › test 5 (2.2s)
  5 passed (10.3s)

Run 2 of 3:
  5 passed (10.1s)

Run 3 of 3:
  5 passed (10.4s)

VERIFIED: All tests passing consistently
```

### DO NOT:

- ❌ Say "tests should pass" without running them
- ❌ Write tests without executing them
- ❌ Claim success after one run
- ❌ Skip failed tests
- ❌ Provide hypothetical output

### DO:

- ✅ Actually run the tests
- ✅ Show real terminal output
- ✅ Run multiple times
- ✅ Fix failures before claiming done
- ✅ Provide timestamped evidence

Start by checking if the dev server is running, then proceed with test execution.

---

This prompt ensures Claude actually runs tests instead of just claiming they work.
