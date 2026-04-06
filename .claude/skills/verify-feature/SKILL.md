---
name: verify-feature
description: Deeply verify a specific feature works correctly from a real user's perspective — not just technically. Use this immediately after implementing or modifying any feature. Takes a feature name and starting URL. Tests complete user flows, evaluates the QUALITY of outcomes (not just "it didn't error"), validates database records, checks API endpoints, and audits design system compliance. Produces a structured report with annotated screenshots and repro videos for every finding. ALWAYS invoke this after building or changing any UI feature, API route, database operation, or AI/chat capability — even if you think it works.
allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*)
---

# Verify Feature

Verify that a specific feature works correctly from a real user's perspective — end to end, with evidence.

---

## The Core Principle: Outcomes Over Mechanics

**Technical success ≠ user success.**

Before touching the browser, define what "working" actually means for this feature. Then test against that definition — not against whether things threw errors.

| What Claude usually checks | What actually matters |
|---|---|
| Form submitted without error | Every field saved to DB with exact correct values |
| Line items rendered | Line items actually persist — not dropped silently |
| Chat returned a response | Response answers the question with real, specific data |
| List page loaded | Right records shown, in correct order, with correct values |
| Button didn't crash | Something actually happened as a result |

**The budget code failure mode:** A form that "submits successfully" but silently drops a field (like budget code) is a **Critical** bug. The only way to catch it is to verify EVERY field in the DB after every create/update — not just check that a record exists.

---

## Inputs

| Parameter | Required | Example |
|-----------|----------|---------|
| Feature name | Yes | "Direct Costs creation form", "AI project insights chat" |
| Start URL | Yes | `http://localhost:3000/67/direct-costs/new` |
| Expected behavior | Recommended | What "working correctly" looks like — inferred from code if omitted |
| Output directory | No | Defaults to `./verify-output/{feature-slug}/` |
| Session name | No | Defaults to `verify-{feature-slug}` |

Always use `agent-browser` directly — never `npx agent-browser`. The Rust client is significantly faster.

---

## Phase 1: Research (Two Sub-agents in Parallel)

Launch **both sub-agents simultaneously** using the Task tool.

### Sub-agent 1: Feature Behavior & User Flows

> Research the feature **[FEATURE NAME]** in this codebase. Return:
>
> 1. **What it should do** — the complete user-facing behavior for every action and state
> 2. **User flows** — every path a user can take, step by step
> 3. **ALL form fields** — for every form in this feature: EVERY field (required AND optional), the field type (text, select, date, number, file), and the expected DB column it maps to. Do not skip optional fields.
> 4. **ALL sub-features** — embedded line items, attachments/file uploads, linked records, nested forms, tabbed sections. For each: what fields it has, what tables it writes to, what a complete test looks like.
> 5. **Success criteria** — for each flow, a concrete observable outcome with specific values expected
> 6. **Edge cases** — empty states, validation errors, required fields, constraint violations
> 7. **API endpoints** — every backend route this feature calls (method, path, expected response shape)
> 8. **Relevant files** — components, hooks, API routes, services with their full paths
> 9. **For AI features** — data sources queried, context injected, what a good response looks like vs. failure

### Sub-agent 2: Database Schema & Validation Queries

> Research the database for **[FEATURE NAME]** in this codebase. Return:
>
> 1. **Tables touched** — every table read or written, with ALL relevant columns and types
> 2. **Complete data flows** — for each user action (including sub-features like adding a line item), exactly what records are created/updated/deleted, which columns are set, and what their correct values should be
> 3. **Field-level validation queries** — for each form submit, write SQL that checks EVERY field (not just a few). The query must return all columns so we can verify nothing was silently dropped.
> 4. **Sub-feature validation queries** — separate queries for line items, attachments, linked records — verify each saves correctly
> 5. **Design system audit targets** — specific source files to check for design violations
> 6. **Design components expected** — which ds/ components should appear in this feature's UI

Wait for both sub-agents to complete before continuing.

---

## Phase 2: Define Success Criteria Before Testing

> 🛑 **HARD GATE — ENFORCED BY HOOK (3 GATES)**
>
> `.claude/hooks/verify-feature-gate.py` enforces three gates with exit code 2:
>
> - **GATE 1:** `agent-browser` blocked until `verify-output/<feature>/success-criteria.md` exists (Phase 2)
> - **GATE 2:** writing `verify-output/<feature>/report.md` blocked until `videos/` contains ≥1 `.webm` (Phase 4 recording)
> - **GATE 3:** writing `report.md` blocked until every `.png` in `screenshots/` has been opened with the Read tool (Phase 4e screenshot review)
>
> Do not attempt to skip these. They will stop you and you will lose time.
> All three exist because each was added after a specific failure on the
> change-events verification on 2026-04-06.

**Write `verify-output/{feature-slug}/success-criteria.md` before opening the browser.** This is a required deliverable, not a suggestion.

The file must contain, for each user flow AND for every form field:

### Per flow
- **Action**: What the user does (including sub-actions like "add a line item with budget code X")
- **Expected outcome**: Specific, observable result
- **DB check**: Exact SQL that verifies EVERY field that should have been saved
- **Quality bar**: What distinguishes pass from fail

### Per form field — explicitly classify each one
- **Type**: User input vs. **derived/calculated** vs. **read-only display** vs. server-generated (auto number, timestamp, etc.)
- **Source of truth**: If derived, what is it computed from? (e.g., "non_committed_cost = budget_line.committed_cost - sum(line_item_actuals)")
- **Editable in UI?**: Yes / No / Conditionally
- **Expected DB value**: For your test data, what should land in the DB column?

> ⚠️ **The non-committed-cost lesson (2026-04-06):**
> Non-committed cost on change events is a *derived* field, not user input.
> A previous verification run skipped this classification, typed `0` into
> the field, then labeled the resulting `9500` as "Critical silent data
> corruption" in a formal report. It wasn't a bug. The system was working
> correctly. The lesson: **a value not matching what you typed is only a
> bug if the field was supposed to be user-editable in the first place.**
> Classify every field BEFORE you test it.

If you don't know whether a field is input or derived, **stop and find out**:
1. Read the form component source
2. Read the API route that handles the POST/PATCH
3. Check `.claude/procore-manifests/{tool-slug}/manifest.json` if it exists
4. Spawn a research sub-agent if needed

Do not guess. Do not "test and see what happens." Document expected behavior first.

The research phase from Phase 1 should have returned a complete field inventory. Use it to build an explicit checklist for Phase 4.

---

## Phase 3: Environment Setup

### Check dev server
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

If not running:
```bash
cd frontend && npm run dev > /tmp/verify-dev.log 2>&1 &
sleep 10
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

### Initialize session and output directory
```bash
mkdir -p {OUTPUT_DIR}/screenshots {OUTPUT_DIR}/videos
agent-browser --session {SESSION} open {START_URL}
agent-browser --session {SESSION} wait --load networkidle
```

### Authenticate
```bash
TEST_USER=$(grep TEST_USER_1 .env | cut -d '=' -f2)
TEST_PASSWORD=$(grep TEST_PASSWORD_1 .env | cut -d '=' -f2)
CURRENT_URL=$(agent-browser --session {SESSION} get url)
```

If redirected to login:
```bash
agent-browser --session {SESSION} snapshot -i
agent-browser --session {SESSION} fill @emailInput "$TEST_USER"
agent-browser --session {SESSION} fill @passwordInput "$TEST_PASSWORD"
agent-browser --session {SESSION} click @submitButton
agent-browser --session {SESSION} wait --load networkidle
```

---

## Phase 4: Test Each User Flow

### Speed rule (critical)

**Use `fill` everywhere. Never use `type` in the main testing flow.**

`type` simulates character-by-character input, which makes everything 10–50x slower. It is only acceptable inside repro videos for a specific bug where the typing behavior itself is part of the issue. For all other testing — including recording the main flow video — use `fill`.

Sleep calls exist for video watchability, not for waiting. Use them sparingly:
- Between major steps (click → result): `sleep 1`
- After a page-level navigation: `sleep 1`
- Before a final result screenshot: `sleep 1`
- Do NOT add sleep before or after every single `fill` call

### 4a. Form Discovery — Do This First

**Before filling any form fields, inventory what the form contains.**

Navigate to the form, then scroll through it completely and take a full-page screenshot:

```bash
agent-browser --session {SESSION} open {FORM_URL}
agent-browser --session {SESSION} wait --load networkidle
agent-browser --session {SESSION} screenshot --full {OUTPUT_DIR}/screenshots/{flow}-form-discovery.png
agent-browser --session {SESSION} snapshot -i
```

Scroll down to reveal any fields below the fold:
```bash
agent-browser --session {SESSION} scroll down 500
agent-browser --session {SESSION} screenshot --full {OUTPUT_DIR}/screenshots/{flow}-form-discovery-scrolled.png
agent-browser --session {SESSION} snapshot -i
```

From the snapshot and screenshots, build your complete field checklist:
- Every visible input field (required and optional)
- Every dropdown/select
- Every date picker
- Every file upload / attachment area
- Every "Add line item" / nested record section
- Every tab that has a form inside it

**Do not skip fields.** If the form has 12 fields and you only fill 3, the test is invalid.

### 4b. Execute the Flow

Start recording, then fill fields at speed using `fill`:

```bash
agent-browser --session {SESSION} record start {OUTPUT_DIR}/videos/{flow}.webm

agent-browser --session {SESSION} snapshot -i
agent-browser --session {SESSION} fill @e1 "{realistic value}"
agent-browser --session {SESSION} fill @e2 "{realistic value}"
agent-browser --session {SESSION} select @e3 "Option Name"
# ... fill EVERY field from the checklist
sleep 1
agent-browser --session {SESSION} screenshot {OUTPUT_DIR}/screenshots/{flow}-filled.png
```

**Use realistic test data:**
- Names: "Vermillion Rise Warehouse - Foundation Phase 2"
- Vendors: "Summit Concrete Contractors LLC"
- Amounts: "47250.00"
- Budget codes: real cost codes from the project (query from DB if needed)
- Descriptions: "Concrete foundation pour for north building section"
- Dates: real project-relevant dates (not "2024-01-01")

### 4c. Sub-features Are Mandatory

If the feature has line items, attachments, linked records, or any embedded sub-form — **you must test them**. These are not optional.

For each sub-feature:

**Line items:**
```bash
# Click "Add line item" or equivalent
agent-browser --session {SESSION} snapshot -i
agent-browser --session {SESSION} click @eN  # the Add button
agent-browser --session {SESSION} snapshot -i  # refs changed — re-snapshot
# Fill ALL line item fields including budget code, description, quantity, unit cost
agent-browser --session {SESSION} fill @eN "{budget code}"
agent-browser --session {SESSION} fill @eN "{description}"
agent-browser --session {SESSION} fill @eN "{quantity}"
agent-browser --session {SESSION} fill @eN "{unit cost}"
sleep 1
agent-browser --session {SESSION} screenshot {OUTPUT_DIR}/screenshots/{flow}-line-item-filled.png
```

**Attachments:**
```bash
# Create a test file
echo "test content for verification" > /tmp/test-attachment.txt
# Upload it
agent-browser --session {SESSION} snapshot -i
# Find the file input and upload
agent-browser --session {SESSION} find role "button" click --name "Add Attachment"
# or: agent-browser --session {SESSION} eval --stdin <<'EOF'
# document.querySelector('input[type="file"]').click()
# EOF
```

**After adding sub-features, take a screenshot showing them filled:**
```bash
agent-browser --session {SESSION} screenshot {OUTPUT_DIR}/screenshots/{flow}-with-sub-features.png
```

### 4d. Submit and Capture Result

```bash
agent-browser --session {SESSION} snapshot -i
agent-browser --session {SESSION} click @eN  # Submit button
agent-browser --session {SESSION} wait --load networkidle
sleep 1
agent-browser --session {SESSION} screenshot --annotate {OUTPUT_DIR}/screenshots/{flow}-result.png
agent-browser --session {SESSION} record stop
```

### 4e. Evaluate the Outcome

Read the result screenshot. Compare against pre-defined success criteria.

Ask:
- Were you redirected to the right place?
- Is the created record visible with correct values?
- Do any fields show wrong data or appear blank?
- Are sub-features (line items, attachments) visible in the result?

```bash
agent-browser --session {SESSION} errors
agent-browser --session {SESSION} console
```

### 4f. Validate the Database — Every Field

After any create, update, or delete, verify EVERY field in the DB. Do not spot-check — verify all of them.

```sql
-- Example: verify ALL columns, not just a few
SELECT
  id, project_id, vendor_name, amount, description,
  budget_code_id, status, date, approved_by,
  created_at, updated_at
FROM direct_costs
WHERE project_id = {projectId}
ORDER BY created_at DESC
LIMIT 1;
```

Then for each sub-feature:
```sql
-- Verify line items saved correctly
SELECT id, parent_id, budget_code_id, description, quantity, unit_cost, total
FROM direct_cost_line_items
WHERE direct_cost_id = '{id from above}';

-- If budget_code_id is NULL when you entered one → CRITICAL bug
-- If quantity or unit_cost is NULL → CRITICAL bug
```

Verify:
- Every field that was filled matches the value entered in the UI exactly
- No field was silently dropped (null when it should have a value)
- Sub-feature records exist and have correct values
- No duplicates

### 4g. Check API Endpoints

For the primary create/read/update/delete endpoints:

```bash
COOKIE=$(agent-browser --session {SESSION} eval 'document.cookie' 2>/dev/null)

curl -s "http://localhost:3000/api/projects/{projectId}/{endpoint}" \
  -H "Cookie: $COOKIE" | jq .
```

Verify: correct status code, response contains the data that was saved, sub-features are included.

---

## Phase 5: Design System Audit

### Visual check

```bash
agent-browser --session {SESSION} open {START_URL}
agent-browser --session {SESSION} wait --load networkidle
agent-browser --session {SESSION} screenshot --annotate {OUTPUT_DIR}/screenshots/design-desktop.png
agent-browser --session {SESSION} screenshot --full {OUTPUT_DIR}/screenshots/design-fullpage.png

# Mobile
agent-browser --session {SESSION} set viewport 375 812
agent-browser --session {SESSION} screenshot {OUTPUT_DIR}/screenshots/design-mobile.png
agent-browser --session {SESSION} set viewport 1440 900
```

Check visually:
- [ ] `ProjectPageHeader` + `PageContainer` pattern — not a custom header
- [ ] Tables use `DataTable` from `@/components/ds/`
- [ ] Status uses `StatusBadge`, `StatusDot`, or `StatusText`
- [ ] Empty states use `EmptyState` from `@/components/ds/`
- [ ] No horizontal overflow on mobile
- [ ] No obvious off-brand colors

### Code audit

```bash
# Hardcoded colors
grep -n "bg-gray\|text-gray\|bg-white\|border-gray\|bg-blue-\|#[0-9a-fA-F]\{3,6\}" {FEATURE_FILES}

# Arbitrary spacing
grep -n "p-\[.*\]\|m-\[.*\]\|gap-\[.*\]\|p-7\|p-9\|p-11" {FEATURE_FILES}

# Deprecated page patterns
grep -n "ProjectToolPage\|DataTablePage\|PageHeader\b" {FEATURE_FILES}

# Forbidden shadows
grep -n "shadow-md\|shadow-lg\|shadow-xl" {FEATURE_FILES}

# Chat UI violations
grep -n "Bot\b\|Robot\b\|Minimize2\b" {FEATURE_FILES}
```

---

## Phase 6: Document Findings

Write each finding immediately — never batch for later.

**Severity:**

| Level | When |
|-------|------|
| **Critical** | Data silently dropped (field saves as NULL when user entered a value), feature broken, data loss |
| **High** | Core flow produces wrong outcome, DB record missing or incorrect, sub-feature doesn't persist |
| **Medium** | Non-critical path broken, minor data issues, usability problem |
| **Low** | Visual polish, minor design violations |

**Interactive/behavioral issues** → repro video + screenshots:
```bash
agent-browser --session {SESSION} record start {OUTPUT_DIR}/videos/issue-{NNN}-repro.webm
# Reproduce at normal speed using fill (not type)
sleep 1
agent-browser --session {SESSION} screenshot {OUTPUT_DIR}/screenshots/issue-{NNN}-step-1.png
sleep 1
agent-browser --session {SESSION} click @eN
sleep 1
agent-browser --session {SESSION} screenshot --annotate {OUTPUT_DIR}/screenshots/issue-{NNN}-result.png
agent-browser --session {SESSION} record stop
```

**Static/visible issues** → single annotated screenshot only. No video needed.

---

## Phase 7: Fix & Re-verify Critical and High Issues

For each Critical or High finding:

1. Read the relevant source files to understand the root cause
2. Fix the issue with minimal, targeted changes
3. Re-run the full failing flow end to end
4. Take a new screenshot and/or video confirming the fix
5. Append to the report: mark FIXED with root cause and change made

---

## Phase 8: Wrap Up

```bash
agent-browser --session {SESSION} close
```

---

## Phase 9: Write the Report

Save to `{OUTPUT_DIR}/report.md`:

```markdown
# Feature Verification: {FEATURE NAME}

**Date:** {date}
**Feature URL:** {start URL}
**Status:** ✅ PASS / ❌ FAIL / ⚠️ PARTIAL PASS

---

## Summary

| Check | Result |
|-------|--------|
| User Flows | {N}/{total} producing correct outcomes |
| Sub-features Tested | {list: line items, attachments, etc.} |
| Database Validation | {N}/{total} fields verified correct |
| API Health | {N}/{total} endpoints healthy |
| Design System | Passes all critical checks · {N} violations |
| Issues Found | {critical} critical · {high} high · {medium} medium · {low} low |
| Issues Fixed | {N} fixed during this session |

---

## Field Coverage

List every form field that was tested and whether its saved value was verified in the DB.

| Field | Value Entered | DB Value | Match |
|-------|--------------|----------|-------|
| {field} | {entered} | {db value} | ✅ / ❌ |

---

## Sub-features Tested

| Sub-feature | Tested | Result |
|-------------|--------|--------|
| Line items | ✅ / ❌ | {outcome} |
| Attachments | ✅ / ❌ | {outcome} |

---

## Flow Results

### {Flow Name}

**Expected:** {specific outcome}
**Actual:** {what happened}
**Verdict:** ✅ PASS / ❌ FAIL

**Screenshots:**

![Form discovery]({path})
![Form filled]({path})
![Result]({path})

**Video:** [Watch flow]({path})

---

## Database Validation

| Field | Query | DB Value | Verdict |
|-------|-------|----------|---------|
| {field} | `SELECT {col} FROM ...` | {value} | ✅ / ❌ |

---

## Issues

### ISSUE-001 — {Title} — {CRITICAL/HIGH/MEDIUM/LOW} — {FIXED/OPEN}

**What should happen:** {expected user outcome}
**What actually happened:** {actual result}
**Why this matters:** {user impact}

**Repro steps:**

1. {Step}

   ![Step 1]({path})

2. {Step}

   ![Step 2]({path})

3. {Outcome visible}

   ![Result]({path})

**Video:** [Watch repro]({path})

**Root cause:** {if fixed}
**Fix applied:** {file:line}

---

## Recommendations

{Prioritized list}
```

---

## agent-browser Quick Reference

**Core loop:** `open` → `wait --load networkidle` → `snapshot -i` → interact → `screenshot` → re-snapshot after page changes

| Command | Purpose |
|---------|---------|
| `agent-browser --session {S} open {url}` | Navigate to URL |
| `agent-browser --session {S} wait --load networkidle` | Wait for page to fully settle |
| `agent-browser --session {S} snapshot -i` | Get interactive element refs (@e1, @e2…) |
| `agent-browser --session {S} snapshot` | Read page content (text, data, headings) |
| `agent-browser --session {S} click @eN` | Click element |
| `agent-browser --session {S} fill @eN "text"` | Clear + type instantly — **use this everywhere** |
| `agent-browser --session {S} select @eN "option"` | Select dropdown option |
| `agent-browser --session {S} press Enter` | Press keyboard key |
| `agent-browser --session {S} get url` | Get current URL |
| `agent-browser --session {S} get text @eN` | Get text from specific element |
| `agent-browser --session {S} screenshot {path}` | Save screenshot |
| `agent-browser --session {S} screenshot --annotate {path}` | Screenshot with numbered element labels |
| `agent-browser --session {S} screenshot --full {path}` | Full-page screenshot |
| `agent-browser --session {S} scroll down 500` | Scroll the page |
| `agent-browser --session {S} set viewport 375 812` | Mobile viewport |
| `agent-browser --session {S} set viewport 1440 900` | Desktop viewport |
| `agent-browser --session {S} record start {path.webm}` | Start video recording |
| `agent-browser --session {S} record stop` | Stop video recording |
| `agent-browser --session {S} errors` | List uncaught JS exceptions |
| `agent-browser --session {S} console` | List browser console messages |
| `agent-browser --session {S} close` | End session and free resources |

**Speed:** Use `fill` everywhere. Never use `type` unless the bug being reproduced is specifically about keystroke behavior. `type` is 10–50x slower and adds no value for QA.

**Sleeps:** Only add `sleep 1` between major steps (navigation, form submit, modal open/close). Do NOT add sleep before or after individual `fill` calls.

**Refs rule:** @e1, @e2… are invalidated after navigation, form submissions, or dynamic content changes. Always re-snapshot after the page changes.

**Two snapshot modes:**
- `snapshot -i` → finds clickable/fillable elements
- `snapshot` → reads page content (text, headings, data values)
