# Pattern: Regenerate Supabase Types Before Database Work

**Severity:** HIGH
**Category:** Database / TypeScript

---

## The Problem

TypeScript types don't match the actual database schema when:
- Schema was modified by migrations not yet reflected in types
- Another developer applied migrations you haven't synced
- Types file is outdated

This causes:
- False TypeScript errors
- Runtime errors when fields don't exist
- Incorrect type inference

## The Solution

**ALWAYS regenerate types before any database work:**

```bash
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public \
  > frontend/src/types/database.types.ts
```

## When to Regenerate

1. **Before starting database work**
2. **After applying migrations**
3. **After pulling changes that include migrations**
4. **When TypeScript errors don't match the database**

## Detection

Signs types are stale:
- Type errors for columns that exist in the database
- Missing tables in TypeScript that exist in Supabase
- `Property 'X' does not exist on type 'Y'` for valid columns
- Autocomplete showing different fields than the database

## Workflow

```bash
# 1. Regenerate types
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public \
  > frontend/src/types/database.types.ts

# 2. Check for type errors
npm run typecheck --prefix frontend

# 3. If errors remain, check if migrations need to be applied
npx supabase db push
```

## Project ID

```
lgveqfnpkxvzbnnwuled
```

---

**Reference:** `.agents/patterns/errors/supabase-types-stale.md`
