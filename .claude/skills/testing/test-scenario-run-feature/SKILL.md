---
name: test-scenario-run-feature
description: >
  Execute the full browser-based feature test suite for an Alleato tool using agent-browser.
  Screenshots at key points (setup, final, and on visible failure) for all cases. Video is
  recorded for every case, then retained only for failures unless --video is passed. Evidence
  gate blocks marking any PASS/FAIL without attached proof. Behaves like a careful human tester
  — navigates, interacts, asserts, persists results.
  Use when: "run feature tests for X", "test X", "verify X works", "run all tests for X".
argument-hint: <tool> [--case N.N.N] [--priority HIGH|MEDIUM|LOW] [--project-id 67] [--video]
---

# test-scenario-run-feature

## Purpose

Execute browser-based test cases from Supabase (`test_cases`) against the live app. Every case produces:

1. **Screenshots at key points** — setup entry, final assertion, and any step where the UI visibly errors or goes blank. Saved under `tests/agent-browser-runs/<timestamp>-feature-<tool>/screenshots/<run_id>/`; uploaded to Supabase Storage **after** each case completes (batched, not per-step).
2. **A video recording per case** — recorded for every case. Passing-case video is deleted unless `--video` is passed; failing, blocked, and incomplete-case video is retained. Stored under `tests/agent-browser-runs/<timestamp>-feature-<tool>/recordings/<run_id>/`.
3. **A DB result row** — no `pass` or `fail` row is written without at least one screenshot attached. Evidence capture failure is an `incomplete`/`blocked` test operation, not a product pass or fail.
4. **Run-scoped test data** — any created or updated data must include a visible marker: `E2E-<run_id>-<test_number>`.

The evidence gate is **non-negotiable**: a case with no screenshot cannot be counted as `pass` or `fail`. Mark it `blocked` with severity `high`, explain the screenshot capture failure, and keep any available video/local logs.

## Argument defaults

- `<tool>` is required.
- `--case` runs one `test_number`.
- `--priority` filters by `HIGH`, `MEDIUM`, or `LOW`.
- `--project-id` defaults to `67`; use this value anywhere a case URL contains `{projectId}`.
- `--video` keeps videos for passed cases. Without it, passed-case videos are deleted after result persistence.

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

### 4. Supabase access

Use the Supabase MCP (`mcp__d852572d-*__execute_sql`, project `lgveqfnpkxvzbnnwuled`) for DB reads/writes and screenshot metadata inserts. If MCP is unavailable, fall back to:

```bash
test -n "$SUPABASE_DB_URL" || { echo "MISSING SUPABASE_DB_URL for psql fallback"; exit 1; }
psql "$SUPABASE_DB_URL" -c '<sql>'
```

Before creating a run, verify the tables used by this skill are reachable:

```sql
select to_regclass('public.test_suites') as test_suites,
       to_regclass('public.test_cases') as test_cases,
       to_regclass('public.test_runs') as test_runs,
       to_regclass('public.test_results') as test_results,
       to_regclass('public.test_screenshots') as test_screenshots;
```

If any table is missing or inaccessible, stop and report the exact missing object.

### 5. Evidence directories

Set a run root once, before creating local evidence. This aligns feature-run artifacts with the project browser-verification convention.

```bash
RUN_STAMP=$(date +%Y%m%d-%H%M%S)
SAFE_TOOL=$(printf "%s" "<tool>" | tr ' /' '--' | tr -cd '[:alnum:]_.-')
ARTIFACT_ROOT="tests/agent-browser-runs/${RUN_STAMP}-feature-${SAFE_TOOL}"
mkdir -p "$ARTIFACT_ROOT/screenshots"
mkdir -p "$ARTIFACT_ROOT/recordings"
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
PROJECT_ID="${PROJECT_ID:-67}"
KEEP_PASS_VIDEOS="${KEEP_PASS_VIDEOS:-false}" # set true when --video is passed
DATA_MARKER_PREFIX="E2E-$run_id"
mkdir -p "$ARTIFACT_ROOT/screenshots/$run_id"
mkdir -p "$ARTIFACT_ROOT/recordings/$run_id"
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

Verify URL is NOT `/login` after redirect:

```bash
AUTH_URL=$(agent-browser get url)
```

If still on `/login`, capture evidence before stopping:

```bash
agent-browser screenshot "$ARTIFACT_ROOT/auth-failure.png"
agent-browser console
agent-browser errors
```

Report whether the page shows invalid credentials, a network/server error, or an unknown auth state. Include the current URL and screenshot path.

---

## Step 5 — Execute each case

For **every** case, in order, follow this exact sequence.

### 5.0 — Announce case start

Print to user: `▶ Running [<test_number>] <test_name> (<priority>)`

### 5.1 — Start video recording

Always start recording before navigation. Retain video for `fail`, `blocked`, and evidence-capture failures. Delete passed-case video unless `--video` was passed.

```bash
VIDEO_PATH="$ARTIFACT_ROOT/recordings/$run_id/<test_number>.webm"
agent-browser record start "$VIDEO_PATH"
```

**If `record start` fails:** log the error, continue the test, note "video unavailable: <error>" — do NOT skip the test.

### 5.2 — Navigate

```bash
agent-browser open "<case.start_url with {projectId} replaced by $PROJECT_ID>" --headed
agent-browser wait --load domcontentloaded
```

Use `networkidle` only when the page has known async data loading that must complete before the first interaction (e.g., a table that populates via API). Default to `domcontentloaded`.

### 5.3 — Setup steps (if `case.setup_steps` is non-empty)

For each setup step N:
- Re-snapshot: `agent-browser snapshot -i`
- Perform the action
- `agent-browser wait --load domcontentloaded`

Screenshot only at end of ALL setup steps (not per-step):

```bash
agent-browser screenshot "$ARTIFACT_ROOT/screenshots/$run_id/<test_number>-setup.png"
```

Read the screenshot. Confirm setup completed as expected before proceeding.

### 5.4 — Execute steps

For each step N in `case.steps`:

1. Re-snapshot: `agent-browser snapshot -i`
2. Perform the action described in step N (click, fill, select, press, scroll, etc.)
3. `agent-browser wait --load domcontentloaded`

**Do NOT screenshot after each step during normal execution.** Screenshots are taken only at:
- End of setup (5.3 above)
- Final assertion (5.5 below)
- Any step where the page shows an error or blank screen (take immediately and flag as candidate fail)

For a visible error or blank screen during a step:

```bash
agent-browser screenshot "$ARTIFACT_ROOT/screenshots/$run_id/<test_number>-step-<N>-visible-error.png"
agent-browser get url
agent-browser snapshot -i
```

Do **not** rerun a failed case just to collect screenshots. Re-running mutating flows can create duplicate records or change the state being diagnosed. Failure evidence must come from the first execution: retained video, final/current screenshot, current URL, DOM snapshot, console/errors, and deterministic DB query output.

**Console check — final step only:** After the last step in the case, run once:
```bash
agent-browser console
agent-browser errors
```
Any uncaught JS exception → note it; contributes to a `fail` outcome but does NOT stop the test.

### 5.5 — Assert expected result

Take the final screenshot:

```bash
FINAL_SCREENSHOT="$ARTIFACT_ROOT/screenshots/$run_id/<test_number>-final.png"
agent-browser screenshot "$FINAL_SCREENSHOT"
```

Read the screenshot. State what you see. Compare against `case.expected_result`:

- If the case creates or updates data, use the marker `E2E-<run_id>-<test_number>` in the visible name/description/notes field whenever the form supports it. Record any created ID or unique displayed value in `$notes`.
- If the case implies a DB write, query deterministically by the marker, created ID, or unique UI value. Do not use "latest row" queries.
  ```sql
  select *
  from public.<relevant_table>
  where <marker_column> ilike '%E2E-<run_id>-<test_number>%'
     or id = <created_id_from_ui_or_response>
  limit 5;
  ```
- If the case checks a URL, verify: `agent-browser get url`

**If assertion fails:** capture current-state evidence without replaying the case:

```bash
agent-browser screenshot "$ARTIFACT_ROOT/screenshots/$run_id/<test_number>-failure-current.png"
agent-browser get url
agent-browser snapshot -i
agent-browser console
agent-browser errors
```

### 5.6 — Stop video recording

```bash
agent-browser record stop
```

**If case PASSED and `--video` flag was NOT passed:** do not delete the video in this step. Defer deletion until after Step 5.10 succeeds, so evidence remains available if persistence fails.

**If case FAILED, BLOCKED, or evidence capture was incomplete:** keep the video. `$VIDEO_PATH` is evidence.

### 5.7 — Classify outcome

| Outcome | Condition |
|---------|-----------|
| `pass` | All steps ran, expected result matched, no blocking console errors |
| `fail` | Assertion mismatch, JS exception in a critical path, or blank page |
| `skip` | Prerequisite data missing (seed data absent, dependent resource doesn't exist) |
| `blocked` | Upstream case it depends on failed, or dev server died |
| `blocked` with severity `high` | Evidence capture failed, so the product outcome cannot be trusted |

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
ls "$ARTIFACT_ROOT/screenshots/$run_id/<test_number>-"*.png 2>/dev/null | wc -l
```

If count is 0, something went wrong with screenshot capture. Use this gate:

1. Stop recording if active.
2. Set `status='blocked'`, `severity='high'`, and `notes='EVIDENCE CAPTURE FAILED: no screenshots captured; product result not counted. Cause=<error>; detection_gap=screenshot command returned no file; prevention=fix screenshot capture before rerun.'`.
3. Insert the result row only as `blocked`, never as `pass` or `fail`.
4. Keep the video if present.
5. Continue to the next case.

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

For every `.png` in `$ARTIFACT_ROOT/screenshots/<run_id>/<test_number>-*.png`:

Upload to bucket `test-screenshots` at path `<run_id>/<test_number>/<filename>.png`.

Then insert all screenshot rows in a single multi-row insert:

```sql
insert into public.test_screenshots (result_id, storage_path, public_url, label)
values
  ($result_id, $storage_path_1, $public_url_1, $label_1),
  ($result_id, $storage_path_2, $public_url_2, $label_2),
  ...;
```

`$label` = `setup`, `final`, `step-<N>-visible-error`, `failure-current`, or `runner-error`.

**If upload fails:** retry once. If it still fails, log the storage error in result notes and keep the local file path in the report. The local file is evidence even if cloud upload fails.

After the result row and screenshot rows are written, delete passed-case videos unless `--video` was passed:

```bash
if [ "$status" = "pass" ] && [ "$KEEP_PASS_VIDEOS" != "true" ]; then
  rm -f "$VIDEO_PATH"
  VIDEO_PATH=""
fi
```

### 5.11 — Print case outcome

Print to user: `✅ PASS [<test_number>]` or `❌ FAIL [<test_number>] — <severity> — <one-line summary>`

---

## Step 6 — Failure handling

- **One case failing never stops the run.** On unexpected exception: insert a `fail` result with severity `high`, note the error, stop the recording if active, screenshot current state, continue to next case.
- **If dev server dies mid-run:** mark current case `blocked`, retry health check once, if still down mark remaining cases `blocked`, proceed to Step 7.
- **If auth session is lost:** re-login once (Step 4 again), then continue from current case.
- **If the runner itself errors mid-case:** run finalization before continuing or stopping:
  ```bash
  agent-browser screenshot "$ARTIFACT_ROOT/screenshots/$run_id/<test_number>-runner-error.png" || true
  agent-browser console || true
  agent-browser errors || true
  agent-browser record stop || true
  ```
  Insert a `blocked` result with severity `high`, include cause, detection gap, and prevention step in notes, then continue to the next case when the browser and dev server are healthy.
- **Before closing a failure:** notes must answer: cause, detection gap, prevention step, and "How does this fail loudly next time?"

---

## Step 7 — Finalize run

```sql
update public.test_runs
set notes = 'passed=<P> failed=<F> skipped=<S> blocked=<B> incomplete_evidence=<I> duration=<secs>s'
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
| Incomplete evidence | I |
| **Total** | N   |

Pass rate: **X%**

## Results

| # | Test | Priority | Status | Severity | Evidence |
|---|------|----------|--------|----------|----------|
| 1.1.1 | Create record | HIGH | ✅ pass | — | [final](<url>) |
| 1.1.2 | Reject invalid input | HIGH | ❌ fail | high | [failure-current](<url>) [final](<url>) [video](tests/agent-browser-runs/<run>/recordings/<run_id>/1.1.2.webm) |

## Failures

### <test_number> — <test_name>

- **Expected:** <expected_result>
- **Actual:** <what was observed — quote the screenshot>
- **Severity:** <severity>
- **Cause:** <root cause with evidence, or "unknown from run evidence">
- **Detection gap:** <why this was not caught sooner>
- **Prevention:** <guardrail/test/fix that prevents recurrence>
- **Fails loudly next time:** <what alert/test/assertion will make recurrence obvious>
- **Video:** `tests/agent-browser-runs/<run>/recordings/<run_id>/<test_number>.webm`
- **Screenshots:**
  - Final: <public_url>
  - Current failure state: <public_url or local path>
- **Console errors:** <list or "none">
- **DB assertion:** <query result if applicable>
- **Test data marker:** `E2E-<run_id>-<test_number>` or "not applicable"
- **Remediation hint:** <specific file/line where the fix should go>

(repeat per failure)

## Skipped / Blocked

- **<test_number> — <test_name>:** <reason>

## Test Data

| Marker | Created IDs | Cleanup status |
|--------|-------------|----------------|
| E2E-<run_id>-<test_number> | <ids or none> | <cleaned / retained for debugging / not applicable> |

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

If any earlier step failed, still run Step 7 and Step 9. Do not leave an active recording or browser session open.

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
| Screenshot write fails | Mark case `blocked` severity `high`; do not count as `pass` or `fail` |
| Supabase Storage upload fails | Retry once, then note error in result row and report local evidence path |
| DB assertion fails but UI looked fine | Mark `fail` severity `high`, include both screenshot + SQL output in notes |
| DB assertion would require latest-row query | Stop and derive a marker, created ID, or unique UI value first |
| Supabase MCP unavailable | Fall back to `psql "$SUPABASE_DB_URL" -c '...'` |

---

## Related Skills

- `/test-scenario-run-smoke <tool>` — fast API sweep, run this first
- `/test-scenario-writer <tool> feature` — generates test cases if none exist
- `/test-scenario-run <tool>` — runs smoke then feature in sequence
