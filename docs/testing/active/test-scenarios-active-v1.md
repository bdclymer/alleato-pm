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
| Daily Log | 7 | 26 | 33 | [scenarios/daily-log.md](../scenarios/daily-log.md) |
| Direct Costs | 8 | 33 | 41 | [scenarios/direct-costs.md](../scenarios/direct-costs.md) |
| Directory | 8 | 28 | 36 | [scenarios/directory.md](../scenarios/directory.md) |
| Documents | 7 | 33 | 40 | [scenarios/documents.md](../scenarios/documents.md) |
| Drawings | 10 | 34 | 44 | [scenarios/drawings.md](../scenarios/drawings.md) |
| Invoices | 8 | 25 | 33 | [scenarios/invoices.md](../scenarios/invoices.md) |
| Meetings | 8 | 26 | 34 | [scenarios/meetings.md](../scenarios/meetings.md) |
| Photos | 7 | 27 | 34 | [scenarios/photos.md](../scenarios/photos.md) |
| Prime Contracts | 10 | 28 | 38 | [scenarios/prime-contracts.md](../scenarios/prime-contracts.md) |
| Project Lifecycle | 10 | 32 | 42 | [scenarios/project-lifecycle.md](../scenarios/project-lifecycle.md) |
| Punch List | 8 | 28 | 36 | [scenarios/punch-list.md](../scenarios/punch-list.md) |
| Rfis | 10 | 26 | 36 | [scenarios/rfis.md](../scenarios/rfis.md) |
| Schedule | 8 | 28 | 36 | [scenarios/schedule.md](../scenarios/schedule.md) |
| Specifications | 10 | 23 | 33 | [scenarios/specifications.md](../scenarios/specifications.md) |
| Submittals | 10 | 23 | 33 | [scenarios/submittals.md](../scenarios/submittals.md) |

**Totals:** 19 tools · 161 smoke · 524 feature · **685 cases**

---

## Tools still pending audit

All tools have been audited. ✅

---

## Deprecated

The old flat scenario layout is retired:

- `docs/testing/*-scenarios.md` — **deprecated**, do not edit. Use `docs/testing/scenarios/<tool>.md` instead.

## Schema reminder

`test_cases` columns: `id, suite_id, test_number, category, subcategory, test_name, context_note, setup_steps, steps, expected_result, priority, test_type, start_url`.

`tool_name` and `suite_type` live on `test_suites`, **not** on `test_cases` (dropped in the 2026-04-20 cleanup migration).
