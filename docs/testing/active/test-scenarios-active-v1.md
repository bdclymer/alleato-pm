# Active Test Scenarios — Index

_Auto-generated index over the new per-tool consolidated scenarios. Regenerate with `node scripts/testing/regenerate-active-index.mjs`._

**Source of truth:** Supabase `test_suites` + `test_cases` (project `lgveqfnpkxvzbnnwuled`).
**Per-tool detail:** `docs/testing/scenarios/<tool>.md` (one file per tool, with `## Smoke` + `## Feature` sections).
**Regenerate a tool's suites:** `/test-scenario-audit <tool>`.
**Run a suite:** `/test-scenario-run <tool> [smoke|feature]`.

---

## Seeded suites

_Last refreshed: 2026-04-20_

| Tool | Smoke | Feature | Total | Consolidated markdown |
|------|------:|--------:|------:|-----------------------|
| Budget | 14 | 25 | 39 | [scenarios/budget.md](../scenarios/budget.md) |
| Change Events | 10 | 30 | 40 | [scenarios/change-events.md](../scenarios/change-events.md) |
| Change Orders | 8 | 23 | 31 | [scenarios/change-orders.md](../scenarios/change-orders.md) |
| Commitments | 10 | 26 | 36 | [scenarios/commitments.md](../scenarios/commitments.md) |
| Rfis | 10 | 26 | 36 | [scenarios/rfis.md](../scenarios/rfis.md) |

**Totals:** 5 tools · 52 smoke · 130 feature · **182 cases**

---

## Tools still pending audit

Run `/test-scenario-audit <tool>` for each:

- `submittals`
- `invoices`
- `prime-contracts`
- `direct-costs`
- `daily-log`
- `meetings`
- `punch-list`
- `documents`
- `directory`
- `schedule`
- `drawings`
- `specifications`
- `photos`
- `project-lifecycle`

---

## Deprecated

The old flat scenario layout is retired:

- `docs/testing/*-scenarios.md` — **deprecated**, do not edit. Use `docs/testing/scenarios/<tool>.md` instead.

## Schema reminder

`test_cases` columns: `id, suite_id, test_number, category, subcategory, test_name, context_note, setup_steps, steps, expected_result, priority, test_type, start_url`.

`tool_name` and `suite_type` live on `test_suites`, **not** on `test_cases` (dropped in the 2026-04-20 cleanup migration).
