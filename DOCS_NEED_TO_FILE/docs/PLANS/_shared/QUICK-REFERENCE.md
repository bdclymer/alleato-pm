# Quick Reference - Common Commands & Snippets

> Copy-paste ready commands and code snippets for common tasks.

---

## Quality Checks

```bash
# Run all quality checks (TypeScript + ESLint)
npm run quality --prefix frontend

# TypeScript only
npm run typecheck --prefix frontend

# ESLint only
npm run lint --prefix frontend

# Fix auto-fixable ESLint issues
npm run lint:fix --prefix frontend
```

---

## Supabase

```bash
# Generate TypeScript types (RUN BEFORE ANY DATABASE WORK)
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public > frontend/src/types/database.types.ts

# Push migrations to database
npx supabase db push

# Check migration status
npx supabase migration list

# Create new migration
npx supabase migration new <migration_name>
```

---

## Playwright Testing

```bash
# Run specific feature tests
cd frontend && npx playwright test tests/e2e/{feature}*.spec.ts

# Run with UI mode (for debugging)
cd frontend && npx playwright test tests/e2e/{feature}.spec.ts --ui

# Run with headed browser (see what's happening)
cd frontend && npx playwright test tests/e2e/{feature}.spec.ts --headed

# Generate HTML report
cd frontend && npx playwright test --reporter=html

# Open last report
cd frontend && npx playwright show-report

# Run tests matching a pattern
cd frontend && npx playwright test --grep "contract"

# Update snapshots
cd frontend && npx playwright test --update-snapshots
```

---

## Development Server

```bash
# Start dev server
npm run dev --prefix frontend

# Build for production
npm run build --prefix frontend

# Start production server
npm run start --prefix frontend
```

---

## Git

```bash
# Check status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "feat(feature): description"

# Push to remote
git push

# Create branch
git checkout -b feature/feature-name

# Switch branch
git checkout branch-name
```

---

## Code Snippets

### Playwright - Wait for Page Load

```typescript
// Correct way to wait for navigation
await page.goto('/projects/123/contracts');
await page.waitForLoadState('domcontentloaded');
await page.locator('[data-testid="page-content"]').waitFor();
```

### Playwright - API Request with Auth

```typescript
import fs from 'fs';

// Read auth cookies
const authData = JSON.parse(
  fs.readFileSync('tests/.auth/user.json', 'utf-8')
);
const cookies = authData.cookies
  .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
  .join('; ');

// Make authenticated request
const response = await page.request.post('/api/projects/123/items', {
  headers: { Cookie: cookies, 'Content-Type': 'application/json' },
  data: { name: 'Test' }
});
```

### Next.js 15 - Async Page Params

```typescript
// Page component with async params
export default async function Page({
  params
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params;
  // Use projectId
}
```

### Supabase - Query with Types

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

const supabase = createClient();

// Typed query
const { data, error } = await supabase
  .from('contracts')
  .select('*')
  .eq('project_id', projectId)
  .single();
```

### API Route - Error Handling

```typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Your logic here
    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## File Paths

| What | Where |
|------|-------|
| Frontend pages | `frontend/src/app/[projectId]/{feature}/` |
| API routes | `frontend/src/app/api/projects/[projectId]/{feature}/` |
| Components | `frontend/src/components/{feature}/` |
| Schemas | `frontend/src/lib/schemas/{feature}.ts` |
| Services | `frontend/src/lib/services/{feature}-service.ts` |
| Tests | `frontend/tests/e2e/{feature}*.spec.ts` |
| DB Types | `frontend/src/types/database.types.ts` |
| Migrations | `supabase/migrations/*.sql` |

---

## Test Credentials

```
Email: test1@mail.com
Password: test12026!!!
Auth file: frontend/tests/.auth/user.json
```

---

## Supabase Project

```
Project ID: lgveqfnpkxvzbnnwuled
```
