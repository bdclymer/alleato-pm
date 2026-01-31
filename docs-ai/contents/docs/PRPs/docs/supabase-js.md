# Supabase JS (v2) Reference

**Source**: https://supabase.com/docs/reference/javascript/select
**Version in repo**: @supabase/supabase-js ^2.87.1 (see `frontend/package.json`).

## Anchored References
- Querying data (select): https://supabase.com/docs/reference/javascript/select
- Filtering: https://supabase.com/docs/reference/javascript/using-filters
- Single row responses: https://supabase.com/docs/reference/javascript/single

## Key Points to Apply
- Use `createClient()` from `@/lib/supabase/server` for server components and route handlers, `@/lib/supabase/client` in client components.
- `single()` throws if no row; handle `error` and null responses explicitly.
- Filters like `.eq`, `.ilike`, `.order` are chainable and return `{ data, error }`.

## Gotchas
- RLS can silently return empty data; use `createServiceClient` for server-side admin use cases.
- `select('*')` in list pages should be paired with `.order()` for deterministic ordering.
