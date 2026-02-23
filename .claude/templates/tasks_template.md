# {FEATURE_NAME} Implementation Tasks

**Status**: ⚪ Not Started | **Last Updated**: {TIMESTAMP}

## Progress Summary

| Metric | Count |
|--------|-------|
| Total Tasks | {TOTAL} |
| Completed | 0 (0%) |
| In Progress | 0 |
| Remaining | {TOTAL} |

---

## Tasks

### Phase 1: Data Layer
<!-- Tasks related to types, schemas, database -->
- [ ] {TASK_PLACEHOLDER}

### Phase 2: API Layer
<!-- Tasks related to API routes, services -->
- [ ] {TASK_PLACEHOLDER}

### Phase 3: UI Layer
<!-- Tasks related to components, pages -->
- [ ] {TASK_PLACEHOLDER}

### Phase 4: Integration
<!-- Tasks related to connecting pieces together -->
- [ ] {TASK_PLACEHOLDER}

### Phase 5: Build Verification
<!-- Build verification only — test authoring is owned by BMAD QA workflows (Quinn/Murat) -->
- [ ] Run type check: `npx tsc --noEmit`
- [ ] Run linting: `npm run lint`
- [ ] Run existing tests (regression check): `npm test`
- [ ] Manual verification
- [ ] Production build: `npm run build`

---

## Session Log

<!--
AI agents: Append your progress updates here in reverse chronological order.
Format: ### YYYY-MM-DD HH:MM
        - Completed: {task description}
        - Next: {what you're working on next}
        - Notes: {any blockers or observations}
-->

### {TIMESTAMP}

- Started: Implementation planning
- PRP: `PRPs/{FEATURE}/prp-{FEATURE}.md`
- Next: Begin Phase 1 tasks

---

## Quick Reference

**PRP Document**: `docs-ai/contents/docs/PRPs/{FEATURE}/prp-{FEATURE}.md`
**Crawl Data**: `docs-ai/contents/docs/PRPs/{FEATURE}/crawl/`
**Spec Artifacts**: `docs-ai/contents/docs/PRPs/{FEATURE}/crawl/spec/`

### Key Commands

```bash
# Validate types
npx tsc --noEmit

# Run linting
npm run lint

# Run tests
npm test

# Build production
npm run build

# Start dev server
npm run dev
```

---

## How to Update This File

When completing a task:

1. Change `- [ ]` to `- [x]`
2. Update the Progress Summary counts
3. Add an entry to Session Log
4. Update the Status badge if changing phases

**Status Badges**:

- ⚪ Not Started
- 🟡 In Progress
- 🟢 Complete
- 🔴 Blocked
