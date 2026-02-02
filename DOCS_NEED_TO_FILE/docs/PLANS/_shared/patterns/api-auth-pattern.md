# Pattern: API Authentication in Playwright Tests

**Severity:** CRITICAL
**Category:** Testing / Authentication

---

## The Problem

API tests return 401/404 despite valid auth cookies because:
- Manual `Cookie` headers via `request` fixture are ignored by Next.js
- Next.js `cookies()` function doesn't see manually injected headers
- Supabase server client gets no session

## The Solution

Use the authenticated fixture with `storageState`:

```typescript
// WRONG - Returns 401
test('api test', async ({ request }) => {
  const cookies = getCookiesFromAuth();
  const response = await request.get('/api/projects', {
    headers: { Cookie: cookies }
  });
});

// RIGHT - Works
import { test, expect } from '../fixtures';

test('api test', async ({ authenticatedRequest }) => {
  const response = await authenticatedRequest.get('/api/projects');
  expect(response.ok()).toBe(true);
});
```

## Prerequisites

1. Run auth setup first:
   ```bash
   npx playwright test auth.setup.ts
   ```

2. Verify auth file exists:
   ```
   frontend/tests/.auth/user.json
   ```

## Test Credentials

```
Email: test1@mail.com
Password: test12026!!!
```

## API Test Examples

```typescript
import { test, expect } from '../fixtures';

test.describe('Change Events API', () => {
  test('GET list', async ({ authenticatedRequest }) => {
    const response = await authenticatedRequest.get(
      '/api/projects/123/change-events'
    );
    expect(response.ok()).toBe(true);
  });

  test('POST create', async ({ authenticatedRequest }) => {
    const response = await authenticatedRequest.post(
      '/api/projects/123/change-events',
      { data: { title: 'Test Event' } }
    );
    expect(response.status()).toBe(201);
  });
});
```

## Browser Tests with Auth

```typescript
test.describe('Browser tests', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  test('page loads', async ({ page }) => {
    await page.goto('/123/change-events');
    await expect(page.locator('h1')).toContainText('Change Events');
  });
});
```

---

**Reference:** `.agents/patterns/solutions/auth-fixture-pattern.md`
