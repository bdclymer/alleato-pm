# PREVENTION CHECKLIST - Mandatory Pre-Flight Checks

**Purpose:** Stop repeating the same mistakes. Check this BEFORE starting ANY task.

**Rule:** If a task matches ANY trigger below, you MUST follow that gate's protocol.

---

## 🔴 CRITICAL GATES (Violated 3+ times)

### Gate #1: Next.js Cache Gate

**Trigger:** Creating/modifying ANY Next.js route file (`page.tsx`, `layout.tsx`, new directories in `app/`)

**REQUIRED ACTION (NO EXCEPTIONS):**

```bash
cd frontend && rm -rf .next && pkill -f "next dev" && npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10
tail -20 /tmp/nextjs-dev.log  # Must show "Ready"
```
**THEN test. NEVER debug code first.**

**Why:** Stale `.next` cache causes 404s. Wasted 90+ minutes debugging code when fix was always cache clear.

**Reference:** `.claude/rules/NEXTJS-DEBUG-PROTOCOL.md`

---

### Gate #2: Route Parameter Naming
**Trigger:** Creating ANY dynamic route in Next.js

**REQUIRED ACTION:**
1. Check existing routes: `find frontend/src/app -type d -name "\[*\]" | grep [RESOURCE]`
2. Use specific names from this table:

| Resource | Use | Never |
|----------|-----|-------|
| Project | `[projectId]` | ~~`[id]`~~ |
| Company | `[companyId]` | ~~`[id]`~~ |
| Contract | `[contractId]` | ~~`[id]`~~ |
| User | `[userId]` | ~~`[id]`~~ |
| Record | `[recordId]` | ~~`[id]`~~ |

3. Run check: `npm run check:routes`
4. Verify dev server starts without errors

**Why:** Generic `[id]` causes route conflicts. Happened 3 times, blocks dev server.

**Reference:** `.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md`

---

## 🟡 WARNING GATES (Violated 2 times)

### Gate #3: Supabase Types First
**Trigger:** Writing ANY code that touches database (queries, API routes, hooks, services)

**REQUIRED ACTION:**
```bash
npm run db:types  # Generate fresh types
```
**THEN:**

1. Read `frontend/src/types/database.types.ts`
2. Verify table exists
3. Verify columns exist
4. **CRITICAL:** Check FK types match PK types (e.g., `projects.id` is INTEGER, not UUID)
5. ONLY THEN write code

**Why:** Assuming schema causes type mismatches. UUID/INTEGER FK bugs wasted 40+ minutes.

**Reference:** `.claude/rules/SUPABASE-GATE.md`

---

### Gate #4: Root Cause Analysis

**Trigger:** ANY error or failing test

**REQUIRED ACTION:**

1. Gather **runtime evidence** (not grep searches):
   - Actual error messages
   - Console output
   - Query results
   - Test output with stack traces

2. State root cause as **FACT with evidence**:
   > "The root cause is [X]. Evidence: [specific output showing X]"

3. If you can't write that statement, **GO BACK TO STEP 1**

4. Make targeted fix for confirmed root cause

**Why:** Modifying code based on assumptions wasted 60+ minutes across multiple incidents.

**Reference:** `.claude/rules/ROOT-CAUSE-GATE.md`

---

### Gate #5: Playwright Before Assumptions

**Trigger:** Writing or debugging Playwright tests

**REQUIRED ACTION:**

1. Use Playwright MCP to inspect DOM
2. Get actual element selectors
3. ONLY THEN write test code

**NEVER:**

- Guess what's in the DOM
- Assume element selectors
- Write tests without seeing actual page structure

**Why:** Assumptions about DOM structure waste 30+ minutes debugging wrong selectors.

**Reference:** `.claude/rules/PLAYWRIGHT-GATE.md`

---

## 🟢 ENFORCED GATES (Working)

### Gate #6: Use Available Tools

**Trigger:** About to tell user to do something manually

**REQUIRED ACTION:**

1. Check if MCP tool exists (Supabase, Bash, etc.)
2. Use the tool yourself
3. Only ask user if NO tool available

**NEVER:** Dump SQL and say "run this in Supabase"

**Reference:** `.claude/rules/USE-AVAILABLE-TOOLS.md`

---

### Gate #7: Bash Execution Correctness

**Trigger:** Running bash commands

**REQUIRED CHECKS:**

- [ ] Checked `pwd` before using relative paths
- [ ] Used absolute paths for file redirects
- [ ] Not using `cd X && command` chains (fails in zsh)
- [ ] Using single quotes for `node -e` with special chars

**Reference:** `.claude/rules/BASH-EXECUTION-RULES.md`

---

### Gate #8: Use /create-feature for New Features

**Trigger:** Creating new CRUD feature (table, hook, service, API, page)

**REQUIRED ACTION:**

1. Use `/create-feature <EntityName>` (NOT `/scaffold`, which is deprecated)
2. Add `--fields` for custom columns: `/create-feature Entity --fields 'amount:numeric,status:text'`
3. The skill enforces all gates automatically (types, FK validation, route checks, TypeScript)

**NEVER:** Write migrations, hooks, services, or API routes from scratch when `/create-feature` exists.

**Why:** Every from-scratch feature makes same mistakes (wrong FK types, missing RLS, inconsistent patterns). `/create-feature` prevents all of these with blocking validation gates.

**Reference:** `.claude/commands/create-feature.md`, `.claude/FK-TYPES-REFERENCE.md`

---

### Gate #9: Authentication Auto-Loading

**Trigger:** Creating Playwright tests or web crawlers

**REQUIRED:**

- Load credentials from `.env` automatically
- Use saved auth state (`tests/.auth/user.json`)
- **NEVER** ask user to log in manually

**Reference:** `.claude/rules/AUTHENTICATION-GATE.md` (lines 76-133 in CLAUDE.md)

---

## Pre-Task Checklist Template

Before starting ANY task, check applicable gates:

```markdown
Task: [Your task description]

Applicable Gates:
- [ ] #1 Next.js Cache - Creating/modifying routes?
- [ ] #2 Route Naming - Creating dynamic routes?
- [ ] #3 Supabase Types - Database code?
- [ ] #4 Root Cause - Debugging errors?
- [ ] #5 Playwright - Writing tests?
- [ ] #6 Use Tools - About to ask user to do something?
- [ ] #7 Bash - Running commands?
- [ ] #8 Scaffold - Creating CRUD feature?
- [ ] #9 Auth - Creating tests/crawlers?

Actions Required:
[List specific commands/checks from applicable gates]
```

---

## Enforcement

**If you violate a gate:**

1. Task will likely fail or waste time
2. Incident logged in `INCIDENT-LOG.md`
3. Prevention system reviewed/strengthened

**If gates are working:**

1. Incidents stop repeating
2. Development velocity increases
3. User frustration decreases

---

## Success Metrics

**Current State (2026-02-01):**

- Total incidents logged: 5
- Critical (3+): 2
- Warning (2): 3
- Total time wasted: ~280 minutes

**Goal (2026-03-01):**

- Zero recurrence of documented errors
- All critical (🔴) → warning (🟡)
- All warning (🟡) → resolved (🟢)

**Review Schedule:**

- Weekly: Check for new incidents
- Monthly: Update prevention systems
- Quarterly: Archive resolved patterns

---

## Quick Reference Card

**Most Common Violations:**

| Symptom | Gate Violated | Quick Fix |
|---------|---------------|-----------|
| 404 on new route | #1 Cache | Clear `.next` cache |
| Dev server crash on routes | #2 Naming | Use `[resourceId]` not `[id]` |
| FK constraint errors | #3 Types | Run `db:types`, verify FK types |
| Debugging for 30+ min | #4 Root Cause | Gather runtime evidence first |
| Test selector not found | #5 Playwright | Inspect DOM with Playwright MCP |

**The Pattern:**

- Most time waste = not following existing gates
- Most gates exist BECAUSE of repeated mistakes
- **Solution:** Check gates BEFORE starting, not after failing

---

**Last Updated:** 2026-02-01
**Next Review:** 2026-03-01
