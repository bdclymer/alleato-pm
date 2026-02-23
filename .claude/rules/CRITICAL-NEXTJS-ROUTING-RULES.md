# 🚨 CRITICAL: Next.js Dynamic Route Naming Rules

## ABSOLUTE REQUIREMENT (NO EXCEPTIONS)

**YOU CANNOT USE DIFFERENT SLUG NAMES FOR THE SAME DYNAMIC PATH.**

## The Error

```text
[Error: You cannot use different slug names for the same dynamic path ('paramName1' !== 'paramName2').]
```
This error is a **HARD BLOCKER**. The Next.js dev server will refuse to start.

---

## What Causes This Error

When you have dynamic route segments at the same path level with **different parameter names**, Next.js cannot determine which route to match.

### ❌ EXAMPLES OF VIOLATIONS (THESE WILL BREAK THE APP)

**Violation 1: Different param names in API vs pages**

```text
✗ frontend/src/app/api/projects/[id]/route.ts
✗ frontend/src/app/[projectId]/page.tsx
```

**Error:** `'id' !== 'projectId'`

**Violation 2: Duplicate routes with different param names**

```text
✗ frontend/src/app/admin/tables/[table]/[id]/page.tsx
✗ frontend/src/app/admin/tables/[table]/[recordId]/page.tsx
```
**Error:** `'id' !== 'recordId'`

**Violation 3: Mixed naming in nested routes**

```text
✗ frontend/src/app/users/[userId]/page.tsx
✗ frontend/src/app/users/[id]/edit/page.tsx
```

**Error:** `'userId' !== 'id'`

---

## ✅ HOW TO FIX

### Solution 1: Standardize Parameter Names

Pick ONE naming convention for each resource type and use it EVERYWHERE:

```text
✓ frontend/src/app/api/projects/[projectId]/route.ts
✓ frontend/src/app/[projectId]/page.tsx
```
### Solution 2: Delete Duplicates

If you have two routes with different names, one is likely obsolete:

```bash
# Find the duplicate
ls -la frontend/src/app/admin/tables/[table]/

# Check which is newer/correct
# Delete the obsolete one
rm -rf frontend/src/app/admin/tables/[table]/[id]/
```
---

## 📋 PROJECT STANDARDS (ENFORCE THESE)

| Resource Type | Standard Param Name | Examples |
|--------------|---------------------|----------|
| **Project** | `[projectId]` | `/[projectId]/home`, `/api/projects/[projectId]` |
| **Company** | `[companyId]` | `/companies/[companyId]`, `/api/companies/[companyId]` |
| **Contract** | `[contractId]` | `/contracts/[contractId]`, `/api/contracts/[contractId]` |
| **User** | `[userId]` | `/users/[userId]`, `/api/users/[userId]` |
| **Record (Admin)** | `[recordId]` | `/admin/tables/[table]/[recordId]` |
| **Line Item** | `[lineItemId]` | `/line-items/[lineItemId]` |
| **Budget Line** | `[lineId]` | `/budget/lines/[lineId]` |

**NEVER use generic `[id]` when a specific name exists in the standards.**

---

## 🔍 HOW TO CHECK BEFORE CREATING ROUTES

**BEFORE creating a new dynamic route, ALWAYS run:**

```bash
# Find all existing dynamic segments for this resource
find frontend/src/app -path "*/<resource>/*" -name "page.tsx" -o -name "route.ts" | grep '\['

# Example: Check project routes
find frontend/src/app -path "*project*" | grep '\[' | sort
```

**Look for:**

1. Existing parameter names (`[projectId]`, `[id]`, etc.)
2. Choose the MOST SPECIFIC name that already exists
3. If creating a new resource type, choose a specific name (NOT `[id]`)

---

## 🚨 MANDATORY VERIFICATION CHECKLIST

Before claiming "route created successfully", you MUST:

- [ ] Run `find frontend/src/app -type d | grep '\[' | sort` to see ALL dynamic routes
- [ ] Verify your new route does NOT conflict with existing routes
- [ ] Use the SAME parameter name as existing routes for that resource
- [ ] Start the dev server to verify: `npm run dev --prefix frontend`
- [ ] Confirm no error: `You cannot use different slug names...`

---

## ⚙️ AUTO-CHECK SCRIPT

```bash
#!/bin/bash
# scripts/check-route-conflicts.sh

echo "Checking for dynamic route conflicts..."

# Find all dynamic route directories
ROUTES=$(find frontend/src/app -type d -name "[*]" | sort)

# Group by parent directory
declare -A PARENTS

for route in $ROUTES; do
  parent=$(dirname "$route")
  param=$(basename "$route")

  if [ -n "${PARENTS[$parent]}" ] && [ "${PARENTS[$parent]}" != "$param" ]; then
    echo "❌ CONFLICT DETECTED:"
    echo "   Parent: $parent"
    echo "   Param 1: ${PARENTS[$parent]}"
    echo "   Param 2: $param"
    exit 1
  fi

  PARENTS[$parent]="$param"
done

echo "✅ No route conflicts found"
```
**Add to `.git/hooks/pre-commit`:**
```bash
#!/bin/bash
bash scripts/check-route-conflicts.sh || exit 1
```

---

## 📚 HISTORICAL INCIDENTS (LEARN FROM THESE)

### Incident 1: 2026-01-10 - `api/projects/[id]` vs `[projectId]`

- **Cause:** Agent created API route with `[id]` instead of existing `[projectId]`
- **Impact:** Dev server failed to start
- **Fix:** Renamed `api/projects/[id]` → `api/projects/[projectId]`

### Incident 2: 2026-01-10 - `admin/tables/[table]/[id]` vs `[recordId]`

- **Cause:** Duplicate route created during refactor
- **Impact:** Dev server failed to start
- **Fix:** Deleted obsolete `[id]` directory, kept `[recordId]`

### Incident 3: (This violation)

- **Cause:** [To be filled when this happens again]

---

## 🎯 AGENT PROTOCOL (MANDATORY)

**EVERY agent creating dynamic routes MUST:**

1. **BEFORE creating route:** Run Explore to find existing routes for that resource
2. **Check naming convention:** Use project standards table above
3. **Verify no conflict:** Search for `[` patterns in same path
4. **Test immediately:** Start dev server after creating route
5. **Document:** If creating NEW resource type, add to standards table

**IF YOU SKIP THESE STEPS, YOU WILL BREAK THE APPLICATION.**

---

## 📞 WHAT TO DO IF YOU SEE THE ERROR

1. **STOP IMMEDIATELY** - Do not create more routes
2. **Find the conflict:**

   ```bash
   find frontend/src/app -type d -name "[*]" | sort | uniq -c
   ```

3. **Identify duplicates:** Look for same parent path with different param names
4. **Choose correct version:** Check which is newer/more complete
5. **Delete obsolete:** Remove the old/duplicate route
6. **Verify fix:** `npm run dev --prefix frontend` should start without error

---

## ⚠️ FINAL WARNING

**This error has occurred THREE TIMES.**

If you are creating or modifying dynamic routes and this document does not prevent the error, the documentation has failed and must be updated.

**THERE IS NO EXCUSE FOR THIS ERROR OCCURRING A FOURTH TIME.**
