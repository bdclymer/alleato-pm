# Meetings Module

The Meetings module integrates with Fireflies.ai to automatically capture meeting transcripts, extract insights, and track action items.

## Current Status

✅ **Production** — Fireflies sync, AI analysis pipeline, task extraction, and AI assistant tools are all live.

**Technical reference:** [`docs/patterns/meeting-pipeline.md`](../patterns/meeting-pipeline.md) — full pipeline walkthrough (ingestion → AI analysis → task generation → storage → UI).

## What's Built

### Meeting List & Detail Pages
- Meeting list with filtering and search (`/(main)/[projectId]/meetings`)
- Full transcript, AI summary, decisions, action items, risks, attendees
- Admin metadata view with pipeline status (`/(admin)/document-metadata`)

### Fireflies.ai Integration
- Automatic transcript import via Python backend pipeline
- GraphQL API integration with full transcript + analytics
- Markdown generation + Supabase Storage upload
- **APScheduler runs sync every 15 minutes** inside the FastAPI process (`backend/src/services/scheduler.py`)

### Meeting Transcripts & AI Insights
- 4-stage processing pipeline: parser → embedder → extractor → compiler
- Decisions, risks, and opportunities extracted to `insights` table
- Approval gate on insights (migration `20260503190000`)
- Vector embeddings for semantic search via `document_chunks`

### Action Item (Task) Extraction
- Tasks extracted from Fireflies action items (preferred) or LLM segment analysis
- Quality gates: no-assignee tasks dropped, low-signal tasks filtered, urgency without deadlines downgraded
- Stored in `tasks` table with `source_system: "fireflies"` and link back to meeting via `metadata_id`
- Surfaced in AI assistant via `getActionItemsAndInsights` tool

## Known Gaps (as of 2026-05-03)

1. **Manual meetings skip AI pipeline** — source: "manual" meetings get no task/insight extraction
2. **Insights approval UI not confirmed** — `approval_status` column exists but UI flow unverified
3. **Recurring issues not connected** — `recurring_issues_tracking` table exists but pipeline not wired

---

## Database Schema

**IMPORTANT**: Meeting data is stored in the `document_metadata` table, NOT a dedicated meetings table.

### Key Tables

- **document_metadata** (filter by `type='meeting'`)
  - Meeting metadata, transcripts, summaries
- **meeting_segments**
  - Chunked meeting content for RAG/AI
  - Vector embeddings for semantic search

### Type Mapping

```typescript
// Import from @/types
import { Meeting } from '@/types'

// Meeting is an alias for document_metadata Row type
```diff
---

## Plan Template

When creating a new meetings plan, follow this structure:

### File Naming
`plans-meetings-[feature-name].md`

Examples:
- `plans-meetings-list-page.md`
- `plans-meetings-fireflies-integration.md`
- `plans-meetings-ai-insights.md`
- `plans-meetings-action-items.md`

### Document Structure

```markdown
# Meetings [Feature Name] - Implementation Plan

**Purpose**: Brief description of what this plan covers

**Status**: Not started / In progress / Complete

**Related Plans**:
- Link to related plans
- Component system reference
- Schema modeling reference

---

## Goals

1. What does this feature accomplish?
2. What problem does it solve?
3. What value does it provide?

## Requirements

### Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2

### Technical Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Implementation Checklist

### Phase 1: [Phase Name]
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Phase Name]
- [ ] Task 1
- [ ] Task 2

## Database Schema

Required fields from document_metadata table

## Component Usage

Which components from the component system will be used

## API Integration

Fireflies.ai API endpoints and authentication

## Testing Plan

What Playwright tests are needed

## Success Criteria

How do we know this is complete and working?

---

**Last Updated**: YYYY-MM-DD
**Status**: [Status]
```

---

## Related Plans

- [Component System](../general/plans-component-system.md) - Shared UI components
- [Schema Modeling](../general/plans-schema-modeling.md) - Database structure (document_metadata)
- [Testing Strategy](../general/plans-testing-strategy.md) - Testing approach
- [TypeScript Types](../general/plans-typescript-types.md) - Meeting type definition

---

**Last Updated**: 2025-12-17
**Owner**: Meetings Feature Team
**Status**: Ready for plans
