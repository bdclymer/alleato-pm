# Guardrail Implementation Plan

**Created:** 2026-04-13
**Owner:** Engineering
**Status:** In Progress

---

## Context

This plan tracks the full 47-item guardrail system from `docs/development-guardrails.md`.
Items are ordered by impact: things that prevent the most recurring failures come first.

---

## Tier 1 — Highest Impact (blocking recurring bugs today)

### 1. Bug fix completion rule in CLAUDE.md
**Status:** DONE — Added as mandatory gate in CLAUDE.md and `.claude/rules/`
**What it does:** No bug fix is considered complete without at least one: test, validation, monitor, alert, or wrapper improvement.

### 2. Regression test requirement in CLAUDE.md
**Status:** DONE — Added as mandatory gate in CLAUDE.md
**What it does:** Any bug that escaped to production must leave behind a permanent guardrail (test, smoke entry, contract check, or validation rule).

### 3. Migrate remaining 105 debt routes to `withApiGuardrails`
**Status:** DONE — 371/392 routes now use `withApiGuardrails`
**What it does:** Closes the gap where 105 routes could throw unhandled 500s with no structured error, no request ID, no alerting.
**Remaining (21 intentional skips):** Streaming routes, webhooks, and proxy patterns incompatible with the wrapper — tracked in `scripts/guardrail-route-debt-baseline.txt`

### 4. Response shape contract validation for critical endpoints
**Status:** DONE — Enhanced `api-smoke-contracts.mjs` with body shape assertions for key endpoints
**What it does:** Previously the smoke test only checked status codes. Now critical endpoints also verify the response object has required fields — catching the "returns 200 but broke the frontend" failure class.

### 5. External dependency wrapper (timeout + retry standards)
**Status:** DONE — Created `frontend/src/lib/fetch-with-guardrails.ts`
**What it does:** All calls to Render backend, OpenAI, Supabase, and other external services go through a shared wrapper that enforces timeouts, retries, structured error output, and request ID propagation. Eliminates the "hung forever and called it progress" failure class.

### 6. Background job instrumentation
**Status:** DONE — Added structured start/complete/fail logging + alerting to cron route handlers
**What it does:** Silent job failures become visible. Every cron job now logs start time, duration, outcome, and fires an alert on failure.

---

## Tier 2 — High Impact (prevents structural drift)

### 7. `no-explicit-any` ESLint rule
**Status:** BLOCKED on Codex — Codex is currently eliminating all TypeScript errors across the codebase. Once that pass is complete, enable `@typescript-eslint/no-explicit-any: warn` in `frontend/eslint.config.mjs`. Escalate to `error` after a clean pass.
**What it does:** Prevents new `any` types from entering the codebase without explicit justification.

### 8. `@ts-ignore` / `as any` lint detection
**Status:** BLOCKED on Codex — same dependency as item 7.
**What it does:** Forces agents to explain unsafe type escapes rather than silently papering over type errors.

### 9. Centralized shared types for API responses
**Status:** NOT STARTED
**What it does:** Eliminates the "endpoint returns 200 but broke the frontend" class where response shape drifts from what the client expects. Requires defining TypeScript interfaces for every API response and sharing them between route handlers and hooks.

---

## Tier 3 — Process Enforcement

### 10. "What would have caught this?" mandatory step
**Status:** DONE — Added to CLAUDE.md as required output for every bug fix task
**What it does:** Forces agents to answer: what should have prevented this? what should have detected this sooner? what guardrail am I adding now?

### 11. Approved retry/timeout standards documented
**Status:** DONE — Defined in `frontend/src/lib/fetch-with-guardrails.ts` as the standard
**Timeouts:** 10s default external calls, 30s for AI/LLM calls, 5s for health checks
**Retries:** 2 retries on 5xx and network errors, no retry on 4xx

### 12. Circuit breaker / fail-fast on external services
**Status:** NOT STARTED — lower priority than timeout/retry, implement after external wrapper is stable

---

## Tier 4 — Already Complete (from prior work)

| Item | Status |
|------|--------|
| Universal error handling wrapper (`withApiGuardrails`) | DONE — 287/392 routes |
| Standardized error response envelope | DONE |
| Error catalog with codes + severity | DONE |
| Correlation IDs / request IDs | DONE |
| Endpoint smoke test (90 endpoints, daily) | DONE |
| Pre-deploy quality gate (CI) | DONE |
| Post-deploy verification (CI) | DONE |
| Env var validation at startup | DONE |
| Alert thresholds + escalation on repeated errors | DONE |
| Design token ESLint enforcement (3 error-level rules) | DONE |
| Guardrail debt ratchet (blocks regression) | DONE |
| API smoke secret set + cron fixed to daily | DONE |

---

## Not Started (lower priority)

- Full API response shape TypeScript contracts (Tier 2, item 9)
- Circuit breaker patterns (Tier 3, item 12)
- Versioning for API responses
- End-to-end tracing (request ID propagation to backend logs)

---

## Completion Criteria

The guardrail system is considered materially complete when:
- [ ] All 392 routes use `withApiGuardrails` (0 debt routes)
- [ ] `no-explicit-any` runs as a lint error with no violations
- [ ] Every escaped production bug has a corresponding smoke/regression entry
- [ ] External dependency wrapper used by all third-party calls
- [ ] Background jobs alert on failure

---

## Operating Rules (enforced via CLAUDE.md)

1. A bug fix is not complete without at least one: test, validation, monitor, alert, or wrapper improvement
2. Any bug that escaped to production must leave a permanent guardrail
3. No new API route without `withApiGuardrails`
4. No new external call without `fetchWithGuardrails`
5. No `any`, `@ts-ignore`, or unsafe assertion without a comment explaining why
