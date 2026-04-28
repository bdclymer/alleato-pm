# Review Queue

Last updated: 2026-04-24

Leader reviews all pending handoffs here.

| Handoff File | Session | Task ID | Submitted | Evidence Complete | Disposition | Reviewer Notes |
|---|---|---|---|---|---|---|
| `docs/ops/handoffs/2026-04-14-SLEADER-orchestration-setup.md` | LEADER | ORCH-000 | 2026-04-14 | Yes | Accepted | Orchestration baseline established and in active use |
| `docs/ops/handoffs/2026-04-14-S1-workstream.md` | S1 | ORCH-001 | 2026-04-14 | Yes | Accepted | Rework completed with concrete route/page fixes and before/after evidence |
| `docs/ops/handoffs/2026-04-14-S2-workstream.md` | S2 | ORCH-002 | 2026-04-14 | Yes | Accepted | Invoicing route hardening tranche completed with lint/guardrail checks |
| `docs/ops/handoffs/2026-04-14-S3-workstream.md` | S3 | ORCH-003 | 2026-04-14 | Yes | Accepted | Drawings revision-download 500 fix delivered with passing smoke rerun evidence |
| `docs/ops/handoffs/2026-04-14-S4-workstream.md` | S4 | ORCH-004 | 2026-04-14 | Yes | Accepted | Rework completed with quality-pipeline implementation and command-log evidence |
| `docs/ops/handoffs/2026-04-14-S6-workstream.md` | S6 | ORCH-006 | 2026-04-14 | Yes | Accepted | Prime-contract settings tranche validated (tests passing) |
| `docs/ops/handoffs/2026-04-14-S7-workstream.md` | S7 | ORCH-007 | 2026-04-14 | Yes | Accepted | Protocol bootstrap complete; ready for implementation assignment |
| `docs/ops/handoffs/2026-04-14-S7-workstream.md` | S7 | ORCH-009 | 2026-04-14 | Yes | Accepted | Phase-1 frontend flow audit accepted; clear breakpoints and artifacts captured |
| `docs/ops/handoffs/2026-04-14-S5-workstream.md` | S5 | ORCH-005 | 2026-04-14 | Yes | Accepted | Prime-contract stabilization tranche accepted with follow-up on targeted timeout probe |
| `docs/ops/handoffs/2026-04-14-S8-workstream.md` | S8 | ORCH-008 | 2026-04-14 | Yes | Accepted | Protocol bootstrap complete; duplicate review-row reconciled |
| `docs/ops/handoffs/2026-04-14-S8-workstream.md` | S8 | ORCH-010 | 2026-04-14 | Yes | Accepted | Phase-2 frontend flow audit accepted; intake parser updated to support equivalent intake-block format |
| `docs/ops/handoffs/2026-04-14-S9-directory-members-company.md` | S9 | ORCH-011 | 2026-04-14 | Yes | Pending Review | Added company column to live project members table and cleared targeted directory page warnings; eslint now returns 0 warnings, 0 errors |
| `docs/ops/handoffs/2026-04-14-SC-budget-regression-coverage.md` | SC | ORCH-012 | 2026-04-14 | Yes | Pending Review | Replaced skipped/stale budget regression coverage with current-UI create/edit failure-message specs; browser runtime rerun still hangs and is documented as the remaining gap |
| `docs/ops/handoffs/2026-04-14-S11-route-guardrails.md` | S11 | ORCH-013 | 2026-04-14 | Yes | Pending Review | Changed-route raw-error debt now blocks touched routes; predeploy now runs changed-file API-client enforcement before route/build stages |
| `docs/ops/handoffs/2026-04-14-SD-punch-list-smoke.md` | SD | ORCH-014 | 2026-04-14 | Yes | Pending Review | Follow-up fix completed: shared punch-item write schema now normalizes blank optional fields, targeted route tests pass (10/10), and live required-fields-only create succeeds in the UI. |
| `docs/ops/handoffs/2026-04-24-S12-code-quality-audit-fixes.md` | S12 | ORCH-015 | 2026-04-24 | Yes | Pending Review | Implemented loud non-critical failure reporting, apiFetch migration for change-event detail, unsafe-pattern changed-file guardrail, typed commitment SOV access, changed-file ratchet detection hardening, and Supabase schema drift cleanup. Full frontend typecheck, changed quality gate, route check, and guardrail tests pass. |
| `docs/ops/handoffs/2026-04-24-S13-change-events-feature-run.md` | S13 | ORCH-016 | 2026-04-24 | Yes | Needs Rework | Continued slice added cases 2.2, 3.1, 3.2, 4.1 with evidence; still incomplete because 4.2 and later cases are pending after 4.1 validation failure on `lineItemRevenueSource`. |
| `docs/ops/handoffs/2026-04-24-S14-prime-contracts-feature-run.md` | S14 | ORCH-017 | 2026-04-24 | Partial | Needs Rework | Continued slice added cases 4.1, 4.2, 4.3 with evidence; still incomplete because 4.3 returns 500 on status change from Approved to Terminated and cases 5.1/5.2 were not started. |
| `docs/ops/handoffs/2026-04-24-S15-change-orders-feature-run.md` | S15 | ORCH-018 | 2026-04-24 | Yes | Accepted | Feature run produced report and evidence with pass=4 fail=1 skip=13 blocked=5; accepted as a valid seeded-environment result with follow-up required for prime CO detail stability and missing seed coverage. |
| `docs/ops/handoffs/2026-04-24-S16-commitments-feature-run.md` | S16 | ORCH-019 | 2026-04-24 | Yes | Accepted | Blocked run accepted: all 26 cases blocked by documented page crash in `LiveCursorsRoom` / `crypto.randomUUID`; screenshots and report captured. |
| `docs/ops/handoffs/2026-04-24-S17-budget-feature-run.md` | S17 | ORCH-020 | 2026-04-24 | Partial | Needs Rework | Continued slice added cases 11.1, 12.1, 12.2, 12.3, 13.1 with a slice report; parent run remains incomplete with 4 pass, 4 fail, and 17 not_tested. |
| `docs/ops/handoffs/2026-04-26-S18-frontend-qa-audit.md` | S18 | ORCH-021 | 2026-04-26 | Yes | Pending Review | Browser QA audit completed with route/responsive artifacts, scoped shared mobile chrome fixes, tab/action/table mobile pattern cleanup, budget scroll sync fix, and passing focused Playwright regressions. |
| `docs/ops/handoffs/2026-04-26-S19-linear-codex-process.md` | S19 | ORCH-022 / AAI-165 | 2026-04-26 | Yes | Pending Review | Linear-Codex process installed with mandatory issue/comment/sub-issue/evidence contract, guardrail command, worker-status enforcement, and Linear evidence posted to AAI-165. |
<<<<<<< ours
<<<<<<< ours
| `docs/ops/handoffs/2026-04-27-S20-welcome-onboarding-ai-foundations.md` | S20 | AAI-183 | 2026-04-27 | Yes | Pending Review | Welcome onboarding, Ask Alleato widget, AI prompt/memory foundation, KB marker guardrail, focused E2E, Storybook, browser evidence, and feedback persistence verification complete; production build has unrelated `/_document` blocker documented. |
=======
| `docs/ops/handoffs/2026-04-28-S20-rag-pm-briefing-eval.md` | S20 | ORCH-023 / AAI-186 | 2026-04-28 | Yes | Pending Review | Tuned PM-briefing retrieval ranking/source-selection (gateway-safe embedding model IDs + briefing diversity pass) and aligned the PM briefing eval script; targeted lint check passes, but local eval remains blocked by embedding fetch failures in this container. |
>>>>>>> theirs
=======
| `docs/ops/handoffs/2026-04-28-S20-rag-pm-briefing-eval.md` | S20 | ORCH-023 / AAI-186 | 2026-04-28 | Yes | Pending Review | Tuned PM-briefing retrieval ranking/source-selection (gateway-safe embedding model IDs + briefing diversity pass) and aligned the PM briefing eval script; targeted lint check passes, but local eval remains blocked by embedding fetch failures in this container. |
>>>>>>> theirs

## Disposition Rules

- `Accepted`: evidence complete, scope met, risks documented
- `Needs Rework`: incomplete evidence or unmet scope
- `Blocked`: external dependency prevents validation

## SLA

Leader should process all `Pending Review` items within 60 minutes during active work windows.
