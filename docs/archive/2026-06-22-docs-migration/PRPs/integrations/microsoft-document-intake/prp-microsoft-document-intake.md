# PRP: Microsoft Document Intake And Promotion

---

## Goal

**Feature Goal:** Turn the existing Microsoft Graph OneDrive/SharePoint ingestion into a reliable Alleato document intake system that preserves Microsoft as the upstream source while making Alleato the durable project-management system of record.

**Deliverable:** A staged implementation that:

- keeps live OneDrive/SharePoint delta sync for intake
- stages raw Microsoft file intake before RAG/vectorization
- improves source tracking and lifecycle handling
- promotes high-value files into `project_documents`
- promotes workflow-bearing documents into native project records where appropriate
- avoids destructive mirror-delete behavior

**Success Definition:**

- Microsoft Graph remains the intake layer for OneDrive/SharePoint files
- `document_metadata` only holds files that are explicitly approved for RAG/search material
- `project_documents` becomes the curated user-facing document library
- workflow-specific imports can promote documents into native records such as RFIs and later budgets/change-management surfaces
- source removals/archive events fail loudly and visibly instead of silently deleting project evidence

---

## Why

**Business value:** The PM system needs historical and ongoing document intake without forcing manual export/import work. Weekly reports, budget artifacts, change-order PDFs, lien waivers, and related documents should be searchable, attributable, and promotable into app workflows.

**Current problem:** The repo already ingests Microsoft files, but that ingestion mostly lands in `document_metadata`, not in the user-facing `project_documents` library or in native workflow records. The app therefore has a real intake pipeline but not yet a complete document-management operating model.

**Product stance:** Microsoft should do the file sync legwork, but Alleato should own project linkage, workflow promotion, evidence retention, and user-visible state. OneDrive should not be allowed to hard-delete operational history inside Alleato.

---

## Live State Snapshot

This PRP is grounded in the live repo and linked database state observed on `2026-05-02`.

- `document_metadata` contains `4,881` `source='microsoft_graph'` + `category='document'` rows.
- `1,875` of those rows have `project_id`; `3,006` remain unassigned.
- Graph document rows span `2017-05-11` through `2026-04-29`.
- `180` Microsoft Graph document rows fall within the last 60 days.
- `graph_sync_state` has `4` `onedrive_file` rows with `4` successful rows; latest observed OneDrive sync was `2026-04-30T12:48:33.392466+00:00`.
- `project_documents` contains only `10` rows total, all source-backed, all SharePoint-backed, and `0` OneDrive-backed.

Interpretation:

- The Microsoft intake path is real and already backfilled substantially.
- The current user-facing document library is not yet using that corpus in a meaningful way.
- Project attribution quality is not yet strong enough to treat the raw intake corpus as a complete PM-facing document system.

---

## Product Decision

### Canonical Model

Use this architecture:

1. **Microsoft OneDrive / SharePoint**
   Upstream content source and change feed
2. **Raw Microsoft intake table**
   Source-sync ledger, dedupe/classification surface, and pre-vectorization staging area
3. **`document_metadata`**
   Approved RAG/search corpus only
4. **`project_documents`**
   Curated, project-facing document library
5. **Native workflow tables**
   Final home for workflow-bearing records when a document should become an RFI, change object, budget artifact, or another first-class Alleato record

### Non-Goal

Do not implement a destructive mirror where removing a file from OneDrive automatically deletes it from Alleato. Removal in source should typically become:

- archived in app
- orphaned from source
- flagged for review
- retained as evidence if already linked to project activity

### Recommended Initial Scope

Backfill and promote the most recent `60-90` days first, then expand once attribution and lifecycle rules are proven.

### Vectorization Rule

Do **not** treat `document_metadata` as the inbox for every Microsoft file.

In this repo today, any `INSERT` into `document_metadata` automatically enqueues the RAG pipeline. That means template trash, duplicated folder boilerplate, and low-value repeated files would consume embedding spend and pollute retrieval unless they are filtered **before** entering `document_metadata`.

---

## What

### Deliverables

**Backend / Ingestion**

- extend Microsoft file sync to support update detection, not insert-only behavior
- land raw Microsoft files in a pre-RAG staging surface instead of directly vectorizing them
- handle `@removed` delta items explicitly
- capture richer source metadata on `document_metadata` and `project_documents`
- add promotion jobs from raw Graph documents into `project_documents`
- add promotion gates from staged Microsoft files into `document_metadata`
- add workflow-target routing rules for weekly reports, budget artifacts, change-order artifacts, and similar classes

**Database**

- any schema additions needed for source lifecycle state, promotion state, review state, and classification results
- a staging table for raw Microsoft file intake if no existing table can safely serve that role
- indexes only where justified by measured query paths
- migration-safe support for promotion idempotency

**UI / API**

- a project-facing synced documents view backed by `project_documents`
- explicit sync/provenance badges
- explicit source-removed/source-updated/archive states
- review queues for unassigned or low-confidence imported documents

**Operations**

- bounded import strategy for recent months first
- classification and promotion reporting
- verification commands and evidence expectations
- vectorization spend-control rules and template suppression rules

---

## Success Criteria

- [ ] OneDrive/SharePoint files can be ingested incrementally via Graph delta without duplicate creation.
- [ ] Existing source-backed documents update when upstream file metadata or file contents change.
- [ ] Upstream removals are captured as lifecycle changes in Alleato, not silently ignored and not hard-deleted.
- [ ] `project_documents` can be populated idempotently from source-backed Microsoft files.
- [ ] Recent high-value files can be classified into at least these buckets: weekly report, budget artifact, change-order artifact, lien waiver, submittal/spec/general document.
- [ ] Project assignment coverage for recent imported documents materially improves and unassigned imports are visible for review.
- [ ] The system can distinguish raw intake storage from user-facing curated docs and workflow-promoted records.
- [ ] The implementation preserves Microsoft traceability fields such as item IDs, drive IDs, site IDs, web URLs, etags, and last-modified timestamps.
- [ ] Verification proves that recent import, update, removal/archive, and project-facing listing all work on real data.

---

## All Needed Context

### Product Rules

- Microsoft is the intake/extraction layer.
- Alleato/Supabase is the durable system of record for project linkage and workflow state.
- `document_metadata` is not the final user-facing documents module and must not be the raw inbox for every synced file.
- High-value operational documents should not remain trapped only as raw RAG rows.
- Source deletions must fail loudly and visibly; they must not silently erase project evidence.
- Vectorization is opt-in by rule/promotion, not automatic for all synced files.

### Existing Codebase Files To Follow

```yaml
- file: backend/src/services/integrations/microsoft_graph/onedrive.py
  why: current OneDrive and SharePoint file ingestion path
  pattern: Graph delta -> extract text -> upload raw text -> insert source-backed document_metadata row
  gotcha: current behavior is insert-only and skips @removed items

- file: backend/src/services/integrations/microsoft_graph/sync.py
  why: top-level Graph sync orchestration and delta-token persistence
  pattern: per-source resource_id + graph_sync_state delta token tracking
  gotcha: SharePoint entries are currently stored under source "onedrive_file" in graph_sync_state

- file: backend/src/services/integrations/microsoft_graph/outlook.py
  why: best current example of source-backed upsert into project_documents
  pattern: source-system keyed upsert with sync metadata and idempotent matching
  gotcha: use this pattern instead of inventing a separate project_documents sync model

- file: frontend/src/app/api/projects/[projectId]/documents/route.ts
  why: current project_documents API surface
  pattern: project-scoped read/write route with project_id integer handling
  gotcha: any synced document UX should reuse this project_documents surface or extend it cleanly

- file: frontend/src/app/api/ai-assistant/chat/route.ts
  why: current RAG retrieval path already treats microsoft_graph/category=document as recent OneDrive documents
  pattern: document_metadata is already queryable as source-specific knowledge
  gotcha: changes here must preserve project-scoped retrieval behavior
```

### Existing Behavior That Must Be Preserved

- Graph sync is delta-based and scheduler-backed.
- Project attribution is inferred during ingestion.
- `document_metadata.project_id` matters for project-scoped RAG.
- `project_documents` already supports source-tracking columns and should be the user-facing promoted library.
- the current `document_metadata` insert trigger auto-enqueues the pipeline, so spend/retrieval control must happen before `document_metadata` insert time or in trigger gating logic

---

## Database Schema

Generate fresh types before implementation:

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
```

### Relevant Tables

#### `document_metadata`

Current important fields from `frontend/src/types/database.types.ts`:

- `id: string`
- `project_id: number | null`
- `source: string | null`
- `category: string | null`
- `type: string | null`
- `title: string | null`
- `content: string | null`
- `date: string | null`
- `created_at: string | null`
- `status: string | null`
- `url: string | null`
- `file_name: string | null`
- `file_path: string | null`
- `storage_bucket: string | null`
- `source_drive_id: string | null`
- `source_item_id: string | null`
- `source_site_id: string | null`
- `source_path: string | null`
- `source_web_url: string | null`
- `source_etag: string | null`
- `source_last_modified_at: string | null`
- `source_size: number | null`
- `source_system: string | null`
- `source_metadata: Json`
- `workflow_target: string | null`
- `division: string | null`
- `trade: string | null`

Use:

- approved RAG/search corpus
- provenance ledger for documents that are intentionally searchable
- post-promotion classification state

Do not use:

- raw inbox for every synced OneDrive/SharePoint file

#### `project_documents`

Current important fields:

- `id: number`
- `project_id: number`
- `folder: string | null`
- `title: string`
- `description: string | null`
- `file_name: string`
- `file_url: string`
- `file_size: number | null`
- `content_type: string | null`
- `status: string`
- `category: string | null`
- `created_by: string | null`
- `source_system: string | null`
- `source_drive_id: string | null`
- `source_item_id: string | null`
- `source_site_id: string | null`
- `source_path: string | null`
- `source_web_url: string | null`
- `source_etag: string | null`
- `source_last_modified_at: string | null`
- `source_size: number | null`
- `sync_status: string`
- `sync_error: string | null`
- `last_synced_at: string | null`
- `storage_bucket: string | null`
- `storage_path: string | null`
- `content_hash: string | null`
- `workflow_target: string | null`
- `division: string | null`
- `trade: string | null`
- `source_metadata: Json`

Use:

- curated user-facing synced document library
- source-backed document lifecycle tracking
- promotion target for important Microsoft docs

#### New staging table (required unless an equivalent existing table is reused safely)

Suggested working name:

- `external_source_documents`

Purpose:

- raw Microsoft intake before vectorization
- dedupe/classification gate
- source lifecycle tracking
- review queue for low-value and low-confidence files

Suggested minimum fields:

- `id`
- `source_system`
- `source_drive_id`
- `source_site_id`
- `source_item_id`
- `source_path`
- `source_web_url`
- `source_etag`
- `source_last_modified_at`
- `source_size`
- `content_hash`
- `title`
- `file_name`
- `content_type`
- `raw_text`
- `project_id`
- `project_assignment_confidence`
- `classification`
- `classification_confidence`
- `is_duplicate_template`
- `is_vectorize_candidate`
- `is_project_document_candidate`
- `review_status`
- `source_metadata`
- `created_at`
- `updated_at`

#### `graph_sync_state`

Current important fields:

- `id: string`
- `source: string`
- `resource_id: string`
- `resource_name: string | null`
- `delta_token: string | null`
- `last_sync_at: string | null`
- `sync_status: string`
- `error_message: string | null`
- `items_synced: number`

Use:

- resource-level delta sync state
- operational monitoring
- retry and error visibility

#### `projects`

Critical FK fact:

- `projects.id` is `number`
- any `project_id` fields added or used here must remain `INTEGER`-compatible

### FK Type Rule

- `document_metadata.project_id` must remain integer-compatible
- `project_documents.project_id` must remain integer-compatible
- never introduce UUID `project_id` fields in migrations or API contracts for this feature

### Likely Schema Additions

Schema changes are allowed only if the current columns are insufficient. Candidate additions:

- raw Microsoft staging table
- promotion state on `document_metadata`
- source lifecycle state on `document_metadata` and/or `project_documents`
- classifier confidence / review status
- archive reason / source removed timestamp
- explicit link from `project_documents` back to `document_metadata.id`

If possible, prefer adding a small number of explicit columns over burying critical operational state inside `source_metadata`.

---

## Current Gaps To Fix

### Gap 1: Insert-Only OneDrive Logic

`backend/src/services/integrations/microsoft_graph/onedrive.py` currently:

- skips `@removed` items
- skips existing items entirely
- never compares etag / last-modified / content hash
- never updates `document_metadata`
- never upserts `project_documents`

Result:

- stale source-backed records
- no archive/removal lifecycle
- no curated project document library for OneDrive

### Gap 2: OneDrive Intake Goes Straight To RAG Trigger Surface

The current OneDrive path inserts into `document_metadata`, and that insert immediately enqueues the RAG pipeline. There is no staging layer to filter template junk, boilerplate copies, or repeated client-folder scaffolding before embedding.

Result:

- low-value files can consume embedding spend
- repeated template files can pollute retrieval
- user-facing project documents are still mostly empty

### Gap 3: Attribution Coverage Is Too Weak For Blind Promotion

Live state shows:

- `1,875` assigned
- `3,006` unassigned

Result:

- blind auto-promotion would create noisy or misfiled project docs
- a review queue and bounded rollout are required

### Gap 4: Source Type Conflation In Sync State

`backend/src/services/integrations/microsoft_graph/sync.py` currently stores SharePoint folder sync state under the same `source` bucket as OneDrive (`onedrive_file`).

Result:

- weak operational visibility
- harder reporting for OneDrive vs SharePoint behavior

### Gap 5: Missing Spreadsheet Intake Coverage

Current supported extensions:

- `.pdf`
- `.docx`
- `.doc`
- `.txt`
- `.md`
- `.csv`

Missing likely-important source:

- `.xlsx`

If budget files matter operationally, this is a real product gap.

### Gap 6: Current Junk-Filter Is Too Weak

The current Graph embedder skips only empty or too-short content. That is not enough for repeated template folders because many template files are long enough to embed successfully while still being operationally useless.

Result:

- template noise can still become searchable
- embedding cost can be wasted on documents we do not want in RAG

---

## Required Implementation Slices

### Slice 1: Add Pre-RAG Intake Staging

Raw Microsoft file sync should land in a staging surface first.

Requirements:

- sync OneDrive/SharePoint files into a raw staging table, not directly into `document_metadata`
- preserve source IDs, path, etag, size, timestamps, and extracted text
- compute `content_hash` for dedupe
- classify likely template/boilerplate files before RAG promotion
- record promotion decisions and review status

### Slice 2: Normalize Microsoft File Lifecycle

Update file sync so source-backed items can be:

- inserted
- updated
- marked removed/archived
- retried after error

Implementation requirements:

- detect existing `document_metadata` by stable source item identity
- compare `source_etag`, `source_last_modified_at`, and/or `content_hash`
- update rows when source changes
- preserve prior evidence instead of deleting rows on removal
- log lifecycle transitions into sync status / source metadata

### Slice 3: Add Vectorization Gate

Only promote staged files into `document_metadata` when they are RAG-worthy.

Minimum gating rules:

- exclude exact duplicate template content by `content_hash`
- exclude known folder/file patterns such as `Templates`, `Template`, `Boilerplate`, or other confirmed Brandon-copy patterns
- exclude files marked `is_duplicate_template=true`
- exclude low-confidence/no-project files unless explicitly approved
- allow `metadata_only` or `project_document_only` promotion paths for files that should be visible but not searchable

### Slice 4: Add Project Document Promotion Path

Build a reusable promotion path from Microsoft file intake into `project_documents`.

Requirements:

- use the same source-backed upsert strategy pattern already present in Outlook integration
- match idempotently by `(project_id, source_system, source_item_id)` or equivalent
- preserve source tracking fields
- set `sync_status`, `last_synced_at`, `sync_error`
- allow repeated runs without duplicates

### Slice 5: Add File Classification And Routing

Create a first-pass classifier for recent Graph documents using filename, path, source metadata, and optionally extracted content.

Minimum classes:

- weekly report
- budget artifact
- change-order artifact
- lien waiver
- drawing/spec/submittal/general technical document
- unknown/manual review

Classifier output should drive:

- `workflow_target`
- `category`
- target folder in `project_documents`
- review requirement

Add template suppression signals:

- `exact_duplicate_content`
- `known_template_name`
- `known_template_folder`
- `likely_reference_only`
- `real_project_artifact`

### Slice 6: Review Queue For Unassigned / Low-Confidence Imports

Do not treat all imports as cleanly project-linked.

Requirements:

- surface recent unassigned imports
- surface low-confidence project assignments
- allow safe manual project reassignment
- keep provenance visible during review

### Slice 7: Bounded Backfill

Start with recent history first.

Requirements:

- first pass on last `60-90` days
- verify attribution and promotion quality
- expand only after evidence shows the system is trustworthy

### Slice 8: Workflow Promotion Hooks

Document-bearing records that imply workflow records should be promotable beyond `project_documents`.

Initial PRP requirement:

- preserve the existing separation between `project_documents`, `document_metadata`, and workflow records
- make weekly reports, budget artifacts, and change-order artifacts routable
- do not implement all workflow promotions in the first pass unless explicitly in scope

RFI promotion via SharePoint is already prior art and should be referenced as the pattern for future workflow-specific promotions.

---

## Suggested File Plan

These are likely change points. The executing agent should verify exact ownership before editing.

```text
backend/src/services/integrations/microsoft_graph/onedrive.py
backend/src/services/integrations/microsoft_graph/sync.py
backend/src/services/integrations/microsoft_graph/embed.py
backend/src/services/ingestion/communication_project_backfill.py
backend/src/scripts/...
frontend/src/types/database.types.ts
frontend/src/app/api/projects/[projectId]/documents/route.ts
frontend/src/app/(main)/[projectId]/documents/...         # if project docs UI needs synced-source surfacing
frontend/src/components/...                               # review queue or sync-state UI if implemented
supabase/migrations/<timestamp>_...
```

Potential new scripts:

```text
backend/src/scripts/backfill_microsoft_project_documents.py
backend/src/scripts/classify_recent_microsoft_documents.py
backend/src/scripts/promote_staged_microsoft_documents_to_rag.py
backend/src/scripts/promote_graph_documents_to_project_documents.py
```

---

## Known Pitfalls And Prevention

### Database Type Mismatches (`docs/patterns/database-issues.md` and incident log)

**Historical error:** `project_id` mismatches caused silent query failures and wasted debugging time.

**Prevention:**

- always regenerate and read `frontend/src/types/database.types.ts` before database changes
- keep `project_id` as integer-compatible everywhere in this feature
- validate joins against real tables before claiming success

**Validation:**

```bash
rg -n "project_id" supabase/migrations
cd frontend && npx tsc --noEmit --pretty false --incremental false
```

### Claiming Data Fixes Without Live Query Verification (`docs/patterns/INCIDENT-LOG.md`)

**Historical error:** repo changes were claimed complete without testing the actual DB query or live behavior.

**Prevention:**

- verify promotion counts with real SQL
- verify project documents appear through the actual API/UX route
- do not claim import quality without live evidence

### Stale `.next` Cache For New Or Changed Routes (`docs/patterns/INCIDENT-LOG.md`)

**Historical error:** route work was debugged incorrectly because the dev server cache was stale.

**Prevention:**

- if this PRP adds new frontend routes, clear `.next` and restart before debugging route behavior

**Validation:**

```bash
cd frontend && rm -rf .next
pkill -f "next dev" || true
npm run dev > /tmp/nextjs-dev.log 2>&1 &
```

### Generic Route Params (`docs/patterns/api-routing-errors.md`)

**Historical error:** generic `[id]` routes caused conflicts.

**Prevention:**

- use `[projectId]`, `[documentId]`, or another specific name
- never add generic `[id]` routes

### Silent Source Loss

**Feature-specific risk:** naive sync logic may skip removed files or overwrite important metadata without a user-visible signal.

**Prevention:**

- source removals must set explicit archived/orphaned/error state
- user-visible rows should preserve provenance and prior linkage
- any lifecycle failure should be queryable and reviewable

### RAG Pollution From Template Folders

**Feature-specific risk:** repeated template folders can create lots of long-but-useless text that still passes low-content filters and degrades retrieval quality.

**Prevention:**

- raw sync must stage before vectorization
- compute `content_hash` at intake time
- suppress known template folders/names before `document_metadata` insert
- make vectorization an explicit promotion decision

### Hot-Table Performance On `document_metadata`

**Historical risk:** emergency index or query-shape mistakes on `document_metadata` can cause severe performance issues.

**Prevention:**

- do not add speculative indexes blindly
- verify the exact query shape with `EXPLAIN`
- prefer query-shape fixes before adding emergency indexes

---

## Validation Plan

The executing agent must produce compact evidence for each of these:

### Schema And Type Validation

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
cd frontend && npx tsc --noEmit --pretty false --incremental false
```

### Migration Validation

If this work adds migrations:

```bash
npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_<name>.sql
```

### Sync Validation

Run a bounded sync against a known recent folder and verify:

- new file inserts
- existing file updates
- removed file lifecycle handling
- graph_sync_state update
- staged-row creation without automatic RAG promotion for excluded junk

Expected evidence:

- exact source item IDs
- before/after row state
- sync-state row update

### Promotion Validation

Verify staged decisions across three outcomes:

- `stage only`
- `stage -> project_documents only`
- `stage -> project_documents + document_metadata`

### RAG Gate Validation

Verify on real repeated-template examples:

- duplicate/template files do not enter `document_metadata`
- duplicate/template files do not produce `document_chunks`
- approved real project artifacts do reach `document_metadata`
- approved real project artifacts are retrievable with project scoping

Verify that selected source-backed files appear in `project_documents` with:

- correct `project_id`
- correct `source_system`
- correct `source_item_id`
- correct `sync_status`
- correct `last_synced_at`

### Frontend Validation

If project documents UI is changed, verify the real project route rather than only the DB:

```bash
npm run verify:browser
```

Minimum manual-style path:

1. open a project with promoted docs
2. navigate to documents
3. confirm synced source-backed docs are visible
4. confirm provenance/lifecycle state is visible

### Suggested SQL Evidence

```sql
select count(*) from document_metadata where source='microsoft_graph' and category='document';
select count(*) from document_metadata where source='microsoft_graph' and category='document' and project_id is not null;
select count(*) from project_documents where source_system ilike '%onedrive%';
select count(*) from project_documents where source_system ilike '%sharepoint%';
select source, resource_id, last_sync_at, sync_status, items_synced
from graph_sync_state
where source in ('onedrive_file', 'sharepoint_file')
order by last_sync_at desc nulls last;
```

---

## Acceptance Narrative

This feature is done when Alleato can say, truthfully:

- Microsoft files are syncing in incrementally.
- Junk/template files are being filtered before vectorization.
- Important recent files can be promoted into the project-facing document library.
- File changes and removals are tracked explicitly.
- Raw RAG storage and curated PM-facing documents are no longer conflated.
- The app can safely start with recent months first and expand once attribution quality is proven.

---

## Non-Goals For First Pass

- full portfolio-wide historical cleanup in one run
- destructive source mirroring
- universal native workflow promotion for every document class
- perfect attribution on day one
- replacing Microsoft as the source file system

---

## Recommended Execution Order

1. Add raw Microsoft staging before any RAG promotion.
2. Add template/duplicate suppression and vectorization gating.
3. Strengthen OneDrive/SharePoint lifecycle handling in ingestion.
4. Add idempotent promotion into `project_documents`.
5. Add bounded recent-history backfill and classification.
6. Add review queue for unassigned/low-confidence imports.
7. Add targeted workflow promotions for the highest-value doc classes.
8. Expand history coverage only after evidence shows the first slice is trustworthy.
