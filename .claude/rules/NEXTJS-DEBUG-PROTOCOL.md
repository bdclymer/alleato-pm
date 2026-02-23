# NEXT.JS DEBUG PROTOCOL (MANDATORY)

**CRITICAL:** Before debugging ANY Next.js 404 or routing issue, FOLLOW THIS EXACT SEQUENCE.

## Phase 1: Cache Invalidation (REQUIRED FIRST STEP)

When you create/modify ANY of these:

- New page.tsx files
- New route directories
- Modified layout.tsx
- Modified middleware
- Any file in `app/` directory

**IMMEDIATELY run:**

```bash
cd /Users/meganharrison/Documents/github/alleato-pm/frontend
rm -rf .next
pkill -f "next dev"
sleep 2
npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10
```
Then verify the server started:
```bash
tail -20 /tmp/nextjs-dev.log
```
## Phase 2: Verify Route Exists

**BEFORE using Playwright**, verify the route is compiled:

```bash
# Check if the page file exists
ls -la src/app/\(main\)/\[projectId\]/[FEATURE]/page.tsx

# Check server logs for compilation
grep "Compiled /\[projectId\]/[FEATURE]" /tmp/nextjs-dev.log
```
## Phase 3: Browser Test

**NOW** use Playwright to navigate:

```bash
mcp__playwright__browser_navigate to http://localhost:3000/[projectId]/[FEATURE]
```

## Phase 4: Only NOW Debug Code

If still 404 after Phase 1-3, THEN check:

- File syntax errors
- Import/export issues
- TypeScript errors

## Historical Incidents

### 2026-02-01: Direct Costs Refactor

- **Symptom:** 404 on `/67/direct-costs`
- **Assumed:** Code was wrong
- **Actual:** Stale `.next` cache
- **Fix:** `touch page.tsx` triggered rebuild
- **Time wasted:** 30+ messages
- **Should have:** Cleared cache immediately

### Pattern Recognition

**If you see 404 on a route that should exist:**

1. ❌ **WRONG:** Start debugging the code
2. ✅ **CORRECT:** Clear `.next` cache first

## Enforcement

Every agent working with Next.js routes MUST:

- [ ] Clear `.next` before testing new routes
- [ ] Wait 10 seconds for server to rebuild
- [ ] Check server logs for "Compiled" message
- [ ] ONLY THEN use Playwright
- [ ] ONLY THEN debug code

**Violation of this protocol = WASTED TIME.**

## Quick Commands

```bash
# Full reset (use this for ANY new route)
cd frontend && rm -rf .next && pkill -f "next dev" && npm run dev > /tmp/nextjs-dev.log 2>&1 &

# Check if route compiled
tail -100 /tmp/nextjs-dev.log | grep "Compiled"

# Verify server is ready
tail -10 /tmp/nextjs-dev.log | grep "Ready"
```

## The Rule

**NEW ROUTE = CLEAR CACHE**

No exceptions. No "let me just check if it works first."

Clear the cache. Every time. Immediately.
