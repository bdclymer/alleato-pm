# Task: Eve Project Intelligence maintainer

Status: Blocked/Deferred
Owner: Codex
Created: 2026-06-30
Linear Issue: AAI-774 - https://linear.app/megankharrison/issue/AAI-774/implement-eve-project-intelligence-maintainer
Related Handoff: docs/ops/handoffs/2026-06-30-S100-eve-project-intelligence-maintainer.md

## Objective

Add an isolated Eve agent package that maintains Project Intelligence health by
inspecting packet freshness, source coverage, stale project data, packet
evidence, and approval-gated refresh paths without replacing the existing
Project Intelligence compiler.

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
- [ ] Database/provider read-back performed for migrations/config/external services.
- [ ] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Acceptance Criteria

- Eve package exists at `agents/project-intelligence-maintainer` with explicit
  Eve dependency and documented local commands.
- Agent instructions require packet-first behavior and fail-loudly reporting.
- Read-only tools inspect targets, packet freshness, source coverage, stale
  project data, packet evidence, and compact findings.
- Mutating refresh/recompute/retry tools require human approval, reject unbounded
  scope by default, and report expected write scope plus read-back proof.
- A weekday report-only schedule is defined with no automatic mutation in v1.
- Evals cover stale packets, weak source coverage, approval requirements,
  read-back proof, tool usage, compact output, and secret redaction.

## Source Of Truth

- Packet reader: `frontend/src/lib/ai/intelligence/packet-service.ts`.
- Compiler/writer: `backend/src/services/intelligence/compiler.py`.
- Refresh path: `backend/src/services/intelligence/project_intelligence.py`.
- Source lifecycle contract: `frontend/src/app/api/admin/source-sync/status/route.ts`.
- Existing verifiers:
  - `scripts/verify/verify_project_intelligence_live_paths.mjs`
  - `scripts/verify/verify_source_lifecycle_health.mjs`
  - `scripts/verify/verify_project_intelligence_read_proof.mjs`

## Files To Change

- `agents/project-intelligence-maintainer/**` - new isolated Eve package.
- `scripts/verify/verify_project_intelligence_live_paths.mjs` - align required-term guard with maintained architecture source instead of moved docs stubs.
- `scripts/verify/verify_project_intelligence_read_proof.mjs` - compact fail-loud DB connection blocker instead of raw pg stack.
- `docs/ops/tasks/2026-06-30-eve-project-intelligence-maintainer.md` - task evidence.
- `docs/ops/handoffs/2026-06-30-S100-eve-project-intelligence-maintainer.md` - implementation handoff updates.

## Evidence

| Check | Command / artifact | Result | Notes |
| ----- | ------------------ | ------ | ----- |
| Linear kickoff | Linear AAI-774 | Pass | Issue created before implementation. |
| Linear progress update | AAI-774 comment `b80c55ef-e67c-471e-851a-831ecfb6d393` | Pass | Implementation evidence and DB verification blocker posted. |
| Package install | `npm install` in `agents/project-intelligence-maintainer` | Pass | Default shell Node 22 emitted Eve engine warning; verification used bundled Node 24.14.0. |
| Typecheck | `./node_modules/.bin/tsc --noEmit` | Pass | Package TypeScript compiled cleanly. |
| Eve discovery | `PATH=/Users/meganharrison/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npx eve info` | Pass | Nested layout discovered with 0 errors and 0 warnings. |
| Eve evals | `PATH=/Users/meganharrison/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npx eve eval --max-concurrency 1 --timeout 120000` | Pass | 5/5 evals passed; 14/14 gates passed. |
| Live-path guard | `npm run rag:verify:project-intelligence-live-paths` | Pass | Guard repaired to validate required terms against maintained architecture source, not moved stubs. |
| Source lifecycle read-back | `npm run rag:verify:source-lifecycle` | Blocked | App DB connection failed: `code=XX000 (ECHECKOUTTIMEOUT) unable to check out connection from the pool after 15000ms in Session mode`. |
| Packet evidence read-proof | `npm run rag:verify:project-intelligence-read-proof` | Blocked | App DB connection failed: `code=08006 Failed to connect to database: {:error, :timeout}`. Verifier now reports compact blocker instead of raw pg stack. |

## Risks / Gaps

- Schedule delivery channel is not configured in v1; schedule logic is report-only
  until Slack/Linear delivery is wired.
- Full project typecheck/build is intentionally not run in the main thread per
  repo long-running verification rules.
- Live DB-backed read-back is blocked by app DB checkout timeout. Cause:
  Supabase/Postgres app DB connection checkout did not complete within 15s.
  Detection gap: target/evidence health cannot be proved while the app DB is
  unreachable. Prevention: the Eve tools and read-proof verifier now return
  structured `blocked` results instead of raw errors. Owner: app DB connectivity
  / Supabase pooler path. Next action: rerun source lifecycle and read-proof
  verifiers after DB checkout recovers.

## Final Status

- [ ] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
