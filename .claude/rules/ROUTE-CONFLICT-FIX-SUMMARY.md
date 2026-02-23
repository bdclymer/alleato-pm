# Route Conflict Fix Summary

**Date:** 2026-01-10
**Issue:** Third occurrence of Next.js dynamic route naming conflict
**Status:** RESOLVED ✅

---

## What Happened

The Next.js dev server failed to start with error:

```text
[Error: You cannot use different slug names for the same dynamic path ('id' !== 'recordId').]
```
**This was the THIRD time this error occurred.**

---

## Root Causes

### Conflict 1: API vs Pages Route Mismatch

```text
frontend/src/app/api/projects/[id]/          ← Wrong
frontend/src/app/[projectId]/                ← Correct
```

### Conflict 2: Duplicate Admin Routes

```text
frontend/src/app/admin/tables/[table]/[id]/       ← Obsolete
frontend/src/app/admin/tables/[table]/[recordId]/ ← Correct
```
### Conflict 3: Import Path Reference

```typescript
// frontend/src/app/[projectId]/change-orders/new/page.tsx
import { createChangeOrderSchema } from "@/app/api/projects/[id]/contracts/[contractId]/change-orders/validation";
                                                                   ^^^^
                                                                   Wrong - should be [projectId]
```
---

## What Was Fixed

### 1. Renamed API Route Directory
```bash
mv frontend/src/app/api/projects/[id] \
   frontend/src/app/api/projects/[projectId]
```

### 2. Updated Import Path

```typescript
// Before
import { createChangeOrderSchema } from "@/app/api/projects/[id]/contracts/[contractId]/change-orders/validation";

// After
import { createChangeOrderSchema } from "@/app/api/projects/[projectId]/contracts/[contractId]/change-orders/validation";
```
### 3. Deleted Obsolete Route
```bash
rm -rf frontend/src/app/admin/tables/[table]/[id]/
```
### 4. Verified Fix

```bash
npm run dev --prefix frontend
# ✓ Ready in 1611ms (no errors)
```
---

## Prevention Measures Added

### 1. Comprehensive Documentation
**Location:** `.agents/rules/CRITICAL-NEXTJS-ROUTING-RULES.md`

Contains:
- Explanation of the error
- Project naming standards for all resource types
- Violation examples
- Verification checklist
- Historical incident log

### 2. CLAUDE.md Warning Section
Added prominent warning at line 18, immediately after PROJECT CONTEXT.

Agents will see this BEFORE any other rules.

### 3. Automated Check Script
**Location:** `scripts/check-route-conflicts.sh`

Usage:
```bash
# Manual check
npm run check:routes

# Output if no conflicts
✅ No route conflicts found

# Output if conflicts detected
❌ CONFLICT DETECTED:
   Parent: frontend/src/app/admin/tables/[table]
   Params: [id],[recordId]
   [Error: You cannot use different slug names for the same dynamic path ('id' !== 'recordId').]
```

### 4. NPM Script Added

```json
{
  "scripts": {
    "check:routes": "bash scripts/check-route-conflicts.sh"
  }
}
```

---

## Standardized Parameter Names

All agents MUST use these naming conventions:

| Resource Type | Standard Name | Never Use |
|--------------|---------------|-----------|
| Project | `[projectId]` | ~~`[id]`~~ |
| Company | `[companyId]` | ~~`[id]`~~ |
| Contract | `[contractId]` | ~~`[id]`~~ |
| User | `[userId]` | ~~`[id]`~~ |
| Record (Admin) | `[recordId]` | ~~`[id]`~~ |
| Line Item | `[lineItemId]` | ~~`[itemId]`~~ |
| Budget Line | `[lineId]` | ~~`[budgetLineId]`~~ |

**Rule:** Use the MOST SPECIFIC name possible. Generic `[id]` is BANNED.

---

## Verification Checklist (For Future Agents)

Before creating ANY dynamic route:

- [ ] Read: `.agents/rules/CRITICAL-NEXTJS-ROUTING-RULES.md`
- [ ] Check existing: `find frontend/src/app -type d -name "\[*\]" | grep <resource>`
- [ ] Use standard name from table above
- [ ] Create route
- [ ] Run: `npm run check:routes`
- [ ] Start dev server: `npm run dev --prefix frontend`
- [ ] Verify: No error about "different slug names"

**Skip any step = risk breaking the application.**

---

## Files Modified

1. `frontend/src/app/api/projects/[id]/` → Renamed to `[projectId]/`
2. `frontend/src/app/[projectId]/change-orders/new/page.tsx` → Fixed import path
3. `frontend/src/app/admin/tables/[table]/[id]/` → Deleted (obsolete)
4. `.agents/rules/CRITICAL-NEXTJS-ROUTING-RULES.md` → Created
5. `CLAUDE.md` → Added warning section at top
6. `scripts/check-route-conflicts.sh` → Created
7. `package.json` → Added `check:routes` script

---

## Testing

✅ Dev server starts successfully
✅ No console errors
✅ Route check script passes
✅ All dynamic routes using consistent naming

---

## Next Steps (If This Happens Again)

**IF this error occurs a FOURTH time:**

1. The prevention documentation has FAILED
2. Update `.agents/rules/CRITICAL-NEXTJS-ROUTING-RULES.md` with new insights
3. Consider adding automated pre-commit git hook
4. Consider blocking route creation without explicit verification

**Current incident count: 3**
**Target: ZERO future occurrences**

---

## References

- **Full Rules:** `.agents/rules/CRITICAL-NEXTJS-ROUTING-RULES.md`
- **Main Warning:** `CLAUDE.md` (line 18)
- **Check Script:** `scripts/check-route-conflicts.sh`
- **Next.js Docs:** [Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
