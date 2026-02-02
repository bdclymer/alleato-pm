# Pattern: Use DOMContentLoaded for Navigation

**Severity:** CRITICAL
**Category:** Playwright Testing

---

## The Problem

Using `waitForLoadState('networkidle')` causes tests to timeout because:
- Persistent connections (WebSockets, SSE) never complete
- Background analytics/tracking calls continue indefinitely
- Development tools keep connections open

## The Solution

Always use `domcontentloaded` instead:

```typescript
// WRONG - Will timeout
await page.goto('/dashboard');
await page.waitForLoadState('networkidle');

// RIGHT - Reliable
await page.goto('/dashboard');
await page.waitForLoadState('domcontentloaded');
```

## Navigation Helpers

Create `frontend/tests/helpers/navigation.ts`:

```typescript
import { Page } from '@playwright/test';

export async function safeNavigate(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
}

export async function navigateAndWaitFor(
  page: Page,
  url: string,
  selector: string
): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  await page.locator(selector).waitFor({ state: 'visible' });
}
```

## Usage

```typescript
import { safeNavigate, navigateAndWaitFor } from '../helpers/navigation';

// Simple navigation
await safeNavigate(page, '/dashboard');

// Wait for specific element
await navigateAndWaitFor(page, '/123/budget', '[data-testid="budget-table"]');
```

## When to Use What

| Scenario | Method |
|----------|--------|
| Simple page navigation | `safeNavigate(page, url)` |
| Wait for specific content | `navigateAndWaitFor(page, url, selector)` |
| After clicking a link | `page.waitForLoadState('domcontentloaded')` |
| **NEVER USE** | `waitForLoadState('networkidle')` |

---

**Reference:** `.agents/patterns/solutions/domcontentloaded-pattern.md`
