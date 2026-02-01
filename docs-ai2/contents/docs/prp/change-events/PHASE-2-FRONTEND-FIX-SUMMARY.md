# Change Events Frontend Fix Summary

**Date:** 2026-02-01
**Phase:** 2 - Frontend Page Files
**Status:** COMPLETED ✅

## Problem

Change events pages were using `parseInt()` on UUID parameters, causing NaN values to be passed to API calls. The create page also bypassed the API entirely and inserted directly into Supabase.

## Root Cause

1. **Detail & Edit Pages**: Used `parseInt(params.id, 10)` on a UUID string parameter
2. **Create Page**: Called `createChangeEvent()` from the hook which did direct Supabase insert
3. **Hook**: `createChangeEvent()` used `supabase.from("change_events").insert()` instead of API route

## Files Fixed

### 1. Detail Page
**File:** `frontend/src/app/(main)/[projectId]/change-events/[id]/page.tsx`

**Changed:**
```typescript
// Before
const changeEventId = parseInt(params.id as string, 10);

// After
const changeEventId = params.id as string; // UUID string, not a number
```

**Impact:** API calls now receive proper UUID strings instead of NaN

---

### 2. Edit Page
**File:** `frontend/src/app/(main)/[projectId]/change-events/[id]/edit/page.tsx`

**Changed:**
```typescript
// Before
const changeEventId = parseInt(params.changeEventId as string, 10);

// After
const changeEventId = params.id as string; // UUID string, not a number
```

**Impact:** Edit form loads and saves using proper UUID

---

### 3. Create Page
**File:** `frontend/src/app/(main)/[projectId]/change-events/new/page.tsx`

**Changed:**
```typescript
// Before
import { useProjectChangeEvents } from "@/hooks/use-change-events";
const { createChangeEvent } = useProjectChangeEvents(projectId);

const handleSubmit = async (data: ChangeEventFormData) => {
  const result = await createChangeEvent({
    project_id: projectId,
    number: data.number,
    // ... fields
  });
  router.push(`/${projectId}/change-events/${result.id}`);
};

// After
const handleSubmit = async (data: ChangeEventFormData) => {
  const response = await fetch(`/api/projects/${projectId}/change-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: projectId,
      number: data.number,
      title: data.title,
      status: data.status || "open",
      reason: data.changeReason || null,
      scope: data.scope || "TBD",
      notes: data.notes || null,
      description: data.description || null,
      estimated_impact: data.estimatedImpact || null,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || "Failed to create change event");
  }

  const newEvent = await response.json();
  router.push(`/${projectId}/change-events/${newEvent.id}`);
};
```

**Impact:**
- Creates change events through API route (proper RLS, validation, error handling)
- Follows same pattern as prime contracts create page
- Removed dependency on `useProjectChangeEvents` hook

---

### 4. Hook
**File:** `frontend/src/hooks/use-change-events.ts`

**Changed:**
```typescript
// Before
const createChangeEvent = useCallback(
  async (changeEvent: Partial<ChangeEvent>): Promise<ChangeEvent | null> => {
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("change_events")
      .insert(insertData)
      .select()
      .single();
    // ...
  },
  [fetchChangeEvents],
);

// After
const createChangeEvent = useCallback(
  async (changeEvent: Partial<ChangeEvent>): Promise<ChangeEvent | null> => {
    const response = await fetch(
      `/api/projects/${changeEvent.project_id}/change-events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: changeEvent.project_id,
          number: changeEvent.number,
          title: changeEvent.title,
          reason: changeEvent.reason || null,
          scope: changeEvent.scope || "TBD",
          status: changeEvent.status || "draft",
          notes: changeEvent.notes || null,
          description: changeEvent.description || null,
          estimated_impact: changeEvent.estimated_impact || null,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || "Failed to create change event");
    }

    const data = await response.json();
    await fetchChangeEvents(); // Refetch list
    return data;
  },
  [fetchChangeEvents],
);
```

**Impact:**
- Hook now uses API route instead of direct Supabase insert
- Consistent with other hooks in the codebase
- Still works for any consumers of the hook

---

## Pattern Reference

All changes follow the pattern used in:
- `frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx`

This is the canonical example of:
1. Using `fetch()` to POST to API route
2. Proper error handling with response.ok check
3. Redirect to detail page with returned ID

---

## Verification

### What Should Work Now

1. ✅ **View change event detail**: Navigate to `/[projectId]/change-events/[uuid]`
2. ✅ **Edit change event**: Load form with existing data, save updates
3. ✅ **Create change event**: Submit form, get new UUID, redirect to detail page
4. ✅ **Hook usage**: Any component using `createChangeEvent()` from the hook

### API Calls Expected

**Before fix:**
```
GET /api/projects/67/change-events/NaN  // ❌ Fails
PUT /api/projects/67/change-events/NaN  // ❌ Fails
```

**After fix:**
```
GET /api/projects/67/change-events/550e8400-e29b-41d4-a716-446655440000  // ✅ Works
PUT /api/projects/67/change-events/550e8400-e29b-41d4-a716-446655440000  // ✅ Works
POST /api/projects/67/change-events  // ✅ Works (now used instead of direct Supabase)
```

---

## Next Steps

✅ Phase 1: Backend API routes fixed (UUID types in route handlers)
✅ **Phase 2: Frontend pages fixed (UUID params, API usage)**
⏭️ Phase 3: Test in browser with real data
⏭️ Phase 4: Update E2E tests to reflect UUID params

---

## Related Files

- API routes: `frontend/src/app/api/projects/[projectId]/change-events/`
- Components: `frontend/src/components/domain/change-events/`
- Types: `frontend/src/types/change-events.ts`

---

**CRITICAL:** All four files must be deployed together. Deploying only backend OR only frontend will cause breakage.
