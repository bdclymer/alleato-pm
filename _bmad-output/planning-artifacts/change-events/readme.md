---
title: README
description: README documentation
---

# Change Events Documentation

This directory contains the standardized documentation for the Change Events module following the 6-file structure template.

## Current Documentation Structure

### Core Documentation (Active)

- **TASKS-ChangeEvents.md** - Pure task checklist with completion status
- **PLANS-ChangeEvents.md** - Implementation plan with file paths and current status
- **SCHEMA-ChangeEvents.md** - Complete database schema and migration scripts
- **FORMS-ChangeEvents.md** - Form specifications with layouts and validation
- **API_ChangeEvents.md** - API documentation with examples
- **UI-ChangeEvents.md** - Component breakdown and UI specifications

### Supporting Documentation

- **reference/** - Procore screenshots and original requirements
- **archive/** - Historical documentation and implementation snapshots

## Implementation Status

**Actual Completion: 52%** (the 85% claim predates the blockers listed below)

### ✅ Verified Layers

- Database schema, migrations, triggers, the summary materialized view, and helper functions are in place.
- Primary `/api/projects/[projectId]/change-events` routes (list, create, detail) respond when supplied with UUID-based IDs.
- The list screen, creation/edit form, line items grid, attachments panel, RFQ tabs, and approval workflow components exist and render.

### ⚠️ Known Breakers

- Every page that uses `changeEventId` currently calls `parseInt` on the route param; with UUIDs stored in the table, the detail/edit views hit `NaN` and never return data.
- Line item, attachment, and history APIs also coerce `changeEventId` to a number before querying, so they return empty payloads even though the rows exist.
- The revenue section emits slug values (`match_latest_cost`, `manual_entry`, `percentage_markup`, `fixed_amount`) that the backend’s `LineItemRevenueSource` enum rejects, so POST/PATCH requests fail validation.
- The attachments panel uploads files under the `files` key while the API expects a single `file` field, so the upload handler aborts before storage.
- The approval workflow UI calls `/approvals` endpoints that aren’t implemented and hardcodes numeric approver IDs; approvals can’t be created or recorded.
- RFQ endpoints exist (list/create and response submission), but the UX is not yet wired to display responses or send notifications; we have not verified that flow end to end.

### Next Steps

- Normalize every component, page, and route to treat `changeEventId` as the UUID string everywhere.
- Align revenue-source values, attachments payloads, history, and line-item endpoints with the backend expectations before rerunning tests.
- Build the approval APIs (or disable the UI) and hook RFQ forms to the endpoint responses.
- Re-run the Playwright change-event specs after the core CRUD path is stable.

## Quick Navigation

### For Developers

1. **Database Work**: See `SCHEMA-ChangeEvents.md` for the actual tables, triggers, and helpers.
2. **API Integration**: See `API_ENDPOINTS-ChangeEvents.md` for current endpoints and blockers.
3. **UI Components**: See `UI-ChangeEvents.md` for the live components and wiring notes.
4. **Form Implementation**: See `FORMS-ChangeEvents.md` for the form sections and validation behavior.

### For Project Managers

1. **Progress Tracking**: `TASKS-CHANGE-EVENTS.md` is the single source of truth for implemented vs planned work.
2. **Implementation Plan**: `PLANS-ChangeEvents.md` tracks the roadmap and dependencies.
3. **Current Status**: Work is ~52% complete; refer to the blockers above before marking production ready.

### For QA/Testing

- Change-event specs in `/frontend/tests/e2e/change-events-*.spec.ts` rely on working UUID paths and attachments; they are currently unreliable.
- Manual verification notes live in `PLANS-ChangeEvents.md` but should be revisited after the parsing/attachment fixes.

## File Paths Reference

### Implementation Files

```text
frontend/
├── src/app/[projectId]/change-events/          # Pages
├── src/components/domain/change-events/        # Components
├── src/app/api/projects/[id]/change-events/    # API Routes
├── drizzle/migrations/0001_create_change_events.sql
└── tests/e2e/change-events-*.spec.ts           # Tests
```

### Documentation Files

```text
PLANS/change-events/
├── TASKS-CHANGE-EVENTS.md                       # Task checklist
├── PLANS-ChangeEvents.md                       # Implementation plan
├── SCHEMA-ChangeEvents.md                      # Database schema
├── FORMS-ChangeEvents.md                       # Form specifications
├── API_ENDPOINTS-ChangeEvents.md               # API documentation
├── UI-ChangeEvents.md                          # Component specs
└── archive/                                    # Targeted snapshots (legacy duplicates removed)
```

## Archived Files

The `archive/legacy-documentation/` directory has been removed and the remaining files in `archive/` are high-level snapshots of the early rollout (2026-01-08/09/10). Duplicate `.mdx` captures now live in the standardized files above.

## Benefits of This Structure

### For Claude Code

- **Predictable locations** for all information types
- **No redundancy** or conflicting information
- **Complete context** in logical, organized files
- **Easy maintenance** with clear responsibilities per file

### For Developers

- **Quick navigation** to specific information types
- **Complete specifications** for implementation
- **No duplicate documentation** to maintain
- **Current status** always visible in progress files

### For Project Management

- **Clear progress tracking** with completion percentages
- **Exact file paths** for verification
- **Implementation roadmap** with priorities
- **Quality metrics** with pass/fail status

## Usage Guidelines

1. **Single Source of Truth**: Each piece of information exists in exactly one place
2. **Cross-References**: Use links between files when information spans multiple areas
3. **Status Updates**: Keep completion percentages current as work progresses
4. **File Paths**: Always include absolute paths to implementation files
5. **Documentation Updates**: Update relevant files when making code changes

This standardized structure eliminates confusion and ensures Claude Code can efficiently work with the Change Events documentation.
