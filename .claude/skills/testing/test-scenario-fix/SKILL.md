---
name: test-scenario-fix
description: >
  Fix all FAIL results from a test-scenario-run-feature or test-scenario-run-smoke run.
  Reads failures from Supabase, diagnoses root cause from screenshots/notes/video paths,
  fixes the code, then immediately re-runs the case in agent-browser. If still failing,
  re-diagnoses and retries (up to 3 attempts per case). Loops until all cases pass or
  max attempts are exhausted. Does NOT auto-create GitHub issues.
  Use when: "fix the test failures", "fix the failing tests for X", "fix run <id>".
argument-hint: <tool> [--run <run_id>] [--case N.N.N]
---

# test-scenario-fix

## Purpose

Read FAIL results from the most recent (or specified) test run for a tool, fix the underlying code issues, and immediately verify each fix by re-running the case in agent-browser. If a case still fails after a fix, re-diagnose from the new evidence and try again — up to **3 attempts per case**. This skill loops autonomously until all cases pass or attempts are exhausted. It does **not** create GitHub issues.

---

## Step 1 — Resolve the run

If `--run <run_id>` was provided, use it directly.

Otherwise, find the most recent run for the tool:

```sql
select tr.id, tr.suite_id, tr.created_at, tr.notes, ts.suite_type, ts.tool_name
from public.test_runs tr
join public.test_suites ts on ts.id = tr.suite_id
where ts.tool_name = $1
order by tr.created_at desc
limit 1;
```

Announce to user: `Fixing failures from run <run_id> (<suite_type> suite for <tool_name>, <created_at>).`

---

## Step 2 — Load failures

```sql
select
  tres.id          as result_id,
  tres.status,
  tres.severity,
  tres.notes,
  tres.video_url,
  tc.test_number,
  tc.test_name,
  tc.category,
  tc.priority,
  tc.steps,
  tc.expected_result,
  tc.start_url
from public.test_results tres
join public.test_cases tc on tc.id = tres.case_id
where tres.run_id = $run_id
  and tres.status = 'fail'
  and ($case_filter::text is null or tc.test_number = $case_filter)
order by
  case tres.severity
    when 'critical' then 1
    when 'high'     then 2
    when 'medium'   then 3
    when 'low'      then 4
  end,
  tc.test_number;
```

If 0 failures: announce "No failures found in run <run_id>" and stop.

Announce: `Found <N> failures. Working highest severity first.`

---

## Step 3 — Load screenshots for each failure

For each failure, load its screenshot paths:

```sql
select storage_path, public_url, label
from public.test_screenshots
where result_id = $result_id
order by label;
```

Read each available screenshot with the Read tool before attempting diagnosis. State in one sentence what each screenshot shows.

---

## Step 4 — Diagnose each failure

For each failure, in severity order:

### 4.1 — Read evidence

1. Read all screenshots (via `public_url` or local path)
2. Read `tres.notes` — it contains step summaries, console errors, DB assertion results
3. If `video_url` is set and the file exists locally, note it for reference

### 4.2 — State root cause

Before touching any code, state:

```
Root cause: <one sentence — what specifically is wrong>
Evidence: <screenshot X shows Y / notes say Z / DB returned ...>
Fix location: <file:line or component name>
```

Do not modify code until root cause is stated as a fact with evidence. (Gate 4 — Root Cause Gate.)

### 4.3 — Classify fix type

| Fix type | Examples |
|----------|---------|
| `ui-bug` | Wrong element rendered, missing field, incorrect state |
| `api-bug` | Route returning 500, wrong query, missing validation |
| `data-missing` | Seed data absent, FK reference broken |
| `test-case-wrong` | Expected result is incorrect or unreachable |

For `test-case-wrong`: update the test case in Supabase instead of touching app code:
```sql
update public.test_cases
set expected_result = '<corrected expectation>',
    notes = 'Updated: <reason>'
where id = $case_id;
```
Then skip to Step 5 for this case.

---

## Step 5 — Fix-verify loop (per case, up to 3 attempts)

For each failure from Step 2, run this loop. `attempt = 1`.

### 5.A — Announce attempt

Print: `🔧 [<test_number>] <test_name> — attempt <attempt>/3`

### 5.B — Diagnose

State root cause as a fact before touching code:

```
Root cause: <one sentence>
Evidence: <screenshot X / notes say Y / DB returned Z>
Fix location: <file:line or component>
```

If `attempt > 1`, read the new failure evidence from the previous re-run (screenshots, notes) before re-diagnosing. Do not repeat the same fix that already failed.

**Fix type classification:**

| Fix type | Action |
|----------|--------|
| `ui-bug` | Fix component/page code |
| `api-bug` | Fix route handler or query |
| `data-missing` | Seed or create prerequisite data |
| `test-case-wrong` | Update `test_cases` row in Supabase — skip to 5.F |

### 5.C — Fix the code

Apply the minimal fix. Follow all CLAUDE.md gates:

- Gate 7: Check `ds/` before writing any JSX
- Gate 13: Use `apiFetch`, not raw `fetch`
- Gate 16: Use `fetchWithGuardrails` in API routes
- No silent failures, no generic errors

After fixing, typecheck:

```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -20
```

Fix all type errors before proceeding. A fix that breaks the build is not a fix.

### 5.D — Verify dev server is live

```bash
curl -sf -o /dev/null http://localhost:3000 || echo "DEV SERVER DOWN"
```

HMR should pick up the change automatically. If the server is down, restart it and wait for "Ready" before continuing.

### 5.E — Re-run the case in agent-browser

Open the browser if not already open. Navigate and execute the case exactly as `test-scenario-run-feature` Step 5 (5.2 through 5.5) for this single case:

```bash
VIDEO_PATH="e2e-screenshots/$run_id/<test_number>-attempt<attempt>.webm"
agent-browser record start "$VIDEO_PATH"
agent-browser open "<case.start_url with {projectId}=67>" --headed
agent-browser wait --load domcontentloaded
# ... execute steps ...
VERIFY_SCREENSHOT="e2e-screenshots/$run_id/<test_number>-attempt<attempt>-final.png"
agent-browser screenshot "$VERIFY_SCREENSHOT"
agent-browser record stop
```

Read the screenshot. Compare against `case.expected_result`. Run DB assertion if applicable.

**Outcome:**

- **Passed** → go to 5.F (success path)
- **Still failing** → increment `attempt`. If `attempt <= 3`, go back to 5.B with new evidence. If `attempt > 3`, go to 5.G (give up path).

### 5.F — Record fixed (success path)

Insert result row with status `'fixed'` — NOT `'pass'`. This distinguishes cases that passed on first run from cases that needed a fix to pass.

```sql
insert into public.test_results (run_id, case_id, status, severity, notes, video_url)
values ($run_id, $case_id, 'fixed', null,
        'Fixed on attempt <attempt>: <one-line summary>. Verified <iso timestamp>.',
        null)
returning id;
```

Upload verification screenshot:

Upload to bucket `test-screenshots` at `<run_id>/<test_number>/attempt<attempt>-final.png`. Insert:

```sql
insert into public.test_screenshots (result_id, storage_path, public_url, label)
values ($result_id, $storage_path, $public_url, 'verified-attempt<attempt>');
```

Print: `✅ FIXED [<test_number>] on attempt <attempt>`

Move to the next failure.

### 5.G — Give up after 3 attempts

Insert result row noting exhausted attempts:

```sql
insert into public.test_results (run_id, case_id, status, severity, notes, video_url)
values ($run_id, $case_id, 'fail', $severity,
        'Fix attempted 3 times — still failing. Attempts: [<summary of each attempt and why it failed>]',
        $video_path)
returning id;
```

Upload final screenshot as evidence.

Print: `❌ UNRESOLVED [<test_number>] after 3 attempts — see report`

Move to the next failure. **Do not stop the run.**

---

## Step 6 — Repeat for all failures

Work through every failure from Step 2 in severity order (critical → high → medium → low). One unresolved case never stops the others.

---

## Step 7 — Write fix report

Path: `docs/testing/results/<tool>-fix-<YYYYMMDD-HHmmss>.md`

```markdown
# Fix Report: <Tool>

**Original Run ID:** <run_id>
**Date:** <timestamp>
**Branch:** <branch>

## Summary

| Severity | Failures | Fixed | Unresolved (3 attempts) |
|----------|----------|-------|------------------------|
| critical | N | N | N |
| high     | N | N | N |
| medium   | N | N | N |
| low      | N | N | N |
| **Total** | N | N | N |

## Fixed

### <test_number> — <test_name>

- **Root cause:** <one sentence>
- **Fix:** `<file:line>` — <what changed>
- **Attempts needed:** <N>
- **Verified:** ✅ passes — [screenshot](<url>)

(repeat per fixed case)

## Unresolved (exhausted 3 attempts)

### <test_number> — <test_name>

| Attempt | Hypothesis | Fix tried | Result |
|---------|-----------|-----------|--------|
| 1 | ... | ... | still failing: ... |
| 2 | ... | ... | still failing: ... |
| 3 | ... | ... | still failing: ... |

- **Last observation:** <what was visible in the final screenshot>
- **Recommended next step:** <specific file/line or investigation needed>

(repeat per unresolved case)

## Files Changed

- `<file>` — <one-line description of change>

## Next Steps

- [ ] Investigate unresolved cases manually (details above)
- [ ] Re-run full suite when ready: `/test-scenario-run-feature <tool>`
- [ ] Smoke check: `/test-scenario-run-smoke <tool>`
```

Read the report with the Read tool before reporting done.

---

## Step 8 — Close browser

```bash
agent-browser close
```

---

## Constraints

- **Never auto-create GitHub issues.** If the caller wants issues created, that is a separate step.
- **Never mark a case `pass` without re-running it.** A code change that looks correct must be verified in browser.
- **Never skip the type-check after a fix.** TypeScript errors in CI will undo your work.
- **One fix per case at a time.** Do not batch multi-case fixes into one code change — makes rollback impossible.

---

## Failure Modes

| Symptom | Action |
|---------|--------|
| Screenshots missing for a failure | Diagnose from `notes` field alone; state "no screenshot available" in fix notes |
| Root cause is ambiguous | Read the relevant source file before guessing; state two hypotheses and test the more likely one first |
| Fix causes a new TypeScript error | Fix the type error before proceeding — do not leave broken types |
| Re-run of fixed case still fails | Do not mark pass; note "Fix attempted — still failing" and continue |
| Dev server crashes during fix session | Restart it; re-verify the last case that was mid-run |

---

## Related Skills

- `/test-scenario-run-feature <tool>` — run feature tests to generate failures to fix
- `/test-scenario-run-smoke <tool>` — fast API sweep
- `/test-scenario-run <tool>` — run both suites
