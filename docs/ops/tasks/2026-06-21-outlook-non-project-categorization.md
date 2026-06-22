# Task: Outlook Non-Project Categorization

Status: Complete
Owner: Codex
Created: 2026-06-21
Linear Issue: AAI-574 - https://linear.app/megankharrison/issue/AAI-574/audit-and-harden-microsoft-email-assistant-workflow
Related Handoff: N/A

## Objective

Brandon's Outlook intake rows that are clearly business-admin, finance, personal,
vendor/account, or junk-like non-project mail are categorized explicitly instead
of staying in `project_assignment.status='review_needed'`, while true project
mail still keeps project assignment or review-needed behavior.

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
| Static/type/lint      | `PYTHONPATH=backend backend/.venv/bin/python -m py_compile backend/src/services/integrations/microsoft_graph/outlook.py` | PASS | Outlook intake categorization owner compiles. |
| Targeted tests        | `PYTHONPATH=backend backend/.venv/bin/python -m pytest backend/tests/test_graph_embed.py backend/tests/test_outlook_intake.py backend/tests/test_project_assignment.py backend/tests/test_graph_sync_options.py backend/tests/test_graph_live_mail.py backend/tests/test_graph_subscriptions.py backend/tests/test_microsoft_executive_assistant.py backend/tests/test_email_digest.py backend/tests/test_email_classification.py -q` | PASS | 78 passed, 14 existing warnings. |
| Browser/user-flow     | N/A                | PASS   | Backend/RAG categorization only; no frontend-visible UI changed. |
| DB/provider read-back | `backfill_outlook_intake_project_assignments(... mailbox_user_id='bclymer@alleatogroup.com', since='2026-06-07T00:00:00Z', limit=500)` plus RAG DB read-back | PASS | `scanned=262`, `assigned=149`, `normalized_existing=149`, `not_project=45`, `review_needed=68`, `failed=0`. Read-back statuses: `assigned=149`, `not_project=45`, `review_needed=68`. Categories: `finance_admin=17`, `business_admin=14`, `system_admin=13`, `personal_admin=1`. |
| End-to-end proof      | Same 14-day Brandon read-back | PASS | Clear non-project admin rows no longer sit in review-needed; ambiguous/project-looking samples remain `review_needed` by design. |

## Files Changed

- `docs/ops/tasks/2026-06-21-outlook-non-project-categorization.md` - Task gate and evidence ledger.
- `backend/src/services/integrations/microsoft_graph/outlook.py` - Canonical Outlook intake categorization owner.
- `backend/tests/test_outlook_intake.py` - Regression coverage for non-project categorization.

## Risks / Gaps

- Scope is limited to Brandon's last-14-day Outlook intake unless explicitly expanded.
- The remaining 68 `review_needed` rows include ambiguous/project-looking subjects such as permit plans, Morrisville charger locations, Uni Qlo invoice portal, and generic attachment threads. They should remain review-needed unless a human or stronger project rule assigns them.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
