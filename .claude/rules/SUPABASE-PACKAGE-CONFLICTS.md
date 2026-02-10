# SUPABASE PACKAGE CONFLICTS (MANDATORY)

## The Rule

**NEVER install both `@supabase/auth-helpers-nextjs` (deprecated) AND `@supabase/ssr` (current) in the same project.**

## Historical Incident (2026-02-05)

### Error
```
TypeError: Cannot read properties of undefined (reading 'call')
    at eval (webpack-internal:///(rsc)/./src/lib/supabase/server.ts:7:71)
```

### Root Cause

The deprecated `@supabase/auth-helpers-nextjs@0.15.0` package was installed alongside the current `@supabase/ssr@0.8.0` package. Even though the deprecated package was not imported anywhere in the code, its presence in node_modules caused webpack module resolution conflicts.

**Why it broke:**
1. Both packages export Supabase client creation functions
2. Webpack scans node_modules and finds two different approaches
3. The deprecated package uses Next.js 13 patterns (sync cookies)
4. The current package uses Next.js 15 patterns (async cookies)
5. Webpack RSC bundler gets confused and creates undefined module references
6. Runtime error when trying to call the undefined import

### Time Wasted

- 45 minutes of investigation
- Multiple cache clears that only temporarily fixed the symptom
- Dev server crashes blocking development

## Correct Package Configuration

### For Next.js 15 (Current)

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.94.0"
  }
}
```

**DO NOT include:**
- ❌ `@supabase/auth-helpers-nextjs` (deprecated, causes conflicts)
- ❌ `@supabase/auth-helpers-react` (deprecated, for Pages Router)
- ❌ `@supabase/auth-helpers-shared` (deprecated, internal)

### For Next.js 13 Pages Router (Legacy)

```json
{
  "dependencies": {
    "@supabase/auth-helpers-nextjs": "^0.10.0",
    "@supabase/supabase-js": "^2.94.0"
  }
}
```

**But this project uses Next.js 15 App Router, so use `@supabase/ssr` instead.**

## Migration Checklist

When migrating from old to new Supabase packages:

- [ ] Grep for ALL imports of `@supabase/auth-helpers-nextjs`
- [ ] Replace all imports with `@supabase/ssr` equivalents
- [ ] Test that auth still works
- [ ] **Remove the old package from package.json**
- [ ] Run `npm uninstall @supabase/auth-helpers-nextjs`
- [ ] Delete node_modules and package-lock.json
- [ ] Run `npm install` from clean state
- [ ] Clear `.next` cache
- [ ] Restart dev server and verify no errors

## Detection

Before ANY Supabase work, verify package configuration:

```bash
# Check for deprecated packages
npm list | grep "auth-helpers"

# If found, STOP and remove them first
npm uninstall @supabase/auth-helpers-nextjs
npm uninstall @supabase/auth-helpers-react
npm uninstall @supabase/auth-helpers-shared
```

## Why Cache Clearing Doesn't Fix This

Clearing `.next` cache temporarily works because:
- Webpack rebuilds from scratch
- The rebuild sometimes resolves correctly (randomly)
- But the underlying conflict remains in node_modules
- Next HMR or rebuild triggers the error again

**The ONLY fix is removing the conflicting package.**

## Prevention

Add to `.claude/PREVENTION-CHECKLIST.md`:

**Before ANY Supabase/Auth work:**
- [ ] Run `npm list | grep "auth-helpers"`
- [ ] If found, remove deprecated packages first
- [ ] Verify only `@supabase/ssr` is used for server clients

Add to CI/CD checks:

```bash
# Fail build if deprecated Supabase packages exist
if grep -q "@supabase/auth-helpers" package.json; then
  echo "ERROR: Deprecated @supabase/auth-helpers packages found"
  exit 1
fi
```

## Symptoms of This Issue

- ❌ "Cannot read properties of undefined (reading 'call')" in webpack
- ❌ Error location: `src/lib/supabase/server.ts` line 7
- ❌ Intermittent crashes (works after cache clear, breaks again later)
- ❌ No TypeScript errors (packages are valid TypeScript)
- ❌ No import errors (deprecated package not imported)

**If you see these symptoms, check package.json for conflicting packages.**

## Correct Import Patterns

### Server Components (Next.js 15)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();  // Async in Next.js 15
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // ...
      },
    },
  });
}
```

### Client Components (Next.js 15)

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(url, anonKey);
}
```

### Middleware (Next.js 15)

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // ...
      },
    },
  });
  // ...
}
```

## References

- **Incident Report:** `/DOCS_NEED_TO_FILE/NEXTJS-CRASH-ROOT-CAUSE-ANALYSIS-2026-02-05.md`
- **Supabase SSR Docs:** https://supabase.com/docs/guides/auth/server-side/nextjs
- **Next.js 15 Migration Guide:** https://nextjs.org/docs/app/building-your-application/upgrading/version-15

## Status

✅ **FIXED** - Deprecated package removed from project (2026-02-05)
📋 **PREVENTION** - Added to mandatory checks
🚨 **SEVERITY** - High (blocks development, cryptic error message)
