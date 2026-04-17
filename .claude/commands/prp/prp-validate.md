---
description: "Final validation gate after prp-execute. Verifies technical correctness AND Procore behavioral compliance with browser evidence — screenshots and video required. PASS only when both dimensions clear."
argument-hint: "<feature-name>"
---

# PRP Validation Gate

## Feature: $ARGUMENTS

## The Two Questions

Every validation must answer **both**:

1. **Does our implementation work as coded?** — TypeScript clean, APIs return data, forms save, DB fields persist
2. **Does our implementation match what Procore actually does?** — right statuses, right field names, right workflow logic

A feature can pass question 1 and fail question 2. That is a product bug.
**Both must pass for PASS status.**

---

## Inputs Required

Before starting, verify these exist:

```bash
ls PRPs/$ARGUMENTS/prp-$ARGUMENTS.md       # Feature spec (from prp-create)
ls PRPs/$ARGUMENTS/TEST-SCENARIOS.md        # Test cases (from prp-test-scenarios)
ls PRPs/$ARGUMENTS/AUDIT.md                 # Gap analysis (from prp-audit)
ls PRPs/$ARGUMENTS/TASKS.md                 # Implementation checklist (from prp-audit)
```

If any are missing, stop and run the missing phase first.

---

## Phase 0: Preflight (~1 min)

### 0.1 Environment check

```bash
# Required env vars
grep -q "NEXT_PUBLIC_SUPABASE_URL" frontend/.env && echo "✅ SUPABASE_URL" || echo "❌ MISSING SUPABASE_URL"
grep -q "SUPABASE_SERVICE_ROLE_KEY" frontend/.env && echo "✅ SERVICE_KEY" || echo "❌ MISSING SERVICE_KEY"
grep -qE "(AI_GATEWAY_API_KEY|OPENAI_API_KEY)" frontend/.env && echo "✅ AI KEY" || echo "❌ MISSING AI KEY"
grep -q "TEST_USER_1" frontend/.env && echo "✅ TEST_USER" || echo "❌ MISSING TEST_USER"

# RAG accessible
node scripts/procore-docs-query.js "procore $ARGUMENTS overview" 2 | head -5
```

If preflight fails → **STOP. Do not continue on assumptions.**

### 0.2 Dev server

```bash
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$STATUS" = "000" ]; then
  echo "Starting dev server..."
  cd frontend && npm run dev > /tmp/validate-dev.log 2>&1 &
  sleep 12
  tail -5 /tmp/validate-dev.log
fi
```

### 0.3 Output directory

```bash
OUTDIR="verify-output/$ARGUMENTS"
mkdir -p $OUTDIR/screenshots $OUTDIR/videos
```

**All screenshots go to:** `verify-output/$ARGUMENTS/screenshots/`
**All videos go to:** `verify-output/$ARGUMENTS/videos/`

---

## Phase 1: Technical Gates (~3 min)

Run all checks. Record results. Do not stop on first failure — capture all.

### 1.1 TASKS.md completion

```bash
TOTAL=$(grep -c "^\- \[" PRPs/$ARGUMENTS/TASKS.md)
DONE=$(grep -c "^\- \[x\]" PRPs/$ARGUMENTS/TASKS.md)
echo "Tasks: $DONE/$TOTAL complete"
```

All tasks must be `[x]`. Any unchecked `[ ]` → **FAIL**.

### 1.2 TypeScript

```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -20
```

TypeScript errors = 0 required.

### 1.3 Lint

```bash
cd frontend && npm run lint 2>&1 | grep -E "error|warning" | tail -20
```

Zero lint errors required (warnings acceptable).

### 1.4 Route conflicts

```bash
cd frontend && npm run check:routes 2>&1
```

No dynamic route conflicts.

### 1.5 TEST-SCENARIOS.md coverage check

Read `PRPs/$ARGUMENTS/TEST-SCENARIOS.md`.

Count scenarios marked "Ready to test" vs "Blocked". Record ratio.
Minimum: ≥ 80% of scenarios must be "Ready to test" (not blocked by missing implementation).

---

## Phase 2: Procore Compliance Check (~5 min)

**Do not skip this for Procore-mirroring features.**

This checks behavioral correctness — does our implementation match what Procore actually does?

### 2.1 RAG spot-check

Run these 3 queries and compare results against the implementation:

```bash
node scripts/procore-docs-query.js "$ARGUMENTS statuses and workflow transitions" 8
node scripts/procore-docs-query.js "$ARGUMENTS required fields create form" 8
node scripts/procore-docs-query.js "$ARGUMENTS list view columns tabs" 8
```

For each query (score ≥ 60%):
- Note what Procore says the field names / statuses / columns should be
- Compare to what's actually in the UI

### 2.2 Manifest spot-check

```bash
# Check if manifest exists for this tool
ls .claude/procore-manifests/$ARGUMENTS/manifest.json 2>/dev/null && echo "Manifest found" || echo "No manifest"
```

If manifest exists, spot-check:
- Are the list view columns in our implementation matching manifest `states.list.columns`?
- Are the form field labels matching manifest `states.create-form.formSections[].fields[].label`?
- Are the status values matching?

### 2.3 Record compliance findings

| Item | Procore Spec | Our Implementation | Match? |
|------|-------------|-------------------|--------|
| Status values | (from RAG) | (from codebase) | ✅/🔴 |
| Required fields | (from RAG) | (from form) | ✅/🔴 |
| List columns | (from manifest) | (from UI) | ✅/🔴 |

Any 🔴 → document as compliance gap. 3+ gaps → **FAIL**.

---

## Phase 3: Define Success Criteria

**🛑 HARD GATE — `verify-output/$ARGUMENTS/success-criteria.md` must exist before Phase 4.**

Write `verify-output/$ARGUMENTS/success-criteria.md` covering every TEST-SCENARIOS.md scenario
that is marked "Ready to test". For each:

```markdown
### Scenario: {name}

**Action:** {what the user does}
**Expected outcome:** {specific observable result — not "it works"}
**DB validation SQL:** {exact query to verify every field saved correctly}
**Field classification:**
  - {field name}: input | derived | read-only | server-generated
  - (derived fields: what they're computed from — don't test by typing a value)
**Pass criteria:** {what distinguishes pass from fail}
```

**The derived field rule:** If a field is calculated server-side, typing a value and
checking it matches is NOT a valid test. Instead, verify the calculation logic is correct
by checking the inputs and the formula. Mark derived fields explicitly.

Do not open the browser until this file exists.

---

## Phase 4: Browser Verification (~15-20 min)

### 4.0 Authenticate

```bash
source frontend/.env 2>/dev/null || export $(grep -E '^(TEST_USER_1|TEST_PASSWORD_1)=' frontend/.env | xargs)
PROJECT_ID=767

agent-browser --session validate-$ARGUMENTS open http://localhost:3000/$PROJECT_ID/$ARGUMENTS
agent-browser --session validate-$ARGUMENTS wait --load networkidle

CURRENT=$(agent-browser --session validate-$ARGUMENTS get url)
if [[ "$CURRENT" == *"auth"* || "$CURRENT" == *"login"* ]]; then
  agent-browser --session validate-$ARGUMENTS snapshot -i
  agent-browser --session validate-$ARGUMENTS fill @<email> "$TEST_USER_1"
  agent-browser --session validate-$ARGUMENTS fill @<password> "$TEST_PASSWORD_1"
  agent-browser --session validate-$ARGUMENTS click @<submit>
  agent-browser --session validate-$ARGUMENTS wait --load networkidle
fi
```

### 4.1 Page load screenshots

For every page in the feature, navigate and capture:

```bash
# List / index page
agent-browser --session validate-$ARGUMENTS open http://localhost:3000/$PROJECT_ID/$ARGUMENTS
agent-browser --session validate-$ARGUMENTS wait --load networkidle
agent-browser --session validate-$ARGUMENTS errors
agent-browser --session validate-$ARGUMENTS screenshot $OUTDIR/screenshots/01-list-view.png

# Detail page (if records exist)
# Navigate to first record
agent-browser --session validate-$ARGUMENTS screenshot $OUTDIR/screenshots/02-detail-view.png

# Create form
agent-browser --session validate-$ARGUMENTS screenshot $OUTDIR/screenshots/03-create-form-empty.png

# Each detail tab (one screenshot per tab)
# agent-browser --session validate-$ARGUMENTS screenshot $OUTDIR/screenshots/04-tab-{name}.png
```

**Read every screenshot with the Read tool immediately after capture.** Describe what you see.
Do not defer screenshot review to the end.

### 4.2 Record video for each major flow

**Video is required.** Use agent-browser recording for every user flow tested.

```bash
# Start recording before each flow
agent-browser --session validate-$ARGUMENTS record start $OUTDIR/videos/{flow-name}.webm

# ... execute the flow ...

# Stop recording after the flow completes
agent-browser --session validate-$ARGUMENTS record stop
```

**Required videos (minimum):**
- `create-happy-path.webm` — create a record with all required fields
- `edit-prefill.webm` — open an existing record for edit, verify all dropdowns pre-populate
- `status-workflow.webm` — at least one status transition (if applicable)
- `validation-errors.webm` — submit form with missing required fields

### 4.3 Happy path: Create

```bash
agent-browser --session validate-$ARGUMENTS record start $OUTDIR/videos/create-happy-path.webm

# Navigate to create
agent-browser --session validate-$ARGUMENTS snapshot -i
agent-browser --session validate-$ARGUMENTS click @<create-button>
agent-browser --session validate-$ARGUMENTS wait --load networkidle
agent-browser --session validate-$ARGUMENTS screenshot $OUTDIR/screenshots/05-create-form-open.png

# Fill ALL required fields (use fill, not type)
agent-browser --session validate-$ARGUMENTS fill @<field> "test value"
# ... fill every field from success-criteria.md ...

# Submit
agent-browser --session validate-$ARGUMENTS click @<submit>
agent-browser --session validate-$ARGUMENTS wait --load networkidle
sleep 1
agent-browser --session validate-$ARGUMENTS errors
agent-browser --session validate-$ARGUMENTS screenshot $OUTDIR/screenshots/06-create-result.png

agent-browser --session validate-$ARGUMENTS record stop
```

**Read the create-result screenshot immediately. Describe what you see.**

#### DB field-level validation after create

```bash
# Verify EVERY field saved correctly — not just that a record exists
source frontend/.env
COOKIE=$(agent-browser --session validate-$ARGUMENTS eval 'document.cookie')
curl -s -H "Cookie: $COOKIE" \
  "http://localhost:3000/api/projects/$PROJECT_ID/$ARGUMENTS?sort=created_at&order=desc&limit=1" | jq .
```

Cross-check each field value against what was entered. Every field in success-criteria.md
must be accounted for. Silent drops (field submitted but not saved) = **Critical bug**.

### 4.4 Edit pre-fill verification

```bash
agent-browser --session validate-$ARGUMENTS record start $OUTDIR/videos/edit-prefill.webm

# Navigate to the record just created
# Click Edit
agent-browser --session validate-$ARGUMENTS snapshot -i
agent-browser --session validate-$ARGUMENTS click @<edit-button>
agent-browser --session validate-$ARGUMENTS wait --load networkidle
agent-browser --session validate-$ARGUMENTS screenshot $OUTDIR/screenshots/07-edit-form-prefill.png

agent-browser --session validate-$ARGUMENTS record stop
```

**Read the prefill screenshot immediately.**

Check: every dropdown/select shows the saved value — NOT "Select..." or a placeholder.
Any dropdown showing a placeholder when it should show a saved value = **Critical bug** (FK mismatch).

### 4.5 Validation errors (negative path)

```bash
agent-browser --session validate-$ARGUMENTS record start $OUTDIR/videos/validation-errors.webm

# Open create form
# Click submit without filling required fields
agent-browser --session validate-$ARGUMENTS click @<submit>
sleep 1
agent-browser --session validate-$ARGUMENTS screenshot $OUTDIR/screenshots/08-validation-errors.png

agent-browser --session validate-$ARGUMENTS record stop
```

**Read the validation screenshot.** All required fields must show inline error messages.
Generic toast only (no field-level errors) = **Major bug**.

### 4.6 Status workflow (if applicable)

```bash
agent-browser --session validate-$ARGUMENTS record start $OUTDIR/videos/status-workflow.webm

# Navigate to a record
# Test each status transition defined in TEST-SCENARIOS.md
# Screenshot after each transition
agent-browser --session validate-$ARGUMENTS screenshot $OUTDIR/screenshots/09-status-{name}.png

agent-browser --session validate-$ARGUMENTS record stop
```

### 4.7 JS error check

After all flows:

```bash
agent-browser --session validate-$ARGUMENTS errors
```

Any uncaught JS errors = document and classify severity.

---

## Phase 5: Evidence Inventory

Before writing the report, verify artifacts exist:

```bash
echo "=== Screenshots ===" && ls -la $OUTDIR/screenshots/
echo "=== Videos ===" && ls -la $OUTDIR/videos/
echo "=== Success criteria ===" && ls -la $OUTDIR/success-criteria.md
```

**Minimum required:**
- [ ] ≥ 4 screenshots (list, create-empty, create-result, edit-prefill)
- [ ] ≥ 4 videos (create, edit-prefill, validation-errors + 1 more)
- [ ] success-criteria.md exists
- [ ] DB validation output captured for create flow

If any are missing → go back and capture them. Do not write the report without evidence.

---

## Phase 6: Validation Report

Write `PRPs/$ARGUMENTS/VALIDATION-REPORT.md`:

```markdown
# $ARGUMENTS — Validation Report

**Date:** {today}
**Feature:** $ARGUMENTS
**Overall Status:** PASS / FAIL
**Validated by:** prp-validate

---

## Technical Gate Results

| Check | Status | Notes |
|-------|--------|-------|
| TASKS.md complete | ✅/❌ | {X}/{total} tasks done |
| TypeScript errors | ✅/❌ | {N errors} |
| Lint errors | ✅/❌ | {N errors} |
| Route conflicts | ✅/❌ | |
| TEST-SCENARIOS coverage | ✅/❌ | {X}% ready to test |

## Procore Compliance Results

| Item | Match? | Notes |
|------|--------|-------|
| Status values | ✅/🔴 | |
| Required fields | ✅/🔴 | |
| List columns | ✅/🔴 | |

## Browser Verification Results

| Flow | Status | Screenshot | Video |
|------|--------|-----------|-------|
| List page loads | ✅/❌ | screenshots/01-list-view.png | — |
| Create happy path | ✅/❌ | screenshots/06-create-result.png | videos/create-happy-path.webm |
| Edit pre-fill | ✅/❌ | screenshots/07-edit-form-prefill.png | videos/edit-prefill.webm |
| Validation errors | ✅/❌ | screenshots/08-validation-errors.png | videos/validation-errors.webm |
| Status workflow | ✅/❌ | screenshots/09-status-*.png | videos/status-workflow.webm |

## DB Field Validation Results

| Field | Expected | Actual | Match? |
|-------|----------|--------|--------|
| {field} | {value} | {value} | ✅/❌ |

## Issues Found

### Critical (blocks PASS)
- {list — FK mismatches, silent data drops, TypeScript errors, JS crashes}

### Major (document but may not block)
- {list — missing field-level validation, wrong labels, partial pre-fill}

### Minor
- {list}

## Evidence Artifacts

| Type | Count | Location |
|------|-------|----------|
| Screenshots | {N} | verify-output/$ARGUMENTS/screenshots/ |
| Videos | {N} | verify-output/$ARGUMENTS/videos/ |
| Success criteria | 1 | verify-output/$ARGUMENTS/success-criteria.md |
| DB validation | 1 | (captured in conversation) |

## Summary

**Confidence score:** {1-10}
**Overall:** PASS / FAIL

{If FAIL}: Return to `/prp:prp-execute $ARGUMENTS`, fix the issues listed under Critical,
then re-run `/prp:prp-validate $ARGUMENTS`.
```

---

## Pass/Fail Rules

**PASS requires ALL of:**
- [ ] All TASKS.md items checked
- [ ] TypeScript errors = 0
- [ ] Lint errors = 0
- [ ] ≥ 80% TEST-SCENARIOS ready to test
- [ ] No Procore compliance gaps (≥ 3 items 🔴)
- [ ] All required screenshots exist and reviewed
- [ ] All required videos exist (minimum 4)
- [ ] DB field validation: all fields save correctly
- [ ] Edit form: all dropdowns pre-fill correctly
- [ ] Validation errors: field-level errors shown for required fields
- [ ] Zero uncaught JS errors

**FAIL if ANY of:**
- Any unchecked TASKS.md item
- Any TypeScript error
- Any Critical issue (silent data drop, FK mismatch, JS crash)
- Missing screenshots or videos
- Edit form shows "Select..." where saved value should appear
- DB validation shows field not saved

**No partial credit. FAIL means back to prp-execute.**
