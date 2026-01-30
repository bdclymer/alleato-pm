# Error Analysis Tasks

**Generated**: 2026-01-28
**Source**: Static analysis of frontend codebase
**Priority**: P1 (Critical) > P2 (High) > P3 (Medium) > P4 (Info)

---

## P1 - CRITICAL

### Task 1: Remove @ts-nocheck from 108 files
**Impact**: TypeScript cannot catch any type errors in these files. Schema changes break silently.
**Root Cause**: All 108 files have `// @ts-nocheck` with a TODO to remove after regenerating Supabase types. Never done.

**Steps**:
1. Run `npm run db:types` from frontend directory to regenerate Supabase types
2. Run `grep -rn "@ts-nocheck" frontend/src/ --include="*.ts" --include="*.tsx" | wc -l` to get current count
3. Remove `@ts-nocheck` from files in batches (10-15 at a time)
4. Fix type errors revealed in each batch
5. Run `npm run typecheck` after each batch
6. Add pre-commit hook to block new `@ts-nocheck` additions

**Files** (run to get full list):
```bash
grep -rn "@ts-nocheck" frontend/src/ --include="*.ts" --include="*.tsx"
```

**Estimated scope**: 108 files across API routes (12), pages (28), components (48), hooks (12), services (8)

---

### Task 2: Add authentication checks to ~15 unprotected API routes
**Impact**: Unauthorized users can read/modify data without authentication.
**Example vulnerability**:
```typescript
// frontend/src/app/api/projects/[projectId]/route.ts
export async function PATCH(request, { params }) {
  const body = await request.json();
  // NO auth check - anyone can update any project
  const { data, error } = await supabase.from("projects").update(body).eq("id", projectId);
}
```

**Steps**:
1. Run: `grep -rL "auth.getUser\|getUser()" frontend/src/app/api/ --include="route.ts"` to find routes missing auth
2. For each unprotected route, add this pattern at the top of each handler:
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```
3. Test each route returns 401 without auth cookie

**Known unprotected routes**:
- `api/projects/[projectId]/route.ts` (PATCH)
- `api/projects/[projectId]/budget/details/route.ts`
- `api/projects/[projectId]/budget/export/route.ts`
- `api/projects/[projectId]/budget/import/route.ts`
- `api/projects/[projectId]/budget/views/route.ts`
- `api/projects/[projectId]/budget/views/[viewId]/route.ts`
- `api/projects/[projectId]/budget/views/[viewId]/clone/route.ts`
- `api/projects/[projectId]/change-events/route.ts`
- `api/projects/[projectId]/directory/import/route.ts`
- `api/avatar/[personId]/route.ts`
- `api/rag-chat/route.ts`

---

### Task 3: Fix 11 empty catch blocks
**Impact**: Errors are swallowed silently. Users see no feedback, no logs created, data operations fail without notice.

**Steps**:
1. Run: `grep -rn "catch\s*{}" frontend/src/ --include="*.ts" --include="*.tsx"` OR `grep -rn "catch\s*(.*)\s*{\s*}" frontend/src/` to find empty catches
2. For each, add at minimum: `console.error` + user-facing toast notification
3. Pattern to use:
```typescript
catch (error) {
  console.error("Operation failed:", error);
  toast({ title: "Operation failed", description: "Please try again.", variant: "destructive" });
}
```

**Known locations**:
- `frontend/src/app/(main)/create-project/page.tsx`
- `frontend/src/components/domain/contracts/CreatePurchaseOrderForm.tsx`
- `frontend/src/hooks/use-change-event-rfqs.ts`
- `frontend/src/components/budget/BudgetViewsManager.tsx`
- Plus 7 more (find with grep above)

---

## P2 - HIGH

### Task 4: Add global error boundary
**Impact**: Any unhandled component error crashes the entire app (white screen).
**Current state**: Only 1 error boundary exists (`DirectoryErrorBoundary.tsx`), used only in directory module.

**Steps**:
1. Create `frontend/src/app/error.tsx` (Next.js App Router global error boundary)
2. Create per-module error boundaries:
   - `frontend/src/app/(main)/[projectId]/budget/error.tsx`
   - `frontend/src/app/(main)/[projectId]/schedule/error.tsx`
   - `frontend/src/app/(main)/[projectId]/commitments/error.tsx`
   - `frontend/src/app/(main)/[projectId]/change-events/error.tsx`
3. Each should show: error message, retry button, link to home
4. Pattern:
```typescript
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
```

---

### Task 5: Stop exposing raw error messages in API responses
**Impact**: Internal database errors leak table names, column names, constraint names to clients.
**Count**: 80+ instances of `console.error` without sanitized user response.

**Steps**:
1. Create a shared error classification utility: `frontend/src/lib/api-error.ts`
```typescript
export function classifyError(error: unknown): { message: string; status: number } {
  if (error instanceof Error) {
    if (error.message.includes("duplicate key")) return { message: "Record already exists", status: 409 };
    if (error.message.includes("violates foreign key")) return { message: "Referenced record not found", status: 400 };
    if (error.message.includes("permission denied")) return { message: "Permission denied", status: 403 };
  }
  return { message: "Internal server error", status: 500 };
}
```
2. Use in all API catch blocks instead of returning `error.message`
3. Grep for: `error.message` in API route files and replace with classified error

---

### Task 6: Add input validation to POST/PATCH/PUT API routes
**Impact**: No Zod validation on ~40 routes. Arbitrary JSON passed directly to Supabase.
**Risk**: Data corruption, injection via malformed payloads.

**Steps**:
1. Identify routes without validation: `grep -rL "z.object\|schema.parse\|schema.safeParse" frontend/src/app/api/ --include="route.ts"`
2. For each route accepting a body, add Zod schema validation
3. Zod schemas already exist in `frontend/src/lib/schemas/` for some entities - reuse those
4. Pattern:
```typescript
const body = await request.json();
const result = createSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
}
const validated = result.data;
```

---

### Task 7: Fix race conditions in custom hooks
**Impact**: Memory leaks, stale data rendering, React warnings about state updates on unmounted components.

**Steps**:
1. Audit hooks in `frontend/src/hooks/use-*.ts` for `useEffect` without cleanup
2. Add AbortController or cancellation flag pattern:
```typescript
useEffect(() => {
  let cancelled = false;
  const fetchData = async () => {
    try {
      const result = await fetch(url);
      if (!cancelled) setData(result);
    } catch (err) {
      if (!cancelled) setError(err);
    }
  };
  fetchData();
  return () => { cancelled = true; };
}, [deps]);
```

**Known affected hooks**:
- `frontend/src/hooks/use-schedule-tasks.ts`
- Check all hooks with `useEffect` + async operations

---

## P3 - MEDIUM

### Task 8: Unify duplicate PaginatedResponse types
**Impact**: Type confusion across modules - two different interfaces with same name.

**Location 1** (`frontend/src/types/scheduling.ts`):
```typescript
export interface PaginatedResponse<T> {
  data: T[];
  pagination: { current_page, per_page, total_records, total_pages, has_next_page, has_prev_page };
}
```

**Location 2** (`frontend/src/app/api/types.ts`):
```typescript
export interface PaginatedResponse<T> {
  data: T[];
  meta: { page, limit, total, totalPages };
}
```

**Steps**:
1. Choose one definition (recommend the API version as canonical)
2. Update all imports to use the canonical version
3. Delete the duplicate
4. Run `npm run typecheck` to find any breakage

---

### Task 9: Add toast notifications for user-facing errors
**Impact**: 80+ catch blocks log to console only - users see infinite spinners on failure.

**Steps**:
1. Verify toast system exists: check `frontend/src/components/ui/use-toast.ts`
2. For every `console.error` in component/page files, add a corresponding `toast()` call
3. Focus on: form submissions, data mutations, file uploads
4. Pattern: `toast({ title: "Failed to save", variant: "destructive" })`

---

### Task 10: Remove unused scheduling types
**Impact**: Dead code, confusing for developers.

**File**: `frontend/src/types/scheduling.ts`

**Types to remove**:
- `ScheduleImportResult` (0 usages)
- `ScheduleImportFormat` (0 usages)
- `ScheduleExportFormat` (0 usages)
- `ScheduleContextMenuItem` (0 usages)

---

## P4 - INFO

### Task 11: Convert 150+ TODO comments to tracked issues
**Steps**:
1. Run: `grep -rn "TODO" frontend/src/ --include="*.ts" --include="*.tsx" | wc -l`
2. Create GitHub issues for the most impactful ones
3. Remove stale TODOs that are no longer relevant

### Task 12: Fix hardcoded project IDs
**Location**: `frontend/src/app/(main)/directory/groups/page.tsx:64`
```typescript
const [projectId] = React.useState("1"); // TODO: Get from router params
```
Multiple directory pages hardcode projectId to "1".

### Task 13: Integrate error tracking service (Sentry/LogRocket)
**Current state**: All errors go to `console.error` only. No production error monitoring.

---

## Quick Reference

| Task | Severity | Scope | Category |
|------|----------|-------|----------|
| 1. Remove @ts-nocheck | P1 | 108 files | Type Safety |
| 2. Add auth to API routes | P1 | ~15 routes | Security |
| 3. Fix empty catch blocks | P1 | 11 files | Error Handling |
| 4. Global error boundary | P2 | New files | Error Handling |
| 5. Sanitize API errors | P2 | 80+ instances | Security |
| 6. Input validation | P2 | ~40 routes | Security |
| 7. Fix hook race conditions | P2 | ~12 hooks | Stability |
| 8. Unify PaginatedResponse | P3 | 2 files | Code Quality |
| 9. Toast notifications | P3 | 80+ instances | UX |
| 10. Remove unused types | P3 | 1 file | Code Quality |
| 11. Convert TODOs | P4 | 150+ comments | Tech Debt |
| 12. Fix hardcoded IDs | P4 | ~3 files | Bugs |
| 13. Error tracking | P4 | New integration | Observability |
