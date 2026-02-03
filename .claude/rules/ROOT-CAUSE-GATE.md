# ROOT CAUSE ANALYSIS GATE (MANDATORY)

## The Rule

**DO NOT modify code until the root cause is CONFIRMED through evidence.**

Grep searches and assumptions are NOT evidence. Actual runtime output IS evidence.

---

## The Violation Pattern (From Incident 2026-01-28)

Claude modified `scheduling-service.ts` THREE TIMES based on assumptions:

1. Removed `created_by`/`updated_by` columns (assumption: columns don't exist)
2. Investigated `dependency_type` CHECK constraint (assumption: values wrong)
3. Investigated `is_overdue` computed column (assumption: missing property)

**Actual root cause:** `project_id` was UUID but `projects.id` was INTEGER.

**Time wasted:** Multiple unnecessary code changes that didn't fix anything.

---

## Required Process

### Step 1: Gather Evidence (NO CODE CHANGES)

Before ANY code modification, you MUST:

1. **Check actual runtime behavior**

   ```bash
   # Test API directly
   curl -v "http://localhost:3000/api/endpoint"

   # Check Supabase directly
   node -e 'const { createClient } = require("@supabase/supabase-js"); ...'
   ```

2. **Read error logs/console output**
   - Browser console errors
   - Server-side error logs
   - Test output with full stack traces

3. **Verify assumptions against source of truth**
   - Database types: `frontend/src/types/database.types.ts`
   - Actual table schema in Supabase
   - NOT from grep searches or memory

### Step 2: State Root Cause as Fact

Before modifying code, write a statement like:

> "The root cause is X. Evidence: [specific output/error showing X]."

If you cannot write this statement with evidence, GO BACK TO STEP 1.

### Step 3: Make Targeted Fix

Only modify code directly related to the confirmed root cause.

---

## Red Flags (STOP and Verify)

If you find yourself doing any of these, STOP:

- [ ] Making multiple unrelated code changes
- [ ] Saying "might be", "could be", "let me try"
- [ ] Modifying code based on grep search alone
- [ ] Changing code without testing the change
- [ ] Chasing multiple hypotheses without confirming any

---

## Checklist Before Code Modification

- [ ] I have runtime evidence of the actual error
- [ ] I can state the root cause as a fact with evidence
- [ ] The fix directly addresses the confirmed root cause
- [ ] I am not making speculative changes

---

## Historical Incidents

### 2026-01-28: Scheduling Service Misdiagnosis

- **Symptoms:** E2E tests stuck on loading spinner
- **Wrong diagnoses:** Missing columns, constraint values, computed properties
- **Actual cause:** UUID/INTEGER type mismatch in foreign key
- **Lesson:** Test the actual query before modifying service code
