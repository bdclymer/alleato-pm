# Form Testing - Completion Criteria

**Date:** 2026-01-08

## How to Know When Testing is Complete

### 1. Run the Tests

```bash
cd frontend
npm run test:forms
```

### 2. Check the Summary Output

At the end of the test run, you'll see a summary like:

```
  68 passed (Xm)
```

OR if there are failures:

```
  50 passed (Xm)
  18 failed
```

### 3. View the HTML Report

```bash
npx playwright show-report tests/playwright-report
```

This opens a browser with:
- ✅ **Green checkmarks** = Tests passed
- ❌ **Red X's** = Tests failed (click to see details)
- Screenshots for each failure
- Error messages and stack traces

### 4. Success Criteria

**Tests are COMPLETE and SUCCESSFUL when:**

✅ All 68 tests show as **PASSED** (or at least 90%+ pass rate)
- 14 forms × ~5 tests each = ~70 tests total
- Some may be skipped if forms don't have all test types

✅ No BLOCKER errors in the HTML report
- Blockers = forms can't submit, crash, or lose data
- Minor styling issues are acceptable

✅ Database cleanup verification shows "✓ Complete"
- Check the test output for cleanup summary
- Or run: `npm run test:cleanup`

✅ Screenshots captured for all tested forms
- Located in: `frontend/tests/screenshots/`
- Should see files like: `create-project-load.png`, `create-project-filled.png`, etc.

### 5. What Success Looks Like

**Terminal Output:**
```bash
🧪 Form Testing Suite
   Scope: all
   Forms to test: 14
   Auth: Using .auth/user.json

Running 68 tests using 1 worker

  ✓ 68 tests passed (5m 32s)

✅ All form tests complete
   Forms tested: 14
   Test data cleanup: ✓ Complete
```

**HTML Report:**
- All rows show green checkmarks
- No red failures
- Screenshots available for each test

### 6. What Failure Looks Like

**Terminal Output:**
```bash
  50 passed (4m)
  18 failed

  1) [chromium] › Create Project › should load form
     Error: Timeout waiting for form to load
```

**HTML Report:**
- Red X's on failed tests
- Click each failure to see:
  - Error message
  - Stack trace
  - Screenshot of failure
  - Console logs

### 7. Next Steps Based on Results

**If ALL tests pass:**
- ✅ Form testing system is working correctly
- ✅ All 14 configured forms are functional
- ✅ Ready to add more forms or run in CI/CD

**If some tests fail:**
1. Open HTML report: `npx playwright show-report tests/playwright-report`
2. Click on failed tests to see details
3. Check if failures are:
   - **BLOCKER** = Form broken, needs immediate fix
   - **MAJOR** = UX issue, should be fixed soon
   - **MINOR** = Styling/small issue, can wait

**If many tests fail (>30%):**
- Check if dev server is running: `lsof -ti:3000`
- Check if auth file exists: `ls frontend/tests/.auth/user.json`
- Check database connection: Environment variables set?
- Review [PLAYWRIGHT_CONFIG_RULES.md](../../frontend/tests/PLAYWRIGHT_CONFIG_RULES.md)

### 8. Viewing Results

**Option 1: HTML Report (Best for detailed review)**
```bash
npx playwright show-report tests/playwright-report
```

**Option 2: Terminal Output (Quick check)**
```bash
npm run test:forms 2>&1 | tail -20
```

**Option 3: Screenshots (Visual verification)**
```bash
ls -la frontend/tests/screenshots/
```

### 9. Current Status

You can check the current status by:

1. **Run count** - How many tests executed vs. expected (68 total)
2. **Pass/Fail ratio** - What % passed
3. **Error severity** - Any blockers?
4. **Cleanup status** - Did database cleanup complete?

### 10. Continuous Monitoring

**For ongoing testing:**
- Tests run automatically on PRs (CI/CD)
- PR comments show pass/fail summary
- Artifacts uploaded to GitHub Actions
- Can re-run anytime with `/test-forms all`

---

## Quick Reference

| Metric | Target | How to Check |
|--------|--------|--------------|
| Tests Passed | 68/68 (100%) | Terminal summary |
| Blockers | 0 | HTML report, click failures |
| Database Cleanup | ✓ Complete | Terminal output at end |
| Screenshots | ~350+ files | `ls frontend/tests/screenshots/` |
| Auth Working | Yes | Tests show `[chromium]` not `[no-auth]` |

---

**Last Updated:** 2026-01-08
**Next Review:** After first full test run completes
