# Patterns Library

> Proven solutions to common problems. Read these before starting work.

---

## Pattern Index

| Pattern | Severity | When to Apply | File |
|---------|----------|---------------|------|
| DOM Content Loaded | CRITICAL | Any Playwright test | `domcontentloaded-pattern.md` |
| API Authentication | CRITICAL | API tests with Playwright | `api-auth-pattern.md` |
| Route Parameters | CRITICAL | Creating dynamic routes | See LESSONS-LEARNED.md |
| Supabase Types | HIGH | Any database work | See LESSONS-LEARNED.md |
| Verification Gate | HIGH | Before claiming completion | See QUALITY-GATES.md |

---

## Critical Patterns Summary

### 1. Playwright Wait Strategy

```typescript
// WRONG - Causes timeouts
await page.goto('/dashboard');
await page.waitForLoadState('networkidle');

// CORRECT - Reliable
await page.goto('/dashboard');
await page.waitForLoadState('domcontentloaded');
await page.locator('[data-testid="content"]').waitFor();
```

**Full pattern:** `domcontentloaded-pattern.md`

---

### 2. API Authentication in Tests

```typescript
// WRONG - Doesn't include auth
const response = await page.request.get('/api/items');

// CORRECT - Include cookies
import fs from 'fs';
const auth = JSON.parse(fs.readFileSync('tests/.auth/user.json', 'utf-8'));
const cookies = auth.cookies.map(c => `${c.name}=${c.value}`).join('; ');

const response = await page.request.get('/api/items', {
  headers: { Cookie: cookies }
});
```

**Full pattern:** `api-auth-pattern.md`

---

### 3. Route Parameter Naming

```bash
# Check existing routes first
find frontend/src/app -type d -name "[*]"

# WRONG - Inconsistent
api/projects/[id]/...
[projectId]/contracts/...

# CORRECT - Always [projectId]
api/projects/[projectId]/...
[projectId]/contracts/...
```

---

### 4. Supabase Types

```bash
# Run BEFORE any database work
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public > frontend/src/types/database.types.ts
```

---

### 5. Quality Verification

```bash
# Run BEFORE claiming completion
npm run quality --prefix frontend

# Expected output: 0 TypeScript errors, 0 ESLint errors
```

---

## Related Resources

| Resource | Location |
|----------|----------|
| Full Lessons Learned | `../_shared/LESSONS-LEARNED.md` |
| Quality Gates | `../_shared/QUALITY-GATES.md` |
| Quick Reference | `../_shared/QUICK-REFERENCE.md` |
| Error Patterns (detailed) | `.agents/patterns/errors/` |
| Solution Patterns (detailed) | `.agents/patterns/solutions/` |

---

## Adding New Patterns

When you discover a new pattern, add it:

1. Create `{pattern-name}.md` in this folder
2. Follow this template:

```markdown
# Pattern: {Name}

**Severity:** CRITICAL | HIGH | MEDIUM
**When to apply:** {description}

## The Problem
What goes wrong without this pattern.

## The Solution
```code
Correct approach
```

## Anti-pattern
```code
Wrong approach
```

## References
- Related files
- Evidence of when this was discovered
```

3. Add to the Pattern Index table above
