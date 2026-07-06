# Publish Preserved Lanes To Main

## Status

- In Progress

## Goal

- Integrate the preserved extraction lanes into one clean publish branch.
- Verify the combined result enough to publish safely to `origin/main`.
- Push the final integrated work to production without losing any preserved local work.

## Scope

- `codex/ai-sdk-v7-extract`
- `codex/feedback-inbox-and-tasks-extract`
- `codex/change-events-settings-extract`
- `codex/submittals-pdf-export-extract`
- `codex/drawings-and-local-dev-extract`
- `codex/ai-assistant-debug-and-agent-surface-extract`
- `codex/repo-cleanup-and-doc-maps-extract`

## Checklist

- [x] Confirm each preserved lane still exists and is readable.
- [x] Identify cross-lane file overlap before integration.
- [x] Create a clean publish worktree from `origin/main`.
- [x] Apply each preserved lane into the publish worktree.
- [x] Resolve overlapping files explicitly and document the resolution.
- [x] Run targeted verification for the integrated publish branch.
- [ ] Commit the integrated branch.
- [ ] Push the integrated branch to `origin/main`.
- [ ] Verify local publish branch `HEAD` matches `origin/main`.
- [x] Record final evidence and any residual risk.

## Overlap Notes

- `frontend/src/lib/submittals/ai-review/review-run-service.ts` is shared by AI SDK and submittals export work.
- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` is shared by AI SDK and AI assistant debug work.
- `frontend/src/lib/submittals/ai-review/review-run-service.ts` was identical in both preserved lanes.
- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` from the AI assistant debug lane was applied last because it is the newer superset.

## Evidence

- Preservation map: `/tmp/alleato-dirty-checkout-extraction-map.txt`
- Pre-clean source status: `/tmp/alleato-main-preclean-status.txt`
- Integrated publish worktree: `/tmp/alleato-publish-all`
- Route check: `cd /tmp/alleato-publish-all && npm run check:routes` -> passed
- Targeted verification:
  - `cd /tmp/alleato-publish-all/frontend && ./node_modules/.bin/jest --runInBand --runTestsByPath ...` -> 12 suites passed, 99 tests passed
  - `cd /tmp/alleato-publish-all && node scripts/verify/__tests__/source-control-plane-health-lib.test.mjs` -> passed
- Migration verification:
  - `cd /tmp/alleato-publish-all && npm run db:migrations:verify-applied -- supabase/migrations/20260704103000_create_change_event_project_settings.sql supabase/migrations/20260704113000_sync_task_project_assignment_from_document_metadata.sql` -> passed
  - `cd /tmp/alleato-publish-all && npm run db:types:check` -> passed
