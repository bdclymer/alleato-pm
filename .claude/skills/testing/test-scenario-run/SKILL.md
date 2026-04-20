---
name: test-scenario-run
description: >
  Run a test suite (smoke, feature, or both) from Supabase against the live dev server using agent-browser.
  Behaves like a careful human tester — navigates, interacts, screenshots every step, asserts the expected
  result, persists pass/fail/skip/blocked results and screenshots back to Supabase, and generates a markdown
  report. Never stops on a single failure. For smoke runs, also sweeps local API endpoints before opening
  the browser for a fast fail signal. Falls back to an ephemeral sweep when no Supabase suite exists yet.
  Use when: "smoke test X", "quick test X", "is X broken", "check if X works", "test X endpoints",
  "run feature tests for X", "run all tests for X".
argument-hint: <tool> [smoke|feature|all] [--case N.N.N] [--priority HIGH|MEDIUM|LOW]
---

# test-scenario-run

## Purpose

Execute a test suite stored in Supabase (`test_suites` → `test_cases`) against the running Next.js app. The DB is the source of truth — **never** read cases from markdown. Each run is recorded in `test_runs`; each case outcome lands in `test_results` with screenshots attached via `test_screenshots`. The output is a markdown report in `docs/testing/results/` plus full rows in the DB that feed the testing dashboard.

## When to Invoke

- `/test-scenario-run <tool>` — smoke suite (default)
- `/test-scenario-run <tool> smoke` — smoke only
- `/test-scenario-run <tool> feature` — feature suite only
- `/test-scenario-run <tool> all` — both smoke and feature (two runs, two reports)
- `/test-scenario-run <tool> --case 1.1.2` — single case (by `test_number`)
- `/test-scenario-run <tool> --priority HIGH` — only HIGH priority cases (also accepts MEDIUM/LOW)

Flags combine: `/test-scenario-run budget feature --priority HIGH`.

## Preflight

### 1. Platform + dev server

```bash
uname -s  # must be Darwin or Linux
curl -sf -o /dev/null http://localhost:3000 || echo "DEV SERVER DOWN"
```

If the dev server is down, start it in the background and wait for "Ready":

```bash
cd frontend && rm -rf .next && npm run dev > /tmp/nextjs-dev.log 2>&1 &
# Poll /tmp/nextjs-dev.log until "Ready" appears (max ~45s)
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
test -n "$TEST_USER" -a -n "$TEST_PASSWORD" || { echo "Missing TEST_USER_1/TEST_PASSWORD_1 in .env"; exit 1; }
```

Never ask the user to log in manually. Never hardcode creds.

### 4. Supabase access

Use the Supabase MCP (`mcp__d852572d-*__execute_sql`, project `lgveqfnpkxvzbnnwuled`) or `psql` with `SUPABASE_DB_URL` from `.env`. All SQL below runs against that project.

## Phase 0 — API Sweep (smoke runs only)

**When:** `suite_type = 'smoke'` only. Skipped entirely for `feature` runs. Never runs against production — `scripts/api-smoke-contracts.mjs` already monitors prod daily via `api-smoke-scheduled.yml` on GitHub Actions.

**Why:** Fast fail signal. If half the tool's API routes are 500-ing on localhost, there is no point opening a browser. Takes 5–15 seconds before any agent-browser work.

### 0.1 Discover routes

```bash
find frontend/src/app/api/projects/\[projectId\]/<tool-slug>/ -name route.ts -type f 2>/dev/null
```

Convert each file path to an endpoint path by stripping `frontend/src/app` and replacing `[projectId]` with `67`. For each route, grep the file for exported HTTP methods (`export async function GET|POST|PATCH|PUT|DELETE`). Only sweep `GET` endpoints in Phase 0 — mutating methods are covered by real test cases in Step 5.

### 0.2 Acquire auth cookie

If the agent-browser session is not yet open, do a one-time login to capture the Supabase session cookie:

```bash
agent-browser open http://localhost:3000/login
agent-browser snapshot -i
agent-browser fill @<emailInput> "$TEST_USER"
agent-browser fill @<passwordInput> "$TEST_PASSWORD"
agent-browser click @<loginButton>
agent-browser wait --load networkidle
COOKIE=$(agent-browser eval 'document.cookie')
```

(This satisfies Step 4 — no need to re-login later.)

### 0.3 Sweep each endpoint

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Cookie: $COOKIE" \
  "http://localhost:3000/api/projects/67/<path>"
```

**Verdict rules (same convention as `scripts/api-smoke-contracts.mjs`):**

| Status | Meaning | Verdict |
|--------|---------|---------|
| 200    | OK                                   | pass |
| 401    | Auth-protected (expected, not a bug) | pass |
| 404    | Resource not found (empty DB ok)     | pass |
| 500    | Server error                         | **fail** |
| 000    | Timeout / unreachable                | **fail** |

Any other 4xx is recorded but counts as pass unless the route's contract says otherwise.

### 0.4 Record as a single aggregated result

Record ONE row in `test_results` per run for the entire API sweep (not one row per endpoint — keeps the dashboard clean). Use a synthetic case identifier `api-sweep` scoped to the current run:

```sql
-- Synthetic case (idempotent: reuse if already present for this suite)
insert into public.test_cases (suite_id, test_number, test_name, category, priority, steps, expected_result)
values ($1, '0.0.0', 'API endpoint sweep', 'smoke', 'HIGH',
        '["Discover routes","Curl each GET endpoint","Verify 200/401/404"]',
        'No 500 or 000 responses on any GET endpoint')
on conflict (suite_id, test_number) do update set test_name = excluded.test_name
returning id;

-- Result row with aggregated notes
insert into public.test_results (run_id, case_id, status, severity, notes)
values ($run_id, $case_id, $status, $severity, $notes)
returning id;
```

Where `$notes` is a compact summary:

```
swept=12 pass=11 fail=1
FAIL GET /api/projects/67/<tool>/archived → 500
```

`$status`: `pass` if zero fails, else `fail`. `$severity`: `critical` if any 500, `high` if only 000 timeouts, else `—`.

### 0.5 Continue

Phase 0 never blocks the run. Even if every endpoint fails, continue into the browser phase so the report captures UI state too. A user fixing a 500 wants to see the matching page behavior.

---

## Phase 0.5 — Filesystem Fallback

**Trigger:** Step 1 returns zero rows from `test_suites`.

Instead of stopping, generate an ephemeral suite from the filesystem. **Do NOT write these cases to Supabase** — they only live for this run.

### 0.5.1 Discover

```bash
# Pages
find frontend/src/app/\(main\)/\[projectId\]/<tool-slug>/ -name page.tsx -type f

# API GET routes (reuse Phase 0 discovery)
find frontend/src/app/api/projects/\[projectId\]/<tool-slug>/ -name route.ts -type f
```

### 0.5.2 Synthesize cases in memory

For each page → one case:
- `test_name`: `"Page loads: /<tool-slug>/<subpath>"`
- `start_url`: `http://localhost:3000/67/<tool-slug>/<subpath>`
- `expected_result`: `"Page renders without JS errors and primary content is visible"`
- `priority`: `HIGH`

For each GET route → one case:
- `test_name`: `"API responds: GET /api/.../<route>"`
- `expected_result`: `"Status 200, 401, or 404 (never 500 or 000)"`
- `priority`: `HIGH`

### 0.5.3 Run them through the same execution pipeline

Phases 0 through 9 below still apply — the only difference is no `test_cases` or `test_results` rows are written. Instead, collect outcomes in memory and include them in the markdown report only.

### 0.5.4 Warn at the end

Surface this at the top of the final report and in the chat summary:

> ⚠️ No smoke suite exists for `<tool>`. Ran ephemeral sweep against discovered pages and routes. To persist these cases and track trends, run `/test-scenario-audit <tool> smoke` to generate a real suite.

---

## Process

### Step 1 — Resolve suite(s)

```sql
select id, suite_type, tool_name
from public.test_suites
where tool_name = $1
  and ($2::text is null or suite_type = $2);
```

If `all`, load both smoke + feature and loop the entire process below per suite (two separate `test_runs` rows, two separate reports).

If no rows: stop with "No test suite found for `<tool>` (`<suite_type>`). Generate cases first with `/test-scenario-writer`."

### Step 2 — Load cases

```sql
select id, test_number, test_name, category, subcategory, priority,
       context_note, setup_steps, steps, expected_result, start_url, status
from public.test_cases
where suite_id = $1
  and ($2::text is null or test_number = $2)        -- --case
  and ($3::text is null or priority = $3)           -- --priority
order by test_number;
```

If 0 cases after filters: stop and report what was filtered out.

### Step 3 — Create test run

```sql
insert into public.test_runs (suite_id, tester, environment, branch, notes)
values ($1, 'claude-code', 'localhost:3000', $2, null)
returning id;
```

`$2` = `git branch --show-current`. Capture the returned `run_id` — it namespaces screenshots and links results.

Record a local start timestamp for duration reporting.

### Step 4 — Open browser once, authenticate once

```
agent-browser open http://localhost:3000/login
agent-browser snapshot -i
agent-browser fill @<emailInput> "$TEST_USER"
agent-browser fill @<passwordInput> "$TEST_PASSWORD"
agent-browser click @<loginButton>
agent-browser wait --load networkidle
```

Verify the redirect landed somewhere authenticated (URL is not `/login`). The Supabase session cookie persists for the rest of the run.

### Step 5 — Execute each case

For every case, in order:

```
mkdir -p e2e-screenshots/<run_id>
```

Then:

1. **Navigate:** `agent-browser open <case.start_url>` (substitute `{projectId}` with `67`).
2. **Wait:** `agent-browser wait --load networkidle`.
3. **Setup steps:** if `case.setup_steps` is non-empty, execute each one as an agent-browser action (snapshot → click/fill → wait). Screenshot to `e2e-screenshots/<run_id>/<test_number>-setup-<n>.png`.
4. **Steps:** iterate `case.steps` in order. For each step N:
   - Re-snapshot before interaction (refs invalidate after navigation/DOM changes).
   - Perform action.
   - `agent-browser wait --load networkidle`.
   - Screenshot: `e2e-screenshots/<run_id>/<test_number>-step-<N>.png`.
   - Read the screenshot with the Read tool and verify visually.
   - Check `agent-browser console` and `agent-browser errors` — any uncaught JS error flips the case to `fail` with severity `high`.
5. **Assert expected result:** take a final snapshot/screenshot and compare the visible UI + URL + any relevant DB state (via SQL) against `case.expected_result`. If the case implies a DB write, query the table to confirm.
6. **Classify outcome:**
   - `pass` — all steps ran, expected result matched, no console errors
   - `fail` — assertion mismatch or JS error; assign severity based on impact (`critical` = blocks core flow, `high` = feature broken, `medium` = partial/cosmetic-functional, `low` = cosmetic)
   - `skip` — prerequisite missing (e.g., no seed data); record why in `notes`
   - `blocked` — upstream case it depends on failed, or app is down
7. **Persist:**

```sql
insert into public.test_results (run_id, case_id, status, severity, notes)
values ($1, $2, $3, $4, $5)
returning id;
```

8. **Upload screenshots** to the `test-screenshots` Supabase Storage bucket under path `<run_id>/<test_number>/<filename>.png`, then:

```sql
insert into public.test_screenshots (result_id, storage_path, public_url, label)
values ($1, $2, $3, $4);
```

`label` = `"step-<N>"` or `"setup-<N>"` or `"final"`.

### Step 6 — Failure handling (non-negotiable)

- **One case failing never stops the run.** Wrap per-case execution in a try/catch. On exception: insert a `fail` result with severity `high`, note the error message, screenshot current state, continue to next case.
- If the dev server dies mid-run: mark the current case `blocked`, retry server health once, if still down mark remaining cases `blocked` and finish reporting.
- If auth session is lost: re-login once, then continue.

### Step 7 — Finalize

Update the run with a summary note:

```sql
update public.test_runs
set notes = $1
where id = $2;
```

Note format: `"passed=X failed=Y skipped=Z blocked=W duration=<secs>s"`.

### Step 8 — Write report

Path: `docs/testing/results/<tool>-<suite_type>-<YYYYMMDD-HHmmss>.md`

See **Report Template** below. Always read the report back with the Read tool before reporting done (Gate 9 — Review Your Own Output).

### Step 9 — Close browser

```
agent-browser close
```

## SQL Snippets (copy-paste ready)

```sql
-- Load suite
select id from public.test_suites where tool_name = $1 and suite_type = $2;

-- Load cases (filter by priority and/or test_number)
select * from public.test_cases
where suite_id = $1
  and ($2::text is null or priority = $2)
  and ($3::text is null or test_number = $3)
order by test_number;

-- Create run
insert into public.test_runs (suite_id, tester, environment, branch, notes)
values ($1, 'claude-code', 'localhost:3000', $2, null)
returning id;

-- Record result
insert into public.test_results (run_id, case_id, status, severity, notes)
values ($1, $2, $3, $4, $5) returning id;

-- Attach screenshot
insert into public.test_screenshots (result_id, storage_path, public_url, label)
values ($1, $2, $3, $4);

-- Finalize run
update public.test_runs set notes = $1 where id = $2;
```

## agent-browser Commands

```
agent-browser open <url>              # Navigate
agent-browser snapshot -i             # Interactive refs (@e1, @e2...)
agent-browser click @eN               # Click by ref
agent-browser fill @eN "text"         # Clear + type
agent-browser select @eN "option"     # Dropdown
agent-browser press Enter             # Key press
agent-browser screenshot <path>       # Save screenshot
agent-browser set viewport W H        # Responsive (375 812 mobile, 1440 900 desktop)
agent-browser wait --load networkidle # Let page settle
agent-browser console                 # JS console dump
agent-browser errors                  # Uncaught exceptions
agent-browser get text @eN            # Element text
agent-browser get url                 # Current URL
agent-browser close                   # End session
```

**Refs invalidate after navigation or DOM mutation.** Always re-snapshot before interacting with a fresh page or after a modal opens/closes.

## Failure Modes (what to do when)

| Symptom | Action |
|---------|--------|
| Dev server returns 500 on `start_url` | Mark case `fail` severity `critical`, screenshot error page, continue |
| Element ref not found after snapshot | Re-snapshot once; if still missing, mark `fail` severity `high`, note "selector not found" |
| Navigation hangs > 30s | `agent-browser close && agent-browser open`; mark case `blocked` if recurs |
| Login redirect fails | Re-run login flow once; if still fails, abort run and write partial report |
| DB assertion fails but UI looked fine | Mark `fail` severity `high`, include both UI screenshot + SQL result in notes |
| Supabase MCP unavailable | Fall back to `psql "$SUPABASE_DB_URL" -c '...'` |
| Screenshot upload fails | Still insert `test_results` row; log storage error in notes; do not block run |

## Report Template

```markdown
# Test Run Report: <Tool> — <Suite Type>

**Run ID:** <run_id>
**Tester:** claude-code
**Environment:** localhost:3000
**Branch:** <branch>
**Started:** <iso timestamp>
**Duration:** <seconds>s

## Summary

| Status   | Count |
|----------|-------|
| Passed   | X     |
| Failed   | Y     |
| Skipped  | Z     |
| Blocked  | W     |
| **Total**| N     |

Pass rate: **P%**

## Results

| # | Test | Priority | Status | Severity | Evidence |
|---|------|----------|--------|----------|----------|
| 1.1.1 | Create budget line item | HIGH | pass | — | [screenshot](<public_url>) |
| 1.1.2 | Reject negative amount | HIGH | fail | high | [screenshot](<public_url>) |
| ... | | | | | |

## Failures

### 1.1.2 — Reject negative amount

- **Expected:** Form shows inline error "Amount must be positive"
- **Actual:** Form submitted successfully; row created in `budget_lines` with `amount = -50`
- **Severity:** high
- **Screenshot:** <public_url>
- **Console errors:** none
- **Remediation hint:** Add Zod `.positive()` on `amount` field in `frontend/src/lib/schemas/budget-line.ts`

(repeat per failure)

## Skipped / Blocked

- **1.2.4 — Attach receipt:** skipped — no seed file available
- **1.3.1 — Approve line item:** blocked — depends on 1.2.4

## Next Steps

- [ ] Fix 1.1.2 (Zod validation)
- [ ] Re-run smoke after fixes: `/test-scenario-run budget smoke`
```

## Reference Table

| Arg | Meaning | Example |
|-----|---------|---------|
| `<tool>` | `test_suites.tool_name` | `budget`, `change-orders`, `commitments` |
| `smoke` \| `feature` \| `all` | Maps to `suite_type` | default = `smoke` |
| `--case N.N.N` | Single `test_number` | `--case 1.1.2` |
| `--priority X` | One of HIGH/MEDIUM/LOW | `--priority HIGH` |

## Related Skills

- `/test-scenario-writer` — generates the `test_cases` rows this skill executes
- `/e2e-test` — broader exploratory journey testing (no Supabase case backing)
- `/verify-feature` — targeted verification with success-criteria file

## Guardrails (why this skill exists)

Before this skill, test runs were executed ad-hoc, results lived in ephemeral terminal output, and regressions were caught only when someone manually re-ran a markdown checklist. This skill enforces:

- DB-backed cases (cannot drift from source of truth)
- Persisted run history (dashboard + trend analysis)
- Screenshot evidence per step (not just final)
- Never-stop-on-failure (one bad case does not hide the rest)
- Machine-readable severities (filters triage)
