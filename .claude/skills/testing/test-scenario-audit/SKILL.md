---
name: test-scenario-audit
description: >
  (Re)generate high-quality test suites for an Alleato tool — producing BOTH a
  smoke suite (critical-path, 5–15 cases) AND a feature suite (consolidated CRUD
  + workflow coverage, 20–40 cases). Writes to Supabase and emits two markdown
  files per tool. Use when: "audit test scenarios for [tool]", "regenerate test
  suites for [tool]", "write smoke + feature tests for [tool]".
argument-hint: <tool> [smoke|feature|all]
---

# Test Scenario Audit

Generate two complementary test suites for a given Alleato tool:

- **Smoke suite** — 5–15 cases. Critical-path only. If any fail, the tool is broken.
- **Feature suite** — 20–40 aggressively consolidated cases. Full CRUD + workflow coverage.

Both are seeded into Supabase (`test_suites` + `test_cases`) AND written to
markdown files for human review.

**Invocation:**
- `/test-scenario-audit <tool>` — regenerate both suites (default)
- `/test-scenario-audit <tool> smoke` — regenerate smoke only
- `/test-scenario-audit <tool> feature` — regenerate feature only
- `/test-scenario-audit <tool> all` — same as default

**Examples:**
- `/test-scenario-audit change-events`
- `/test-scenario-audit budget smoke`
- `/test-scenario-audit rfis feature`

---

## Schema reference

As of the 2026-04-20 cleanup migration:

- `test_suites` has a `suite_type` column: `'smoke'` or `'feature'`.
- Unique constraint is `(tool_name, suite_type)` — one smoke suite AND one
  feature suite can coexist per tool.
- `test_cases` columns: `id`, `suite_id`, `test_number`, `category`, `subcategory`,
  `test_name`, `context_note`, `setup_steps`, `steps`, `expected_result`,
  `priority`, `test_type`, `start_url`. **Do NOT reference** dropped legacy columns
  (`tool`, `tool_name`, `status`, `gap_type`, `procore_feature_id`,
  `source_article_id`, `source_chunk_id`, `source_url`, `source_manifest_path`).
- `test_runs.scenario_depth` **no longer exists**.
- Existing test data has been wiped; re-running this skill is the canonical seed.

---

## Inputs

| Input | Value |
|-------|-------|
| Tool slug | e.g. `change-events`, `budget`, `rfis` |
| Mode | `smoke` \| `feature` \| `all` (default `all`) |
| Supabase project | `lgveqfnpkxvzbnnwuled` |
| Test project ID | `67` — "Vermillion Rise Warehouse" |
| Test user | `test1@mail.com` / `test12026!!!` |

Valid tool slugs come from `procore_tools.slug` — examples: `budget`,
`commitments`, `submittals`, `change-events`, `change-orders`, `direct-costs`,
`prime-contracts`, `rfis`, `meetings`, `punch-list`, `documents`, `invoices`,
`directory`, `daily-log`, `schedule`, `drawings`, `specifications`, `photos`,
`project-lifecycle`.

---

## Process

### Step 1 — Research

Read in parallel:

1. `frontend/src/app/(main)/[projectId]/<tool>/` — pages, tabs, primary actions
2. `frontend/src/app/api/projects/[projectId]/<tool>/` — routes (reveals CRUD)
3. `docs/PRPs/<tool>/` — product requirements (if exists)
4. `.claude/procore-manifests/<tool>/manifest.json` — Procore field parity
5. Supabase `support_articles` + `support_article_chunks` filtered by tool name,
   for status/workflow/permission details

From these, extract:

- Page layout (list view, detail view, tabs)
- Primary create/add action (button name + destination form/dialog)
- Every editable field + its validation rules
- Every status value + valid transitions
- Every filter, search field, bulk action, export
- Permission gates (read-only, admin-only, no-access)

### Step 2 — Generate the smoke suite (if requested)

**Target count: 5–15 cases.** Each case answers "is this page even working?"

**What belongs in smoke:**

| Check | Example |
|-------|---------|
| Page loads | `/67/<tool>` renders without error, no 500 in network |
| Table renders | Correct columns present, rows visible OR empty state shown |
| Primary create opens | Click "New X" button → correct form/dialog appears |
| Search works | Type a known value → list filters |
| Filters apply | Pick a status filter → list narrows |
| Tab switching | Each tab loads without error (if detail view has tabs) |
| Empty state | Filter to nothing → empty state renders |

**What does NOT belong in smoke:** edit flows, delete flows, approvals, status
transitions, validation errors, bulk actions, exports, permissions. Those go in
the feature suite.

**Steps:** 1–3 lines per case. Happy path only.
**Priority:** mostly `HIGH` (smoke failure = page is broken).

### Step 3 — Generate the feature suite (if requested)

**Target count: 20–40 cases, aggressively consolidated.**

Consolidation rules — write ONE case, not many:

- **One happy-path create** — covers all required fields in a single case
- **One validation-errors case** — missing required field + one invalid input
- **One edit case** — edit all editable fields in a single case
- **One delete case** — delete with no constraints (plus one delete-blocked case if FK constraints exist)
- **One status-transition case per flow** — not one per status value
- **One filter case, one search case, one bulk-action case** — unless behavior diverges materially

Coverage the feature suite MUST include:

- CRUD (create, read, edit, delete)
- Status transitions (approval/rejection/workflow)
- Calculations (if the tool computes totals/forecasts/variances)
- Filters + search + column sort
- Bulk actions (select-all, bulk delete/edit)
- Permissions (read-only user blocked, admin-only features hidden)
- Edge cases (duplicate detection, max length, invalid input)

**Steps:** 2–6 plain-English steps per case, with specific values
("Type **100** in Quantity", not "enter a number").
**Priority:** `HIGH` (CRUD, status, calculations), `MEDIUM` (filters, exports,
permissions), `LOW` (edge cases, cosmetic).

### Step 4 — Write each case

For each case, produce:

```
test_number : "1.1", "1.2", "2.1", etc. (category.sequence)
category    : Navigation / Create / Edit / Delete / Status / Filters / Permissions / Edge
subcategory : Specific feature ("Required field validation")
test_name   : Short imperative ("Submitting without Description shows an error")
context_note: One plain-English sentence. What + why, no jargon.
setup_steps : (optional) Bullet points — what must be true before starting.
steps       : Numbered steps. Start with verbs (Click, Type, Select, Open).
              Use specific values. Name buttons exactly as shown.
              After save: "Wait for the page to stop loading."
expected_result: 1–3 sentences. Specific visible text, numeric changes, what
                 should NOT appear. For persistence: "After refresh, value still shown."
priority    : HIGH | MEDIUM | LOW
test_type   : 'scenario'
start_url   : Relative path, e.g. '/67/change-events'
```

**Note:** `tool_name` and `status` are stored on `test_suites`, NOT on `test_cases`.
The `test_cases.tool_name` and `test_cases.status` columns were dropped in the
2026-04-20 cleanup migration. Do not reference them.

### Step 5 — Seed into Supabase

Use MCP `mcp__d852572d-a476-4d43-a979-8f9f833c8c34__execute_sql` against project
`lgveqfnpkxvzbnnwuled`. Run per suite type:

```sql
-- 5a. Upsert the suite, get its id
insert into public.test_suites (tool_name, suite_type, display_name, total_cases)
values ('<tool>', '<smoke|feature>', '<Display Name> — <Smoke|Feature>', 0)
on conflict (tool_name, suite_type) do update set
  display_name      = excluded.display_name,
  last_generated_at = now()
returning id;
```

```sql
-- 5b. Wipe existing cases so re-runs are clean
delete from public.test_cases where suite_id = <suite_id>;
```

```sql
-- 5c. Insert all cases for this suite
insert into public.test_cases
  (suite_id, test_number, category, subcategory, test_name,
   context_note, setup_steps, steps, expected_result, priority,
   test_type, start_url)
values
  (<suite_id>, '1.1', 'Navigation', 'Page load',
   'Open the <tool> page',
   'Checks the page renders without errors.',
   null,
   E'1. Log in as test1@mail.com\n2. Click "<Tool>" in the left sidebar of project "Vermillion Rise Warehouse"',
   'The page loads fully and the table is visible (or an empty state).',
   'HIGH', 'scenario', '/67/<tool>'),
  -- ...more cases
;
```

```sql
-- 5d. Update total_cases on the suite
update public.test_suites
   set total_cases = (select count(*) from public.test_cases where suite_id = <suite_id>)
 where id = <suite_id>;
```

```sql
-- 5e. Verify
select ts.tool_name, ts.suite_type, ts.total_cases, count(tc.id) as seeded
from public.test_suites ts
left join public.test_cases tc on tc.suite_id = ts.id
where ts.tool_name = '<tool>'
group by ts.tool_name, ts.suite_type, ts.total_cases
order by ts.suite_type;
```

### Step 6 — Save migration SQL

Persist the full SQL per suite to:

```
supabase/migrations/20260420HHMMSS_seed_<tool>_smoke_scenarios.sql
supabase/migrations/20260420HHMMSS_seed_<tool>_feature_scenarios.sql
```

Use the actual current timestamp. One file per suite type that was generated.

### Step 7 — Write consolidated markdown output

Write **one** file per tool to `docs/testing/scenarios/<tool>.md` containing BOTH
suites. The file structure is:

1. **Quick Reference** — a single scannable section at the TOP listing every case
   from both suites. This lets a reader see all 40+ cases without scrolling past
   any detail blocks.
2. **Smoke — Detail** — full case writeups for the smoke suite only.
3. **Feature — Detail** — full case writeups for the feature suite only.

```markdown
# <Tool Display Name> — Test Scenarios

_Auto-generated by `/test-scenario-audit`. Do not edit by hand._

**Supabase project:** `lgveqfnpkxvzbnnwuled` · **Test project:** 67 (Vermillion Rise Warehouse) · **User:** test1@mail.com

---

## Quick Reference

### Smoke — 5 cases · Critical path

| # | Test | Priority |
|---|------|----------|
| 1.1 | Open the <tool> page | HIGH |
| 1.2 | Table shows expected columns | HIGH |
| ... | ... | ... |

### Feature — 30 cases · Full coverage

| # | Test | Priority |
|---|------|----------|
| 1.1 | Create a <record> with all fields filled | HIGH |
| 1.2 | Submitting without a required field shows a validation error | HIGH |
| ... | ... | ... |

---

## Smoke — Detail

Critical-path only. If any of these fail, the tool is broken.

### 1.1 — Open the <tool> page

**Context.** Checks the page renders without errors.
**Priority.** HIGH
**Start URL.** `/67/<tool>`

**Setup.**
- Logged in as test1@mail.com.

**Steps.**
1. Click "<Tool>" in the left sidebar of project "Vermillion Rise Warehouse".
2. Wait for the page to stop loading.

**Expected.** The page loads fully and the table is visible (or an empty state).

---

### 1.2 — ...

---

## Feature — Detail

Consolidated CRUD + workflow coverage. Run these after smoke passes.

### 1.1 — ...
```

Rules:
- **Quick Reference** always comes first. It must contain every case from both
  suites in two tables (one per suite). Each row: test number | test name | priority.
- Smoke detail headings use `###`, not `####` — keeps the sidebar/TOC flat.
- Feature detail headings use `###`.
- If only one suite was generated (smoke-only or feature-only), omit the other
  table in Quick Reference and the corresponding Detail section.
- File replaces any existing `docs/testing/scenarios/<tool>.md` — never append.

### Step 8 — Report

Report in ≤150 words:

1. Suites generated (smoke, feature, or both) and case counts
2. Supabase rows inserted
3. Migration file paths
4. Markdown file path (absolute) — one file per tool
5. Coverage gaps (anything in Procore docs or PRP that could not be testified to)
6. Suggested next tool to audit

---

## Reference

| What | Where |
|------|-------|
| Test runner UI | `http://localhost:3000/testing` |
| Supabase project | `lgveqfnpkxvzbnnwuled` |
| Test project | `67` — "Vermillion Rise Warehouse" |
| Test user | `test1@mail.com` / `test12026!!!` |
| `test_suites` unique | `(tool_name, suite_type)` |
| `suite_type` values | `'smoke'` \| `'feature'` |
| Migration dir | `supabase/migrations/` |
| Markdown dir | `docs/testing/scenarios/` |
| PRPs | `docs/PRPs/<tool>/` |
| Procore manifests | `.claude/procore-manifests/<tool>/` |

## Relationship to other skills

- This skill **replaces** `/test-scenario-writer` and `/test-scenario-writer-broad`,
  which are now deprecated. Do not invoke those.
- `/procore-test-matrix` is still useful for generating a quick feature checklist
  from Procore docs; this skill produces runnable, plain-English human scenarios.
