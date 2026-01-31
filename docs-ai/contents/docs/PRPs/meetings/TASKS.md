# Meetings Implementation Tasks

**Status**: 🔴 Blocked | **Last Updated**: 2026-02-01

## Progress Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 9 |
| Completed | 0 (0%) |
| In Progress | 0 |
| Remaining | 9 |

---

## Tasks

### Phase 1: Data Layer
- [ ] Generate Procore crawl data for meetings and read spec artifacts (COMMANDS, MUTATIONS, schema, FORMS)
- [ ] Validate meetings data model against `document_metadata` + `meeting_segments`

### Phase 2: API Layer
- [ ] Confirm whether to use server actions (`table-actions.ts`) or add dedicated route handlers
- [ ] Align MeetingData update payload with actual document_metadata columns

### Phase 3: UI Layer
- [ ] Update global meetings list (/(tables)/meetings) to align with crawl UI
- [ ] Update MeetingsDataTable columns/filters/actions per crawl spec
- [ ] Validate project-scoped meetings list/table pattern
- [ ] Validate meeting detail view (global + project) with transcript/outcomes parity

### Phase 4: Integration
- [ ] Ensure edit modal updates + revalidation are wired correctly

### Phase 5: Testing & Validation
- [ ] Run type check: `cd frontend && npm run typecheck`
- [ ] Run linting: `cd frontend && npm run lint`
- [ ] Run tests: `cd frontend && npm run test`
- [ ] Manual verification
- [ ] Production build: `cd frontend && npm run build`

---

## Session Log

### 2026-02-01
- Started: Meetings PRP creation
- Blocker: Missing Procore crawl data for meetings
- Next: Run `/feature-crawl meetings <procore-url>` and update PRP

---

## Quick Reference

**PRP Document**: `docs-ai/contents/docs/PRPs/meetings/prp-meetings.md`
**Crawl Data**: `playwright-procore-crawl/procore-crawls/meetings/`
**Spec Artifacts**: `playwright-procore-crawl/procore-crawls/meetings/spec/`

### Key Commands

```bash
# Validate types
cd frontend && npm run typecheck

# Run linting
cd frontend && npm run lint

# Run tests
cd frontend && npm run test

# Build production
cd frontend && npm run build

# Start dev server
cd frontend && npm run dev
```
