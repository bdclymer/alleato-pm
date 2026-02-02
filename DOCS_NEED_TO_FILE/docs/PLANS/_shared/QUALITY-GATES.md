# Quality Gates - Mandatory Checks

> These checks MUST pass before claiming any task complete.
> No exceptions. No workarounds.

---

## Gate 1: Code Quality (REQUIRED)

```bash
npm run quality --prefix frontend
```

**Must show:**
- 0 TypeScript errors
- 0 ESLint errors (warnings OK)

**If it fails:**
1. Read the error message
2. Fix the issue in your code
3. Run again until it passes
4. Do NOT use `@ts-ignore` or `any` as workarounds

---

## Gate 2: Supabase Types (REQUIRED for Database Work)

```bash
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public > frontend/src/types/database.types.ts
```

**Run this BEFORE:**
- Writing any database queries
- Creating or modifying API routes
- Adding new database tables/columns

---

## Gate 3: Tests (REQUIRED for Feature Work)

```bash
cd frontend && npx playwright test tests/e2e/{feature}*.spec.ts
```

**Must show:**
- 100% pass rate (all tests passing)
- If no tests exist: write them first

**Acceptable:** Creating a minimal test that verifies basic functionality.
**Not acceptable:** Skipping tests or marking them as `.skip`.

---

## Gate 4: Documentation Update (REQUIRED)

After completing any task:

1. **Update TASKS.mdx:**
   - Change `[ ]` to `[x]` for completed tasks
   - Update phase completion percentages
   - Update "Last Updated" timestamp

2. **Update STATUS.mdx:**
   - Update overall completion percentage
   - Document any blockers found
   - Note what should be done next

---

## Completion Evidence Template

Copy this into your completion claim:

```markdown
## Completion Evidence

### Gate 1: Code Quality
- Command: `npm run quality --prefix frontend`
- TypeScript errors: 0
- ESLint errors: 0
- Timestamp: YYYY-MM-DD HH:MM

### Gate 2: Supabase Types
- Command: `npx supabase gen types...`
- Status: Regenerated
- Timestamp: YYYY-MM-DD HH:MM

### Gate 3: Tests
- Command: `npx playwright test tests/e2e/{feature}.spec.ts`
- Results: X/X passing (100%)
- Report: frontend/playwright-report/index.html

### Gate 4: Documentation
- TASKS.mdx: Updated with [x] checkboxes
- STATUS.mdx: Updated with completion %
- Last Updated: YYYY-MM-DD HH:MM
```

---

## What NOT to Do

| Banned Action | Why |
|---------------|-----|
| Skip quality check | Hidden errors break production |
| Use `@ts-ignore` | Masks real type problems |
| Use `any` type | Defeats TypeScript's purpose |
| Say "tests should pass" | Actually run them |
| Mark complete without evidence | Causes rework |
| Leave `console.log` | Clutters production logs |

---

## Quick Quality Check Sequence

```bash
# 1. Generate fresh types
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public > frontend/src/types/database.types.ts

# 2. Run quality check
npm run quality --prefix frontend

# 3. Run feature tests
cd frontend && npx playwright test tests/e2e/{feature}*.spec.ts

# 4. If all pass, update documentation
# Edit TASKS.mdx and STATUS.mdx
```

---

## When Gates Fail

### TypeScript Error

1. Read the error message carefully
2. Check the file and line number
3. Fix the type issue (don't suppress it)
4. Run `npm run typecheck --prefix frontend` to verify

### ESLint Error

1. Read what rule was violated
2. Fix according to the rule
3. Run `npm run lint --prefix frontend` to verify
4. For false positives, add disable comment with explanation

### Test Failure

1. Read the failure message
2. Check if it's a code bug or test bug
3. Fix the root cause
4. Run the specific test to verify: `npx playwright test {test-file} --grep "{test-name}"`

### Cannot Fix

If you genuinely cannot fix an issue:
1. Document the exact error in STATUS.mdx
2. Explain what you tried
3. Mark the task as blocked, not complete
4. Move on to a different task

---

**Remember: Quality gates exist to catch problems early. Skipping them creates bigger problems later.**
