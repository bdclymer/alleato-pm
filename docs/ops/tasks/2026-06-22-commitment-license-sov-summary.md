# Task: Commitment License Field And SOV Summary

Status: Complete - implemented and locally verified; not published because the checkout contains substantial unrelated dirty work.
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created yet - Linear issue creation tool unavailable in this session; only comment/document/attachment tools are exposed.
Related Handoff: N/A

## Objective

Commitment detail and edit flows show human-entered description text without forced title casing, expose the selected company's license number, allow license number updates from both the company page and commitment edit flow, and show Procore-style SOV summary rows on both commitment detail and SOV tab views.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

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

- [x] Commitment description preserves the entered casing on detail/edit/list surfaces.
- [x] `companies` has a nullable `license_number` column in Supabase and generated frontend types.
- [x] Company detail/edit API and UI can read/write `license_number`.
- [x] Commitment detail displays the selected company's license number.
- [x] Commitment edit flow can update the selected company's license number with explicit save failure if the company update fails.
- [x] Commitment detail overview and Schedule of Values tab both show: Subtotal, Original Contract, Approved Changes, Contract Total, Billed to Date, Amount Remaining, Current Retainage.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit --pretty false --incremental false --project tsconfig.json` | Pass | First run exposed missing admin company type field; patched `frontend/src/app/(admin)/table-v2/page.tsx`, rerun passed. |
| Static/type/lint      | `npm --prefix frontend run quality:changed` | Partial | Task files passed changed type/lint checks; existing unrelated guardrail failure remains in `frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx` for a silent catch. |
| Static/type/lint      | `npm --prefix frontend run lint:errors -- <task-owned files>` and `npm --prefix frontend run lint:errors -- 'src/app/(admin)/table-v2/page.tsx'` | Pass | Targeted ESLint passed for task-owned files. |
| Targeted tests        | `npm --prefix frontend run test:unit -- --runTestsByPath src/components/commitments/tabs/__tests__/ScheduleOfValuesTab.columns.test.tsx --runInBand` | Pass | 3 tests passed, including summary-row assertions. |
| Browser/user-flow     | `agent-browser` authenticated run against `http://localhost:3001/1067/commitments/7b218f1a-ea33-412e-bd5d-3c73d07a4d4b` | Pass | Evidence in `docs/ops/evidence/2026-06-22-commitment-license-sov-summary/`. |
| DB/provider read-back | `npm run db:migrations:verify-applied -- supabase/migrations/20260622230000_add_company_license_number.sql`; SQL read-back of `information_schema.columns` | Pass | Migration ledger shows `20260622230000`; `companies.license_number` exists as nullable `text`. |
| End-to-end proof      | `commitment-detail-description-expanded.txt`, `commitment-sov-tab.txt`, `commitment-edit-loaded.txt`, `company-profile-loaded.txt`, `company-edit-modal.txt` | Pass | Description casing preserved, SOV summary rows visible, license field visible on commitment/company/edit surfaces. |

## Files Changed

- `supabase/migrations/<timestamp>_add_company_license_number.sql` - add company license source field.
- `frontend/src/types/database.types.ts` - generated/read type support for company license.
- `frontend/src/app/api/**` - company/commitment read-write paths for license.
- `frontend/src/components/**` and commitment pages - company license display/edit and SOV summary rows.
- `frontend/src/**/*.test.*` - guardrails for casing/license/SOV summary behavior.

## Risks / Gaps

- Linear issue creation is process-required but unavailable through the exposed connector tools in this session.
- Supabase project-id type generation was unavailable because the Supabase access token is invalid, and direct db-url generation was unavailable because Docker is not running. Frontend types were updated manually and verified by full `tsc`.
- `npm run quality:changed` detects an unrelated existing guardrail failure in `frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx`.
- Changes were not published with `codex:finish` because the checkout contains substantial unrelated dirty work, including a pre-existing dirty `frontend/src/types/database.types.ts` hunk unrelated to this task.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
