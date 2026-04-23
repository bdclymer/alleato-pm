---
name: test-scenario-run-feature
description: >
  Execute the full browser-based feature test suite for an Alleato tool using agent-browser.
  Screenshots at key points (setup, final, and on failure) for all cases. Video recording is
  opt-in via --video flag; always recorded for FAIL cases. Evidence gate blocks marking any
  FAIL without attached proof. Behaves like a careful human tester — navigates, interacts,
  asserts, persists results.
  Use when: "run feature tests for X", "test X", "verify X works", "run all tests for X".
argument-hint: <tool> [--case N.N.N] [--priority HIGH|MEDIUM|LOW] [--video]
---

# test-scenario-run-feature

## Purpose

Execute browser-based test cases from Supabase (`test_cases`) against the live app. Every case produces:

1. **Screenshots at key points** — setup entry, final assertion, and every step on `fail`. Saved to `e2e-screenshots/<run_id>/` locally; uploaded to Supabase Storage **after** each case completes (batched, not per-step).
2. **A video recording per case** — recorded for ALL cases when `--video` flag is passed, or for FAIL cases only otherwise. `agent-browser record start` fires before navigation, `record stop` fires after verdict. Stored at `e2e-recordings/<run_id>/`.
3. **A DB result row** — no result row is written without at least one screenshot attached.

The evidence gate is **non-negotiable**: a FAIL with no screenshot and no video is an incomplete test, not a passing one.

---

## Preflight

### 1. Dev server

```bash
curl -sf -o /dev/null http://localhost:3000 || echo "DEV SERVER DOWN"
```

If down:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run dev > /tmp/nextjs-dev.log 2>&1 &
for i in $(seq 1 12); do
  grep -q "Ready" /tmp/nextjs-dev.log 2>/dev/null && echo "Server ready" && break
  sleep 5
done
```

### 2. agent-browser

```bash
agent-browser --version || (npm install -g agent-browser && agent-browser install --with-deps)
```

If install fails, stop and tell the user. Do not fall back to Playwright.

### 3. Credentials

```bash
TEST_USER=$(grep '^TEST_USER_1=' .env | cut -d '=' -f2-)
TEST_PASSWORD=$(grep '^TEST_PASSWORD_1=' .env | cut -d '=' -f2-)
test -n "$TEST_USER" -a -n "$TEST_PASSWORD" || { echo "MISSING TEST_USER_1/TEST_PASSWORD_1 in .env"; exit 1; }
```

### 4. Evidence directories

```bash
mkdir -p e2e-screenshots   # Local staging for uploads
mkdir -p e2e-recordings    # Local video storage
```

---

## Step 1 — Resolve suite

```sql
select id, suite_type, tool_name
from public.test_suites
where tool_name = $1
  and suite_type = 'feature';
```

If no rows: stop with — "No feature suite found for `<tool>`. Generate cases first with `/test-scenario-writer <tool> feature`."

## Step 2 — Load cases

```sql
select id, test_number, test_name, category, subcategory, priority,
       context_note, setup_steps, steps, expected_result, start_url, status
from public.test_cases
where suite_id = $1
  and ($2::text is null or test_number = $2)
  and ($3::text is null or priority = $3)
order by test_number;
```

If 0 cases after filters: stop with what was filtered out.

## Step 3 — Create test run + export session

```sql
insert into public.test_runs (suite_id, tester, environment, branch, notes)
values ($1, 'claude-code', 'localhost:3000', $branch, null)
returning id;
```

`$branch` = `git branch --show-current`. Capture `run_id`.

**Immediately export session name:**

```bash
export AGENT_BROWSER_SESSION="feature-$run_id"
mkdir -p "e2e-screenshots/$run_id"
mkdir -p "e2e-recordings/$run_id"
```

Announce to the user: "Opening browser in watch mode — a Chromium window will appear. <N> cases to run."

## Step 4 — Open browser, authenticate

```bash
agent-browser open http://localhost:3000/login --headed
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser fill @<emailInput> "$TEST_USER"
agent-browser fill @<passwordInput> "$TEST_PASSWORD"
agent-browser click @<submitButton>
agent-browser wait --load domcontentloaded
```

Verify URL is NOT `/login` after redirect. If still on `/login`, stop and report auth failure.

---

## Step 5 — Execute each case

For **every** case, in order, follow this exact sequence.

### 5.0 — Announce case start

Print to user: `▶ Running [<test_number>] <test_name> (<priority>)`

### 5.1 — Start video recording

**If `--video` flag was passed OR this is a known-failing case:** always record.
**Otherwise:** start recording anyway — it will be discarded in 5.6 if the case passes.

```bash
VIDEO_PATH="e2e-recordings/$run_id/<test_number>.webm"
agent-browser record start "$VIDEO_PATH"
```

**If `record start` fails:** log the error, continue the test, note "video unavailable: <error>" — do NOT skip the test.

### 5.2 — Navigate

```bash
agent-browser open "<case.start_url with {projectId} replaced by 67>" --headed
agent-browser wait --load domcontentloaded
```

Use `networkidle` only when the page has known async data loading that must complete before the first interaction (e.g., a table that populates via API). Default to `domcontentloaded`.

### 5.3 — Setup steps (if `case.setup_steps` is non-empty)

For each setup step N:
- Re-snapshot: `agent-browser snapshot -i`
- Perform the action
- `agent-browser wait --load domcontentloaded`
- Screenshot only at end of ALL setup steps (not per-step):
  ```bash
  agent-browser screenshot "e2e-screenshots/$run_id/<test_number>-setup.png"
  ```
- Read the screenshot. Confirm setup completed as expected before proceeding.

### 5.4 — Execute steps

For each step N in `case.steps`:

1. Re-snapshot: `agent-browser snapshot -i`
2. Perform the action described in step N (click, fill, select, press, scroll, etc.)
3. `agent-browser wait --load domcontentloaded`

**Do NOT screenshot after each step during normal execution.** Screenshots are taken only at:
- End of setup (5.3 above)
- Final assertion (5.5 below)
- Any step where the page shows an error or blank screen (take immediately and flag as candidate fail)

**Console check — final step only:** After the last step in the case, run once:
```bash
agent-browser console
agent-browser errors
```
Any uncaught JS exception → note it; contributes to a `fail` outcome but does NOT stop the test.

### 5.5 — Assert expected result

Take the final screenshot:

```bash
FINAL_SCREENSHOT="e2e-screenshots/$run_id/<test_number>-final.png"
agent-browser screenshot "$FINAL_SCREENSHOT"
```

Read the screenshot. State what you see. Compare against `case.expected_result`:

- If the case implies a DB write, query the table to confirm:
  ```sql
  select * from public.<relevant_table> order by created_at desc limit 1;
  ```
- If the case checks a URL, verify: `agent-browser get url`

**If assertion fails:** immediately take per-step screenshots for all steps in this case to build the failure record:
```bash
# Re-navigate and re-run steps quickly, screenshot after each
agent-browser screenshot "e2e-screenshots/$run_id/<test_number>-step-<N>.png"
```
This keeps the happy path fast while ensuring fails have full evidence.

### 5.6 — Stop video recording

```bash
agent-browser record stop
```

**If case PASSED and `--video` flag was NOT passed:** delete the video to save disk space:
```bash
rm -f "$VIDEO_PATH"
VIDEO_PATH=""
```

**If case FAILED:** keep the video. `$VIDEO_PATH` is evidence.

### 5.7 — Classify outcome

| Outcome | Condition |
|---------|-----------|
| `pass` | All steps ran, expected result matched, no blocking console errors |
| `fail` | Assertion mismatch, JS exception in a critical path, or blank page |
| `skip` | Prerequisite data missing (seed data absent, dependent resource doesn't exist) |
| `blocked` | Upstream case it depends on failed, or dev server died |

**Severity for fails:**

| Severity | When |
|----------|------|
| `critical` | Blocks core flow (can't create, can't navigate, blank page) |
| `high` | Feature broken but workaround exists |
| `medium` | Partial functionality or non-critical field wrong |
| `low` | Cosmetic only |

### 5.8 — Evidence gate (NON-NEGOTIABLE)

Before inserting the result row, verify:

```bash
ls "e2e-screenshots/$run_id/<test_number>-"*.png 2>/dev/null | wc -l
```

If count is 0: something went wrong with screenshot capture. Set `notes` to include "EVIDENCE WARNING: no screenshots captured — result may be unreliable". Still insert the row, but flag it.

For `fail` outcomes: `$VIDEO_PATH` must be set and the file must exist:

```bash
test -f "$VIDEO_PATH" || VIDEO_PATH="unavailable"
```

### 5.9 — Insert result row

```sql
insert into public.test_results (run_id, case_id, status, severity, notes, video_url)
values ($run_id, $case_id, $status, $severity, $notes, $video_url)
returning id;
```

- `$video_url`: local path `$VIDEO_PATH` if recording kept; null if discarded for a pass.
- `$notes`: include step summary, console errors (if any), DB assertion result.

### 5.10 — Upload screenshots to Supabase Storage (batched per case)

After inserting the result row, upload all screenshots for this case in one batch:

For every `.png` in `e2e-screenshots/<run_id>/<test_number>-*.png`:

Upload to bucket `test-screenshots` at path `<run_id>/<test_number>/<filename>.png`.

Then insert all screenshot rows in a single multi-row insert:

```sql
insert into public.test_screenshots (result_id, storage_path, public_url, label)
values
  ($result_id, $storage_path_1, $public_url_1, $label_1),
  ($result_id, $storage_path_2, $public_url_2, $label_2),
  ...;
```

`$label` = `setup`, `step-<N>` (fail evidence only), or `final`.

**If upload fails:** log the storage error in result notes. Do NOT re-attempt more than once. The local file is evidence even if cloud upload fails.

### 5.11 — Print case outcome

Print to user: `✅ PASS [<test_number>]` or `❌ FAIL [<test_number>] — <severity> — <one-line summary>`

---

## Step 6 — Failure handling

- **One case failing never stops the run.** On unexpected exception: insert a `fail` result with severity `high`, note the error, stop the recording if active, screenshot current state, continue to next case.
- **If dev server dies mid-run:** mark current case `blocked`, retry health check once, if still down mark remaining cases `blocked`, proceed to Step 7.
- **If auth session is lost:** re-login once (Step 4 again), then continue from current case.

---

## Step 7 — Finalize run

```sql
update public.test_runs
set notes = 'passed=<P> failed=<F> skipped=<S> blocked=<B> duration=<secs>s'
where id = $run_id;
```

---

## Step 8 — Write report

Path: `docs/testing/results/<tool>-feature-<YYYYMMDD-HHmmss>.md`

```markdown
# Feature Test Report: <Tool>

**Run ID:** <run_id>
**Tester:** claude-code
**Environment:** localhost:3000
**Branch:** <branch>
**Started:** <iso timestamp>
**Duration:** <secs>s

## Summary

| Status  | Count |
|---------|-------|
| Passed  | P     |
| Failed  | F     |
| Skipped | S     |
| Blocked | B     |
| **Total** | N   |

Pass rate: **X%**

## Results

| # | Test | Priority | Status | Severity | Evidence |
|---|------|----------|--------|----------|----------|
| 1.1.1 | Create record | HIGH | ✅ pass | — | [final](<url>) |
| 1.1.2 | Reject invalid input | HIGH | ❌ fail | high | [step-1](<url>) [final](<url>) [video](e2e-recordings/<run_id>/1.1.2.webm) |

## Failures

### <test_number> — <test_name>

- **Expected:** <expected_result>
- **Actual:** <what was observed — quote the screenshot>
- **Severity:** <severity>
- **Video:** `e2e-recordings/<run_id>/<test_number>.webm`
- **Screenshots:**
  - Final: <public_url>
  - Step evidence: <public_url per step>
- **Console errors:** <list or "none">
- **DB assertion:** <query result if applicable>
- **Remediation hint:** <specific file/line where the fix should go>

(repeat per failure)

## Skipped / Blocked

- **<test_number> — <test_name>:** <reason>

## Next Steps

- [ ] Fix <test_number> — <file>:<line> hint
- [ ] Re-run after fix: `/test-scenario-run-feature <tool> --case <test_number>`
- [ ] Run smoke to verify API still healthy: `/test-scenario-run-smoke <tool>`
```

**Read the report with the Read tool.** Do not report done without reading it. (Gate 9 — Review Your Own Output.)

---

## Step 9 — Close browser

```bash
agent-browser close
```

---

## agent-browser Command Reference (subset used in this skill)

```bash
agent-browser open <url> --headed
agent-browser snapshot -i
agent-browser click @eN
agent-browser fill @eN "text"
agent-browser select @eN "option"
agent-browser press Enter
agent-browser scroll down 500
agent-browser wait --load domcontentloaded
agent-browser wait --load networkidle
agent-browser wait @eN
agent-browser screenshot <path.png>
agent-browser get url
agent-browser get text @eN
agent-browser console
agent-browser errors
agent-browser record start <path.webm>
agent-browser record stop
agent-browser close
```

**Refs invalidate after navigation or DOM mutation.** Always re-snapshot before interacting with a changed page.

---

## Failure Modes

| Symptom | Action |
|---------|--------|
| `start_url` returns 500 | Mark `fail` severity `critical`, screenshot error page, stop recording, continue |
| Element ref not found | Re-snapshot once; if still missing, mark `fail` severity `high`, note "selector not found" |
| Navigation hangs > 30s | Close and reopen browser; mark case `blocked` if recurs |
| `record start` fails | Note error, continue test without video |
| Screenshot write fails | Note error, continue — do not block result insert |
| Supabase Storage upload fails | Note error in result row; test result still inserted |
| DB assertion fails but UI looked fine | Mark `fail` severity `high`, include both screenshot + SQL output in notes |
| Supabase MCP unavailable | Fall back to `psql "$SUPABASE_DB_URL" -c '...'` |

---

## Related Skills

- `/test-scenario-run-smoke <tool>` — fast API sweep, run this first
- `/test-scenario-writer <tool> feature` — generates test cases if none exist
- `/test-scenario-run <tool>` — runs smoke then feature in sequence
