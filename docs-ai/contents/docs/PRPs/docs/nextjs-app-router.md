# Next.js App Router (v15.x) Reference

**Source**: https://nextjs.org/docs/app/building-your-application/routing
**Version in repo**: Next.js ^15.5.9 (see `frontend/package.json`).

## Anchored References
- Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Server Components vs Client Components: https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns
- Data Fetching (Server Components): https://nextjs.org/docs/app/building-your-application/data-fetching/fetching

## Key Points to Apply
- **Route handlers** must export named functions (GET/POST/etc.) and return `Response`/`NextResponse`.
- **Server components** can access `cookies()` and fetch data directly; **client components** must include `"use client"` and avoid server-only APIs.
- **Dynamic route params** in App Router are async and often passed as `params: Promise<{...}>` in this codebase.
- **`fetch` caching** defaults matter; use `cache: "no-store"` or `revalidate` when data must be fresh.

## Gotchas
- Adding `"use client"` at top makes the whole file client-only, so server-only utilities (`cookies`, `headers`, server Supabase clients) cannot be used there.
- `revalidatePath` is server-only and should only be used in server actions or route handlers.
