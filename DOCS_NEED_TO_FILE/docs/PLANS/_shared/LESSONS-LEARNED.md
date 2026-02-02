# Lessons Learned - Alleato-Procore

> **READ THIS FILE BEFORE STARTING ANY WORK.**
> These lessons were learned the hard way. Following them will save you hours of debugging.

**Last Updated:** 2026-01-14

---

## Quick Reference: Top 6 Critical Mistakes

| # | Mistake | Fix | Severity |
|---|---------|-----|----------|
| 1 | Using `networkidle` in Playwright | Use `domcontentloaded` instead | CRITICAL |
| 2 | Inconsistent route params (`[id]` vs `[projectId]`) | Always use `[projectId]` | CRITICAL |
| 3 | API tests return 401/403 | Include auth cookies in requests | CRITICAL |
| 4 | Claiming "complete" without evidence | Run quality gates, show output | CRITICAL |
| 5 | Stale Supabase types | Regenerate before ANY database work | HIGH |
| 6 | FK constraint on created_by | Verify profile exists first | HIGH |

---

## 1. NetworkIdle Timeout (CRITICAL)

### The Problem
Using `waitForLoadState('networkidle')` in Playwright causes tests to timeout or be flaky.

**Why it happens:** Modern apps have:
- Real-time subscriptions (Supabase)
- Background polling
- Analytics pings
- These never "settle"

### Evidence
- 30+ test files experienced random timeouts
- Tests pass locally, fail in CI
- Timeout after 30-120 seconds

### The Fix

```typescript
// WRONG - Will hang
await page.goto('/dashboard');
await page.waitForLoadState('networkidle');

// CORRECT - Reliable
await page.goto('/dashboard');
await page.waitForLoadState('domcontentloaded');

// If you need specific content loaded:
await page.locator('[data-testid="dashboard-content"]').waitFor();
// OR wait for a specific API response
await page.waitForResponse(resp => resp.url().includes('/api/projects'));
```

### Pattern File
See: `patterns/domcontentloaded-pattern.md`

---

## 2. Route Parameter Mismatch (CRITICAL)

### The Problem
Using `[id]` in API routes but `[projectId]` in pages breaks Next.js routing.

**Why it happens:** Next.js uses folder names as route parameters. Inconsistent naming causes:
- 404 errors
- Params not matching
- Build failures

### Evidence
```
# This breaks the app:
api/projects/[id]/contracts/route.ts      # Uses [id]
[projectId]/contracts/[contractId]/page.tsx  # Uses [projectId]

# Next.js sees these as DIFFERENT parameters
```

### The Fix

**ALWAYS check existing routes first:**
```bash
find frontend/src/app -type d -name "[*]"
```

**ALWAYS use `[projectId]` for project routes:**
```
frontend/src/app/api/projects/[projectId]/...
frontend/src/app/[projectId]/...
```

### Prevention
Before creating ANY dynamic route folder:
1. Run the find command above
2. Match the existing parameter name exactly
3. Never use `[id]` for projects - always `[projectId]`

---

## 3. API Authentication in Playwright (CRITICAL)

### The Problem
API requests return 401 (Unauthorized) or 403 (Forbidden) even though the test is "logged in".

**Why it happens:** Playwright's `page.request` doesn't automatically include cookies from the browser context.

### Evidence
```typescript
// This fails with 401:
await page.request.post('/api/projects/123/items', {
  data: { name: 'Test' }
});

// Browser has cookies, but page.request doesn't send them
```

### The Fix

**Read and include auth cookies manually:**

```typescript
import fs from 'fs';

// Read auth from fixture (created by auth.setup.ts)
const authData = JSON.parse(
  fs.readFileSync('tests/.auth/user.json', 'utf-8')
);

// Build cookie header
const cookies = authData.cookies
  .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
  .join('; ');

// Include in API requests
const response = await page.request.post('/api/projects/123/items', {
  headers: {
    Cookie: cookies,
    'Content-Type': 'application/json'
  },
  data: { name: 'Test' }
});
```

### Pattern File
See: `patterns/api-auth-pattern.md`

---

## 4. Premature Completion Claims (CRITICAL)

### The Problem
Agents claim "complete" or "tests pass" without actually running verification.

**Historical incidents:**
- Agent claimed 14/14 tests passing → Actually 13/14
- Agent claimed "zero TypeScript errors" → Actually 15 errors
- Agent said "verified" → No verification was run
- Agent accepted 85% pass rate as "acceptable"

### The Fix

**NEVER claim completion without these artifacts:**

```markdown
## Evidence Required for Completion

### 1. Quality Gate (REQUIRED)
Command: npm run quality --prefix frontend
Output: 0 errors, X warnings
Timestamp: YYYY-MM-DD HH:MM

### 2. Test Results (REQUIRED)
Command: npx playwright test tests/e2e/{feature}*.spec.ts
Results: X/X passing (100%)
Report: frontend/playwright-report/index.html

### 3. Status Update (REQUIRED)
- TASKS.mdx checkboxes updated
- STATUS.mdx updated with completion %
- Last Updated timestamp refreshed
```

### Banned Phrases
These are NOT evidence:
- "Tests should pass"
- "I verified the code"
- "Everything looks good"
- "Most tests passing"
- "Ready for review"

**Replace with:** Actual command output and pass rates.

---

## 5. Stale Supabase Types (HIGH)

### The Problem
TypeScript errors like "Property 'X' does not exist on type 'Y'" when working with database.

**Why it happens:** The `database.types.ts` file was generated before schema changes.

### Evidence
```typescript
// Error: Property 'new_column' does not exist on type 'contracts'
const contract = await supabase.from('contracts').select('new_column').single();
```

### The Fix

**ALWAYS regenerate types before ANY database work:**

```bash
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public > frontend/src/types/database.types.ts
```

**When to run this:**
- At the start of every session
- After applying any migration
- Before writing any database code
- When you see "Property does not exist" errors

---

## 6. Foreign Key Constraint on User Profile (HIGH)

### The Problem
Insert fails with "violates foreign key constraint" on `created_by` or `user_id`.

**Why it happens:** The `profiles` table FK references require the user to have a profile record.

### Evidence
```
ERROR: insert or update on table "contracts" violates foreign key constraint "contracts_created_by_fkey"
DETAIL: Key (created_by)=(uuid) is not present in table "profiles".
```

### The Fix

**Option 1: Ensure profile exists in RLS policy:**
```sql
-- In migration or RLS
CREATE POLICY "Users can insert" ON contracts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );
```

**Option 2: Create profile in auth hook:**
```sql
-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**For tests:** Ensure test user has a profile record.

---

## 7. Next.js 15 Async Params (MEDIUM)

### The Problem
TypeScript error: "Property 'X' does not exist on type 'Promise<{...}>'"

**Why it happens:** Next.js 15 made `params` async in page components.

### Evidence
```typescript
// WRONG - params is now a Promise
export default function Page({ params }: { params: { projectId: string } }) {
  const { projectId } = params; // Error!
}
```

### The Fix

```typescript
// CORRECT - await the params
export default async function Page({
  params
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params;
  // Now use projectId
}
```

---

## 8. Missing waitForLoadState (MEDIUM)

### The Problem
Tests are flaky - sometimes pass, sometimes fail to find elements.

**Why it happens:** Page navigation completes before content is rendered.

### The Fix

```typescript
// WRONG - May fail intermittently
await page.goto('/projects/123/contracts');
await page.click('button'); // Element might not exist yet

// CORRECT - Wait for page to be ready
await page.goto('/projects/123/contracts');
await page.waitForLoadState('domcontentloaded');
// OR wait for specific content
await page.locator('[data-testid="contracts-table"]').waitFor();
await page.click('button');
```

---

## 9. Hardcoded Test Data (MEDIUM)

### The Problem
Tests fail because they depend on specific database state that doesn't exist.

### The Fix

**Create test data at the start of each test:**
```typescript
test.beforeEach(async ({ page }) => {
  // Create fresh test data
  const response = await page.request.post('/api/projects/123/contracts', {
    headers: { Cookie: authCookies },
    data: { name: 'Test Contract', status: 'draft' }
  });
  testContractId = (await response.json()).id;
});

test.afterEach(async ({ page }) => {
  // Clean up test data
  await page.request.delete(`/api/projects/123/contracts/${testContractId}`, {
    headers: { Cookie: authCookies }
  });
});
```

---

## 10. Component Import Paths (LOW)

### The Problem
Import errors like "Cannot find module '@/components/...'".

### The Fix

Check the tsconfig.json paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Use consistent import style:
```typescript
// Use @ alias for src directory
import { Button } from '@/components/ui/button';
import { ContractForm } from '@/components/contracts/ContractForm';
```

---

## Prevention Checklist

Before starting ANY work:

```markdown
- [ ] Read this LESSONS-LEARNED.md file
- [ ] Check _shared/patterns/ for relevant patterns
- [ ] Run: npm run quality --prefix frontend (verify clean state)
- [ ] Run: npx supabase gen types... (fresh database types)
- [ ] Check existing route folders: find frontend/src/app -type d -name "[*]"
```

Before claiming ANY task complete:

```markdown
- [ ] npm run quality --prefix frontend passes (0 errors)
- [ ] Tests run and documented (X/Y passing)
- [ ] TASKS.mdx checkboxes updated
- [ ] STATUS.mdx updated
- [ ] Last Updated timestamp refreshed
```

---

## Adding New Lessons

When you discover a new pattern or mistake, add it here:

```markdown
## N. Title (SEVERITY)

### The Problem
Brief description of what goes wrong.

### Evidence
Code or error message showing the problem.

### The Fix
```code
Example of correct approach
```

### Prevention
How to avoid this in the future.
```

---

## Related Resources

| Document | Location |
|----------|----------|
| Playwright Patterns | `.agents/patterns/PLAYWRIGHT-PATTERNS.md` |
| Error Pattern Library | `.agents/patterns/errors/` |
| Solution Patterns | `.agents/patterns/solutions/` |
| Pattern Index (JSON) | `.agents/patterns/index.json` |
| Mandatory Gates | `*project-mgmt/shared/MANDATORY-GATES.mdx` |
| Route Naming Rules | `.agents/rules/CRITICAL-NEXTJS-ROUTING-RULES.md` |

---

**Remember: These patterns exist because someone made the mistake before. Learning from them saves hours of debugging.**
