---
description: "Canonical autonomous workflow for finalizing a Procore tool implementation with orchestrator + parallel subagents"
argument-hint: "<feature-name> [--mode full|fast|retest] [--auto] [--project-id <id>] [--max-fix-loops <n>] [--allow-stale-artifacts] [--strict-retest]"
---

# Procore Finalization Orchestrator

This is the single canonical workflow for finalizing a Procore tool implementation.

It consolidates and replaces ad hoc variants across:
- `/procore-deep-crawl`
- `/procore-gap-audit`
- `/procore-fix`
- `/feature-crawl` (optional evidence booster)
- `/investigate`
- `/implement-feature`
- `procore-audit`, `procore-verify`, `verify-feature`

## Invocation

```bash
/procore-complete <feature-name> [--mode full|fast|retest] [--auto] [--project-id <id>] [--max-fix-loops <n>] [--allow-stale-artifacts] [--strict-retest]
```

Defaults:
- `--mode full`
- `--auto` enabled
- `--project-id 562949954728542`
- `--max-fix-loops 25`

## Runtime Root

Set project root at runtime:

```bash
PROJECT_ROOT="${PROJECT_ROOT:-$(git rev-parse --show-toplevel)}"
```

## Canonical Artifact Root

All outputs must be written under run-scoped root:

```text
_bmad-output/planning-artifacts/<feature>/verification/runs/<run_id>/
```

Also write pointer file:

```text
_bmad-output/planning-artifacts/<feature>/verification/latest.json
```

with:
- `run_id`
- `feature`
- `project_id`
- `git_sha`
- `started_at`
- `artifact_root`

Required machine-readable artifacts:
- `00-run-manifest.json`
- `03-corrected-manifest.json`
- `05-verification-report.json`
- `06-task-list.json`
- `release-readiness.json`

Required human-readable artifacts:
- `01-codebase-inventory.md`
- `02-procore-reference.md`
- `04-gap-analysis-report.md`
- `07-remediation-log.md`
- `08-final-summary.md`

## Artifact Contract

### `00-run-manifest.json` (required)

Top-level required fields:
- `run_id`
- `feature`
- `project_id`
- `mode`
- `git_sha`
- `started_at`
- `completed_at`
- `phases[]`

Each phase object required fields:
- `phase`
- `state` (`pending|running|blocked|passed|failed`)
- `started_at`
- `completed_at`
- `owner`
- `result`
- `evidence` (array)
- `errors` (array)

### `03-corrected-manifest.json` normalized keys (required)
- `normalized.list.columns`
- `normalized.list.column_groups`
- `normalized.create_form.fields`
- `normalized.detail.tabs`
- `normalized.workflow.statuses`

### `05-verification-report.json` findings status enum
- `open|resolved|blocked|waived`

### `06-task-list.json` task status enum
- `open|in_progress|resolved|blocked|waived`

If task status is `waived`, fields required:
- `waiver_reason`
- `waived_by`
- `waived_at`

### Cross-artifact invariants
- Every non-passing finding has exactly one mapped task via `gap_id`.
- If `ready=false`, `blocking_gaps` must be non-empty unless `gate_failures` explains why.
- `generated_at` values across artifacts must be within this run window.

## Orchestrator State Machine

States:
- `pending`
- `running`
- `blocked`
- `passed`
- `failed`

State transition rules:
- transient error -> retry once; second failure -> `failed`
- missing human input -> `blocked`
- max-fix-loops reached with unresolved `critical|high` -> `failed`
- `blocked` and `failed` are terminal for `ready:true`

Exit contract:
- exit `0` only when `release-readiness.json.ready=true`
- exit `2` for blocked
- exit `3` for failed

## Phase Model (Canonical)

### Phase 0: INIT_COMMAND

1. Parse args and normalize feature slug.
2. Initialize run-scoped artifact root.
3. Create `00-run-manifest.json` + `latest.json`.

### Phase 1: DISCOVER (parallel)

Spawn two subagents in parallel:

1. `discover_codebase_worker`
- Read planning artifacts, implementation files, routes, hooks, schemas, DB types.
- Output: `01-codebase-inventory.md`.

2. `discover_procore_worker`
- Read Procore docs/support context and current known reference material.
- Output: `02-procore-reference.md`.

Gate to proceed:
- both artifacts exist and non-empty
- codebase inventory includes sections for routes, hooks, schemas, DB types

### Phase 2: CAPTURE_SOURCE_OF_TRUTH

1. Run `/procore-deep-crawl <feature> [--project-id <id>]`.
2. Validate crawl quality:
- core states present: `list`, `create-form`, `detail`
- manifest parseable
- `list.columns >= 3`
- `create_form.fields >= 5` OR equivalent extracted field inventory
- `detail.tabs >= 1` OR equivalent detail evidence
- fatal capture notes: `0`
3. If quality fails and mode is `full`, run `/feature-crawl <feature> [--project-id <id>]` as supplemental evidence.

Gate to proceed:
- crawl coverage is usable

### Phase 3: RECONCILE_MANIFEST

Run live `agent-browser` verification against Procore to correct extracted manifest data.

1. Verify list page columns, groups, actions.
2. Verify create form fields, types, required markers.
3. Verify detail tabs/sections/line-items.
4. Write `03-corrected-manifest.json` with required normalized keys.

Gate to proceed:
- corrected manifest satisfies normalized-key contract

### Phase 4: GAP_ANALYZE (parallel lanes + synthesis)

Parallel comparison workers:

1. `db_parity_worker`
- Compare corrected manifest vs DB schema/types/migrations.

2. `api_parity_worker`
- Compare expected CRUD/workflow endpoints vs implemented routes/services.

3. `ui_parity_worker`
- Compare expected pages/forms/tables/tabs/actions vs implementation.

Synthesis outputs:
- `04-gap-analysis-report.md`
- `05-verification-report.json`
- `06-task-list.json`

Gate to proceed:
- every non-passing finding has unique `gap_id`
- task list covers all unresolved findings
- cross-artifact invariants pass

### Phase 5: REMEDIATE (autonomous fix loop)

Goal: close `critical` and `high`, then `medium` as budget allows.

Loop rules:
1. Select next task by severity then dependency order.
2. Claim lock per task:
   - `.claude/locks/<feature>/<run_id>/<task_id>.lock`
   - includes session id, owner, started_at, heartbeat
3. Spawn `fix_worker` for each unlocked runnable task.
4. After each fix:
   - run quality checks
   - update `07-remediation-log.md`
   - update task status in `06-task-list.json`
   - synchronize finding status in `05-verification-report.json`
5. Release lock.

Parallelism policy:
- up to 3 concurrent fix workers
- never run overlapping write scopes

Stop conditions:
- all `critical|high` resolved, or
- `max-fix-loops` reached, or
- hard blocker encountered

### Phase 6: VERIFY_IMPLEMENTATION

Run acceptance verification for critical flows:
- list
- create
- edit
- status-transitions
- line-items (if applicable)
- attachments (if applicable)

Required evidence per flow:
- screenshots
- video
- console/network checks
- DB field-level checks

Write per-flow outputs:
- `feature-verifications/list/result.json`
- `feature-verifications/create/result.json`
- `feature-verifications/edit/result.json`
- `feature-verifications/status-transitions/result.json`
- `feature-verifications/line-items/result.json` (if applicable)
- `feature-verifications/attachments/result.json` (if applicable)

Gate to proceed:
- no unresolved `critical|high` acceptance failures

### Phase 7: FINALIZE_AND_REPORT

Generate `release-readiness.json` with:
- `ready`
- `blocking_gaps`
- `resolved_gaps`
- `waived_gaps` (owner, approver, date, rationale)
- `gate_failures` (if any)
- `evidence_index`

Generate `08-final-summary.md` with:
- before/after completion percentages
- closed vs remaining by severity
- top residual risks
- exact next actions

## Autonomous Behavior Rules

1. Default is autonomous (`--auto`).
2. Do not pause unless destructive risk or real ambiguity blocks deterministic choice.
3. Retry transient failures once.
4. If blocked, write blocker details + required input into run manifest and summary.

## Severity Gates

Completion gate for `ready: true`:
- `critical = 0`
- `high = 0`
- required verification flows passed
- quality checks passed

`medium` and `low` may remain only with explicit backlog entries or explicit waivers.

## Mode Behavior

- `full`: run all phases.
- `fast`: skip supplemental `/feature-crawl` unless deep-crawl quality fails.
- `retest`: skip Phases 1-5 and run Phase 6+7 using existing artifacts.

### Retest preflight
- artifact `git_sha` must match current `git_sha`, or use `--allow-stale-artifacts`
- feature slug and project id must match prior run metadata
- if mismatch and `--strict-retest` set, fail fast; otherwise auto-upgrade to `full`

## Canonical Execution Order

1. `INIT_COMMAND`
2. `DISCOVER`
3. `CAPTURE_SOURCE_OF_TRUTH`
4. `RECONCILE_MANIFEST`
5. `GAP_ANALYZE`
6. `REMEDIATE`
7. `VERIFY_IMPLEMENTATION`
8. `FINALIZE_AND_REPORT`

This order is mandatory for new finalization runs.
