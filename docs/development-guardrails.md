# Development Guardrails

Actionable rules for AI agents. No philosophy — only what to do, when, and how to verify it.

---

## Task Completion Gates

A task is **not done** until all of these pass:

```bash
cd frontend
npm run typecheck   # zero errors required
npm run lint        # zero errors required
npm run build       # must succeed
```

If any gate fails, fix it before reporting complete. Do not report “complete with minor TypeScript issues.”

---

## Bug Fix Completion Gate

A bug fix is **not done** without at least one permanent guardrail added:

| Option | Example |
|--------|---------|
| Smoke test entry | Add endpoint to `scripts/api-smoke-contracts.mjs` |
| Playwright E2E test | Add test that would have caught the failure |
| Unit test | Add test for the broken logic |
| Zod validation | Add schema enforcement that rejects the bad input |
| Shared wrapper | Fix the pattern at the utility layer, not the call site |

After every fix, answer these three questions in your response:
1. What would have caught this before it reached production?
2. What guardrail am I adding now so this class of bug cannot recur?
3. Does this reveal a pattern needing a system-level fix?

---

## API Endpoint Rules

### Error responses must be structured

Every API route must return a structured error, never a bare string:

```ts
// Required shape for all error responses
return NextResponse.json(
  {
    error: “Human-readable message explaining what failed and why”,
    code: “DESCRIPTIVE_ERROR_CODE”,       // machine-readable
    where: “route/change-events POST”,    // which handler failed
  },
  { status: 4xx | 5xx }
)
```

Never return: `{ error: “Something went wrong” }` or `{ message: “Failed” }`

### New endpoints must be registered in smoke tests

After creating any new API route, add it to `scripts/api-smoke-contracts.mjs`. Run the suite to verify:

```bash
node scripts/api-smoke-contracts.mjs
```

All endpoints must return expected status codes. Fix any that fail before moving on.

### External calls must use `fetchWithGuardrails`

In API routes, never use raw `fetch()` for calls to external services:

```ts
import { fetchWithGuardrails } from “@/lib/fetch-with-guardrails”;

const data = await fetchWithGuardrails(“https://...”, {
  method: “POST”,
  timeoutMs: 10_000,
  retries: 2,
  where: “route/my-endpoint”,
});
```

Raw `fetch` to external services has no timeout and no structured error output.

### Internal API calls must use `apiFetch`

In pages, components, and hooks, never use raw `fetch(“/api/...”)`:

```ts
import { apiFetch } from “@/lib/api-client”;

await apiFetch(`/api/projects/${id}/resource`, { method: “DELETE” });
```

---

## TypeScript Rules

1. **Zero errors required.** Run `npm run typecheck` before closing any task.
2. **No `any`, `@ts-ignore`, or `as SomeType` casts** without a comment explaining why.
3. **Repeated type errors = shared type problem.** If the same type issue appears in multiple files, fix it at the source (shared interface, API client type, generated types) — not in each individual file.
4. **Use generated database types.** Run `npm run db:types` before any database work, then use types from `frontend/src/types/database.types.ts`.

### Common TypeScript error categories and fixes

| Pattern | Fix |
|---------|-----|
| `undefined` not handled | Add null check or use optional chaining |
| API response shape mismatch | Update shared type or regenerate DB types |
| Missing prop type | Add to interface, don't use `any` |
| Union type not narrowed | Add discriminant check before accessing |
| `req` instead of `request` | Next.js App Router uses `request` parameter |

---

## Design System Rules

Before writing any UI code, check `@/components/ds` and `@/components/ui` for an existing component. If one exists, use it.

1. **No raw `<button>` elements** — use `<Button>` from `@/components/ui/button`
2. **No hardcoded colors** — use semantic tokens: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`
3. **No `bg-white`, `bg-gray-*`, `text-gray-*`** — these break dark mode and violate the token system
4. **No `shadow-md` or larger** — use `shadow-xs` (cards) or `shadow-sm` (dropdowns) only
5. **No wrapping content in cards unnecessarily** — cards must earn their place
6. **Status colors must use `<StatusBadge>`** — never hand-roll status color logic
7. **All new pages must use `PageShell`** — never `<PageContainer>` + manual `<h1>` on new pages

ESLint enforces `no-hardcoded-colors`, `no-arbitrary-spacing`, `require-semantic-colors` as errors. Violations block the build.

**After any UI change:** verify in browser before reporting done. Take a screenshot if using agent-browser.

---

## Input Validation Rules

Every API route that accepts a body must validate it before use:

```ts
const body = await request.json()
if (!body.name || typeof body.name !== “string”) {
  return NextResponse.json(
    { error: “name is required and must be a string”, code: “INVALID_INPUT”, where: “...” },
    { status: 400 }
  )
}
```

Prefer Zod schemas for complex bodies:

```ts
const schema = z.object({ name: z.string().min(1), amount: z.number().positive() })
const result = schema.safeParse(body)
if (!result.success) {
  return NextResponse.json(
    { error: result.error.message, code: “VALIDATION_FAILED”, where: “...” },
    { status: 400 }
  )
}
```

---

## Recurring Issue Rule

If the same class of bug has appeared more than once, a local fix is not enough.

Required response:
1. Identify the pattern (e.g., “missing GET handler”, “req vs request”, “seed data status mismatch”)
2. Fix at the system level: shared wrapper, lint rule, shared type, documentation in `docs/patterns/`
3. Add to smoke tests or regression tests so the pattern is permanently guarded

Do not fix the same symptom in file 6 without fixing it in files 1–5 and the root cause.

---

## Severity Model

| Severity | Condition | Required Action |
|----------|-----------|-----------------|
| Critical | Service broken, data loss risk | Fix immediately, add regression test |
| High | Major feature broken | Fix in current session, add smoke test |
| Medium | Degraded but usable | Fix before new feature work, log issue |
| Low | Minor visual or non-blocking | Log, fix opportunistically |

---

## Quick Reference: What Catches What

| Failure type | Guardrail to add |
|-------------|-----------------|
| Broken API endpoint | Entry in `scripts/api-smoke-contracts.mjs` |
| Wrong HTTP method (405) | Add missing handler (`GET`, `POST`, etc.) |
| Broken user flow | Playwright E2E test |
| Bad input accepted | Zod validation at route entry |
| Silenced TypeScript error | Remove cast, fix root type |
| Hardcoded color/style | Replace with design token |
| Repeated fetch boilerplate | Use `apiFetch` / `fetchWithGuardrails` |
| DB column mismatch | Regenerate types (`npm run db:types`) |
| Status badge wrong color | Use `<StatusBadge>` with correct status string |