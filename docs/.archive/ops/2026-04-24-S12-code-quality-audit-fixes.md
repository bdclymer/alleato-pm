# Handoff: ORCH-015 Code Quality Audit Fixes

Session: S12
Owner: Codex
Status: Pending Review
Date: 2026-04-24

## Scope

Implemented the first audit-fix tranche from `docs/ops/audits/2026-04-24-code-quality-audit.md`:

- Make non-critical frontend failures fail loudly.
- Migrate the change-event detail hook away from raw `fetch`.
- Add changed-file guardrails for unsafe patterns.
- Replace dynamic commitment SOV table casts with typed branch-specific access.
- Harden changed-file ratchets so local unstaged changes are not missed.
- Clean up live Supabase schema drift exposed by regenerated types for change-event line items, canonical PCO line items, and missing prime-contract change-order related-items storage.

## Changed Files

- `frontend/src/lib/report-non-critical-failure.ts`
- `frontend/src/hooks/use-change-event-detail.ts`
- `frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts`
- `scripts/check-no-new-unsafe-patterns.mjs`
- `scripts/__tests__/check-no-new-unsafe-patterns.test.mjs`
- `scripts/check-no-new-any.mjs`
- `frontend/scripts/check-no-new-eslint-debt.mjs`
- `frontend/scripts/__tests__/check-no-new-eslint-debt.test.mjs`
- `scripts/predeploy-quality-gate.sh`
- `frontend/package.json`
- `scripts/check-changed-route-guardrails.mjs`
- `scripts/__tests__/check-changed-route-guardrails.test.mjs`
- `frontend/src/app/api/projects/[projectId]/change-events/**`
- `frontend/src/app/api/projects/[projectId]/pcos/**`
- `frontend/src/app/api/projects/[projectId]/prime-contract-pcos/**`
- `frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/**`
- `docs/ops/orchestration/session-board.md`
- `docs/ops/orchestration/review-queue.md`
- `docs/ops/handoffs/2026-04-24-S12-code-quality-audit-fixes.md`

## Summary

Added `reportNonCriticalFailure()` as a shared structured reporter for optional/degraded frontend fetch failures. `use-change-event-detail.ts` now uses `apiFetch()` for API calls and routes optional data-load failures through the reporter instead of empty/comment-only catches.

The commitment line-items API no longer uses `(supabase as any)` for polymorphic SOV table access. It branches on `subcontract` vs `purchase_order`, uses generated Supabase table types, maps purchase-order UOM to the live `uom` column, and returns/throws structured guardrail errors instead of raw `{ error: ... }` responses.

Added `scripts/check-no-new-unsafe-patterns.mjs` and wired it into `frontend/package.json` `quality:changed`. It blocks new explicit `any`, `as unknown as`, unreasoned suppressions, and empty/comment-only catch blocks in changed app/component/hook/lib files. Also fixed `scripts/check-no-new-any.mjs` so changed-mode scans unstaged working-tree changes instead of only `origin/main...HEAD`.

Follow-up guardrail audit found the same working-tree detection gap in `frontend/scripts/check-no-new-eslint-debt.mjs`. It now merges base, staged, and unstaged diffs, suppresses intentional ESLint ignored-file warnings, and has a focused unit test. `scripts/predeploy-quality-gate.sh` now runs the unsafe-pattern gate.

Regenerated live Supabase types exposed schema drift in the change-management API surface. Change-event routes now use `budget_code_id` and the live `change_event_line_items_budget_code_id_fkey` relationship instead of the removed `budget_line_id` contract. Canonical PCO routes now treat `pco_line_items.pco_id` as a numeric FK. Prime contract change-order related-items routes now fail loudly with `SCHEMA_MISMATCH` because `prime_contract_change_order_related_items` is not present in the live schema; the previous empty-list fallback masked that migration gap.

The changed-route raw-error guardrail now enforces newly added raw error responses from diff lines instead of failing every touched legacy route that already contains raw responses. This keeps the changed-file ratchet actionable while still blocking new raw `{ error: ... }` debt.

## Evidence

Passed:

- `node --test scripts/__tests__/check-no-new-unsafe-patterns.test.mjs`
- `node --test scripts/__tests__/check-no-new-unsafe-patterns.test.mjs scripts/__tests__/check-changed-route-guardrails.test.mjs`
- `node --test frontend/scripts/__tests__/check-no-new-eslint-debt.test.mjs scripts/__tests__/check-no-new-unsafe-patterns.test.mjs scripts/__tests__/check-changed-route-guardrails.test.mjs`
- `node scripts/check-no-new-unsafe-patterns.mjs`
- `node scripts/check-changed-route-guardrails.mjs`
- `npm run quality:changed` from `frontend/`
- `npm run check:routes`
- `npx tsc --noEmit --pretty false --incremental false` from `frontend/`
- `bash -n scripts/predeploy-quality-gate.sh`
- `npx markdownlint-cli2 --no-globs 'docs/ops/handoffs/2026-04-24-S12-code-quality-audit-fixes.md' 'docs/ops/orchestration/session-board.md' 'docs/ops/orchestration/review-queue.md'`
- Targeted ESLint: `npx eslint 'src/hooks/use-change-event-detail.ts' 'src/lib/report-non-critical-failure.ts' 'src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts' --no-cache --no-error-on-unmatched-pattern`

Noted:

- Repo-wide `npx markdownlint-cli2 ...` without `--no-globs` expands through existing generated/output docs and fails on pre-existing markdown debt outside this scope. The targeted changed-doc lint above passes.

## Cause, Detection Gap, Prevention

Cause:

- Optional frontend fetches were historically handled as best-effort empty catches.
- Some API callers predated `apiFetch()` and hand-rolled response parsing.
- Dynamic Supabase table access used casts to bypass generated types.
- Existing changed-file guardrails missed unstaged working-tree changes.
- `lint:changed:debt` also emitted a false "no files" result for unstaged frontend files before the patch.
- Change-management routes were still coded against stale generated Supabase types and masked the missing prime-contract related-items table with empty responses.

Detection gap:

- `npm run quality` can pass with warning-only debt.
- `scripts/check-no-new-any.mjs` previously reported "no files" for unstaged changed files.
- `frontend/scripts/check-no-new-eslint-debt.mjs` previously reported "No changed frontend code files" for unstaged local files.
- Full TypeScript with regenerated live Supabase types exposed schema drift not covered by the targeted changed-file gates before this cleanup.
- The changed-route raw-error gate originally failed all touched legacy routes with existing raw error responses, making it too broad for a changed-file ratchet.

Prevention:

- New unsafe-pattern guardrail blocks recurrence in changed source files.
- `quality:changed` now includes the unsafe-pattern guardrail.
- `check-no-new-any.mjs` now scans base, staged, and working-tree diffs.
- `check-no-new-eslint-debt.mjs` now scans base, staged, and working-tree diffs.
- `quality:changed` now reports changed frontend files for this working tree instead of falsely reporting no files.
- Commitment SOV route now relies on generated table types and explicit branch logic instead of dynamic any casts.
- Full TypeScript now passes against regenerated live Supabase types.
- The route raw-error ratchet now detects newly added raw response lines from base, staged, and working-tree diffs.

## Risks / Follow-Ups

1. Prime contract change-order related items remain unavailable until a migration creates `prime_contract_change_order_related_items` or the feature is intentionally mapped to another related-items table.
2. Prime/commitment PCO line items still need a UUID-compatible storage model; the add-to-PCO flow now fails loudly before creating partial line-item data when selected change events have line items.
3. There are unrelated permissions/admin working-tree changes and screenshot artifacts present. This handoff does not claim or modify those.
