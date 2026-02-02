# Pattern: Consistent Route Parameter Names

**Severity:** CRITICAL
**Category:** Next.js Routing

---

## The Problem

Using inconsistent parameter names in Next.js dynamic routes breaks the application:

```
WRONG - Mixed parameter names
frontend/src/app/api/projects/[id]/route.ts          # Uses [id]
frontend/src/app/[projectId]/budget/page.tsx         # Uses [projectId]

Result: Application crashes, 404 errors, build failures
```

## The Solution

**ALWAYS use the standard parameter names:**

| Resource | Parameter | Example Path |
|----------|-----------|--------------|
| Projects | `[projectId]` | `/[projectId]/budget` |
| Contracts | `[contractId]` | `/[projectId]/contracts/[contractId]` |
| Commitments | `[commitmentId]` | `/[projectId]/commitments/[commitmentId]` |
| Change Events | `[changeEventId]` | `/[projectId]/change-events/[changeEventId]` |
| Change Orders | `[changeOrderId]` | `/[projectId]/change-orders/[changeOrderId]` |
| Invoices | `[invoiceId]` | `/[projectId]/invoices/[invoiceId]` |
| Line Items | `[lineItemId]` | `.../line-items/[lineItemId]` |
| Users | `[userId]` | `/users/[userId]` |

**NEVER use generic `[id]` - ALWAYS use the specific resource name.**

## Before Creating Routes

```bash
# 1. Check existing parameter names
find frontend/src/app -type d -name "[*]" | head -20

# 2. Use the EXACT same parameter name everywhere

# 3. Run typecheck after creation
npm run typecheck --prefix frontend
```

## Detection

Signs of this mistake:
- Next.js build error: "Conflicting app and page file"
- Dynamic routes return 404
- Error: "Cannot find parameter X in route"
- Type errors: `params.id` vs `params.projectId`

## Fixing Conflicts

```bash
# 1. Find wrong parameter uses
grep -r "\[id\]" frontend/src/app/ --include="*.ts" --include="*.tsx"

# 2. Rename folders consistently
mv frontend/src/app/api/projects/[id] frontend/src/app/api/projects/[projectId]

# 3. Update code references
# Change: params.id -> params.projectId
# Change: { id } -> { projectId }

# 4. Verify fix
npm run typecheck --prefix frontend
```

---

**Reference:** `.agents/rules/CRITICAL-NEXTJS-ROUTING-RULES.md`
