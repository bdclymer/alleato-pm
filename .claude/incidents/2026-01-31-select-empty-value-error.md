# Incident Report: Select Component Empty Value Error

**Date:** 2026-01-31
**Severity:** Low (user-reported, quick fix)
**Status:** Resolved

---

## Summary

Radix UI Select component in `task-edit-modal.tsx` was using an empty string value (`value=""`) for the "No parent (root task)" option, which violates Radix UI's requirement that all Select.Item components must have non-empty values.

---

## Error Message

```
A <Select.Item /> must have a value prop that is not an empty string.
This is because the Select value can be set to an empty string to clear
the selection and show the placeholder.
```

---

## Root Cause

**File:** `frontend/src/components/scheduling/task-edit-modal.tsx`

**Lines affected:**
- Line 413: `value={formData.parent_task_id || ""}`
- Line 415: `handleChange("parent_task_id", value || null)`
- Line 422: `<SelectItem value="">No parent (root task)</SelectItem>`

**Issue:** Radix UI Select requires all SelectItem values to be non-empty strings. Empty strings are reserved for clearing the selection internally.

---

## Resolution

Applied the same pattern already used for `constraint_type` field in the same component:

### Before
```typescript
<Select
  value={formData.parent_task_id || ""}
  onValueChange={(value) =>
    handleChange("parent_task_id", value || null)
  }
>
  <SelectContent>
    <SelectItem value="">No parent (root task)</SelectItem>
```

### After
```typescript
<Select
  value={formData.parent_task_id || "none"}
  onValueChange={(value) =>
    handleChange("parent_task_id", value === "none" ? null : value)
  }
>
  <SelectContent>
    <SelectItem value="none">No parent (root task)</SelectItem>
```

---

## Pattern Identified

The `constraint_type` field (lines 439-443) was already using this pattern correctly:
```typescript
value={formData.constraint_type || "none"}
onValueChange={(value) =>
  handleChange("constraint_type", value === "none" ? null : (value as ConstraintType))
}
```

**Lesson:** When a Select needs a "no selection" option, use a sentinel value like `"none"` and convert it to `null` in the change handler.

---

## Prevention

**Checklist for future Select components:**

- [ ] Never use `value=""` in a SelectItem
- [ ] Use sentinel values like `"none"`, `"__none__"`, or `"__unset__"` for null/empty states
- [ ] Convert sentinel values back to `null` in the `onValueChange` handler
- [ ] Check existing Select components in the same file for established patterns

---

## Related Files

- Fixed: `frontend/src/components/scheduling/task-edit-modal.tsx`
- Pattern reference: Same file, `constraint_type` field (lines 436-455)

---

## Detection Method

- **Reported by:** User (runtime error when clicking schedule task)
- **Diagnostic tool:** Browser console error message
- **Time to fix:** ~5 minutes (once located)

---

## Future Improvements

Consider creating a reusable Select wrapper component that handles the none/null pattern automatically:

```typescript
// Potential future enhancement
<NullableSelect
  value={formData.parent_task_id}
  onValueChange={(value) => handleChange("parent_task_id", value)}
  noneLabel="No parent (root task)"
>
  {/* other options */}
</NullableSelect>
```
