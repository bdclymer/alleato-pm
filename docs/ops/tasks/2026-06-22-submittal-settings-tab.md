# Task: Add Submittal Settings Tab

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-603 - https://linear.app/megankharrison/issue/AAI-603/add-submittals-settings-tab-for-project-submittals
Related Handoff: Not applicable

## Objective

Add a Procore-aligned Submittal Settings tab to `/876/submittals` that exposes project-level submittal defaults and persists changes without silently dropping user input.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Source Evidence

- Procore support doc: `https://v2.support.procore.com/product-manuals/submittals-project/tutorials/configure-settings-submittals-tool/`
- User-provided Procore screenshot: Submittal Settings page with General, Responses, Workflow Templates, Replace Workflow User, Imports, Custom Reports, and Permissions tabs.

## Acceptance Criteria

- `/876/submittals?tab=settings` renders a Submittal Settings surface from the existing Submittals page tab bar.
- The Settings surface includes same-width internal tabs for General, Responses, Workflow Templates, Replace Workflow User, Imports, Custom Reports, and Permissions.
- Settings cover the Procore project defaults that matter for current Alleato submittal behavior: default manager/distribution, package sort order, due days, numbering by spec section, privacy, approver/reviewer workflow toggles, reject workflow, overdue reminders, QR codes, schedule calculations, attachment link access, and email notification defaults.
- General includes the Procore-aligned email notification matrix, overdue reminders, and attachment setting content supplied by the user.
- Responses, Workflow Templates, Replace Workflow User, Imports, Custom Reports, and Permissions expose the user-supplied Procore tab content without implying fake persistence where no backend workflow exists.
- Saving settings persists through a guarded API and reloads from the same source.
- Save failures show actionable errors; no fake success state is introduced.
- Existing packages/items/spec sections/ball-in-court/recycle-bin tabs continue to use the current table behavior.

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

## Files Planned Before Edits

- `supabase/migrations/20260623002000_create_submittal_project_settings.sql` - persist project submittal settings.
- `frontend/src/types/database.types.ts` - refresh Supabase types after schema verification.
- `frontend/src/app/api/projects/[projectId]/submittals/settings/route.ts` - guarded settings GET/PUT API.
- `frontend/src/app/api/projects/[projectId]/submittals/settings/__tests__/route.test.ts` - API contract tests.
- `frontend/src/app/(main)/[projectId]/submittals/page.tsx` - add Settings tab and settings panel.
- `frontend/src/app/api/projects/[projectId]/directory/permissions/route.ts` - repair ambiguous company embed exposed by the Submittals Permissions tab.
- `docs/ops/tasks/2026-06-22-submittal-settings-tab.md` - task ledger and evidence.

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

## Noise Gate

- Primary user: project admin configuring Submittals before the team creates or routes submittals.
- Primary job: set project defaults that reduce repeated manual choices and keep workflow/emails predictable.
- Primary decision: which default behaviors should new submittals inherit.
- Tier 1 content: General settings, numbering, workflow defaults, access/email settings, save/cancel state.
- Hidden until requested: workflow-template CRUD, reports creation, imports downloads, and permission-template editing stay out of this slice unless backed by real source-of-truth APIs.
- Removal candidates: top-of-page stats, explanatory helper panels, duplicate save CTAs, decorative cards.
- Primary action: Save Settings.
- Failure-loudly behavior: load/save errors come from guarded API errors and do not show success.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `npx eslint 'src/app/(main)/[projectId]/submittals/page.tsx' 'src/app/api/projects/[projectId]/submittals/settings/route.ts' 'src/app/api/projects/[projectId]/submittals/settings/__tests__/route.test.ts' --quiet` | Pass | Focused lint for task-owned frontend/API/test files. |
| Static/type/lint      | `npx eslint 'src/app/(main)/[projectId]/submittals/page.tsx' 'src/app/api/projects/[projectId]/directory/permissions/route.ts' --quiet` from `frontend/` | Pass | Focused lint after adding internal settings tabs and fixing the permissions embed. |
| Static/type/lint      | `npm run typecheck:changed` from `frontend/` | Pass | No new `any` type debt detected. |
| Static/type/lint      | `npm run typecheck` from `frontend/` | Timeout | Bounded checker timed out after 60s with its existing broad-tsconfig detection gap. No task-owned TS diagnostics were emitted before timeout. |
| Route guard           | `npm run check:routes` from repo root | Pass | No dynamic route conflicts found. `frontend` package does not define this script, so root script was used. |
| Targeted tests        | `npm run test:unit -- --runTestsByPath 'src/app/api/projects/[projectId]/submittals/settings/__tests__/route.test.ts'` from `frontend/` | Pass | 3 tests passed: defaults, persisted save, missing-migration loud failure. |
| Broad suite attempt   | `npm test -- --runTestsByPath 'frontend/src/app/api/projects/[projectId]/submittals/settings/__tests__/route.test.ts'` from repo root | Fail unrelated | Root script ran the full frontend suite; existing failures were in email-thread formatting, ProjectCreatedModal button label, home tab-data source-string guard, and UnifiedTablePage header-label guard. |
| Browser/user-flow     | `agent-browser open 'http://localhost:3001/876/submittals?tab=settings'`, fill temporary distribution/days, click Save Settings, refresh | Pass | Settings tab rendered under `/876/submittals`; save action completed with authenticated browser session. |
| Browser/user-flow     | `docs/ops/evidence/2026-06-22-submittal-settings-tab/submittal-settings-tab-reset.png` | Pass | Final screenshot after temporary verification values were reset. |
| Browser/user-flow     | `docs/ops/evidence/2026-06-22-submittal-settings-tab/submittal-settings-tab-full-width.png` | Pass | Follow-up width fix verified after switching Settings to the same table-width page shell as the other tabs. |
| Browser/user-flow     | `agent-browser open 'http://localhost:3001/876/submittals?tab=settings&settings_tab=general' && agent-browser snapshot -i` | Pass | Internal tabs rendered at full page width; General includes saved settings and the role-based email notification matrix. |
| Browser/user-flow     | `docs/ops/evidence/2026-06-22-submittal-settings-tab/submittal-settings-responses-tab.png` | Pass | Responses tab screenshot captured with all default workflow response mappings. |
| Browser/user-flow     | `agent-browser open ...settings_tab=workflow-templates|replace-workflow-user|imports|custom-reports` plus targeted text checks | Pass | Workflow Templates, Replace Workflow User, Imports, and Custom Reports tabs rendered the supplied Procore content. |
| Browser/user-flow     | `docs/ops/evidence/2026-06-22-submittal-settings-tab/submittal-settings-permissions-tab.png` | Pass | Permissions tab screenshot captured after API embed repair; project 876 currently returns no permission rows. |
| DB/provider read-back | `supabase migration list --linked | rg '20260623002000|Local|Remote'` | Pass | Local and Remote both show `20260623002000`. |
| DB/provider read-back | `supabase db query --linked "select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'submittal_project_settings' order by ordinal_position"` | Pass | Remote table and columns verified. |
| DB/provider read-back | `supabase db query --linked "select project_id, default_distribution, default_submit_response_days from public.submittal_project_settings where project_id = 876"` | Pass | Browser save persisted temporary values before reset. |
| DB/provider read-back | `supabase db query --linked "update public.submittal_project_settings set default_distribution = null, default_submit_response_days = 14 where project_id = 876 returning project_id, default_distribution, default_submit_response_days"` | Pass | Temporary verification values reset to defaults. |
| Type generation       | `supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts && npm run devtools:sync-schema-fk` | Pass | Regenerated DB types and FK map after remote migration application. |
| End-to-end proof      | Browser save + DB read-back + reset + screenshot | Pass | Actual requested `/876/submittals` settings tab loads, saves, and persists through the new API/table. |
| Publish attempt       | `npm run codex:finish -- --message "Add submittal settings tab" --files <task-owned paths>` | Blocked | Pre-existing staged files unrelated to this task prevented the finish script from staging/publishing only this task. |

## Files Changed

- `docs/ops/tasks/2026-06-22-submittal-settings-tab.md` - task definition and evidence ledger.
- `docs/ops/evidence/2026-06-22-submittal-settings-tab/submittal-settings-tab.png` - browser screenshot during save verification.
- `docs/ops/evidence/2026-06-22-submittal-settings-tab/submittal-settings-tab-reset.png` - browser screenshot after reset.
- `docs/ops/evidence/2026-06-22-submittal-settings-tab/submittal-settings-tab-full-width.png` - browser screenshot after the Settings tab width fix.
- `docs/ops/evidence/2026-06-22-submittal-settings-tab/submittal-settings-responses-tab.png` - browser screenshot of the Responses settings tab.
- `docs/ops/evidence/2026-06-22-submittal-settings-tab/submittal-settings-permissions-tab.png` - browser screenshot of the Permissions settings tab.
- `supabase/migrations/20260623002000_create_submittal_project_settings.sql` - project settings table, RLS, trigger, and constraints.
- `frontend/src/types/database.types.ts` - regenerated Supabase types including `submittal_project_settings`.
- `frontend/src/components/dev-tools/page-schema-fk.generated.ts` - regenerated FK map after type sync.
- `frontend/src/app/api/projects/[projectId]/submittals/settings/route.ts` - guarded GET/PUT settings API.
- `frontend/src/app/api/projects/[projectId]/submittals/settings/__tests__/route.test.ts` - route contract tests.
- `frontend/src/app/api/projects/[projectId]/directory/permissions/route.ts` - fixed ambiguous Supabase `people` to `companies` embed by qualifying `people_company_id_fkey`.
- `frontend/src/app/(main)/[projectId]/submittals/page.tsx` - Settings tab and Procore-aligned settings form.

## Risks / Gaps

- Full frontend typecheck is still bounded by an existing repo-scale timeout in `scripts/run-typecheck-bounded.mjs`.
- The root `npm test -- --runTestsByPath ...` command is misleading for targeted tests because it invokes the full frontend test suite before backend args.
- Workflow-template CRUD, Procore import downloads, report creation, and workflow user replacement execution remain read-only/action-shell UI until source-of-truth APIs are added; fake persistence is intentionally avoided.
- Permissions tab is wired to the existing directory permissions endpoint. Project 876 currently returns no permission rows, but the previous ambiguous company relationship now fails loudly only on real API errors.
- Publishing is blocked by unrelated pre-existing staged files: `docs/ops/tasks/2026-06-22-create-submittal-workflow.md`, `frontend/src/app/api/projects/[projectId]/submittals/route.ts`, `frontend/src/features/submittals/submittal-form-page.tsx`, `frontend/src/hooks/use-submittals.ts`, `frontend/src/lib/submittals/__tests__/create-workflow.test.ts`, `frontend/src/lib/submittals/create-workflow.ts`.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
