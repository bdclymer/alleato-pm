# Session Board

Last updated: 2026-04-14

Use this as the live ownership registry.

| Session | Owner | Task ID | Scope | Owned Paths | Status | Started | Updated |
|---|---|---|---|---|---|---|---|
| LEADER | Megan | ORCH-000 | Orchestration and review control | `docs/ops/**` | In Progress | 2026-04-14 | 2026-04-14 |
| S1 | Worker Session S1 | ORCH-001 | Investigate `change-orders` smoke failures (commitment create flow + API detail 500 manifest issue) | `frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/**`, `frontend/src/app/(main)/[projectId]/change-orders/**`, `docs/ops/handoffs/2026-04-14-S1-workstream.md` | Needs Rework | 2026-04-14 | 2026-04-14 |
| S2 | Worker Session S2 | ORCH-002 | Invoicing API guardrail hardening tranche (structured error envelope migration + validation) | `frontend/src/app/api/projects/[projectId]/invoicing/**`, `docs/ops/handoffs/2026-04-14-S2-workstream.md` | Accepted | 2026-04-14 | 2026-04-14 |
| S3 | Worker Session S3 | ORCH-003 | Drawings revision-download 500 fix + smoke verification rerun | `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/download/route.ts`, `smoke-test-output/drawings/**`, `docs/ops/handoffs/2026-04-14-S3-workstream.md` | Accepted | 2026-04-14 | 2026-04-14 |
| S4 | Worker Session S4 | ORCH-004 | Quality pipeline cleanup foundation (`quality:changed`, lint caching, ratchet baseline for no-new-debt CI gate) | `frontend/package.json`, `.github/workflows/**`, `scripts/**`, `docs/ops/handoffs/2026-04-14-S4-workstream.md` | Needs Rework | 2026-04-14 | 2026-04-14 |
| S5 | Worker Session S5 | ORCH-005 | Prime contracts stabilization tranche (API retry guardrail + contract form SOV/test-compat hardening) | `frontend/src/lib/api-client.ts`, `frontend/src/hooks/use-prime-contracts.ts`, `frontend/src/components/domain/contracts/ContractForm.tsx`, `frontend/tests/e2e/contracts/prime-contracts-new.spec.ts`, `docs/ops/handoffs/2026-04-14-S5-workstream.md` | Accepted | 2026-04-14 | 2026-04-14 |
| S6 | Worker Session S6 | ORCH-006 | Prime-contract guardrail hardening (atomic settings flow + apiFetch migration + smoke coverage expansion) | `frontend/src/app/(main)/[projectId]/prime-contracts/**`, `frontend/src/components/domain/contracts/prime-contract-detail/**`, `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/advanced-settings/route.ts`, `frontend/tests/e2e/contracts/prime-contracts-settings.spec.ts`, `scripts/api-smoke-contracts.mjs`, `docs/ops/handoffs/2026-04-14-S6-workstream.md` | Accepted | 2026-04-14 | 2026-04-14 |
| S7 | Worker Session S7 | ORCH-009 | Frontend flow audit (phase 1): Create Project -> Add Budget -> Prime Contract + SOV, with breakpoint evidence | `docs/ops/handoffs/2026-04-14-S7-workstream.md`, `docs/ops/orchestration/session-board.md`, `docs/ops/evidence/2026-04-14-S7-frontend-flow-audit/**` | Pending Review | 2026-04-14 | 2026-04-14 |
| S8 | Worker Session S8 | ORCH-010 | Frontend flow audit (phase 2): Commitments -> Change Event -> PCO -> Official CO -> Invoicing with breakpoint evidence | `docs/ops/handoffs/2026-04-14-S8-workstream.md`, `docs/ops/orchestration/session-board.md`, `docs/ops/evidence/2026-04-14-S8-frontend-flow-audit-phase2/**` | Pending Review | 2026-04-14 | 2026-04-14 |

## Status Rules

- `In Progress`: actively implementing assigned task
- `Pending Review`: waiting for leader acceptance
- `Needs Rework`: rejected; must address review notes
- `Accepted`: leader approved and logged
- `Blocked`: cannot proceed due to explicit blocker
