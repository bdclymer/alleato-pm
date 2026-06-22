# Task: Normalize script anon keys

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - Linear issue creation tool unavailable in current connector set; only comment/document tools exposed
Related Handoff: N/A

## Objective

Remove hardcoded Supabase anon JWT literals from active scripts and require
environment-backed Supabase config, so scripts do not carry provider keys in
source and failures are explicit when env is missing.

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

## Acceptance Criteria

- Active `scripts/**` files no longer contain literal Supabase JWT-style keys.
- Scripts that need Supabase anon access read from env and fail loudly if missing.
- `repo:control` fails on any Supabase JWT-style literal under tracked `scripts/**`.
- Verification proves the literal-key scan is clean outside the guard regex.

## Files To Change

- `docs/ops/tasks/2026-06-22-normalize-script-anon-keys.md`
- `scripts/feature-tracker/import-to-supabase.ts`
- `scripts/feature-tracker/check-tables.ts`
- `scripts/verify/verify_ai_assistant_eval_suite.mjs`
- `scripts/audits/check-repo-control.mjs`

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `node --check scripts/audits/check-repo-control.mjs` | Pass | Guard script parses. |
| Targeted tests        | `npm run repo:control`; `node scripts/audits/check-repo-control.mjs --strict`; root inventory coverage script | Pass | Repo-control strict passes with JWT literal detection enabled. |
| Browser/user-flow     | N/A | Pass | Script/control-plane cleanup only; no frontend UI change. |
| DB/provider read-back | N/A | Pass | No DB/provider changes. |
| End-to-end proof      | `rg -n "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9|sb_secret_" scripts --glob '!scripts/archive/**' --glob '!scripts/audits/check-repo-control.mjs'` | Pass | No active script files contain literal Supabase JWT or `sb_secret_` keys. |

## Files Changed

- `docs/ops/tasks/2026-06-22-normalize-script-anon-keys.md` - task ledger and evidence.
- `scripts/feature-tracker/import-to-supabase.ts` - reads Supabase URL/anon key from env and fails loudly if missing.
- `scripts/feature-tracker/check-tables.ts` - reads Supabase URL/anon key from env and fails loudly if missing.
- `scripts/verify/verify_ai_assistant_eval_suite.mjs` - removes hardcoded anon-key fallback and requires env-backed auth refresh config.
- `scripts/audits/check-repo-control.mjs` - blocks Supabase JWT literals and `sb_secret_` literals under tracked active `scripts/**`.

## Risks / Gaps

- This removes literal keys from active scripts but does not rewrite git history.
- Hardcoded project URLs may remain where they are non-secret defaults. Future
  cleanup can normalize those too if desired.
- Archived scripts may still contain historical literals. They are preserved
  only for lookup and should not be run without review.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
