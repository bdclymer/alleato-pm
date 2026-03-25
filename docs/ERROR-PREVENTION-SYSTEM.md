# Error Prevention System - Overview

**Created:** 2026-02-01
**Purpose:** End the cycle of repeating the same mistakes over and over.

---

## The Problem

**From User Feedback (2026-02-01):**
> "It's like every time a simple feature is created. The same mistakes are done over and over and over again."

**Reality Check:**

- 5 critical error patterns identified
- ~280+ minutes wasted on repeated mistakes
- Same errors happening 2-3+ times each
- Prevention systems exist but not followed

---

## The System

### 1. Incident Tracking

**Location:** `docs/patterns/INCIDENT-LOG.md`

**Purpose:**

- Track every repeated error
- Calculate time wasted
- Identify patterns
- Create prevention systems

**Process:**

- Log incident when it happens 2nd time
- Update count/time wasted on recurrence
- Create prevention system at 2 occurrences
- Review monthly for effectiveness

### 2. Error Pattern Documentation

**Location:** `docs/patterns/errors/[error-name]/index.mdx`

**Each pattern includes:**

- Symptom (what you see)
- Root cause (why it happens)
- Fix (exact commands)
- Prevention protocol (how to avoid)
- Historical incidents (when/how it happened)
- Success metrics (how to track prevention)

**Current Patterns:**

- `nextjs-cache-404/` - Build cache causing 404s (3+ incidents)
- `route-param-mismatch/` - Dynamic route naming conflicts (3 incidents)
- `supabase-types-stale/` - Not updating types before code (2+ incidents)
- `premature-completion/` - Claiming done without verification (2+ incidents)
- `networkidle-timeout/` - Wrong Playwright wait strategy (2+ incidents)

### 3. Prevention Checklist

**Location:** `.claude/PREVENTION-CHECKLIST.md`

**Purpose:**

- Single source of truth for all gates
- Pre-flight checklist before every task
- Quick reference for common violations
- Success metrics tracking

**Structure:**

- 🔴 Critical gates (violated 3+ times)
- 🟡 Warning gates (violated 2 times)
- 🟢 Enforced gates (working)

### 4. Mandatory Gates

**Location:** `CLAUDE.md` (lines 6-133)

**9 Gates Enforced:**

1. Next.js Cache - Clear before debugging 404s
2. Route Naming - Specific names, never `[id]`
3. Supabase Types - Generate before database code
4. Root Cause - Evidence before code changes
5. Playwright - Inspect DOM before assumptions
6. Use Tools - Don't ask user to do what tools can do
7. Bash Execution - Check pwd, use absolute paths
8. Scaffold First - Use templates for CRUD
9. Auth Auto-Load - Never ask user to login manually

### 5. Detailed Protocols

**Location:** `.claude/rules/`

**Protocol Documents:**

- `NEXTJS-DEBUG-PROTOCOL.md` - Full Next.js debugging sequence
- `CRITICAL-NEXTJS-ROUTING-RULES.md` - Route naming standards
- `SUPABASE-GATE.md` - Database type verification
- `ROOT-CAUSE-GATE.md` - Evidence-based debugging
- `PLAYWRIGHT-GATE.md` - DOM inspection requirements
- `BASH-EXECUTION-RULES.md` - Command execution standards
- `SCAFFOLD-FIRST.md` - Template usage requirements
- `USE-AVAILABLE-TOOLS.md` - Tool-first approach

---

## How It Works

### Before Starting a Task

**Step 1: Check Prevention Checklist**

```bash
cat .claude/PREVENTION-CHECKLIST.md
```
**Step 2: Identify Applicable Gates**
- Creating route? → Gates #1, #2
- Database code? → Gate #3
- Debugging error? → Gate #4
- Writing tests? → Gate #5
- Creating CRUD? → Gate #8

**Step 3: Follow Gate Protocol**
- Read protocol document
- Execute required checks
- ONLY THEN start coding

### When an Error Occurs

**Step 1: Check if Pattern Exists**
```bash
cat docs/patterns/INCIDENT-LOG.md
```
**Step 2: Apply Known Fix**
If pattern documented, use the fix from error pattern document.

**Step 3: Log If Repeated**
If this is 2nd+ occurrence:

- Update INCIDENT-LOG.md
- Increment incident count
- Update time wasted
- Create/strengthen prevention system

### Monthly Review

**Step 1: Review Incident Log**

- Count recurrences per pattern
- Calculate total time wasted
- Identify prevention system gaps

**Step 2: Update Status**

- 🔴 → 🟡 if incidents decrease
- 🟡 → 🟢 if no recurrence for 30 days
- 🟢 → Archive if no recurrence for 90 days

**Step 3: Strengthen Prevention**

- Add more prominent warnings
- Create automated checks
- Update gate requirements

---

## Success Metrics

### Current State (2026-02-01)

**Incidents:**

- Total logged: 5
- Critical (3+): 2
- Warning (2): 3
- Resolved: 1

**Time Wasted:**

- Next.js cache: 90+ minutes
- Route naming: 60+ minutes
- Supabase types: 40+ minutes
- Root cause: 60+ minutes
- Playwright: 30+ minutes
- **Total: ~280+ minutes**

### Goals (2026-03-01)

**Incident Reduction:**

- Zero recurrence of documented errors
- All 🔴 Critical → 🟡 Warning
- All 🟡 Warning → 🟢 Resolved

**Time Savings:**

- Reduce wasted time by 90%
- From 280 min/month → <30 min/month

**Prevention Success:**

- Gates followed 100% of time
- No "forgot to check" incidents
- Automated checks where possible

### Tracking

**Weekly:**

- Count new incidents
- Log in INCIDENT-LOG.md
- Update prevention systems

**Monthly:**

- Calculate prevention success rate
- Update gate effectiveness
- Review and archive resolved patterns

**Quarterly:**

- Archive fully resolved (🟢) patterns
- Publish prevention success report
- Identify new emerging patterns

---

## File Structure

```text
alleato-pm/
├── .claude/
│   ├── PREVENTION-CHECKLIST.md          ← Master checklist
│   ├── ERROR-PREVENTION-SYSTEM.md       ← This file
│   └── rules/
│       ├── NEXTJS-DEBUG-PROTOCOL.md
│       ├── CRITICAL-NEXTJS-ROUTING-RULES.md
│       ├── SUPABASE-GATE.md
│       ├── ROOT-CAUSE-GATE.md
│       ├── PLAYWRIGHT-GATE.md
│       ├── BASH-EXECUTION-RULES.md
│       ├── SCAFFOLD-FIRST.md
│       └── USE-AVAILABLE-TOOLS.md
├── CLAUDE.md                             ← Main reference (updated with prevention)
└── docs/patterns/
    ├── INCIDENT-LOG.md                   ← Incident tracking
    └── errors/
        ├── nextjs-cache-404/
        ├── route-param-mismatch/
        ├── supabase-types-stale/
        ├── premature-completion/
        └── networkidle-timeout/
```

---

## Enforcement

### For AI Agents

**Before EVERY task:**

1. Read PREVENTION-CHECKLIST.md
2. Identify applicable gates
3. Follow gate protocols
4. Log violations

**When errors occur:**

1. Check INCIDENT-LOG.md for known pattern
2. Apply documented fix
3. Update log if repeated
4. Strengthen prevention if 2nd+ occurrence

### For Humans

**When reviewing work:**

1. Check if gates were followed
2. Call out violations
3. Require adherence to protocols

**When frustrated by repeat errors:**

1. Check INCIDENT-LOG.md
2. Verify prevention system exists
3. If yes: Enforce it
4. If no: Create it

---

## The Bottom Line

**Old Pattern:**

1. Make mistake
2. Fix it
3. Forget about it
4. Make same mistake again (repeat)

**New Pattern:**

1. Make mistake
2. Fix it
3. **Document it** (INCIDENT-LOG.md)
4. **Create prevention** (gates, protocols)
5. **Never make it again**

**The Goal:**

- Every error happens at most ONCE
- Prevention systems stop repeat mistakes
- Development velocity increases
- User frustration decreases

**Success = Incident Log stops growing**

---

**Last Updated:** 2026-02-01
**Next Review:** 2026-03-01
**Maintained By:** All agents working in this repository
