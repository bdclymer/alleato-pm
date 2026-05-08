# Code Quality Audit - 2026-04-24

Scope: static engineering and frontend quality audit for the Alleato frontend, focused on `frontend/src/app`, `frontend/src/components`, `frontend/src/hooks`, and `frontend/src/lib`.

Mode: audit only. No production code was changed.

## Executive Summary

Overall verdict: the application has functioning guardrails and the main quality gate currently passes, but too much meaningful quality debt is still warning-only. The largest risks are typed data escape hatches around Supabase/runtime joins, non-loud failure handling in user-facing fetch paths, raw fetch drift from the shared API client, and design-system debt that remains visible in lint output.

Quality score: 72/100.

Command evidence:

- `npm run check:routes`: passed, no dynamic route conflicts found.
- `npm run quality`: passed with `0 errors` and `2410 warnings`.
- `npm run design:ratchet`: passed; current design lint count is `1967`, down from baseline `3416`.
- `npm run audit:forms`: passed, no form-field standards issues found.

Measured static signals:

- Frontend TS/TSX files in audited paths: 1536.
- `as any` matches in audited paths: 148.
- `as unknown as` matches in audited paths: 186.
- `catch` matches in audited paths: 1100.
- `throw new Error` matches in audited paths: 453.
- raw `fetch(` matches in audited paths: 351.
- `apiFetch(` matches in audited paths: 199.
- `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` matches in audited paths: 199.
- design ratchet violations: 1967.

## Anti-Patterns Verdict

Pass with reservations. The product does not read as uniformly AI-generated because it has real domain depth, route guardrails, a design ratchet, form audits, and project-specific patterns. However, the UI and code still show recurring AI-slop tells: hand-rolled layout shells, card-trap patterns, hard-coded colors, arbitrary spacing, raw controls, and locally invented error/loading states.

The detection gap is that these issues are mostly warnings. A warning-only gate allows quality debt to grow unless every active change is also checked by changed-file ratchets.

## Critical Issues

No critical, currently blocking issues were found in this audit. The core quality gate and route conflict gate passed.

## High-Severity Findings

### 1. Type escape hatches around runtime data are concentrated in high-risk business paths

Location:

- `frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts:91`
- `frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts:198`
- `frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts:259`
- `frontend/src/app/api/projects/[projectId]/budget/details/route.ts`
- `frontend/src/lib/ai/tools/financial.ts`
- `frontend/src/lib/documents/record-documents.ts`

Evidence:

- 148 `as any` matches and 186 `as unknown as` matches in audited paths.
- Top files by unsafe casts include financial tools, budget details, record documents, and commitment SOV line-item routes.

Impact:

These casts bypass the Supabase types gate in exactly the places where FK type drift and join-shape drift are most expensive: budgets, commitments, documents, and financial AI tools. A schema or embed change can become a runtime 500 or corrupted business calculation while TypeScript still passes.

Cause:

Dynamic table names, polymorphic commitment types, Supabase join typing gaps, and runtime-only AI/document schemas are handled locally with casts instead of shared typed adapters.

Detection gap:

`@typescript-eslint/no-explicit-any` is warning-only in `frontend/eslint.config.mjs:58`. `as unknown as` is not currently blocked as a pattern. Typecheck passes because the casts silence the compiler.

Prevention:

- Add typed runtime adapter helpers for polymorphic Supabase tables, starting with commitment SOV line items and budget details.
- Add a changed-file guardrail that fails on new `as any` and high-risk `as unknown as` in `frontend/src/app/api/**`, `frontend/src/lib/budget/**`, and `frontend/src/lib/services/**`.
- For dynamic table access, require a local type alias plus runtime validation rather than direct `(supabase as any).from(tableName)`.

Suggested next command/workstream: use a hardening pass on commitment SOV and budget detail routes first.

### 2. Non-loud failure handling is common in user-facing fetch paths

Location:

- `frontend/src/hooks/use-change-event-detail.ts:171`
- `frontend/src/hooks/use-change-event-detail.ts:191`
- `frontend/src/hooks/use-change-event-detail.ts:195`
- `frontend/src/hooks/use-change-event-detail.ts:211`
- `frontend/src/lib/db/queries.ts:47`
- `frontend/src/lib/db/queries.ts:63`
- `frontend/src/lib/db/queries.ts:104`
- `frontend/src/lib/db/queries.ts:151`

Evidence:

- 1100 `catch` matches in audited paths.
- `frontend/src/hooks/use-change-event-detail.ts` swallows RFQ and related-item failures as "Non-critical" and leaves counts/items empty.
- `frontend/src/lib/db/queries.ts` repeatedly catches database errors and throws generic `ChatbotError` messages while discarding the underlying cause.

Impact:

Users can see incomplete pages with no visible indication that related data failed to load. Developers lose root-cause evidence because the original error is often discarded or converted into a generic message.

Cause:

The codebase has a mix of older "best effort" fetch patterns and newer explicit API error handling. Some missing data is intentionally non-blocking, but the code often does not record enough structured evidence to prove that it is safe.

Detection gap:

There is no guardrail that distinguishes intentionally non-critical failure from accidental silent failure. Comments like `// Non-critical` are accepted without telemetry, test evidence, or visible degraded state.

Prevention:

- Introduce a shared `reportNonCriticalFailure({ area, operation, error, userVisibleFallback })` helper.
- Require non-critical catches to either log structured diagnostics or surface a quiet degraded-state indicator.
- Add an ESLint/custom check for empty catch blocks and `// Non-critical` catches that do not call the helper.

Suggested next command/workstream: harden `use-change-event-detail.ts` and then generalize the helper.

### 3. Raw fetch still competes with the shared API client

Location:

- `frontend/src/hooks/use-change-event-detail.ts:188`
- `frontend/src/hooks/use-change-event-detail.ts:204`
- `frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx`
- `frontend/src/components/header/use-header-nav.ts`
- `frontend/src/app/(main)/[projectId]/schedule/page.tsx`

Evidence:

- 351 raw `fetch(` matches in audited paths.
- 199 `apiFetch(` matches in audited paths.
- Design ratchet reports 192 `design-system/require-api-client` violations.

Impact:

Raw fetch callers often recreate response parsing, non-OK handling, and fallback messages inconsistently. This directly conflicts with the project rule against generic errors and silent failures.

Cause:

The shared `apiFetch` abstraction exists, but the codebase predates it in many pages/hooks. The eslint rule is warning-only globally.

Detection gap:

Changed-file enforcement exists, but the global app can still pass `npm run quality` with 192 `require-api-client` warnings.

Prevention:

- Prioritize raw fetch migration by user-flow severity: change events, change orders, schedule, invoicing, and header navigation.
- Make `require-api-client` error-level for customer-facing `frontend/src/app/(main)/**` once the current top offenders are cleared.
- Add a route smoke test for one migrated flow to verify API error envelopes surface real messages.

Suggested next command/workstream: migrate `use-change-event-detail.ts` to `apiFetch` and use that as the reference pattern.

## Medium-Severity Findings

### 4. Design-system debt is improving but still too large to be background noise

Location:

- `frontend/eslint.config.mjs:76`
- `frontend/eslint.config.mjs:80`
- `frontend/eslint.config.mjs:81`
- `frontend/eslint.config.mjs:82`
- `frontend/eslint.config.mjs:86`
- `frontend/src/app/(admin)/admin/company-info/page.tsx`
- `frontend/src/features/invoicing/invoicing-settings-tab.tsx`

Evidence:

`npm run design:ratchet` reports 1967 current violations:

- `design-system/no-arbitrary-spacing`: 496
- `design-system/require-semantic-colors`: 244
- `design-system/no-design-violations`: 222
- `design-system/no-raw-button`: 212
- `design-system/require-api-client`: 192
- `design-system/no-raw-form-controls`: 138
- `design-system/require-page-shell`: 112
- `design-system/require-info-alert`: 145

Impact:

Visual drift remains easy to introduce, especially in admin pages and feature tabs. The app can pass quality with warning output that is too large for humans to review carefully.

Cause:

The design rules are intentionally warning-level while legacy debt is worked down. The ratchet is effective, but the remaining count is high enough that local page work can still hide inside noise.

Detection gap:

`npm run quality` exits 0 with thousands of warnings. Warnings are not currently summarized as a failing threshold.

Prevention:

- Keep the ratchet, but add per-area budgets for customer-facing routes.
- Raise `require-page-shell`, `require-api-client`, `no-raw-button`, and `no-raw-form-controls` to errors for newly touched files in `(main)` and shared components.
- Create a monthly design-debt report that tracks count by rule and top files.

Suggested next command/workstream: normalize the top `(main)` offenders before admin-only pages.

### 5. ESLint disables and type suppressions need classification

Location:

- `frontend/src/components/meetings/meeting-detail-content.tsx`
- `frontend/src/app/(main)/settings/users/[userId]/page.tsx`
- `frontend/src/app/(admin)/procore-docs/page.tsx`
- `frontend/src/app/(main)/[projectId]/home/project-home-client.tsx`

Evidence:

- 199 matches for `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` in audited paths.

Impact:

Some suppressions may be justified integration edges. Others may hide real regressions and weaken changed-file enforcement.

Cause:

Suppressions appear to have accumulated as local unblockers without a central owner or expiry rule.

Detection gap:

The audit found quantity and concentration, but there is no classification file that says which suppressions are allowed, temporary, or legacy debt.

Prevention:

- Add a suppression registry or require an inline reason with an issue/workstream ID.
- Fail changed files that add new suppressions without a reason.
- Retire suppressions opportunistically when touching the same feature.

Suggested next command/workstream: classify suppressions in customer-facing routes first.

### 6. Mixed data-access stacks increase maintenance risk

Location:

- `frontend/src/lib/db/queries.ts:15`
- `frontend/src/lib/db/queries.ts:43`
- `frontend/src/lib/supabase/**`
- `frontend/src/app/api/**`

Evidence:

- The app primarily uses Supabase clients, but `frontend/src/lib/db/queries.ts` creates a Drizzle/postgres client directly from `POSTGRES_URL`.
- The same audited scope includes 554 direct imports of Supabase client/server helpers.

Impact:

Two database access paths can diverge in auth behavior, transaction behavior, schema typing, error envelopes, and runtime config requirements. This is especially risky if Drizzle-backed chat code shares deployment/runtime assumptions with Supabase-backed project features.

Cause:

AI/chat functionality appears to have brought in a separate database model while the core app uses Supabase.

Detection gap:

No architectural guardrail marks which modules are allowed to bypass Supabase or what runtime config must be present.

Prevention:

- Document the intended boundary for Drizzle-backed chat storage.
- Add runtime config validation for `POSTGRES_URL` paths.
- Keep direct postgres usage isolated behind `frontend/src/lib/db/**` and prevent leakage into project management routes.

Suggested next command/workstream: add a short ADR for data-access boundaries.

## Low-Severity Findings

### 7. Route naming guardrail is working

Location:

- `frontend/src/app/**`

Evidence:

- `npm run check:routes` passed.
- Search results for `[id]` in route paths did not indicate an active generic route conflict; most matches were comments or non-route strings.

Impact:

Low current risk, but this should remain mandatory because the failure mode is dev-server-breaking.

Prevention:

- Keep `npm run check:routes` in predeploy and changed-route workflows.
- Prefer updating stale route comments that still say `/api/projects/[id]/...` to reduce confusion.

### 8. Form-field standards are currently healthy

Location:

- `frontend/scripts/audit/audit-form-field-standards.ts`

Evidence:

- `npm run audit:forms` passed with no issues.

Impact:

This is a positive finding. It indicates the project has a working guardrail for one historically drift-prone UI surface.

Prevention:

- Keep the form audit in `npm run quality`.
- Extend the same pattern to non-form failure states and API client usage.

## Patterns And Systemic Issues

The recurring theme is not lack of tools. The repo has useful gates: strict TypeScript, route conflict checks, design-system lint, form audits, changed-file debt checks, and guardrail scripts. The gap is enforcement strength and scope.

Cause:

Legacy debt has correctly been kept as warnings to avoid blocking development, but warning counts are now too large to be reviewed manually.

Detection gap:

Passing commands do not mean clean code. `npm run quality` passed while reporting 2410 warnings.

Prevention:

Move from global warning cleanup to area-specific ratchets. Customer-facing routes and shared primitives should have stricter thresholds than internal admin/demo pages.

## Positive Findings

- `tsconfig.json` has strict mode enabled, including `strictNullChecks`, `noImplicitAny`, and `strictFunctionTypes`.
- `npm run check:routes` passed.
- `npm run audit:forms` passed.
- The design ratchet is reducing debt: current design count is 1967 versus baseline 3416.
- There is an existing `apiFetch` abstraction and a lint rule that identifies raw fetch debt.
- Guardrail scripts already exist for changed route errors and changed API-client enforcement.

## Recommended Priority Plan

Immediate:

1. Add a non-critical failure reporting helper and convert `use-change-event-detail.ts` to prove the pattern.
2. Migrate the highest-traffic raw fetch paths to `apiFetch`, starting with change events/change orders.
3. Add changed-file checks for new `as any`, `as unknown as`, empty catch blocks, and unreasoned suppressions in API/business-critical paths.

Short term:

1. Build typed adapters for polymorphic commitment SOV table access.
2. Reduce `require-api-client`, `no-raw-button`, and `no-raw-form-controls` debt in `(main)` routes.
3. Classify existing suppressions and require reason text for new suppressions.

Medium term:

1. Define data-access boundaries for Supabase versus Drizzle/postgres.
2. Add design-debt reporting by route group and top files.
3. Raise selected design-system rules from warning to error for customer-facing route groups once local debt is cleared.

Long term:

1. Replace runtime Supabase join casts with generated or validated query result adapters.
2. Expand frontend user-journey verification so code-quality fixes are tied to visible workflows.
3. Keep warning budgets trending downward in CI, not just in ad hoc audits.

## Suggested Follow-Up Work Items

1. Hardening: `use-change-event-detail.ts` raw fetch and non-critical catch conversion.
2. Guardrail: changed-file scanner for unsafe casts and silent catches.
3. Type safety: typed commitment SOV adapter for subcontract and purchase-order line items.
4. Design debt: `(main)` route API-client and raw-control cleanup tranche.
5. Architecture: ADR for Supabase versus Drizzle/postgres data-access boundaries.
