# Incident Log

Chronological log of issues encountered, root causes, and fixes applied. Referenced by `CLAUDE.md` and `.claude/PREVENTION-CHECKLIST.md`.

---

## INC-007: Vertical Markup Creation Fails with 500 Error

**Date:** 2026-02-01
**Severity:** High (feature completely broken)
**Component:** Budget > Settings > Vertical Markup
**Files Modified:**
- `frontend/src/components/budget/vertical-markup-settings.tsx`
- `frontend/src/app/api/projects/[projectId]/vertical-markup/route.ts`

### Symptom
Clicking "Add Markup" on the budget settings page either showed "Please fill in all fields" (when percentage wasn't typed) or "Failed to create vertical markup" (500 from API).

### Root Causes (3 issues)

**1. CHECK constraint mismatch (primary cause)**
The `vertical_markup` table has a CHECK constraint allowing only lowercase values: `insurance`, `bond`, `fee`, `overhead`, `custom`. The UI's `COMMON_MARKUP_TYPES` array sent PascalCase values like "Overhead", "Profit", "General Liability Insurance" etc.

Supabase error:
```
code: "23514"
message: "new row for relation \"vertical_markup\" violates check constraint \"vertical_markup_markup_type_check\""
```

**2. Placeholder mistaken for value**
The percentage field used `useState("")` with `placeholder="10"`. The "10" appeared in the field but the actual value was empty string, failing the `if (!newPercentage)` validation.

**3. Swallowed error in API route**
The POST handler caught the Supabase error but didn't log it or return the specific message. The generic "Failed to create vertical markup" gave no debugging information.

### Fixes Applied

**Fix 1: Align UI values with database constraint**
```typescript
// Before (WRONG)
const COMMON_MARKUP_TYPES = ["Overhead", "Profit", ...];
<SelectItem key={type} value={type}>{type}</SelectItem>

// After (CORRECT)
const MARKUP_TYPE_OPTIONS = [
  { label: "Overhead", value: "overhead" },
  { label: "Insurance", value: "insurance" },
  { label: "Bond", value: "bond" },
  { label: "Fee", value: "fee" },
  { label: "Custom", value: "custom" },
];
<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
```

**Fix 2: Default value instead of placeholder**
```typescript
// Before
const [newPercentage, setNewPercentage] = useState("");
// After
const [newPercentage, setNewPercentage] = useState("10");
```

**Fix 3: Log and return actual error**
```typescript
if (error) {
  console.error("Vertical markup insert error:", error);
  return NextResponse.json(
    { error: error.message || "Failed to create vertical markup" },
    { status: 500 },
  );
}
```

### Verification
- Tested insert directly via `node -e` Supabase script: `overhead` (lowercase) succeeded
- Tested full UI flow in browser: Select "Overhead" -> percentage 10% -> compound on -> "Add Markup" -> success toast, row appears in list

### Patterns Documented
- `database-issues.md`: CHECK Constraint Violation on Insert
- `database-issues.md`: Misleading Placeholder vs Empty Value in Forms
- `database-issues.md`: Swallowed API Errors
- `index.md`: Updated pattern list

### Prevention
- Always check migration files for CHECK constraints before building dropdown UIs
- Test inserts with `node -e` before building UI forms
- Always `console.error` actual Supabase errors in API routes
- Use default values, not placeholders, for commonly-used form defaults

---

## INC-006: Next.js Cache Causes False 404s on New Routes

**Date:** 2026-02-01
**Severity:** Medium (blocks development, wastes debugging time)
**Component:** Next.js dev server / `.next` cache

### Symptom
New routes return 404 or Internal Server Error even though the page.tsx files exist and are correct.

### Root Cause
Next.js caches compiled routes in `.next/`. New files aren't recognized until cache is cleared.

### Fix
```bash
cd frontend && rm -rf .next && pkill -f "next dev" && npm run dev
```

### Prevention
See `.claude/rules/NEXTJS-DEBUG-PROTOCOL.md` - NEW ROUTE = CLEAR CACHE, always.

---

## INC-005: Direct Costs Page "Fixed" Without Testing Query

**Date:** 2026-02-01
**Severity:** High
**Component:** Direct Costs page

### Symptom
Agent claimed page was "fixed" but user still got errors.

### Root Cause
Agent modified code based on assumptions without testing the actual Supabase query.

### Fix
Added mandatory query testing step to `SUPABASE-GATE.md`.

### Prevention
Always test queries with `node -e` script before claiming "fixed". See `SUPABASE-GATE.md`.

---

## INC-004: Authentication Prompts to User

**Date:** 2026-02-01
**Severity:** Low (annoying, wastes time)
**Component:** Playwright tests, web crawlers

### Symptom
Agent asked user to manually log in for tests/crawlers.

### Root Cause
Agent didn't know credentials exist in `.env` and auth state is saved.

### Fix
Added Authentication Gate to CLAUDE.md. See `.claude/rules/AUTHENTICATION-NEVER-ASK-AGAIN.md`.

---

## INC-003: Route Parameter Conflict (3rd occurrence)

**Date:** 2026-01-10
**Severity:** Critical (dev server won't start)
**Component:** Next.js routing

### Symptom
```
[Error: You cannot use different slug names for the same dynamic path ('id' !== 'projectId').]
```

### Root Cause
Routes using `[id]` conflicting with `[projectId]` at same path level.

### Fix
Renamed `api/projects/[id]` to `[projectId]`, deleted duplicate admin routes.

### Prevention
See `.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md` and `api-routing-errors.md`.

---

## INC-002: Schedule Tasks FK Type Mismatch

**Date:** 2026-01-28
**Severity:** High (all queries failed silently)
**Component:** schedule_tasks table

### Symptom
E2E tests stuck on loading spinners. No error messages.

### Root Cause
`schedule_tasks.project_id` created as UUID but `projects.id` is INTEGER.

### Fix
Dropped and recreated table with `project_id INTEGER`.

### Prevention
See `database-issues.md` FK Type Mismatch pattern and `.claude/rules/SUPABASE-GATE.md`.

---

## INC-001: SQL Dumped to User Instead of Using Tools

**Date:** 2026-01-28
**Severity:** Low (user frustration)
**Component:** Agent workflow

### Symptom
Agent dumped 150+ lines of SQL and told user to run it manually.

### Root Cause
Agent didn't use available Supabase MCP/CLI tools.

### Fix
Created `.claude/rules/USE-AVAILABLE-TOOLS.md`.

---

**Last Updated:** 2026-02-01
**Total Incidents:** 7
