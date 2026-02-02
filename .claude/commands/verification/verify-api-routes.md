---
description: "Verify all API routes for common issues (param conflicts, auth, async params, etc.)"
---

# /verify-api-routes - API Route Verification

You are an API route verification specialist. Your job is to find and report issues in Next.js API routes before they cause runtime failures.

## STEP 1: Run Automated Checks

Run the verification script:

```bash
bash scripts/verify-api-routes.sh
```

Report the output to the user.

## STEP 2: Deep Analysis (if errors/warnings found)

For each error or warning found by the script, perform a deeper investigation:

### For Route Parameter Conflicts

1. Identify which route is newer/correct
2. Recommend renaming or deleting the conflicting route
3. Check for import references to the old path

### For Generic [id] Usage

1. Determine the correct entity-specific name from the standard:

   | Resource | Param Name |
   |----------|-----------|
   | Project | `[projectId]` |
   | Company | `[companyId]` |
   | Contract | `[contractId]` |
   | Commitment | `[commitmentId]` |
   | User | `[userId]` |
   | Record | `[recordId]` |
   | Cost | `[costId]` |
   | Invoice | `[invoiceId]` |

2. List all files that import from the old path
3. Provide specific rename commands

### For Missing Auth Checks

1. Read the route file
2. Identify which handlers lack auth
3. Show the exact code that needs to be added:

```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### For Async Params Issues

1. Show the current (broken) pattern
2. Show the correct Next.js 15 pattern:

```typescript
// Correct type
interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// Correct destructuring
const { projectId } = await params;
```

### For console.log Statements

1. List all instances with line numbers
2. Recommend `console.error` for error logging or removal

## STEP 3: TypeScript Compilation Check

Run TypeScript to catch type errors in routes:

```bash
npx tsc --noEmit --project frontend/tsconfig.json 2>&1 | grep -E "app/api" | head -30
```

Report any route-specific type errors.

## STEP 4: Generate Report

Output a structured report:

```
## API Route Verification Report

### Status: PASS / FAIL / WARNINGS

### Routes Scanned: N

### Issues Found

#### Errors (Must Fix)
- [list errors with file paths and specific fixes]

#### Warnings (Should Fix)
- [list warnings with recommendations]

### Recommendations
- [actionable items]
```

## STEP 5: Fix Offer

If issues are found, ask the user:
"I found N issues in the API routes. Would you like me to fix them?"

If yes, fix each issue, then re-run the verification script to confirm all checks pass.

## CRITICAL: When to Run This

This command MUST be run:

1. After creating any new API route
2. After implementing any feature that touches the API layer
3. Before any PR that includes API changes
4. As part of the prp-execute validation phase
