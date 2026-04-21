---
name: test-scenario-run-smoke
description: >
  Fast API sweep for an Alleato tool. Discovers all GET endpoints, curls each one,
  flags 500s, and persists results to Supabase. Takes < 30s. No browser required
  for the sweep itself. If any endpoint returns 500, opens agent-browser to screenshot
  the broken page for evidence. Use when: "smoke test X", "quick test X",
  "are X endpoints broken", "check if X API is healthy".
argument-hint: <tool>
---

# test-scenario-run-smoke

## Purpose

Sweep every GET endpoint for a tool in under 30 seconds. The signal is binary: either all routes are healthy (200/401/404) or something is 500-ing. This runs **before** feature testing so you don't waste 10 minutes of browser work when half the API is down.

**This skill covers the API sweep only.** For browser-based feature verification, use `/test-scenario-run-feature`.

---

## Preflight

### 1. Dev server

```bash
curl -sf -o /dev/null http://localhost:3000 || echo "DEV SERVER DOWN"
```

If down, start it:

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run dev > /tmp/nextjs-dev.log 2>&1 &
# Poll until "Ready" or error (max 60s)
for i in $(seq 1 12); do
  grep -q "Ready" /tmp/nextjs-dev.log 2>/dev/null && echo "Server ready" && break
  sleep 5
done
```

### 2. Credentials

```bash
TEST_USER=$(grep '^TEST_USER_1=' .env | cut -d '=' -f2-)
TEST_PASSWORD=$(grep '^TEST_PASSWORD_1=' .env | cut -d '=' -f2-)
test -n "$TEST_USER" || { echo "MISSING TEST_USER_1 in .env"; exit 1; }
```

### 3. Supabase access

Use the Supabase MCP (`mcp__d852572d-*__execute_sql`, project `lgveqfnpkxvzbnnwuled`) for all DB reads/writes. Fall back to `psql "$SUPABASE_DB_URL" -c '...'` if MCP unavailable.

---

## Step 1 — Resolve or create smoke suite

```sql
select id, suite_type, tool_name
from public.test_suites
where tool_name = '<tool>'
  and suite_type = 'smoke';
```

If no rows: create one.

```sql
insert into public.test_suites (tool_name, suite_type, description)
values ('<tool>', 'smoke', 'Auto-generated smoke suite')
returning id;
```

## Step 2 — Create test run

```sql
insert into public.test_runs (suite_id, tester, environment, branch, notes)
values ($suite_id, 'claude-code', 'localhost:3000', $branch, 'smoke sweep')
returning id;
```

`$branch` = output of `git branch --show-current`. Capture `run_id`.

## Step 3 — Discover GET endpoints

```bash
find frontend/src/app/api/projects/\[projectId\]/<tool-slug>/ -name route.ts -type f 2>/dev/null
```

For each `route.ts`, grep for exported HTTP verbs:

```bash
grep -l 'export async function GET' <path>
```

Convert file path to URL: strip `frontend/src/app`, replace `[projectId]` with `67`. Collect all GET endpoint URLs.

Also check for nested routes:

```bash
find frontend/src/app/api/projects/\[projectId\]/<tool-slug>/ -name route.ts | xargs grep -l "export async function GET"
```

## Step 4 — Acquire auth cookie

Open browser **once** for the auth cookie. Export session name before any agent-browser call:

```bash
export AGENT_BROWSER_SESSION="smoke-$run_id"

agent-browser open http://localhost:3000/login --headed
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser fill @<emailInput> "$TEST_USER"
agent-browser fill @<passwordInput> "$TEST_PASSWORD"
agent-browser click @<submitButton>
agent-browser wait --load networkidle
```

Capture cookie for curl:

```bash
COOKIE=$(agent-browser eval 'document.cookie')
```

## Step 5 — Sweep each GET endpoint

For each endpoint URL collected in Step 3:

```bash
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 10 \
  -H "Cookie: $COOKIE" \
  "http://localhost:3000/api/projects/67/<path>")
echo "$STATUS $path"
```

**Verdict rules:**

| Status | Verdict | Why |
|--------|---------|-----|
| 200 | pass | Healthy |
| 401 | pass | Auth-protected, expected |
| 404 | pass | Empty DB or valid not-found |
| 500 | **FAIL** | Server error — needs a screenshot |
| 000 | **FAIL** | Timeout / unreachable |
| other 4xx | pass | Record but not a failure |

### On any FAIL — screenshot the page

Navigate to the corresponding UI page (not the API URL) and screenshot the error state:

```bash
agent-browser open "http://localhost:3000/67/<tool-slug>" --headed
agent-browser wait --load networkidle
SCREENSHOT_PATH="e2e-screenshots/$run_id/api-fail-<endpoint-slug>.png"
mkdir -p "e2e-screenshots/$run_id"
agent-browser screenshot "$SCREENSHOT_PATH"
```

Read the screenshot with the Read tool. Confirm what's visible.

## Step 6 — Upsert synthetic case + record result

```sql
-- Synthetic case (idempotent)
insert into public.test_cases (suite_id, test_number, test_name, category, priority, steps, expected_result)
values ($suite_id, '0.0.0', 'API endpoint sweep', 'smoke', 'HIGH',
        '["Discover GET routes","Curl each endpoint","Verify 200/401/404"]',
        'No 500 or 000 responses on any GET endpoint')
on conflict (suite_id, test_number) do update set test_name = excluded.test_name
returning id;
```

```sql
insert into public.test_results (run_id, case_id, status, severity, notes)
values ($run_id, $case_id, $status, $severity, $notes)
returning id;
```

`$notes` format:
```
swept=12 pass=11 fail=1
FAIL GET /api/projects/67/<tool>/archived → 500
```

`$status`: `pass` if zero fails, `fail` otherwise.
`$severity`: `critical` for any 500, `high` for 000 only.

### If any screenshots were taken, upload and attach them:

Upload to Supabase Storage bucket `test-screenshots` at path `<run_id>/api-sweep/<filename>.png`. Then:

```sql
insert into public.test_screenshots (result_id, storage_path, public_url, label)
values ($result_id, $storage_path, $public_url, 'api-fail-<endpoint>');
```

## Step 7 — Finalize run

```sql
update public.test_runs
set notes = 'swept=<N> pass=<P> fail=<F> duration=<secs>s'
where id = $run_id;
```

## Step 8 — Write report

Path: `docs/testing/results/<tool>-smoke-<YYYYMMDD-HHmmss>.md`

```markdown
# Smoke Test Report: <Tool>

**Run ID:** <run_id>
**Date:** <timestamp>
**Duration:** <secs>s
**Branch:** <branch>

## API Sweep

| Endpoint | Status | Verdict |
|----------|--------|---------|
| GET /api/projects/67/<tool>/... | 200 | ✅ pass |
| GET /api/projects/67/<tool>/... | 500 | ❌ FAIL |

**Swept:** N  **Pass:** P  **Fail:** F

## Failures

### GET /api/... → 500

- **Screenshot:** <public_url or local path>
- **Remediation:** Check server logs for route handler error

## Next Steps

- [ ] Fix failing endpoints above
- [ ] Re-run: `/test-scenario-run-smoke <tool>`
- [ ] Run feature tests: `/test-scenario-run-feature <tool>`
```

Read the report back with the Read tool before reporting done.

## Step 9 — Close browser

```bash
agent-browser close
```

---

## Failure Modes

| Symptom | Action |
|---------|--------|
| No route.ts files found | Check tool slug; report "no routes discovered for `<tool>`" |
| Auth cookie empty | Re-login once; if fails, skip curl (sweep without auth) |
| Supabase MCP unavailable | Fall back to `psql "$SUPABASE_DB_URL"` |
| Screenshot upload fails | Log error in notes; do not block result row insert |

---

## Related Skills

- `/test-scenario-run-feature <tool>` — browser-based feature testing with screenshots + video
- `/test-scenario-writer <tool> smoke` — generates test cases if none exist
- `/test-scenario-run <tool>` — dispatcher that runs smoke then feature
