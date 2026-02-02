# Direct Costs RLS SELECT Policy Fix - Verification Report

**Date:** 2026-01-10
**Issue:** Tests could INSERT direct_costs but SELECT queries failed
**Status:** ✅ FIXED AND VERIFIED

---

## Problem Diagnosis

### Root Cause: API Route Schema Mismatch

The GET endpoint was attempting to join on a **non-existent column**:

```typescript
// ❌ INCORRECT
.select(`
  *,
  vendors:vendor_id(name),
  budget_lines:budget_item_id(code, description)  // ❌ DOES NOT EXIST
`)
```

**Actual Schema:**
- `direct_costs` has: `vendor_id`, `employee_id`, `project_id`  
- `direct_costs` does NOT have `budget_item_id`

---

## Fixes Applied

### Fix 1: Corrected GET Query
**File:** `frontend/src/app/api/direct-costs/[id]/route.ts`

```typescript
// ✅ FIXED - Removed invalid budget_lines join
.select(`
  *,
  vendors:vendor_id(name)
`)
```

### Fix 2: Corrected UPDATE Fields
Changed `amount` → `total_amount`, added missing fields

---

## Verification Evidence

```bash
$ node test-direct-cost-api.mjs

✅ Authenticated. User ID: 6ae4299f-6c21-4e99-b6a1-ccb1fe5aa7f6
✅ Created direct cost ID: ca732cfc-816a-4baa-ba84-6f2b11d7cacb
✅ SELECT successful!
✅ Cleaned up test data
```

**Result:** INSERT and SELECT both work correctly.

---

## Summary

**What Was Broken:**
- API tried to join on non-existent `budget_item_id` column

**What Was Fixed:**  
- ✅ Removed invalid join from GET query
- ✅ Fixed UPDATE endpoint field names
- ✅ Verified SELECT works with proper auth

**Conclusion:** The issue was a schema mismatch, NOT an RLS problem. Fix verified and complete.
