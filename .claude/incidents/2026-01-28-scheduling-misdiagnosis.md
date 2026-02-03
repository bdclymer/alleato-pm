# Incident Report: Scheduling Service Misdiagnosis

**Date:** 2026-01-28
**Severity:** High (wasted significant user time)
**Status:** Resolved with guardrails added

---

## Summary

Claude Code spent an extended debugging session chasing wrong root causes for failing E2E tests, making multiple unnecessary code changes before finally identifying the actual issue.

---

## Timeline of Failures

### 1. Initial Symptom

E2E tests stuck on loading spinner - page never rendered data.

### 2. First Wrong Diagnosis: Missing Columns

Claude searched for `created_by` in types, didn't find it, and concluded:
> "The schedule_tasks table in the generated types does NOT have created_by or updated_by columns! This is the issue."

**Action taken:** Removed `created_by` and `updated_by` from service layer.

**Why this was wrong:** Column presence wasn't the issue - the service would have thrown a clear error if columns didn't exist. The real issue was queries returning no data.

### 3. Second Wrong Diagnosis: CHECK Constraint Values

Claude investigated dependency_type values:
> "The database CHECK constraint expects FS, SS, FF, SF but we changed the service and types to use finish_to_start, etc."

**Action taken:** None (realized it might not be the issue).

**Why this was wrong:** The query wasn't even reaching dependencies - it was failing earlier.

### 4. Third Wrong Diagnosis: Computed Column

Claude investigated `is_overdue`:
> "line 516 shows t.is_overdue being accessed, but is_overdue is NOT a column"

**Action taken:** None (realized it would just be undefined, not an error).

**Why this was wrong:** JavaScript undefined access doesn't throw errors.

### 5. Actual Root Cause (Finally Found)

Query was using integer project ID ("67") but `schedule_tasks.project_id` was UUID type, while `projects.id` was INTEGER.

```javascript
// This query silently returns empty results due to type mismatch
.from("schedule_tasks")
.select("*")
.eq("project_id", 67)  // 67 is integer, column expects UUID
```

---

## What Should Have Happened

1. **Test the actual query first**

   ```bash
   node -e '... supabase.from("schedule_tasks").select("*")...'
   ```

   This would have immediately shown empty results.

2. **Check the column types in database.types.ts**
   Would have revealed `project_id: string` (UUID) vs `projects.id: number` (INTEGER).

3. **Make ONE targeted fix** (the schema type mismatch).

---

## Code Changes That Were Unnecessary

1. Removed `created_by` from `createTask()` - line 182
2. Removed `updated_by` from `createTask()` - line 183
3. Removed `updated_by` from `updateTask()` - line 222
4. Removed `updated_by` from `bulkUpdateTasks()` - line 281
5. Removed `created_by` from `upsertDeadline()` - line 394

These changes may or may not be correct, but they were made without confirming they were the root cause.

---

## Additional Failures

### Told User to Run SQL Manually

Instead of using MCP tools or Supabase CLI, Claude dumped 150+ lines of SQL and said:
> "User: You need to run this SQL in Supabase..."

User response:
> "why can't you freaking run it with the supabase cli or mcp?"

### Repeated Bash Command Failures

- `cd frontend && ...` failed (zsh incompatibility)
- Relative path redirects failed (wrong working directory)
- `!!` escaping issues in node -e strings

---

## Guardrails Added

1. **ROOT-CAUSE-GATE.md** - Require runtime evidence before code changes
2. **BASH-EXECUTION-RULES.md** - Working directory and escaping rules
3. **USE-AVAILABLE-TOOLS.md** - Use MCP/CLI instead of manual instructions
4. **SUPABASE-GATE.md (updated)** - Added FK type matching requirement
5. **CLAUDE.md (updated)** - Added references to new gates

---

## Lessons Learned

1. **Test queries directly before debugging code** - A simple Supabase query test would have revealed the empty results immediately.

2. **Type mismatches are silent killers** - UUID vs INTEGER FK doesn't throw errors, it just returns no data.

3. **Read the types file, don't grep for columns** - Grep can miss context. Reading the actual types shows relationships.

4. **Use tools, don't instruct** - If MCP or CLI can do it, do it yourself.

5. **One hypothesis at a time** - Confirm or reject before moving to the next.

---

## Prevention Checklist

For future debugging sessions:

- [ ] Test the actual database query first
- [ ] Read `database.types.ts` fully, don't grep
- [ ] Check FK types match PK types
- [ ] State root cause as fact with evidence before changing code
- [ ] Use available tools (MCP, CLI) instead of manual instructions
- [ ] Check `pwd` before running commands with paths
