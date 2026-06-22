# Task: Outlook Review Learning Rules

Status: Complete
Owner: Codex
Created: 2026-06-21
Linear Issue: AAI-574 - https://linear.app/megankharrison/issue/AAI-574/audit-and-harden-microsoft-email-assistant-workflow
Related Handoff: N/A

## Objective

When an admin reviews a Brandon Outlook intake row and decides it is non-project
mail, the decision can create a durable `email_filter_rules` rule that future
matching emails apply automatically as imported `not_project` mail instead of
staying in project-assignment review.

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

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

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
| Static/type/lint      | `backend/.venv/bin/python -m py_compile backend/src/api/main.py backend/src/services/integrations/microsoft_graph/outlook.py backend/src/services/integrations/microsoft_graph/user_filter_rules.py`; `pnpm --dir frontend exec eslint 'src/app/api/email-filter-rules/route.ts' 'src/app/api/email-filter-rules/[ruleId]/route.ts'` | PASS | Backend modules compile; touched frontend API routes lint. |
| Targeted tests        | `backend/.venv/bin/python -m pytest backend/tests/test_user_filter_rules.py backend/tests/test_outlook_intake.py` | PASS | 25 passed, 16 warnings. Plain `pytest ...` outside the repo venv fails before tests because global Python lacks `python-multipart`; repo venv has it. |
| Browser/user-flow     | N/A                | PASS   | Backend/API learning rule path; no frontend UI changed in this slice. |
| DB/provider read-back | `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260621193000_email_filter_rules_not_project_action.sql`; `supabase migration repair --status applied 20260621193000`; `npm run db:migrations:verify-applied -- supabase/migrations/20260621193000_email_filter_rules_not_project_action.sql`; constraint read-back query | PASS | Constraint now allows all four Outlook filter-rule actions, including the new non-project action; migration ledger check passed for `20260621193000`. |
| End-to-end proof      | `backend/.venv/bin/python -m pytest backend/tests/test_user_filter_rules.py backend/tests/test_outlook_intake.py` | PASS | Sync test proves learned non-project rule imports, skips project inference, creates RAG document link, and records non-project assignment metadata; replay test proves stored review rows can be marked non-project without unassigning existing project rows. |

## Files Changed

- `docs/ops/tasks/2026-06-21-outlook-review-learning-rules.md` - Task gate and evidence ledger.
- `supabase/migrations/20260621193000_email_filter_rules_not_project_action.sql` - Allow durable `not_project` rules.
- `backend/src/services/integrations/microsoft_graph/user_filter_rules.py` - Rule contract and matching support.
- `backend/src/services/integrations/microsoft_graph/outlook.py` - Apply learned `not_project` rules during sync and replay.
- `backend/src/api/main.py` - Admin-protected replay endpoint for learned Outlook filter rules.
- `backend/tests/test_outlook_intake.py` - Regression coverage for learned rule behavior.
- `backend/tests/test_user_filter_rules.py` - Contract coverage for rule priority.
- `frontend/src/app/api/email-filter-rules/route.ts` - Allow creating `not_project` rules.
- `frontend/src/app/api/email-filter-rules/[ruleId]/route.ts` - Allow updating rules to `not_project`.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - Architecture note for learned Outlook non-project rules and replay endpoint.

## Risks / Gaps

- Scope is limited to the rule contract and backend/API path. A richer admin UI can follow after the backend behavior is durable.
- Repository migration history has unrelated pre-existing local/remote drift; this task only repaired and verified migration version `20260621193000`.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
