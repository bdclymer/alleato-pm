# Current State

Last updated: 2026-04-14
Owner: Engineering

## Current Focus

- Build a durable documentation and memory workflow in `docs/ops`
- Migrate high-value knowledge from legacy docs without carrying stale guidance
- Keep implementation guardrails aligned with actual code behavior
- Enforce a leader/worker orchestration model for parallel sessions
- Record production-facing regressions in `docs/ops/handoffs/` with root cause, detection gap, and prevention step

## Top 3 Priorities

1. Consolidate recurring failure patterns into one maintained source of truth.
2. Keep architecture and stack docs current enough to avoid wrong assumptions.
3. Enforce evidence-based completion (tests/logs/screenshots) in every handoff.

## Active Risks

- Conflicting guidance across old docs (example: Playwright `networkidle` vs `domcontentloaded`).
- Drift between generated project-overview files and live codebase state.
- Repetition of process failures when fixes are not turned into guardrails.
- Prime contract owner/client selection can diverge from contract-company state unless the form keeps both IDs synchronized, which can leave the invoice-contact dropdown empty even when contacts exist on the selected company.

## Open Blockers

- None

## Active Work (Live)

Reference: `docs/ops/orchestration/session-board.md`

| Session | Task ID | Status | Notes |
|---|---|---|---|
| LEADER | ORCH-000 | In Progress | Establishing orchestration control layer |

## Next Actions

1. Roll out worker protocol usage across all active sessions.
2. Process first review queue entries and enforce acceptance/rework decisions.
3. Archive deprecated legacy pattern docs or add automated warning checks for canonical-only usage.
4. Add a targeted regression test for prime contract owner/client selection so invoice contacts stay populated when a company has contacts.
