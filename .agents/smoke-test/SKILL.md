---
name: smoke-test
description: >
  Fast smoke test for any Alleato tool. Hits every API endpoint, loads every page,
  runs HIGH-priority tests from the existing test matrix, validates the database,
  and checks for obvious visual/design regressions.
  Produces a pass/fail report in ~5-10 minutes. Use when: "smoke test [tool]",
  "quick test [tool]", "check if [tool] works", "test [tool] endpoints",
  "is [tool] broken", or any request for a fast sanity check of a tool's functionality.
argument-hint: <tool-name>
---

# Smoke Test

Fast confidence check for any Alleato tool. Answers: "Does it work? Anything broken?"

**Invocation:** `/smoke-test <tool-name>`

**Example:** `/smoke-test drawings`

**Time:** ~5-10 minutes

**Output:** `smoke-test-output/<tool>/report.md` with pass/fail table and failure screenshots

---

## What This Does (and Doesn't)

| Does | Doesn't |
|------|---------|
| Hit every API endpoint, check status codes | Deep Procore compliance comparison |
| Load every page, check for JS errors | Usability recommendations |
| Run HIGH-priority tests from the test matrix | Fix bugs (report only) |
| Validate DB records after create/update | Full field-by-field FK audit |
| Check obvious design regressions (overlap, truncation, broken spacing, hidden controls) | Pixel-perfect visual QA |
| Take screenshots of failures | Record repro videos |

For deeper testing, use `/feature-audit <tool>`.

---

## Phase 1: Context Assembly (~30 seconds)

All context is auto-discovered from conventions. No research sub-agents needed.

### 1.1 Resolve tool paths

```
Tool name: <tool-name>
Test matrix: docs/testing/<tool-name>-test-matrix.md
Scenarios: docs/testing/<tool-name>-scenarios.md
Pages: frontend/src/app/(main)/[projectId]/<tool-name>/
API routes: frontend/src/app/api/projects/[projectId]/<tool-name>/
Hooks: frontend/src/hooks/use-<tool-name>*.ts
Types: frontend/src/types/<tool-name>.types.ts
```

### 1.2 Read the test matrix

```bash
cat docs/testing/<tool-name>-test-matrix.md
```

Extract every row where Priority is HIGH (or where no priority is specified — assume HIGH).
These are your test cases.

### 1.3 Inventory API routes

```bash
find frontend/src/app/api/projects/\[projectId\]/<tool-name>/ -name "route.ts" -type f
```

For each route file, extract the HTTP methods exported (GET, POST, PATCH, PUT, DELETE).

Build a concrete endpoint checklist from route file paths:
- Convert file path to API path under `/api/projects/{projectId}/...`
- Replace dynamic segments with placeholders first:
  - `[recordId]`, `[toolId]`, `[id]` -> `{recordId}`
  - `[...slug]` -> `{slug}`
- Keep one row per method + concrete path pattern

### 1.4 Inventory pages

```bash
find frontend/src/app/\(main\)/\[projectId\]/<tool-name>/ -name "page.tsx" -type f
```

### 1.5 Get project ID and auth

```bash
# Auth credentials
source .env 2>/dev/null || export $(grep -E '^(TEST_USER_1|TEST_PASSWORD_1)=' .env | xargs)
```

### Output

Build an internal checklist (do not write to file yet):

```
API endpoints: [list of method + path]
Pages: [list of page paths]
HIGH-priority tests: [list of test IDs and names from matrix]
```

---

## Phase 2: Setup (~30 seconds)

```bash
mkdir -p smoke-test-output/<tool-name>/screenshots

# Check dev server
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$STATUS" = "000" ]; then
  echo "Dev server not running — starting..."
  cd frontend && npm run dev > /tmp/smoke-dev.log 2>&1 &
  sleep 12
fi

# Start browser session
agent-browser --session smoke-<tool> open http://localhost:3000
agent-browser --session smoke-<tool> wait --load networkidle
```

### Authenticate if redirected

```bash
CURRENT_URL=$(agent-browser --session smoke-<tool> get url)
if [[ "$CURRENT_URL" == *"auth"* || "$CURRENT_URL" == *"login"* ]]; then
  agent-browser --session smoke-<tool> snapshot -i
  agent-browser --session smoke-<tool> fill @<email> "$TEST_USER_1"
  agent-browser --session smoke-<tool> fill @<password> "$TEST_PASSWORD_1"
  agent-browser --session smoke-<tool> click @<submit>
  agent-browser --session smoke-<tool> wait --load networkidle
fi

# Resolve project ID after auth
PROJECT_ID="${SMOKE_PROJECT_ID:-}"
if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID=$(agent-browser --session smoke-<tool> eval '
    (async () => {
      const r = await fetch("/api/projects?limit=1&sort=id&order=asc");
      if (!r.ok) return "";
      const j = await r.json();
      const rows = Array.isArray(j) ? j : (j?.data ?? []);
      return rows?.[0]?.id ? String(rows[0].id) : "";
    })();
  ' | tr -d "\r")
fi
if [ -z "$PROJECT_ID" ]; then
  echo "Unable to resolve PROJECT_ID. Set SMOKE_PROJECT_ID and rerun."
  exit 1
fi

# Navigate to tool page after project resolution
agent-browser --session smoke-<tool> open http://localhost:3000/$PROJECT_ID/<tool-name>
agent-browser --session smoke-<tool> wait --load networkidle
```

---

## Phase 3: API Health Check (~1-2 minutes)

For every API endpoint discovered in Phase 1 (one row per method + path):

```bash
# Example: run one endpoint check inside authenticated browser context
# METHOD and PATH come from your Phase 1 endpoint checklist
METHOD="GET"
PATH="/api/projects/$PROJECT_ID/<tool-name>"

agent-browser --session smoke-<tool> eval '
  (async () => {
    const res = await fetch("'"$PATH"'", { method: "'"$METHOD"'" });
    return JSON.stringify({ method: "'"$METHOD"'", path: "'"$PATH"'", status: res.status });
  })();
'
```

**Expected results:**
- GET (list): 200
- GET (single): 200 (if records exist) or 404 (empty — note but not failure)
- POST: Skip (tested in Phase 5)
- PATCH/PUT: Skip (tested in Phase 5)
- DELETE: Skip (tested in Phase 5)

**Record results:**

| Endpoint | Method | Status | Expected | Verdict |
|----------|--------|--------|----------|---------|
| `/api/projects/{projectId}/<tool>` | GET | 200 | 200 | PASS |

### 3.1 Concrete path resolution for dynamic endpoints

For routes with `{recordId}`:
- Resolve ID from list endpoint first (latest or first row)
- If no record exists yet, mark `GET single` as `SKIPPED (no data)` in Phase 3
- Re-run any skipped `{recordId}` checks after Phase 5 create step using the created ID

Example:

```bash
RECORD_ID=$(agent-browser --session smoke-<tool> eval '
  (async () => {
    const r = await fetch("/api/projects/'"$PROJECT_ID"'/<tool-name>?limit=1");
    if (!r.ok) return "";
    const j = await r.json();
    const rows = Array.isArray(j) ? j : (j?.data ?? []);
    return rows?.[0]?.id ? String(rows[0].id) : "";
  })();
' | tr -d "\r")
```

---

## Phase 4: Page Load Check (~1-2 minutes)

For every page discovered in Phase 1:

```bash
agent-browser --session smoke-<tool> open http://localhost:3000/$PROJECT_ID/<tool-name>/<subpath>
agent-browser --session smoke-<tool> wait --load networkidle
agent-browser --session smoke-<tool> errors
agent-browser --session smoke-<tool> screenshot smoke-test-output/<tool-name>/screenshots/<page-name>.png
```

**Check for each page:**
- Page loads (no blank screen, no 404)
- No uncaught JS errors in console
- Primary content is visible (table, form, viewer, etc.)

If errors found, take an annotated screenshot:

```bash
agent-browser --session smoke-<tool> screenshot --annotate smoke-test-output/<tool-name>/screenshots/<page-name>-error.png
```

**Record results:**

| Page | URL | Loaded | JS Errors | Verdict |
|------|-----|--------|-----------|---------|
| List | /{projectId}/<tool-name> | Yes | None | PASS |
| Viewer | /{projectId}/<tool-name>/viewer/<id> | Yes | None | PASS |

### 4.1 Visual / Design Smoke Check (required)

For each primary page (list/detail/create/edit), confirm:
- No overlapping UI elements
- No clipped/truncated labels or values in core controls
- Buttons/inputs are visible and usable (not hidden by layout issues)
- Form labels map clearly to controls (no detached/misaligned labels)
- No broken spacing that obscures data or actions

If any item fails:
- Mark the page as `PARTIAL` or `FAIL` (depending on severity)
- Capture an annotated screenshot in `screenshots/<page-name>-design.png`
- Add the issue in the report's Failures section with severity

---

## Phase 5: Happy-Path CRUD (~3-5 minutes)

Execute the HIGH-priority CRUD tests from the test matrix. Use `fill` everywhere (fast).
Do NOT record video — this is a smoke test, not a repro session.

### 5.1 Create

Follow the create test from the matrix (typically test 1.1.1 or similar).

```bash
# Navigate to create form / upload dialog
agent-browser --session smoke-<tool> snapshot -i

# Fill ALL editable fields with realistic test data
agent-browser --session smoke-<tool> fill @eN "test value"
# ... fill every editable field on the form:
# required + optional text fields, selects, dates, toggles, notes, and attachments
# (skip only computed/system-managed fields: IDs, timestamps, derived totals)

# Submit
agent-browser --session smoke-<tool> click @eN  # Submit button
agent-browser --session smoke-<tool> wait --load networkidle
sleep 1

# Screenshot the result
agent-browser --session smoke-<tool> screenshot smoke-test-output/<tool-name>/screenshots/create-result.png

# Check for errors
agent-browser --session smoke-<tool> errors
```

### 5.2 Validate DB

After create, verify the record exists with all fields entered in the UI:

```bash
# Use authenticated browser fetch to verify persistence
agent-browser --session smoke-<tool> eval '
  (async () => {
    const r = await fetch("/api/projects/'"$PROJECT_ID"'/<tool-name>?sort=created_at&order=desc&limit=1");
    if (!r.ok) return JSON.stringify({ status: r.status });
    const j = await r.json();
    return JSON.stringify(j);
  })();
'
```

Check:
- Record exists
- All required fields have values (not null)
- Every editable field you filled in the UI persisted correctly
- Values match what was entered in the form (not silently dropped or transformed unexpectedly)

### 5.3 Read / Detail

Navigate to the created record's detail page:

```bash
agent-browser --session smoke-<tool> open http://localhost:3000/$PROJECT_ID/<tool-name>/<id>
agent-browser --session smoke-<tool> wait --load networkidle
agent-browser --session smoke-<tool> screenshot smoke-test-output/<tool-name>/screenshots/detail.png
agent-browser --session smoke-<tool> errors
```

Check: detail page loads with correct data visible.

### 5.4 Edit (if the test matrix has edit tests)

```bash
agent-browser --session smoke-<tool> snapshot -i
# Click Edit
agent-browser --session smoke-<tool> click @eN
agent-browser --session smoke-<tool> wait --load networkidle
agent-browser --session smoke-<tool> snapshot -i

# Verify pre-fill for all editable controls:
# text, textarea, select, date, toggle/checkbox, numeric inputs
# (not just dropdowns)
agent-browser --session smoke-<tool> screenshot smoke-test-output/<tool-name>/screenshots/edit-prefill.png

# Change one field
agent-browser --session smoke-<tool> fill @eN "updated value"
agent-browser --session smoke-<tool> click @eN  # Save
agent-browser --session smoke-<tool> wait --load networkidle
sleep 1

agent-browser --session smoke-<tool> screenshot smoke-test-output/<tool-name>/screenshots/edit-result.png
```

### 5.5 Delete (if the test matrix has delete tests)

```bash
# Find the row action menu for the test record
agent-browser --session smoke-<tool> snapshot -i
agent-browser --session smoke-<tool> click @eN  # Three-dot menu
agent-browser --session smoke-<tool> snapshot -i
agent-browser --session smoke-<tool> click @eN  # Delete option
agent-browser --session smoke-<tool> wait --load networkidle

# Confirm deletion dialog if present
agent-browser --session smoke-<tool> snapshot -i
agent-browser --session smoke-<tool> click @eN  # Confirm
agent-browser --session smoke-<tool> wait --load networkidle
sleep 1

agent-browser --session smoke-<tool> screenshot smoke-test-output/<tool-name>/screenshots/delete-result.png
```

### 5.6 Negative Path (required field validation)

Submit the create form with required fields empty:

```bash
# Open create form
agent-browser --session smoke-<tool> snapshot -i
# Click submit without filling anything
agent-browser --session smoke-<tool> click @eN  # Submit
sleep 1
agent-browser --session smoke-<tool> screenshot smoke-test-output/<tool-name>/screenshots/validation.png
```

Check: validation errors appear inline. No crash. No silent save.

---

## Phase 6: Write Report (~30 seconds)

Copy the template and fill it in:

```bash
cp {SKILL_DIR}/templates/smoke-report-template.md smoke-test-output/<tool-name>/report.md
```

Fill in all results. Read every screenshot taken with the Read tool before finalizing.

**Verdict rules:**
- **PASS:** All API endpoints healthy, all pages load, CRUD works, DB validates
- **FAIL:** Any API returns 5xx, any page crashes, create/edit silently drops data, delete doesn't work, or major layout break blocks core actions
- **PARTIAL:** Minor issues found (e.g., optional field not saving, cosmetic JS warning, non-blocking design defect) but core flows work

---

## Phase 7: Cleanup

```bash
agent-browser --session smoke-<tool> close
```

Present the report summary to the user:
- Overall verdict (PASS / FAIL / PARTIAL)
- Count of endpoints checked, pages loaded, tests run
- Any failures with their screenshots
- If FAIL: which specific tests failed and why

---

## Speed Rules

- **Use `fill` everywhere.** Never `type`.
- **No video recording.** Screenshots only for failures.
- **No research sub-agents.** Read the test matrix directly.
- **No Procore comparison.** That's `/feature-audit` territory.
- **No sleep between fill calls.** Only `sleep 1` after submit/navigation.
- **Batch agent-browser commands** with `&&` when independent.
- **Do not skip optional fields.** Full-form smoke means fill every editable control except computed/system-managed fields.

---

## agent-browser Quick Reference

| Command | Purpose |
|---------|---------|
| `agent-browser --session {S} open {url}` | Navigate |
| `agent-browser --session {S} wait --load networkidle` | Wait for page |
| `agent-browser --session {S} snapshot -i` | Get interactive refs |
| `agent-browser --session {S} snapshot` | Read page content |
| `agent-browser --session {S} click @eN` | Click |
| `agent-browser --session {S} fill @eN "text"` | Fill input (fast) |
| `agent-browser --session {S} select @eN "option"` | Select dropdown |
| `agent-browser --session {S} screenshot {path}` | Screenshot |
| `agent-browser --session {S} screenshot --annotate {path}` | Annotated screenshot |
| `agent-browser --session {S} errors` | JS exceptions |
| `agent-browser --session {S} console` | Console messages |
| `agent-browser --session {S} eval 'js expression'` | Run JS |
| `agent-browser --session {S} close` | End session |
