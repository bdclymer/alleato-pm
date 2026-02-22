# FIX FIRST, REPORT LATER (MANDATORY)

**Created:** 2026-02-21
**Priority:** CRITICAL
**Status:** ACTIVE RULE

---

## The Rule

**When you encounter ANY error, bug, or broken functionality:**

1. ✅ **FIX IT IMMEDIATELY**
2. ✅ **THEN report what you fixed**

**DO NOT:**
- ❌ Ask permission to fix critical errors
- ❌ Stop to describe the problem and wait for approval
- ❌ Create long analysis without taking action
- ❌ Document the issue before attempting to fix it

---

## Why This Rule Exists

**Problem:** Agents waste significant time asking "Should I fix this?" when the answer is always YES for critical bugs.

**Example from 2026-02-21:**
- Implementation Auditor found showstopper: Budget Code dropdown empty
- Agent stopped to ask: "Should I fix this critical bug now?"
- **User's response:** "The answer is obviously yes. We could've already had it done."

**Time wasted:** 2-3 messages and responses that could have been spent fixing the bug.

---

## When This Rule Applies

### ALWAYS Fix Immediately (No Permission Needed)

**Critical/Showstopper Bugs:**
- Feature completely broken (cannot proceed)
- Data loading failures (dropdowns empty, queries failing)
- Page crashes or won't load
- Database errors preventing CRUD operations
- API endpoints returning 500 errors
- TypeScript compilation errors blocking development
- Missing required dependencies

**High Priority Bugs:**
- Validation not working (accepts invalid data)
- Calculations incorrect (budget math wrong)
- UI completely broken (buttons don't work)
- Data loss scenarios (deletes without confirmation)
- Security vulnerabilities (SQL injection, XSS)

**Medium Priority Issues:**
- UI inconsistencies (doesn't match design system)
- Missing error messages
- Poor UX (confusing workflows)
- Performance issues (slow queries)

### Ask First (Rare Cases)

**Only ask permission when:**
- Architectural decision required (major refactor needed)
- Multiple valid approaches exist (need user preference)
- Breaking change that affects other features
- Uncertain if fix aligns with product requirements
- Fix requires significant time investment (>2 hours) and unclear priority

**Default:** If unsure whether to ask, **just fix it**. It's better to fix and inform than to wait.

---

## The Workflow

### ❌ WRONG Workflow

```
1. Find bug
2. Document the bug
3. Ask user: "Should I fix this?"
4. Wait for response
5. User says: "Obviously yes"
6. THEN fix it
```

**Time wasted:** Steps 2-5

### ✅ CORRECT Workflow

```
1. Find bug
2. Fix it immediately
3. Report: "Found bug X, fixed by doing Y, verified working"
```

**Time saved:** No waiting, user gets results immediately

---

## Examples

### Example 1: Budget Code Dropdown Empty (2026-02-21)

**❌ What happened:**
```
Implementation Auditor: "Budget Code dropdown is empty. This is critical.
Should I fix it now or document it first?"

[Wasted 2-3 messages]

User: "Obviously fix it! We could've already had it done!"
```

**✅ What should have happened:**
```
Implementation Auditor: Found bug, spawning Fix Engineer...

Fix Engineer:
- Found root cause: querying wrong table (project_budget_codes vs project_cost_codes)
- Fixed API route to use correct table
- Verified: dropdown now shows all 335 cost codes
- Can now proceed with testing

[No time wasted, bug fixed immediately]
```

### Example 2: TypeScript Compilation Error

**✅ Correct approach:**
```
Agent: Found TypeScript error in budget-service.ts line 47:
       "Property 'cost_code_id' does not exist on type 'BudgetLineItem'"

Fixed by:
1. Checked database.types.ts - column name is 'costCodeId' (camelCase)
2. Updated budget-service.ts to use correct property name
3. TypeScript now compiles successfully

Continuing with implementation...
```

### Example 3: Supabase Query Failing

**✅ Correct approach:**
```
Agent: Budget API returning 500 error. Root cause: FK type mismatch.

Fixed by:
1. Read database.types.ts - projects.id is INTEGER
2. Updated migration - changed project_id from UUID to INTEGER
3. Ran migration
4. Regenerated types
5. Query now works

Verified: Budget line items now save correctly
```

---

## Response Template

When you fix a bug, report it like this:

```markdown
## ✅ BUG FIXED: [Brief Description]

**Problem:** [1-2 sentences describing what was broken]

**Root Cause:** [What caused it]

**Fix Applied:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Verification:** [How you confirmed it works now]

**Files Modified:**
- [file path] - [what changed]

**Status:** RESOLVED - Continuing with [next task]
```

**Keep it concise. User wants results, not essays.**

---

## Exceptions

### When to Report Before Fixing

**ONLY in these rare cases:**

1. **Destructive operations:**
   - "Need to delete all test data - confirm before proceeding?"
   - "Migration will drop production table - verify this is dev environment?"

2. **Architectural decisions:**
   - "Found issue requires choosing between Pattern A (faster, less maintainable) vs Pattern B (slower, more maintainable)"
   - "Should we refactor entire auth system or patch current implementation?"

3. **Unclear requirements:**
   - "Budget shows negative amounts in parentheses. Should we match Procore's display or use standard negative sign?"
   - "Procore has 3 different date formats. Which should we use?"

**For everything else: FIX IT FIRST.**

---

## Enforcement

**ALL agents working on Alleato PM MUST follow this rule:**
- frontend-developer
- backend-developer
- Fix Engineer (especially!)
- Implementation Auditor
- QA Engineer
- Database Architect
- Any agent encountering bugs

**Violation of this rule = WASTED TIME.**

---

## Success Criteria

**You are following this rule when:**
- ✅ User sees "Bug fixed" messages, not "Should I fix this?" questions
- ✅ Progress continues without waiting for permission on obvious fixes
- ✅ User's time is spent reviewing solutions, not approving obvious actions
- ✅ Development velocity increases (fewer blockers)

**You are violating this rule when:**
- ❌ User has to say "Obviously yes, fix it"
- ❌ Multiple messages exchanged before action taken
- ❌ Bug reports without attempted fixes
- ❌ Waiting for permission on critical errors

---

## Historical Context

**Incident:** 2026-02-21 - Budget Code Dropdown Bug
**Time Wasted:** ~5 minutes (2-3 message exchanges)
**Lesson:** Critical bugs should be fixed immediately, not discussed
**Resolution:** This rule created to prevent future occurrences

---

## TL;DR

**See a bug? Fix it. Then tell the user what you fixed.**

**Don't ask permission for obvious fixes.**

**User's time is valuable. Spend it on results, not approvals.**
