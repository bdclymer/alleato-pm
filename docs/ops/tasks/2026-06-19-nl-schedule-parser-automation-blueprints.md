# Task: Goal 7 G6 - NL Schedule Parser And Automation Blueprints

Status: Published
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-565 - https://linear.app/megankharrison/issue/AAI-565/goal-7-g6-nl-schedule-parser-and-automation-blueprints
Related Handoff: docs/ops/handoffs/2026-06-19-S66-nl-schedule-parser-automation-blueprints.md

## Objective

Add a default-off Alleato-native natural-language schedule parser and automation
blueprint planner that can turn user intent into reviewable automation blueprint
drafts backed by existing Render cron/Supabase automation infrastructure, without
adopting Hermes's in-process scheduler.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified before adding new ones.
- [x] Source-of-truth owner chosen for the workflow/data/control plane.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined.

## Acceptance Criteria

- Schedule parser is default-off behind a narrow feature flag.
- Parser accepts common natural-language schedules and returns a typed schedule
  plan or an explicit unsupported/ambiguous result.
- Blueprint catalog is explicit, versioned, and allowlisted; unsupported
  automation requests do not create records.
- Planner creates reviewable/draft automation blueprints only through Alleato
  storage; it does not create or mutate Render cron definitions directly.
- Existing Render cron execution remains the runtime source of truth.
- Source clone usage is documented as COPY, ADAPT, or REFERENCE.
- Tests prove parser success, ambiguity handling, unsupported blueprint handling,
  default-off behavior, and persistence failure reporting.

## Failure-Loudly Behavior

If the feature flag is disabled, the requested automation is unsupported, the
schedule is ambiguous, timezone/project scope is invalid, or persistence fails,
the service returns an inspectable `disabled`, `blocked`, or `failed` result with
a reason code. No cron, reminder, or automation blueprint is silently created.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Planned Files

- `frontend/src/lib/ai/automation-blueprints/*` - parser, catalog, planner, tests.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - architecture/source-clone usage note.
- `docs/ops/tasks/2026-06-19-nl-schedule-parser-automation-blueprints.md` - task done gate.
- `docs/ops/handoffs/2026-06-19-S66-nl-schedule-parser-automation-blueprints.md` - handoff evidence.
- `docs/ops/orchestration/session-board.md` and `docs/ops/orchestration/review-queue.md` - orchestration ledger.

## Integration Checklist

- [x] End-to-end path wired through one owner, not separate disconnected pieces.
- [x] All entry points for the workflow use the same canonical service/runtime.
- [x] Source adapters or external dependencies return typed, inspectable results.
- [x] Run/task/session ledger records every meaningful attempt.
- [x] Artifacts link back to source evidence and run logs.
- [x] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.

## Regression Guardrails

- [x] Unit or integration test added/updated for the core behavior.
- [x] Contract test added/updated for cross-module or source/delivery boundaries.
- [x] Guardrail added so the same class of bug fails loudly next time.
- [x] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated test run.
- [x] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services.
- [x] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npm run quality:changed` | PASS | No new ESLint debt, no new `any` debt, no unsafe patterns, no changed API route guardrail failures. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/automation-blueprints/__tests__/planner.test.ts --runInBand` | PASS | 1 suite / 6 tests. |
| Browser/user-flow     | Not applicable | PASS | No new UI; planner stores reviewable drafts in AI Ops ledger for future review surface. |
| DB/provider read-back | Not applicable | PASS | No migration or provider config change; reused existing `ai_work_runs` table. |
| End-to-end proof      | Focused planner test creates an `ai_work_runs` draft payload for an allowlisted Render-cron-backed blueprint | PASS | Tests prove default-off, parser success/ambiguity, unsupported blueprint block, and persistence failure reporting. |
| Publish               | `npm run codex:finish -- --message "Add automation blueprint schedule planner" --files ...` | PASS | Published to `origin/main` at `3e135cf41b57852b93dafd2b3b710d7478f8996d`; verified `HEAD == origin/main`. |

## Files Changed

- `docs/ops/tasks/2026-06-19-nl-schedule-parser-automation-blueprints.md` - task done gate.
- `docs/ops/handoffs/2026-06-19-S66-nl-schedule-parser-automation-blueprints.md` - handoff evidence.
- `docs/ops/orchestration/session-board.md` - S66 ownership row.
- `docs/ops/orchestration/review-queue.md` - S66 review queue row.
- `frontend/src/lib/ai/automation-blueprints/schedule-parser.ts` - natural-language schedule parser.
- `frontend/src/lib/ai/automation-blueprints/catalog.ts` - allowlisted Render-cron-backed blueprint catalog.
- `frontend/src/lib/ai/automation-blueprints/planner.ts` - default-off draft planner.
- `frontend/src/lib/ai/automation-blueprints/__tests__/planner.test.ts` - focused tests.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - architecture/source-clone usage note.

## Risks / Gaps

- No direct user-facing UI was added in this slice. The next product slice can
  surface `automation_blueprint_draft` rows in `/ai-work-runs` or a dedicated
  review flow.
- The planner deliberately stores drafts only; applying a draft to Render cron
  still requires a future approval/execution path.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
