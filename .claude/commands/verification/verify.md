# Verify Current Task

Run verification checks before marking ANY task as complete.

## Quick Verification (Default)
Runs basic checks to ensure code quality:
- TypeScript compilation
- ESLint checks  
- Build verification
- Console.log detection
- TODO scanning

```bash
cd frontend && npx tsx scripts/verify-task.ts
```

## Visual Verification (MANDATORY for UI Changes)
For ANY UI changes, you MUST run visual verification:

```bash
# Start dev server first
npm run dev

# In another terminal, run visual verification
npx tsx scripts/verify-visual.ts

# Or specify pages:
npx tsx scripts/verify-visual.ts /dashboard:dashboard /executive:executive
```

This will:
- Capture screenshots at 3 viewports
- Verify layout metrics (viewport usage, padding, spacing)
- Flag issues like narrow dashboards or missing edge padding
- Save screenshots to tests/screenshots/visual-verification/

## Extended Verification
For more complex tasks, also run:

```bash
# UI Changes - Visual verification
npm run dev
# Then manually check:
# - Desktop (1440px)
# - Tablet (768px)  
# - Mobile (375px)

# API Changes - Test endpoints
curl -X GET http://localhost:3000/api/[endpoint]
curl -X POST http://localhost:3000/api/[endpoint] -d '{"test": "data"}'

# Database Changes
npm run db:check
```

## Verification Checklist

Before marking complete, ensure:
- [ ] All verification checks pass
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Code builds successfully
- [ ] Feature works as intended
- [ ] Edge cases handled
- [ ] No console.logs left
- [ ] TODOs are resolved or documented

## Common Failures

1. **TypeScript Errors**: Fix all type issues
2. **Lint Errors**: Run `npm run lint:fix`
3. **Build Failures**: Check imports and dependencies
4. **Console Logs**: Remove or convert to proper logging
5. **Incomplete Implementation**: Finish all requirements

## Report Issues

If verification fails:
1. Fix all issues
2. Re-run verification
3. Only mark complete when ALL checks pass