# TypeScript Handbook (Strict Typing) Reference

**Source**: https://www.typescriptlang.org/docs/handbook/intro.html
**Version in repo**: TypeScript ^5.x (see `frontend/package.json`).

## Anchored References
- Narrowing & Type Guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Generics: https://www.typescriptlang.org/docs/handbook/2/generics.html
- Utility Types: https://www.typescriptlang.org/docs/handbook/utility-types.html

## Key Points to Apply
- Use **type guards** when consuming JSONB/unknown fields (e.g., meeting segments). Prefer `Array.isArray` and object checks.
- Prefer **Database-derived types** (`Database["public"]["Tables"][T]`) to avoid drift from Supabase schema.
- Use **utility types** like `Partial<T>` for form state and `Pick<T, K>` for component props.

## Gotchas
- Avoid `any` in shared types; use `unknown` and narrow to keep strict typing.
- When extending generated types, intersect types (`Row & { extra?: ... }`) to preserve base fields.
